import { describe, expect, it } from 'vitest';

import { defaultSlotLevel, heroSlotViews, slotRingOffset } from '../hero';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { PACT_KEY } from '@/lib/utils/spells/slot-keys';

const withSlots = (
    spellSlots: Record<string, { current: number; max: number; level?: number }>
) =>
    createMockParticipant({
        spellcasting: { spellSlots, knownSpells: [] },
    } as never);

describe('heroSlotViews', () => {
    it('always lists levels 1-5 for a caster with slots', () => {
        const views = heroSlotViews(withSlots({ '1': { current: 2, max: 4 } }));

        expect(views.map((v) => v.level)).toEqual([1, 2, 3, 4, 5]);
        expect(views[0]).toMatchObject({ roman: 'I', current: 2, max: 4 });
    });

    it('adds levels 6-9 only when max > 0', () => {
        const views = heroSlotViews(
            withSlots({
                '1': { current: 1, max: 1 },
                '6': { current: 1, max: 1 },
            })
        );

        expect(views.map((v) => v.level)).toEqual([1, 2, 3, 4, 5, 6]);
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
    it('centres a single slot above the portrait', () => {
        const o = slotRingOffset(0, 1, 80);

        expect(o.x).toBeCloseTo(0);
        expect(o.y).toBeCloseTo(-80);
    });

    it('runs left to right along the arc and keeps the radius', () => {
        const pts = Array.from({ length: 5 }, (_, i) => slotRingOffset(i, 5, 80));

        for (let i = 1; i < pts.length; i++)
            expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);

        for (const p of pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(80, 0);
    });
});
