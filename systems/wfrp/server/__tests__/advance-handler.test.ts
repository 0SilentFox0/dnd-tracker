import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { prisma } from '@/lib/db';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';
import {
    availableXp,
    planPurchase,
    planUndo,
} from '@/systems/wfrp/rules/advancement';
import {
    advanceCharacter,
    undoAdvance,
} from '@/systems/wfrp/server/advance-handler';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: vi.fn(),
        character: { update: vi.fn() },
        feat: { findFirst: vi.fn() },
        career: { findFirst: vi.fn() },
    },
}));
vi.mock('@/lib/server/characters/lock', () => ({ lockCharacters: vi.fn() }));
vi.mock('@/lib/server/characters/log', () => ({ writeCharacterLog: vi.fn() }));
vi.mock('@/lib/utils/rules/systems/lookup', () => ({ ruleSystemOf: vi.fn() }));
vi.mock('@/systems/wfrp/rules/advancement', () => ({
    planPurchase: vi.fn(),
    planUndo: vi.fn(),
    availableXp: vi.fn(),
    advancementFor: (rules: unknown) => rules,
}));
vi.mock('@/systems/wfrp/server/careers/row', () => ({
    toCareerData: (row: { tiers: unknown[] }) => ({ tiers: row.tiers }),
}));

type Gate = Parameters<typeof advanceCharacter>[0];

const db = vi.mocked(prisma, true);

const gate = (status = 'active'): Gate =>
    ({
        access: {
            userId: 'u1',
            campaign: { id: 'camp', rules: { advancement: { mode: 'x' } } },
        },
        character: { id: 'c1', campaignId: 'camp', status },
    }) as unknown as Gate;

const lockWith = (
    row: { experience: number; characteristics: object } | null
) =>
    vi
        .mocked(lockCharacters)
        .mockResolvedValue(
            new Map(
                row ? [['c1', { id: 'c1', resources: {}, ...row }]] : []
            ) as unknown as Awaited<ReturnType<typeof lockCharacters>>
        );

const entry = {
    id: 'e1',
    at: 'now',
    kind: 'skill',
    key: 'heal',
    from: 0,
    to: 1,
    cost: 10,
};

const next = { fate: 1 };

beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
        fn(db)) as never);
    vi.mocked(ruleSystemOf).mockReturnValue({
        advancement: {},
    } as unknown as ReturnType<typeof ruleSystemOf>);
    vi.mocked(availableXp).mockReturnValue(42);
});

describe('advancement guards', () => {
    const runs = [
        [
            'advance',
            () => advanceCharacter(gate(), { kind: 'skill', key: 'k' }),
        ],
        ['undo', () => undoAdvance(gate())],
    ] as const;

    it.each(runs)(
        '%s: 409 when the system has no advancement',
        async (_n, run) => {
            vi.mocked(ruleSystemOf).mockReturnValue({} as never);

            await expect(run()).rejects.toMatchObject({
                message: API_ERRORS.ADVANCE_NOT_SUPPORTED,
                status: 409,
            });
        }
    );

    it.each(runs)('%s: 404 when the row cannot be locked', async (_n, run) => {
        lockWith(null);

        await expect(run()).rejects.toMatchObject({
            message: API_ERRORS.CHARACTER_NOT_FOUND,
            status: 404,
        });
    });

    it('400 for a non-active character', async () => {
        await expect(
            advanceCharacter(gate('dead'), { kind: 'skill', key: 'k' })
        ).rejects.toMatchObject({
            message: API_ERRORS.XP_CHARACTERS_INVALID,
            status: 400,
        });
    });
});

describe('advanceCharacter', () => {
    it.each([
        ['INSUFFICIENT_XP', API_ERRORS.ADVANCE_INSUFFICIENT_XP, 409],
        ['AT_LIMIT', API_ERRORS.ADVANCE_AT_LIMIT, 409],
        ['MAX_RANK', API_ERRORS.ADVANCE_MAX_RANK, 409],
        ['UNKNOWN_KEY', API_ERRORS.ADVANCE_UNKNOWN, 400],
        ['UNKNOWN_TALENT', API_ERRORS.ADVANCE_UNKNOWN, 400],
        ['TALENT_NO_COST', API_ERRORS.ADVANCE_UNKNOWN, 400],
    ])('maps %s to %s / %i', async (error, message, status) => {
        lockWith({ experience: 100, characteristics: {} });
        vi.mocked(planPurchase).mockReturnValue({ ok: false, error } as never);

        await expect(
            advanceCharacter(gate(), { kind: 'skill', key: 'k' })
        ).rejects.toMatchObject({ message, status });
        expect(db.character.update).not.toHaveBeenCalled();
        expect(writeCharacterLog).not.toHaveBeenCalled();
    });

    it('looks up the talent feat in the campaign only for talent purchases, and skips career when none', async () => {
        lockWith({ experience: 100, characteristics: {} });
        db.feat.findFirst.mockResolvedValue({
            id: 'f1',
            xpCost: 50,
            maxRank: 2,
        } as never);
        vi.mocked(planPurchase).mockReturnValue({
            ok: true,
            next,
            entry,
        } as never);

        await advanceCharacter(gate(), { kind: 'talent', key: 'f1' });

        expect(db.feat.findFirst).toHaveBeenCalledWith({
            where: { id: 'f1', campaignId: 'camp' },
            select: { id: true, xpCost: true, maxRank: true },
        });
        expect(db.career.findFirst).not.toHaveBeenCalled();

        const req = vi.mocked(planPurchase).mock.calls[0]![0];

        expect(req.talent).toEqual({ id: 'f1', xpCost: 50, maxRank: 2 });
        expect(req.career).toBeUndefined();
        expect(req.available).toBe(42);

        vi.mocked(planPurchase).mockClear();
        db.feat.findFirst.mockClear();

        await advanceCharacter(gate(), { kind: 'skill', key: 'heal' });

        expect(db.feat.findFirst).not.toHaveBeenCalled();
        expect(
            vi.mocked(planPurchase).mock.calls[0]![0].talent
        ).toBeUndefined();
    });

    it('passes the current career with its tiers to the planner', async () => {
        const state = { careerId: 'k1', tier: 1, ticks: [] };

        lockWith({ experience: 100, characteristics: { career: state } });
        db.career.findFirst.mockResolvedValue({
            id: 'k1',
            tiers: [{ status: 'Brass 1' }],
        } as never);
        vi.mocked(planPurchase).mockReturnValue({
            ok: true,
            next,
            entry,
        } as never);

        await advanceCharacter(gate(), { kind: 'skill', key: 'heal' });

        expect(db.career.findFirst).toHaveBeenCalledWith({
            where: { id: 'k1', campaignId: 'camp' },
        });
        expect(vi.mocked(planPurchase).mock.calls[0]![0].career).toEqual({
            state,
            tiers: [{ status: 'Brass 1' }],
        });
    });

    it('persists the planned characteristics, logs the purchase and returns xp', async () => {
        lockWith({ experience: 100, characteristics: {} });
        vi.mocked(planPurchase).mockReturnValue({
            ok: true,
            next,
            entry,
        } as never);
        vi.mocked(availableXp).mockReturnValueOnce(100).mockReturnValueOnce(90);

        const result = await advanceCharacter(gate(), {
            kind: 'skill',
            key: 'heal',
        });

        expect(result).toEqual({
            characteristics: next,
            experience: 100,
            available: 90,
            entry,
        });
        expect(db.character.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { characteristics: next },
        });
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.ADVANCE,
                data: { kind: 'skill', key: 'heal', from: 0, to: 1, cost: 10 },
            },
        ]);
    });
});

describe('undoAdvance', () => {
    it.each([
        ['LEDGER_EMPTY', API_ERRORS.ADVANCE_LEDGER_EMPTY],
        ['LEDGER_STALE', API_ERRORS.ADVANCE_LEDGER_STALE],
    ])('maps %s to 409', async (error, message) => {
        lockWith({ experience: 5, characteristics: {} });
        vi.mocked(planUndo).mockReturnValue({ ok: false, error } as never);

        await expect(undoAdvance(gate())).rejects.toMatchObject({
            message,
            status: 409,
        });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('persists the reverted sheet and logs an undo entry', async () => {
        lockWith({ experience: 5, characteristics: {} });
        vi.mocked(planUndo).mockReturnValue({
            ok: true,
            next,
            entry,
        } as never);

        const result = await undoAdvance(gate());

        expect(result).toEqual({
            characteristics: next,
            experience: 5,
            available: 42,
            entry,
        });
        expect(db.character.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { characteristics: next },
        });
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.ADVANCE,
                data: {
                    undo: true,
                    kind: 'skill',
                    key: 'heal',
                    from: 0,
                    to: 1,
                    cost: 10,
                },
            },
        ]);
    });
});
