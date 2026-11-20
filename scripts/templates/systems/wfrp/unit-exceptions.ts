export interface UnitBandException {
    reason: string;
    combatBelowMin?: true;
    attackDamage?: true;
}

// slug -> narrow, documented deviation from UNIT_LEVEL_BANDS (canonical numbers kept)
export const UNIT_BAND_EXCEPTIONS: Record<string, UnitBandException> = {};
