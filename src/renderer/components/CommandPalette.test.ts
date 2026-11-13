import { describe, expect, it } from 'vitest';

import { fuzzyScore } from './CommandPalette';

describe('fuzzyScore', () => {
  it('prefers direct substring matches over scattered subsequences', () => {
    expect(fuzzyScore('garden', 'Signal Garden')).toBeGreaterThan(fuzzyScore('sgn', 'Signal Garden'));
  });

  it('rejects queries whose characters are not present in order', () => {
    expect(fuzzyScore('xyz', 'Signal Garden')).toBe(-1);
    expect(fuzzyScore('nedrag', 'garden')).toBe(-1);
  });

  it('treats an empty query as a neutral match', () => {
    expect(fuzzyScore('  ', 'anything')).toBe(0);
  });
});
