import type { SweepProfile } from './types';

export const SRD_PROFILE: SweepProfile = {
    key: 'srd-5.2',
    judge: 'client',
    source: { kind: 'template', importIfMissing: false },
    modes: ['sweep', 'system'],
    maxBattles: 6,
    unitsPerBattle: 6,
    heroCount: 4,
    heroLevel: 5,
};
