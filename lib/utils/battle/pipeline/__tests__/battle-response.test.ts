import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    buildPusherMessages,
    redactDeltaForPlayers,
    toBattleResponse,
} from '@/lib/utils/battle/pipeline/battle-response';
import type { BattleSceneState } from '@/lib/utils/battle/store';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { ClientBattleDelta } from '@/types/api';

const scene: BattleSceneState = {
    id: 'b1',
    campaignId: 'c1',
    status: 'active',
    round: 1,
    turnIndex: 0,
    version: 3,
    eventSeq: 4,
    pendingMoraleCheck: null,
    pendingChoice: null,
    startedAt: null,
    completedAt: null,
};

const WFRP_RULES = { ...DEFAULT_RULES, system: { key: 'wfrp' as const } };

const meta = {
    name: 'Бій',
    description: null,
    setup: [{ id: 'u1', type: 'unit' as const, side: ParticipantSide.ENEMY }],
    friendlyFire: true,
    rules: DEFAULT_RULES,
    critChoiceByDm: false,
    map: null,
    createdAt: new Date(),
};

const hero = createMockParticipant({
    basicInfo: {
        ...createMockParticipant().basicInfo,
        id: 'hero',
        controlledBy: 'u-player',
    },
});

const goblin = createMockParticipant({
    basicInfo: {
        ...createMockParticipant().basicInfo,
        id: 'gob',
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    },
});

describe('toBattleResponse', () => {
    it('payload для інших клієнтів не містить isDM/userRole', () => {
        const b = toBattleResponse({ meta }, scene, [hero], [], {
            mode: 'append',
            entries: [],
        });

        expect(b).not.toHaveProperty('isDM');
        expect(b).not.toHaveProperty('userRole');
        expect(b.battleLogMode).toBe('append');
        expect(b.campaign).toEqual({ id: 'c1', friendlyFire: true });
    });

    it('містить правила бою', () => {
        expect(
            toBattleResponse({ meta }, scene, [hero], [], {
                mode: 'full',
                entries: [],
            }).rules
        ).toEqual(meta.rules);
    });

    it('гравцю не віддає таблиці правил, ДМ — віддає', () => {
        const tables = { critHead: [{ max: 100, text: 'x', effects: [] }] };

        const withTables = {
            meta: { ...meta, rules: { ...DEFAULT_RULES, tables } },
        };

        const entries = { mode: 'full' as const, entries: [] };

        expect(
            toBattleResponse(withTables, scene, [hero], [], entries, {
                isDM: false,
            }).rules.tables
        ).toEqual({});
        expect(
            toBattleResponse(withTables, scene, [hero], [], entries, {
                isDM: true,
            }).rules.tables
        ).toEqual(tables);
    });

    it('для того, хто діяв, — з isDM/userRole; лобі видно лише в prepared', () => {
        const active = toBattleResponse(
            { meta },
            scene,
            [hero],
            [],
            { mode: 'full', entries: [] },
            { isDM: true }
        );

        expect(active).toMatchObject({
            isDM: true,
            userRole: 'dm',
            participants: [],
        });
        expect(active.battleLogMode).toBeUndefined();

        const prepared = toBattleResponse(
            { meta },
            { ...scene, status: 'prepared' },
            [],
            [],
            { mode: 'full', entries: [] },
            { isDM: false }
        );

        expect(prepared.participants).toEqual(meta.setup);
        expect(prepared.userRole).toBe('player');
    });

    it('стан музики з meta йде у сцену; без нього — null', () => {
        const audio = {
            trackId: 't1',
            track: null,
            playing: true,
            offsetSec: 0,
            startedAt: 1,
            seq: 2,
        };

        expect(
            toBattleResponse({ meta: { ...meta, audio } }, scene, [], [], {
                mode: 'full',
                entries: [],
            }).audio
        ).toEqual(audio);
        expect(
            toBattleResponse({ meta }, scene, [], [], {
                mode: 'full',
                entries: [],
            }).audio
        ).toBeNull();
    });
});

describe('buildPusherMessages', () => {
    const payload = {
        battleId: 'b1',
        version: 4,
        scene: {
            status: 'active' as const,
            round: 1,
            turnIndex: 0,
            pendingMoraleCheck: null,
            pendingChoice: null,
        },
        upserted: [],
        removed: [],
        log: [],
    };

    it('зміна ходу на гравця — battle-delta + turn-started у його канал', () => {
        const messages = buildPusherMessages({
            before: { ...scene, turnIndex: 1 },
            after: scene,
            rules: WFRP_RULES,
            participants: [hero, goblin],
            delta: payload,
        });

        expect(messages.map((m) => m.event)).toEqual([
            'battle-delta',
            'turn-started',
        ]);
        expect(messages[1]).toMatchObject({
            channel: 'private-user-u-player',
            payload: { battleId: 'b1', participantId: 'hero' },
        });
    });

    it('хід переходить до DM-учасника — без turn-started', () => {
        expect(
            buildPusherMessages({
                before: scene,
                after: { ...scene, turnIndex: 1 },
                rules: WFRP_RULES,
                participants: [hero, goblin],
                delta: payload,
            }).map((m) => m.event)
        ).toEqual(['battle-delta']);
    });

    it('старт і завершення — лише battle-delta, без окремих подій', () => {
        expect(
            buildPusherMessages({
                before: { ...scene, status: 'prepared' },
                after: scene,
                rules: WFRP_RULES,
                participants: [hero],
                delta: payload,
            }).map((m) => m.event)
        ).toEqual(['battle-delta', 'turn-started']);
        expect(
            buildPusherMessages({
                before: scene,
                after: { ...scene, status: 'completed' },
                rules: WFRP_RULES,
                participants: [hero],
                delta: payload,
            }).map((m) => m.event)
        ).toEqual(['battle-delta']);
    });

    it('бій очікує рішення ДМ про резерв — без turn-started', () => {
        const imp = createMockParticipant({
            basicInfo: {
                ...createMockParticipant().basicInfo,
                id: 'imp',
                side: ParticipantSide.ENEMY,
            },
            battleData: {
                ...createMockParticipant().battleData,
                reserved: true,
            },
        });

        const deadGob = {
            ...goblin,
            basicInfo: { ...goblin.basicInfo, side: ParticipantSide.ENEMY },
            combatStats: {
                ...goblin.combatStats,
                currentHp: 0,
                status: 'dead' as const,
            },
        };

        const messages = buildPusherMessages({
            before: { ...scene, turnIndex: 1 },
            after: scene,
            rules: WFRP_RULES,
            participants: [hero, deadGob],
            pending: [imp],
            delta: payload,
        });

        expect(messages.map((m) => m.event)).toEqual(['battle-delta']);
    });

    it('ДМ вирішив очікування розкриттям — гравець поточного слота отримує turn-started без зсуву ходу', () => {
        const messages = buildPusherMessages({
            before: scene,
            after: scene,
            rules: WFRP_RULES,
            participants: [hero, goblin],
            wasAwaiting: true,
            delta: payload,
        });

        expect(messages.map((m) => m.event)).toEqual([
            'battle-delta',
            'turn-started',
        ]);
        expect(messages[1]).toMatchObject({ channel: 'private-user-u-player' });
    });

    it('велика дельта — refetch', () => {
        const big = {
            ...payload,
            upserted: Array.from({ length: 60 }, () => hero),
        };

        expect(
            buildPusherMessages({
                before: scene,
                after: scene,
                rules: WFRP_RULES,
                participants: [hero],
                delta: big,
            })[0].payload
        ).toEqual({ battleId: 'b1', version: 4, refetch: true });
    });

    describe('редакція журналу', () => {
        const applied = {
            message: 'battleWfrp.log.applied',
            params: { target: 'x', condition: 'c', level: 3, source: 's' },
        };

        const action = (log: unknown[]) =>
            ({
                id: 'b1-5',
                targets: [{ participantId: 'gob', participantName: 'x' }],
                actionDetails: {},
                log,
            }) as never;

        const args = {
            before: scene,
            after: scene,
            rules: WFRP_RULES,
            participants: [hero, goblin],
        };

        it('без змін — одне публічне повідомлення без redacted', () => {
            const messages = buildPusherMessages({
                ...args,
                delta: { ...payload, log: [action(['рядок'])] },
            });

            expect(messages.map((m) => m.channel)).toEqual([
                'private-battle-b1',
            ]);
            expect(messages[0].payload).not.toHaveProperty('redacted');
        });

        it('зі змінами — публічне redacted з appliedHidden і повне dm-повідомлення', () => {
            const full = { ...payload, log: [action([applied])] };

            const messages = buildPusherMessages({ ...args, delta: full });

            expect(messages.map((m) => m.channel)).toEqual([
                'private-battle-b1',
                'private-battle-dm-b1',
            ]);
            expect(messages[0].payload).toMatchObject({
                redacted: true,
                log: [{ log: [{ message: 'battleWfrp.log.appliedHidden' }] }],
            });
            expect(messages[1].payload).toEqual(full);
        });

        it('переповнення — публічний refetch позначений redacted (ДМ не рефетчить двічі), dm-сигнал без позначки', () => {
            const big = {
                ...payload,
                log: [action([applied])],
                upserted: Array.from({ length: 60 }, (_, i) =>
                    createMockParticipant({
                        basicInfo: { ...hero.basicInfo, id: `h${i}` },
                    })
                ),
            };

            const [pub, dm] = buildPusherMessages({ ...args, delta: big });

            expect(pub.payload).toEqual({
                battleId: 'b1',
                version: 4,
                refetch: true,
                redacted: true,
            });
            expect(dm.payload).toEqual({
                battleId: 'b1',
                version: 4,
                refetch: true,
            });
        });

        it('turn-started лишається після battle-delta каналів', () => {
            const messages = buildPusherMessages({
                before: { ...scene, turnIndex: 1 },
                after: scene,
                rules: WFRP_RULES,
                participants: [hero, goblin],
                delta: { ...payload, log: [action([applied])] },
            });

            expect(messages.map((m) => m.event)).toEqual([
                'battle-delta',
                'battle-delta',
                'turn-started',
            ]);
        });
    });
});

describe('приховані miscast-стани ворога', () => {
    const hiddenEffect = {
        id: 'ef',
        name: 'wfrp:cond:fatigued',
        type: 'condition' as const,
        duration: 3,
        appliedAt: { round: 1, timestamp: new Date() },
        effects: [],
        concealed: true as const,
    };

    const cursed = {
        ...goblin,
        battleData: { ...goblin.battleData, activeEffects: [hiddenEffect] },
    };

    const delta = {
        battleId: 'b1',
        version: 4,
        scene: {
            status: 'active' as const,
            round: 1,
            turnIndex: 0,
            pendingMoraleCheck: null,
            pendingChoice: null,
        },
        upserted: [cursed],
        patched: [{ id: 'gob', battleData: { activeEffects: [hiddenEffect] } }],
        removed: [],
        log: [],
    };

    it('GET/SSR: гравець не бачить стан, ДМ бачить', () => {
        const row = (isDM: boolean) =>
            toBattleResponse(
                { meta },
                scene,
                [hero, cursed],
                [],
                { mode: 'full', entries: [] },
                { isDM }
            ).initiativeOrder[1];

        expect(row(false).battleData.activeEffects).toEqual([]);
        expect(row(true).battleData.activeEffects).toEqual([hiddenEffect]);
    });

    it('Pusher: публічна дельта без стану (upserted і patched), dm-канал повний', () => {
        const [pub, dm] = buildPusherMessages({
            before: scene,
            after: scene,
            rules: WFRP_RULES,
            participants: [hero, cursed],
            delta,
        });

        const shown = pub.payload as typeof delta & { redacted?: true };

        expect(shown.redacted).toBe(true);
        expect(shown.upserted[0].battleData.activeEffects).toEqual([]);
        expect(shown.patched[0].battleData.activeEffects).toEqual([]);
        expect(dm.channel).toContain('dm');
        expect(
            (dm.payload as typeof delta).upserted[0].battleData.activeEffects
        ).toEqual([hiddenEffect]);
    });
});

describe('P7: деталі дії у Pusher-каналах', () => {
    const attack = {
        roll: 30,
        target: 45,
        sl: 1,
        netSl: 2,
        location: 'arm',
        doubles: false,
        defender: { kind: 'parry', roll: 52, sl: -1, target: 40 },
    };

    const cast = {
        roll: 44,
        target: 40,
        sl: -1,
        cn: 3,
        channelled: 0,
        armourSl: 0,
        doubles: true,
        outcome: 'failure',
        overcastSteps: 0,
        miscast: 'minor',
    };

    const visibleFoe = {
        ...goblin,
        basicInfo: {
            ...goblin.basicInfo,
            id: 'foe',
            side: ParticipantSide.ENEMY,
        },
    };

    const entry = (actorId: string, data: object) =>
        ({
            actionIndex: 1,
            actionType: 'attack',
            actorId,
            targets: [{ participantId: 'hero', participantName: 'x' }],
            actionDetails: { system: { key: 'wfrp', data } },
            log: [],
        }) as never;

    const delta = (log: never[]) => ({
        battleId: 'b1',
        version: 4,
        scene: {
            status: 'active' as const,
            round: 1,
            turnIndex: 0,
            pendingMoraleCheck: null,
            pendingChoice: null,
        },
        upserted: [],
        removed: [],
        log,
    });

    it('публічний канал без захисника й miscast, dm-канал повний', () => {
        const [pub, dm] = buildPusherMessages({
            before: scene,
            after: scene,
            rules: WFRP_RULES,
            participants: [hero, visibleFoe],
            delta: delta([entry('foe', { attack, cast })]),
        });

        const publicJson = JSON.stringify(pub.payload);

        expect(publicJson).not.toContain('defender');
        expect(publicJson).not.toContain('minor');
        expect(JSON.stringify(dm.payload)).toContain('defender');
        expect(JSON.stringify(dm.payload)).toContain('minor');
    });
});

describe('резерв для гравця', () => {
    const reserved = {
        ...goblin,
        battleData: { ...goblin.battleData, reserved: true },
    };

    const summon = createMockParticipant({
        basicInfo: { ...goblin.basicInfo, id: 'summon' },
    });

    const log = { mode: 'append' as const, entries: [] };

    it('гравець: резервний ворог — заглушка, приклик повний', () => {
        const b = toBattleResponse(
            { meta },
            scene,
            [hero],
            [reserved, summon],
            log,
            {
                isDM: false,
            }
        );

        expect(b.pendingSummons?.[0]).toEqual({
            basicInfo: { id: 'gob', side: ParticipantSide.ENEMY },
            battleData: { reserved: true },
        });
        expect(b.pendingSummons?.[1]).toEqual(summon);
    });

    it('DM отримує повний резерв', () => {
        const b = toBattleResponse({ meta }, scene, [hero], [reserved], log, {
            isDM: true,
        });

        expect(b.pendingSummons).toEqual([reserved]);
    });

    it('PREPARED: сетап для гравця без резерву', () => {
        const prepared = { ...scene, status: 'prepared' as const };

        const setupMeta = {
            ...meta,
            setup: [
                {
                    id: 'u1',
                    type: 'unit' as const,
                    side: ParticipantSide.ENEMY,
                    quantity: 3,
                    reserved: 1,
                },
                {
                    id: 'u2',
                    type: 'unit' as const,
                    side: ParticipantSide.ENEMY,
                    quantity: 1,
                    reserved: 1,
                },
            ],
        };

        const player = toBattleResponse(
            { meta: setupMeta },
            prepared,
            [],
            [],
            log,
            { isDM: false }
        );

        expect(player.participants).toEqual([
            {
                id: 'u1',
                type: 'unit',
                side: ParticipantSide.ENEMY,
                quantity: 2,
            },
        ]);

        const dm = toBattleResponse(
            { meta: setupMeta },
            prepared,
            [],
            [],
            log,
            {
                isDM: true,
            }
        );

        expect(dm.participants).toEqual(setupMeta.setup);
    });

    const baseDelta = {
        battleId: 'b1',
        version: 4,
        upserted: [],
        log: [],
    } as unknown as ClientBattleDelta;

    it('redactDeltaForPlayers: pending із резервом -> заглушки, changed', () => {
        const out = redactDeltaForPlayers(
            { ...baseDelta, pending: [reserved] },
            [hero],
            DEFAULT_RULES
        );

        expect(out.changed).toBe(true);
        expect(out.delta.pending?.[0]).toEqual({
            basicInfo: { id: 'gob', side: ParticipantSide.ENEMY },
            battleData: { reserved: true },
        });
    });

    it('redactDeltaForPlayers: без резерву той самий об єкт', () => {
        const delta = { ...baseDelta, pending: [summon] };

        const out = redactDeltaForPlayers(delta, [hero], DEFAULT_RULES);

        expect(out.changed).toBe(false);
        expect(out.delta).toBe(delta);
    });

    it('redactDeltaForPlayers: delta.setup без резерву, changed', () => {
        const out = redactDeltaForPlayers(
            {
                ...baseDelta,
                setup: [
                    {
                        id: 'u',
                        type: 'unit',
                        side: ParticipantSide.ENEMY,
                        quantity: 3,
                        reserved: 1,
                    },
                ],
            } as ClientBattleDelta,
            [hero],
            DEFAULT_RULES
        );

        expect(out.changed).toBe(true);
        expect(out.delta.setup).toEqual([
            { id: 'u', type: 'unit', side: ParticipantSide.ENEMY, quantity: 2 },
        ]);
    });

    it('buildPusherMessages: публічний канал із заглушкою, dm-канал із повним учасником', () => {
        const delta = {
            ...baseDelta,
            pending: [reserved],
        } as ClientBattleDelta;

        const messages = buildPusherMessages({
            before: scene,
            after: scene,
            rules: DEFAULT_RULES,
            participants: [hero],
            delta,
        });

        const pub = messages[0].payload as ClientBattleDelta;

        const dm = messages[1].payload as ClientBattleDelta;

        expect(messages.map((m) => m.channel)).toEqual([
            'private-battle-b1',
            'private-battle-dm-b1',
        ]);
        expect(pub.pending?.[0]).toEqual({
            basicInfo: { id: 'gob', side: ParticipantSide.ENEMY },
            battleData: { reserved: true },
        });
        expect(dm.pending?.[0]).toBe(reserved);
    });
});
