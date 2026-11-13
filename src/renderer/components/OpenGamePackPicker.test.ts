import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OPENGAME_PACK_IDS } from '../../shared/contracts';
import {
  OPENGAME_PACK_OPTIONS,
  OpenGamePackPicker,
  opengamePackGridColumnCount,
} from './OpenGamePackPicker';

describe('OpenGamePackPicker', () => {
  it('offers exactly every supported Open game.ai production pack', () => {
    expect(OPENGAME_PACK_OPTIONS.map((option) => option.id)).toEqual([...OPENGAME_PACK_IDS]);
  });

  it('derives keyboard navigation columns from the rendered grid', () => {
    vi.stubGlobal('getComputedStyle', vi.fn(() => ({
      gridTemplateColumns: '280px 280px',
    } as CSSStyleDeclaration)));

    expect(opengamePackGridColumnCount({} as HTMLElement)).toBe(2);
    vi.unstubAllGlobals();
  });

  it('falls back to one navigation column before the grid is mounted', () => {
    expect(opengamePackGridColumnCount(null)).toBe(1);
  });

  it('renders exactly one selected character without binding it to a scene preview', () => {
    const markup = renderToStaticMarkup(createElement(OpenGamePackPicker, {
      value: 'mosslight',
      mode: 'global',
      presentation: 'character',
      onChange: vi.fn(),
    }));

    expect(markup).toContain('aria-label="选择默认 Open game.ai 角色"');
    expect(markup.match(/data-pack-kind="character"/gu)).toHaveLength(OPENGAME_PACK_IDS.length);
    expect(markup.match(/aria-checked="true"/gu)).toHaveLength(1);
    expect(markup).toContain('苔光游侠');
    expect(markup).not.toContain('opengame-pack-scene-image');
  });
});
