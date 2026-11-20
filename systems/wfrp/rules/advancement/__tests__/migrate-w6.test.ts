import { describe, expect, it } from 'vitest';

import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
    type LedgerEntry,
} from '../../characteristics/keys';
import {
    CANON_ADVANCE_MAX,
    CHARACTERISTIC_PURCHASE_COSTS,
    SKILL_PURCHASE_COSTS,
} from '../canon';
import { DEFAULT_ADVANCEMENT_RULES } from '../defaults';
import { migrateHero } from '../migrate-w6';

const RULES = {
    ...DEFAULT_ADVANCEMENT_RULES,
    characteristic: {
        max: CANON_ADVANCE_MAX,
        brackets: CHARACTERISTIC_PURCHASE_COSTS.map((cost, i) => ({
            upTo: i + 1,
            cost,
        })),
    },
    skill: {
        max: CANON_ADVANCE_MAX,
        brackets: SKILL_PURCHASE_COSTS.map((cost, i) => ({
            upTo: i + 1,
            cost,
        })),
    },
};

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
    id: 'e',
    at: '2026-01-01T00:00:00.000Z',
    kind: 'characteristic',
    key: 'ws',
    from: 0,
    to: 1,
    cost: 25,
    ...over,
});

const hero = (extra: Partial<Characteristics>): Characteristics => ({
    ...DEFAULT_CHARACTERISTICS,
    ...extra,
});

describe('migrateHero', () => {
    it('skips heroes without a ledger', () => {
        const r = migrateHero(500, hero({}), RULES, 5);

        expect(r.status).toBe('no-ledger');
        expect(r.changes).toEqual([]);
    });

    it('re-derives purchases from the spent XP and refunds the rest', () => {
        const ledger = Array.from({ length: 10 }, (_, i) =>
            entry({ id: `l${i}`, from: i, to: i + 1, cost: 30 })
        );

        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 10 },
            ledger,
        });

        const r = migrateHero(1000, c, RULES, 5);

        expect(r.status).toBe('converted');
        expect(r.next.advances.ws).toBe(10);
        expect(r.next.ledger.map((e) => e.cost)).toEqual([125, 175]);
        expect(r.spentAfter).toBe(300);
        expect(r.changes[0].refund).toBe(0);
    });

    it('refunds leftover XP and lowers points when the budget is short', () => {
        const ledger = [
            entry({ from: 0, to: 1, cost: 100 }),
            entry({ id: 'e2', from: 1, to: 2, cost: 100 }),
        ];

        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 2 },
            ledger,
        });

        const r = migrateHero(1000, c, RULES, 5);

        expect(r.next.advances.ws).toBe(5);
        expect(r.changes[0].refund).toBe(75);
        expect(r.spentAfter).toBe(125);
        expect(r.availableAfter).toBe(875);
    });

    it('keeps points not backed by the ledger as the starting level', () => {
        const c = hero({
            skillAdvances: { athletics: 6 },
            ledger: [
                entry({
                    kind: 'skill',
                    key: 'athletics',
                    from: 5,
                    to: 6,
                    cost: 100,
                }),
            ],
        });

        const r = migrateHero(500, c, RULES, 5);

        expect(r.next.skillAdvances.athletics).toBe(10);
        expect(r.next.ledger[0]).toMatchObject({ from: 5, to: 10, cost: 75 });
    });

    it('leaves talent entries and spentArchived untouched', () => {
        const talent = entry({ id: 't', kind: 'talent', key: 'x', cost: 200 });

        const r = migrateHero(
            1000,
            hero({ ledger: [talent], spentArchived: 40 }),
            RULES,
            5
        );

        expect(r.next.ledger).toEqual([talent]);
        expect(r.next.spentArchived).toBe(40);
        expect(r.spentAfter).toBe(r.spentBefore);
    });

    it('flags ticked entries as manual and leaves the hero unchanged', () => {
        const c = hero({ ledger: [entry({ tick: 't1' })] });

        const r = migrateHero(500, c, RULES, 5);

        expect(r.status).toBe('manual');
        expect(r.next).toBe(c);
    });

    it('reports negative available XP without clamping', () => {
        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 1 },
            ledger: [entry({ cost: 200 })],
            spentArchived: 100,
        });

        const r = migrateHero(100, c, RULES, 5);

        expect(r.status).toBe('negative-xp');
        expect(r.availableBefore).toBe(-200);
        expect(r.next).toBe(c);
    });

    it('is idempotent', () => {
        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 5 },
            ledger: Array.from({ length: 5 }, (_, i) =>
                entry({ id: `l${i}`, from: i, to: i + 1, cost: 25 })
            ),
        });

        const once = migrateHero(1000, c, RULES, 5);

        expect(migrateHero(1000, once.next, RULES, 5).status).toBe('unchanged');
    });
});

describe('migrateHero hardening', () => {
    const LEGACY = DEFAULT_ADVANCEMENT_RULES;

    const ten = () =>
        Array.from({ length: 10 }, (_, i) =>
            entry({ id: `l${i}`, from: i, to: i + 1, cost: 30 })
        );

    it('prices with canon tables even when the stored rules are legacy', () => {
        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 10 },
            ledger: ten(),
        });

        const r = migrateHero(1000, c, LEGACY, 5);

        expect(r.next.ledger.map((e) => e.cost)).toEqual([125, 175]);
    });

    it('reports a hero with a career and untracked entries as manual', () => {
        const c = hero({
            career: { careerId: 'k', tier: 1, ticks: [] },
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 1 },
            ledger: [entry({ cost: 50 })],
        });

        const r = migrateHero(1000, c, RULES, 5);

        expect(r.status).toBe('manual');
        expect(r.next).toBe(c);
    });

    it('reports a base that is not a multiple of step as manual', () => {
        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 4 },
            ledger: [entry({ cost: 25 })],
        });

        expect(migrateHero(1000, c, RULES, 5).status).toBe('manual');
    });

    it('uses short ids and keeps the ledger ordered by original time', () => {
        const long = 'x'.repeat(60);

        const c = hero({
            advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 5, bs: 1 },
            skillAdvances: {},
            ledger: [
                ...Array.from({ length: 5 }, (_, i) =>
                    entry({
                        id: `a${i}`,
                        at: `2026-01-0${i + 1}T00:00:00.000Z`,
                        key: 'ws',
                        from: i,
                        to: i + 1,
                        cost: 25,
                    })
                ),
                entry({
                    id: 'b',
                    at: '2026-01-02T12:00:00.000Z',
                    key: 'bs',
                    cost: 25,
                }),
                entry({
                    id: 't',
                    kind: 'talent',
                    key: long,
                    at: '2026-01-03T12:00:00.000Z',
                    cost: 100,
                }),
            ],
        });

        const r = migrateHero(2000, c, RULES, 5);

        expect(r.status).toBe('converted');
        expect(r.next.ledger.every((e) => e.id.length <= 64)).toBe(true);
        expect(new Set(r.next.ledger.map((e) => e.id)).size).toBe(
            r.next.ledger.length
        );

        const ats = r.next.ledger.map((e) => e.at);

        expect([...ats].sort()).toEqual(ats);
    });
});
