import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
    campaignPost: vi.fn(async () => ({ delta: { log: [] } })),
    campaignPatch: vi.fn(async () => ({ delta: { log: [] } })),
}));

import {
    type BattleOp,
    battleOpPath,
    battleOps,
    callBattleOp,
} from '../battle-ops';
import { campaignPatch, campaignPost } from '../client';

const EXPECTED_PATHS: Record<
    Exclude<keyof typeof battleOps, 'system'>,
    string
> = {
    nextTurn: 'next-turn',
    attack: 'attack',
    abilityAction: 'ability-action',
    auraZone: 'aura-zone',
    move: 'move',
    mapTerrain: 'map-terrain',
    maze: 'maze',
    mazeMark: 'maze-mark',
    mapBackground: 'map-background',
    mapMotion: 'map-motion',
    mapWeather: 'map-weather',
    bonusAction: 'bonus-action',
    castSpell: 'spell',
    start: 'start',
    reset: 'reset',
    complete: 'complete',
    rollback: 'rollback',
    addParticipant: 'add-participant',
    reveal: 'reveal-participant',
    conditions: 'conditions',
    systemCondition: 'system/system-condition',
    initiativeReorder: 'initiative-reorder',
    initiativeRoll: 'initiative-roll',
    coreAction: 'system/core-action',
    scaleUnits: 'scale-units',
    unitControl: 'unit-control',
    refreshSources: 'refresh-sources',
    updateParticipant: 'participants/p1',
};

describe('battleOps', () => {
    it.each(Object.entries(EXPECTED_PATHS))(
        '%s -> /battles/b1/%s',
        (key, path) => {
            const operation = battleOps[
                key as keyof typeof battleOps
            ] as BattleOp<object, unknown>;

            expect(battleOpPath(operation, 'b1', { participantId: 'p1' })).toBe(
                `/battles/b1/${path}`
            );
        }
    );

    it('system posts the inner body to /system/<action>', async () => {
        const send = { action: 'morale-check', body: { participantId: 'p1' } };

        expect(battleOpPath(battleOps.system, 'b1', send)).toBe(
            '/battles/b1/system/morale-check'
        );

        await callBattleOp(battleOps.system, 'c1', 'b1', {
            ...send,
            expectedVersion: 2,
        });

        expect(campaignPost).toHaveBeenCalledWith(
            'c1',
            '/battles/b1/system/morale-check',
            { participantId: 'p1', expectedVersion: 2 }
        );
    });

    it('only the participant patch uses PATCH', () => {
        const patching = Object.entries(battleOps).filter(
            ([, o]) => 'method' in o && o.method === 'PATCH'
        );

        expect(patching.map(([k]) => k)).toEqual(['updateParticipant']);
    });

    it('defaults: invalidate and retryOnConflict', () => {
        const invalidate = Object.fromEntries(
            Object.entries(battleOps)
                .filter(([, o]) => 'invalidate' in o)
                .map(([k, o]) => [
                    k,
                    (o as { invalidate: string[] }).invalidate,
                ])
        );

        expect(invalidate).toEqual({
            nextTurn: ['battles'],
            attack: ['battles'],
            reset: ['battles'],
            rollback: ['battles'],
            start: ['battles', 'active-battles'],
            complete: ['battles', 'active-battles'],
        });

        const retrying = Object.entries(battleOps)
            .filter(([, o]) => 'retryOnConflict' in o)
            .map(([k]) => k);

        expect(retrying).toEqual(['mapTerrain', 'mapMotion', 'mapWeather']);
    });

    it('only attack and castSpell map the response to hpChanges', () => {
        const mapped = Object.entries(battleOps)
            .filter(([, o]) => 'mapResponse' in o)
            .map(([k]) => k);

        expect(mapped).toEqual(['attack', 'castSpell']);
    });

    it('posts the body as is and patches the participant without its id', async () => {
        await callBattleOp(battleOps.nextTurn, 'c1', 'b1', {
            expectedVersion: 3,
        });

        expect(campaignPost).toHaveBeenCalledWith(
            'c1',
            '/battles/b1/next-turn',
            { expectedVersion: 3 }
        );

        await callBattleOp(battleOps.updateParticipant, 'c1', 'b1', {
            participantId: 'p1',
            data: { kill: true },
            expectedVersion: 4,
        });

        expect(campaignPatch).toHaveBeenCalledWith(
            'c1',
            '/battles/b1/participants/p1',
            { kill: true, expectedVersion: 4 }
        );
    });
});
