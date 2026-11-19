import type { Spell } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { context, goblin, participant } from './fixtures';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import type { CounterWindowBody } from '@/lib/schemas/battles';
import { createCounterWindowMutation } from '@/lib/server/battles/mutations/counter-window/counter-window-mutation';
import {
    createSpellMutation,
    type SpellMutationDeps,
} from '@/lib/server/battles/mutations/spell/spell-mutation';
import { counterPendingOf } from '@/lib/utils/battle/counter/pending';
import type { InterruptSpell } from '@/lib/utils/battle/counter/types';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import type { BattleParticipant } from '@/types/battle';

const row = (over: Record<string, unknown>) =>
    ({
        campaignId: 'c1',
        groupId: null,
        icon: null,
        dice: 1,
        targeting: { kind: 'enemy' },
        resolution: { kind: 'auto' },
        raceModifiers: [],
        ...over,
    }) as unknown as Spell;

const ROWS: Record<string, Spell> = {
    s1: row({
        id: 's1',
        name: 'Fire Bolt',
        level: 1,
        cost: 'action',
        spellEffects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'fire',
            },
        ],
    }),
    s2: row({
        id: 's2',
        name: 'Quick Bolt',
        level: 1,
        cost: 'bonusAction',
        spellEffects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'fire',
            },
        ],
    }),
    cs: row({
        id: 'cs',
        name: 'Counterspell',
        level: 3,
        cost: 'reaction',
        resolution: {
            kind: 'save',
            ability: 'constitution',
            onSuccess: 'none',
        },
        spellEffects: [{ kind: 'interruptCast' }],
    }),
};

const COUNTER: InterruptSpell = {
    id: 'cs',
    name: 'Counterspell',
    level: 3,
    range: 60,
};

const deps: SpellMutationDeps = {
    loadSpell: async (id) => ROWS[id] ?? null,
    loadPool: async () => ({ units: [], races: [] }),
    loadInterruptSpells: async () => [COUNTER],
};

const hero = participant(
    'hero',
    { controlledBy: 'user-1' },
    {
        spellcasting: {
            spellSlots: { '1': { max: 2, current: 2 } },
            knownSpells: ['s1', 's2'],
        },
    }
);

const mageOf = (id: string, controlledBy: string) =>
    participant(
        id,
        { side: ParticipantSide.ENEMY, controlledBy, name: id },
        {
            spellcasting: {
                spellSlots: { '3': { max: 1, current: 1 } },
                knownSpells: ['cs'],
                spellcastingAbility: 'intelligence',
            },
        }
    );

const dmMage = mageOf('mage', 'dm');

const playerMage = mageOf('mage2', 'user-2');

const FIRE = (over: Record<string, unknown> = {}) =>
    ({
        casterId: 'hero',
        spellId: 's1',
        targetIds: ['gob'],
        diceRolls: [4],
        ...over,
    }) as never;

const dmCtx = (over: Partial<BattleMutationContext> = {}) =>
    ({
        userId: 'dm-user',
        isDM: true,
        ...over,
    }) as Partial<BattleMutationContext>;

const FAIL = 0;

const SAVE = 0.999;

function machine(opts: { rng?: number; now?: () => number } = {}) {
    const spell = (o: Parameters<typeof createSpellMutation>[1]) =>
        createSpellMutation(deps, {
            ...o,
            ...(o?.rng &&
                opts.rng !== undefined && { rng: () => opts.rng as number }),
        });

    return createCounterWindowMutation({ spell, now: opts.now });
}

async function openWindow(
    participants: BattleParticipant[],
    body = FIRE(),
    over: Partial<BattleMutationContext> = {}
) {
    const base = context({ participants, ...over });

    const out = await createSpellMutation(deps)(base, body);

    const pending = counterPendingOf(out.scene?.pendingChoice);

    if (!pending) throw new Error('window did not open');

    return {
        pending,
        ctx: {
            ...base,
            scene: { ...base.scene, pendingChoice: out.scene?.pendingChoice },
        } as BattleMutationContext,
    };
}

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

const as = (
    ctx: BattleMutationContext,
    who: Partial<BattleMutationContext>
): BattleMutationContext => ({ ...ctx, ...who });

const find = (out: MutationResult, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id) as BattleParticipant;

const logged = (out: MutationResult) => JSON.stringify(out.events);

const counterBy = (
    pending: { shown: { windowId: string } },
    reactorId: string,
    extra: Record<string, unknown> = {}
) =>
    ({
        action: 'counter',
        windowId: pending.shown.windowId,
        reactorId,
        ...extra,
    }) as CounterWindowBody;

const passBy = (pending: { shown: { windowId: string } }, reactorId: string) =>
    ({
        action: 'pass',
        windowId: pending.shown.windowId,
        reactorId,
    }) as CounterWindowBody;

describe('counter-window mutation', () => {
    it('countered: action spent, slot kept, reactor pays reaction and slot', async () => {
        const { ctx, pending } = await openWindow([hero, goblin, dmMage]);

        const out = await machine({ rng: FAIL })(
            as(ctx, dmCtx()),
            counterBy(pending, 'mage')
        );

        expect(out.scene?.pendingChoice).toBeNull();
        expect(out.response).toMatchObject({ countered: true });
        expect(find(out, 'hero').actionFlags.hasUsedAction).toBe(true);
        expect(find(out, 'hero').spellcasting.spellSlots['1'].current).toBe(2);
        expect(find(out, 'mage').actionFlags.hasUsedReaction).toBe(true);
        expect(find(out, 'mage').spellcasting.spellSlots['3'].current).toBe(0);
        expect(find(out, 'gob').combatStats.currentHp).toBe(
            goblin.combatStats.currentHp
        );
        expect(logged(out)).toContain('battleLog.counter.countered');
    });

    it('countered bonus-action cast spends the bonus action, a DM free cast spends nothing', async () => {
        const bonus = await openWindow(
            [hero, goblin, dmMage],
            FIRE({ spellId: 's2' })
        );

        const bonusOut = await machine({ rng: FAIL })(
            as(bonus.ctx, dmCtx()),
            counterBy(bonus.pending, 'mage')
        );

        expect(find(bonusOut, 'hero').actionFlags).toMatchObject({
            hasUsedBonusAction: true,
            hasUsedAction: false,
        });

        const free = await openWindow(
            [hero, goblin, dmMage],
            FIRE({ free: true }),
            dmCtx()
        );

        const freeOut = await machine({ rng: FAIL })(
            free.ctx,
            counterBy(free.pending, 'mage')
        );

        expect(find(freeOut, 'hero').actionFlags).toMatchObject({
            hasUsedBonusAction: false,
            hasUsedAction: false,
        });
    });

    it('caster saves: the offer fails, the window stays open with a fresh deadline, the next reactor counters', async () => {
        const { ctx, pending } = await openWindow([
            hero,
            goblin,
            dmMage,
            playerMage,
        ]);

        const later = Date.now() + 5_000;

        const first = await machine({ rng: SAVE, now: () => later })(
            as(ctx, dmCtx()),
            counterBy(pending, 'mage')
        );

        const after = counterPendingOf(first.scene?.pendingChoice);

        expect(first.response).toMatchObject({ countered: false });
        expect(
            after?.shown.offers.find((o) => o.reactorId === 'mage')
        ).toMatchObject({
            answer: 'failed',
        });
        expect(after?.hidden.attempts).toBe(1);
        expect(new Date(after?.shown.deadline ?? 0).getTime()).toBe(
            later + 10_000
        );
        expect(find(first, 'hero').actionFlags.hasUsedAction).toBe(false);

        const second = await machine({ rng: FAIL })(
            as(next(ctx, first), { userId: 'user-2', isDM: false }),
            counterBy(pending, 'mage2')
        );

        expect(second.scene?.pendingChoice).toBeNull();
        expect(second.response).toMatchObject({ countered: true });
        expect(find(second, 'hero').actionFlags.hasUsedAction).toBe(true);
    });

    it('pass by every reactor resolves the cast with the stored dice', async () => {
        const { ctx, pending } = await openWindow([hero, goblin, dmMage]);

        const out = await machine()(as(ctx, dmCtx()), passBy(pending, 'mage'));

        const direct = await createSpellMutation(deps, { skipCounter: true })(
            context({ participants: [hero, goblin, dmMage] }),
            FIRE(),
            undefined,
            { seed: pending.hidden.seed }
        );

        expect(out.scene?.pendingChoice).toBeNull();
        expect(find(out, 'gob').combatStats.currentHp).toBe(
            find(direct, 'gob').combatStats.currentHp
        );
        expect(find(out, 'gob').combatStats.currentHp).toBeLessThan(
            goblin.combatStats.currentHp
        );
        expect(find(out, 'hero').spellcasting.spellSlots['1'].current).toBe(1);
    });

    it('expire: too early is 422 with retryAfterMs, after the deadline it resolves, a repeat is stale', async () => {
        const { ctx, pending } = await openWindow([hero, goblin, dmMage]);

        const body = {
            action: 'expire',
            windowId: pending.shown.windowId,
        } as CounterWindowBody;

        await expect(machine()(ctx, body)).rejects.toMatchObject({
            code: 'action_rejected',
            params: { retryAfterMs: expect.any(Number) },
        });

        const out = await machine({ now: () => Date.now() + 11_000 })(
            ctx,
            body
        );

        expect(out.scene?.pendingChoice).toBeNull();
        expect(logged(out)).toContain('battleLog.counter.expired');
        expect(find(out, 'gob').combatStats.currentHp).toBeLessThan(
            goblin.combatStats.currentHp
        );

        await expect(
            machine({ now: () => Date.now() + 11_000 })(next(ctx, out), body)
        ).rejects.toMatchObject({ status: 409 });
    });

    it('access: players cannot answer for DM units or close all, the DM can pass for anyone', async () => {
        const { ctx, pending } = await openWindow([
            hero,
            goblin,
            dmMage,
            playerMage,
        ]);

        const run = machine();

        await expect(run(ctx, passBy(pending, 'mage'))).rejects.toMatchObject({
            status: 403,
        });

        await expect(
            run(ctx, {
                action: 'closeAll',
                windowId: pending.shown.windowId,
            })
        ).rejects.toMatchObject({ status: 403 });

        await expect(
            run(as(ctx, dmCtx()), counterBy(pending, 'mage2'))
        ).rejects.toMatchObject({ status: 403 });

        const out = await run(as(ctx, dmCtx()), passBy(pending, 'mage2'));

        expect(
            counterPendingOf(out.scene?.pendingChoice)?.shown.offers.find(
                (o) => o.reactorId === 'mage2'
            )
        ).toMatchObject({ answer: 'pass' });
    });

    it('closeAll by the DM passes every open offer and resolves the cast', async () => {
        const { ctx, pending } = await openWindow([
            hero,
            goblin,
            dmMage,
            playerMage,
        ]);

        const out = await machine()(as(ctx, dmCtx()), {
            action: 'closeAll',
            windowId: pending.shown.windowId,
        });

        expect(out.scene?.pendingChoice).toBeNull();
        expect(find(out, 'gob').combatStats.currentHp).toBeLessThan(
            goblin.combatStats.currentHp
        );
    });

    it('stale: wrong windowId or an already answered reactor is 409', async () => {
        const { ctx, pending } = await openWindow([
            hero,
            goblin,
            dmMage,
            playerMage,
        ]);

        const dm = as(ctx, dmCtx());

        await expect(
            machine()(dm, {
                action: 'pass',
                windowId: 'nope',
                reactorId: 'mage',
            })
        ).rejects.toMatchObject({ status: 409 });

        const out = await machine()(dm, passBy(pending, 'mage'));

        await expect(
            machine()(next(dm, out), passBy(pending, 'mage'))
        ).rejects.toMatchObject({ status: 409 });
    });

    it('a replay that now fails closes the window with a log and no state change', async () => {
        const { ctx, pending } = await openWindow([hero, goblin, dmMage]);

        const spell = vi.fn(
            (o: Parameters<typeof createSpellMutation>[1]) => async () => {
                throw new BattleRuleError(
                    'action_rejected',
                    `x${o?.skipCounter}`
                );
            }
        );

        const dm = as(ctx, dmCtx());

        const out = await createCounterWindowMutation({
            spell: spell as never,
        })(dm, passBy(pending, 'mage'));

        expect(out.scene?.pendingChoice).toBeNull();
        expect(out.participants).toBe(dm.participants);
        expect(logged(out)).toContain('battleLog.counter.castFailed');
    });
});
