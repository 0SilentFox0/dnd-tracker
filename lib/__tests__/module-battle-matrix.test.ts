import { describe, expect, it } from 'vitest';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { attackBodySchema } from '@/lib/schemas/battles';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { attackMutation } from '@/lib/server/battles/mutations/attack/attack-mutation';
import { nextTurnMutation } from '@/lib/server/battles/mutations/next-turn/next-turn-mutation';
import { seq } from '@/lib/utils/abilities/__tests__/fixtures';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { validateComposition } from '@/lib/utils/rules/systems/compose';
import type { BattleParticipant } from '@/types/battle';

const sword = {
    id: 'sword',
    name: 'Sword',
    type: AttackType.MELEE,
    attackBonus: 5,
    damageDice: '1d8',
    damageType: 'slashing',
};

const CASES: ReadonlyArray<{ name: string; rules: Ruleset }> = [
    {
        name: 'd20 alone',
        rules: { ...DEFAULT_RULES, system: { key: 'dnd5e' } },
    },
    ...(
        [
            'morale',
            'retaliation',
            'unitstacks',
            'heroscaling',
            'artifactsets',
        ] as const
    ).map((id) => ({
        name: `d20 + ${id}`,
        rules: {
            ...DEFAULT_RULES,
            system: { key: 'dnd5e', modules: [id] },
        } as Ruleset,
    })),
    { name: 'homm', rules: { ...DEFAULT_RULES, system: { key: 'homm' } } },
];

const rulesOf = (name: string) => CASES.find((c) => c.name === name)!.rules;

const hasModule = (rules: Ruleset, id: string) =>
    (rules.system.modules ?? []).includes(id);

const hasMorale = (rules: Ruleset) =>
    hasModule(rules, 'morale') || rules.system.key === 'homm';

const hasRetaliation = (rules: Ruleset) =>
    hasModule(rules, 'retaliation') || rules.system.key === 'homm';

function fighters(heroMorale = 0): BattleParticipant[] {
    const hero = participant('hero', { controlledBy: 'user-1', name: 'Hero' });

    const gob = participant('gob', {
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
        name: 'Goblin',
    });

    return [
        {
            ...hero,
            combatStats: { ...hero.combatStats, morale: heroMorale },
            battleData: { ...hero.battleData, attacks: [sword] },
        },
        {
            ...gob,
            combatStats: { ...gob.combatStats, maxHp: 100, currentHp: 100 },
            battleData: { ...gob.battleData, attacks: [sword] },
        },
    ];
}

const ctxOf = (rules: Ruleset, heroMorale = 0): BattleMutationContext => {
    const base = context({
        participants: fighters(heroMorale),
        rng: seq(0.85),
    });

    return { ...base, meta: { ...base.meta, rules } };
};

const strike = (ctx: BattleMutationContext) =>
    attackMutation(
        ctx,
        attackBodySchema.parse({
            attackerId: 'hero',
            targetId: 'gob',
            attackId: 'sword',
            d20Roll: 15,
            damageRolls: [8],
        })
    );

describe.each(CASES)('module matrix: $name', ({ rules }) => {
    it('composes without violations and exposes a system definition', () => {
        expect(validateComposition(rules.system)).toEqual([]);
        expect(ruleSystemOf(rules).combat).toBeDefined();
    });

    it('runs an attack and advances the turn without throwing', async () => {
        const out = await strike(ctxOf(rules));

        const next = nextTurnMutation({
            ...ctxOf(rules),
            participants: out.participants,
        });

        expect(out.events.map((e) => e.type)[0]).toBe('attack');
        expect(next.scene).toBeDefined();
    });

    it('answers the blow only with the retaliation module (homm bundles it)', async () => {
        const types = (await strike(ctxOf(rules))).events.map((e) => e.type);

        expect(types.includes('retaliation')).toBe(hasRetaliation(rules));
    });

    it('gates acting on an unresolved morale check only with the morale module (homm bundles it)', async () => {
        const run = strike(ctxOf(rules, 2));

        if (hasMorale(rules))
            await expect(run).rejects.toMatchObject({
                code: 'action_rejected',
            });
        else await expect(run).resolves.toBeDefined();
    });

    it('morale cap comes from the module only', () => {
        const parts = ruleSystemOf(rules).participant?.fromCharacter ?? [];

        const hero = fighters()[0];

        const cap = parts.reduce(
            (p, part) =>
                part(p, { row: { level: 1 }, rules, refs: {} } as Parameters<
                    typeof part
                >[1]),
            hero
        ).abilities.moraleCap;

        if (hasMorale(rules)) expect(cap).toBe(rules.morale.cap);
        else expect(cap).toBe(hero.abilities.moraleCap);
    });
});

describe('modules without a combat mechanic behave like d20 alone', () => {
    it.each(['d20 + unitstacks', 'd20 + artifactsets'])('%s', async (name) => {
        const alone = await strike(ctxOf(rulesOf('d20 alone')));

        const withModule = await strike(ctxOf(rulesOf(name)));

        expect(withModule.events.map((e) => e.type)).toEqual(
            alone.events.map((e) => e.type)
        );
        expect(
            withModule.participants.map((p) => p.combatStats.currentHp)
        ).toEqual(alone.participants.map((p) => p.combatStats.currentHp));
    });
});

describe('level dice of a hero come only from the heroscaling module', () => {
    it('d20 + heroscaling hits harder than d20 alone with the same events', async () => {
        const alone = await strike(ctxOf(rulesOf('d20 alone')));

        const withModule = await strike(ctxOf(rulesOf('d20 + heroscaling')));

        expect(withModule.events.map((e) => e.type)).toEqual(
            alone.events.map((e) => e.type)
        );
        expect(withModule.participants[1].combatStats.currentHp).toBeLessThan(
            alone.participants[1].combatStats.currentHp
        );
    });
});
