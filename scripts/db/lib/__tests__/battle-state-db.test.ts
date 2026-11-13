import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import {
    applyStatePlan,
    loadParticipants,
    loadScenes,
    type RawDb,
} from '@/scripts/db/lib/battle-state-db';
import type { StatePlan } from '@/scripts/db/lib/battle-state-plan';

interface Store {
    sceneVersion: number;
    participant: { snapshot: string; state: string; snapshotHash: string };
    history: string;
}

/** in-memory stand-in for the three tables; WHERE guards are checked against the stored text */
function fakeDb(initial: Store) {
    const store: Store = structuredClone(initial);

    const log: string[] = [];

    const db: RawDb = {
        async $queryRaw<T>(query: Prisma.Sql): Promise<T> {
            const { sql, values } = query;

            if (sql.startsWith('UPDATE battle_scenes')) {
                log.push('scene');

                const [id, version] = values as [string, number];

                if (id !== 's1' || version !== store.sceneVersion)
                    return [] as T;

                store.sceneVersion++;

                return [{ version: store.sceneVersion }] as T;
            }

            if (sql.startsWith('UPDATE battle_participants')) {
                log.push('participant');

                const [snapshot, state, hash, , , beforeSnapshot, beforeState] =
                    values as string[];

                if (
                    store.participant.snapshot !== beforeSnapshot ||
                    store.participant.state !== beforeState
                )
                    return [] as T;

                store.participant = { snapshot, state, snapshotHash: hash };

                return [store.participant] as T;
            }

            if (sql.startsWith('UPDATE battle_snapshots')) {
                log.push('history');

                const [next, , , before] = values as [
                    string,
                    string,
                    number,
                    string,
                ];

                if (store.history !== before) return [] as T;

                store.history = next;

                return [{ state: next }] as T;
            }

            return [] as T;
        },
        async $transaction(fn) {
            const backup = structuredClone(store);

            try {
                return await fn(db);
            } catch (error) {
                Object.assign(store, backup);

                throw error;
            }
        },
    };

    return { db, store, log };
}

const initial: Store = {
    sceneVersion: 4,
    participant: { snapshot: '{"a":1}', state: '{"b":1}', snapshotHash: 'h0' },
    history: '{"h":1}',
};

const plan = (over: Partial<StatePlan> = {}): StatePlan => ({
    scenes: [{ id: 's1', name: 'S', version: 4 }],
    participants: [
        {
            id: 'p1',
            battleId: 's1',
            before: {
                snapshot: '{"a":1}',
                state: '{"b":1}',
                snapshotHash: 'h0',
            },
            after: { snapshot: { a: 2 }, state: { b: 2 }, snapshotHash: 'h1' },
            unmapped: [],
        },
    ],
    history: [
        {
            battleId: 's1',
            seq: 1,
            before: '{"h":1}',
            after: { h: 2 },
            unmapped: [],
        },
    ],
    unmapped: [],
    ...over,
});

describe('applyStatePlan', () => {
    it('bumps the version, writes every row and calls write last', async () => {
        const { db, store, log } = fakeDb(initial);

        const order: string[] = [];

        const write = vi.fn(() => order.push(`write after ${log.join(',')}`));

        const body = await applyStatePlan(db, plan(), write);

        expect(store.sceneVersion).toBe(5);
        expect(store.participant).toEqual({
            snapshot: '{"a":2}',
            state: '{"b":2}',
            snapshotHash: 'h1',
        });
        expect(store.history).toBe('{"h":2}');
        expect(body.scenes).toEqual([
            { id: 's1', version: 4, versionAfter: 5 },
        ]);
        expect(body.participants[0].before.snapshot).toBe('{"a":1}');
        expect(body.history[0].after).toBe('{"h":2}');
        expect(write).toHaveBeenCalledTimes(1);
        expect(order).toEqual(['write after scene,participant,history']);
    });

    it('throws without changes when the scene version moved', async () => {
        const { db, store } = fakeDb({ ...initial, sceneVersion: 5 });

        const write = vi.fn();

        await expect(applyStatePlan(db, plan(), write)).rejects.toThrow(
            'battle_scenes s1'
        );
        expect(store.participant.snapshot).toBe('{"a":1}');
        expect(write).not.toHaveBeenCalled();
    });

    it('rolls back when a participant text changed', async () => {
        const { db, store } = fakeDb({
            ...initial,
            participant: { ...initial.participant, snapshot: '{"a":9}' },
        });

        const write = vi.fn();

        await expect(applyStatePlan(db, plan(), write)).rejects.toThrow(
            'battle_participants p1'
        );
        expect(store.sceneVersion).toBe(4);
        expect(write).not.toHaveBeenCalled();
    });

    it('rolls back when a history row text changed', async () => {
        const { db, store } = fakeDb({ ...initial, history: '{"h":9}' });

        const write = vi.fn();

        await expect(applyStatePlan(db, plan(), write)).rejects.toThrow(
            'battle_snapshots s1#1'
        );
        expect(store.sceneVersion).toBe(4);
        expect(store.participant.snapshot).toBe('{"a":1}');
        expect(write).not.toHaveBeenCalled();
    });
});

describe('loaders', () => {
    it('skip the query for an empty scene list', async () => {
        const $queryRaw = vi.fn();

        const db = { $queryRaw, $transaction: vi.fn() } as unknown as RawDb;

        expect(await loadParticipants(db, [])).toEqual([]);
        expect($queryRaw).not.toHaveBeenCalled();
    });

    it('parse stored json and keep the raw text', async () => {
        const $queryRaw = vi.fn().mockResolvedValue([
            {
                id: 'p',
                battleId: 'b',
                snapshotText: '{"x":1}',
                stateText: '{"y":2}',
                snapshotHash: 'h',
                isPending: false,
            },
        ]);

        const db = { $queryRaw, $transaction: vi.fn() } as unknown as RawDb;

        const [row] = await loadParticipants(db, ['b']);

        expect(row.snapshot).toEqual({ x: 1 });
        expect(row.state).toEqual({ y: 2 });
        expect(row.snapshotText).toBe('{"x":1}');
    });

    it('filter scenes by status, campaign and scene id', async () => {
        const $queryRaw = vi.fn().mockResolvedValue([]);

        const db = { $queryRaw, $transaction: vi.fn() } as unknown as RawDb;

        await loadScenes(db, {
            status: 'active',
            campaignIds: ['c1'],
            sceneIds: ['s1'],
        });

        const { sql, values } = $queryRaw.mock.calls[0][0] as Prisma.Sql;

        expect(sql).toContain("s.status = 'active'");
        expect(values).toEqual(['c1', 's1']);

        await loadScenes(db, { status: 'all' });

        expect(($queryRaw.mock.calls[1][0] as Prisma.Sql).sql).not.toContain(
            'WHERE'
        );
    });
});
