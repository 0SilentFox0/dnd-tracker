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
import { DEFAULT_RULES } from '@/lib/utils/rules';
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
            redactParticipantsForViewer({ ...player, isDM: true }, all, DEFAULT_RULES)
        ).toBe(all);
    });

    it('ворог: HP у відро, без AC/tempHp/scores/ext/множників', () => {
        const [p] = redactParticipantsForViewer(player, [foe()], DEFAULT_RULES);

        expect(p.combatStats).toMatchObject({
            maxHp: 100,
            currentHp: 75,
            tempHp: 0,
            armorClass: 0,
        });
        expect(p.abilities.strength).toBe(10);
        expect(JSON.stringify(p.abilities.system)).not.toContain('morale');
        expect(JSON.stringify(p)).not.toContain('lair');
        expect(p.battleData.hpMultiplier).toBeUndefined();
        expect(p.basicInfo.name).toBe(base.basicInfo.name);
    });

    it('проєкція зберігає healthState для кожного відра', () => {
        for (const currentHp of [40, 39, 21, 20, 11, 10, 1, 0]) {
            const raw = foe({ currentHp });

            const [p] = redactParticipantsForViewer(player, [raw], DEFAULT_RULES);

            expect(healthState(p)).toBe(healthState(raw));
        }

        const dead = foe({ currentHp: 5, status: CombatStatus.DEAD });

        expect(
            healthState(redactParticipantsForViewer(player, [dead], DEFAULT_RULES)[0])
        ).toBe('down');
    });

    it('союзник, власний і exact-глядач не редагуються', () => {
        const ally = { ...foe(), basicInfo: { ...foe().basicInfo, side: ParticipantSide.ALLY } };

        const own = { ...foe(), basicInfo: { ...foe().basicInfo, controlledBy: 'u1' } };

        const all = [ally, own];

        expect(redactParticipantsForViewer(player, all, DEFAULT_RULES)).toBe(all);

        const enemies = [foe()];

        expect(
            redactParticipantsForViewer({ ...player, canSeeEnemyHp: true }, enemies, DEFAULT_RULES)
        ).toBe(enemies);
    });

    it('pending: резерв стає заглушкою, приклик ворога проєктується', () => {
        const reserved = { ...foe(), battleData: { ...foe().battleData, reserved: true } };

        const [stub, summon] = redactPendingForViewer(player, [reserved, foe()], DEFAULT_RULES);

        expect(stub.battleData).toEqual({ reserved: true });
        expect(summon.combatStats.maxHp).toBe(100);
    });

    it('pending: ДМ бачить той самий масив без змін', () => {
        const reserved = { ...foe(), battleData: { ...foe().battleData, reserved: true } };

        const pending = [reserved, foe()];

        expect(
            redactPendingForViewer({ ...player, isDM: true }, pending, DEFAULT_RULES)
        ).toBe(pending);
    });

    it('pending: порожній список лишається порожнім', () => {
        expect(redactPendingForViewer(player, [], DEFAULT_RULES)).toEqual([]);
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
            [owner],
            DEFAULT_RULES
        );

        expect(patch.combatStats).toEqual({ currentHp: 10, maxHp: 100 });
        expect(patch.battleData?.hpMultiplier).toBeUndefined();
        expect(JSON.stringify(patch)).not.toContain('"ext"');
    });

    it('патч союзника без змін (той самий об єкт)', () => {
        const ally = { ...foe(), basicInfo: { ...foe().basicInfo, side: ParticipantSide.ALLY } };

        const patches = [{ id: 'foe', combatStats: { currentHp: 1 } }];

        expect(redactPatchesForViewer(player, patches, [ally], DEFAULT_RULES)).toBe(patches);
    });
});

describe('statblock numbers (L8b M1/morale)', () => {
    const armed = (): BattleParticipant => {
        const p = foe({ morale: 2 });

        return {
            ...p,
            battleData: {
                ...p.battleData,
                attacks: [
                    {
                        id: 'a1',
                        name: 'Bite',
                        type: 'melee',
                        attackBonus: 9,
                        damageDice: '3d8',
                        damageType: 'fire',
                        range: '30',
                        reachCells: 2,
                        damageBonus: 4,
                        guaranteedDamage: 3,
                        versatileDice: '2d10',
                    },
                ],
                resolvedAbilities: [
                    {
                        key: 'r1',
                        effects: [{ flag: 'resistance', damageType: 'fire', percent: 50 }],
                    },
                    {
                        key: 'r2',
                        effects: [
                            { flag: 'resistance', damageType: 'cold', percent: 100 },
                            { flag: 'guaranteedHit' },
                        ],
                    },
                ],
            } as unknown as BattleParticipant['battleData'],
        };
    };

    it('ворог: опори й бонуси атак знято, дальність лишається', () => {
        const [p] = redactParticipantsForViewer(player, [armed()], DEFAULT_RULES);

        const [atk] = p.battleData.attacks;

        expect(atk).toMatchObject({ name: 'Bite', range: '30', reachCells: 2, damageType: 'fire', attackBonus: 0, damageDice: '' });
        expect(atk.damageBonus).toBeUndefined();
        expect(atk.guaranteedDamage).toBeUndefined();
        expect(atk.versatileDice).toBeUndefined();
        expect(p.battleData.resolvedAbilities.map((a) => a.key)).toEqual(['r2']);
        expect(JSON.stringify(p.battleData.resolvedAbilities)).not.toContain('resistance');
    });

    it('здібність зі змішаними ефектами втрачає опис і details, що могли нести числа опорів', () => {
        const base = armed();

        const withText = {
            ...base,
            battleData: {
                ...base.battleData,
                resolvedAbilities: [
                    {
                        key: 'r3',
                        description: 'Resists fire 50%',
                        details: 'x',
                        effects: [{ flag: 'resistance', damageType: 'fire', percent: 50 }, { flag: 'guaranteedHit' }],
                    },
                ],
            },
        } as unknown as BattleParticipant;

        const [p] = redactParticipantsForViewer(player, [withText], DEFAULT_RULES);

        expect(JSON.stringify(p.battleData.resolvedAbilities)).not.toContain('50');
    });

    it('мораль ворога нейтральна, союзника лишається', () => {
        const [enemy] = redactParticipantsForViewer(player, [armed()], DEFAULT_RULES);

        expect(enemy.combatStats.morale).toBe(0);

        const ally = { ...armed(), basicInfo: { ...armed().basicInfo, side: ParticipantSide.ALLY } };

        expect(redactParticipantsForViewer(player, [ally], DEFAULT_RULES)[0].combatStats.morale).toBe(2);
    });

    it('глядач із seeEnemyHp і ДМ бачать усе', () => {
        const all = [armed()];

        expect(redactParticipantsForViewer({ ...player, canSeeEnemyHp: true }, all, DEFAULT_RULES)).toBe(all);
    });

    it('патч: мораль і числа атак ворога знято', () => {
        const owner = armed();

        const [patch] = redactPatchesForViewer(
            player,
            [{ id: 'foe', combatStats: { morale: 3, status: CombatStatus.ACTIVE }, battleData: { attacks: owner.battleData.attacks } }],
            [owner],
            DEFAULT_RULES
        );

        expect(patch.combatStats).not.toHaveProperty('morale');
        expect(patch.battleData?.attacks?.[0].attackBonus).toBe(0);
    });
});
