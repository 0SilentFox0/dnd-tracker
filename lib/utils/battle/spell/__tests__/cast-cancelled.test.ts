import { describe, expect, it } from 'vitest';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant, seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';

const bolt = {
    id: 'sp',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: {
        dice: 0,
        cost: 'action',
        targeting: { kind: 'enemy' },
        resolution: { kind: 'auto' },
        casting: { magic: { cn: 2, kind: 'arcane', overcast: null } },
        effects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'fire',
                byDistance: [
                    { maxFeet: 10, dice: '1d6' },
                    { maxFeet: 120, dice: '1d6' },
                ],
            },
        ],
        raceModifiers: [],
    },
} as unknown as CastableSpell;

const caster = (() => {
    const p = makeParticipant({ id: 'c' });

    const characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, int: 40 },
        skillAdvances: { 'language:magick': 10 },
    };

    return withWfrpState(
        {
            ...p,
            abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) },
        },
        {}
    );
})();

const target = makeParticipant({
    id: 'e',
    side: ParticipantSide.ENEMY,
    hp: 50,
    maxHp: 50,
});

const cast = (roll: number, cancelledBy?: string) =>
    castSpell({
        rules: WFRP_RULES,
        caster,
        spell: bolt,
        targetIds: ['e'],
        allParticipants: [caster, target],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: seq(0.5),
        castTest: { roll },
        cancelledBy,
    });

const hpOf = (r: ReturnType<typeof cast>) =>
    r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'e')?.combatStats
        .currentHp;

describe('castSpell cancelledBy', () => {
    it('a passed test cancelled after the roll pays the cost and lands nothing', () => {
        const r = cast(30, 'Foe');

        expect(r.success).toBe(true);
        expect(r.fizzled).toBe(true);
        expect(hpOf(r)).toBe(50);
        expect(r.casterUpdated.actionFlags.hasUsedAction).toBe(true);
        expect(JSON.stringify(r.battleAction)).toContain('battleActions.spell.cancelled');
        expect(r.battleAction.actionDetails.countered).toBe(true);
    });

    it('without cancelledBy the same roll lands', () => {
        const r = cast(30);

        expect(r.fizzled).toBeUndefined();
        expect(hpOf(r)).toBeLessThan(50);
    });

    it('a failed test is an ordinary fizzle and ignores cancelledBy', () => {
        const r = cast(60, 'Foe');

        expect(r.fizzled).toBe(true);
        expect(JSON.stringify(r.battleAction)).toContain('battleActions.spell.fizzled');
        expect(JSON.stringify(r.battleAction)).not.toContain('spell.cancelled');
        expect(r.battleAction.actionDetails.countered).toBeUndefined();
    });
});
