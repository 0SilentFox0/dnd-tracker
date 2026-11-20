import type { Prisma, Spell } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import '@/lib/server/systems/registry';
import type { CounterWindowBody } from '@/lib/schemas/battles';
import {
    context,
    goblin,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { createCounterWindowMutation } from '@/lib/server/battles/mutations/counter-window/counter-window-mutation';
import { createSpellMutation } from '@/lib/server/battles/mutations/spell/spell-mutation';
import { counterPendingOf } from '@/lib/utils/battle/counter/pending';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const bolt = {
    id: 's1',
    campaignId: 'c1',
    name: 'Bolt',
    level: 1,
    groupId: null,
    icon: null,
    dice: 0,
    dieSides: null,
    upcastDice: null,
    upcastTargets: null,
    cost: 'action',
    casting: { magic: { cn: 2, kind: 'arcane', overcast: null } },
    targeting: { kind: 'enemy' },
    resolution: { kind: 'auto' },
    spellEffects: [
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
} as unknown as Spell;

const deps = {
    loadSpell: async () => bolt,
    loadPool: async () => ({
        units: [],
        races: [] as unknown as Prisma.RaceGetPayload<object>[],
    }),
};

const withChars = (p: BattleParticipant, int: number, magick: boolean) => {
    const characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, int },
        skillAdvances: (magick ? { 'language:magick': 10 } : {}) as Record<
            string,
            number
        >,
    };

    return {
        ...p,
        abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) },
        spellcasting: {
            ...p.spellcasting,
            spellSlots: {},
            knownSpells: ['s1'],
        },
    };
};

const hero = withWfrpState(
    withChars(participant('hero', { controlledBy: 'user-1' }), 40, true),
    {}
);

const dispeller = withChars(goblin, 50, true);

const hp = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)?.combatStats
        .currentHp as number;

const REQUEST = {
    casterId: 'hero',
    spellId: 's1',
    targetIds: ['gob'],
    diceRolls: [],
    castRoll: 30,
} as never;

const baseCtx = (
    participants: BattleParticipant[],
    rng?: () => number
): BattleMutationContext => {
    const c = context({ participants, rng });

    return { ...c, meta: { ...c.meta, rules } };
};

const machine = () =>
    createCounterWindowMutation({ spell: (o) => createSpellMutation(deps, o) });

const dm = (ctx: BattleMutationContext): BattleMutationContext => ({
    ...ctx,
    userId: 'dm-user',
    isDM: true,
});

async function openWindow(rng: () => number) {
    const ctx = baseCtx([hero, dispeller], rng);

    const out = await createSpellMutation(deps)(ctx, REQUEST);

    const pending = counterPendingOf(out.scene?.pendingChoice);

    if (!pending) throw new Error('window did not open');

    return {
        pending,
        ctx: {
            ...ctx,
            scene: { ...ctx.scene, pendingChoice: out.scene?.pendingChoice },
        } as BattleMutationContext,
    };
}

const SAMPLES = Array.from({ length: 24 }, (_, i) => (i + 0.5) / 24);

const act = (windowId: string, action: 'pass' | 'react') =>
    ({ action, windowId, reactorId: 'gob' }) as CounterWindowBody;

describe('wfrp reactive Dispel through the cast window', () => {
    it('a canon cast with an enemy Language (Magick) caster opens a window offering Dispel', async () => {
        const { pending } = await openWindow(() => 0.5);

        expect(pending.shown.offers).toEqual([
            {
                reactorId: 'gob',
                dm: true,
                slotLevels: [],
                system: { label: 'wfrpMagic.dispel.react' },
            },
        ]);
    });

    it('no window when no enemy can dispel', async () => {
        const out = await createSpellMutation(deps)(
            baseCtx([hero, withChars(goblin, 50, false)]),
            REQUEST
        );

        expect(out.scene?.pendingChoice).toBeUndefined();
        expect(hp(out, 'gob')).toBeLessThan(goblin.combatStats.currentHp);
    });

    it('pass lands the same damage the cast would have; react either cancels it or lets it land', async () => {
        const seen = { cancelled: 0, landed: 0 };

        for (const r of SAMPLES) {
            const { pending, ctx } = await openWindow(() => r);

            const id = pending.shown.windowId;

            const passed = await machine()(dm(ctx), act(id, 'pass'));

            const landed = hp(passed, 'gob');

            expect(landed).toBeLessThan(goblin.combatStats.currentHp);

            const out = await machine()(dm(ctx), act(id, 'react'));

            expect(out.scene?.pendingChoice).toBeNull();

            const dispelRound = wfrpState(
                out.participants.find((p) => p.basicInfo.id === 'gob')!
            ).dispelRound;

            if ((out.response as { countered?: boolean }).countered) {
                seen.cancelled += 1;
                expect(hp(out, 'gob')).toBe(goblin.combatStats.currentHp);
                expect(JSON.stringify(out.events)).toContain(
                    'battleActions.spell.cancelled'
                );
                expect(
                    out.participants.find((p) => p.basicInfo.id === 'hero')
                        ?.actionFlags.hasUsedAction
                ).toBe(true);
            } else {
                seen.landed += 1;
                expect(hp(out, 'gob')).toBe(landed);
            }

            expect(dispelRound).toBe(ctx.scene.round);
        }

        expect(seen.cancelled).toBeGreaterThan(0);
        expect(seen.landed).toBeGreaterThan(0);
    });
});
