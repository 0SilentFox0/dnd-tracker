import { describe, expect, it, vi } from 'vitest';

import { createFateReactionMutation } from '../battle/fate-reaction-mutation';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';

const holder = {
    ...makeParticipant({ id: 't', hp: 10, maxHp: 10 }),
};

holder.basicInfo = { ...holder.basicInfo, controlledBy: 'player' };

const pendingChoice = {
    shown: {
        action: 'attack',
        actorId: 'a',
        triggers: [],
        negations: [
            { key: 'negate:t:0', holderId: 't', actorId: 'a', cost: 'x' },
        ],
    },
    hidden: {
        request: { attackerId: 'a' },
        seed: 7,
        userId: 'dm',
        isDM: true,
        serverRolls: true,
    },
};

const ctxOf = (over: object = {}) =>
    ({
        userId: 'player',
        isDM: false,
        participants: [holder],
        pending: [],
        scene: { pendingChoice, round: 1 },
        ...over,
    }) as never;

const attack = vi.fn(async () => ({ result: true }) as never);

const mutate = createFateReactionMutation({ attack } as never);

describe('fate-reaction mutation', () => {
    it('resumes the attack with the answers and the original requester', async () => {
        await mutate(ctxOf(), { answers: { 'negate:t:0': true } });

        expect(attack).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'dm', isDM: true }),
            { attackerId: 'a' },
            {
                seed: 7,
                choices: {},
                riderChoices: {},
                negateChoices: { 'negate:t:0': true },
            },
            { serverRolls: true }
        );
    });

    it('rejects when nothing is pending', async () => {
        await expect(
            mutate(ctxOf({ scene: { pendingChoice: null, round: 1 } }), {
                answers: {},
            })
        ).rejects.toThrow('errors.fateReactionNone');
    });

    it('rejects a set of keys that differs from the offers', async () => {
        await expect(
            mutate(ctxOf(), { answers: { 'negate:t:1': true } })
        ).rejects.toThrow('errors.critChoiceIncomplete');
    });

    it('forbids another player, allows the DM', async () => {
        await expect(
            mutate(ctxOf({ userId: 'other' }), {
                answers: { 'negate:t:0': false },
            })
        ).rejects.toThrow('errors.forbidden');

        await expect(
            mutate(ctxOf({ userId: 'other', isDM: true }), {
                answers: { 'negate:t:0': false },
            })
        ).resolves.toBeDefined();
    });
});
