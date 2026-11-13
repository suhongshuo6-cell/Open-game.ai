import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OPENGAME_PACK_IDS, OPENGAME_SCENE_IDS } from '../../shared/contracts';
import {
  OPENGAME_SCENE_OPTIONS,
  OPENGAME_SOLO_SCENE_OPTIONS,
  OpenGameScenePicker,
  OpenGameSoloScenePicker,
} from './OpenGameScenePicker';

describe('OpenGameScenePicker', () => {
  it('offers exactly every supported running background', () => {
    expect(OPENGAME_SCENE_OPTIONS.map((option) => option.id)).toEqual([...OPENGAME_SCENE_IDS]);
  });

  it('offers every pack scene as a character-independent solo workspace', () => {
    expect(OPENGAME_SOLO_SCENE_OPTIONS.map((option) => option.id)).toEqual([...OPENGAME_PACK_IDS]);
    expect(OPENGAME_SOLO_SCENE_OPTIONS.every((option) => (
      option.badges.includes('单人工作室') && option.badges.includes('角色独立选择')
    ))).toBe(true);

    const markup = renderToStaticMarkup(createElement(OpenGameSoloScenePicker, {
      value: 'starforge',
      onChange: vi.fn(),
    }));

    expect(markup).toContain('aria-label="选择单人工作室"');
    expect(markup).toContain('data-scene-kind="solo"');
    expect(markup).toMatch(
      /<button[^>]*aria-checked="true"[^>]*data-scene-id="starforge"[^>]*data-scene-kind="solo"/u,
    );
  });

  it('keeps the collaboration scene available as the static crew-aware option', () => {
    const markup = renderToStaticMarkup(createElement(OpenGameScenePicker, {
      value: 'collaboration',
      busy: true,
      onChange: vi.fn(),
    }));

    expect(markup).toContain('data-scene-id="collaboration"');
    expect(markup).toContain('data-motion="static"');
    expect(markup).toContain('按编队渲染');
    expect(markup).toContain('aria-busy="true"');
    expect(markup.match(/disabled=""/gu)).toHaveLength(OPENGAME_SCENE_OPTIONS.length);
  });

  it('keeps multiplayer scenes unselected but keyboard reachable while solo is active', () => {
    const markup = renderToStaticMarkup(createElement(OpenGameScenePicker, {
      value: null,
      onChange: vi.fn(),
    }));

    expect(markup).toContain('aria-label="选择多人运行背景"');
    expect(markup).not.toContain('aria-checked="true"');
    expect(markup.match(/tabindex="0"/gu)).toHaveLength(1);
  });
});
