import { describe, expect, it } from 'vitest';

import { sortModelsNewestFirst } from './codexAppServer.js';

describe('sortModelsNewestFirst', () => {
  it('lists the newest generation first and keeps server order within a generation', () => {
    const ordered = sortModelsNewestFirst([
      { model: 'gpt-5.6-sol' },
      { model: 'gpt-6.1-sol' },
      { model: 'gpt-6-astra' },
      { model: 'gpt-5.6-terra' },
      { model: 'gpt-6.1-terra' },
      { model: 'gpt-5.5' },
    ]).map((item) => item.model);
    expect(ordered).toEqual([
      'gpt-6.1-sol',
      'gpt-6.1-terra',
      'gpt-6-astra',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-5.5',
    ]);
  });
});
