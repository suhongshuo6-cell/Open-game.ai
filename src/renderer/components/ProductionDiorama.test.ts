import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  configuredProductionCrewMembers,
  opengameGroundShadowProfile,
  ProductionDiorama,
} from './ProductionDiorama';

describe('Open game.ai ground shadow profiles', () => {
  it('uses a slightly wider shadow while the actor is walking', () => {
    expect(opengameGroundShadowProfile('walk', 'walking')).toBe('walking');
    expect(opengameGroundShadowProfile('carry', 'walking')).toBe('walking');
  });

  it('uses a wide, flat contact shadow for the horizontal sleep pose', () => {
    expect(opengameGroundShadowProfile('sleep', 'acting')).toBe('sleeping');
  });

  it('keeps every other action on a stable standing shadow', () => {
    expect(opengameGroundShadowProfile('idle', 'acting')).toBe('standing');
    expect(opengameGroundShadowProfile('paint', 'acting')).toBe('standing');
    expect(opengameGroundShadowProfile('celebrate', 'acting')).toBe('standing');
  });

  it('renders four independently identified crew members in crew mode with one primary shadow', () => {
    const markup = renderToStaticMarkup(createElement(ProductionDiorama, {
      stage: 'code',
      status: 'running',
      stageMode: 'crew',
      packId: 'classic',
    }));

    expect(markup.match(/data-crew-role=/gu)).toHaveLength(4);
    expect(markup).toContain('data-scene-mode="collaboration"');
    expect(markup.match(/data-crew-active="true"/gu)).toHaveLength(1);
    expect(markup).toContain('data-active-crew-role="engineer"');
    for (const role of ['planner', 'artist', 'engineer', 'tester']) {
      expect(markup).toContain(`data-crew-role="${role}"`);
    }
    expect(markup.match(/data-opengame-ground-shadow="main"/gu)).toHaveLength(1);
    expect(markup).toContain('data-opengame-ground-shadow="planner"');
    expect(markup).toContain('data-opengame-ground-shadow="artist"');
    expect(markup).toContain('data-opengame-ground-shadow="tester"');
  });

  it('can render a compact two-person crew while retaining the active specialist', () => {
    const markup = renderToStaticMarkup(createElement(ProductionDiorama, {
      stage: 'assets',
      status: 'running',
      stageMode: 'crew',
      packId: 'classic',
      crewSize: 2,
    }));

    expect(markup.match(/data-crew-role=/gu)).toHaveLength(2);
    expect(markup).toContain('data-active-crew-role="artist"');
    expect(markup).toContain('data-crew-role="artist"');
  });

  it('uses one selected character in an independently selected solo scene by default', () => {
    const crew = [
      { packId: 'classic', role: 'planner' },
      { packId: 'mosslight', role: 'artist' },
      { packId: 'starforge', role: 'engineer' },
    ] as const;
    const markup = renderToStaticMarkup(createElement(ProductionDiorama, {
      stage: 'brief',
      status: 'running',
      packId: 'starforge',
      soloSceneId: 'starforge',
      crew,
    }));

    expect(markup.match(/data-crew-role=/gu)).toHaveLength(1);
    expect(markup).toContain('data-stage-mode="solo"');
    expect(markup).toContain('data-runtime-scene="starforge"');
    expect(markup).toContain('data-scene-mode="solo"');
    expect(markup).toContain('data-opengame-member-pack="starforge"');
    expect(markup).not.toContain('data-opengame-member-pack="mosslight"');
    expect(markup).not.toContain('collaboration/scene.png');
  });

  it('renders each configured role with its selected character pack', () => {
    const crew = [
      { packId: 'classic', role: 'planner' },
      { packId: 'mosslight', role: 'artist' },
      { packId: 'starforge', role: 'engineer' },
    ] as const;
    const markup = renderToStaticMarkup(createElement(ProductionDiorama, {
      stage: 'code',
      status: 'running',
      stageMode: 'crew',
      crew,
    }));

    expect(markup).toContain('data-crew-size="3"');
    expect(markup).toContain('data-opengame-member-pack="mosslight"');
    expect(markup).toContain('data-opengame-member-pack="starforge"');
    expect(markup).toContain('data-opengame-member-pack="starforge"');
    expect(markup).toContain('data-opengame-member-pack="classic"');
  });

  it('promotes the configured lead when the stage specialist is absent', () => {
    const crew = configuredProductionCrewMembers('code', 'running', [
      { packId: 'mosslight', role: 'planner' },
      { packId: 'starforge', role: 'artist' },
    ]);

    expect(crew).toHaveLength(2);
    expect(crew.find((member) => member.active)?.role).toBe('planner');
  });
});
