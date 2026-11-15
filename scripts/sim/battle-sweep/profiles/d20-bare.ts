import type { SweepProfile } from './types';

export const D20_BARE_PROFILE: SweepProfile = {
    key: 'd20-bare',
    template: 'srd-5.2',
    judge: 'client',
    source: { kind: 'template', importIfMissing: false },
    modes: ['sweep'],
    maxBattles: 6,
    unitsPerBattle: 6,
    heroCount: 4,
    heroLevel: 5,
    rules: { systemKey: 'd20', modules: [], patch: {} },
};
