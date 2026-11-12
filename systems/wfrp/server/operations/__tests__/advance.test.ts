import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
    const state = {
        row: null as {
            id: string;
            resources: unknown;
            experience: number;
            characteristics: unknown;
        } | null,
        feat: null as unknown,
        logs: [] as unknown[],
        chain: Promise.resolve() as Promise<unknown>,
    };

    return {
        state,
        access: vi.fn(),
        character: { findUnique: vi.fn(), update: vi.fn() },
        feat: { findFirst: vi.fn() },
        career: { findFirst: vi.fn() },
        characterLog: { createMany: vi.fn() },
        $queryRaw: vi.fn(),
    };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        ...h,
        // serialises transactions like FOR UPDATE does
        $transaction: (fn: (db: typeof h) => Promise<unknown>) => {
            const run = h.state.chain.then(() => fn(h));

            h.state.chain = run.catch(() => undefined);

            return run;
        },
    },
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: h.access,
    requireDM: h.access,
}));

import { advanceOperation } from '../advance';
import { advanceUndoOperation } from '../advance-undo';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

type Run = (
    gate: unknown,
    input: unknown
) => Promise<{
    characteristics: typeof DEFAULT_CHARACTERISTICS;
    experience: number;
    available: number;
    entry: { cost: number };
}>;

const advance = advanceOperation.run as unknown as Run;

const undo = advanceUndoOperation.run as unknown as Run;

const character = {
    id: 'hero',
    campaignId: 'camp',
    controlledBy: 'p1',
    status: 'active',
};

const gateOf = (rules = WFRP_RULES, isDM = false) => ({
    access: {
        userId: isDM ? 'dm' : 'p1',
        isDM,
        campaign: { id: 'camp', rules },
    },
    character,
});

const rejects = (promise: Promise<unknown>, message: string, status: number) =>
    expect(promise).rejects.toSatisfy(
        (e) =>
            e instanceof ContentError &&
            e.message === message &&
            e.status === status
    );

beforeEach(() => {
    vi.clearAllMocks();
    h.state.chain = Promise.resolve();
    h.state.row = {
        id: 'hero',
        resources: {},
        experience: 100,
        characteristics: DEFAULT_CHARACTERISTICS,
    };
    h.state.logs = [];
    h.$queryRaw.mockImplementation(async () =>
        h.state.row ? [{ ...h.state.row }] : []
    );
    h.character.update.mockImplementation(
        async ({ data }: { data: { characteristics: unknown } }) => {
            if (h.state.row) h.state.row.characteristics = data.characteristics;
        }
    );
    h.characterLog.createMany.mockImplementation(
        async ({ data }: { data: unknown[] }) => {
            h.state.logs.push(...data);
        }
    );
    h.feat.findFirst.mockResolvedValue(null);
    h.career.findFirst.mockResolvedValue(null);
});

describe('advance', () => {
    it('owner buys a characteristic: XP spent, ledger +1, log written', async () => {
        const result = await advance(gateOf(), {
            kind: 'characteristic',
            key: 'ws',
        });

        expect(result.characteristics.advances.ws).toBe(1);
        expect(result.characteristics.ledger).toHaveLength(1);
        expect(result.entry.cost).toBe(25);
        expect(result.experience).toBe(100);
        expect(result.available).toBe(75);
        expect(h.state.logs).toEqual([
            expect.objectContaining({
                kind: 'advance',
                characterId: 'hero',
                data: {
                    kind: 'characteristic',
                    key: 'ws',
                    from: 0,
                    to: 1,
                    cost: 25,
                },
            }),
        ]);
        expect(
            (h.state.row?.characteristics as typeof DEFAULT_CHARACTERISTICS)
                .advances.ws
        ).toBe(1);
    });

    it('DM buys on behalf of the player', async () => {
        const result = await advance(gateOf(WFRP_RULES, true), {
            kind: 'skill',
            key: 'melee:basic',
        });

        expect(result.characteristics.skillAdvances['melee:basic']).toBe(1);
        expect(h.state.logs[0]).toMatchObject({ actorUserId: 'dm' });
    });

    it('insufficient XP: 409 and nothing changed', async () => {
        h.state.row!.experience = 10;

        await rejects(
            advance(gateOf(), { kind: 'characteristic', key: 'ws' }),
            API_ERRORS.ADVANCE_INSUFFICIENT_XP,
            409
        );

        expect(h.character.update).not.toHaveBeenCalled();
        expect(h.state.logs).toEqual([]);
        expect(h.state.row?.characteristics).toEqual(DEFAULT_CHARACTERISTICS);
    });

    it('two parallel advances with XP for one: exactly one succeeds', async () => {
        h.state.row!.experience = 25;

        const results = await Promise.allSettled([
            advance(gateOf(), { kind: 'characteristic', key: 'ws' }),
            advance(gateOf(), { kind: 'characteristic', key: 'ws' }),
        ]);

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
        expect(
            (h.state.row?.characteristics as typeof DEFAULT_CHARACTERISTICS)
                .advances.ws
        ).toBe(1);
        expect(h.state.logs).toHaveLength(1);
    });

    it('non-wfrp campaigns: 409 ADVANCE_NOT_WFRP', async () => {
        await rejects(
            advance(gateOf(DEFAULT_RULES), {
                kind: 'characteristic',
                key: 'ws',
            }),
            API_ERRORS.ADVANCE_NOT_WFRP,
            409
        );
        await rejects(
            undo(gateOf(DEFAULT_RULES, true), {}),
            API_ERRORS.ADVANCE_NOT_WFRP,
            409
        );
    });

    it('inactive character is rejected', async () => {
        const gate = {
            ...gateOf(),
            character: { ...character, status: 'archived' },
        };

        await rejects(
            advance(gate, { kind: 'characteristic', key: 'ws' }),
            API_ERRORS.XP_CHARACTERS_INVALID,
            400
        );
    });

    it('unknown keys are 400', async () => {
        await rejects(
            advance(gateOf(), { kind: 'characteristic', key: 'zz' }),
            API_ERRORS.ADVANCE_UNKNOWN,
            400
        );
        await rejects(
            advance(gateOf(), { kind: 'skill', key: 'Bad Key' }),
            API_ERRORS.ADVANCE_UNKNOWN,
            400
        );
    });

    it('talent: unknown or foreign-campaign feat is 400 (lookup is scoped to the campaign)', async () => {
        await rejects(
            advance(gateOf(), { kind: 'talent', key: 'feat-x' }),
            API_ERRORS.ADVANCE_UNKNOWN,
            400
        );

        expect(h.feat.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'feat-x', campaignId: 'camp' },
            })
        );
    });

    it('talent: buys ranks until maxRank, then 409', async () => {
        h.feat.findFirst.mockResolvedValue({
            id: 'feat-x',
            xpCost: 10,
            maxRank: 2,
        });

        const first = await advance(gateOf(), {
            kind: 'talent',
            key: 'feat-x',
        });

        expect(first.characteristics.talents['feat-x']).toBe(1);
        expect(first.entry.cost).toBe(10);

        await advance(gateOf(), { kind: 'talent', key: 'feat-x' });

        await rejects(
            advance(gateOf(), { kind: 'talent', key: 'feat-x' }),
            API_ERRORS.ADVANCE_MAX_RANK,
            409
        );
    });

    it('schema rejects bad kind and empty key', () => {
        expect(
            advanceOperation.schema.safeParse({ kind: 'x', key: 'ws' }).success
        ).toBe(false);
        expect(
            advanceOperation.schema.safeParse({ kind: 'skill', key: '' })
                .success
        ).toBe(false);
    });
});

describe('advance with a career', () => {
    const tier = {
        name: 'T',
        characteristics: ['ws'],
        skills: [],
        talents: [],
        trappings: [],
    };

    const row = {
        id: 'c1',
        name: 'Soldier',
        icon: null,
        class: null,
        tiers: [tier, tier, tier, tier],
    };

    const withCareer = (ticks: string[] = []) => ({
        ...DEFAULT_CHARACTERISTICS,
        career: { careerId: 'c1', tier: 1, ticks },
    });

    it('in-career purchase adds a tick and costs the base price', async () => {
        h.state.row!.characteristics = withCareer();
        h.career.findFirst.mockResolvedValue(row);

        const result = await advance(gateOf(), {
            kind: 'characteristic',
            key: 'ws',
        });

        expect(result.characteristics.career?.ticks).toEqual([
            'characteristic:ws',
        ]);
        expect(result.entry.cost).toBe(25);
        expect(h.career.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'c1', campaignId: 'camp' } })
        );
    });

    it('out-of-career purchase costs x multiplier and adds no tick', async () => {
        h.state.row!.characteristics = withCareer();
        h.career.findFirst.mockResolvedValue(row);

        const result = await advance(gateOf(), {
            kind: 'characteristic',
            key: 'bs',
        });

        expect(result.entry.cost).toBe(50);
        expect(result.characteristics.career?.ticks).toEqual([]);
    });

    it('career deleted from the campaign: base price, no error, no tick', async () => {
        h.state.row!.characteristics = withCareer();

        const result = await advance(gateOf(), {
            kind: 'characteristic',
            key: 'bs',
        });

        expect(result.entry.cost).toBe(25);
        expect(result.characteristics.career?.ticks).toEqual([]);
    });

    it('two parallel purchases of the same in-career key: one tick, XP spent once', async () => {
        h.state.row!.characteristics = withCareer();
        h.state.row!.experience = 25;
        h.career.findFirst.mockResolvedValue(row);

        const results = await Promise.allSettled([
            advance(gateOf(), { kind: 'characteristic', key: 'ws' }),
            advance(gateOf(), { kind: 'characteristic', key: 'ws' }),
        ]);

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(
            (h.state.row?.characteristics as { career: { ticks: string[] } })
                .career.ticks
        ).toEqual(['characteristic:ws']);
    });
});

describe('advance gates', () => {
    const gate = (op: { gate: (ctx: never) => Promise<unknown> }) =>
        op.gate({ campaignId: 'camp', characterId: 'hero' } as never);

    beforeEach(() => {
        h.character.findUnique.mockResolvedValue({
            ...character,
            inventory: [],
        });
    });

    it('another player gets 403', async () => {
        h.access.mockResolvedValue({
            userId: 'p2',
            isDM: false,
            campaign: { id: 'camp', rules: WFRP_RULES },
        });

        const res = await gate(advanceOperation);

        expect(res).toBeInstanceOf(NextResponse);
        expect((res as NextResponse).status).toBe(403);
    });

    it('character of another campaign is 403 (loadOwned)', async () => {
        h.access.mockResolvedValue({
            userId: 'p1',
            isDM: false,
            campaign: { id: 'other', rules: WFRP_RULES },
        });

        const res = await advanceOperation.gate({
            campaignId: 'other',
            characterId: 'hero',
        });

        expect((res as NextResponse).status).toBe(403);
    });

    it('missing character is 404', async () => {
        h.access.mockResolvedValue({
            userId: 'p1',
            isDM: false,
            campaign: { id: 'camp', rules: WFRP_RULES },
        });
        h.character.findUnique.mockResolvedValue(null);

        expect(((await gate(advanceOperation)) as NextResponse).status).toBe(
            404
        );
    });

    it('owner passes advance', async () => {
        h.access.mockResolvedValue({
            userId: 'p1',
            isDM: false,
            campaign: { id: 'camp', rules: WFRP_RULES },
        });

        expect(await gate(advanceOperation)).toMatchObject({
            character: { id: 'hero' },
        });
    });

    it('undo is DM-only: owner player gets 403', async () => {
        h.access.mockImplementation(async (_id: string, dmOnly: boolean) =>
            dmOnly
                ? NextResponse.json({ error: 'x' }, { status: 403 })
                : {
                      userId: 'p1',
                      isDM: false,
                      campaign: { id: 'camp', rules: WFRP_RULES },
                  }
        );

        expect(
            ((await gate(advanceUndoOperation)) as NextResponse).status
        ).toBe(403);
        expect(h.access).toHaveBeenCalledWith('camp', true);
    });
});

describe('advance-undo', () => {
    it('returns the XP and restores the advance', async () => {
        await advance(gateOf(), { kind: 'characteristic', key: 'ws' });

        const result = await undo(gateOf(WFRP_RULES, true), {});

        expect(result.characteristics.advances.ws).toBe(0);
        expect(result.characteristics.ledger).toEqual([]);
        expect(result.available).toBe(100);
        expect(h.state.logs[1]).toMatchObject({
            kind: 'advance',
            data: {
                undo: true,
                kind: 'characteristic',
                key: 'ws',
                from: 0,
                to: 1,
                cost: 25,
            },
        });
    });

    it('empty ledger: 409 LEDGER_EMPTY', async () => {
        await rejects(
            undo(gateOf(WFRP_RULES, true), {}),
            API_ERRORS.ADVANCE_LEDGER_EMPTY,
            409
        );
    });

    it('manual DM edit after the purchase: 409 LEDGER_STALE, nothing changes', async () => {
        await advance(gateOf(), { kind: 'characteristic', key: 'ws' });

        const edited = {
            ...(h.state.row!.characteristics as typeof DEFAULT_CHARACTERISTICS),
        };

        edited.advances = { ...edited.advances, ws: 4 };
        h.state.row!.characteristics = edited;
        h.character.update.mockClear();

        await rejects(
            undo(gateOf(WFRP_RULES, true), {}),
            API_ERRORS.ADVANCE_LEDGER_STALE,
            409
        );

        expect(h.character.update).not.toHaveBeenCalled();
        expect(h.state.row?.characteristics).toBe(edited);
    });
});
