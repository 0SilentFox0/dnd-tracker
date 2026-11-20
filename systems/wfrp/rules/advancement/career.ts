import type {
    CareerSnapshot,
    CareerState,
    Characteristics,
    LedgerEntry,
} from '../characteristics/keys';
import type { AdvancementRules } from './rules';

export type CareerTierDef = {
    name: string;
    status?: string;
    /** Skill of the Income Endeavour, set on the first level (p199) */
    earningSkill?: string;
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

const snapshotOf = (career: CareerState): CareerSnapshot => ({
    careerId: career.careerId,
    tier: career.tier,
    ticks: career.ticks,
    ...(career.standingLoss ? { standingLoss: career.standingLoss } : {}),
});

const ledgerTopOf = (c: Characteristics) => c.ledger.at(-1)?.id ?? null;

/** `cost` > 0 stores an undo record: the XP is written off and `planCareerRevert` takes it back */
export const planCareerSet = (
    c: Characteristics,
    careerId: string,
    cost = 0
): Characteristics => ({
    ...c,
    spentArchived: c.spentArchived + cost,
    career: {
        careerId,
        tier: 1,
        ticks: [],
        ...(cost > 0 && {
            lastChange: {
                ...(c.career && { from: snapshotOf(c.career) }),
                cost,
                ledgerTop: ledgerTopOf(c),
            },
        }),
    },
});

export type CareerRevertResult =
    | { ok: true; next: Characteristics }
    | { ok: false; error: 'NOTHING_TO_REVERT' | 'STALE' };

/** Undo the last charged career change while nothing was bought after it; refunds the XP */
export function planCareerRevert(c: Characteristics): CareerRevertResult {
    const change = c.career?.lastChange;

    if (!change) return { ok: false, error: 'NOTHING_TO_REVERT' };

    if (change.ledgerTop !== ledgerTopOf(c))
        return { ok: false, error: 'STALE' };

    const { career: _career, ...rest } = c;

    return {
        ok: true,
        next: {
            ...rest,
            spentArchived: Math.max(0, c.spentArchived - change.cost),
            ...(change.from && { career: change.from }),
        },
    };
}

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

    const { standingLoss: _loss, lastChange: _last, ...kept } = career;

    return {
        ok: true,
        next: {
            ...c,
            spentArchived: c.spentArchived + (charge?.cost ?? 0),
            career: {
                ...kept,
                tier: (career.tier + 1) as CareerState['tier'],
                ticks: [],
                ...(charge && {
                    lastChange: {
                        from: snapshotOf(career),
                        cost: charge.cost,
                        ledgerTop: ledgerTopOf(c),
                    },
                }),
            },
        },
    };
}

export type TrappingTickResult =
    | { ok: true; next: Characteristics }
    | { ok: false; error: 'NO_CAREER' | 'MAX_TIER' | 'NOT_LISTED' | 'ALREADY' };

export const trappingTickKey = (name: string) =>
    `trapping:${name.trim().toLowerCase()}`.slice(0, 100);

/** Acquiring a trapping of the next career level ticks one tracker box (p191) */
export function planTrappingTick(
    c: Characteristics,
    tiers: CareerTierDef[],
    name: string
): TrappingTickResult {
    const career = c.career;

    if (!career) return { ok: false, error: 'NO_CAREER' };

    if (career.tier === 4) return { ok: false, error: 'MAX_TIER' };

    const key = trappingTickKey(name);

    if (!tiers[career.tier]?.trappings.some((t) => trappingTickKey(t) === key))
        return { ok: false, error: 'NOT_LISTED' };

    if (career.ticks.includes(key)) return { ok: false, error: 'ALREADY' };

    return {
        ok: true,
        next: { ...c, career: { ...career, ticks: [...career.ticks, key] } },
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
