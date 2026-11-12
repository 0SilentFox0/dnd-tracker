import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { nextTurnMutation } from '@/lib/server/battles/mutations/next-turn/next-turn-mutation';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { DEFAULT_RULES } from '@/lib/utils/rules';

const base = createMockParticipant();

const ctx = {
    scene: {
        id: 'b1',
        campaignId: 'c1',
        status: 'active',
        round: 1,
        turnIndex: 0,
        version: 2,
        eventSeq: 3,
        pendingMoraleCheck: null,
        pendingChoice: null,
        startedAt: null,
        completedAt: null,
    },
    participants: [
        createMockParticipant({ basicInfo: { ...base.basicInfo, id: 'hero' } }),
        createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'gob',
                side: ParticipantSide.ENEMY,
                controlledBy: 'dm',
            },
        }),
    ],
    pending: [],
    meta: {
        name: 'Бій',
        description: null,
        setup: [],
        friendlyFire: false,
        critChoiceByDm: false,
        map: null,
        rules: DEFAULT_RULES,
        createdAt: new Date(),
    },
    userId: 'user-1',
    isDM: false,
} as unknown as BattleMutationContext;

describe('next-turn mutation', () => {
    it('передає хід і повертає події переходу', () => {
        const out = nextTurnMutation(ctx);

        expect(out.scene).toMatchObject({
            turnIndex: 1,
            round: 1,
            pendingMoraleCheck: null,
        });
        expect(Array.isArray(out.events)).toBe(true);
    });

    it('на новому раунді прибирає прострочені барʼєри з карти', () => {
        const map = {
            cols: 8,
            rows: 8,
            background: null,
            opacity: 0.3,
            terrain: { '1:1': { kind: 'barrier' as const, untilRound: 1 } },
        };

        const out = nextTurnMutation({
            ...ctx,
            scene: { ...ctx.scene, turnIndex: 1 },
            meta: { ...ctx.meta, map },
        });

        expect(out.scene).toMatchObject({
            round: 2,
            map: { cols: 8, rows: 8, background: null, opacity: 0.3 },
        });
        expect(out.scene?.map).not.toHaveProperty('terrain');
    });

    describe('auto (таймер ходу)', () => {
        const timed = (seconds: number | null, agoMs: number | null) =>
            ({
                ...ctx,
                scene: {
                    ...ctx.scene,
                    turnStartedAt:
                        agoMs === null ? null : new Date(Date.now() - agoMs),
                },
                meta: { ...ctx.meta, turnTimerSeconds: seconds },
            }) as unknown as BattleMutationContext;

        it('завершує хід, коли час вичерпано', () => {
            expect(
                nextTurnMutation(timed(30, 31_000), { auto: true }).scene
            ).toMatchObject({ turnIndex: 1 });
        });

        it('відхиляє, поки час не вичерпано, таймер вимкнено або немає відмітки старту', () => {
            expect(() =>
                nextTurnMutation(timed(30, 5_000), { auto: true })
            ).toThrow();
            expect(() =>
                nextTurnMutation(timed(null, 60_000), { auto: true })
            ).toThrow();
            expect(() =>
                nextTurnMutation(timed(30, null), { auto: true })
            ).toThrow();
        });
    });
});
