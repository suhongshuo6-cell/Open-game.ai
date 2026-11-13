import { describe, expect, it } from 'vitest';
import type { OpenGameCrewMember } from '../../shared/contracts';
import { assignOpenGameCrewRole, toggleOpenGameCrewMember } from './OpenGameCrewPicker';

const baseCrew: readonly OpenGameCrewMember[] = [
  { packId: 'classic', role: 'planner' },
  { packId: 'mosslight', role: 'artist' },
];

describe('OpenGameCrewPicker helpers', () => {
  it('adds a unique pack in the first unfilled role and enforces the limits', () => {
    expect(toggleOpenGameCrewMember(baseCrew, 'classic')).toEqual(baseCrew);
    const full = toggleOpenGameCrewMember(baseCrew, 'starforge');
    expect(full).toEqual([...baseCrew, { packId: 'starforge', role: 'engineer' }]);
    expect(toggleOpenGameCrewMember(full, 'mosslight')).toEqual([
      { packId: 'classic', role: 'planner' }, { packId: 'starforge', role: 'engineer' },
    ]);
  });
  it('swaps occupied roles instead of producing duplicate assignments', () => {
    expect(assignOpenGameCrewRole(baseCrew, 'mosslight', 'planner')).toEqual([
      { packId: 'classic', role: 'artist' }, { packId: 'mosslight', role: 'planner' },
    ]);
  });
});
