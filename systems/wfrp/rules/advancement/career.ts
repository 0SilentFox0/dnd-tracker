import type {
    CareerState,
    Characteristics,
    LedgerEntry,
} from '../characteristics/keys';
import type { AdvancementRules } from './rules';

export type CareerTierDef = {
    name: string;
    status?: string;
    characteristics: string[];
    skills: string[];
    talents: string[];
    trappings: string[];
};

export type CareerCtx = { state: CareerState; tiers: CareerTierDef[] };

export type CareerAdvanceResult =
    | { ok: true; next: Characteristics }
    | {
          ok: false;
          error: 'NO_CAREER' | 'MAX_TIER' | 'TICKS_MISSING' | 'INSUFFICIENT_XP';
      };

/** XP price of Advance Career / Change Career (canon5e); undefined = free */
export type CareerCharge = { cost: number; available: number };

export const CAREER_ADVANCE_XP = 100;

export const CAREER_CHANGE_SAME_CLASS_XP = 100;

export const CAREER_CHANGE_OTHER_CLASS_XP = 200;

export const careerChangeCost = (
    fromClass: string | null | undefined,
    toClass: string | null | undefined
): number =>
    fromClass && toClass && fromClass === toClass
        ? CAREER_CHANGE_SAME_CLASS_XP
        : CAREER_CHANGE_OTHER_CLASS_XP;

export const tickKey = (kind: LedgerEntry['kind'], key: string) =>
    `${kind}:${key}`;

/** A skill key matches a career list entry exactly or by its group prefix (`lore:x` ~ `lore`) */
export const skillListed = (list: string[], key: string) =>
    list.includes(key) || list.includes(key.split(':')[0]);

const listed = (
    tier: CareerTierDef,
    kind: LedgerEntry['kind'],
    key: string
) => {
    const list =
        kind === 'characteristic'
            ? tier.characteristics
            : kind === 'skill'
              ? tier.skills
              : tier.talents;

    return kind === 'skill' ? skillListed(list, key) : list.includes(key);
};

// WFRP 4e: the current tier and all earlier tiers of the career are in-career
export const inCareer = (
    ctx: CareerCtx,
    kind: LedgerEntry['kind'],
    key: string
): boolean =>
    ctx.tiers.slice(0, ctx.state.tier).some((tier) => listed(tier, kind, key));

export const planCareerSet = (
    c: Characteristics,
    careerId: string
): Characteristics => ({ ...c, career: { careerId, tier: 1, ticks: [] } });

export function planCareerAdvance(
    c: Characteristics,
    rules: AdvancementRules,
    opts: { force: boolean; charge?: CareerCharge }
): CareerAdvanceResult {
    const career = c.career;

    if (!career) return { ok: false, error: 'NO_CAREER' };

    if (career.tier === 4) return { ok: false, error: 'MAX_TIER' };

    if (
        !opts.force &&
        career.ticks.length < rules.career.ticksRequired[career.tier - 1]
    )
        return { ok: false, error: 'TICKS_MISSING' };

    const charge = opts.force ? undefined : opts.charge;

    if (charge && charge.available < charge.cost)
        return { ok: false, error: 'INSUFFICIENT_XP' };

    return {
        ok: true,
        next: {
            ...c,
            spentArchived: c.spentArchived + (charge?.cost ?? 0),
            career: {
                ...career,
                tier: (career.tier + 1) as CareerState['tier'],
                ticks: [],
            },
        },
    };
}

export type CareerPrice = { cost: number; outOfCareer: number | null };

export function careerPrice(
    ctx: CareerCtx | undefined,
    rules: AdvancementRules,
    kind: LedgerEntry['kind'],
    key: string,
    base: number
): CareerPrice {
    if (!ctx || inCareer(ctx, kind, key))
        return { cost: base, outOfCareer: null };

    return {
        cost: Math.round(base * rules.career.outOfCareerMultiplier),
        outOfCareer: rules.career.outOfCareerMultiplier,
    };
}
