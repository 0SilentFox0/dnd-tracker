import { describe, expect, it, vi } from 'vitest';

import { context, goblin, hero } from './fixtures';

import { mapWallsMutation } from '@/lib/server/battles/mutations/map-walls/map-walls-mutation';
import { createRollbackMutation } from '@/lib/server/battles/mutations/rollback/rollback-mutation';
import { diffParticipants, splitParticipant } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { buildSnapshotState } from '@/lib/utils/battle/store/snapshot-state';
import type { BattleMapConfig, BattleMapState } from '@/types/battle';

const map: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
};

const removed: BattleMapState = { removedEdges: ['1:1:e'], doors: {} };

const linked = (mapState: BattleMapState | null, version = 3) => {
    const base = context({ isDM: true });

    return {
        ...base,
        scene: { ...base.scene, status: 'active' as const },
        meta: {
            ...base.meta,
            map,
            mapRef: { mapId: 'm1', version },
            mapState,
        },
    };
};

describe('map-walls на linked-бою', () => {
    it('відхиляється з mapEdgesLinked', () => {
        expect(() =>
            mapWallsMutation(linked(null), {
                kind: 'walls',
                add: ['1:1:e'],
                remove: [],
            })
        ).toThrow(expect.objectContaining({ message: REJECT.mapEdgesLinked }));
    });
});

describe('rollback зі станом карти', () => {
    const s = [
        splitParticipant(hero, { orderIndex: 0, isPending: false }),
        splitParticipant(goblin, { orderIndex: 1, isPending: false }),
    ];

    const snapshotOf = (
        ctx: ReturnType<typeof linked>,
        layer: Parameters<typeof buildSnapshotState>[4]
    ) => ({
        seq: 4,
        state: buildSnapshotState(
            ctx.scene,
            s,
            diffParticipants(s, s),
            map,
            layer
        ),
    });

    const run = (
        ctx: ReturnType<typeof linked>,
        snap: ReturnType<typeof snapshotOf>
    ) =>
        createRollbackMutation(
            vi.fn(async () => [snap]),
            vi.fn(async () => true)
        )(ctx, { actionIndex: 4 });

    it('відновлює стан зі знімка', async () => {
        const ctx = linked(null);

        const out = await run(
            ctx,
            snapshotOf(ctx, { mapState: removed, mapRef: ctx.meta.mapRef })
        );

        expect(out.scene?.mapState).toEqual(removed);
    });

    it('знімок без стану скидає поточний у null', async () => {
        const ctx = linked(removed);

        const out = await run(
            ctx,
            snapshotOf(ctx, { mapRef: ctx.meta.mapRef })
        );

        expect(out.scene?.mapState).toBeNull();
    });

    it('стан не змінився — патч mapState відсутній', async () => {
        const ctx = linked(null);

        const out = await run(
            ctx,
            snapshotOf(ctx, { mapRef: ctx.meta.mapRef })
        );

        expect(out.scene).not.toHaveProperty('mapState');
    });

    it('відхиляє відкат через оновлення карти', async () => {
        const old = linked(null, 2);

        const snap = snapshotOf(old, { mapRef: old.meta.mapRef });

        await expect(run(linked(null, 3), snap)).rejects.toMatchObject({
            message: REJECT.rollbackAcrossMapUpdate,
        });
    });
});
