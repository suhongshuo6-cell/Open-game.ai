import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AgentEvent } from '../../shared/contracts';
import { consoleTelemetry, ProductionConsole } from './ProductionConsole';

function event(partial: Partial<AgentEvent> & Pick<AgentEvent, 'kind' | 'timestamp'>): AgentEvent {
  return {
    id: `${partial.kind}-${partial.timestamp}-${partial.title ?? ''}`,
    projectId: 'p',
    title: partial.title ?? partial.kind,
    message: partial.message ?? '',
    stage: partial.stage ?? 'brief',
    ...partial,
  };
}

describe('consoleTelemetry', () => {
  it('only counts the turn that began with the latest user prompt', () => {
    const events = [
      event({ kind: 'user', timestamp: '2026-01-01T00:00:00.000Z' }),
      event({ kind: 'tool', timestamp: '2026-01-01T00:00:05.000Z' }),
      event({ kind: 'user', timestamp: '2026-01-01T00:01:00.000Z' }),
      event({ kind: 'tool', timestamp: '2026-01-01T00:01:10.000Z' }),
      event({ kind: 'file', timestamp: '2026-01-01T00:01:20.000Z', title: 'src/a.ts' }),
      event({ kind: 'file', timestamp: '2026-01-01T00:01:30.000Z', title: 'src/a.ts' }),
    ];
    const telemetry = consoleTelemetry(events, Date.parse('2026-01-01T00:01:42.000Z'));
    expect(telemetry).toEqual({ elapsedMs: 42_000, events: 4, tools: 1, files: 1 });
  });
});

describe('ProductionConsole', () => {
  it('renders every pipeline stage around the progress ring', () => {
    const markup = renderToStaticMarkup(createElement(ProductionConsole, {
      stage: 'assets',
      status: 'running',
      events: [event({ kind: 'tool', timestamp: '2026-01-01T00:00:00.000Z', title: 'opengame_image_generate' })],
    }));
    expect(markup.match(/class="console-node/gu)).toHaveLength(8);
    expect(markup).toContain('console-node is-active');
    expect(markup).toContain('opengame_image_generate');
    expect(markup).toContain('console-sweep');
  });
});
