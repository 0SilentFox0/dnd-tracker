import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    applyVictoryCompletion as applyVictory,
    type ApplyVictoryParams,
} from '@/lib/utils/battle/turn/turn-helpers';
import {
    checkVictoryConditions as checkVictory,
    completeBattle as complete,
} from '@/lib/utils/battle/turn/victory';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { d20StateData } from '@/systems/d20/rules/state';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleAction, BattleParticipant } from '@/types/battle';

const completeBattle = (
    ps: BattleParticipant[],
    result: 'victory' | 'defeat',
    round: number,
    rules = DEFAULT_RULES
) => complete(ps, result, round, rules);

const checkVictoryConditions = (
    ps: BattleParticipant[],
    reserve: BattleParticipant[] = [],
    rules = DEFAULT_RULES
) => checkVictory(ps, reserve, rules);

const applyVictoryCompletion = (params: Omit<ApplyVictoryParams, 'rules'>) =>
    applyVictory({ ...params, rules: DEFAULT_RULES });

describe('completeBattle', () => {
    it('перемога: hpChanges містять відроджених союзників', () => {
        const base = createMockParticipant();

        const downed = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'hero',
                side: ParticipantSide.ALLY,
            },
            combatStats: {
                ...base.combatStats,
                currentHp: 0,
                status: 'unconscious',
            },
        });

        const { battleAction, updatedParticipants } = completeBattle(
            [downed],
            'victory',
            3
        );

        expect(updatedParticipants[0].combatStats.status).toBe('active');
        expect(battleAction.hpChanges).toEqual([
            expect.objectContaining({
                participantId: 'hero',
                oldHp: 0,
                newHp: downed.combatStats.maxHp,
                change: -downed.combatStats.maxHp,
            }),
        ]);
        expect(battleAction.actionDetails.battleResult).toBe('victory');
    });

    it('wfrp: непритомний союзник лишається з 0 HP після перемоги; dnd5e/homm піднімає', () => {
        const base = createMockParticipant();

        const downed = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'hero',
                side: ParticipantSide.ALLY,
            },
            combatStats: {
                ...base.combatStats,
                currentHp: 0,
                status: 'unconscious',
            },
        });

        const wfrp = completeBattle([downed], 'victory', 3, WFRP_RULES);

        expect(wfrp.updatedParticipants[0].combatStats).toMatchObject({
            currentHp: 0,
            status: 'unconscious',
        });
        expect(wfrp.battleAction.hpChanges).toEqual([]);

        const homm = completeBattle([downed], 'victory', 3, DEFAULT_RULES);

        expect(homm.updatedParticipants[0].combatStats.status).toBe('active');
        expect(
            homm.updatedParticipants[0].combatStats.currentHp
        ).toBeGreaterThan(0);
    });

    it('applyVictoryCompletion не дублює зміни HP за хід — лише відроджених', () => {
        const base = createMockParticipant();

        const before = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'hero',
                side: ParticipantSide.ALLY,
            },
            combatStats: { ...base.combatStats, currentHp: 10 },
        });

        const regenerated = {
            ...before,
            combatStats: { ...before.combatStats, currentHp: 30 },
        };

        const downed = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'pal',
                side: ParticipantSide.ALLY,
            },
            combatStats: {
                ...base.combatStats,
                currentHp: 0,
                status: 'unconscious',
            },
        });

        const enemy = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'e',
                side: ParticipantSide.ENEMY,
            },
            combatStats: { ...base.combatStats, currentHp: 0, status: 'dead' },
        });

        const newLogEntries: BattleAction[] = [];

        applyVictoryCompletion({
            updatedInitiativeOrder: [regenerated, downed, enemy],
            battleStatus: 'active',
            battleId: 'b',
            nextRound: 4,
            currentBattleLogLength: 7,
            newLogEntries,
            getStateBeforeForEntry: () => undefined,
        });

        expect(newLogEntries[0]).toMatchObject({
            battleId: 'b',
            round: 4,
            actionIndex: 7,
            log: [textRef('battleLog.victory.completeWon')],
        });
        expect(newLogEntries[0].hpChanges).toEqual([
            expect.objectContaining({
                participantId: 'pal',
                oldHp: 0,
                change: -downed.combatStats.maxHp,
            }),
        ]);
    });

    it('поразка: battleResult у actionDetails', () => {
        expect(
            completeBattle([createMockParticipant()], 'defeat', 2).battleAction
                .actionDetails.battleResult
        ).toBe('defeat');
    });
});

describe('зачарований юніт і перемога', () => {
    const base = createMockParticipant();

    const hero = createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'hero',
            side: ParticipantSide.ALLY,
        },
    });

    const charmedLast = createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'ogre',
            side: ParticipantSide.ALLY,
            controlledBy: 'user-1',
        },
        battleData: {
            ...base.battleData,
            activeEffects: [
                {
                    id: 'c',
                    name: 'Ляльковод',
                    type: 'condition',
                    duration: 1,
                    appliedAt: { round: 1, timestamp: new Date() },
                    effects: [{ type: 'charm', value: 1 }],
                    charmOrigin: {
                        side: ParticipantSide.ENEMY,
                        controlledBy: 'dm',
                    },
                },
            ],
        },
    });

    it('остання жива ворожа істота під чарами не завершує бій перемогою', () => {
        expect(checkVictoryConditions([hero, charmedLast]).result).toBeNull();
    });

    it('після закінчення чарів, якщо ворог мертвий, перемога є; завершення бою повертає сторони', () => {
        const dead = {
            ...charmedLast,
            combatStats: {
                ...charmedLast.combatStats,
                currentHp: 0,
                status: 'dead' as const,
            },
        };

        expect(checkVictoryConditions([hero, dead]).result).toBe('victory');

        const { updatedParticipants } = completeBattle(
            [hero, charmedLast],
            'defeat',
            2
        );

        const ogre = updatedParticipants.find((p) => p.basicInfo.id === 'ogre');

        expect(ogre?.basicInfo).toMatchObject({
            side: ParticipantSide.ENEMY,
            controlledBy: 'dm',
        });
        expect(ogre?.battleData.activeEffects).toHaveLength(0);
    });

    it('applyVictoryCompletion завершує бій і відновлює сторони зачарованих', () => {
        const enemy = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'e',
                side: ParticipantSide.ENEMY,
            },
            combatStats: { ...base.combatStats, currentHp: 0, status: 'dead' },
        });

        const newLogEntries: BattleAction[] = [];

        const out = applyVictoryCompletion({
            updatedInitiativeOrder: [
                hero,
                enemy,
                {
                    ...charmedLast,
                    combatStats: {
                        ...charmedLast.combatStats,
                        currentHp: 0,
                        status: 'dead',
                    },
                },
            ],
            battleStatus: 'active',
            battleId: 'b',
            nextRound: 2,
            currentBattleLogLength: 0,
            newLogEntries,
            getStateBeforeForEntry: () => undefined,
        });

        expect(out.finalStatus).toBe('completed');
        expect(newLogEntries[0].actionDetails.battleResult).toBe('victory');
        expect(
            out.updatedInitiativeOrder.find((p) => p.basicInfo.id === 'ogre')
                ?.basicInfo.side
        ).toBe(ParticipantSide.ENEMY);
    });
});

describe('перемога з резервом', () => {
    const base = createMockParticipant();

    const hero = createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'hero',
            side: ParticipantSide.ALLY,
        },
    });

    const deadGob = createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'gob',
            side: ParticipantSide.ENEMY,
        },
        combatStats: { ...base.combatStats, currentHp: 0, status: 'dead' },
    });

    const reserveEnemy = createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'imp',
            side: ParticipantSide.ENEMY,
        },
        battleData: { ...base.battleData, reserved: true },
    });

    const reserveAlly = createMockParticipant({
        basicInfo: { ...base.basicInfo, id: 'pal', side: ParticipantSide.ALLY },
        battleData: { ...base.battleData, reserved: true },
    });

    it('видимі вороги впали, у резерві ворог — очікування, не перемога', () => {
        expect(
            checkVictoryConditions([hero, deadGob], [reserveEnemy])
        ).toMatchObject({ result: null, awaiting: 'victory' });
    });

    it('резерв лише союзників не заважає перемозі', () => {
        expect(
            checkVictoryConditions([hero, deadGob], [reserveAlly])
        ).toMatchObject({ result: 'victory', awaiting: null });
    });

    it('поразка з союзниками в резерві — очікування', () => {
        const downed = {
            ...hero,
            combatStats: {
                ...hero.combatStats,
                currentHp: 0,
                status: 'unconscious' as const,
            },
        };

        const gob = {
            ...deadGob,
            combatStats: {
                ...deadGob.combatStats,
                currentHp: 5,
                status: 'active' as const,
            },
        };

        expect(
            checkVictoryConditions([downed, gob], [reserveAlly])
        ).toMatchObject({ result: null, awaiting: 'defeat' });
    });

    it('без резерву — як раніше', () => {
        expect(checkVictoryConditions([hero, deadGob])).toMatchObject({
            result: 'victory',
            awaiting: null,
        });
    });
});

describe('поразка з death saves', () => {
    const base = createMockParticipant();

    const downedHero = (id: string, stable = false) =>
        createMockParticipant({
            basicInfo: { ...base.basicInfo, id, side: ParticipantSide.ALLY },
            combatStats: {
                ...base.combatStats,
                currentHp: 0,
                status: 'unconscious',
            },
            battleData: {
                ...base.battleData,
                dying: true,
                ...d20StateData(createMockParticipant(), {
                    deathSaves: { successes: 0, failures: 0, stable },
                }),
            },
        });

    const gob = createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'gob',
            side: ParticipantSide.ENEMY,
        },
        combatStats: { ...base.combatStats, currentHp: 5, status: 'active' },
    });

    const reserveAlly = createMockParticipant({
        basicInfo: { ...base.basicInfo, id: 'pal', side: ParticipantSide.ALLY },
        battleData: { ...base.battleData, reserved: true },
    });

    it('усі союзники вмирають, не стабілізовані: бій триває', () => {
        expect(
            checkVictoryConditions([downedHero('a'), downedHero('b'), gob])
                .result
        ).toBeNull();
    });

    it('усі стабілізовані: поразка', () => {
        expect(
            checkVictoryConditions([
                downedHero('a', true),
                downedHero('b', true),
                gob,
            ]).result
        ).toBe('defeat');
    });

    it('один мертвий, інший вмирає: бій триває', () => {
        const dead = {
            ...downedHero('a'),
            combatStats: {
                ...downedHero('a').combatStats,
                status: 'dead' as const,
            },
        };

        expect(
            checkVictoryConditions([dead, downedHero('b'), gob]).result
        ).toBeNull();
    });

    it('вмираючий + резерв союзників: не очікування поразки', () => {
        expect(
            checkVictoryConditions([downedHero('a'), gob], [reserveAlly])
        ).toMatchObject({ result: null, awaiting: null });
    });

    it('ворог-персонаж, що вмирає, не тримає бій', () => {
        const hero = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: 'h',
                side: ParticipantSide.ALLY,
            },
        });

        const dyingEnemy = {
            ...downedHero('e'),
            basicInfo: {
                ...downedHero('e').basicInfo,
                side: ParticipantSide.ENEMY,
            },
        };

        const deadGob = {
            ...gob,
            combatStats: {
                ...gob.combatStats,
                currentHp: 0,
                status: 'dead' as const,
            },
        };

        expect(checkVictoryConditions([hero, dyingEnemy, deadGob]).result).toBe(
            'victory'
        );
    });

    it('правила без хука (wfrp): вмираючий вважається переможеним', () => {
        expect(
            checkVictoryConditions([downedHero('a'), gob], [], WFRP_RULES)
                .result
        ).toBe('defeat');
    });
});
