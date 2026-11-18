import { describe, expect, it } from 'vitest';

import {
    context,
    goblin,
    hero,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { mapDoorToggleMutation } from '@/lib/server/battles/mutations/map-door-toggle/map-door-toggle-mutation';
import { composeEffectiveMap } from '@/lib/utils/battle/map-storage/effective-map';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, BattleMapState } from '@/types/battle-grid';

const base: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
    doors: {
        '3:2:e': { open: false },
        '5:5:e': { open: false, locked: true },
        '0:7:e': { open: false },
    },
};

const placed = (p: BattleParticipant, x: number, y: number) => ({
    ...p,
    battleData: { ...p.battleData, position: { x, y } },
});

const ctxWith = (
    state: BattleMapState | null,
    over: Record<string, unknown> = {},
    participants = [placed(hero, 3, 2), placed(goblin, 6, 6)]
) => {
    const c = context({ participants, ...over });

    return {
        ...c,
        meta: {
            ...c.meta,
            map: composeEffectiveMap(base, state),
            mapState: state,
        },
    };
};

const rejected = (key: string) => expect.objectContaining({ message: key });

describe('map-door-toggle', () => {
    it('гравець відчиняє свої незамкнені двері поруч у свій хід', () => {
        const out = mapDoorToggleMutation(ctxWith(null), {
            edge: '3:2:e',
            open: true,
            actorId: 'hero',
        });

        expect(out.scene?.mapState?.doors).toEqual({ '3:2:e': { open: true } });
        expect(out.events).toHaveLength(1);
        expect(JSON.stringify(out.events[0])).toContain(
            'battleLog.door.opened'
        );
    });

    it('повернення до бази прибирає ключ стану', () => {
        const state = { removedEdges: [], doors: { '3:2:e': { open: true } } };

        const out = mapDoorToggleMutation(ctxWith(state), {
            edge: '3:2:e',
            open: false,
            actorId: 'hero',
        });

        expect(out.scene?.mapState?.doors).toEqual({});
        expect(JSON.stringify(out.events[0])).toContain(
            'battleLog.door.closed'
        );
    });

    it('замкнені двері гравцеві недоступні', () => {
        const c = ctxWith(null, {}, [placed(hero, 5, 5), placed(goblin, 6, 6)]);

        expect(() =>
            mapDoorToggleMutation(c, {
                edge: '5:5:e',
                open: true,
                actorId: 'hero',
            })
        ).toThrow(rejected(REJECT.doorLocked));
    });

    it('не поруч — doorNotAdjacent', () => {
        expect(() =>
            mapDoorToggleMutation(ctxWith(null), {
                edge: '0:7:e',
                open: true,
                actorId: 'hero',
            })
        ).toThrow(rejected(REJECT.doorNotAdjacent));
    });

    it('не його хід або чужий учасник — відмова', () => {
        const c = ctxWith(null, {
            scene: { ...context().scene, turnIndex: 1 },
        });

        expect(() =>
            mapDoorToggleMutation(c, {
                edge: '3:2:e',
                open: true,
                actorId: 'hero',
            })
        ).toThrow();
        expect(() =>
            mapDoorToggleMutation(ctxWith(null), {
                edge: '3:2:e',
                open: true,
                actorId: 'gob',
            })
        ).toThrow();
    });

    it('locked від гравця або без actorId — відмова', () => {
        expect(() =>
            mapDoorToggleMutation(ctxWith(null), {
                edge: '3:2:e',
                locked: true,
                actorId: 'hero',
            })
        ).toThrow(rejected(REJECT.doorDmOnly));
        expect(() =>
            mapDoorToggleMutation(ctxWith(null), { edge: '3:2:e', open: true })
        ).toThrow();
    });

    it('неіснуючі двері — doorNotFound', () => {
        expect(() =>
            mapDoorToggleMutation(ctxWith(null, { isDM: true }), {
                edge: '1:1:e',
                open: true,
            })
        ).toThrow(rejected(REJECT.doorNotFound));
    });

    it('ДМ замикає й відмикає, подія dm', () => {
        const dm = { isDM: true };

        const locked = mapDoorToggleMutation(ctxWith(null, dm), {
            edge: '3:2:e',
            locked: true,
        });

        expect(locked.scene?.mapState?.doors).toEqual({
            '3:2:e': { open: false, locked: true },
        });
        expect(JSON.stringify(locked.events[0])).toContain(
            'battleLog.dm.doorLocked'
        );

        const unlocked = mapDoorToggleMutation(ctxWith(null, dm), {
            edge: '5:5:e',
            locked: false,
        });

        expect(unlocked.scene?.mapState?.doors).toEqual({
            '5:5:e': { open: false },
        });
    });

    it('ДМ: замкнути відчинені — doorOpenLock; відчинити замкнені знімає замок', () => {
        const state = { removedEdges: [], doors: { '3:2:e': { open: true } } };

        expect(() =>
            mapDoorToggleMutation(ctxWith(state, { isDM: true }), {
                edge: '3:2:e',
                locked: true,
            })
        ).toThrow(rejected(REJECT.doorOpenLock));

        const out = mapDoorToggleMutation(ctxWith(null, { isDM: true }), {
            edge: '5:5:e',
            open: true,
        });

        expect(out.scene?.mapState?.doors).toEqual({ '5:5:e': { open: true } });
    });

    it('без змін — без події й без патчу', () => {
        const out = mapDoorToggleMutation(ctxWith(null, { isDM: true }), {
            edge: '3:2:e',
            open: false,
        });

        expect(out.events).toEqual([]);
        expect(out.scene).toBeUndefined();
    });
});
