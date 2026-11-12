import type { SweepProfile } from './types';

export const GRIM_PROFILE: SweepProfile = {
    key: 'grim-d100',
    judge: 'server',
    source: { kind: 'template', importIfMissing: true },
    modes: ['sweep', 'system'],
    maxBattles: 5,
    unitsPerBattle: 6,
    heroCount: 4,
    heroLevel: 1,
};
