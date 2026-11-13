/**
 * Browser demo runtime.
 *
 * When the renderer is opened outside Electron (plain `vite` / a static host),
 * there is no preload bridge. This module installs a self-contained
 * `window.opengame` that simulates the Codex production loop so the full UI can be
 * explored without a Codex account — handy for portfolio demos and UI work.
 * Electron builds never reach this code path because preload defines
 * `window.opengame` before the renderer boots.
 */
import type {
  AgentEvent,
  AgentEventKind,
  AppSettings,
  ApprovalRequest,
  AssetPlanRecord,
  BootstrapPayload,
  ExtensionSettingsSnapshot,
  FileNode,
  GameAssetRecord,
  GameplayExperienceReport,
  OpenGameApi,
  PipelineStage,
  ProjectInspectorPayload,
  ProjectRecord,
  RuntimeStatus,
} from '../../shared/contracts';

type Listener<T> = (value: T) => void;

const STORAGE_KEY = 'opengame-demo-state-v2';
const DEMO_GAME_PATH = 'demo/signal-garden/index.html';

interface DemoState {
  projects: ProjectRecord[];
  events: Record<string, AgentEvent[]>;
  reports: Record<string, GameplayExperienceReport | null>;
  settings: AppSettings;
}

const runtime: RuntimeStatus = {
  state: 'ready',
  binaryPath: '/Applications/Open game.ai.app/Contents/Resources/codex',
  version: 'codex-cli 0.168.0 · demo',
  codexHome: '~/Library/Application Support/Open game.ai/codex-home',
  account: { type: 'chatgpt', email: 'demo@opengame.ai', planType: 'pro' },
  models: [
    {
      id: 'gpt-6.1-sol',
      model: 'gpt-6.1-sol',
      displayName: 'GPT-6.1-Sol',
      description: 'Latest frontier agentic coding model',
      isDefault: true,
      defaultEffort: 'low',
      efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    },
    {
      id: 'gpt-6.1-terra',
      model: 'gpt-6.1-terra',
      displayName: 'GPT-6.1 Terra',
      description: 'Balanced speed and depth for long builds',
      isDefault: false,
      defaultEffort: 'low',
      efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    },
    {
      id: 'gpt-6-astra',
      model: 'gpt-6-astra',
      displayName: 'GPT-6-Astra',
      description: 'Previous generation flagship',
      isDefault: false,
      defaultEffort: 'medium',
      efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    },
    {
      id: 'gpt-5.6-sol',
      model: 'gpt-5.6-sol',
      displayName: 'GPT-5.6-Sol',
      description: 'Legacy model',
      isDefault: false,
      defaultEffort: 'low',
      efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    },
  ],
  capabilities: {
    namespaceTools: true,
    imageGeneration: true,
    externalImageGeneration: true,
    webSearch: true,
  },
  error: null,
};

const defaultSettings: AppSettings = {
  defaultWorkspace: '~/Games',
  defaultModel: 'gpt-6.1-sol',
  defaultEffort: 'low',
  defaultOpenGameStageMode: 'solo',
  defaultOpenGameSoloSceneId: 'classic',
  defaultOpenGameSceneId: 'collaboration',
  defaultOpenGamePackId: 'classic',
  defaultOpenGameCrew: [
    { packId: 'classic', role: 'planner' },
    { packId: 'mosslight', role: 'artist' },
    { packId: 'starforge', role: 'engineer' },
  ],
  theme: 'dark',
};

/** Scripted production loop: [stage, kind, title, message, delayMs]. */
const SCRIPT: Array<[PipelineStage, AgentEventKind, string, string, number]> = [
  ['brief', 'lifecycle', 'Turn started', 'Planner 已接管：只读分析需求与参考附件。', 500],
  ['brief', 'thought', '拆解核心循环', '玩家目标 → 收集 5 个能量节点；阻力 → 移动障碍；反馈 → 计分、粒子、屏幕震动；收尾 → 胜负结算与一键重开。', 1100],
  ['brief', 'plan', 'Production plan', '1. 选择引擎：2D 俯视角、无物理约束 → Web Canvas\n2. 生成工程骨架与 .opengame/playtest.json\n3. GDD：操作、规则、难度曲线\n4. 素材：玩家、节点、障碍 3 张 AI 图片 + 程序化音效\n5. 实现、构建、自动试玩', 1300],
  ['scaffold', 'tool', 'npm create vite', '$ npm create vite@latest . -- --template vanilla-ts\n✓ scaffolded 9 files in 1.2s', 1100],
  ['scaffold', 'file', 'src/main.ts', '+ 新增入口：固定 60 FPS simulation step，渲染与输入解耦。', 800],
  ['gdd', 'assistant', 'GDD 已写入 docs/GDD.md', '操作：WASD / 方向键\n规则：触碰红色障碍扣 1 点护盾，护盾归零失败\n胜利：5/5 节点\n难度：每收集 1 个节点障碍速度 +12%', 1300],
  ['assets', 'tool', 'opengame_image_generate', '→ configured-api · player-collector.png 512×512 ✓\n→ configured-api · energy-node.png 256×256 ✓\n→ codex-imagegen · hazard-orb.png 256×256 ✓', 1700],
  ['assets', 'tool', 'opengame_audio_generate', '→ procedural-audio · pickup.wav / hit.wav / win.wav ✓', 900],
  ['world', 'file', 'src/world/level.ts', '+ 关卡布局：网格 32px，节点随机分布且与出生点保持 ≥ 160px。', 1000],
  ['code', 'file', 'src/game/collector.ts', '+ 玩家惯性移动、拾取判定与护盾逻辑（+184 行）', 1100],
  ['code', 'file', 'src/game/hazards.ts', '+ 障碍巡航与随难度加速（+96 行）', 900],
  ['code', 'thought', '处理手感', '加入 120ms 缓入缓出与拾取时 6 帧 hit-stop，让操作反馈更清晰。', 1000],
  ['verify', 'tool', 'npm run build', '$ vite build\n✓ 23 modules transformed\ndist/index.html 0.46 kB · dist/assets/index.js 18.2 kB\n✓ built in 412ms', 1300],
  ['verify', 'lifecycle', 'Reviewer 独立审查', 'Reviewer：素材均被生产代码引用；胜负与重开路径完整。结论 PASS。', 1400],
  ['verify', 'tool', 'Host playtest', '隐藏浏览器试玩：加载 ✓ 无运行错误 ✓ 画面可见 ✓ 输入响应 ✓ 持续动画 ✓ 重开 ✓', 1600],
  ['complete', 'assistant', '交付完成', 'Signal Garden 已通过 Reviewer 与宿主门禁，可在右侧直接试玩，也可以继续提出修改。', 700],
];

const DEMO_FILES: FileNode[] = [
  { name: 'index.html', relativePath: 'index.html', type: 'file', size: 812 },
  { name: 'package.json', relativePath: 'package.json', type: 'file', size: 402 },
  { name: 'AGENTS.md', relativePath: 'AGENTS.md', type: 'file', size: 2310 },
  {
    name: 'src',
    relativePath: 'src',
    type: 'directory',
    children: [
      { name: 'main.ts', relativePath: 'src/main.ts', type: 'file', size: 1460 },
      {
        name: 'game',
        relativePath: 'src/game',
        type: 'directory',
        children: [
          { name: 'collector.ts', relativePath: 'src/game/collector.ts', type: 'file', size: 4210 },
          { name: 'hazards.ts', relativePath: 'src/game/hazards.ts', type: 'file', size: 2088 },
        ],
      },
    ],
  },
  {
    name: 'docs',
    relativePath: 'docs',
    type: 'directory',
    children: [{ name: 'GDD.md', relativePath: 'docs/GDD.md', type: 'file', size: 1820 }],
  },
];

const FILE_CONTENT: Record<string, string> = {
  'src/main.ts': `import { createWorld } from './world/level';\nimport { Collector } from './game/collector';\n\nconst STEP = 1000 / 60; // host-managed simulation rate\nlet acc = 0;\nlet last = performance.now();\n\nfunction frame(now: number) {\n  acc += now - last;\n  last = now;\n  while (acc >= STEP) {\n    world.update(STEP / 1000);\n    acc -= STEP;\n  }\n  world.render(acc / STEP);\n  requestAnimationFrame(frame);\n}\n`,
  'docs/GDD.md': '# Signal Garden\n\n## Loop\n收集 5 个能量节点，躲避巡航障碍。\n\n## Controls\nWASD / Arrow keys\n\n## Win / Lose\n5/5 胜利；护盾归零失败；点击画面重开。\n',
};

function now(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedState(): DemoState {
  const created = new Date(Date.now() - 1000 * 60 * 42).toISOString();
  const completed: ProjectRecord = {
    id: 'demo-signal-garden',
    name: 'Signal Garden',
    pinned: true,
    idea: '操控信号采集器，在移动障碍中收集五个能量节点并完成一局可立即重玩的游戏。',
    root: '~/Games/signal-garden',
    createdAt: created,
    updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    status: 'completed',
    stage: 'complete',
    engine: 'web',
    targetFrameRate: 60,
    opengamePackOverrideId: null,
    opengameCrewOverride: null,
    model: 'gpt-6.1-sol',
    threadId: 'thr_7f3a9c21e0b4',
    toolsetVersion: 3,
    activeTurnId: null,
    lastError: null,
    icon: null,
  };
  const extra: ProjectRecord[] = [
    {
      ...completed,
      id: 'demo-neon-drift',
      name: 'Neon Drift',
      pinned: false,
      idea: '一个霓虹赛博街机竞速：漂移积攒氮气，三圈计时，躲避对手。',
      root: '~/Games/neon-drift',
      status: 'waiting',
      stage: 'code',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      threadId: 'thr_19bd55aa0c71',
    },
    {
      ...completed,
      id: 'demo-moss-keeper',
      name: 'Moss Keeper',
      pinned: false,
      idea: '第三人称 3D 森林守护者：修复古老石碑，驱散雾中的影子。',
      root: '~/Games/moss-keeper',
      engine: 'godot',
      status: 'stopped',
      stage: 'assets',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      threadId: 'thr_c0e4d8812f9a',
    },
  ];
  const events: AgentEvent[] = SCRIPT.map(([stage, kind, title, message], index) => ({
    id: `seed-${index}`,
    projectId: completed.id,
    kind,
    title,
    message,
    stage,
    timestamp: new Date(Date.parse(created) + index * 37_000).toISOString(),
  }));
  events.unshift({
    id: 'seed-user',
    projectId: completed.id,
    kind: 'user',
    title: '制作要求',
    message: completed.idea,
    stage: 'brief',
    timestamp: new Date(Date.parse(created) - 4_000).toISOString(),
  });
  return {
    projects: [completed, ...extra],
    events: { [completed.id]: events },
    reports: { [completed.id]: makeReport() },
    settings: defaultSettings,
  };
}

function makeReport(): GameplayExperienceReport {
  return {
    version: 1,
    verdict: 'pass',
    score: 92,
    checkedAt: now(),
    durationMs: 8_420,
    reportPath: '.opengame/playtest/report.json',
    summary: '核心循环完整，输入响应稳定，持续动画流畅。',
    checks: [
      { id: 'load', label: '加载', status: 'pass', message: '首帧 312ms', durationMs: 312 },
      { id: 'runtime-errors', label: '运行稳定', status: 'pass', message: '0 个控制台错误' },
      { id: 'visible-surface', label: '可见画面', status: 'pass', message: '画布覆盖 100%' },
      { id: 'input-response', label: '操作反馈', status: 'pass', message: 'WASD 触发位移 ✓' },
      { id: 'continuous-render', label: '持续动画', status: 'pass', message: '58.9 fps 中位数' },
      { id: 'restart', label: '可重开', status: 'pass', message: '点击后状态重置' },
    ],
  };
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    // fall through to a fresh seed
  }
  return seedState();
}

export function installDemoRuntime(): void {
  const state = loadState();
  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage is optional in demo mode
    }
  };

  const listeners = {
    event: new Set<Listener<AgentEvent>>(),
    project: new Set<Listener<ProjectRecord>>(),
    runtime: new Set<Listener<RuntimeStatus>>(),
    approval: new Set<Listener<ApprovalRequest>>(),
    approvalClosed: new Set<Listener<string>>(),
    assets: new Set<Listener<{ projectId: string; assets: GameAssetRecord[] }>>(),
    plans: new Set<Listener<{ projectId: string; assetPlans: AssetPlanRecord[] }>>(),
  };
  const timers = new Map<string, number[]>();

  function subscribe<T>(set: Set<Listener<T>>, listener: Listener<T>) {
    set.add(listener);
    return () => set.delete(listener);
  }

  function update(projectId: string, patch: Partial<ProjectRecord>): ProjectRecord {
    const index = state.projects.findIndex((item) => item.id === projectId);
    if (index < 0) throw new Error('项目不存在');
    const next = { ...state.projects[index]!, ...patch, updatedAt: now() };
    state.projects[index] = next;
    persist();
    listeners.project.forEach((listener) => listener(next));
    return next;
  }

  function emit(event: AgentEvent) {
    (state.events[event.projectId] ??= []).push(event);
    persist();
    listeners.event.forEach((listener) => listener(event));
  }

  function find(projectId: string): ProjectRecord {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) throw new Error('项目不存在');
    return project;
  }

  function play(projectId: string, prompt: string) {
    stop(projectId);
    const handles: number[] = [];
    let elapsed = 250;
    emit({
      id: uid('evt'),
      projectId,
      kind: 'user',
      title: '制作要求',
      message: prompt,
      stage: find(projectId).stage === 'complete' ? 'code' : 'brief',
      timestamp: now(),
    });
    SCRIPT.forEach(([stage, kind, title, message, delay], index) => {
      elapsed += delay;
      handles.push(window.setTimeout(() => {
        emit({ id: uid('evt'), projectId, kind, title, message, stage, timestamp: now() });
        const last = index === SCRIPT.length - 1;
        if (last) state.reports[projectId] = makeReport();
        update(projectId, last
          ? { stage, status: 'completed', activeTurnId: null }
          : { stage });
      }, elapsed));
    });
    timers.set(projectId, handles);
  }

  function stop(projectId: string) {
    timers.get(projectId)?.forEach((handle) => window.clearTimeout(handle));
    timers.delete(projectId);
  }

  const previewUrl = new URL(DEMO_GAME_PATH, window.location.href).toString();

  const api: OpenGameApi = {
    async bootstrap(): Promise<BootstrapPayload> {
      // Projects left "running" by a reload resume their scripted loop.
      for (const project of state.projects) {
        if (project.status === 'running') {
          state.projects = state.projects.map((item) =>
            item.id === project.id ? { ...item, status: 'waiting' } : item);
        }
      }
      return {
        projects: [...state.projects],
        settings: state.settings,
        runtime,
        events: state.events,
      };
    },
    refreshRuntime: async () => runtime,
    startLogin: async () => ({ type: 'chatgpt' }),
    logout: async () => runtime,
    chooseDirectory: async () => '~/Games',
    chooseProjectDirectory: async () => '~/Games/new-game',
    async createProject(input) {
      const name = deriveName(input.idea);
      const project: ProjectRecord = {
        id: uid('proj'),
        name,
        pinned: false,
        idea: input.idea,
        root: `~/Games/${name.toLowerCase().replace(/\s+/g, '-')}`,
        createdAt: now(),
        updatedAt: now(),
        status: 'draft',
        stage: 'brief',
        engine: /3d|godot|第三人称/i.test(input.idea) ? 'godot' : 'web',
        targetFrameRate: 60,
        opengamePackOverrideId: null,
        opengameCrewOverride: null,
        model: input.model ?? null,
        threadId: null,
        toolsetVersion: 3,
        activeTurnId: null,
        lastError: null,
        icon: null,
      };
      state.projects.unshift(project);
      state.reports[project.id] = null;
      persist();
      return project;
    },
    renameProject: async (projectId, name) => update(projectId, { name }),
    setProjectPinned: async (projectId, pinned) => update(projectId, { pinned }),
    async deleteProject(projectId) {
      const project = find(projectId);
      stop(projectId);
      state.projects = state.projects.filter((item) => item.id !== projectId);
      delete state.events[projectId];
      persist();
      return project;
    },
    async runProject(input) {
      const project = update(input.projectId, {
        status: 'running',
        activeTurnId: uid('turn'),
        threadId: find(input.projectId).threadId ?? `thr_${Math.random().toString(16).slice(2, 14)}`,
      });
      play(input.projectId, input.prompt);
      return project;
    },
    async stopProject(projectId) {
      stop(projectId);
      return update(projectId, { status: 'stopped', activeTurnId: null });
    },
    revealProject: async () => null,
    importProjectAssets: async () => [],
    importDroppedProjectAssets: async () => [],
    retryAssetPlan: async (projectId, planId) => demoPlans(projectId).find((plan) => plan.id === planId)!,
    async inspectProject(projectId): Promise<ProjectInspectorPayload> {
      const project = find(projectId);
      const ready = project.stage === 'complete' || ['verify'].includes(project.stage);
      return {
        files: project.status === 'draft' ? DEMO_FILES.slice(0, 3) : DEMO_FILES,
        previewUrl: ready || project.status !== 'draft' ? previewUrl : '',
        assets: ready ? demoAssets() : [],
        assetPlans: demoPlans(projectId),
        imageGenerationGate: {
          state: ready ? 'trusted-referenced' : 'missing',
          relativePaths: ready ? demoAssets().map((asset) => asset.relativePath) : [],
        },
        experienceReport: state.reports[projectId] ?? null,
      };
    },
    async evaluateProjectExperience(projectId) {
      await new Promise((resolve) => setTimeout(resolve, 2_400));
      const report = makeReport();
      state.reports[projectId] = report;
      persist();
      return report;
    },
    cancelProjectExperience: async () => undefined,
    async readProjectFile(_projectId, relativePath) {
      return {
        relativePath,
        content: FILE_CONTENT[relativePath] ?? `// ${relativePath}\n// Demo 模式：文件内容由 Codex 在本地工程中生成。\n`,
        truncated: false,
        binary: false,
      };
    },
    getProjectIcon: async () => null,
    saveProjectOpenGamePack: async (projectId, packId) => update(projectId, { opengamePackOverrideId: packId }),
    saveProjectOpenGameCrew: async (projectId, crew) => update(projectId, { opengameCrewOverride: crew ? [...crew] : null }),
    async saveSettings(patch) {
      state.settings = { ...state.settings, ...patch };
      persist();
      return state.settings;
    },
    getEnvironmentStatus: async () => environment(),
    refreshEnvironmentStatus: async () => environment(),
    chooseGodotExecutable: async () => null,
    saveGodotExecutable: async () => environment(),
    getExtensionSettings: async () => extensions(),
    saveMediaProvider: async (input) => ({
      ...extensions().mediaProviders[0]!,
      ...input,
      hasApiKey: true,
      keyHint: '••••demo',
      status: 'untested',
    }),
    testMediaProvider: async (capability) => ({
      capability,
      ok: true,
      message: 'Demo 模式：连接正常',
      latencyMs: 182,
      testedAt: now(),
    }),
    listSkills: async () => extensions().skills,
    setSkillEnabled: async ({ id, enabled }) => ({ ...extensions().skills.find((skill) => skill.id === id)!, enabled }),
    listMcpServers: async () => [],
    saveMcpServer: async (input) => ({
      id: input.id,
      transport: input.transport,
      command: input.command ?? null,
      args: input.args ?? [],
      url: input.url ?? null,
      enabled: input.enabled,
      bearerTokenEnvVar: input.bearerTokenEnvVar ?? null,
      status: 'stopped',
      statusMessage: null,
    }),
    removeMcpServer: async () => undefined,
    listPromptTemplates: async () => extensions().promptTemplates,
    savePromptTemplate: async (input) => ({ ...extensions().promptTemplates[0]!, ...input, customized: true }),
    resetPromptTemplate: async (id) => extensions().promptTemplates.find((item) => item.id === id)!,
    resolveApproval: async (token) => {
      listeners.approvalClosed.forEach((listener) => listener(token));
    },
    onAgentEvent: (listener) => subscribe(listeners.event, listener),
    onProjectChanged: (listener) => subscribe(listeners.project, listener),
    onRuntimeChanged: (listener) => subscribe(listeners.runtime, listener),
    onApproval: (listener) => subscribe(listeners.approval, listener),
    onApprovalClosed: (listener) => subscribe(listeners.approvalClosed, listener),
    onAssetsChanged: (listener) => subscribe(listeners.assets, listener),
    onAssetPlansChanged: (listener) => subscribe(listeners.plans, listener),
  };

  window.opengame = api;
  document.documentElement.dataset.demo = 'true';
}

function deriveName(idea: string): string {
  const english = idea.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/);
  if (english) return english[0];
  const pool = ['Nova Loop', 'Pixel Tide', 'Echo Runner', 'Orbit Garden', 'Glass Arena', 'Signal Rush'];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function demoAssets(): GameAssetRecord[] {
  const base = { source: 'generated' as const, sha256: 'demo', createdAt: now(), provider: 'configured-api' };
  return [
    { ...base, id: 'a1', name: 'player-collector', kind: 'image', relativePath: 'public/assets/player-collector.png', mimeType: 'image/png', size: 48_210 },
    { ...base, id: 'a2', name: 'energy-node', kind: 'image', relativePath: 'public/assets/energy-node.png', mimeType: 'image/png', size: 21_877 },
    { ...base, id: 'a3', name: 'hazard-orb', kind: 'image', relativePath: 'public/assets/hazard-orb.png', mimeType: 'image/png', size: 19_402 },
    { ...base, id: 'a4', name: 'pickup', kind: 'audio', source: 'procedural', relativePath: 'public/assets/pickup.wav', mimeType: 'audio/wav', size: 8_820 },
  ];
}

function demoPlans(_projectId: string): AssetPlanRecord[] {
  return [];
}

function environment() {
  return {
    state: 'ready' as const,
    tools: [
      { id: 'node' as const, label: 'Node.js', state: 'ready' as const, version: 'v22.12.0', binaryPath: '/usr/local/bin/node', configuredPath: null, source: 'path' as const, message: '已就绪' },
      { id: 'codex' as const, label: 'Codex', state: 'ready' as const, version: '0.168.0', binaryPath: 'bundled', configuredPath: null, source: 'bundled' as const, message: '已就绪' },
      { id: 'godot' as const, label: 'Godot 4', state: 'ready' as const, version: '4.7.1.stable', binaryPath: '/Applications/Godot.app', configuredPath: null, source: 'application' as const, message: '已就绪' },
    ],
    exportTemplates: {
      state: 'ready' as const,
      expectedVersion: '4.7.1.stable',
      basePath: null,
      versionPath: null,
      installedVersions: ['4.7.1.stable'],
      targets: { web: true, macos: true, windows: false, linux: false },
      issues: [],
    },
    canCreateGodotProjects: true,
    canExportGodotProjects: true,
    checkedAt: now(),
  };
}

function extensions(): ExtensionSettingsSnapshot {
  return {
    mediaProviders: [
      { capability: 'image', provider: 'openai-images', model: 'gpt-image-2', endpoint: 'https://api.example.com/v1', enabled: true, hasApiKey: true, keyHint: '••••demo', status: 'ready', statusMessage: 'Demo 模式', lastTestedAt: now() },
      { capability: 'audio', provider: 'minimax', model: 'music-2', endpoint: '', enabled: false, hasApiKey: false, keyHint: null, status: 'unconfigured', statusMessage: null, lastTestedAt: null },
      { capability: 'model3d', provider: 'meshy', model: 'meshy-5', endpoint: '', enabled: false, hasApiKey: false, keyHint: null, status: 'unconfigured', statusMessage: null, lastTestedAt: null },
    ],
    skills: [
      { id: 'opengame-imagegen', name: 'opengame-imagegen', description: '宿主图片生成门禁（Open game.ai 必需）', source: 'built-in', path: null, enabled: true },
      { id: 'web-game-kit', name: 'web-game-kit', description: 'Canvas / Three.js 游戏脚手架', source: 'user', path: null, enabled: true },
    ],
    mcpServers: [],
    promptTemplates: (['planner', 'implementer', 'reviewer', 'repair'] as const).map((id) => ({
      id,
      name: id[0]!.toUpperCase() + id.slice(1),
      description: `${id} 角色偏好`,
      content: '',
      enabled: true,
      customized: false,
    })),
  };
}
