import { describe, expect, it } from 'vitest';

import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '../../characteristics/keys';
import {
    type CareerCtx,
    careerPrice,
    type CareerTierDef,
    inCareer,
    planCareerAdvance,
    planCareerSet,
    tickKey,
} from '../career';
import { DEFAULT_ADVANCEMENT_RULES as RULES } from '../defaults';
import { planPurchase, type PurchaseInput } from '../plan';
import { planUndo } from '../undo';

const tier = (over: Partial<CareerTierDef> = {}): CareerTierDef => ({
    name: 'T',
    characteristics: ['ws'],
    skills: ['athletics', 'melee'],
    talents: ['t1'],
    trappings: [],
    ...over,
});

const ctx = (ticks: string[] = [], tierNo: 1 | 2 | 3 | 4 = 1): CareerCtx => ({
    state: { careerId: 'c1', tier: tierNo, ticks },
    tiers: [tier(), tier(), tier(), tier()],
});

const withCareer = (
    c: CareerCtx,
    extra: Partial<Characteristics> = {}
): Characteristics => ({
    ...DEFAULT_CHARACTERISTICS,
    ...extra,
    career: c.state,
});

const buy = (over: Partial<PurchaseInput> & Pick<PurchaseInput, 'request'>) =>
    planPurchase({
        characteristics: DEFAULT_CHARACTERISTICS,
        available: 1000,
        rules: RULES,
        now: 't',
        id: 'e1',
        ...over,
    });

describe('inCareer', () => {
    it('matches the current tier list; specialised skill matches base and exact', () => {
        const c = ctx();

        expect(inCareer(c, 'characteristic', 'ws')).toBe(true);
        expect(inCareer(c, 'characteristic', 'bs')).toBe(false);
        expect(inCareer(c, 'skill', 'melee:basic')).toBe(true);
        expect(inCareer(c, 'skill', 'athletics')).toBe(true);
        expect(inCareer(c, 'skill', 'ranged')).toBe(false);
        expect(
            inCareer(
                {
                    ...c,
                    tiers: [
                        tier({ skills: ['melee:basic'] }),
                        ...c.tiers.slice(1),
                    ],
                },
                'skill',
                'melee:basic'
            )
        ).toBe(true);
        expect(
            inCareer(
                {
                    ...c,
                    tiers: [
                        tier({ skills: ['melee:basic'] }),
                        ...c.tiers.slice(1),
                    ],
                },
                'skill',
                'melee'
            )
        ).toBe(false);
        expect(inCareer(c, 'talent', 't1')).toBe(true);
    });

    it('includes the current and earlier tiers, not later ones', () => {
        const c = {
            ...ctx(),
            tiers: [
                tier(),
                tier({ talents: ['t2'] }),
                tier({ talents: ['t3'] }),
                tier(),
            ],
        };

        expect(
            inCareer({ ...c, state: { ...c.state, tier: 2 } }, 'talent', 't1')
        ).toBe(true);
        expect(
            inCareer({ ...c, state: { ...c.state, tier: 2 } }, 'talent', 't2')
        ).toBe(true);
        expect(
            inCareer({ ...c, state: { ...c.state, tier: 2 } }, 'talent', 't3')
        ).toBe(false);
        expect(inCareer(c, 'talent', 't2')).toBe(false);
    });
});

describe('planPurchase with career', () => {
    it('without career matches 5e-1: base price, no tick', () => {
        const r = buy({ request: { kind: 'characteristic', key: 'bs' } });

        expect(r.ok && r.entry).toEqual({
            id: 'e1',
            at: 't',
            kind: 'characteristic',
            key: 'bs',
            from: 0,
            to: 1,
            cost: 25,
        });
        expect(r.ok && r.next.career).toBeUndefined();
    });

    it('in-career: base price and a tick', () => {
        const c = ctx();

        const r = buy({
            request: { kind: 'characteristic', key: 'ws' },
            career: c,
            characteristics: withCareer(c),
        });

        expect(
            r.ok && [r.entry.cost, r.entry.tick, r.next.career?.ticks]
        ).toEqual([25, 'characteristic:ws', ['characteristic:ws']]);
    });

    it('an earlier-tier item stays in-career and ticks the current tier', () => {
        const c: CareerCtx = {
            state: { careerId: 'c1', tier: 2, ticks: [] },
            tiers: [tier(), tier({ characteristics: ['bs'] }), tier(), tier()],
        };

        const r = buy({
            request: { kind: 'characteristic', key: 'ws' },
            career: c,
            characteristics: withCareer(c),
        });

        expect(
            r.ok && [r.entry.cost, r.entry.tick, r.next.career?.ticks]
        ).toEqual([25, 'characteristic:ws', ['characteristic:ws']]);
    });

    it('does not duplicate a tick on a repeated purchase', () => {
        const c = ctx([tickKey('talent', 't1')]);

        const r = buy({
            request: { kind: 'talent', key: 't1' },
            talent: { id: 't1', xpCost: 100, maxRank: 3 },
            career: c,
            characteristics: withCareer(c, { talents: { t1: 1 } }),
        });

        expect(
            r.ok && [r.entry.cost, r.entry.tick, r.next.career?.ticks]
        ).toEqual([200, undefined, ['talent:t1']]);
    });

    it('out-of-career: rounded multiplier, no tick; talent multiplier applies after talentCost', () => {
        const c = ctx();

        const a = buy({
            request: { kind: 'characteristic', key: 'bs' },
            career: c,
            characteristics: withCareer(c),
        });

        expect(
            a.ok && [a.entry.cost, a.entry.tick, a.next.career?.ticks]
        ).toEqual([50, undefined, []]);

        const rules = {
            ...RULES,
            talentCostMultiplier: 1.5,
            career: { ...RULES.career, outOfCareerMultiplier: 1.5 },
        };

        const t = buy({
            request: { kind: 'talent', key: 't9' },
            talent: { id: 't9', xpCost: 101, maxRank: 3 },
            rules,
            career: c,
            characteristics: withCareer(c),
        });

        expect(t.ok && t.entry.cost).toBe(
            Math.round(Math.round(101 * 1 * 1.5) * 1.5)
        );
    });

    it('checks XP against the multiplied price', () => {
        const c = ctx();

        expect(
            buy({
                request: { kind: 'characteristic', key: 'bs' },
                career: c,
                available: 49,
            })
        ).toEqual({ ok: false, error: 'INSUFFICIENT_XP' });
    });
});

describe('planUndo with ticks', () => {
    it('removes the entry tick', () => {
        const c = ctx();

        const bought = buy({
            request: { kind: 'skill', key: 'athletics' },
            career: c,
            characteristics: withCareer(c),
        });

        const undone = bought.ok && planUndo(bought.next);

        expect(undone && undone.ok && undone.next.career?.ticks).toEqual([]);
    });

    it('is safe when the career changed or ticks are empty, and keeps foreign ticks', () => {
        const c = ctx();

        const bought = buy({
            request: { kind: 'skill', key: 'athletics' },
            career: c,
            characteristics: withCareer(c),
        });

        if (!bought.ok) throw new Error('buy failed');

        const changed = {
            ...bought.next,
            career: {
                careerId: 'c2',
                tier: 2 as const,
                ticks: ['talent:other'],
            },
        };

        const u1 = planUndo(changed);

        expect(u1.ok && u1.next.career?.ticks).toEqual(['talent:other']);

        const u2 = planUndo({ ...bought.next, career: undefined });

        expect(u2.ok && u2.next.career).toBeUndefined();

        const u3 = planUndo({
            ...bought.next,
            career: { ...c.state, ticks: [] },
        });

        expect(u3.ok && u3.next.career?.ticks).toEqual([]);
    });
});

describe('planCareerSet / planCareerAdvance', () => {
    it('set resets tier and ticks, keeps the rest', () => {
        const c = withCareer(ctx(['a'], 3), {
            talents: { t1: 1 },
            ledger: [
                {
                    id: 'x',
                    at: 't',
                    kind: 'talent',
                    key: 't1',
                    from: 0,
                    to: 1,
                    cost: 5,
                },
            ],
        });

        const next = planCareerSet(c, 'c2');

        expect(next.career).toEqual({ careerId: 'c2', tier: 1, ticks: [] });
        expect(next.talents).toEqual(c.talents);
        expect(next.ledger).toEqual(c.ledger);
        expect(planCareerSet(DEFAULT_CHARACTERISTICS, 'c1').career).toEqual({
            careerId: 'c1',
            tier: 1,
            ticks: [],
        });
    });

    const ticks = (n: number) =>
        Array.from({ length: n }, (_, i) => `skill:s${i}`);

    it('requires ticks unless forced', () => {
        const c = withCareer(ctx(ticks(9)));

        expect(planCareerAdvance(c, RULES, { force: false })).toEqual({
            ok: false,
            error: 'TICKS_MISSING',
        });

        const forced = planCareerAdvance(c, RULES, { force: true });

        expect(forced.ok && forced.next.career).toEqual({
            careerId: 'c1',
            tier: 2,
            ticks: [],
        });

        const enough = planCareerAdvance(withCareer(ctx(ticks(10))), RULES, {
            force: false,
        });

        expect(enough.ok && enough.next.career?.tier).toBe(2);
    });

    it('uses the threshold of the current tier', () => {
        expect(
            planCareerAdvance(withCareer(ctx(ticks(11), 2)), RULES, {
                force: false,
            })
        ).toEqual({ ok: false, error: 'TICKS_MISSING' });
    });

    it('tier 4 is MAX_TIER even with force; no career is NO_CAREER', () => {
        expect(
            planCareerAdvance(withCareer(ctx(ticks(99), 4)), RULES, {
                force: true,
            })
        ).toEqual({ ok: false, error: 'MAX_TIER' });
        expect(
            planCareerAdvance(DEFAULT_CHARACTERISTICS, RULES, { force: true })
        ).toEqual({ ok: false, error: 'NO_CAREER' });
    });
});

describe('careerPrice', () => {
    it('keeps the base price without a career or in the list, multiplies outside it', () => {
        expect(
            careerPrice(undefined, RULES, 'characteristic', 'bs', 25)
        ).toEqual({ cost: 25, outOfCareer: null });
        expect(careerPrice(ctx(), RULES, 'characteristic', 'ws', 25)).toEqual({
            cost: 25,
            outOfCareer: null,
        });
        expect(careerPrice(ctx(), RULES, 'characteristic', 'bs', 25)).toEqual({
            cost: 50,
            outOfCareer: 2,
        });
    });
});
