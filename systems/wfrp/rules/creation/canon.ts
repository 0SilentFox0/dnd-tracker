import { skillListed } from '../advancement/career';
import {
    CHARACTERISTIC_KEYS,
    type CharacteristicKey,
} from '../characteristics/keys';
import type { SpeciesProfile } from './profile';

/** Book p38-40: +6 / +3 over the career's level-1 characteristics for a rolled / rearranged set, 0 for free */
export const DISTRIBUTION_CAP = { rolled: 6, rearranged: 3, free: 0 } as const;

export const CAREER_SKILL_PURCHASES = 8;

export const SKILL_PURCHASE_CAP = 3;

/** Species languages start fluent: 6 purchases (+30), outside the per-skill cap */
export const LANGUAGE_PURCHASES = 6;

/** Free point range per characteristic under canon5e (p38) */
export const CANON_FREE_POINT_MAX = 16;

export type CareerTier1 = {
    characteristics: string[];
    skills: string[];
    talents: string[];
    trappings: string[];
};

export type CanonPicks = {
    /** The species came from the Species Table and the first result was kept */
    speciesRolled?: boolean;
    distribution?: Partial<Record<CharacteristicKey, number>>;
    speciesSkills?: string[];
    careerSkills?: Record<string, number>;
    careerTalent?: string;
};

export type CanonCtx = {
    step: number;
    tier1: Record<string, CareerTier1>;
};

export type CanonPlan = {
    bonus: Partial<Record<CharacteristicKey, number>>;
    skillAdvances: Record<string, number>;
    careerTalent?: string;
    trappings: string[];
    fate: number;
    fortune?: number;
};

const isKey = (k: string): k is CharacteristicKey =>
    (CHARACTERISTIC_KEYS as readonly string[]).includes(k);

function distributionOf(
    picks: CanonPicks,
    mode: 'rolled' | 'rearranged' | 'free',
    tier1: CareerTier1,
    errors: string[]
) {
    const entries = Object.entries(picks.distribution ?? {}).filter(
        ([, v]) => v !== 0
    );

    const bonus: Partial<Record<CharacteristicKey, number>> = {};

    let sum = 0;

    for (const [k, v] of entries) {
        if (
            !isKey(k) ||
            !tier1.characteristics.includes(k) ||
            !Number.isInteger(v) ||
            (v as number) < 0
        ) {
            errors.push('STATS_DISTRIBUTION');

            continue;
        }

        bonus[k] = v as number;
        sum += v as number;
    }

    if (sum > DISTRIBUTION_CAP[mode]) errors.push('STATS_DISTRIBUTION');

    return bonus;
}

export function planCanon(
    picks: CanonPicks,
    ctx: CanonCtx,
    input: {
        profile: SpeciesProfile;
        careerId: string;
        careerMode: 'rolled' | 'choice' | 'free';
        statsMode: 'rolled' | 'rearranged' | 'free';
    },
    errors: string[]
): CanonPlan | null {
    const { profile, careerId, statsMode } = input;

    const purchases: Record<string, number> = {};

    const speciesSkills = picks.speciesSkills ?? [];

    const speciesPicks = profile.skillPicks;

    if (
        speciesPicks &&
        (speciesSkills.length !== speciesPicks.count ||
            new Set(speciesSkills).size !== speciesSkills.length ||
            speciesSkills.some((s) => !speciesPicks.options.includes(s)))
    )
        errors.push('SPECIES_SKILLS');

    if (!speciesPicks && speciesSkills.length) errors.push('SPECIES_SKILLS');

    for (const s of speciesSkills) purchases[s] = (purchases[s] ?? 0) + 1;

    const tier1 = ctx.tier1[careerId];

    if (!tier1) {
        errors.push('CAREER_UNKNOWN');

        return null;
    }

    const bonus = distributionOf(picks, statsMode, tier1, errors);

    const careerSkills = picks.careerSkills ?? {};

    let spent = 0;

    for (const [skill, n] of Object.entries(careerSkills)) {
        if (
            !skillListed(tier1.skills, skill) ||
            !Number.isInteger(n) ||
            n < 0
        ) {
            errors.push('CAREER_SKILLS');

            continue;
        }

        spent += n;
        purchases[skill] = (purchases[skill] ?? 0) + n;
    }

    if (spent !== CAREER_SKILL_PURCHASES) errors.push('CAREER_SKILLS');

    if (Object.values(purchases).some((n) => n > SKILL_PURCHASE_CAP))
        errors.push('SKILL_CAP');

    const talent = picks.careerTalent;

    if (
        tier1.talents.length > 0 &&
        (!talent || !tier1.talents.includes(talent))
    )
        errors.push('TALENT_CAREER');

    const skillAdvances: Record<string, number> = {};

    for (const lang of profile.languages ?? [])
        skillAdvances[lang] = LANGUAGE_PURCHASES * ctx.step;

    for (const [k, n] of Object.entries(purchases))
        skillAdvances[k] = (skillAdvances[k] ?? 0) + n * ctx.step;

    const first = input.careerMode === 'rolled' && statsMode === 'rolled';

    const speciesBonus = picks.speciesRolled ? 1 : 0;

    const fateBonus = picks.speciesRolled && first ? 1 : 0;

    const fortuneBase = profile.fortune ?? profile.fate;

    return {
        bonus,
        skillAdvances,
        careerTalent:
            talent && tier1.talents.includes(talent) ? talent : undefined,
        trappings: tier1.trappings,
        fate: profile.fate + fateBonus,
        ...((profile.fortune !== undefined || speciesBonus) && {
            fortune: fortuneBase + speciesBonus,
        }),
    };
}
