import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LaunchTransition } from './LaunchTransition';

describe('LaunchTransition', () => {
  it('renders the glass boot sequence for a new game', () => {
    const markup = renderToStaticMarkup(createElement(LaunchTransition, { phase: 'running' }));

    expect(markup).toContain('正在建立新游戏');
    expect(markup).toContain('把创意编译进制作工作台');
    expect(markup).toContain('launch-transition-log');
    expect(markup.match(/<li/gu)).toHaveLength(4);
  });
});
