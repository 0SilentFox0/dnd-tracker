import { describe, expect, it } from 'vitest';

import {
    defaultSlotLevel,
    heroSlotViews,
    slotArcHeight,
    slotArcOffset,
    slotArcRadius,
    slotRingOffset,
} from '../hero';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { PACT_KEY } from '@/lib/utils/spells/slot-keys';

const withSlots = (
    spellSlots: Record<string, { current: number; max: number; level?: number }>
) =>
    createMockParticipant({
        spellcasting: { spellSlots, knownSpells: [] },
    } as never);

describe('heroSlotViews', () => {
    it('lists only levels with capacity', () => {
        const views = heroSlotViews(withSlots({ '1': { current: 2, max: 4 } }));

        expect(views.map((v) => v.level)).toEqual([1]);
        expect(views[0]).toMatchObject({ roman: 'I', current: 2, max: 4 });
    });

    it('adds levels 6-9 only when max > 0', () => {
        const views = heroSlotViews(
            withSlots({
                '1': { current: 1, max: 1 },
                '6': { current: 1, max: 1 },
            })
        );

        expect(views.map((v) => v.level)).toEqual([1, 6]);
    });

    it('appends the pact slot', () => {
        const views = heroSlotViews(
            withSlots({ [PACT_KEY]: { current: 1, max: 2, level: 3 } })
        );

        expect(views.at(-1)).toMatchObject({
            pact: true,
            level: 3,
            roman: 'III',
            current: 1,
            max: 2,
        });
    });

    it('returns nothing without spellcasting', () => {
        expect(heroSlotViews(createMockParticipant())).toEqual([]);
    });
});

describe('defaultSlotLevel', () => {
    const v = (level: number, current: number, max: number) => ({
        level,
        roman: String(level),
        current,
        max,
    });

    it('picks the lowest level with slots left, else the first with capacity', () => {
        expect(defaultSlotLevel([v(1, 0, 2), v(2, 1, 2)])).toBe(2);
        expect(defaultSlotLevel([v(1, 0, 2), v(2, 0, 2)])).toBe(1);
        expect(defaultSlotLevel([v(1, 0, 0)])).toBeNull();
        expect(defaultSlotLevel([])).toBeNull();
    });
});

describe('slotRingOffset', () => {
    it('puts the first slot at the top of the orbit', () => {
        const o = slotRingOffset(0, 6, 80);

        expect(o.x).toBeCloseTo(0);
        expect(o.y).toBeCloseTo(-80);
    });

    it('spreads slots evenly around the full circle at a constant radius', () => {
        const n = 8;

        const pts = Array.from({ length: n }, (_, i) =>
            slotRingOffset(i, n, 80)
        );

        for (const p of pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(80, 0);

        expect(pts.some((p) => p.y > 40)).toBe(true);
        expect(pts[n / 2].x).toBeCloseTo(0);
        expect(pts[n / 2].y).toBeCloseTo(80);
    });
});

describe('slotArcHeight', () => {
    it('keeps the portrait height for few slots and grows to contain a long arc', () => {
        expect(slotArcHeight(0, 104, 30)).toBe(104);
        expect(slotArcHeight(4, 104, 30)).toBe(104);

        const r = slotArcRadius(104, 30);

        const h = slotArcHeight(10, 104, 30);

        expect(h).toBeGreaterThan(104);

        for (let i = 0; i < 10; i++)
            expect(52 + slotArcOffset(i, r).y + 15).toBeLessThanOrEqual(h);
    });
});

describe('slotArcOffset', () => {
    it('fans out to the right: level 1 just left of the top, level 6 straight right', () => {
        const r = 78;

        expect(slotArcOffset(0, r).y).toBeLessThan(-r + 3);
        expect(slotArcOffset(0, r).x).toBeLessThan(0);
        expect(slotArcOffset(1, r).x).toBeGreaterThan(0);
        expect(slotArcOffset(5, r).x).toBeGreaterThan(r * 0.4);
    });

    it('keeps neighbouring slots from touching', () => {
        const radius = slotArcRadius(104, 30);

        for (let i = 0; i < 8; i++) {
            const a = slotArcOffset(i, radius);

            const b = slotArcOffset(i + 1, radius);

            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(30);
        }
    });
});
