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
        logs: [] as unknown[],
    };

    return {
        state,
        access: vi.fn(),
        character: { findUnique: vi.fn(), update: vi.fn() },
        career: { findFirst: vi.fn() },
        characterLog: { createMany: vi.fn() },
        $queryRaw: vi.fn(),
    };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        ...h,
        $transaction: (fn: (db: typeof h) => Promise<unknown>) => fn(h),
    },
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: h.access,
    requireDM: h.access,
}));

import { careerAdvanceOperation, careerSetOperation } from '../career';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

type Run = (
    gate: unknown,
    input: unknown
) => Promise<{ characteristics: typeof DEFAULT_CHARACTERISTICS }>;

const setCareer = careerSetOperation.run as unknown as Run;

const advanceCareer = careerAdvanceOperation.run as unknown as Run;

const character = {
    id: 'hero',
    campaignId: 'camp',
    controlledBy: 'p1',
    status: 'active',
};

const gateOf = (rules = WFRP_RULES) => ({
    access: { userId: 'dm', isDM: true, campaign: { id: 'camp', rules } },
    character,
});

const rejects = (promise: Promise<unknown>, message: string, status: number) =>
    expect(promise).rejects.toSatisfy(
        (e) =>
            e instanceof ContentError &&
            e.message === message &&
            e.status === status
    );

const withCareer = (tier: number, ticks: string[]) => ({
    ...DEFAULT_CHARACTERISTICS,
    career: { careerId: 'c1', tier, ticks },
});

beforeEach(() => {
    vi.clearAllMocks();
    h.state.row = {
        id: 'hero',
        resources: {},
        experience: 0,
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
    h.career.findFirst.mockResolvedValue({ id: 'c1', name: 'Soldier' });
});

describe('career-set', () => {
    it('assigns the career at tier 1 with no ticks and logs it', async () => {
        const result = await setCareer(gateOf(), { careerId: 'c1' });

        expect(result.characteristics.career).toEqual({
            careerId: 'c1',
            tier: 1,
            ticks: [],
        });
        expect(h.career.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'c1', campaignId: 'camp' } })
        );
        expect(h.state.logs).toEqual([
            expect.objectContaining({
                kind: 'career_set',
                data: { careerId: 'c1', name: 'Soldier' },
            }),
        ]);
    });

    it('unknown or foreign career: 404, nothing written', async () => {
        h.career.findFirst.mockResolvedValue(null);

        await rejects(
            setCareer(gateOf(), { careerId: 'x' }),
            API_ERRORS.CAREER_NOT_FOUND,
            404
        );

        expect(h.character.update).not.toHaveBeenCalled();
    });

    it('non-wfrp: 409', async () => {
        await rejects(
            setCareer(gateOf(DEFAULT_RULES), { careerId: 'c1' }),
            API_ERRORS.ADVANCE_NOT_SUPPORTED,
            409
        );
    });

    it('player gets 403 from the gate', async () => {
        h.access.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 403 })
        );
        h.character.findUnique.mockResolvedValue({
            ...character,
            inventory: [],
        });

        const res = await careerSetOperation.gate({
            campaignId: 'camp',
            characterId: 'hero',
        } as never);

        expect((res as NextResponse).status).toBe(403);
        expect(h.access).toHaveBeenCalledWith('camp', true);
    });
});

describe('career-advance', () => {
    it('without enough ticks: 409 with needed/have, force passes', async () => {
        h.state.row!.characteristics = withCareer(1, ['characteristic:ws']);

        await expect(advanceCareer(gateOf(), {})).rejects.toMatchObject({
            message: API_ERRORS.CAREER_TICKS_MISSING,
            status: 409,
            issues: { needed: 10, have: 1 },
        });

        const result = await advanceCareer(gateOf(), { force: true });

        expect(result.characteristics.career).toEqual({
            careerId: 'c1',
            tier: 2,
            ticks: [],
        });
        expect(h.state.logs).toEqual([
            expect.objectContaining({
                kind: 'career_advance',
                data: { careerId: 'c1', tier: 2, forced: true },
            }),
        ]);
    });

    it('enough ticks advance without force', async () => {
        h.state.row!.characteristics = withCareer(
            1,
            Array.from({ length: 10 }, (_, i) => `skill:s${i}`)
        );

        expect(
            (await advanceCareer(gateOf(), {})).characteristics.career?.tier
        ).toBe(2);
    });

    it('no career and max tier are 409 even with force', async () => {
        await rejects(
            advanceCareer(gateOf(), { force: true }),
            API_ERRORS.CAREER_NO_CAREER,
            409
        );

        h.state.row!.characteristics = withCareer(4, []);

        await rejects(
            advanceCareer(gateOf(), { force: true }),
            API_ERRORS.CAREER_MAX_TIER,
            409
        );
    });

    it('non-wfrp: 409', async () => {
        await rejects(
            advanceCareer(gateOf(DEFAULT_RULES), {}),
            API_ERRORS.ADVANCE_NOT_SUPPORTED,
            409
        );
    });
});
