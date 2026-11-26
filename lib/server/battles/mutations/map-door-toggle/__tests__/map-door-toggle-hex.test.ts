import { describe, expect, it } from 'vitest';

import {
    context,
    goblin,
    hero,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { mapDoorToggleMutation } from '@/lib/server/battles/mutations/map-door-toggle/map-door-toggle-mutation';
import { canonicalEdge } from '@/lib/utils/battle/grid/edge-keys';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleMapConfig } from '@/types/battle-grid';

const door = canonicalEdge('hex', { x: 2, y: 2 }, 'ne');

const map = (locked = false): BattleMapConfig => ({
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
    gridType: 'hex',
    doors: { [door]: { open: false, ...(locked && { locked }) } },
});

const ctxAt = (x: number, y: number, m = map()) => {
    const c = context({
        participants: [
            { ...hero, battleData: { ...hero.battleData, position: { x, y } } },
            { ...goblin, battleData: { ...goblin.battleData, position: { x: 7, y: 7 } } },
        ],
    });

    return { ...c, meta: { ...c.meta, map: m } };
};

const body = { edge: door, open: true, actorId: 'hero' };

const rejected = (key: string) => expect.objectContaining({ message: key });

describe('map-door-toggle on a hex map', () => {
    it('player next to the door opens it', () => {
        const out = mapDoorToggleMutation(ctxAt(3, 1), body);

        expect(out.scene?.mapState?.doors).toEqual({ [door]: { open: true } });
    });

    it('player far away is rejected', () => {
        expect(() => mapDoorToggleMutation(ctxAt(0, 0), body)).toThrow(
            rejected(REJECT.doorNotAdjacent)
        );
    });

    it('locked door rejects the player', () => {
        expect(() => mapDoorToggleMutation(ctxAt(3, 1, map(true)), body)).toThrow(
            rejected(REJECT.doorLocked)
        );
    });
});
