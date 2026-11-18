import { describe, expect, it } from 'vitest';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    healthState,
    PLAYER_VIEWER,
    redactParticipantsForViewer,
    redactPatchesForViewer,
    redactPendingForViewer,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

const base = createMockParticipant();

const foe = (
    over: Partial<BattleParticipant['combatStats']> = {}
): BattleParticipant => ({
    ...base,
    basicInfo: {
        ...base.basicInfo,
        id: 'foe',
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    },
    abilities: {
        ...base.abilities,
        strength: 22,
        system: { key: 'd20', data: { hp: 1, ext: { morale: { v: 3 } } } },
    },
    combatStats: {
        ...base.combatStats,
        maxHp: 40,
        currentHp: 30,
        tempHp: 4,
        armorClass: 18,
        ...over,
    },
    battleData: {
        ...base.battleData,
        hpMultiplier: 1.5,
        system: { key: 'd20', data: { ext: { lair: { x: 1 } } } },
    },
});

const player = { ...PLAYER_VIEWER, userId: 'u1' };

describe('redactParticipantsForViewer', () => {
    it('ДМ: той самий масив', () => {
        const all = [foe()];

        expect(
            redactParticipantsForViewer({ ...player, isDM: true }, all)
        ).toBe(all);
    });

    it('ворог: HP у відро, без AC/tempHp/scores/ext/множників', () => {
        const [p] = redactParticipantsForViewer(player, [foe()]);

        expect(p.combatStats).toMatchObject({
            maxHp: 100,
            currentHp: 75,
            tempHp: 0,
            armorClass: 0,
        });
        expect(p.abilities.strength).toBe(10);
        expect(JSON.stringify(p)).not.toContain('morale');
        expect(JSON.stringify(p)).not.toContain('lair');
        expect(p.battleData.hpMultiplier).toBeUndefined();
        expect(p.basicInfo.name).toBe(base.basicInfo.name);
    });

    it('проєкція зберігає healthState для кожного відра', () => {
        for (const currentHp of [40, 30, 15, 6, 0]) {
            const raw = foe({ currentHp });

            const [p] = redactParticipantsForViewer(player, [raw]);

            expect(healthState(p)).toBe(healthState(raw));
        }

        const dead = foe({ currentHp: 5, status: CombatStatus.DEAD });

        expect(
            healthState(redactParticipantsForViewer(player, [dead])[0])
        ).toBe('down');
    });

    it('союзник, власний і exact-глядач не редагуються', () => {
        const ally = { ...foe(), basicInfo: { ...foe().basicInfo, side: ParticipantSide.ALLY } };

        const own = { ...foe(), basicInfo: { ...foe().basicInfo, controlledBy: 'u1' } };

        const all = [ally, own];

        expect(redactParticipantsForViewer(player, all)).toBe(all);

        const enemies = [foe()];

        expect(
            redactParticipantsForViewer({ ...player, canSeeEnemyHp: true }, enemies)
        ).toBe(enemies);
    });

    it('pending: резерв стає заглушкою, приклик ворога проєктується', () => {
        const reserved = { ...foe(), battleData: { ...foe().battleData, reserved: true } };

        const [stub, summon] = redactPendingForViewer(player, [reserved, foe()]);

        expect(stub.battleData).toEqual({ reserved: true });
        expect(summon.combatStats.maxHp).toBe(100);
    });
});

describe('redactPatchesForViewer', () => {
    it('патч ворога: HP проєктується за maxHp власника, AC/tempHp/ext зникають', () => {
        const owner = foe({ currentHp: 5 });

        const [patch] = redactPatchesForViewer(
            player,
            [
                {
                    id: 'foe',
                    combatStats: { currentHp: 5, armorClass: 20, tempHp: 2 },
                    battleData: {
                        hpMultiplier: 2,
                        system: { key: 'd20', data: { ext: { a: 1 } } },
                    },
                },
            ],
            [owner]
        );

        expect(patch.combatStats).toEqual({ currentHp: 10, maxHp: 100 });
        expect(patch.battleData?.hpMultiplier).toBeUndefined();
        expect(JSON.stringify(patch)).not.toContain('"ext"');
    });

    it('патч союзника без змін (той самий об єкт)', () => {
        const ally = { ...foe(), basicInfo: { ...foe().basicInfo, side: ParticipantSide.ALLY } };

        const patches = [{ id: 'foe', combatStats: { currentHp: 1 } }];

        expect(redactPatchesForViewer(player, patches, [ally])).toBe(patches);
    });
});
