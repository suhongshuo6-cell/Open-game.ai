import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { OpenGameCrewMember } from '../shared/contracts.js';
import { PreviewServer } from './previewServer.js';
import { ProjectStore } from './projectStore.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('project infrastructure', () => {
  it('atomically reloads projects and rejects inspector traversal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-store-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);
    const project = await store.create({
      name: 'Boundary Game',
      idea: 'Test the project boundary.',
      parentDirectory: workspace,
      model: null,
    });
    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.get(project.id)).resolves.toMatchObject({
      name: 'Boundary Game',
      engine: 'web',
      targetFrameRate: 60,
      opengamePackOverrideId: null,
      opengameCrewOverride: null,
    });
    await expect(reloaded.readProjectFile(project.id, '../projects.json')).rejects.toThrow();
    await expect(store.update(project.id, { engine: 'godot' } as never)).rejects.toThrow(
      'Project field cannot be updated: engine',
    );
  });

  it('renames, pins, and safely deletes a project with its workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-project-actions-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);
    const first = await store.create({
      name: 'First Project',
      idea: 'Keep this project above newer unpinned projects.',
      parentDirectory: workspace,
      model: null,
    });
    const second = await store.create({
      name: 'Second Project',
      idea: 'A second project for sorting.',
      parentDirectory: workspace,
      model: null,
    });

    await expect(store.update(first.id, { name: 'Pinned Project', pinned: true })).resolves.toMatchObject({
      name: 'Pinned Project',
      pinned: true,
    });
    await expect(store.list()).resolves.toMatchObject([
      { id: first.id, pinned: true },
      { id: second.id, pinned: false },
    ]);

    await expect(store.delete(first.id)).resolves.toMatchObject({ id: first.id });
    await expect(stat(first.root)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(store.get(first.id)).rejects.toThrow('Unknown project');

    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.list()).resolves.toMatchObject([{ id: second.id, pinned: false }]);
  });

  it('refuses to delete a workspace whose host-owned identity was changed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-project-delete-guard-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);
    const project = await store.create({
      name: 'Guarded Project',
      idea: 'Protect unrelated directories from deletion.',
      parentDirectory: workspace,
      model: null,
    });
    const metadataPath = join(project.root, '.opengame/project.json');
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as Record<string, unknown>;
    await writeFile(metadataPath, `${JSON.stringify({ ...metadata, id: 'different-project' }, null, 2)}\n`);

    await expect(store.delete(project.id)).rejects.toThrow('identity does not match');
    await expect(stat(project.root)).resolves.toMatchObject({});
    await expect(store.get(project.id)).resolves.toMatchObject({ id: project.id });
  });

  it('persists global and project Open game.ai packs while validating their ids', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-pack-store-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);
    const project = await store.create({
      name: 'Pack Workshop',
      idea: 'Remember the selected production companion and studio.',
      parentDirectory: workspace,
      model: null,
    });

    await expect(store.getSettings()).resolves.toMatchObject({
      defaultOpenGamePackId: 'classic',
    });
    await expect(store.saveSettings({ defaultOpenGamePackId: 'mosslight' })).resolves.toMatchObject({
      defaultOpenGamePackId: 'mosslight',
    });
    await expect(store.update(project.id, { opengamePackOverrideId: 'starforge' })).resolves.toMatchObject({
      opengamePackOverrideId: 'starforge',
    });
    await expect(store.update(project.id, {
      opengamePackOverrideId: 'unknown-pack' as 'classic',
    })).rejects.toThrow(
      'opengamePackOverrideId must be classic, mosslight, starforge, or null',
    );
    await expect(store.saveSettings({
      defaultOpenGamePackId: 'unknown-pack' as 'classic',
    })).rejects.toThrow('Default Open game.ai pack setting is invalid');

    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.getSettings()).resolves.toMatchObject({
      defaultOpenGamePackId: 'mosslight',
    });
    await expect(reloaded.get(project.id)).resolves.toMatchObject({
      opengamePackOverrideId: 'starforge',
    });
    await expect(reloaded.update(project.id, { opengamePackOverrideId: null })).resolves.toMatchObject({
      opengamePackOverrideId: null,
    });
  });

  it('persists the default Open game.ai scene while rejecting unknown scene ids', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-scene-store-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);

    await expect(store.getSettings()).resolves.toMatchObject({
      defaultOpenGameSceneId: 'collaboration',
    });
    await expect(store.saveSettings({
      defaultOpenGameSceneId: 'collaboration',
    })).resolves.toMatchObject({
      defaultOpenGameSceneId: 'collaboration',
    });
    await expect(store.saveSettings({
      defaultOpenGameSceneId: 'unknown-scene' as never,
    })).rejects.toThrow('Default Open game.ai scene setting is invalid');

    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.getSettings()).resolves.toMatchObject({
      defaultOpenGameSceneId: 'collaboration',
    });
  });

  it('migrates retired visual selections while preserving unrelated project data', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-retired-visuals-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);
    const project = await store.create({ name: 'Keep this project', idea: 'A game', parentDirectory: workspace, model: null });
    const saved = JSON.parse(await readFile(storageFile, 'utf8'));
    saved.settings.defaultOpenGamePackId = 'twilight';
    saved.settings.defaultOpenGameSceneId = 'fishing';
    saved.settings.defaultOpenGameCrew = [
      { packId: 'classic', role: 'planner' },
      { packId: 'hellokitty', role: 'artist' },
    ];
    saved.projects[0].opengamePackOverrideId = 'hellokitty';
    saved.projects[0].opengameCrewOverride = [
      { packId: 'classic', role: 'planner' },
      { packId: 'twilight', role: 'artist' },
    ];
    await writeFile(storageFile, JSON.stringify(saved));

    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.getSettings()).resolves.toMatchObject({
      defaultOpenGamePackId: 'classic', defaultOpenGameSceneId: 'collaboration',
    });
    await expect(reloaded.get(project.id)).resolves.toMatchObject({
      name: 'Keep this project', opengamePackOverrideId: null, opengameCrewOverride: null,
    });
    const migrated = JSON.parse(await readFile(storageFile, 'utf8'));
    expect(migrated.settings.defaultOpenGameCrew).toHaveLength(3);
    expect(migrated.projects[0].opengamePackOverrideId).toBeNull();
  });

  it('persists the default Open game.ai stage mode and solo scene while validating both', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-stage-store-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);

    await expect(store.getSettings()).resolves.toMatchObject({
      defaultOpenGameStageMode: 'solo',
      defaultOpenGameSoloSceneId: 'classic',
    });
    await expect(store.saveSettings({
      defaultOpenGameStageMode: 'crew',
      defaultOpenGameSoloSceneId: 'mosslight',
    })).resolves.toMatchObject({
      defaultOpenGameStageMode: 'crew',
      defaultOpenGameSoloSceneId: 'mosslight',
    });
    await expect(store.saveSettings({
      defaultOpenGameStageMode: 'unknown-mode' as never,
    })).rejects.toThrow('Default Open game.ai stage mode setting is invalid');
    await expect(store.saveSettings({
      defaultOpenGameSoloSceneId: 'unknown-scene' as never,
    })).rejects.toThrow('Default Open game.ai solo scene setting is invalid');

    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.getSettings()).resolves.toMatchObject({
      defaultOpenGameStageMode: 'crew',
      defaultOpenGameSoloSceneId: 'mosslight',
    });
  });

  it('persists validated global and project Open game.ai crews without visual asset data', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-crew-store-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);
    const project = await store.create({
      name: 'Crew Workshop',
      idea: 'Remember a collaborative crew and each stable production role.',
      parentDirectory: workspace,
      model: null,
    });
    const globalCrew: OpenGameCrewMember[] = [
      { packId: 'classic', role: 'planner' },
      { packId: 'mosslight', role: 'artist' },
      { packId: 'starforge', role: 'engineer' },
    ];
    const projectCrew: OpenGameCrewMember[] = [
      { packId: 'starforge', role: 'planner' },
      { packId: 'mosslight', role: 'tester' },
    ];

    await expect(store.getSettings()).resolves.toMatchObject({ defaultOpenGameCrew: globalCrew });
    await expect(store.saveSettings({ defaultOpenGameCrew: globalCrew })).resolves.toMatchObject({
      defaultOpenGameCrew: globalCrew,
    });
    await expect(store.update(project.id, { opengameCrewOverride: projectCrew })).resolves.toMatchObject({
      opengameCrewOverride: projectCrew,
    });
    await expect(store.update(project.id, {
      opengameCrewOverride: [{ packId: 'classic', role: 'planner' }],
    })).rejects.toThrow('must contain 2 to 3 members');
    await expect(store.update(project.id, {
      opengameCrewOverride: [
        { packId: 'classic', role: 'planner' },
        { packId: 'classic', role: 'artist' },
      ],
    })).rejects.toThrow('duplicate packId');
    await expect(store.saveSettings({
      defaultOpenGameCrew: [
        { packId: 'classic', role: 'planner' },
        { packId: 'mosslight', role: 'planner' },
      ],
    })).rejects.toThrow('duplicate role');
    await expect(store.update(project.id, {
      opengameCrewOverride: [
        { packId: 'unknown-pack', role: 'planner' },
        { packId: 'mosslight', role: 'artist' },
      ] as never,
    })).rejects.toThrow('invalid packId');
    await expect(store.saveSettings({
      defaultOpenGameCrew: [
        { packId: 'classic', role: 'unknown-role' },
        { packId: 'mosslight', role: 'artist' },
      ] as never,
    })).rejects.toThrow('invalid role');
    await expect(store.saveSettings({
      defaultOpenGameCrew: [
        { packId: 'classic', role: 'planner', avatarImage: 'data:image/png;base64,forbidden' },
        { packId: 'mosslight', role: 'artist' },
      ] as OpenGameCrewMember[],
    })).rejects.toThrow('may only contain packId and role');

    const reloaded = new ProjectStore(storageFile, workspace);
    await expect(reloaded.getSettings()).resolves.toMatchObject({ defaultOpenGameCrew: globalCrew });
    await expect(reloaded.get(project.id)).resolves.toMatchObject({ opengameCrewOverride: projectCrew });
    await expect(reloaded.update(project.id, { opengameCrewOverride: null })).resolves.toMatchObject({
      opengameCrewOverride: null,
    });
  });

  it('uses 60 FPS for new projects while preserving compatible legacy targets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-fps-store-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const store = new ProjectStore(storageFile, workspace);

    const project = await store.create({
      name: 'Default Cadence Game',
      idea: 'Verify the host-managed target frame rate.',
      parentDirectory: workspace,
      model: null,
    });
    expect(project.targetFrameRate).toBe(60);
    await expect(store.update(project.id, { targetFrameRate: 24 as 30 })).rejects.toThrow(
      'targetFrameRate must be 30, 60, or 120',
    );

    const legacyStorageFile = join(root, 'legacy/projects.json');
    const legacyRoot = join(root, 'legacy-game');
    const preservedTargetRoot = join(root, 'legacy-120-game');
    const timestamp = new Date().toISOString();
    await mkdir(join(root, 'legacy'), { recursive: true });
    await mkdir(legacyRoot, { recursive: true });
    await mkdir(preservedTargetRoot, { recursive: true });
    await writeFile(legacyStorageFile, `${JSON.stringify({
      version: 1,
      projects: [
        {
          id: 'legacy-project',
          name: 'Legacy Game',
          idea: 'Load without a targetFrameRate field.',
          root: legacyRoot,
          createdAt: timestamp,
          updatedAt: timestamp,
          status: 'draft',
          stage: 'brief',
          model: null,
          threadId: null,
          toolsetVersion: 0,
          activeTurnId: null,
          lastError: null,
        },
        {
          id: 'legacy-120-project',
          name: 'Existing 120 FPS Game',
          idea: 'Preserve an existing internal production cadence.',
          root: preservedTargetRoot,
          createdAt: timestamp,
          updatedAt: timestamp,
          status: 'draft',
          stage: 'brief',
          engine: 'godot',
          targetFrameRate: 120,
          model: null,
          threadId: null,
          toolsetVersion: 0,
          activeTurnId: null,
          lastError: null,
        },
      ],
      settings: {
        defaultWorkspace: workspace,
        defaultModel: null,
        defaultEffort: 'medium',
        theme: 'light',
      },
    }, null, 2)}\n`);

    const legacyStore = new ProjectStore(legacyStorageFile, workspace);
    await expect(legacyStore.get('legacy-project')).resolves.toMatchObject({
      engine: 'web',
      targetFrameRate: 60,
    });
    await expect(legacyStore.get('legacy-120-project')).resolves.toMatchObject({
      engine: 'godot',
      targetFrameRate: 120,
    });
    const migrated = JSON.parse(await readFile(legacyStorageFile, 'utf8')) as {
      projects: Array<{
        engine?: string;
        targetFrameRate?: number;
        opengamePackOverrideId?: string | null;
        opengameCrewOverride?: OpenGameCrewMember[] | null;
      }>;
      settings?: {
        defaultOpenGameStageMode?: string;
        defaultOpenGameSoloSceneId?: string;
        defaultOpenGameSceneId?: string;
        defaultOpenGamePackId?: string;
        defaultOpenGameCrew?: OpenGameCrewMember[];
      };
    };
    expect(migrated.projects[0]?.engine).toBe('web');
    expect(migrated.projects[0]?.targetFrameRate).toBe(60);
    expect(migrated.projects[1]?.engine).toBe('godot');
    expect(migrated.projects[1]?.targetFrameRate).toBe(120);
    expect(migrated.projects[0]?.opengamePackOverrideId).toBeNull();
    expect(migrated.projects[1]?.opengamePackOverrideId).toBeNull();
    expect(migrated.projects[0]?.opengameCrewOverride).toBeNull();
    expect(migrated.projects[1]?.opengameCrewOverride).toBeNull();
    expect(migrated.settings?.defaultOpenGameStageMode).toBe('solo');
    expect(migrated.settings?.defaultOpenGameSoloSceneId).toBe('classic');
    expect(migrated.settings?.defaultOpenGameSceneId).toBe('collaboration');
    expect(migrated.settings?.defaultOpenGamePackId).toBe('classic');
    expect(migrated.settings?.defaultOpenGameCrew).toEqual([
      { packId: 'classic', role: 'planner' },
      { packId: 'mosslight', role: 'artist' },
      { packId: 'starforge', role: 'engineer' },
    ]);
  });

  it('adds solo defaults to legacy settings without replacing existing Open game.ai choices', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-stage-migration-test-'));
    roots.push(root);
    const storageFile = join(root, 'data/projects.json');
    const workspace = join(root, 'games');
    const existingCrew: OpenGameCrewMember[] = [
      { packId: 'mosslight', role: 'artist' },
      { packId: 'starforge', role: 'tester' },
    ];
    await mkdir(join(root, 'data'), { recursive: true });
    await writeFile(storageFile, `${JSON.stringify({
      version: 1,
      projects: [],
      settings: {
        defaultWorkspace: workspace,
        defaultModel: null,
        defaultEffort: 'medium',
        defaultOpenGameSceneId: 'collaboration',
        defaultOpenGamePackId: 'mosslight',
        defaultOpenGameCrew: existingCrew,
        theme: 'light',
      },
    }, null, 2)}\n`);

    const store = new ProjectStore(storageFile, workspace);
    await expect(store.getSettings()).resolves.toMatchObject({
      defaultOpenGameStageMode: 'solo',
      defaultOpenGameSoloSceneId: 'classic',
      defaultOpenGameSceneId: 'collaboration',
      defaultOpenGamePackId: 'mosslight',
      defaultOpenGameCrew: existingCrew,
    });
    const migrated = JSON.parse(await readFile(storageFile, 'utf8')) as {
      settings?: Partial<Record<
        | 'defaultOpenGameStageMode'
        | 'defaultOpenGameSoloSceneId'
        | 'defaultOpenGameSceneId'
        | 'defaultOpenGamePackId'
        | 'defaultOpenGameCrew',
        unknown
      >>;
    };
    expect(migrated.settings).toMatchObject({
      defaultOpenGameStageMode: 'solo',
      defaultOpenGameSoloSceneId: 'classic',
      defaultOpenGameSceneId: 'collaboration',
      defaultOpenGamePackId: 'mosslight',
      defaultOpenGameCrew: existingCrew,
    });
  });

  it('creates a Godot 4 project with scenes, GDScript, assets, and a Web preset', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-godot-store-test-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'Godot Signal Garden',
      idea: 'A complete engine-backed action game.',
      parentDirectory: join(root, 'games'),
      model: null,
      engine: 'godot',
    });

    expect(project).toMatchObject({ engine: 'godot', targetFrameRate: 60 });
    await expect(readFile(join(project.root, 'project.godot'), 'utf8')).resolves.toContain(
      'common/physics_ticks_per_second=60',
    );
    await expect(readFile(join(project.root, 'project.godot'), 'utf8')).resolves.toContain(
      'boot_splash/show_image=false',
    );
    await expect(readFile(join(project.root, 'project.godot'), 'utf8')).resolves.toContain(
      'config/icon="res://resources/opengame-runtime-icon.svg"',
    );
    await expect(readFile(join(project.root, 'project.godot'), 'utf8')).resolves.toContain(
      'boot_splash/image="res://resources/opengame-runtime-icon.svg"',
    );
    await expect(readFile(join(project.root, 'resources/opengame-runtime-icon.svg'), 'utf8')).resolves.toContain(
      '<svg',
    );
    await expect(readFile(join(project.root, 'scenes/main.tscn'), 'utf8')).resolves.toContain(
      'res://scripts/main.gd',
    );
    await expect(readFile(join(project.root, 'scripts/main.gd'), 'utf8')).resolves.toContain(
      'Engine.max_fps = TARGET_FRAME_RATE',
    );
    await expect(readFile(join(project.root, 'export_presets.cfg'), 'utf8')).resolves.toContain(
      'platform="Web"',
    );
    await expect(readFile(join(project.root, 'export_presets.cfg'), 'utf8')).resolves.toContain(
      'html/export_icon=false',
    );
    await expect(readFile(join(project.root, 'AGENTS.md'), 'utf8')).resolves.toContain(
      'Godot 4 / GDScript',
    );
  });

  it('serves the playable starter on loopback without blocking the Electron iframe', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-test-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'Preview Game',
      idea: 'Verify the preview.',
      parentDirectory: join(root, 'games'),
      model: null,
    });
    const preview = new PreviewServer();
    try {
      const url = await preview.start(project.id, project.root);
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('<canvas');
      expect(response.headers.get('x-frame-options')).toBeNull();
      expect(new URL(url).hostname).toBe('127.0.0.1');
    } finally {
      await preview.stopAll();
    }
  });

  it('honors the Inspector source fallback before the first explicit dist build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-explicit-fallback-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'data/projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'New Web Project', idea: 'Preview the starter and imported media before building.',
      parentDirectory: join(root, 'games'), model: null,
    });
    await mkdir(join(project.root, 'public/assets/images'), { recursive: true });
    await writeFile(join(project.root, 'public/assets/images/hero.png'), 'source image');
    const preview = new PreviewServer();
    try {
      const options = { directory: 'dist', sourceFallback: true, sourceAssetOverlay: true };
      const sourceUrl = await preview.start(project.id, project.root, options);
      expect((await fetch(sourceUrl)).status).toBe(200);
      expect(await (await fetch(`${sourceUrl}assets/images/hero.png`)).text()).toBe('source image');
      expect((await fetch(`${sourceUrl}package.json`)).status).toBe(404);

      await mkdir(join(project.root, 'dist'));
      await writeFile(join(project.root, 'dist/index.html'), '<main>Production game</main>');
      const buildUrl = await preview.start(project.id, project.root, options);
      expect(await (await fetch(buildUrl)).text()).toBe('<main>Production game</main>');
    } finally {
      await preview.stopAll();
    }
  });

  it('does not enable fallback implicitly for an explicit production directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-explicit-strict-'));
    roots.push(root);
    await writeFile(join(root, 'index.html'), '<main>Source only</main>');
    const preview = new PreviewServer();
    try {
      await expect(preview.start('strict', root, { directory: 'dist', sourceFallback: false })).rejects.toThrow();
      await expect(preview.start('implicit', root, { directory: 'dist' })).rejects.toThrow();
      await symlink(root, join(root, 'dist'));
      await expect(preview.start('unsafe', root, { directory: 'dist', sourceFallback: true }))
        .rejects.toThrow('symbolic link');
    } finally {
      await preview.stopAll();
    }
  });

  it('hides Godot branding in legacy Web previews without mutating the build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-godot-preview-branding-'));
    roots.push(root);
    const buildRoot = join(root, 'build/web');
    const legacyHtml = `<!doctype html>
<html><head>
<link id="-gd-engine-icon" rel="icon" type="image/png" href="index.icon.png">
<link rel="apple-touch-icon" href="index.apple-touch-icon.png">
</head><body>
<img id="status-splash" class="show-image--true fullsize--true" src="index.png" alt="">
<script src="index.js"></script>
</body></html>`;
    await mkdir(buildRoot, { recursive: true });
    await writeFile(join(buildRoot, 'index.html'), legacyHtml, 'utf8');

    const preview = new PreviewServer();
    try {
      const hiddenUrl = await preview.start('legacy-godot-preview', root, {
        directory: 'build/web',
        sourceFallback: false,
        hideGodotSplash: true,
      });
      const hiddenResponse = await fetch(hiddenUrl);
      const hiddenHtml = await hiddenResponse.text();
      expect(hiddenHtml).toContain('id="status-splash" class="show-image--false"');
      expect(hiddenHtml).not.toContain('show-image--true');
      expect(hiddenHtml).not.toContain('index.png');
      expect(hiddenHtml).not.toContain('-gd-engine-icon');
      expect(hiddenHtml).not.toContain('apple-touch-icon');
      expect(hiddenHtml).toContain('id="opengame-godot-branding-guard"');
      expect(hiddenHtml).toContain('MutationObserver');
      expect(hiddenHtml.match(/opengame-godot-branding-guard/gu)).toHaveLength(1);
      const hiddenHead = await fetch(hiddenUrl, { method: 'HEAD' });
      expect(Number(hiddenHead.headers.get('content-length'))).toBe(Buffer.byteLength(hiddenHtml));
      expect((await fetch(new URL('favicon.ico', hiddenUrl))).status).toBe(204);
      expect(await readFile(join(buildRoot, 'index.html'), 'utf8')).toBe(legacyHtml);

      const rawUrl = await preview.start('legacy-godot-preview', root, {
        directory: 'build/web',
        sourceFallback: false,
        hideGodotSplash: false,
      });
      expect(await (await fetch(rawUrl)).text()).toContain('show-image--true');
    } finally {
      await preview.stopAll();
    }
  });

  it('mirrors Vite public asset URLs while using the source fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-assets-test-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'Asset Preview Game',
      idea: 'Verify public asset routing before a build.',
      parentDirectory: join(root, 'games'),
      model: null,
    });
    const assetDirectory = join(project.root, 'public/assets/images');
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    await mkdir(assetDirectory, { recursive: true });
    await writeFile(join(assetDirectory, 'hero.png'), pngHeader);

    const preview = new PreviewServer();
    try {
      const url = await preview.start(project.id, project.root);
      const response = await fetch(new URL('/assets/images/hero.png', url));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect(Buffer.from(await response.arrayBuffer())).toEqual(pngHeader);

      const documentResponse = await fetch(url);
      expect(documentResponse.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    } finally {
      await preview.stopAll();
    }
  });

  it('serves fresh public media ahead of dist while keeping documents and scripts in dist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-fresh-assets-test-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'Fresh Asset Preview Game',
      idea: 'Verify generated assets are visible before the next build.',
      parentDirectory: join(root, 'games'),
      model: null,
    });
    const publicAssetDirectory = join(project.root, 'public/assets/images');
    const distAssetDirectory = join(project.root, 'dist/assets');
    const freshPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
    await mkdir(publicAssetDirectory, { recursive: true });
    await mkdir(distAssetDirectory, { recursive: true });
    await writeFile(join(publicAssetDirectory, 'fresh.png'), freshPng);
    await writeFile(join(project.root, 'dist/index.html'), '<!doctype html><p>DIST DOCUMENT</p>');
    await writeFile(join(project.root, 'public/assets/app.js'), 'source-script');
    await writeFile(join(distAssetDirectory, 'app.js'), 'dist-script');

    const preview = new PreviewServer();
    try {
      const url = await preview.start(project.id, project.root);
      const mediaResponse = await fetch(new URL('/assets/images/fresh.png', url));
      expect(mediaResponse.status).toBe(200);
      expect(mediaResponse.headers.get('content-type')).toBe('image/png');
      expect(mediaResponse.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect(Buffer.from(await mediaResponse.arrayBuffer())).toEqual(freshPng);

      const documentResponse = await fetch(url);
      expect(await documentResponse.text()).toContain('DIST DOCUMENT');
      expect(documentResponse.headers.get('cross-origin-resource-policy')).toBe('same-origin');

      const scriptResponse = await fetch(new URL('/assets/app.js', url));
      expect(await scriptResponse.text()).toBe('dist-script');
      expect(scriptResponse.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    } finally {
      await preview.stopAll();
    }
  });

  it('serves only packaged media when the strict playtest overlay is disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-strict-assets-test-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'Strict Delivery Preview Game',
      idea: 'Verify playtests cannot see media omitted from the production build.',
      parentDirectory: join(root, 'games'),
      model: null,
    });
    const publicAssetDirectory = join(project.root, 'public/assets/images');
    const distAssetDirectory = join(project.root, 'dist/assets/images');
    await mkdir(publicAssetDirectory, { recursive: true });
    await mkdir(distAssetDirectory, { recursive: true });
    await writeFile(join(project.root, 'dist/index.html'), '<!doctype html><p>DIST DOCUMENT</p>');
    await writeFile(join(publicAssetDirectory, 'hero.png'), 'fresh-source-image');
    await writeFile(join(distAssetDirectory, 'hero.png'), 'packaged-image');

    const preview = new PreviewServer();
    try {
      const url = await preview.start(project.id, project.root, {
        directory: 'dist',
        sourceFallback: false,
        sourceAssetOverlay: false,
      });
      const response = await fetch(new URL('/assets/images/hero.png', url));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('packaged-image');
    } finally {
      await preview.stopAll();
    }
  });

  it('does not fall back to dist when a public media path escapes through a symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opengame-preview-symlink-assets-test-'));
    roots.push(root);
    const store = new ProjectStore(join(root, 'projects.json'), join(root, 'games'));
    const project = await store.create({
      name: 'Symlink Asset Preview Game',
      idea: 'Verify public media stays within the project asset namespace.',
      parentDirectory: join(root, 'games'),
      model: null,
    });
    const distAssetDirectory = join(project.root, 'dist/assets/images');
    const externalAssetDirectory = join(root, 'external-assets');
    await mkdir(distAssetDirectory, { recursive: true });
    await mkdir(externalAssetDirectory, { recursive: true });
    await writeFile(join(project.root, 'dist/index.html'), '<!doctype html><p>DIST DOCUMENT</p>');
    await writeFile(join(distAssetDirectory, 'trap.png'), 'dist-image');
    await writeFile(join(externalAssetDirectory, 'trap.png'), 'external-image');
    await rm(join(project.root, 'public/assets/images'), { recursive: true, force: true });
    await symlink(externalAssetDirectory, join(project.root, 'public/assets/images'), 'dir');

    const preview = new PreviewServer();
    try {
      const url = await preview.start(project.id, project.root);
      const response = await fetch(new URL('/assets/images/trap.png', url));
      expect(response.status).toBe(404);
      expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    } finally {
      await preview.stopAll();
    }
  });
});
