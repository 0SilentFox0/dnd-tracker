import { describe, expect, it, vi } from 'vitest';

import {
    buildUnit,
    ctxOf,
    firstThen,
    heroes,
    HIT,
    meleeOf,
    NO_WARD,
    part,
    readyOf,
} from './grim-e2e-helpers';

import '@/lib/server/systems/registry';
import { CombatStatus } from '@/lib/constants/battle';
import { attackBodySchema } from '@/lib/schemas/battles';
import { attackMutation } from '@/lib/server/battles/mutations/attack/attack-mutation';
import { critPendingOf } from '@/lib/utils/battle/crit-choice/pending';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { isOutOfFight } from '@/systems/wfrp/rules/combat/critical';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

vi.mock('@/lib/db', () => ({ prisma: { race: { findFirst: vi.fn() } } }));

async function setup(heroHp?: number) {
    const [hero] = heroes();

    const foe = await buildUnit('Oathbound Revenant', 'u0');

    const target: BattleParticipant =
        heroHp === undefined
            ? hero
            : {
                  ...hero,
                  combatStats: { ...hero.combatStats, currentHp: heroHp },
              };

    const ready = readyOf(ctxOf([target, foe]), 'u0', { h0: 1 });

    const body = attackBodySchema.parse({
        attackerId: 'u0',
        targetId: 'h0',
        attackId: meleeOf(foe).id,
        d20Roll: HIT,
        damageRolls: [4],
    });

    return { ready, body, hp: target.combatStats.currentHp };
}

const withParticipants = (
    ctx: BattleMutationContext,
    participants: BattleParticipant[]
) => ({ ...ctx, participants });

const fateOf = (ctx: BattleMutationContext) => wfrpState(part(ctx, 'h0')).fate;

const resumeOf = (
    ready: BattleMutationContext,
    body: ReturnType<typeof attackBodySchema.parse>,
    seed: number,
    negateChoices: Record<string, boolean>
) =>
    attackMutation(ready, body, {
        seed,
        choices: {},
        riderChoices: {},
        negateChoices,
    });

const hitOf = (
    ctx: BattleMutationContext,
    out: { participants: BattleParticipant[] }
) => withParticipants(ctx, out.participants);

describe('grim canon5e Fate reactions', () => {
    it('How Did That Miss: the hit pauses for the defender, spending Fate cancels it', async () => {
        const { ready, body, hp } = await setup(500);

        const paused = await attackMutation(
            { ...ready, rng: firstThen(...NO_WARD) },
            body
        );

        const pending = critPendingOf(paused.scene?.pendingChoice);

        expect(pending?.shown.negations).toHaveLength(1);
        expect(pending?.shown.negations?.[0]).toMatchObject({ holderId: 'h0' });
        expect(paused.participants).toBe(ready.participants);

        const key = pending!.shown.negations![0].key;

        const hits = async (seed: number) =>
            part(
                hitOf(
                    ready,
                    await resumeOf(ready, body, seed, { [key]: false })
                ),
                'h0'
            ).combatStats.currentHp < hp;

        let seed = 1;

        while (seed < 500 && !(await hits(seed))) seed++;

        expect(seed).toBeLessThan(500);

        const spent = hitOf(
            ready,
            await resumeOf(ready, body, seed, { [key]: true })
        );

        expect(part(spent, 'h0').combatStats.currentHp).toBe(hp);
        expect(fateOf(spent)).toBe(0);
        expect(wfrpState(part(spent, 'u0')).momentum).toBe(
            wfrpState(part(ready, 'u0')).momentum
        );

        const declined = hitOf(
            ready,
            await resumeOf(ready, body, seed, { [key]: false })
        );

        expect(part(declined, 'h0').combatStats.currentHp).toBeLessThan(hp);
        expect(fateOf(declined)).toBe(1);
    });

    it('Not Today: Fate turns a fatal blow into a survived one', async () => {
        const { ready, body } = await setup(1);

        const noFate = withParticipants(
            ready,
            ready.participants.map((p) =>
                p.basicInfo.id === 'h0' ? withWfrpState(p, { fate: 0 }) : p
            )
        );

        const fatal = async (seed: number) =>
            part(hitOf(noFate, await resumeOf(noFate, body, seed, {})), 'h0')
                .combatStats.status === CombatStatus.DEAD;

        let seed = 1;

        while (seed < 500 && !(await fatal(seed))) seed++;

        expect(seed).toBeLessThan(500);

        const paused = await attackMutation(
            { ...ready, rng: firstThen(...NO_WARD) },
            body
        );

        const key = critPendingOf(paused.scene?.pendingChoice)!.shown
            .negations![0].key;

        const saved = hitOf(
            ready,
            await resumeOf(ready, body, seed, { [key]: false })
        );

        const hero = part(saved, 'h0');

        expect(hero.combatStats.status).not.toBe(CombatStatus.DEAD);
        expect(isOutOfFight(hero)).toBe(true);
        expect(fateOf(saved)).toBe(0);
    });
});
