import { describe, expect, it } from 'vitest';

import { composeMapView } from '../map-compose';
import { deriveMapScene } from '../map-scene';
import { moveBudget, pathTo } from '../path';
import { derivePathPreview } from '../path-preview';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: null,
    opacity: 0.3,
    blocked: ['1:0'],
};

const sword = {
    id: 's',
    name: 'Sword',
    type: AttackType.MELEE,
} as BattleAttack;

const p = createMockParticipant();

const hero: BattleParticipant = {
    ...p,
    basicInfo: { ...p.basicInfo, id: 'h', side: ParticipantSide.ALLY },
    combatStats: { ...p.combatStats, speed: 20 },
    battleData: { ...p.battleData, position: { x: 0, y: 0 }, attacks: [sword] },
};

const scene = deriveMapScene({
    map,
    rules: DEFAULT_RULES,
    participants: [hero],
    selectedId: null,
    actor: {
        current: hero,
        viewer: {
            userId: 'u1',
            isDM: false,
            readOnly: false,
            canSeeEnemyHp: false,
        },
        canAct: true,
        isDM: false,
        attackReady: true,
    },
    mode: { placing: false, placingId: null },
});

describe('derivePathPreview', () => {
    it('path equals pathTo for the same map, mover and budget', () => {
        const to = { x: 2, y: 0 };

        const budget = moveBudget(
            { map, dmUserId: null, rules: DEFAULT_RULES },
            hero
        );

        const preview = derivePathPreview(
            scene.view.reach,
            hero,
            to,
            DEFAULT_RULES
        );

        expect(preview?.path).toEqual(pathTo(map, [hero], hero, to, budget));
        expect(preview?.cost).toBe(2);
        expect(preview?.feet).toBe(10);
        expect(preview?.metres).toBe(3);
    });

    it('is null for an unreachable cell', () => {
        expect(
            derivePathPreview(
                scene.view.reach,
                hero,
                { x: 9, y: 4 },
                DEFAULT_RULES
            )
        ).toBeNull();
    });

    it('is null over the mover cell, a wall, without hover or for another mover', () => {
        const at = (x: number, y: number) =>
            derivePathPreview(scene.view.reach, hero, { x, y }, DEFAULT_RULES);

        expect(at(0, 0)).toBeNull();
        expect(at(1, 0)).toBeNull();
        expect(
            derivePathPreview(scene.view.reach, hero, null, DEFAULT_RULES)
        ).toBeNull();
        expect(
            derivePathPreview(
                scene.view.reach,
                { ...hero, basicInfo: { ...hero.basicInfo, id: 'x' } },
                { x: 2, y: 0 },
                DEFAULT_RULES
            )
        ).toBeNull();
        expect(
            derivePathPreview(null, hero, { x: 2, y: 0 }, DEFAULT_RULES)
        ).toBeNull();
    });

    it('composeMapView attaches it for the hovered cell', () => {
        const view = composeMapView({
            scene,
            map,
            rules: DEFAULT_RULES,
            current: hero,
            hover: { cell: { x: 2, y: 1 }, preview: null },
            overlay: { pendingStroke: new Set() },
        });

        expect(view.pathPreview?.path.at(-1)).toEqual({ x: 2, y: 1 });
    });
});
