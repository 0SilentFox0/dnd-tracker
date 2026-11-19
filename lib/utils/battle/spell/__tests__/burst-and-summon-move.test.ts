import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 20,
    rows: 10,
    background: null,
    opacity: 0.3,
};

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, position },
});

const foe = (id: string, position: GridPoint) =>
    at(makeParticipant({ id, side: ParticipantSide.ENEMY }), position);

const caster = () => {
    const c = at(makeParticipant({ id: 'c' }), { x: 0, y: 5 });

    return {
        ...c,
        spellcasting: {
            ...c.spellcasting,
            spellSlots: {
                '1': { max: 2, current: 2 },
                '3': { max: 2, current: 2 },
            },
        },
    };
};

const knife: CastableSpell = {
    id: 'ice-knife',
    name: 'Ice Knife',
    level: 1,
    groupId: 'Conjuration',
    definition: {
        dice: 0,
        cost: 'action',
        targeting: { kind: 'enemy', range: 60 },
        resolution: { kind: 'auto' },
        effects: [
            {
                kind: 'burst',
                radiusFeet: 5,
                dice: '2d6',
                upcastDice: 1,
                trigger: {
                    save: { ability: 'dexterity' },
                    effects: [
                        {
                            kind: 'dealDamage',
                            amount: { spellRoll: 100 },
                            damageType: 'cold',
                        },
                    ],
                },
            },
        ] as SpellEffect[],
        raceModifiers: [],
    },
};

const hpAfter = (id: string, castLevel?: number) => {
    const c = caster();

    const ps = [
        c,
        foe('t1', { x: 5, y: 5 }),
        foe('t2', { x: 6, y: 5 }),
        foe('far', { x: 12, y: 5 }),
    ];

    const r = castSpell({
        rules: DEFAULT_RULES,
        caster: c,
        spell: knife,
        targetIds: ['t1'],
        allParticipants: ps,
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: () => 0,
        map,
        ...(castLevel && { castLevel }),
    });

    return r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)
        ?.combatStats.currentHp;
};

describe('burst', () => {
    it('hits the target and creatures within the radius, not distant ones', () => {
        expect(hpAfter('t1')).toBeLessThan(20);
        expect(hpAfter('t2')).toBeLessThan(20);
        expect(hpAfter('far')).toBe(20);
    });

    it('adds a die per slot level above the spell level', () => {
        const base = 20 - (hpAfter('t1') ?? 0);

        const upcast = 20 - (hpAfter('t1', 3) ?? 0);

        expect(upcast).toBe(base + 2);
    });
});

const sphereSpell: CastableSpell = {
    id: 'flaming-sphere',
    name: 'Move Flaming Sphere',
    level: 0,
    groupId: 'Conjuration',
    definition: {
        dice: 0,
        cost: 'bonusAction',
        targeting: {
            kind: 'template',
            shape: 'circle',
            size: 5,
            side: 'all',
            maxTargets: 1,
            exact: true,
            range: 120,
        },
        resolution: { kind: 'auto' },
        effects: [{ kind: 'moveSummon', feet: 30 }] as SpellEffect[],
        raceModifiers: [],
    },
};

const sphere = (): BattleParticipant => {
    const p = at(makeParticipant({ id: 'sphere' }), { x: 2, y: 5 });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            summonedBy: 'c',
            object: { spellId: 'flaming-sphere' },
        },
    };
};

const roll = (aim: GridPoint, extra: BattleParticipant[] = []) => {
    const c = caster();

    const r = castSpell({
        rules: DEFAULT_RULES,
        caster: c,
        spell: sphereSpell,
        targetIds: [],
        allParticipants: [c, sphere(), ...extra],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: () => 0.5,
        map,
        aim,
    });

    return r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'sphere')!
        .battleData.position;
};

describe('moveSummon', () => {
    it('moves the caster summon to the aimed cell within 30 ft', () => {
        expect(roll({ x: 8, y: 5 })).toEqual({ x: 8, y: 5 });
    });

    it('refuses a cell beyond 30 ft', () => {
        expect(roll({ x: 12, y: 5 })).toEqual({ x: 2, y: 5 });
    });

    it('stops in front of a creature in the way', () => {
        expect(roll({ x: 8, y: 5 }, [foe('wall', { x: 5, y: 5 })])).toEqual({
            x: 4,
            y: 5,
        });
    });
});
