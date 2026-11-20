import type { Prisma, Spell } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { context, goblin, participant } from './fixtures';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import type { CounterWindowBody } from '@/lib/schemas/battles';
import { createCounterWindowMutation } from '@/lib/server/battles/mutations/counter-window/counter-window-mutation';
import { executeCast } from '@/lib/server/battles/mutations/spell/cast-execute';
import { createSpellMutation } from '@/lib/server/battles/mutations/spell/spell-mutation';
import { counterPendingOf } from '@/lib/utils/battle/counter/pending';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { mulberry32 } from '@/lib/utils/common/rng';
import type { RuleSystemCastReaction } from '@/lib/utils/rules/systems/types-magic';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

let fake: RuleSystemCastReaction | undefined;

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => {
    const real = await importOriginal<typeof import('@/lib/utils/rules/systems')>();

    return {
        ...real,
        ruleSystemOf: (rules: Parameters<typeof real.ruleSystemOf>[0]) => {
            const def = real.ruleSystemOf(rules);

            return fake && def.magic.tested
                ? {
                      ...def,
                      magic: {
                          ...def.magic,
                          tested: { ...def.magic.tested, reaction: fake },
                      },
                  }
                : def;
        },
    };
});

vi.mock(
    '@/lib/server/battles/mutations/spell/cast-execute',
    async (importOriginal) => {
        const real = await importOriginal<
            typeof import('@/lib/server/battles/mutations/spell/cast-execute')
        >();

        return { ...real, executeCast: vi.fn(real.executeCast) };
    }
);

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

const hero = (() => {
    const p = participant('hero', { controlledBy: 'user-1' });

    const characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, int: 40 },
        skillAdvances: { 'language:magick': 10 },
    };

    return withWfrpState(
        {
            ...p,
            abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) },
            spellcasting: {
                ...p.spellcasting,
                spellSlots: {},
                knownSpells: ['s1'],
            },
        },
        {}
    );
})();

const foe2 = participant('foe2', {
    side: ParticipantSide.ENEMY,
    controlledBy: 'user-2',
    name: 'foe2',
});

const hp = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)?.combatStats
        .currentHp as number;

const base = (participants: BattleParticipant[]): BattleMutationContext => {
    const c = context({ participants });

    return { ...c, meta: { ...c.meta, rules: WFRP_RULES } };
};

const REQUEST = {
    casterId: 'hero',
    spellId: 's1',
    targetIds: ['gob'],
    diceRolls: [],
    castRoll: 30,
} as never;

const cast = (ctx: BattleMutationContext, body = REQUEST) =>
    createSpellMutation(deps)(ctx, body);

const spy = {
    mayReact: vi.fn(),
    open: vi.fn(),
    answer: vi.fn(),
};

let cancels = true;

const reactionOf = (
    offerIds: string[] = ['gob', 'foe2']
): RuleSystemCastReaction => ({
    mayReact: spy.mayReact.mockReturnValue(true),
    open: spy.open.mockImplementation(({ resolved }) => ({
        offers: offerIds.map((reactorId) => ({
            reactorId,
            label: 'wfrpMagic.dispel.react' as never,
        })),
        data: {
            key: 'wfrp',
            data: {
                probeHp: resolved.find((p: BattleParticipant) => p.basicInfo.id === 'gob')
                    ?.combatStats.currentHp,
            },
        },
    })),
    answer: spy.answer.mockImplementation(({ participants }) => ({
        participants,
        lines: ['dispel line'],
        cancelled: cancels,
    })),
});

const machine = (over: { now?: () => number } = {}) =>
    createCounterWindowMutation({
        spell: (o) => createSpellMutation(deps, o),
        ...over,
    });

const react = (windowId: string, reactorId: string) =>
    ({ action: 'react', windowId, reactorId }) as CounterWindowBody;

async function openWindow(participants = [hero, goblin, foe2]) {
    const ctx = base(participants);

    const out = await cast(ctx);

    const pending = counterPendingOf(out.scene?.pendingChoice);

    if (!pending) throw new Error('window did not open');

    return {
        out,
        pending,
        ctx: {
            ...ctx,
            scene: { ...ctx.scene, pendingChoice: out.scene?.pendingChoice },
        } as BattleMutationContext,
    };
}

const asDm = (ctx: BattleMutationContext): BattleMutationContext => ({
    ...ctx,
    userId: 'dm-user',
    isDM: true,
});

const next = (
    ctx: BattleMutationContext,
    out: MutationResult
): BattleMutationContext => ({
    ...ctx,
    participants: out.participants,
    scene: {
        ...ctx.scene,
        pendingChoice: out.scene?.pendingChoice ?? null,
    } as BattleMutationContext['scene'],
});

const logged = (out: MutationResult) => JSON.stringify(out.events);

beforeEach(() => {
    fake = undefined;
    cancels = true;
    vi.mocked(executeCast).mockClear();
    Object.values(spy).forEach((s) => s.mockReset());
});

describe('cast reaction window', () => {
    it('without a hook the cast is one run and no window opens', async () => {
        const out = await cast(base([hero, goblin, foe2]));

        expect(out.scene?.pendingChoice).toBeUndefined();
        expect(hp(out, 'gob')).toBeLessThan(goblin.combatStats.currentHp);
        expect(executeCast).toHaveBeenCalledTimes(1);
    });

    it('mayReact false: no probe', async () => {
        fake = { ...reactionOf(), mayReact: spy.mayReact.mockReturnValue(false) };

        const out = await cast(base([hero, goblin, foe2]));

        expect(out.scene?.pendingChoice).toBeUndefined();
        expect(spy.open).not.toHaveBeenCalled();
        expect(executeCast).toHaveBeenCalledTimes(1);
    });

    it('a window pauses the cast without touching participants', async () => {
        fake = reactionOf();

        const ctx = base([hero, goblin, foe2]);

        const { out, pending } = await openWindow();

        expect(out.participants).toEqual(ctx.participants);
        expect(out.events).toEqual([]);
        expect(pending.shown.kind).toBe('counter');
        expect(pending.shown.offers).toEqual([
            {
                reactorId: 'gob',
                dm: true,
                slotLevels: [],
                system: { label: 'wfrpMagic.dispel.react' },
            },
            {
                reactorId: 'foe2',
                dm: false,
                slotLevels: [],
                system: { label: 'wfrpMagic.dispel.react' },
            },
        ]);
        expect(pending.hidden.system).toMatchObject({ key: 'wfrp' });
        expect(typeof pending.hidden.seed).toBe('number');
        expect(pending.hidden.request.castRoll).toBe(30);
        expect(JSON.stringify(pending.shown)).not.toContain('probeHp');
        expect(spy.open.mock.calls[0][0].participants).toEqual(ctx.participants);
    });

    it('open returning null runs the cast with the probe seed', async () => {
        fake = { ...reactionOf(), open: spy.open.mockReturnValue(null) };

        const out = await cast(base([hero, goblin, foe2]));

        expect(out.scene?.pendingChoice).toBeUndefined();
        expect(executeCast).toHaveBeenCalledTimes(2);

        const probe = await vi.mocked(executeCast).mock.results[0].value;

        expect(hp(out, 'gob')).toBe(hp(probe, 'gob'));
        expect(hp(out, 'gob')).toBeLessThan(goblin.combatStats.currentHp);
    });

    it('pass by every reactor replays the probe exactly', async () => {
        fake = reactionOf();

        const { ctx, pending } = await openWindow();

        const probeHp = (pending.hidden.system?.data as { probeHp: number })
            .probeHp;

        const run = machine();

        const dm = asDm(ctx);

        const first = await run(dm, {
            action: 'pass',
            windowId: pending.shown.windowId,
            reactorId: 'gob',
        });

        const out = await run(next(dm, first), {
            action: 'pass',
            windowId: pending.shown.windowId,
            reactorId: 'foe2',
        });

        expect(out.scene?.pendingChoice).toBeNull();
        expect(hp(out, 'gob')).toBe(probeHp);
        expect(probeHp).toBeLessThan(goblin.combatStats.currentHp);
    });

    it('react success: cost paid, nothing lands, logged as cancelled', async () => {
        fake = reactionOf();

        const { ctx, pending } = await openWindow();

        const out = await machine()(
            asDm(ctx),
            react(pending.shown.windowId, 'gob')
        );

        expect(out.scene?.pendingChoice).toBeNull();
        expect(out.response).toMatchObject({ countered: true });
        expect(hp(out, 'gob')).toBe(goblin.combatStats.currentHp);
        expect(
            out.participants.find((p) => p.basicInfo.id === 'hero')
                ?.actionFlags.hasUsedAction
        ).toBe(true);
        expect(logged(out)).toContain('battleActions.spell.cancelled');
        expect(logged(out)).toContain('dispel line');
        expect(spy.answer.mock.calls[0][0]).toMatchObject({
            casterId: 'hero',
            reactorId: 'gob',
        });
        expect(spy.answer.mock.calls[0][0].rng()).toBe(
            mulberry32(pending.hidden.seed + 1)()
        );
    });

    it('react failure keeps the window until every offer is answered, then the spell lands', async () => {
        fake = reactionOf();

        cancels = false;

        const { ctx, pending } = await openWindow();

        const run = machine({
            now: () => Date.now() + 5_000,
        });

        const first = await run(
            asDm(ctx),
            react(pending.shown.windowId, 'gob')
        );

        const after = counterPendingOf(first.scene?.pendingChoice);

        expect(first.response).toMatchObject({ countered: false });
        expect(
            after?.shown.offers.find((o) => o.reactorId === 'gob')
        ).toMatchObject({ answer: 'failed' });
        expect(after?.hidden.attempts).toBe(1);
        expect(new Date(after?.shown.deadline ?? 0).getTime()).toBeGreaterThan(
            new Date(pending.shown.deadline).getTime()
        );

        const last = await run(
            { ...next(ctx, first), userId: 'user-2' },
            react(pending.shown.windowId, 'foe2')
        );

        expect(last.scene?.pendingChoice).toBeNull();
        expect(hp(last, 'gob')).toBeLessThan(goblin.combatStats.currentHp);
    });

    it('expire before the deadline is rejected, after it the cast lands; closeAll is DM-only', async () => {
        fake = reactionOf();

        const { ctx, pending } = await openWindow();

        const body = {
            action: 'expire',
            windowId: pending.shown.windowId,
        } as CounterWindowBody;

        await expect(machine()(ctx, body)).rejects.toMatchObject(
            { params: { retryAfterMs: expect.any(Number) } }
        );

        const late = await machine({
            now: () => Date.now() + 11_000,
        })(ctx, body);

        expect(hp(late, 'gob')).toBeLessThan(goblin.combatStats.currentHp);

        const closeAll = {
            action: 'closeAll',
            windowId: pending.shown.windowId,
        } as CounterWindowBody;

        await expect(
            machine()(ctx, closeAll)
        ).rejects.toMatchObject({ status: 403 });

        const dm = await machine()(asDm(ctx), closeAll);

        expect(hp(dm, 'gob')).toBeLessThan(goblin.combatStats.currentHp);
    });

    it('answer kinds must match the offer, and access follows the reactor', async () => {
        fake = reactionOf();

        const { ctx, pending } = await openWindow();

        const run = machine();

        await expect(
            run(asDm(ctx), {
                action: 'counter',
                windowId: pending.shown.windowId,
                reactorId: 'gob',
            })
        ).rejects.toMatchObject({ status: 409 });

        await expect(
            run(ctx, react(pending.shown.windowId, 'gob'))
        ).rejects.toMatchObject({ status: 403 });

        const own = await run(
            { ...ctx, userId: 'user-2' },
            react(pending.shown.windowId, 'foe2')
        );

        expect(own.response).toMatchObject({ countered: true });
    });

    it('react on a spell offer is stale', async () => {
        fake = reactionOf();

        const { ctx, pending } = await openWindow();

        const spellOffer = {
            ...pending,
            shown: {
                ...pending.shown,
                offers: pending.shown.offers.map((o) => ({
                    ...o,
                    system: undefined,
                    spellId: 'cs',
                })),
            },
        };

        await expect(
            machine()(
                {
                    ...asDm(ctx),
                    scene: { ...ctx.scene, pendingChoice: spellOffer },
                },
                react(pending.shown.windowId, 'gob')
            )
        ).rejects.toMatchObject({ status: 409 });
    });

    it('redaction hides the spell and the DM offers from players', async () => {
        fake = reactionOf();

        const { pending } = await openWindow();

        const { redactCounterForPlayers } = await import(
            '@/lib/utils/battle/counter/pending'
        );

        const out = redactCounterForPlayers(pending.shown);

        expect(out.spell).toBeUndefined();
        expect(out.offers.map((o) => o.reactorId)).toEqual(['foe2']);
        expect(out.dmDeciding).toBe(true);
    });
});
