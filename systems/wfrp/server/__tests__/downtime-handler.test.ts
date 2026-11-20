import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { prisma } from '@/lib/db';
import { assertNotInActiveBattle } from '@/lib/server/characters/battle-lock';
import { loadStashState } from '@/lib/server/characters/core/stash-state';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ContentError } from '@/lib/server/content/errors';
import { writeInventoryLog } from '@/lib/server/inventory/log';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { planPeriod } from '@/systems/wfrp/rules/downtime/plan-period';
import {
    passPeriod,
    setDowntime,
    undoPeriod,
} from '@/systems/wfrp/server/downtime-handler';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: vi.fn(),
        character: { findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
        career: { findMany: vi.fn() },
        characterInventory: { update: vi.fn() },
    },
}));
vi.mock('@/lib/server/artifacts/lock', () => ({
    lockCampaignArtifacts: vi.fn(),
}));
vi.mock('@/lib/server/characters/battle-lock', () => ({
    assertNotInActiveBattle: vi.fn(),
}));
vi.mock('@/lib/server/characters/lock', () => ({ lockCharacters: vi.fn() }));
vi.mock('@/lib/server/characters/log', () => ({ writeCharacterLog: vi.fn() }));
vi.mock('@/lib/server/inventory/log', () => ({ writeInventoryLog: vi.fn() }));
vi.mock('@/lib/server/characters/core/stash-state', () => ({
    loadStashState: vi.fn(),
    purseColumns: (p: { gp: number; sp: number; cp: number }) => ({
        gold: p.gp,
        silver: p.sp,
        copper: p.cp,
    }),
}));
vi.mock('@/lib/utils/rules/systems', () => ({ ruleSystemOf: vi.fn() }));
vi.mock('@/lib/utils/characters/hero-hp', () => ({
    characterBaseHp: () => ({ total: 20 }),
}));
vi.mock('@/systems/wfrp/rules/downtime/plan-period', () => ({
    planPeriod: vi.fn(),
}));
vi.mock('@/systems/wfrp/server/careers/row', () => ({
    toCareerData: (row: { tiers: unknown[] }) => ({ tiers: row.tiers }),
}));

type Access = Parameters<typeof passPeriod>[0];
type Gate = Parameters<typeof setDowntime>[0];

const db = vi.mocked(prisma, true);

const makeAccess = (
    over: { isDM?: boolean; persistResources?: boolean } = {}
): Access =>
    ({
        userId: 'u1',
        isDM: over.isDM ?? true,
        campaign: {
            id: 'camp',
            rules: {
                outOfCombat: {
                    persistResources: over.persistResources ?? true,
                },
                tables: {},
            },
        },
    }) as unknown as Access;

const makeGate = (
    over: { status?: string; isDM?: boolean; id?: string } = {}
): Gate =>
    ({
        access: makeAccess({ isDM: over.isDM }),
        character: { id: over.id ?? 'c1', status: over.status ?? 'active' },
    }) as unknown as Gate;

const rest = { kind: 'rest', params: {} } as const;

const trainedTrade = {
    skillAdvances: { 'trade:smith': 5, heal: 5 },
};

const locked = (
    id: string,
    over: { resources?: object; characteristics?: object } = {}
) => ({
    id,
    resources: over.resources ?? {},
    experience: 0,
    characteristics: over.characteristics ?? {},
});

const lockWith = (...rows: ReturnType<typeof locked>[]) =>
    vi
        .mocked(lockCharacters)
        .mockResolvedValue(
            new Map(rows.map((r) => [r.id, r])) as unknown as Awaited<
                ReturnType<typeof lockCharacters>
            >
        );

const stash = (gp: number, sp: number, cp: number) => ({
    equipped: {},
    stash: [],
    items: [],
    purse: { gp, sp, cp },
});

beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
        fn(db)) as never);
    vi.mocked(ruleSystemOf).mockReturnValue({
        downtime: {},
        currency: { value: { gp: 240, sp: 12, cp: 1 } },
    } as unknown as ReturnType<typeof ruleSystemOf>);
});

describe('setDowntime', () => {
    it('409 when the rule system has no downtime', async () => {
        vi.mocked(ruleSystemOf).mockReturnValue({} as never);

        await expect(
            setDowntime(makeGate(), { endeavour: rest })
        ).rejects.toMatchObject({
            message: API_ERRORS.DOWNTIME_UNSUPPORTED,
            status: 409,
        });
    });

    it('400 for a non-active character', async () => {
        await expect(
            setDowntime(makeGate({ status: 'dead' }), { endeavour: rest })
        ).rejects.toMatchObject({
            message: API_ERRORS.REST_CHARACTERS_INVALID,
            status: 400,
        });
    });

    it('403 when a non-DM sets ailments', async () => {
        await expect(
            setDowntime(makeGate({ isDM: false }), {
                endeavour: null,
                ailments: [],
            })
        ).rejects.toMatchObject({ message: API_ERRORS.FORBIDDEN, status: 403 });
    });

    it('propagates the active-battle guard with the downtime error', async () => {
        vi.mocked(assertNotInActiveBattle).mockRejectedValue(
            new ContentError(API_ERRORS.DOWNTIME_IN_BATTLE, 409)
        );

        await expect(
            setDowntime(makeGate(), { endeavour: rest })
        ).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_IN_BATTLE });
        expect(assertNotInActiveBattle).toHaveBeenCalledWith(
            'camp',
            ['c1'],
            API_ERRORS.DOWNTIME_IN_BATTLE
        );
    });

    it('400 when the tend patient is not an active character of the campaign', async () => {
        db.character.count.mockResolvedValue(0);

        await expect(
            setDowntime(makeGate(), {
                endeavour: { kind: 'tend', params: { patientId: 'p9' } },
            })
        ).rejects.toMatchObject({
            message: API_ERRORS.REST_CHARACTERS_INVALID,
            status: 400,
        });
        expect(db.character.count).toHaveBeenCalledWith({
            where: { id: { in: ['p9'] }, campaignId: 'camp', status: 'active' },
        });
    });

    it('404 when the row cannot be locked', async () => {
        lockWith();

        await expect(
            setDowntime(makeGate(), { endeavour: rest })
        ).rejects.toMatchObject({
            message: API_ERRORS.CHARACTER_NOT_FOUND,
            status: 404,
        });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('409 when the character lacks the required skill', async () => {
        lockWith(locked('c1'));

        await expect(
            setDowntime(makeGate(), {
                endeavour: {
                    kind: 'earn',
                    params: { skill: 'trade', spec: 'smith' },
                },
            })
        ).rejects.toMatchObject({
            message: API_ERRORS.SKILL_UNTRAINED,
            status: 409,
        });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('stores the endeavour, keeps existing ailments and training, drops the old endeavour', async () => {
        const ailment = { id: 'a1', kind: 'injury', daysLeft: 3, label: 'Leg' };

        const training = { kind: 'skill', key: 'heal', discount: 5 };

        lockWith(
            locked('c1', {
                characteristics: {
                    downtime: {
                        endeavour: { kind: 'custom', params: { text: 'old' } },
                        ailments: [ailment],
                        training,
                    },
                },
            })
        );

        const result = await setDowntime(makeGate(), { endeavour: rest });

        expect(result.downtime).toEqual({
            endeavour: rest,
            ailments: [ailment],
            training,
        });
        expect(db.character.update).toHaveBeenCalledTimes(1);

        const arg = db.character.update.mock.calls[0]![0];

        expect(arg.where).toEqual({ id: 'c1' });
        expect(
            (arg.data.characteristics as { downtime: unknown }).downtime
        ).toEqual(result.downtime);
    });

    it('clears the endeavour when null is sent', async () => {
        lockWith(
            locked('c1', {
                characteristics: {
                    downtime: { endeavour: rest, ailments: [] },
                },
            })
        );

        const result = await setDowntime(makeGate(), { endeavour: null });

        expect(result.downtime).toEqual({ ailments: [] });
    });

    it('DM replaces ailments and generates ids only for those without one', async () => {
        lockWith(locked('c1'));

        const { downtime } = await setDowntime(makeGate(), {
            endeavour: null,
            ailments: [
                { id: 'keep', kind: 'disease', daysLeft: 2, label: 'Flu' },
                { kind: 'festering', daysLeft: 5, label: 'Wound' },
            ],
        });

        expect(downtime.ailments).toHaveLength(2);
        expect(downtime.ailments[0]!.id).toBe('keep');
        expect(downtime.ailments[1]!.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('accepts a trained skill and a tend endeavour with a valid patient', async () => {
        db.character.count.mockResolvedValue(1);
        lockWith(locked('c1', { characteristics: trainedTrade }));

        const trade = {
            kind: 'earn',
            params: { skill: 'trade', spec: 'smith' },
        } as const;

        await expect(
            setDowntime(makeGate(), { endeavour: trade })
        ).resolves.toMatchObject({ downtime: { endeavour: trade } });

        const tend = {
            kind: 'tend',
            params: { patientId: 'p1' },
        } as const;

        await expect(
            setDowntime(makeGate(), { endeavour: tend })
        ).resolves.toMatchObject({ downtime: { endeavour: tend } });
    });
});

describe('passPeriod', () => {
    const plannedHero = (over: Record<string, unknown> = {}) => ({
        id: 'c1',
        resources: { hp: 7 },
        characteristics: {
            downtime: { ailments: [], endeavour: rest },
        },
        summary: { healed: 2, ailments: [] },
        ...over,
    });

    const activeRows = (...ids: string[]) =>
        db.character.findMany.mockResolvedValue(
            ids.map((id) => ({
                id,
                level: 1,
                constitution: 10,
                archetype: null,
                characteristics: {},
            })) as never
        );

    it('409 when the rule system has no downtime', async () => {
        vi.mocked(ruleSystemOf).mockReturnValue({} as never);

        await expect(
            passPeriod(makeAccess(), { days: 1, characterIds: ['c1'] })
        ).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_UNSUPPORTED });
    });

    it('409 when out-of-combat resources are not persisted', async () => {
        await expect(
            passPeriod(makeAccess({ persistResources: false }), {
                days: 1,
                characterIds: ['c1'],
            })
        ).rejects.toMatchObject({
            message: API_ERRORS.OOC_RESOURCES_DISABLED,
            status: 409,
        });
    });

    it.each([0, 31, -2])('400 for days=%i', async (days) => {
        await expect(
            passPeriod(makeAccess(), { days, characterIds: ['c1'] })
        ).rejects.toMatchObject({
            message: API_ERRORS.DOWNTIME_DAYS_INVALID,
            status: 400,
        });
    });

    it('400 when some character is missing, foreign or inactive', async () => {
        activeRows('c1');

        await expect(
            passPeriod(makeAccess(), { days: 1, characterIds: ['c1', 'c2'] })
        ).rejects.toMatchObject({
            message: API_ERRORS.REST_CHARACTERS_INVALID,
            status: 400,
        });
        expect(db.character.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: { in: ['c1', 'c2'] },
                    campaignId: 'camp',
                    status: 'active',
                },
            })
        );
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('dedupes ids before checking and locking', async () => {
        activeRows('c1');
        lockWith(locked('c1'));
        vi.mocked(planPeriod).mockReturnValue([plannedHero()] as never);

        await passPeriod(makeAccess(), {
            days: 3,
            characterIds: ['c1', 'c1'],
        });

        expect(vi.mocked(lockCharacters).mock.calls[0]![1]).toEqual(['c1']);
        expect(assertNotInActiveBattle).toHaveBeenCalledWith(
            'camp',
            ['c1'],
            API_ERRORS.DOWNTIME_IN_BATTLE
        );
    });

    it('persists resources, characteristics and logs; no incomes when no coins', async () => {
        activeRows('c1', 'c2');
        lockWith(locked('c1'), locked('c2'));
        vi.mocked(planPeriod).mockReturnValue([
            plannedHero(),
            plannedHero({ id: 'c2', resources: { hp: 3 } }),
        ] as never);

        const result = await passPeriod(makeAccess(), {
            days: 4,
            characterIds: ['c1', 'c2'],
        });

        expect(result.periodId).toMatch(/^[0-9a-f-]{36}$/);
        expect(result.characters).toEqual([
            {
                id: 'c1',
                resources: { hp: 7 },
                downtime: { ailments: [], endeavour: rest },
            },
            {
                id: 'c2',
                resources: { hp: 3 },
                downtime: { ailments: [], endeavour: rest },
            },
        ]);
        expect(
            db.character.update.mock.calls.map(([a]) => [
                a.where,
                a.data.resources,
            ])
        ).toEqual([
            [{ id: 'c1' }, { hp: 7 }],
            [{ id: 'c2' }, { hp: 3 }],
        ]);
        expect(db.characterInventory.update).not.toHaveBeenCalled();
        expect(writeInventoryLog).not.toHaveBeenCalled();
        expect(loadStashState).not.toHaveBeenCalled();
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual(
            ['c1', 'c2'].map((id) => ({
                campaignId: 'camp',
                characterId: id,
                actorUserId: 'u1',
                kind: CharacterLogKind.DOWNTIME,
                data: {
                    periodId: result.periodId,
                    days: 4,
                    summary: { healed: 2, ailments: [] },
                },
            }))
        );
    });

    it('feeds planPeriod with fresh locked resources, hp cap, career status and days', async () => {
        const career = { careerId: 'k1', tier: 2, ticks: [] };

        db.character.findMany.mockResolvedValue([
            {
                id: 'c1',
                level: 1,
                constitution: 10,
                archetype: null,
                characteristics: { career },
            },
        ] as never);
        db.career.findMany.mockResolvedValue([
            {
                id: 'k1',
                tiers: [{ status: 'Brass 1' }, { status: 'Silver 2' }],
            },
        ] as never);
        lockWith(
            locked('c1', {
                resources: { hp: 11 },
                characteristics: { career },
            })
        );
        vi.mocked(planPeriod).mockReturnValue([plannedHero()] as never);

        await passPeriod(makeAccess(), { days: 5, characterIds: ['c1'] });

        expect(db.career.findMany).toHaveBeenCalledWith({
            where: { id: { in: ['k1'] }, campaignId: 'camp' },
        });

        const input = vi.mocked(planPeriod).mock.calls[0]![0];

        expect(input.days).toBe(5);
        expect(input.heroes).toEqual([
            expect.objectContaining({
                id: 'c1',
                resources: { hp: 11 },
                maxHp: 20,
                status: 'Silver 2',
            }),
        ]);
    });

    it('skips the career query when nobody has a career and leaves status undefined', async () => {
        activeRows('c1');
        lockWith(locked('c1'));
        vi.mocked(planPeriod).mockReturnValue([plannedHero()] as never);

        await passPeriod(makeAccess(), { days: 1, characterIds: ['c1'] });

        expect(db.career.findMany).not.toHaveBeenCalled();
        expect(
            vi.mocked(planPeriod).mock.calls[0]![0].heroes[0]!.status
        ).toBeUndefined();
    });

    it('credits earned coins to the purse, writes inventory log and returns the purse', async () => {
        activeRows('c1', 'c2');
        lockWith(locked('c1'), locked('c2'));
        vi.mocked(loadStashState).mockResolvedValue(stash(1, 2, 3) as never);
        vi.mocked(planPeriod).mockReturnValue([
            plannedHero({ coins: { coin: 'sp', amount: 5 } }),
            plannedHero({ id: 'c2' }),
        ] as never);

        const result = await passPeriod(makeAccess(), {
            days: 2,
            characterIds: ['c1', 'c2'],
        });

        expect(loadStashState).toHaveBeenCalledTimes(1);
        expect(db.characterInventory.update).toHaveBeenCalledWith({
            where: { characterId: 'c1' },
            data: { gold: 1, silver: 7, copper: 3 },
        });
        expect(result.characters[0]!.purse).toEqual({ gp: 1, sp: 7, cp: 3 });
        expect(result.characters[1]).not.toHaveProperty('purse');

        const logs = vi.mocked(writeInventoryLog).mock.calls[0]![1];

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
            campaignId: 'camp',
            characterId: 'c1',
            actorUserId: 'u1',
            delta: { sp: 5 },
        });
    });

    it('409 MONEY_OVERFLOW when income overflows the purse; nothing persisted', async () => {
        activeRows('c1');
        lockWith(locked('c1'));
        vi.mocked(loadStashState).mockResolvedValue(
            stash(0, 0, 2_147_483_647) as never
        );
        vi.mocked(planPeriod).mockReturnValue([
            plannedHero({ coins: { coin: 'cp', amount: 1 } }),
        ] as never);

        await expect(
            passPeriod(makeAccess(), { days: 1, characterIds: ['c1'] })
        ).rejects.toMatchObject({
            message: API_ERRORS.MONEY_OVERFLOW,
            status: 409,
        });
        expect(db.character.update).not.toHaveBeenCalled();
        expect(writeCharacterLog).not.toHaveBeenCalled();
    });
});

describe('undoPeriod', () => {
    const snapshot = (over: Record<string, unknown> = {}) => ({
        id: 'per1',
        at: '2026-01-01T00:00:00.000Z',
        days: 3,
        before: {
            hp: 4,
            ailments: [{ id: 'a1', kind: 'injury', daysLeft: 5, label: 'Leg' }],
        },
        after: { hp: 9, ailmentIds: ['a1'] },
        summary: { healed: 5, ailments: [] },
        ...over,
    });

    const lockedAfter = (
        id: string,
        snap: object,
        over: { hp?: number; ailments?: object[]; extra?: object } = {}
    ) =>
        locked(id, {
            resources: { hp: over.hp ?? 9, dead: false },
            characteristics: {
                downtime: {
                    endeavour: rest,
                    ailments: over.ailments ?? [
                        { id: 'a1', kind: 'injury', daysLeft: 2, label: 'Leg' },
                    ],
                    lastPeriod: snap,
                    ...over.extra,
                },
            },
        });

    const undoInput = { periodId: 'per1', characterIds: ['c1'] };

    const activeRows = (...ids: string[]) =>
        db.character.findMany.mockResolvedValue(
            ids.map((id) => ({ id })) as never
        );

    it('409 when the rule system has no downtime', async () => {
        vi.mocked(ruleSystemOf).mockReturnValue({} as never);

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_UNSUPPORTED }
        );
    });

    it('400 when characters are not all active in the campaign', async () => {
        activeRows();

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.REST_CHARACTERS_INVALID, status: 400 }
        );
    });

    it('stale when the character is not locked or has no lastPeriod', async () => {
        activeRows('c1');
        lockWith();

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE, status: 409 }
        );

        lockWith(
            locked('c1', { characteristics: { downtime: { ailments: [] } } })
        );

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE }
        );
    });

    it('stale when the snapshot belongs to another period', async () => {
        activeRows('c1');
        lockWith(lockedAfter('c1', snapshot({ id: 'other' })));

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE }
        );
    });

    it('stale when hp changed after the period', async () => {
        activeRows('c1');
        lockWith(lockedAfter('c1', snapshot(), { hp: 8 }));

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE }
        );
    });

    it('stale when the ailment set changed after the period', async () => {
        activeRows('c1');
        lockWith(lockedAfter('c1', snapshot(), { ailments: [] }));

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE }
        );
    });

    it('stale when training differs from the snapshot', async () => {
        activeRows('c1');
        lockWith(
            lockedAfter('c1', snapshot(), {
                extra: {
                    training: { kind: 'skill', key: 'heal', discount: 5 },
                },
            })
        );

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE }
        );
    });

    it('restores hp, ailments and training from the snapshot, keeps the endeavour and logs undo', async () => {
        activeRows('c1');

        const training = { kind: 'skill', key: 'heal', discount: 5 };

        lockWith(
            lockedAfter(
                'c1',
                snapshot({
                    before: {
                        hp: 4,
                        ailments: [
                            {
                                id: 'a1',
                                kind: 'injury',
                                daysLeft: 5,
                                label: 'Leg',
                            },
                        ],
                        training,
                    },
                })
            )
        );

        const result = await undoPeriod(makeAccess(), undoInput);

        const expectedDowntime = {
            endeavour: rest,
            ailments: [{ id: 'a1', kind: 'injury', daysLeft: 5, label: 'Leg' }],
            training,
        };

        expect(result).toEqual({
            periodId: 'per1',
            characters: [
                {
                    id: 'c1',
                    resources: { hp: 4, dead: false },
                    downtime: expectedDowntime,
                },
            ],
        });
        expect(db.character.update).toHaveBeenCalledTimes(1);

        const data = db.character.update.mock.calls[0]![0].data;

        expect(data.resources).toEqual({ hp: 4, dead: false });
        expect(
            (data.characteristics as { downtime: unknown }).downtime
        ).toEqual(expectedDowntime);
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.DOWNTIME,
                data: { periodId: 'per1', undo: true },
            },
        ]);
        expect(db.characterInventory.update).not.toHaveBeenCalled();
    });

    it('removes hp from resources when the snapshot had no hp before', async () => {
        activeRows('c1');
        lockWith(
            lockedAfter(
                'c1',
                snapshot({
                    before: { ailments: [] },
                    after: { hp: 9, ailmentIds: ['a1'] },
                })
            )
        );

        const result = await undoPeriod(makeAccess(), undoInput);

        expect(result.characters[0]!.resources).toEqual({ dead: false });
        expect(result.characters[0]!.downtime).toEqual({
            endeavour: rest,
            ailments: [],
        });
    });

    it('refunds earned coins and returns the new purse', async () => {
        activeRows('c1');
        lockWith(
            lockedAfter('c1', snapshot({ coins: { coin: 'sp', amount: 5 } }))
        );
        vi.mocked(loadStashState).mockResolvedValue(stash(1, 7, 3) as never);

        const result = await undoPeriod(makeAccess(), undoInput);

        expect(result.characters[0]!.purse).toEqual({ gp: 1, sp: 2, cp: 3 });
        expect(db.characterInventory.update).toHaveBeenCalledWith({
            where: { characterId: 'c1' },
            data: { gold: 1, silver: 2, copper: 3 },
        });
        expect(vi.mocked(writeInventoryLog).mock.calls[0]![1][0]).toMatchObject(
            { characterId: 'c1', delta: { sp: -5 } }
        );
    });

    it('stale when the coins to refund were already spent', async () => {
        activeRows('c1');
        lockWith(
            lockedAfter('c1', snapshot({ coins: { coin: 'gp', amount: 5 } }))
        );
        vi.mocked(loadStashState).mockResolvedValue(stash(0, 0, 0) as never);

        await expect(undoPeriod(makeAccess(), undoInput)).rejects.toMatchObject(
            { message: API_ERRORS.DOWNTIME_STALE, status: 409 }
        );
        expect(db.character.update).not.toHaveBeenCalled();
    });
});
