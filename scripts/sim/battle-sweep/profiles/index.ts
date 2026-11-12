import { GRIM_PROFILE } from './grim-d100';
import { HEROES_HOMM_PROFILE } from './heroes-homm';
import { SRD_PROFILE } from './srd-5.2';
import { SRD_MORALE_PROFILE } from './srd-5.2-morale';
import type { SweepMode, SweepProfile } from './types';

export type { SweepMode, SweepProfile } from './types';

export const SWEEP_PROFILES: readonly SweepProfile[] = [
    SRD_PROFILE,
    SRD_MORALE_PROFILE,
    HEROES_HOMM_PROFILE,
    GRIM_PROFILE,
];

/** `required`: the run must resolve morale checks; `absent`: a d20 template without the module must never see one */
export const moraleExpectation = (
    profile: SweepProfile
): 'required' | 'absent' | undefined => {
    if (profile.rules?.modules.includes('morale')) return 'required';

    return profile.source.kind === 'template' && profile.judge === 'client'
        ? 'absent'
        : undefined;
};

export const profileOf = (key: string): SweepProfile | undefined =>
    SWEEP_PROFILES.find((p) => p.key === key);

export const modeRuns = (
    profile: SweepProfile,
    mode: string,
    wanted: SweepMode
): boolean =>
    profile.modes.includes(wanted) &&
    (mode === 'all' ||
        mode === wanted ||
        (mode === 'targeted' &&
            ['targeted', 'aura', 'reserve', 'map', 'maze'].includes(wanted)));
