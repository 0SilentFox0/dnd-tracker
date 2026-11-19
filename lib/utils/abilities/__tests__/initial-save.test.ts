import { describe, expect, it, vi } from 'vitest';

import { makeEffect, makeParticipant, resolved, seq } from './fixtures';

import { ParticipantSide } from '@/lib/constants/battle';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { markKey } from '@/lib/utils/abilities/engine/effects/marks';
import {
    type Ability,
    AbilitySchema,
} from '@/lib/utils/abilities/schema';
import * as access from '@/lib/utils/battle/saves/access';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { AbilityEvent } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';

const ability = resolved({
    trigger: { event: 'hit', role: 'attacker' },
    save: { ability: 'constitution', dc: 15 },
    effects: [
        {
            kind: 'dealDamage',
            amount: 7,
            damageType: 'poison',
            target: 'eventTarget',
        },
        {
            kind: 'applyCondition',
            condition: 'poisoned',
            duration: { rounds: 10 },
            target: 'eventTarget',
        },
        { kind: 'removeMark', markId: 'coat', target: 'self' },
    ],
});

const hit: AbilityEvent = {
    type: 'hit',
    actorId: 'a',
    targetId: 't',
    attackKind: 'melee',
    damage: 3,
};

const scene = (): BattleParticipant[] => {
    const owner = makeParticipant({ id: 'a', abilities: [ability] });

    return [
        {
            ...owner,
            battleData: {
                ...owner.battleData,
                activeEffects: [
                    makeEffect('m', { abilityKey: markKey('coat') }),
                    makeEffect('other', { abilityKey: markKey('other') }),
                ],
            },
        },
        makeParticipant({
            id: 't',
            side: ParticipantSide.ENEMY,
            hp: 50,
            maxHp: 50,
        }),
    ];
};

const run = (roll: number, ps = scene()) =>
    runAbilities(ps, hit, { rules: DEFAULT_RULES, round: 1, rng: seq(roll) });

const byId = (r: ReturnType<typeof run>, id: string): BattleParticipant => {
    const p = r.participants.find((x) => x.basicInfo.id === id);

    if (!p) throw new Error(id);

    return p;
};

const target = (r: ReturnType<typeof run>) => byId(r, 't');

const owner = (r: ReturnType<typeof run>) => byId(r, 'a');

describe('ability initial save', () => {
    it('applies damage and the condition when the save fails', () => {
        const r = run(0);

        expect(target(r).combatStats.currentHp).toBe(43);
        expect(
            target(r).battleData.activeEffects.length
        ).toBeGreaterThan(0);
    });

    it('applies nothing to a target that succeeds', () => {
        const r = run(0.99);

        expect(target(r).combatStats.currentHp).toBe(50);
        expect(target(r).battleData.activeEffects).toHaveLength(0);
    });

    it('rolls once per target for all effects', () => {
        const roll = vi.fn(access.savesOf(DEFAULT_RULES).roll);

        const spy = vi.spyOn(access, 'savesOf').mockReturnValue({
            ...access.savesOf(DEFAULT_RULES),
            roll,
        });

        run(0);
        spy.mockRestore();

        expect(roll).toHaveBeenCalledTimes(1);
        expect(roll.mock.calls[0][0]).toMatchObject({
            ability: 'constitution',
            dc: 15,
            vsSpell: false,
        });
    });

    it('self-targeted removeMark applies on both outcomes', () => {
        for (const roll of [0, 0.99]) {
            const marks = owner(run(roll)).battleData.activeEffects.map(
                (e) => e.abilityKey
            );

            expect(marks).toEqual([markKey('other')]);
        }
    });

    it('rejects a save on a passive ability', () => {
        const parsed = AbilitySchema.safeParse({
            id: 'x',
            name: 'x',
            trigger: { event: 'passive' },
            save: { ability: 'constitution', dc: 12 },
            effects: [{ kind: 'note', text: 'n' }],
        } satisfies Ability);

        expect(parsed.success).toBe(false);
        expect(
            JSON.stringify(parsed.error?.issues)
        ).toContain('abilities.validation.savePassive');
    });
});

describe('removeMark', () => {
    it('is a no-op without a matching mark', () => {
        const noMark = resolved({
            trigger: { event: 'hit', role: 'attacker' },
            effects: [{ kind: 'removeMark', markId: 'absent', target: 'self' }],
        });

        const ps = [
            makeParticipant({ id: 'a', abilities: [noMark] }),
            makeParticipant({ id: 't', side: ParticipantSide.ENEMY }),
        ];

        const r = run(0, ps);

        expect(r.messages).toHaveLength(0);
    });
});
