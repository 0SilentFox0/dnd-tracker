import { describe, expect, it } from 'vitest';

import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { bakePassives } from '@/lib/utils/abilities/build/bake';
import { rollInitiative as roll } from '@/lib/utils/battle/turn/roll-initiative';
import { mulberry32 } from '@/lib/utils/common/rng';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';

const rollInitiative = (ps: BattleParticipant[], rng: () => number) =>
    roll(ps, rng, DEFAULT_RULES);

const mk = (
    id: string,
    over: {
        dex?: number;
        bonus?: number;
        base?: number;
        abilities?: ReturnType<typeof resolved>[];
    } = {}
): BattleParticipant => {
    const p = makeParticipant({ id, abilities: over.abilities });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            dexterity: over.dex ?? 10,
            initiativeBonus: over.bonus ?? 0,
            baseInitiative: over.base ?? 5,
            initiative: over.base ?? 5,
        },
    };
};

const d20 = (n: number) => (n - 1) / 20 + 0.001;

const seq = (...values: number[]) => {
    let i = 0;

    return () => values[i++ % values.length];
};

describe('rollInitiative', () => {
    it('adds DEX mod, initiativeBonus and flat initiative modifiers; sorts desc', () => {
        const flat = resolved({
            trigger: { event: 'passive' },
            effects: [{ kind: 'modifyStat', stat: 'initiative', flat: 2 }],
        });

        const out = rollInitiative(
            [
                bakePassives(mk('a', { dex: 14, bonus: 1, abilities: [flat] })),
                mk('b', { dex: 10 }),
            ],
            seq(d20(10), d20(12), 0.1, 0.2)
        );

        expect(out.rolls).toEqual([
            { id: 'a', roll: 10, sides: 20, total: 15 },
            { id: 'b', roll: 12, sides: 20, total: 12 },
        ]);
        expect(out.participants.map((p) => p.basicInfo.id)).toEqual(['a', 'b']);
        expect(out.participants[0].abilities.initiative).toBe(15);
    });

    it('pinned stays first and is not in rolls', () => {
        const out = rollInitiative(
            [mk('a'), mk('pin', { base: 1000 })],
            seq(d20(20), 0.5, 0.5)
        );

        expect(out.participants[0].basicInfo.id).toBe('pin');
        expect(out.rolls.map((r) => r.id)).toEqual(['a']);
    });

    it('fully tied is a permutation and deterministic per seed', () => {
        const ps = ['a', 'b', 'c', 'd'].map((id) => mk(id));

        const run = () => rollInitiative(ps, () => 0.5);

        expect(
            run()
                .participants.map((p) => p.basicInfo.id)
                .sort()
        ).toEqual(['a', 'b', 'c', 'd']);

        const seeded = () =>
            rollInitiative(ps, mulberry32(7)).participants.map(
                (p) => p.basicInfo.id
            );

        expect(seeded()).toEqual(seeded());
    });

    it('drops extra-turn slots and clears revealPending', () => {
        const slot = mk('slot');

        slot.basicInfo = { ...slot.basicInfo, isExtraTurnSlot: true };

        const hidden = mk('h');

        hidden.battleData = { ...hidden.battleData, revealPending: true };

        const out = rollInitiative([mk('a'), slot, hidden], mulberry32(1));

        expect(out.participants.map((p) => p.basicInfo.id).sort()).toEqual([
            'a',
            'h',
        ]);
        expect(
            out.participants.every(
                (p) => p.battleData.revealPending === undefined
            )
        ).toBe(true);
    });

    it('objects are not rolled and stay at the end', () => {
        const obj = mk('obj');

        obj.battleData = { ...obj.battleData, object: { spellId: 's' } };

        const out = rollInitiative([obj, mk('a'), mk('b')], mulberry32(3));

        expect(out.participants[2].basicInfo.id).toBe('obj');
        expect(out.rolls.map((r) => r.id).sort()).toEqual(['a', 'b']);
    });

    it('works for a single participant', () => {
        const out = rollInitiative([mk('a', { dex: 12 })], seq(d20(7), 0.3));

        expect(out.rolls).toEqual([{ id: 'a', roll: 7, sides: 20, total: 8 }]);
    });
});
