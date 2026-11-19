import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant, seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import { projectileShots } from '@/lib/utils/battle/spell/cast/projectiles';
import {
    resolveSpellTargets,
    spreadProjectiles,
} from '@/lib/utils/battle/spell/spell-targeting';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant } from '@/types/battle';

const darts: CastableSpell = {
    id: 'mm',
    name: 'Magic Missile',
    level: 1,
    groupId: 'evocation',
    definition: {
        dice: 1,
        dieSides: 4,
        fixedDice: true,
        damageBonus: 1,
        cost: 'action',
        targeting: {
            kind: 'area',
            side: 'enemy',
            maxTargets: 3,
            range: 120,
            projectiles: true,
        },
        resolution: { kind: 'auto' },
        effects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'force',
            },
        ],
        raceModifiers: [],
    },
};

const rays: CastableSpell = {
    ...darts,
    id: 'sr',
    name: 'Scorching Ray',
    definition: {
        ...darts.definition,
        dice: 2,
        dieSides: 6,
        damageBonus: undefined,
        resolution: { kind: 'attack' },
    },
};

const caster = (): BattleParticipant => {
    const p = makeParticipant({ id: 'c' });

    return {
        ...p,
        spellcasting: {
            ...p.spellcasting,
            spellAttackBonus: 5,
            spellSlots: { '1': { max: 2, current: 2 } },
        },
    };
};

const enemy = (id: string) =>
    makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

const hp = (r: { allParticipantsUpdated: BattleParticipant[] }, id: string) =>
    r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats
        .currentHp as number;

function cast(
    spell: CastableSpell,
    targetIds: string[],
    diceRolls: number[],
    attackRolls?: number[]
) {
    const c = caster();

    return castSpell({
        caster: c,
        spell,
        targetIds,
        allParticipants: [c, enemy('e1'), enemy('e2')],
        currentRound: 1,
        battleId: 'b',
        diceRolls,
        dice: {
            count: diceRolls.length,
            sides: spell.definition.dieSides ?? 6,
        },
        attackRolls: attackRolls?.map((roll, i) => ({
            participantId: targetIds[i],
            roll,
        })),
        rng: seq(0.5),
        rules: DEFAULT_RULES,
    });
}

describe('spreadProjectiles', () => {
    it('pads the remaining projectiles round-robin over the picked targets', () => {
        expect(spreadProjectiles(['a'], ['a'], 3)).toEqual({
            ok: true,
            targetIds: ['a', 'a', 'a'],
        });
        expect(spreadProjectiles(['a', 'b'], ['a', 'b'], 3)).toEqual({
            ok: true,
            targetIds: ['a', 'b', 'a'],
        });
    });

    it('keeps an explicit distribution with repeated ids', () => {
        expect(spreadProjectiles(['a', 'b'], ['b', 'b', 'a'], 3)).toEqual({
            ok: true,
            targetIds: ['b', 'b', 'a'],
        });
    });

    it('rejects more distinct targets or projectiles than the cap', () => {
        expect(spreadProjectiles(['a', 'b', 'c'], ['a', 'b', 'c'], 2).ok).toBe(
            false
        );
        expect(spreadProjectiles(['a'], ['a', 'a', 'a'], 2).ok).toBe(false);
    });
});

describe('resolveSpellTargets with projectiles', () => {
    const ps = [caster(), enemy('e1'), enemy('e2')];

    it('Magic Missile at one target sends every dart to it', () => {
        const r = resolveSpellTargets(
            ps,
            ps[0],
            { id: 'mm', groupId: 'evocation', level: 1 },
            darts.definition.targeting,
            ['e1']
        );

        expect(r).toEqual({ ok: true, targetIds: ['e1', 'e1', 'e1'] });
    });

    it('two picked targets share three darts', () => {
        const r = resolveSpellTargets(
            ps,
            ps[0],
            { id: 'mm', groupId: 'evocation', level: 1 },
            darts.definition.targeting,
            ['e1', 'e2']
        );

        expect(r.ok && r.targetIds).toEqual(['e1', 'e2', 'e1']);
    });

    it('Eldritch Blast gets one beam per cantrip tier', () => {
        const blast = { kind: 'enemy', range: 120, projectiles: true } as const;

        const at = (level: number) => {
            const c = caster();

            c.abilities = { ...c.abilities, level };

            return resolveSpellTargets(
                [c, enemy('e1'), enemy('e2')],
                c,
                { id: 'eb', groupId: 'evocation', level: 0 },
                blast,
                ['e1']
            );
        };

        expect(at(1)).toEqual({ ok: true, targetIds: ['e1'] });
        expect(at(5)).toEqual({ ok: true, targetIds: ['e1', 'e1'] });
        expect(at(17)).toEqual({
            ok: true,
            targetIds: ['e1', 'e1', 'e1', 'e1'],
        });
    });
});

describe('projectileShots', () => {
    it('applies only to projectile spells whose dice divide evenly', () => {
        expect(
            projectileShots({ projectiles: true }, ['a', 'a'], [1, 2])
        ).toEqual(['a', 'a']);
        expect(
            projectileShots({ projectiles: true }, ['a', 'a'], [1, 2, 3])
        ).toBeUndefined();
        expect(projectileShots({}, ['a'], [1])).toBeUndefined();
    });
});

describe('castSpell projectiles', () => {
    it('Magic Missile: every dart rolls its own die and adds +1', () => {
        const r = cast(darts, ['e1', 'e1', 'e1'], [2, 3, 4]);

        expect(hp(r, 'e1')).toBe(200 - (3 + 4 + 5));
    });

    it('darts split between targets', () => {
        const r = cast(darts, ['e1', 'e2', 'e1'], [4, 1, 2]);

        expect(hp(r, 'e1')).toBe(200 - (5 + 3));
        expect(hp(r, 'e2')).toBe(200 - 2);
    });

    it('Scorching Ray: each ray is a separate attack with its own roll', () => {
        const r = cast(rays, ['e1', 'e1', 'e1'], [3, 3, 4, 4, 5, 5], [15]);

        const attacks = r.battleAction.actionDetails.spellAttacks ?? [];

        expect(attacks).toHaveLength(3);
        expect(attacks[0]).toMatchObject({ roll: 15, hit: true });
        expect(attacks[1].roll).toBe(attacks[2].roll);
        expect(hp(r, 'e1')).toBeLessThan(200);
    });

    it('a ray that misses deals nothing while the others still hit', () => {
        const r = cast(rays, ['e1', 'e2'], [3, 3, 6, 6], [2, 18]);

        expect(hp(r, 'e1')).toBe(200);
        expect(hp(r, 'e2')).toBe(200 - 12);
    });
});
