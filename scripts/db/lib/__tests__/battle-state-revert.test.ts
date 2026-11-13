import type { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
    applyStatePlan,
    type RawDb,
    revertStatePlan,
} from '@/scripts/db/lib/battle-state-db';
import type {
    StatePlan,
    StateSnapshotBody,
} from '@/scripts/db/lib/battle-state-plan';

interface Store {
    sceneVersion: number;
    participant: { snapshot: string; state: string; snapshotHash: string };
    history: string;
}

function fakeDb(initial: Store) {
    const store: Store = structuredClone(initial);

    const db: RawDb = {
        async $queryRaw<T>(query: Prisma.Sql): Promise<T> {
            const { sql, values } = query;

            if (sql.startsWith('UPDATE battle_scenes')) {
                const [id, version] = values as [string, number | undefined];

                if (id !== 's1') return [] as T;

                if (
                    sql.includes('AND version =') &&
                    version !== store.sceneVersion
                )
                    return [] as T;

                store.sceneVersion++;

                return [{ version: store.sceneVersion }] as T;
            }

            if (sql.startsWith('UPDATE battle_participants')) {
                const [snapshot, state, hash, , , matchSnapshot, matchState] =
                    values as string[];

                if (
                    store.participant.snapshot !== matchSnapshot ||
                    store.participant.state !== matchState
                )
                    return [] as T;

                store.participant = { snapshot, state, snapshotHash: hash };

                return [{ ...store.participant, id: 'p1' }] as T;
            }

            if (sql.startsWith('UPDATE battle_snapshots')) {
                const [next, , , match] = values as [
                    string,
                    string,
                    number,
                    string,
                ];

                if (store.history !== match) return [] as T;

                store.history = next;

                return [{ state: next, seq: 1 }] as T;
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

    return { db, store };
}

const initial: Store = {
    sceneVersion: 4,
    participant: { snapshot: '{"a":1}', state: '{"b":1}', snapshotHash: 'h0' },
    history: '{"h":1}',
};

const plan: StatePlan = {
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
};

async function applied() {
    const { db, store } = fakeDb(initial);

    let body: StateSnapshotBody | undefined;

    await applyStatePlan(db, plan, (b) => {
        body = b;
    });

    return { db, store, body: body as StateSnapshotBody };
}

describe('revertStatePlan', () => {
    it('restores the stored text of every row and bumps the scene version', async () => {
        const { db, store, body } = await applied();

        expect(store.participant.state).toBe('{"b":2}');

        const result = await revertStatePlan(db, body);

        expect(result).toEqual({ scenes: 1, participants: 1, history: 1 });
        expect(store.participant).toEqual(initial.participant);
        expect(store.history).toBe(initial.history);
        expect(store.sceneVersion).toBe(6);
    });

    it('refuses and rolls back when a participant changed after apply', async () => {
        const { db, store, body } = await applied();

        store.participant.state = '{"b":3}';

        await expect(revertStatePlan(db, body)).rejects.toThrow(
            'battle_participants p1'
        );
        expect(store.participant.state).toBe('{"b":3}');
        expect(store.sceneVersion).toBe(5);
    });

    it('refuses and rolls back when a history row changed after apply', async () => {
        const { db, store, body } = await applied();

        store.history = '{"h":3}';

        await expect(revertStatePlan(db, body)).rejects.toThrow(
            'battle_snapshots s1#1'
        );
        expect(store.participant.snapshot).toBe('{"a":2}');
    });

    it('apply then revert then apply again reaches the same stored text', async () => {
        const { db, store, body } = await applied();

        await revertStatePlan(db, body);

        await applyStatePlan(
            db,
            { ...plan, scenes: [{ ...plan.scenes[0], version: 6 }] },
            () => {}
        );

        expect(store.participant.state).toBe('{"b":2}');
        expect(store.history).toBe('{"h":2}');
    });
});
