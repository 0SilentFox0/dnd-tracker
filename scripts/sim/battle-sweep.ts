#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any -- сценарій ганяє сирі JSON-відповіді API */
/**
 * Наскрізна перевірка бою на копії прод-БД героїчної кампанії: усі герої на 9 рівні (з 9-го можна стати Експертом гілки), три ротації білдів дерев
 * (дві легальні для L9 і одна примусова — расові «Просунутий/Експерт» та ультимати), сети артефактів,
 * 5-раундові бої проти всіх юнітів через справжні мутації API (runBattleMutation), цільові сценарії
 * (рідкісні тригери), контроль юнітів і закляття 5-го рівня від імені гравця.
 * Змінює героїв і створює бої в БД — лише локальна копія (`scripts/db/prodcopy-db.sh`).
 *
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep [--template <ключ шаблону>] [--mode all|sweep|targeted|control|level5|system] [--campaign <id>] [--out <dir>] [--consistency] [--keep-battles]
 *
 * Без --template проганяє всі шаблони з реєстру (srd-5.2, grim-d100, …) окремими процесами; профіль — scripts/sim/battle-sweep/profiles.
 * Для шаблонів без героїв герої сидяться з контенту шаблону й видаляються після прогону.
 * Звіт: <out>/<шаблон>/battle-sweep.md (+ data.json, log.txt). Код виходу 1, якщо є помилки.
 * Створені бої видаляються після прогону; --keep-battles лишає їх для огляду в браузері.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertLocalProdcopy, parseTemplateKeys } from './battle-sweep/args';
import {
    modeRuns,
    moraleExpectation,
    type SweepProfile,
} from './battle-sweep/profiles';
import {
    diffRowCounts,
    overallExit,
    type SweepRunResult,
} from './battle-sweep/row-counts';
import {
    openTemplateRun,
    snapshotRowCounts,
    type TemplateRun,
} from './battle-sweep/template-campaign';
import { resultTextOf } from './log-text';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    AttackType,
    BATTLE_LOG_RECENT_EVENTS,
    EffectMarker,
    ParticipantSourceType,
} from '@/lib/constants/battle';
import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { moraleCheckSchema } from '@/lib/schemas';
import {
    abilityActionSchema,
    attackBodySchema,
    auraZoneSchema,
    bonusActionSchema,
    castSpellSchema,
    mapTerrainSchema,
    mazeActionSchema,
    mazeMarkSchema,
    moveSchema,
    patchParticipantSchema,
} from '@/lib/schemas/battles';
import { createAbilityActionMutation } from '@/lib/server/battles/mutations/ability-action/ability-action-mutation';
import { createAttackMutation } from '@/lib/server/battles/mutations/attack/attack-mutation';
import { auraZoneMutation } from '@/lib/server/battles/mutations/aura-zone/aura-zone-mutation';
import { createBonusActionMutation } from '@/lib/server/battles/mutations/bonus-action/bonus-action-mutation';
import {
    battleConditionsMutation,
    battleConditionsSchema,
} from '@/lib/server/battles/mutations/conditions/conditions-mutation';
import { mapTerrainMutation } from '@/lib/server/battles/mutations/map-terrain/map-terrain-mutation';
import { mazeMutation } from '@/lib/server/battles/mutations/maze/maze-mutation';
import { mazeMarkMutation } from '@/lib/server/battles/mutations/maze-mark/maze-mark-mutation';
import { moveMutation } from '@/lib/server/battles/mutations/move/move-mutation';
import { nextTurnMutation } from '@/lib/server/battles/mutations/next-turn/next-turn-mutation';
import { patchParticipantMutation } from '@/lib/server/battles/mutations/participants/patch-participant-mutation';
import {
    revealParticipantMutation,
    revealParticipantSchema,
} from '@/lib/server/battles/mutations/reveal-participant/reveal-participant-mutation';
import { createSpellMutation } from '@/lib/server/battles/mutations/spell/spell-mutation';
import { createStartMutation } from '@/lib/server/battles/mutations/start/start-mutation';
import {
    unitControlMutation,
    unitControlSchema,
} from '@/lib/server/battles/mutations/unit-control/unit-control-mutation';
import { mutateSystemOperation } from '@/lib/server/battles/operations';
import { runBattleMutation } from '@/lib/server/battles/run-mutation';
import { loadSpellsFromDb } from '@/lib/server/battles/spell/load-spells-db';
import { abilityLabel } from '@/lib/utils/abilities/build/resolve';
import {
    auraKey,
    collectModifiers,
    statWithModifiers,
} from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    pendingAreaAuras,
    zoneCandidates,
    zoneMembers,
} from '@/lib/utils/abilities/engine/effects/area-aura';
import { isAreaTarget } from '@/lib/utils/abilities/schema/kinds';
import { applyBattleDelta } from '@/lib/utils/battle/client/apply-delta';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { attackDamageParts } from '@/lib/utils/battle/damage/attack-parts';
import {
    cellDistance,
    cellKey,
    inBounds,
    mapCentre,
    neighbors,
    parseCellKey,
} from '@/lib/utils/battle/grid/geometry';
import { cellsOf } from '@/lib/utils/battle/grid/occupancy';
import {
    allReachExit,
    canStep,
    featureKeys,
    isMazeHero,
    mazeBudgetLeft,
    mazeDistances,
    type MazeGrid,
    mazeGridOf,
    mazeReachable,
    mazeVision,
    onMazeField,
    seesParticipant,
    viewpointOf,
    wallSet,
} from '@/lib/utils/battle/modes/maze';
import {
    emptyMaze,
    MAZE_SCATTER_MIN_GAP,
    MAZE_STEPS_PER_TURN,
} from '@/lib/utils/battle/modes/maze/constants';
import { MAZE_TEXTS } from '@/lib/utils/battle/modes/maze/texts';
import { awaitsMoraleCheck } from '@/lib/utils/battle/morale/awaits-check';
import { casterSpellDice } from '@/lib/utils/battle/spell/caster-dice';
import { spellTargetingFor } from '@/lib/utils/battle/spell/spell-targeting';
import {
    loadBattle,
    loadRecentEvents,
    saveBattle,
} from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { checkVictoryConditions } from '@/lib/utils/battle/turn/victory';
import { rollDiceList } from '@/lib/utils/common/dice';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemByKey } from '@/lib/utils/rules/systems';
import {
    branchLevelNodeId,
    canLearn,
    normalizeTree,
    racialNodeId,
    writeUnlocked,
} from '@/lib/utils/skills/progression';
import { spellEffects } from '@/lib/utils/spells/model/read';
import { fullSpellSlots } from '@/lib/utils/spells/spell-slots';

try {
    assertLocalProdcopy(process.env.DATABASE_URL);
} catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
}

const argv = process.argv.slice(2);

const arg = (name: string) => {
    const i = argv.indexOf(`--${name}`);

    return i >= 0 ? argv[i + 1] : undefined;
};

const MODE = arg('mode') ?? 'all';

const CAMPAIGN = arg('campaign');

const OUT = arg('out') ?? join(tmpdir(), 'battle-sweep');

const CONSISTENCY = argv.includes('--consistency');

const KEEP_BATTLES = argv.includes('--keep-battles');

const WORKER = argv.includes('--worker');

let PROFILE!: SweepProfile;

let templateRun: TemplateRun | null = null;

const ROUNDS = 5;

const HERO_LEVEL = 9;

function mulberry32(a: number) {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;

        let t = Math.imul(a ^ (a >>> 15), 1 | a);

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rng = mulberry32(7);

const pick = <T>(xs: T[]) => xs[Math.floor(rng() * xs.length)];

const createdBattles: string[] = [];

async function createTestBattle(
    args: Parameters<typeof prisma.battleScene.create>[0]
) {
    const b = await prisma.battleScene.create(args);

    createdBattles.push(b.id);

    return b;
}

async function removeTestBattles() {
    if (KEEP_BATTLES || !createdBattles.length) return;

    await prisma.battleScene.deleteMany({
        where: { id: { in: createdBattles } },
    });
}

let actingUser = '';

let dmId = '';

const ctx = { campaignId: '', battleId: '' };

let state: any;

let battleLabel = '';

/** Тільки в цільових пробах: кожен шансовий тригер проходить (rng()·100 < chance завжди) */
let forceChance = false;

const deps: any = {
    getUserId: async () => actingUser,
    rateLimit: async () => ({
        allowed: true,
        count: 0,
        limit: 1e6,
        resetInSeconds: 0,
    }),
    loadBattle: (a: any) => loadBattle(prisma, a),
    saveBattle: (b: any, o: any, w?: any) => saveBattle(prisma, b, o, w),
    loadRecentEvents: (id: string, l: number) =>
        loadRecentEvents(prisma, id, l),
    publish: () => {},
    rng: () => (forceChance ? 0 : rng()),
    logLocale: async () => 'uk',
};

// ---------- журнали ----------
const issues: Array<{ level: 'error' | 'warn'; where: string; text: string }> =
    [];

const issue = (level: 'error' | 'warn', text: string) =>
    issues.push({
        level,
        where: `${battleLabel} р${state?.currentRound ?? '?'}`,
        text,
    });

const fullLog: string[] = [];

const rejections = new Map<string, number>();

type Cov = {
    source: string;
    owner: string;
    name: string;
    event: string;
    effects: string;
    battles: number;
    fired: number;
    passiveOk: number;
    passiveMiss: number;
    owners: Set<string>;
    note: boolean;
    conditional: boolean;
    baked: number;
    missDetail: string;
    probed: number;
    unmet: number;
    area: boolean;
};

const coverage = new Map<string, Cov>();

const spellStats = new Map<
    string,
    {
        school: string;
        level: number;
        casts: number;
        ok: number;
        noEffect: number;
        failed: number;
        blocked: number;
        rejected: string[];
        samples: string[];
        kinds: string;
    }
>();

const treeChecks: string[] = [];

async function readState() {
    const res = await runBattleMutation(
        new Request('http://localhost/battle'),
        {
            params: { id: ctx.campaignId, battleId: ctx.battleId },
            access: 'member',
            dryRun: () => true,
            includeRecentEvents: BATTLE_LOG_RECENT_EVENTS,
            mutate: (c: any) => ({
                participants: c.participants,
                pending: c.pending,
                events: [],
            }),
        } as any,
        deps
    );

    return res.json();
}

const P = () => state.initiativeOrder as any[];

const byId = (id: string) => P().find((p) => p.basicInfo.id === id);

const current = () => P()[state.currentTurnIndex];

const alive = (p: any) =>
    p.combatStats.status === 'active' && p.combatStats.currentHp > 0;

const foesOf = (p: any) =>
    P().filter((x) => x.basicInfo.side !== p.basicInfo.side && alive(x));

const friendsOf = (p: any) =>
    P().filter((x) => x.basicInfo.side === p.basicInfo.side && alive(x));

function invariants(label: string) {
    for (const p of P()) {
        const hp = p.combatStats.currentHp,
            max = p.combatStats.maxHp;

        if (!Number.isFinite(hp) || !Number.isFinite(max))
            issue(
                'error',
                `${label}: ${p.basicInfo.name} HP не число (${hp}/${max})`
            );
        else if (hp < 0)
            issue('error', `${label}: ${p.basicInfo.name} HP < 0 (${hp})`);
        else if (hp > max + (p.combatStats.tempHp ?? 0) + 0)
            issue(
                'warn',
                `${label}: ${p.basicInfo.name} HP ${hp} > max ${max}`
            );

        if (hp <= 0 && p.combatStats.status === 'active')
            issue(
                'error',
                `${label}: ${p.basicInfo.name} має 0 HP, але статус active`
            );
    }
}

const moraleStats = {
    checks: 0,
    d10Events: 0,
    moraleFirstRejects: 0,
    awaited: 0,
};

const MORALE_GATED = new Set([
    'move',
    'attack',
    'spell',
    'aura-zone',
    'ability',
    'ability-action',
    'maze-mark',
]);

const awaitsMorale = (id: string) => {
    const awaits = awaitsMoraleCheck(
        {
            participants: P(),
            scene: {
                turnIndex: state.currentTurnIndex,
                pendingMoraleCheck: state.pendingMoraleCheck,
            },
        },
        id
    );

    if (awaits) moraleStats.awaited++;

    return awaits;
};

async function call(
    label: string,
    options: any,
    body: any = {},
    as?: string
): Promise<any> {
    const actorId = body.participantId ?? body.attackerId ?? body.casterId;

    if (
        MORALE_GATED.has(label) &&
        !body.free &&
        actorId &&
        state &&
        awaitsMorale(actorId)
    )
        await call('morale-check', MORALE, {
            participantId: actorId,
            d10Roll: 1 + Math.floor(rng() * 10),
        });

    actingUser = as ?? dmId;

    const req = new Request(
        `http://localhost/api/campaigns/${ctx.campaignId}/battles/${ctx.battleId}/${label}`,
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    let res: Response;

    try {
        res = await runBattleMutation(
            req,
            {
                ...options,
                params: { id: ctx.campaignId, battleId: ctx.battleId },
            },
            deps
        );
    } catch (e: any) {
        issue('error', `${label}: виняток ${e?.message}`);

        return { status: 599, body: {} as any, log: [] as any[] };
    }

    const json: any = await res.json();

    const curBefore =
        state?.initiativeOrder?.[state.currentTurnIndex]?.basicInfo.id;

    const orderBefore = state?.initiativeOrder?.map(
        (p: any) => p.basicInfo.name
    );

    let newLog: any[] = [];

    if (res.status === 200 && 'delta' in json) {
        const applied = applyBattleDelta(state, json.delta);

        state = applied === 'refetch' ? await readState() : applied;
        newLog = json.delta.log ?? [];

        if (process.env.DELTA_DUMP)
            appendFileSync(
                process.env.DELTA_DUMP,
                `${JSON.stringify({ label, delta: json.delta })}\n`
            );

        if (CONSISTENCY) {
            const full: any = await readState();

            const a = state.initiativeOrder
                    .map((p: any) => p.basicInfo.id)
                    .join(','),
                b = full.initiativeOrder
                    .map((p: any) => p.basicInfo.id)
                    .join(',');

            const ca =
                    state.initiativeOrder[state.currentTurnIndex]?.basicInfo
                        .name,
                cb =
                    full.initiativeOrder[full.currentTurnIndex]?.basicInfo.name;

            if (
                a !== b ||
                ca !== cb ||
                state.currentRound !== full.currentRound
            )
                issue(
                    'error',
                    `DELTA≠GET після ${label}: поточний ${ca} vs ${cb}; порядок ${a === b ? 'збігається' : 'різний'}; раунд ${state.currentRound}/${full.currentRound}; delta.scene=${JSON.stringify(json.delta.scene ?? json.delta.battle ?? Object.keys(json.delta)).slice(0, 300)}`
                );

            const fa = JSON.stringify(
                    state.initiativeOrder.map((p: any) => [
                        p.basicInfo.id,
                        p.actionFlags,
                        p.combatStats.currentHp,
                    ])
                ),
                fb = JSON.stringify(
                    full.initiativeOrder.map((p: any) => [
                        p.basicInfo.id,
                        p.actionFlags,
                        p.combatStats.currentHp,
                    ])
                );

            if (fa !== fb && a === b)
                issue('error', `DELTA≠GET (флаги/HP) після ${label}`);

            state = full;
        }
    } else if (res.status === 200) {
        state = await readState();
    } else {
        const key =
            `${label} ${res.status} ${json.code ?? ''} ${json.error ?? ''}`.slice(
                0,
                160
            );

        rejections.set(key, (rejections.get(key) ?? 0) + 1);

        if (JSON.stringify(json).includes(REJECT.moraleFirst))
            moraleStats.moraleFirstRejects++;

        if (res.status >= 500)
            issue(
                'error',
                `${label}: ${res.status} ${JSON.stringify(json).slice(0, 300)}`
            );
    }

    if (label === 'morale-check' && res.status === 200) moraleStats.checks++;

    for (const e of newLog) {
        if (typeof e.actionDetails?.d10Roll === 'number')
            moraleStats.d10Events++;

        const t = `[${battleLabel} р${e.round}] ${resultTextOf(e)}`;

        fullLog.push(t);

        if (/NaN|undefined|\[object|null\b/.test(resultTextOf(e) ?? ''))
            issue('error', `підозрілий текст логу: ${resultTextOf(e)}`);

        const rolled =
            (e.actionType === 'attack' &&
                !/ціль загинула до атаки/.test(resultTextOf(e) ?? '') &&
                !(resultTextOf(e) ?? '').startsWith('🤬 Шал')) ||
            (e.actionType === 'spell' &&
                (e.actionDetails?.damageBreakdown?.includes('сума кубиків') ||
                    e.actionDetails?.savingThrows?.some(
                        (s: { autoFail?: boolean }) => !s.autoFail
                    )));

        const dice = e.actionDetails?.diceRolls as
            | Array<{ dice: Array<{ sides: number; value: number }> }>
            | undefined;

        if (
            rolled &&
            !e.isCancelled &&
            !dice?.length &&
            !(PROFILE.judge === 'server' && e.actionDetails?.system)
        )
            issue('error', `немає diceRolls: ${resultTextOf(e)}`);

        for (const die of dice?.flatMap((g) => g.dice) ?? [])
            if (
                ![
                    4,
                    6,
                    8,
                    10,
                    12,
                    20,
                    ...(PROFILE.judge === 'server' ? [100] : []),
                ].includes(die.sides) ||
                die.value < 1 ||
                die.value > die.sides
            )
                issue(
                    'error',
                    `кубик поза межами: d${die.sides}=${die.value} у «${resultTextOf(e)}»`
                );
    }

    if (res.status === 200) invariants(label);

    if (
        res.status === 200 &&
        !['next-turn', 'start', 'attack'].includes(label) &&
        !(
            label === 'move' &&
            newLog.some((e: any) => /вибрався/.test(resultTextOf(e) ?? ''))
        ) &&
        state.status === 'active'
    ) {
        const curAfter =
            state.initiativeOrder[state.currentTurnIndex]?.basicInfo.id;

        if (curBefore && curAfter !== curBefore)
            issue(
                'error',
                `TURN: після ${label} змінився поточний учасник ${byId(curBefore)?.basicInfo.name ?? curBefore} → ${byId(curAfter)?.basicInfo.name}; порядок до=${orderBefore?.join(',')}; після=${state.initiativeOrder.map((p: any) => p.basicInfo.name).join(',')}; log=${JSON.stringify(newLog.map((e: any) => resultTextOf(e))).slice(0, 300)}`
            );
    }

    return { status: res.status, body: json, log: newLog };
}

const summonDeps = {
    loadPool: async (campaignId: string) => ({
        units: await prisma.unit.findMany({ where: { campaignId } }),
        races: await prisma.race.findMany({ where: { campaignId } }),
    }),
};

const START = {
    access: 'dm',
    requireStatus: 'prepared',
    mutate: createStartMutation(),
};

const NEXT = {
    access: 'currentController',
    requireStatus: 'active',
    mutate: nextTurnMutation,
};

const ATTACK = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: attackBodySchema,
    mutate: createAttackMutation({
        ...summonDeps,
        loadSpells: loadSpellsFromDb,
    }),
};

const BONUS = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: bonusActionSchema,
    mutate: createBonusActionMutation(summonDeps),
};

const ABILITY = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: abilityActionSchema,
    mutate: createAbilityActionMutation(summonDeps),
};

const SPELL = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: castSpellSchema,
    dryRun: (b: any) => b.preview === true,
    mutate: createSpellMutation({
        loadSpell: (id: string) => prisma.spell.findUnique({ where: { id } }),
        ...summonDeps,
    } as any),
};

const UNIT_CONTROL = {
    access: 'dm',
    requireStatus: 'active',
    schema: unitControlSchema,
    mutate: unitControlMutation,
};

const COND = {
    access: 'dm',
    requireStatus: 'active',
    schema: battleConditionsSchema,
    mutate: battleConditionsMutation,
};

const AURA_ZONE = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: auraZoneSchema,
    mutate: auraZoneMutation,
};

const MORALE = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: moraleCheckSchema,
    respond: 'wrapped',
    mutate: mutateSystemOperation('morale-check', 'morale disabled'),
};

const PATCH = (id: string) => ({
    access: 'dm',
    requireStatus: 'active',
    schema: patchParticipantSchema,
    mutate: (c: any, b: any) => patchParticipantMutation(c, id, b),
});

const REVEAL = {
    access: 'dm',
    requireStatus: 'active',
    allowWhileAwaitingDm: true,
    schema: revealParticipantSchema,
    mutate: revealParticipantMutation,
};

const MOVE = {
    access: 'member',
    requireStatus: 'active',
    respond: 'wrapped',
    schema: moveSchema,
    mutate: moveMutation,
};

const MAP_TERRAIN = {
    access: 'dm',
    requireStatus: 'active',
    schema: mapTerrainSchema,
    mutate: mapTerrainMutation,
};

const MAZE = {
    access: 'dm',
    requireStatus: 'active',
    schema: mazeActionSchema,
    mutate: mazeMutation,
};

const MAZE_MARK = {
    access: 'member',
    requireStatus: 'active',
    blockedByMode: true,
    schema: mazeMarkSchema,
    mutate: mazeMarkMutation,
};

const KILL = (id: string) => ({ ...PATCH(id), allowWhileAwaitingDm: true });

// ---------- підготовка ----------
const HEROES = [
    'Лорд Годрик Єдиноріг',
    'Ізабель Грейхаунд',
    'Зехір',
    'Аграїл',
    'Айвен',
    'Маркел',
    'Раїлаг',
    'Семгрун',
];

const PERSONAL: Record<string, string> = {
    'Лорд Годрик Єдиноріг': 'Годрик:',
    'Ізабель Грейхаунд': 'Ізабель:',
    Зехір: 'Зехір:',
    Аграїл: 'Аграїл:',
    Айвен: 'Айвен:',
    Маркел: 'Маркел:',
    Раїлаг: 'Раїлаг:',
    Семгрун: 'Семгрун:',
};

const SETS: Record<string, string> = {
    'Лорд Годрик Єдиноріг': 'Регалії світанку',
    Айвен: 'Мрія лучника',
    Семгрун: 'Обладунки гномських королів',
    Зехір: 'Регалії Сар-Ісси',
    Раїлаг: 'Кігті Ігг-Шайла',
    Аграїл: 'Дух лева',
};

type Build = { branch: string; kind: 'A' | 'B' | 'F' };

const ROTATIONS: Record<string, Build>[] = [
    {
        'Лорд Годрик Єдиноріг': { branch: 'Світло', kind: 'A' },
        'Ізабель Грейхаунд': { branch: 'Лідерство', kind: 'A' },
        Зехір: { branch: 'Хаос', kind: 'A' },
        Аграїл: { branch: 'Напад', kind: 'A' },
        Айвен: { branch: 'Природа', kind: 'A' },
        Маркел: { branch: 'Темрява', kind: 'A' },
        Раїлаг: { branch: 'Стрільба', kind: 'A' },
        Семгрун: { branch: 'Захист', kind: 'A' },
    },
    {
        'Лорд Годрик Єдиноріг': { branch: 'Лідерство', kind: 'B' },
        'Ізабель Грейхаунд': { branch: 'Світло', kind: 'B' },
        Зехір: { branch: 'Природа', kind: 'B' },
        Аграїл: { branch: 'Темрява', kind: 'B' },
        Айвен: { branch: 'Стрільба', kind: 'B' },
        Маркел: { branch: 'Захист', kind: 'B' },
        Раїлаг: { branch: 'Хаос', kind: 'B' },
        Семгрун: { branch: 'Напад', kind: 'B' },
    },
    {
        'Лорд Годрик Єдиноріг': { branch: 'Напад', kind: 'F' },
        'Ізабель Грейхаунд': { branch: 'Захист', kind: 'F' },
        Зехір: { branch: 'Темрява', kind: 'F' },
        Аграїл: { branch: 'Хаос', kind: 'F' },
        Айвен: { branch: 'Лідерство', kind: 'F' },
        Маркел: { branch: 'Стрільба', kind: 'F' },
        Раїлаг: { branch: 'Темрява', kind: 'F' },
        Семгрун: { branch: 'Світло', kind: 'F' },
    },
];

const trees: Record<string, any> = {};

let heroRows: any[] = [];

const hero = (name: string) => heroRows.find((h) => h.name === name) ?? {};

let campaign: any;

function buildNodes(
    tree: any,
    branchName: string,
    kind: Build['kind']
): { order: string[]; forced: boolean } {
    const br = tree.branches.find((b: any) => b.name === branchName);

    if (!br) throw new Error(`${tree.race}: немає гілки ${branchName}`);

    const g = tree.grid.get(br.id);

    const lvl = (l: string) => branchLevelNodeId(br.id, l as any);

    if (kind === 'A')
        return {
            order: [
                lvl('basic'),
                g.outer[0],
                lvl('advanced'),
                g.outer[1],
                lvl('expert'),
                g.middle[0],
                g.inner[0],
            ],
            forced: false,
        };

    if (kind === 'B') {
        const other =
            tree.branches.find((b: any) => b.id !== br.id && b.spellGroupId) ??
            tree.branches.find((b: any) => b.id !== br.id);

        return {
            order: [
                lvl('basic'),
                g.outer[2],
                lvl('advanced'),
                lvl('expert'),
                g.middle[1],
                racialNodeId('basic'),
                branchLevelNodeId(other.id, 'basic'),
            ],
            forced: false,
        };
    }

    return {
        order: [
            lvl('basic'),
            g.outer[0],
            lvl('advanced'),
            lvl('expert'),
            g.middle[0],
            g.inner[0],
            racialNodeId('basic'),
            racialNodeId('advanced'),
            racialNodeId('expert'),
            [...tree.nodes.values()].find((n: any) => n.kind === 'ultimate')
                ?.nodeId,
        ].filter(Boolean),
        forced: true,
    };
}

function learnLegally(tree: any, order: string[], level: number, who: string) {
    const learned: string[] = [];

    for (const id of order) {
        const r = canLearn(tree, learned, level, id);

        if (!r.ok) {
            issue(
                'error',
                `${who}: не вдалося вивчити ${id} легально (${(r as any).reason})`
            );
            continue;
        }

        learned.push(id);
    }

    return learned;
}

async function prepareTemplate() {
    templateRun = await openTemplateRun(PROFILE, CAMPAIGN);
    campaign = templateRun.campaign;
    ctx.campaignId = campaign.id;
    dmId = campaign.dmUserId;
    heroRows = await prisma.character.findMany({
        where: { id: { in: templateRun.heroIds } },
    });
}

async function prepare() {
    if (PROFILE.source.kind === 'template') return prepareTemplate();

    campaign = await prisma.campaign.findFirstOrThrow({
        where: CAMPAIGN
            ? { id: CAMPAIGN }
            : { name: PROFILE.source.name, kind: 'campaign' },
    });
    ctx.campaignId = campaign.id;
    dmId = campaign.dmUserId;
    for (const row of await prisma.skillTree.findMany({
        where: { campaignId: campaign.id },
    }))
        trees[row.race] = normalizeTree(row);

    // статична перевірка: кожне дерево можна вивчити повністю (без обмеження очок) у правильному порядку
    for (const t of Object.values(trees)) {
        const learned: string[] = [];

        let progress = true;

        while (progress) {
            progress = false;
            for (const id of t.nodes.keys())
                if (!learned.includes(id) && canLearn(t, learned, 99, id).ok) {
                    learned.push(id);
                    progress = true;
                }
        }

        const missing = [...t.nodes.keys()].filter(
            (id) => !learned.includes(id)
        );

        const noSkill = [...t.nodes.values()].filter(
            (n: any) =>
                n.kind !== 'branchLevel' && n.kind !== 'racial' && !n.skillId
        ).length;

        treeChecks.push(
            `${t.race}: вузлів ${t.nodes.size}, вивчається повністю: ${missing.length === 0 ? 'так' : `ні (${missing.join(', ')})`}${noSkill ? `, порожніх слотів ${noSkill}` : ''}`
        );

        if (missing.length)
            issue(
                'error',
                `Дерево ${t.race}: недосяжні вузли ${missing.join(', ')}`
            );
    }

    const skills = await prisma.skill.findMany({
        where: { campaignId: campaign.id },
    });

    const races = await prisma.race.findMany({
        where: { campaignId: campaign.id },
    });

    heroRows = [];
    for (const name of HEROES) {
        const h = await prisma.character.findFirstOrThrow({
            where: { campaignId: campaign.id, name },
        });

        const race = races.find((r) => r.name === h.race);

        const personal = skills.find((s) => s.name.startsWith(PERSONAL[name]));

        if (!personal)
            issue(
                'warn',
                `${name}: персональне вміння «${PERSONAL[name]}…» не знайдено`
            );

        const slots = fullSpellSlots(
            HERO_LEVEL,
            (race?.spellSlotProgression as any) ?? [],
            campaign.maxLevel ?? 20
        );

        const setName = SETS[name];

        const equipped: Record<string, string> = {};

        if (setName) {
            const set = await prisma.artifactSet.findFirstOrThrow({
                where: { campaignId: campaign.id, name: setName },
            });

            for (const a of await prisma.artifact.findMany({
                where: { setId: set.id },
            }))
                equipped[a.slot === 'ring' ? 'ring1' : a.slot] = a.id;
        }

        await prisma.character.update({
            where: { id: h.id },
            data: {
                level: HERO_LEVEL,
                spellSlots: slots as any,
                personalSkillId: personal?.id ?? h.personalSkillId,
            },
        });
        await prisma.characterInventory.upsert({
            where: { characterId: h.id },
            update: { equipped },
            create: { characterId: h.id, equipped },
        });
        heroRows.push({ ...h, slots });
    }
}

async function applyRotation(r: number) {
    const rot = ROTATIONS[r];

    const lines: string[] = [];

    for (const h of heroRows) {
        const tree = trees[h.race];

        const b = rot[h.name];

        const { order, forced } = buildNodes(tree, b.branch, b.kind);

        const unlocked = forced
            ? order
            : learnLegally(tree, order, HERO_LEVEL, h.name);

        await prisma.character.update({
            where: { id: h.id },
            data: {
                skillTreeProgress: writeUnlocked(tree, {}, unlocked) as any,
            },
        });
        lines.push(
            `${h.name} (${h.race}): ${b.branch} ${b.kind === 'F' ? '+ раса просунутий/експерт + ультимат (ПРИМУСОВО, поза правилами рівня)' : b.kind} — ${unlocked.length} вузлів`
        );
    }

    return lines;
}

// ---------- покриття ----------
function recordCoverage(probe = false) {
    for (const p of P()) {
        for (const a of p.battleData.resolvedAbilities ?? []) {
            const c = covEntry(p, a);

            const used = p.battleData.abilityUsage?.[a.key]?.battle ?? 0;

            c.battles++;
            c.fired += used;

            if (probe) c.probed += used;
        }
    }
}

/** Запис покриття для вміння учасника; спільний для recordCoverage / recordPassives / доказів аур. */
function covEntry(p: any, a: any): any {
    const owner =
        p.basicInfo.sourceType === ParticipantSourceType.UNIT
            ? p.basicInfo.name.replace(/ #\d+$/, '')
            : p.basicInfo.name;

    const key = `${a.source.type}|${a.source.name}|${a.name}|${a.trigger.event}`;

    const c = coverage.get(key) ?? {
        source: a.source.type,
        owner: a.source.name,
        name: a.name,
        event: a.trigger.event,
        effects: a.effects.map((e: any) => e.kind).join('+'),
        battles: 0,
        fired: 0,
        passiveOk: 0,
        passiveMiss: 0,
        owners: new Set(),
        note: a.effects.every((e: any) => e.kind === 'note'),
        conditional: !!a.condition,
        baked: 0,
        missDetail: '',
        probed: 0,
        unmet: 0,
        area: a.effects.some(isAreaEffect),
    };

    c.owners.add(owner);
    coverage.set(key, c);

    return c;
}

const isAreaEffect = (e: any) => isAreaTarget(e.target);

function recordPassives() {
    for (const p of P()) {
        for (const a of p.battleData.resolvedAbilities ?? []) {
            if (
                a.trigger.event !== 'passive' ||
                a.effects.every((e: any) => e.kind === 'note')
            )
                continue;

            const c = covEntry(p, a);

            if (c.area) continue;

            const r = passiveApplies(p, a);

            if (r === true) c.passiveOk++;
            else if (r === 'baked') c.baked++;
            else if (a.condition) c.unmet++;
            else {
                c.passiveMiss++;
                c.missDetail = r;
            }
        }
    }
}

/** Аура «поруч» діє не через passive-запис, а зоною: після aura-zone ціль має отримати запис у collectModifiers від ефекту зони (однакові аури з одним id діляться ключем — підпис може бути іншого власника). */
function proveAreaAura(owner: any, aura: any, targetIds: string[]) {
    const c = covEntry(owner, aura.ability);

    const key = auraKey(aura.ability);

    const names = new Set<string>(
        P().flatMap((p) =>
            (p.battleData.resolvedAbilities ?? [])
                .filter((a: any) => auraKey(a) === key)
                .map((a: any) => a.name as string)
        )
    );

    const fromAura = (en: any) =>
        [...names].some((n) =>
            (typeof en.label === 'string'
                ? en.label
                : JSON.stringify(en.label ?? '')
            ).includes(n)
        );

    // perMark-ефект діє лише по відміченій цілі, тож collectModifiers без позначки його не дає: доказ — сам ефект зони на цілі
    const inZone = (id: string) =>
        (byId(id)?.battleData.activeEffects ?? []).some(
            (x: any) =>
                x.zone?.ownerId === owner.basicInfo.id && names.has(x.name)
        );

    const proven = aura.effects.every((e: any) =>
        targetIds.some((id) =>
            e.perMark
                ? inZone(id)
                : collectModifiers(P(), id, queryOf(e) as any).entries.some(
                      fromAura
                  )
        )
    );

    if (proven) c.passiveOk++;
    else {
        c.passiveMiss++;
        c.missDetail = `зона задана (${targetIds.length} цілей), запису в collectModifiers немає`;
    }
}

function queryOf(e: any) {
    if (e.kind === 'modifyStat') return { stat: e.stat };

    if (e.kind === 'damageBonus')
        return {
            damage: {
                kind:
                    e.filter?.kind === 'all' || e.filter?.kind === 'physical'
                        ? 'melee'
                        : (e.filter?.kind ?? 'melee'),
                school: e.filter?.school ?? null,
            },
        };

    if (e.kind === 'flag') return { flag: e.flag };

    return null;
}

const BAKED = new Set([
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
    'maxHp',
    'initiative',
    'spellSlots',
    'speed',
]);

const TARGET_STATS = new Set(['morale', 'minTargets', 'maxTargets']);

/** Сума запечених плоских бонусів стату для учасника: власні + аури allAllies/allEnemies (однакова аура — раз, найсильніша), як у bakePassives/applyBakedAuras. */
function expectedBakedFlat(x: any, stat: string): number {
    let sum = 0;

    const auras = new Map<string, number>();

    for (const src of P()) {
        for (const ab of src.battleData.resolvedAbilities ?? []) {
            if (ab.trigger.event !== 'passive' || ab.condition) continue;

            for (const e of ab.effects) {
                if (
                    e.kind !== 'modifyStat' ||
                    e.stat !== stat ||
                    typeof e.flat !== 'number'
                )
                    continue;

                const t = e.target ?? 'self';

                if (t === 'self' && src === x) sum += e.flat;
                else if (
                    (t === 'allAllies' &&
                        src.basicInfo.side === x.basicInfo.side) ||
                    (t === 'allEnemies' &&
                        src.basicInfo.side !== x.basicInfo.side)
                ) {
                    const k = auraKey(ab);

                    const prev = auras.get(k);

                    if (prev === undefined || Math.abs(e.flat) > Math.abs(prev))
                        auras.set(k, e.flat);
                }
            }
        }
    }

    return sum + [...auras.values()].reduce((n, v) => n + v, 0);
}

function passiveApplies(p: any, a: any): true | 'baked' | string {
    if (
        a.effects.every(
            (e: any) =>
                e.kind === 'modifyStat' &&
                TARGET_STATS.has(e.stat) &&
                ['self', 'allAllies', 'allEnemies', undefined].includes(
                    e.target
                )
        )
    ) {
        for (const e of a.effects) {
            const t = e.target ?? 'self';

            const subject =
                t === 'self'
                    ? p
                    : P().find(
                          (x) =>
                              alive(x) &&
                              heroRows.some(
                                  (h) => h.id === x.basicInfo.sourceId
                              ) &&
                              (t === 'allAllies') ===
                                  (x.basicInfo.side === p.basicInfo.side)
                      );

            const hero =
                subject &&
                heroRows.find((h) => h.id === subject.basicInfo.sourceId);

            if (!subject || !hero) return 'baked';

            const cap = subject.abilities.moraleCap ?? 3;

            const raw =
                (hero[e.stat] ?? (e.stat === 'morale' ? 0 : 1)) +
                expectedBakedFlat(subject, e.stat);

            const expected =
                e.stat === 'morale' ? Math.max(-cap, Math.min(cap, raw)) : raw;

            if (subject.combatStats[e.stat] !== expected)
                return `${e.stat}: ${subject.combatStats[e.stat]} ≠ очікувано ${expected} (${subject.basicInfo.name}, база ${hero[e.stat] ?? '?'})`;
        }

        return true;
    }

    if (
        a.effects.every(
            (e: any) =>
                e.kind === 'modifyStat' &&
                BAKED.has(e.stat) &&
                (!e.target || e.target === 'self')
        )
    ) {
        const ab = [
            'strength',
            'dexterity',
            'constitution',
            'intelligence',
            'wisdom',
            'charisma',
        ];

        const hero = heroRows.find(
            (h) => p.basicInfo.sourceId === h.id || p.basicInfo.name === h.name
        );

        if (!hero) return 'baked';

        for (const e of a.effects) {
            if (ab.includes(e.stat)) {
                const expected =
                    hero[e.stat] +
                    (p.battleData.resolvedAbilities ?? [])
                        .filter((x: any) => x.trigger.event === 'passive')
                        .flatMap((x: any) => x.effects)
                        .filter(
                            (x: any) =>
                                x.kind === 'modifyStat' &&
                                x.stat === e.stat &&
                                (!x.target || x.target === 'self') &&
                                typeof x.flat === 'number'
                        )
                        .reduce((n: number, x: any) => n + x.flat, 0);

                if (p.abilities[e.stat] !== expected)
                    return `${e.stat}: ${p.abilities[e.stat]} ≠ очікувано ${expected} (база ${hero[e.stat]})`;
            } else if (e.stat === 'initiative' && e.flat >= 100) {
                if ((p.abilities.initiative ?? 0) < e.flat)
                    return `initiative ${p.abilities.initiative} < ${e.flat}`;
            } else if (e.stat === 'spellSlots') {
                for (const lvl of e.spellLevels ?? [])
                    if (
                        (p.spellcasting.spellSlots?.[String(lvl)]?.max ?? 0) -
                            (hero.slots?.[String(lvl)]?.max ?? 0) <
                        e.flat
                    )
                        return `слоти ${lvl}-го: ${p.spellcasting.spellSlots?.[String(lvl)]?.max ?? 0} (база ${hero.slots?.[String(lvl)]?.max ?? 0})`;
            } else return 'baked';
        }

        return true;
    }

    if (a.effects.some((e: any) => e.perMark)) return 'baked';

    return passiveViaModifiers(p, a) ? true : 'немає запису в collectModifiers';
}

function passiveViaModifiers(p: any, a: any): boolean {
    const ps = P();

    for (const e of a.effects) {
        const q: any = queryOf(e);

        if (!q) return true;

        const subjects =
            !e.target || e.target === 'self'
                ? [p]
                : ps.filter(
                      (x) =>
                          x.basicInfo.side === p.basicInfo.side ||
                          /enem/i.test(e.target)
                  );

        for (const s of subjects) {
            const r = collectModifiers(ps, s.basicInfo.id, q);

            if (
                r.entries.some((en: any) => {
                    const label =
                        typeof en.label === 'string'
                            ? en.label
                            : JSON.stringify(en.label ?? '');

                    if (
                        JSON.stringify(en.label) ===
                        JSON.stringify(abilityLabel(a))
                    )
                        return true;

                    return (
                        label === a.name ||
                        label === a.source.name ||
                        label.includes(a.name) ||
                        label.includes(a.source.name)
                    );
                })
            )
                return true;
        }
    }

    return false;
}

// ---------- дії ----------
/** Ключі рядків логу «ціль імунна / не діє на героїв» — каст без змін через них не помилка */
const IMMUNITY_LINE =
    /abilityText\.log\.(?:immune|immuneTo|notOnHeroes)\b|battleActions\.[\w.]*[iI]mmune\b|battleLog\.[\w.]*immunityNote\b/;

const brokenSpells = new Set<string>();

const triedSpells = new Map<string, number>();

const triedAbilities = new Map<string, number>();

async function adaptiveAbility(
    label: 'bonus-action' | 'ability-action',
    actor: any,
    a: any
) {
    const opts = label === 'bonus-action' ? BONUS : ABILITY;

    const dead = P().filter((x) => !alive(x));

    const tries: string[][] = [
        [],
        foesOf(actor)
            .slice(0, 1)
            .map((x) => x.basicInfo.id),
        friendsOf(actor)
            .filter((x) => x !== actor)
            .slice(0, 1)
            .map((x) => x.basicInfo.id),
        [actor.basicInfo.id],
        dead.slice(0, 1).map((x) => x.basicInfo.id),
    ];

    for (const t of tries) {
        const r = await call(label, opts, {
            participantId: actor.basicInfo.id,
            abilityKey: a.key,
            targetParticipantIds: t,
        });

        if (r.status === 200) return r;

        if (r.body?.code !== 'invalid_target') return r;
    }

    return null;
}

function spellTargets(actor: any, spell: any): string[] | 'needDead' {
    const t = spell.targeting ?? {};

    const foes = foesOf(actor),
        friends = friendsOf(actor);

    switch (t.kind) {
        case 'enemy':
            return foes.length ? [pick(foes).basicInfo.id] : [];
        case 'ally': {
            const hurt = [...friends].sort(
                (a, b) =>
                    a.combatStats.currentHp / a.combatStats.maxHp -
                    b.combatStats.currentHp / b.combatStats.maxHp
            );

            return [
                (spell.spellEffects ?? []).some(
                    (e: any) => e.kind === 'heal' || e.kind === 'hot'
                )
                    ? hurt[0].basicInfo.id
                    : pick(friends).basicInfo.id,
            ];
        }
        case 'area':
        case 'template':
            return (t.side === 'ally' ? friends : foes)
                .slice(0, t.maxTargets ?? 3)
                .map((x: any) => x.basicInfo.id);
        case 'allyDead': {
            const d = P().find(
                (x) =>
                    x.basicInfo.side === actor.basicInfo.side &&
                    !alive(x) &&
                    x.basicInfo.sourceType === ParticipantSourceType.CHARACTER
            );

            return d ? [d.basicInfo.id] : 'needDead';
        }
        case 'allAlliesDead':
            return P().some(
                (x) => x.basicInfo.side === actor.basicInfo.side && !alive(x)
            )
                ? []
                : 'needDead';
        default:
            return [];
    }
}

const snap = (ids: string[]) =>
    new Map(
        ids.map((id) => {
            const p = byId(id);

            return [
                id,
                p
                    ? JSON.stringify({
                          hp: p.combatStats.currentHp,
                          st: p.combatStats.status,
                          fx: p.battleData.activeEffects.map(
                              (e: any) => `${e.name}:${e.duration ?? ''}`
                          ),
                          m: p.combatStats.morale,
                      })
                    : 'gone',
            ];
        })
    );

async function castSpell(actor: any, spell: any) {
    let targets = spellTargets(actor, spell);

    if (targets === 'needDead') {
        const victim = friendsOf(actor)
            .filter(
                (x) =>
                    x !== actor &&
                    x.basicInfo.sourceType === ParticipantSourceType.CHARACTER
            )
            .sort(
                (a, b) => a.combatStats.currentHp - b.combatStats.currentHp
            )[0];

        if (!victim) return null;

        await call('participants', PATCH(victim.basicInfo.id), { kill: true });
        targets = spellTargets(actor, spell);

        if (targets === 'needDead') return null;
    }

    const dice = casterSpellDice(
        actor,
        {
            dice: spell.dice ?? 0,
            groupId: spell.groupId ?? null,
            level: spell.level,
            dieSides: spell.dieSides,
            upcastDice: spell.upcastDice,
            fixedDice: spell.fixedDice,
        },
        DEFAULT_RULES
    );

    const diceRolls =
        dice.count > 0 ? rollDiceList(`${dice.count}d${dice.sides}`, rng) : [];

    const effectKinds: string[] = (spell.spellEffects ?? []).map(
        (e: any) => e.kind
    );

    if (effectKinds.some((k) => k === 'heal' || k === 'hot')) {
        for (const id of (targets as string[]).length
            ? (targets as string[])
            : friendsOf(actor).map((x: any) => x.basicInfo.id)) {
            const t = byId(id);

            if (t && alive(t) && t.combatStats.currentHp >= t.combatStats.maxHp)
                await call('participants', PATCH(id), {
                    currentHp: Math.max(1, Math.floor(t.combatStats.maxHp / 2)),
                });
        }
    }

    const cleansable = (e: any, withConditions: boolean) =>
        e.type === 'debuff' || (withConditions && e.type === 'condition');

    const withConditions = (spell.spellEffects ?? []).some(
        (e: any) => e.kind === 'cleanse' && e.includeConditions
    );

    const nothingToCleanse =
        effectKinds.length > 0 &&
        effectKinds.every((k) => k === 'cleanse') &&
        (targets as string[]).every(
            (id) =>
                !byId(id)?.battleData.activeEffects.some((e: any) =>
                    cleansable(e, withConditions)
                )
        );

    const watched = [
        ...new Set([
            ...(targets as string[]),
            ...P().map((p: any) => p.basicInfo.id),
        ]),
    ];

    const before = snap(watched);

    const countBefore = P().length;

    const mapOf = () =>
        JSON.stringify([
            state.map?.terrain ?? null,
            state.map?.blocked ?? null,
        ]);

    const mapBefore = mapOf();

    const saveRolls = (targets as string[]).map((id) => ({
        participantId: id,
        roll: 1,
    }));

    const s = spellStats.get(spell.id) as NonNullable<
        ReturnType<typeof spellStats.get>
    >;

    const castRoll =
        PROFILE.judge === 'server' && s.ok === 0 && s.failed > 0
            ? 1
            : undefined;

    const r = await call('spell', SPELL, {
        casterId: actor.basicInfo.id,
        spellId: spell.id,
        targetIds: targets,
        diceRolls,
        saveRolls,
        ...(castRoll && { castRoll }),
    });

    s.casts++;

    if (r.status !== 200) {
        s.rejected.push(
            `${r.status} ${r.body?.code ?? ''} ${r.body?.error ?? ''}`.trim()
        );

        return r;
    }

    const after = snap(watched);

    const changed =
        [...before.keys()].some((id) => before.get(id) !== after.get(id)) ||
        P().length !== countBefore ||
        mapOf() !== mapBefore;

    const onlyNote = (spell.spellEffects ?? []).every(
        (e: any) =>
            e.kind === 'note' || (e.kind === 'createTerrain' && !state.map)
    );

    const castFailed = r.log.some(
        (e: any) =>
            e.actionType === 'spell' &&
            e.actionDetails?.system &&
            ruleSystemByKey(e.actionDetails.system.key)?.combat.details?.failed(
                e.actionDetails.system
            )
    );

    const blocked = IMMUNITY_LINE.test(JSON.stringify(r.log));

    if (castFailed) s.failed++;
    else if (changed || onlyNote) s.ok++;
    else if (blocked || nothingToCleanse || brokenSpells.has(spell.id))
        s.blocked++;
    else {
        s.noEffect++;
        issue(
            'warn',
            `${spell.name} (${actor.basicInfo.name}): каст пройшов, але жодних змін у цілей`
        );
    }

    if (s.samples.length < 2)
        s.samples.push(
            r.log
                .map((e: any) => resultTextOf(e))
                .join(' | ')
                .slice(0, 400)
        );

    return r;
}

async function attack(actor: any) {
    const foes = foesOf(actor);

    const weapon: any = actor.battleData.attacks?.length
        ? pick(actor.battleData.attacks as any[])
        : null;

    if (!foes.length || !weapon) return null;

    const target = pick(foes);

    const formula = attackDamageParts(actor, weapon, DEFAULT_RULES).formula;

    const d20 = rng() < 0.1 ? 20 : 6 + Math.floor(rng() * 15);

    const roll =
        PROFILE.judge === 'server'
            ? { serverRoll: true }
            : { d20Roll: Math.min(20, d20) };

    return call('attack', ATTACK, {
        attackerId: actor.basicInfo.id,
        targetId: target.basicInfo.id,
        attackId: weapon.id,
        ...roll,
        damageRolls: rollDiceList(formula, rng),
        endTurn: true,
    });
}

async function takeTurn(spells: Map<string, any>) {
    const actor = current();

    if (!actor) return;

    const id = actor.basicInfo.id;

    if (alive(actor) && awaitsMorale(id))
        await call('morale-check', MORALE, {
            participantId: id,
            d10Roll: 1 + Math.floor(rng() * 10),
        });

    const me = () => byId(id);

    if (me() && alive(me())) {
        for (const aura of pendingAreaAuras(P(), id, state.currentRound)) {
            const pool = zoneCandidates(P(), me(), aura.target).filter(
                () => rng() < 0.6
            );

            const zr = await call(
                'aura-zone',
                AURA_ZONE,
                {
                    participantId: id,
                    auraId: aura.id,
                    targetIds: pool.map((x: any) => x.basicInfo.id),
                },
                me().basicInfo.controlledBy === CONTROLLED_BY_DM
                    ? undefined
                    : me().basicInfo.controlledBy
            );

            if (zr.status === 200 && pool.length)
                proveAreaAura(
                    me(),
                    aura,
                    pool.map((x: any) => x.basicInfo.id)
                );
        }
    }

    if (!me() || !alive(me()) || current()?.basicInfo.id !== id) {
        if (current()?.basicInfo.id === id) await call('next-turn', NEXT);

        return;
    }

    const abilities = me().battleData.resolvedAbilities ?? [];

    const least = (list: any[]) =>
        list.sort(
            (a, b) =>
                (triedAbilities.get(a.name) ?? 0) -
                (triedAbilities.get(b.name) ?? 0)
        )[0];

    const bonus = least(
        abilities.filter((a: any) => a.trigger.event === 'bonusAction')
    );

    if (
        bonus &&
        !me().actionFlags.hasUsedBonusAction &&
        (triedAbilities.get(bonus.name) ?? 0) < 3
    ) {
        triedAbilities.set(
            bonus.name,
            (triedAbilities.get(bonus.name) ?? 0) + 1
        );
        await adaptiveAbility('bonus-action', me(), bonus);
    }

    if (!me() || !alive(me()) || current()?.basicInfo.id !== id) return;

    const known: any[] = (me().spellcasting?.knownSpells ?? [])
        .map((s: any) => spells.get(typeof s === 'string' ? s : s.id))
        .filter(Boolean);

    const freshSpell = known.sort(
        (a, b) => (triedSpells.get(a.id) ?? 0) - (triedSpells.get(b.id) ?? 0)
    )[0];

    const action = least(
        abilities.filter((a: any) => a.trigger.event === 'action')
    );

    let acted = false;

    if (action && (triedAbilities.get(action.name) ?? 0) < 2) {
        triedAbilities.set(
            action.name,
            (triedAbilities.get(action.name) ?? 0) + 1
        );

        const r = await adaptiveAbility('ability-action', me(), action);

        acted = r?.status === 200;
    } else if (
        freshSpell &&
        ((triedSpells.get(freshSpell.id) ?? 0) < 3 || rng() < 0.3)
    ) {
        triedSpells.set(
            freshSpell.id,
            (triedSpells.get(freshSpell.id) ?? 0) + 1
        );

        const r = await castSpell(me(), freshSpell);

        acted = r?.status === 200;
    }

    if (!acted && me() && alive(me()) && current()?.basicInfo.id === id)
        await attack(me());

    if (current()?.basicInfo.id === id && state.status === 'active')
        await call('next-turn', NEXT);
}

async function runBattle(
    label: string,
    unitIds: string[],
    spells: Map<string, any>,
    battleNo: number
) {
    battleLabel = label;

    const setup = mixedSides(unitIds, battleNo);

    const battle = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: `ТЕСТ ${label}`,
            status: 'prepared',
            participants: setup as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = battle.id;
    state = await readState();

    const s = await call('start', START);

    if (s.status !== 200) {
        issue(
            'error',
            `старт бою не вдався: ${JSON.stringify(s.body).slice(0, 300)}`
        );

        return null;
    }

    recordPassives();
    for (
        let step = 0;
        step < 600 && state.status === 'active' && state.currentRound <= ROUNDS;
        step++
    )
        await takeTurn(spells);
    recordCoverage();

    const allies = P().filter((p) => p.basicInfo.side === 'ally');

    const enemies = P().filter((p) => p.basicInfo.side === 'enemy');

    return `${label}: раундів ${Math.min(state.currentRound, ROUNDS)}${state.status === 'completed' ? ' (завершено)' : ''}; союзники живі ${allies.filter(alive).length}/${allies.length}, вороги живі ${enemies.filter(alive).length}/${enemies.length}`;
}

/** Герої й юніти на обох сторонах; герой міняє сторону від бою до бою, щоб кожен побув і союзником, і ворогом. */
function mixedSides(unitIds: string[], battleNo: number) {
    const heroes = heroRows.map((h, i) => ({
        id: h.id,
        type: ParticipantSourceType.CHARACTER,
        side: (i + battleNo) % 2 ? 'enemy' : 'ally',
    }));

    const units = unitIds.map((id, i) => ({
        id,
        type: ParticipantSourceType.UNIT,
        side: (i + battleNo) % 2 ? 'ally' : 'enemy',
        quantity: 1,
    }));

    return [...heroes, ...units];
}

/** Юніти по черзі з різних рас, щоб у кожній пачці зустрілися різні раси. */
function interleaveByRace(units: { id: string; raceId: string | null }[]) {
    const byRace = new Map<string, string[]>();

    for (const u of [...units].sort(() => rng() - 0.5))
        byRace.set(u.raceId ?? '-', [
            ...(byRace.get(u.raceId ?? '-') ?? []),
            u.id,
        ]);

    const queues = [...byRace.values()];

    const out: string[] = [];

    while (queues.some((q) => q.length))
        for (const q of queues) if (q.length) out.push(q.shift() as string);

    return out;
}

async function sweepTemplate(spells: Map<string, any>, report: string[]) {
    const pool = interleaveByRace(
        await prisma.unit.findMany({
            where: { campaignId: ctx.campaignId },
            select: { id: true, raceId: true },
        })
    );

    const per = PROFILE.unitsPerBattle;

    const chunks = Array.from(
        { length: Math.min(PROFILE.maxBattles, Math.ceil(pool.length / per)) },
        (_, i) => pool.slice(i * per, (i + 1) * per)
    );

    for (const [i, chunk] of chunks.entries()) {
        const res = await runBattle(`Б${i + 1}`, chunk, spells, i + 1);

        if (res) report.push(`- ${res}`);
    }
}

async function sweep(spells: Map<string, any>, report: string[]) {
    const shuffled = interleaveByRace(
        await prisma.unit.findMany({
            where: { campaignId: ctx.campaignId },
            select: { id: true, raceId: true },
        })
    );

    const chunks: string[][] = [];

    for (let i = 0; i < shuffled.length; i += 7)
        chunks.push(shuffled.slice(i, i + 7));

    let battleNo = 0;

    for (let r = 0; r < ROTATIONS.length; r++) {
        report.push(
            `\n### Ротація ${r + 1}`,
            ...(await applyRotation(r)).map((l) => `- ${l}`)
        );

        const per = Math.ceil(chunks.length / ROTATIONS.length);

        for (const chunk of chunks.slice(r * per, (r + 1) * per)) {
            battleNo++;

            const res = await runBattle(
                `Б${battleNo}/Р${r + 1}`,
                chunk,
                spells,
                battleNo
            );

            if (res) report.push(`- ${res}`);
        }
    }
}

function coverageReport(): string[] {
    const status = (c: any) =>
        c.note
            ? 'note'
            : c.event === 'passive'
              ? c.passiveMiss > 0
                  ? 'MISS'
                  : c.passiveOk > 0
                    ? 'ok'
                    : c.area || (c.conditional && c.unmet > 0)
                      ? 'MISS'
                      : 'baked'
              : c.fired > 0
                ? 'fired'
                : 'NOT-FIRED';

    const out = [
        '\n## Покриття вмінь',
        'Не спрацювали тригерні вміння (часто шанс або умова) та пасивки без запису в модифікаторах:',
    ];

    for (const src of ['skill', 'race', 'artifact', 'artifactSet', 'unit']) {
        const list = [...coverage.values()].filter((c) => c.source === src);

        const counts = list.reduce(
            (m: Record<string, number>, c) => ({
                ...m,
                [status(c)]: (m[status(c)] ?? 0) + 1,
            }),
            {}
        );

        out.push(
            `\n### ${src}: ${Object.entries(counts)
                .map(([k, v]) => `${k} ${v}`)
                .join(', ')}`
        );
        for (const c of list)
            if (['NOT-FIRED', 'MISS'].includes(status(c)))
                out.push(
                    `- ${status(c)} ${c.event} · ${c.owner} · ${c.name} (${c.effects}${c.conditional ? ', з умовою' : ''}) ${(c as any).missDetail || (c.area ? 'зону аури жодного разу не задано' : 'умову пасивки жодного разу не створено')}`
                );
    }

    const probed = [...coverage.values()].filter(
        (c) => c.event !== 'passive' && c.probed > 0 && c.probed === c.fired
    );

    out.push(
        '\n### Спрацювали лише в цільових пробах (примусовий шанс / сценарій умови)',
        ...(probed.length
            ? probed.map(
                  (c) =>
                      `- ${c.source} · ${c.owner} · ${c.name} (${c.event}${(c as any).conditional ? ', з умовою' : ''}) ×${c.probed}`
              )
            : ['- немає'])
    );
    out.push('\n## Заклинання');
    for (const [, s] of [...spellStats.entries()].sort(
        (a, b) =>
            a[1].school.localeCompare(b[1].school) || a[1].level - b[1].level
    )) {
        const name = (s as any).name;

        out.push(
            `- ${s.casts === 0 ? '⚪' : s.ok > 0 ? '✅' : '❌'} ${s.school} L${s.level} ${name}: кастів ${s.casts}, з ефектом ${s.ok}, без ефекту ${s.noEffect}${s.failed ? `, невдалих кидків каста ${s.failed}` : ''}${s.blocked ? `, без цілі для ефекту (імунітет/нічого знімати) ${s.blocked}` : ''}${s.rejected.length ? `, відхилено: ${[...new Set(s.rejected)].join('; ')}` : ''}`
        );
    }

    return out;
}

// Синтетичні заклинання P1–P4 (зони, стіна, аура, відкладений удар) — без тексту книг; ідемпотентно за назвою.
const SYNTHETIC_SPELLS = [
    {
        name: 'SYN Відкладений удар',
        level: 1,
        type: 'damage',
        damageType: 'slashing',
        dice: 2,
        dieSides: 6,
        targeting: { kind: 'enemy', range: 300 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'slashing',
                delayIfBeyond: { feet: 30, perRoundFeet: 30 },
            },
        ],
    },
    {
        name: 'SYN Стіна',
        level: 1,
        type: 'damage',
        damageType: 'none',
        dice: 0,
        targeting: {
            kind: 'template',
            shape: 'cube',
            size: 5,
            side: 'enemy',
            maxTargets: 1,
            range: 30,
        },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'createTerrain',
                terrain: 'wall',
                shape: 'cell',
                cells: 1,
                rounds: 10,
            },
        ],
    },
    {
        name: 'SYN Аура',
        level: 1,
        type: 'damage',
        damageType: 'none',
        dice: 0,
        targeting: { kind: 'enemy', range: 30 },
        resolution: { kind: 'auto' },
        concentration: true,
        spellEffects: [
            {
                kind: 'anchoredZone',
                radiusFeet: 20,
                side: 'all',
                onEnter: {
                    save: { ability: 'charisma' },
                    effects: [
                        {
                            kind: 'applyCondition',
                            condition: 'skip_action',
                            duration: { rounds: 3 },
                        },
                    ],
                },
                endsWhenStartOutside: true,
                duration: { rounds: 10 },
            },
        ],
    },
    {
        name: 'SYN Складна зона',
        level: 1,
        type: 'damage',
        damageType: 'none',
        dice: 0,
        targeting: {
            kind: 'template',
            shape: 'circle',
            size: 20,
            side: 'enemy',
            maxTargets: 20,
            range: 60,
            zone: {
                rounds: 5,
                terrain: ['difficult', 'obscured'],
                onExit: {
                    save: { ability: 'strength' },
                    effects: [],
                    pull: 'centre',
                },
            },
        },
        resolution: { kind: 'auto' },
        concentration: true,
        spellEffects: [],
    },
];

const createdSpellIds: string[] = [];

async function removeSyntheticSpells() {
    if (KEEP_BATTLES || !createdSpellIds.length) return;

    for (const h of heroRows) {
        const row = await prisma.character.findUnique({ where: { id: h.id } });

        if (row)
            await prisma.character.update({
                where: { id: h.id },
                data: {
                    knownSpells: ((row.knownSpells as string[]) ?? []).filter(
                        (id) => !createdSpellIds.includes(id)
                    ) as any,
                },
            });
    }

    await prisma.spell.deleteMany({ where: { id: { in: createdSpellIds } } });
}

async function ensureSyntheticSpells() {
    const ids: string[] = [];

    for (const def of SYNTHETIC_SPELLS) {
        const found = await prisma.spell.findFirst({
            where: { campaignId: ctx.campaignId, name: def.name },
        });

        const row =
            found ??
            (await prisma.spell.create({
                data: {
                    campaignId: ctx.campaignId,
                    executionMode: 'native',
                    ...def,
                } as any,
            }));

        if (!found) createdSpellIds.push(row.id);

        ids.push(row.id);
    }

    for (const h of heroRows) {
        const row = await prisma.character.findUniqueOrThrow({
            where: { id: h.id },
        });

        const known = (row.knownSpells as string[]) ?? [];

        await prisma.character.update({
            where: { id: h.id },
            data: { knownSpells: [...new Set([...known, ...ids])] as any },
        });
    }
}

async function main() {
    await prepare();

    if (PROFILE.source.kind === 'campaign') await ensureSyntheticSpells();

    const spellRows = await prisma.spell.findMany({
        where: { campaignId: ctx.campaignId },
        include: { spellGroup: true },
    });

    const spells = new Map(spellRows.map((s: any) => [s.id, s]));

    for (const row of spellRows as any[]) {
        const raw = Array.isArray(row.spellEffects) ? row.spellEffects : [];

        if (spellEffects(row).length !== raw.length) {
            brokenSpells.add(row.id);
            issue(
                'warn',
                `${row.name}: ${raw.length - spellEffects(row).length} з ${raw.length} ефектів заклинання недійсні (kind: ${raw.map((e: any) => e?.kind).join(', ')}) — дані, а не рушій`
            );
        }
    }

    for (const s of spellRows as any[])
        spellStats.set(s.id, {
            name: s.name,
            school: s.spellGroup?.name ?? '-',
            level: s.level,
            casts: 0,
            ok: 0,
            noEffect: 0,
            failed: 0,
            blocked: 0,
            rejected: [],
            samples: [],
            kinds: (s.spellEffects ?? []).map((e: any) => e.kind).join('+'),
        } as any);

    const report: string[] = [
        `# Battle sweep: ${campaign.name} (${PROFILE.key})`,
        '',
        ...(treeChecks.length
            ? ['## Дерева', ...treeChecks.map((t) => `- ${t}`)]
            : []),
    ];

    const runs = (wanted: Parameters<typeof modeRuns>[2]) =>
        modeRuns(PROFILE, MODE, wanted);

    if (runs('sweep'))
        await (PROFILE.source.kind === 'template'
            ? sweepTemplate(spells, report)
            : sweep(spells, report));

    if (runs('targeted')) await targeted(spells);

    if (runs('targeted') && runs('sweep')) {
        await unitTriggerProbes(spells);
        await areaAuraProbes();
        await copyBuffsProbe(spells);
    }

    if (runs('control')) await controlCheck(spells);

    if (runs('level5')) await level5Check(spells);

    if (runs('aura')) await auraZoneCheck();

    if (runs('reserve')) await reserveCheck();

    if (runs('map')) await mapCheck(spells);

    if (runs('maze')) await mazeCheck();

    if (runs('system')) await systemChecks(spells);

    if (runs('sweep')) moraleModuleChecks();

    if (targetedResults.length)
        report.push(
            '\n## Цільові перевірки',
            ...targetedResults.map((t) => `- ${t}`)
        );

    if (runs('sweep')) report.push(...coverageReport());

    const errors = issues.filter((i) => i.level === 'error');

    report.push(
        '\n## Помилки',
        ...(errors.length
            ? errors.map((i) => `- ${i.where}: ${i.text}`)
            : ['- немає'])
    );
    report.push(
        '\n## Відмови API (законні правила гри — для огляду)',
        ...[...rejections.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `- ${v} × ${k}`)
    );

    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'battle-sweep.md'), report.join('\n'));
    writeFileSync(
        join(OUT, 'data.json'),
        JSON.stringify(
            {
                issues,
                coverage: [...coverage.values()].map((c) => ({
                    ...c,
                    owners: [...c.owners],
                })),
                spells: [...spellStats.values()],
            },
            null,
            1
        )
    );
    writeFileSync(join(OUT, 'log.txt'), fullLog.join('\n'));
    console.info(targetedResults.join('\n'));
    await removeTestBattles();
    await removeSyntheticSpells();
    await templateRun?.cleanup();
    console.info(
        `\n${errors.length ? '❌' : '✅'} помилок: ${errors.length}, попереджень: ${issues.length - errors.length}. Звіт: ${join(OUT, 'battle-sweep.md')}`
    );
    await prisma.$disconnect();
    process.exit(errors.length ? 1 : 0);
}

// ---------- цільові сценарії ----------
const targetedResults: string[] = [];

const tcheck = (name: string, ok: boolean, detail: string) => {
    targetedResults.push(`${ok ? '✅' : '❌'} ${name} — ${detail}`);

    if (!ok) issue('error', `ЦІЛЬОВИЙ: ${name} — ${detail}`);
};

function moraleModuleChecks() {
    const expectation = moraleExpectation(PROFILE);

    const detail = `morale-check ${moraleStats.checks}, події з d10Roll ${moraleStats.d10Events}, очікувань ${moraleStats.awaited}, moraleFirst ${moraleStats.moraleFirstRejects}`;

    if (expectation === 'required') {
        tcheck(
            'Мораль (модуль): ≥ 1 morale-check і подія журналу з d10Roll',
            moraleStats.checks >= 1 && moraleStats.d10Events >= 1,
            detail
        );
        tcheck(
            'Мораль (модуль): сценарій не отримує moraleFirst',
            moraleStats.moraleFirstRejects === 0,
            detail
        );
    } else if (expectation === 'absent')
        tcheck(
            'Мораль без модуля: жодного morale-check, awaitsMorale завжди false',
            moraleStats.checks === 0 &&
                moraleStats.awaited === 0 &&
                moraleStats.d10Events === 0,
            detail
        );
}

/** Сценарій не склався (напр., бій уже завершився) — пропуск із поясненням замість хибного провалу. */
const tskip = (name: string, detail: string) => {
    targetedResults.push(`⏭️ ${name} — пропущено: ${detail}`);

    issue('warn', `ЦІЛЬОВИЙ пропущено: ${name} — ${detail}`);
};

const byName = (n: string) => P().find((p) => p.basicInfo.name === n);

const nextOnly = async () => {
    if (state.status === 'active') await call('next-turn', NEXT);
};

const diceSidesOf = (log: any[]) =>
    new Set(
        log.flatMap((e: any) =>
            (e.actionDetails?.diceRolls ?? []).flatMap((g: any) =>
                g.dice.map((d: any) => d.sides)
            )
        )
    );

/** Template-specific checks on seeded heroes: attack judge dice, ammo and concentration where the content has them. */
async function systemChecks(spells: Map<string, any>) {
    battleLabel = 'система';

    const foe = await prisma.unit.findFirstOrThrow({
        where: { campaignId: ctx.campaignId },
        orderBy: { level: 'asc' },
    });

    await prisma.character.updateMany({
        where: { id: { in: heroRows.map((h) => h.id) } },
        data: { resources: {} },
    });

    const setup = [
        {
            id: heroRows[0].id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        },
        {
            id: foe.id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 1,
        },
    ];

    const battle = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ система',
            status: 'prepared',
            participants: setup as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = battle.id;
    state = await readState();

    const started = await call('start', START);

    if (started.status !== 200)
        return tcheck(
            'старт бою для перевірок системи',
            false,
            JSON.stringify(started.body).slice(0, 200)
        );

    const heroName = heroRows[0].name;

    const heroTurn = await untilTurnOf((p) => p?.basicInfo.name === heroName);

    const heroId = current()?.basicInfo.id;

    const hero = () => byId(heroId);

    const weapon = hero()?.battleData.attacks?.[0];

    if (!heroTurn || !weapon)
        return tskip(
            'атака героя',
            heroTurn ? 'у героя немає атак' : 'хід героя не настав'
        );

    const target = foesOf(hero())[0];

    const ammoAtStart = P().flatMap((p) =>
        p.battleData.ammo && Object.keys(p.battleData.ammo).length
            ? [{ ...p.battleData.ammo } as Record<string, number>]
            : []
    )[0];

    const roll =
        PROFILE.judge === 'server' ? { serverRoll: true } : { d20Roll: 20 };

    const r = await call('attack', ATTACK, {
        attackerId: heroId,
        targetId: target.basicInfo.id,
        attackId: weapon.id,
        ...roll,
        damageRolls: rollDiceList(
            attackDamageParts(hero(), weapon, DEFAULT_RULES).formula,
            rng
        ),
        endTurn: false,
    });

    const slotRoll = Number(
        /"roll":(\d+)/.exec(
            JSON.stringify(
                r.log.map((e: any) => e.actionDetails?.system).filter(Boolean)
            )
        )?.[1]
    );

    if (PROFILE.judge === 'server')
        tcheck(
            'сервер кидає d100 за атаку',
            r.status === 200 && slotRoll >= 1 && slotRoll <= 100,
            `${r.status}; кидок у деталях дії ${slotRoll}`
        );
    else
        tcheck(
            'd20-атака героя',
            r.status === 200 && diceSidesOf(r.log).has(20),
            `${r.status}; кубики d${[...diceSidesOf(r.log)].join(',d')}`
        );

    if (PROFILE.judge === 'server') {
        if (ammoAtStart)
            tcheck(
                'боєзапас засіяно на старті',
                Object.values(ammoAtStart).every((n) => n > 0),
                JSON.stringify(ammoAtStart)
            );
        else
            tskip(
                'боєзапас',
                'жоден учасник бою не має зброї з боєзапасом у даних шаблону'
            );
    }

    if (PROFILE.judge === 'client') {
        await nextOnly();

        if (
            !(await untilTurnOf((p) => p?.basicInfo.id === heroId)) ||
            state.status !== 'active'
        )
            return tskip('концентрація', 'хід героя не настав вдруге');

        const candidates = ((hero().spellcasting?.knownSpells ?? []) as any[])
            .map((k: any) => spells.get(typeof k === 'string' ? k : k.id))
            .filter((sp: any) => sp?.concentration);

        if (!candidates.length)
            return tskip(
                'концентрація',
                'герой не знає жодного заклинання з концентрацією'
            );

        let cast: any = null;

        let used: any = null;

        for (const spell of candidates) {
            used = spell;
            cast = await castSpell(hero(), spell);

            if (cast?.status === 200) break;
        }

        tcheck(
            'концентрація ставиться на кастері',
            cast?.status === 200 &&
                !!byId(heroId)?.battleData.activeEffects.some(
                    (e: any) => e.concentration
                ),
            `${used.name}: ${cast?.status} (кандидатів ${candidates.length})`
        );
    }
}

async function untilTurnOf(pred: (p: any) => boolean) {
    for (
        let i = 0;
        i < 60 && state.status === 'active' && !pred(current());
        i++
    )
        await nextOnly();

    return pred(current());
}

async function hitBy(
    target: any,
    logs: string[],
    hpBeforeHit?: number,
    d20 = 20
) {
    await nextOnly();

    const ok = await untilTurnOf(
        (p) =>
            p.basicInfo.side !== target.basicInfo.side &&
            alive(p) &&
            p.battleData.attacks?.length &&
            !p.actionFlags.hasUsedAction
    );

    if (!ok) return null;

    const a = current();

    const w = a.battleData.attacks[0];

    // HP ставимо вже на ходу атакувальника: регенерація на старті ходу не встигне підлікувати
    if (hpBeforeHit !== undefined)
        await call('participants', PATCH(target.basicInfo.id), {
            currentHp: hpBeforeHit,
        });

    const r = await call('attack', ATTACK, {
        attackerId: a.basicInfo.id,
        targetId: target.basicInfo.id,
        attackId: w.id,
        d20Roll: d20,
        disadvantageRoll: d20,
        advantageRoll: d20,
        damageRolls: rollDiceList(
            attackDamageParts(a, w, DEFAULT_RULES).formula,
            rng
        ),
        endTurn: false,
    });

    logs.push(...r.log.map((e: any) => resultTextOf(e)));

    return r;
}

// ---------- проби рідкісних тригерів ----------
const usageOf = (p: any, name: string) =>
    (p?.battleData.resolvedAbilities ?? [])
        .filter((a: any) => a.name === name)
        .reduce(
            (n: number, a: any) =>
                n + (p.battleData.abilityUsage?.[a.key]?.battle ?? 0),
            0
        );

const attackWith = (att: any, target: any, w: any) =>
    call('attack', ATTACK, {
        attackerId: att.basicInfo.id,
        targetId: target.basicInfo.id,
        attackId: w.id,
        d20Roll: 20,
        disadvantageRoll: 20,
        advantageRoll: 20,
        damageRolls: rollDiceList(
            attackDamageParts(att, w, DEFAULT_RULES).formula,
            rng
        ),
        endTurn: false,
    });

const turnOf = (id: string) =>
    untilTurnOf(
        (p) => p.basicInfo.id === id && alive(p) && !p.actionFlags.hasUsedAction
    );

const heal = (p: any) =>
    call('participants', PATCH(p.basicInfo.id), {
        currentHp: p.combatStats.maxHp,
    });

/** Здобич лучника: другий дальній постріл по відміченій цілі додає шкоду (мітка від першого влучання). */
async function preyProbe() {
    const ivan = byName('Айвен');

    const w = ivan?.battleData.attacks?.find(
        (x: any) => attackKindOf(x.type) === AttackType.RANGED
    );

    if (!ivan || !w)
        return tskip(
            'Здобич: мітка → +15 % шкоди',
            'немає дальньої зброї в Айвена'
        );

    const foe = foesOf(ivan).sort(
        (a, b) => b.combatStats.maxHp - a.combatStats.maxHp
    )[0];

    const logs: string[] = [];

    for (
        let i = 0;
        i < 6 && foe && usageOf(byName('Айвен'), 'Здобич: шкода') === 0;
        i++
    ) {
        await nextOnly();

        if (!(await turnOf(ivan.basicInfo.id))) break;

        await heal(byId(foe.basicInfo.id));
        logs.push(
            ...(
                await attackWith(byName('Айвен'), byId(foe.basicInfo.id), w)
            ).log.map((e: any) => resultTextOf(e))
        );
        logs.push(
            `[після ${i + 1}: Здобич ${usageOf(byName('Айвен'), 'Здобич')}; ефекти цілі: ${JSON.stringify(byId(foe.basicInfo.id)?.battleData.activeEffects.map((e: any) => [e.name, e.abilityKey, e.source?.participantId, e.duration]))}; зброя ${w.name} ${w.type}; вміння: ${(
                byName('Айвен').battleData.resolvedAbilities ?? []
            )
                .map((a: any) => a.name)
                .filter((n: string) => /Здобич/.test(n))
                .join(',')}]`
        );
    }

    const used = usageOf(byName('Айвен'), 'Здобич: шкода');

    tcheck(
        'Здобич: друге влучання по відміченій цілі дає +15 % шкоди',
        used > 0,
        `спрацювань ${used}; ${logs.filter((l) => l.startsWith('[після')).join(' ')}`
    );
}

/** Пасивки з умовою «союзник має < N % HP»: без умови запису немає, з умовою — є (collectModifiers, канал, яким читає атака). */
async function lowAllyPassiveProbe() {
    for (const p of P().filter(alive)) await heal(p);

    for (const owner of P().filter(alive)) {
        for (const a of owner.battleData.resolvedAbilities ?? []) {
            const cond = a.condition;

            if (
                a.trigger.event !== 'passive' ||
                cond?.type !== 'hpBelow' ||
                cond.who !== 'anyAlly'
            )
                continue;

            const label = JSON.stringify(abilityLabel(a));

            const present = () =>
                a.effects.every((e: any) =>
                    collectModifiers(
                        P(),
                        owner.basicInfo.id,
                        queryOf(e) as any
                    ).entries.some(
                        (en: any) => JSON.stringify(en.label) === label
                    )
                );

            const victim = friendsOf(owner).find((x) => x !== owner);

            if (!victim) continue;

            const before = present();

            await call('participants', PATCH(victim.basicInfo.id), {
                currentHp: Math.max(
                    1,
                    Math.floor(
                        (victim.combatStats.maxHp * (cond.percent - 5)) / 100
                    )
                ),
            });

            const during = present();

            await heal(byId(victim.basicInfo.id));

            const c = covEntry(owner, a);

            if (!before && during) c.passiveOk++;
            else {
                c.passiveMiss++;
                c.missDetail = `без умови запис ${before}, з умовою ${during}`;
            }

            tcheck(
                `${a.name}: бонус лише коли союзник < ${cond.percent} % HP`,
                !before && during,
                `${owner.basicInfo.name}: без умови ${before}, з умовою (${victim.basicInfo.name} < ${cond.percent} %) ${during}`
            );
        }
    }
}

/** Некромант (Експерт): підняття мертвих — ціль-мертвий союзник, дія героя. */
async function raiseDeadProbe() {
    const nec = byName('Маркел');

    const raise = (nec?.battleData.resolvedAbilities ?? []).find(
        (a: any) =>
            a.effects.some((e: any) => e.kind === 'raiseDead') &&
            a.trigger.event === 'action'
    );

    if (!nec || !raise)
        return tskip(
            'Підняття мертвих: воскрешає полеглого',
            'у Маркела немає raiseDead-вміння в цій ротації'
        );

    const victim = P().find(
        (x) =>
            x.basicInfo.sourceType === ParticipantSourceType.UNIT &&
            x.basicInfo.side !== nec.basicInfo.side &&
            alive(x)
    );

    if (!victim)
        return tskip(
            'Підняття мертвих: воскрешає полеглого',
            'немає ворожого юніта'
        );

    await call('participants', PATCH(victim.basicInfo.id), { kill: true });
    await nextOnly();

    const ok = await turnOf(nec.basicInfo.id);

    const r = ok
        ? await call('ability-action', ABILITY, {
              participantId: nec.basicInfo.id,
              abilityKey: raise.key,
              targetParticipantIds: [victim.basicInfo.id],
          })
        : null;

    tcheck(
        `${raise.name}: воскрешає полеглого юніта (raiseDead діє лише на юнітів)`,
        !!r && r.status === 200 && alive(byId(victim.basicInfo.id)),
        `${r?.status} HP ${byId(victim.basicInfo.id)?.combatStats.currentHp}; ${r?.log
            .map((e: any) => resultTextOf(e))
            .join(' | ')
            .slice(
                0,
                200
            )} ${r && r.status !== 200 ? JSON.stringify(r.body).slice(0, 200) : ''}`
    );
}

/** Тригерні вміння юнітів, що не спрацювали у випадкових боях: окремий міні-бій із примусовим шансом і сценарієм під подію. */
async function unitTriggerProbes(spells: Map<string, any>) {
    const todo = [...coverage.values()].filter(
        (c) =>
            c.source === 'unit' &&
            c.event !== 'passive' &&
            c.event !== 'spellCast' &&
            !c.note &&
            c.fired === 0
    );

    const units = await prisma.unit.findMany({
        where: { campaignId: ctx.campaignId },
    });

    const byHp = [...units].sort((a, b) => b.maxHp - a.maxHp);

    for (const owner of [...new Set(todo.map((c) => c.owner))]) {
        const ou = units.find((u) => u.name === owner);

        if (!ou) continue;

        const mine = todo.filter((c) => c.owner === owner);

        const foe = byHp.find((u) => u.id !== ou.id);

        const weak = [...byHp]
            .reverse()
            .find(
                (u) =>
                    u.id !== ou.id &&
                    u.id !== foe?.id &&
                    !(u.immunities as any[]).length &&
                    !/resistance|immun/i.test(JSON.stringify(u.abilities))
            );

        const stunCond = mine
            .map(
                (c) =>
                    (c.name &&
                        (ou.abilities as any[]).find(
                            (a: any) => a.name === c.name
                        )?.condition?.condition) as string | undefined
            )
            .find(Boolean);

        if (!foe || !weak) continue;

        const setup = [
            {
                id: ou.id,
                type: ParticipantSourceType.UNIT,
                side: 'ally',
                quantity: 1,
            },
            {
                id: weak.id,
                type: ParticipantSourceType.UNIT,
                side: 'ally',
                quantity: 1,
            },
            {
                id: foe.id,
                type: ParticipantSourceType.UNIT,
                side: 'enemy',
                quantity: 1,
            },
        ];

        battleLabel = `ПРОБА ${owner}`;

        const b = await createTestBattle({
            data: {
                campaignId: ctx.campaignId,
                name: `ТЕСТ ${battleLabel}`,
                status: 'prepared',
                participants: setup as any,
                currentRound: 1,
                currentTurnIndex: 0,
            },
        });

        ctx.battleId = b.id;
        state = await readState();

        if ((await call('start', START)).status !== 200) continue;

        forceChance = true;

        const nameIs = (u: any) => (p: any) =>
            p.basicInfo.name.replace(/ #\d+$/, '') === u.name;

        const o = () => P().find(nameIs(ou));

        const foeP = () => P().find(nameIs(foe));

        const weakP = () => P().find(nameIs(weak));

        const logFrom = fullLog.length;

        for (const c of mine) {
            const a = (o().battleData.resolvedAbilities ?? []).find(
                (x: any) => x.name === c.name && x.trigger.event === c.event
            );

            if (!a || usageOf(o(), c.name) > 0 || state.status !== 'active')
                continue;

            const role = a.trigger.role;

            if (c.event === 'kill' && role === 'victimSide') {
                await heal(foeP());
                await call('participants', PATCH(weakP().basicInfo.id), {
                    currentHp: 1,
                });

                for (
                    let i = 0;
                    i < 6 && alive(weakP()) && state.status === 'active';
                    i++
                ) {
                    await nextOnly();

                    if (await turnOf(foeP().basicInfo.id))
                        await attackWith(
                            foeP(),
                            weakP(),
                            foeP().battleData.attacks[0]
                        );
                }
            } else if (c.event === 'action') {
                if (a.condition?.type === 'targetDead')
                    await call('participants', PATCH(weakP().basicInfo.id), {
                        kill: true,
                    });

                for (
                    let i = 0;
                    i < 6 &&
                    usageOf(o(), c.name) === 0 &&
                    state.status === 'active';
                    i++
                ) {
                    if (await turnOf(o().basicInfo.id))
                        await adaptiveAbility('ability-action', o(), a);

                    await nextOnly();
                }
            } else if (c.event === 'hit' || c.event === 'attack') {
                for (
                    let cycle = 0;
                    cycle < 5 &&
                    usageOf(o(), c.name) === 0 &&
                    state.status === 'active';
                    cycle++
                ) {
                    await nextOnly();
                    await heal(foeP());

                    if (stunCond === EffectMarker.SKIP_ACTION)
                        await call('conditions', COND, {
                            action: 'apply',
                            participantId: foeP().basicInfo.id,
                            condition: 'incapacitated',
                            rounds: 3,
                        });

                    if (await turnOf(o().basicInfo.id))
                        for (const w of o().battleData.attacks ?? [])
                            if (
                                usageOf(o(), c.name) === 0 &&
                                !o().actionFlags.hasUsedAction
                            ) {
                                await heal(foeP());
                                await attackWith(o(), foeP(), w);
                            }
                }
            }
        }

        forceChance = false;
        recordCoverage(true);

        for (const c of mine)
            if (usageOf(o(), c.name) === 0)
                targetedResults.push(
                    `⚠️ проба ${owner} / ${c.name}: не спрацювало; журнал: ${fullLog.slice(logFrom).join(' | ').slice(-500)}`
                );
    }

    battleLabel = '';
    void spells;
}

/** Аури «поруч», яких випадкові бої жодного разу не задали: власник задає зону на всіх можливих цілях, перевіряємо запис у collectModifiers. */
async function areaAuraProbes() {
    const todo = [...coverage.values()].filter(
        (c) => c.area && c.passiveOk === 0 && c.passiveMiss === 0
    );

    const units = await prisma.unit.findMany({
        where: { campaignId: ctx.campaignId },
    });

    const foe = [...units].sort((a, b) => b.maxHp - a.maxHp)[0];

    for (const c of todo) {
        const ou = units.find((u) => u.name === c.owner);

        if (!ou || !foe || ou.id === foe.id) continue;

        battleLabel = `ПРОБА аура ${c.owner}`;

        const setup = [
            {
                id: ou.id,
                type: ParticipantSourceType.UNIT,
                side: 'ally',
                quantity: 1,
            },
            {
                id: foe.id,
                type: ParticipantSourceType.UNIT,
                side: 'enemy',
                quantity: 1,
            },
        ];

        const b = await createTestBattle({
            data: {
                campaignId: ctx.campaignId,
                name: `ТЕСТ ${battleLabel}`,
                status: 'prepared',
                participants: setup as any,
                currentRound: 1,
                currentTurnIndex: 0,
            },
        });

        ctx.battleId = b.id;
        state = await readState();
        await call('start', START);

        const o = P().find(
            (p) => p.basicInfo.name.replace(/ #\d+$/, '') === ou.name
        );

        if (
            !o ||
            !(await untilTurnOf(
                (p) => p.basicInfo.id === o.basicInfo.id && alive(p)
            ))
        )
            continue;

        for (const aura of pendingAreaAuras(
            P(),
            o.basicInfo.id,
            state.currentRound
        )) {
            const ids = zoneCandidates(
                P(),
                byId(o.basicInfo.id),
                aura.target
            ).map((x: any) => x.basicInfo.id);

            if (
                (
                    await call('aura-zone', AURA_ZONE, {
                        participantId: o.basicInfo.id,
                        auraId: aura.id,
                        targetIds: ids,
                    })
                ).status === 200 &&
                ids.length
            )
                proveAreaAura(byId(o.basicInfo.id), aura, ids);
        }
    }

    battleLabel = '';
}

/** «Світле відлуння» єдинорога: союзний герой кастує баф заклинанням школи тригера — єдиноріг отримує копію. */
async function copyBuffsProbe(spells: Map<string, any>) {
    const todo = [...coverage.values()].filter(
        (c) => c.source === 'unit' && c.event === 'spellCast' && c.fired === 0
    );

    for (const c of todo) {
        const ou = await prisma.unit.findFirst({
            where: { campaignId: ctx.campaignId, name: c.owner },
        });

        const trig = (ou?.abilities as any[] | undefined)?.find(
            (a: any) => a.name === c.name
        )?.trigger;

        const caster = heroRows.find((h) => h.name === 'Зехір');

        const spell = [...spells.values()].find(
            (sp: any) =>
                sp.groupId === trig?.school &&
                ['ally', 'self'].includes(sp.targeting?.kind) &&
                spellEffects(sp).some((e: any) => e.kind === 'modifyStat')
        );

        if (!ou || !caster || !spell) {
            tskip(
                `${c.name}: союзний баф школи`,
                'немає героя-кастера або заклинання бафу цієї школи'
            );
            continue;
        }

        battleLabel = `ПРОБА ${c.owner}`;
        await applyRotation(0);

        const setup = [
            {
                id: caster.id,
                type: ParticipantSourceType.CHARACTER,
                side: 'ally',
            },
            {
                id: ou.id,
                type: ParticipantSourceType.UNIT,
                side: 'ally',
                quantity: 1,
            },
            {
                id: (
                    await prisma.unit.findFirstOrThrow({
                        where: {
                            campaignId: ctx.campaignId,
                            id: { not: ou.id },
                        },
                        orderBy: { maxHp: 'desc' },
                    })
                ).id,
                type: ParticipantSourceType.UNIT,
                side: 'enemy',
                quantity: 1,
            },
        ];

        const b = await createTestBattle({
            data: {
                campaignId: ctx.campaignId,
                name: `ТЕСТ ${battleLabel}`,
                status: 'prepared',
                participants: setup as any,
                currentRound: 1,
                currentTurnIndex: 0,
            },
        });

        ctx.battleId = b.id;
        state = await readState();
        await call('start', START);

        const zeh = () => byName(caster.name);

        const uni = () =>
            P().find((p) => p.basicInfo.name.replace(/ #\d+$/, '') === ou.name);

        const r = (await turnOf(zeh().basicInfo.id))
            ? await call('spell', SPELL, {
                  casterId: zeh().basicInfo.id,
                  spellId: spell.id,
                  targetIds: [zeh().basicInfo.id],
                  diceRolls: [],
                  free: true,
              })
            : null;

        tcheck(
            `${c.name}: баф союзника школи «${spell.name}» копіюється єдинорогу`,
            !!r && r.status === 200 && usageOf(uni(), c.name) > 0,
            `${r?.status} ефекти єдинорога: ${uni()
                ?.battleData.activeEffects.map((e: any) => e.name)
                .join(', ')}`
        );
        recordCoverage(true);
    }

    battleLabel = '';
}

async function targeted(spells: Map<string, any>) {
    const easy = (
        await prisma.unit.findMany({ where: { campaignId: ctx.campaignId } })
    )
        .filter((u: any) => !/дракон|титан|архангел|ліч/i.test(u.name))
        .slice(0, 3)
        .map((u: any) => u.id);

    await applyRotation(0);
    battleLabel = 'ЦІЛЬ-1';

    const setup = [
        ...heroRows.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        ...easy.map((id) => ({
            id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 1,
        })),
    ];

    const mkBattle = async (label: string) => {
        battleLabel = label;

        const b = await createTestBattle({
            data: {
                campaignId: ctx.campaignId,
                name: `ТЕСТ ${label}`,
                status: 'prepared',
                participants: setup as any,
                currentRound: 1,
                currentTurnIndex: 0,
            },
        });

        ctx.battleId = b.id;
        state = await readState();
        await call('start', START);
    };

    await mkBattle('ЦІЛЬ-1');

    // Битва до останнього (Семгрун, Захист middle)
    let sem = byName('Семгрун');

    let logs: string[] = [];

    await hitBy(byName('Семгрун'), logs, 1);
    sem = byName('Семгрун');
    tcheck(
        'Битва до останнього: смертельний удар → живий з 1 HP',
        alive(sem) && sem.combatStats.currentHp >= 1,
        `HP ${sem.combatStats.currentHp}, статус ${sem.combatStats.status}; ${logs.join(' | ').slice(0, 300)}`
    );

    // Супротив: HP < 15 %, негативний ефект, удар → очищення
    await call('participants', PATCH(sem.basicInfo.id), {
        currentHp: Math.max(2, Math.floor(sem.combatStats.maxHp * 0.1)),
    });

    // not Сповільнення: Семгрун's Helm of the Dwarven Kings makes the party immune to it (and Сліпота)
    const dark = [...spells.values()].find((s: any) => s.name === 'Немічність');

    await nextOnly();
    await untilTurnOf(
        (p) =>
            p.basicInfo.side === 'enemy' &&
            alive(p) &&
            !p.actionFlags.hasUsedAction
    );

    const caster = current();

    await call('spell', SPELL, {
        casterId: caster.basicInfo.id,
        spellId: dark.id,
        targetIds: [sem.basicInfo.id],
        free: true,
        diceRolls: [],
        saveRolls: [{ participantId: sem.basicInfo.id, roll: 1 }],
    });

    const fxBefore = byName('Семгрун').battleData.activeEffects.map(
        (e: any) => e.name
    );

    logs = [];
    for (let i = 0; i < 12; i++) {
        const s0 = byName('Семгрун');

        // a crit at ~10 % HP is lethal, and abilities of a downed hero never fire: hit without a crit at exactly 15 %
        await hitBy(s0, logs, Math.floor(s0.combatStats.maxHp * 0.15), 15);

        if (logs.some((l) => /→ Семгрун: \d+ шкоди/.test(l))) break;
    }

    const fxAfter = byName('Семгрун').battleData.activeEffects.map(
        (e: any) => e.name
    );

    tcheck(
        'Супротив: при HP < 15 % влучання запускає очищення',
        fxBefore.includes(dark.name) &&
            !fxAfter.includes(dark.name) &&
            logs.some((l) => /Супротив/.test(l)),
        `до: [${fxBefore}] після: [${fxAfter}]; ${logs.join(' | ').slice(0, 300)}`
    );

    // Друге серце (Намисто лева на Аграїлі)
    logs = [];
    await hitBy(byName('Аграїл'), logs, 1);

    const agr2 = byName('Аграїл');

    tcheck(
        'Друге серце (Намисто лева): смертельний удар → 25 % HP',
        alive(agr2) &&
            agr2.combatStats.currentHp >=
                Math.floor(agr2.combatStats.maxHp * 0.25) - 1,
        `HP ${agr2.combatStats.currentHp}/${agr2.combatStats.maxHp}; ${logs.join(' | ').slice(0, 300)}`
    );

    // Світло корони: Зехір (Корона Сар-Ісси) кастує заклинання Світла
    const light = [...spells.values()].find((s: any) => s.name === 'Поспіх');

    const zeh = byName('Зехір');

    for (const p of friendsOf(zeh))
        if (p.combatStats.currentHp > 5)
            await call('participants', PATCH(p.basicInfo.id), {
                currentHp: Math.floor(p.combatStats.maxHp / 2),
            });

    const hpB = friendsOf(zeh).reduce(
        (n: number, p: any) => n + p.combatStats.currentHp,
        0
    );

    const lr = await call('spell', SPELL, {
        casterId: zeh.basicInfo.id,
        spellId: light.id,
        targetIds: [zeh.basicInfo.id],
        diceRolls: [],
        free: true,
    });

    const hpA = friendsOf(byName('Зехір')).reduce(
        (n: number, p: any) => n + p.combatStats.currentHp,
        0
    );

    tcheck(
        'Світло корони: каст Світла лікує союзників на 5 % HP',
        lr.status === 200 && hpA > hpB,
        `HP союзників ${hpB} → ${hpA}; ${lr.status} ${lr.log
            .map((e: any) => resultTextOf(e))
            .join(' | ')
            .slice(
                0,
                300
            )} ${lr.status !== 200 ? JSON.stringify(lr.body).slice(0, 200) : ''}`
    );

    // Вибух мани: ворог кастує в Зехіра (шанс 50 %, до 2 разів)
    const bolt = [...spells.values()].find(
        (s: any) => s.name === 'Потойбічна стріла'
    );

    let burst = false;

    for (let i = 0; i < 6 && !burst; i++) {
        await nextOnly();

        if (
            !(await untilTurnOf(
                (p) =>
                    p.basicInfo.side === 'enemy' &&
                    alive(p) &&
                    !p.actionFlags.hasUsedAction
            ))
        )
            break;

        const ec = current();

        const dice = casterSpellDice(
            ec,
            {
                dice: bolt.dice,
                groupId: bolt.groupId,
            },
            DEFAULT_RULES
        );

        const r = await call('spell', SPELL, {
            casterId: ec.basicInfo.id,
            spellId: bolt.id,
            targetIds: [byName('Зехір').basicInfo.id],
            free: true,
            diceRolls: rollDiceList(`${dice.count}d${dice.sides}`, rng),
        });

        burst = r.log.some((e: any) => /Вибух мани/.test(resultTextOf(e)));

        if (r.status !== 200) break;
    }
    tcheck(
        'Вибух мани: ворожий каст у Зехіра відповідає шкодою (шанс 50 %)',
        burst,
        burst ? 'спрацював' : 'не спрацював за 6 кастів'
    );

    await preyProbe();
    await lowAllyPassiveProbe();
    recordCoverage(true);

    // Ангел Хранитель (ультимат Людей) — ротація 3
    await applyRotation(2);
    await mkBattle('ЦІЛЬ-2');

    const god = byName('Лорд Годрик Єдиноріг');

    const victim = byName('Айвен');

    await call('participants', PATCH(victim.basicInfo.id), { kill: true });

    const angel = (god.battleData.resolvedAbilities ?? []).find(
        (a: any) => a.name === 'Ангел Хранитель'
    );

    const ok = await untilTurnOf(
        (p) => p.basicInfo.name === god.basicInfo.name
    );

    const ar =
        angel && ok
            ? await call('ability-action', ABILITY, {
                  participantId: god.basicInfo.id,
                  abilityKey: angel.key,
                  targetParticipantIds: [victim.basicInfo.id],
              })
            : null;

    const v2 = byName('Айвен');

    tcheck(
        'Ангел Хранитель: воскрешає полеглого союзника з 50 % HP',
        !!ar && ar.status === 200 && alive(v2),
        `${ar?.status} HP ${v2.combatStats.currentHp}/${v2.combatStats.maxHp}; ${ar?.log
            .map((e: any) => resultTextOf(e))
            .join(' | ')
            .slice(
                0,
                250
            )} ${ar && ar.status !== 200 ? JSON.stringify(ar.body).slice(0, 200) : ''}`
    );

    await raiseDeadProbe();
    recordCoverage(true);
}

async function controlCheck(spells: Map<string, any>) {
    await applyRotation(0);

    const realPlayers = heroRows.filter((h) => h.controlledBy !== dmId);

    const top = realPlayers[2];

    await prisma.character.update({
        where: { id: top.id },
        data: { level: HERO_LEVEL + 1 },
    });

    const units = (
        await prisma.unit.findMany({ where: { campaignId: ctx.campaignId } })
    ).filter((u: any) => !/дракон|титан|архангел/i.test(u.name));

    const setup = [
        ...heroRows.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        {
            id: units[0].id,
            type: ParticipantSourceType.UNIT,
            side: 'ally',
            quantity: 2,
        },
        {
            id: units[1].id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 2,
        },
    ];

    battleLabel = 'КОНТРОЛЬ';

    const b = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ контроль',
            status: 'prepared',
            participants: setup as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b.id;
    state = await readState();
    await call('start', START);

    const allyUnits = P().filter(
        (p) => p.basicInfo.side === 'ally' && p.basicInfo.sourceType === 'unit'
    );

    const enemyUnits = P().filter((p) => p.basicInfo.side === 'enemy');

    tcheck(
        'Союзні юніти за замовчуванням під DM (без автопризначення)',
        allyUnits.length === 2 &&
            allyUnits.every((u) => u.basicInfo.controlledBy === 'dm'),
        allyUnits
            .map((u) => `${u.basicInfo.name}→${u.basicInfo.controlledBy}`)
            .join(', ')
    );

    for (const x of allyUnits)
        await call('unit-control', UNIT_CONTROL, {
            mode: 'assign',
            participantId: x.basicInfo.id,
            controlledBy: top.controlledBy,
        });

    const assigned = P().filter(
        (p) => p.basicInfo.side === 'ally' && p.basicInfo.sourceType === 'unit'
    );

    tcheck(
        'DM передає союзних юнітів гравцю (unit-control)',
        assigned.length === 2 &&
            assigned.every(
                (u) => u.basicInfo.controlledBy === top.controlledBy
            ),
        `${top.name} (${top.controlledBy.slice(0, 8)}): ${assigned.map((u) => `${u.basicInfo.name}→${u.basicInfo.controlledBy.slice(0, 8)}`).join(', ')}`
    );
    tcheck(
        'Ворожі юніти без гравців — під DM',
        enemyUnits.every((u) => u.basicInfo.controlledBy === 'dm'),
        enemyUnits
            .map((u) => `${u.basicInfo.name}→${u.basicInfo.controlledBy}`)
            .join(', ')
    );

    // хід союзного юніта: інший гравець — 403, власник — 200
    const other = realPlayers.find((h) => h.controlledBy !== top.controlledBy);

    await untilTurnOf(
        (p) =>
            p.basicInfo.side === 'ally' &&
            p.basicInfo.sourceType === 'unit' &&
            alive(p)
    );

    const u = current();

    const foe = foesOf(u)[0];

    const w = u.battleData.attacks[0];

    const body = {
        attackerId: u.basicInfo.id,
        targetId: foe.basicInfo.id,
        attackId: w.id,
        d20Roll: 15,
        damageRolls: rollDiceList(
            attackDamageParts(u, w, DEFAULT_RULES).formula,
            rng
        ),
        endTurn: false,
    };

    const r1 = await call('attack', ATTACK, body, other?.controlledBy);

    const r2 = await call('attack', ATTACK, body, top.controlledBy);

    tcheck(
        'Чужий гравець не може ходити юнітом',
        r1.status === 403,
        `${r1.status} ${JSON.stringify(r1.body).slice(0, 120)}`
    );
    tcheck(
        'Гравець-власник ходить союзним юнітом',
        r2.status === 200,
        `${r2.status} ${r2.log
            .map((e: any) => resultTextOf(e))
            .join(' | ')
            .slice(
                0,
                150
            )} ${r2.status !== 200 ? JSON.stringify(r2.body).slice(0, 150) : ''}`
    );

    const nt = await call('next-turn', NEXT, {}, top.controlledBy);

    tcheck(
        'Власник завершує хід юніта (next-turn)',
        nt.status === 200,
        `${nt.status} ${nt.status !== 200 ? JSON.stringify(nt.body).slice(0, 150) : ''}`
    );

    // прикликання гравцем: Айвен (Природа) кастує Призив Фенікса як гравець
    const ivan = hero('Айвен');

    await untilTurnOf((p) => p.basicInfo.name === 'Айвен');

    const phoenix = [...spells.values()].find(
        (s: any) => s.name === 'Прикликання елементаля: Вогонь'
    );

    const before = new Set(P().map((p) => p.basicInfo.id));

    const sr = await call(
        'spell',
        SPELL,
        {
            casterId: byName('Айвен').basicInfo.id,
            spellId: phoenix.id,
            targetIds: [],
            diceRolls: [],
        },
        ivan.controlledBy
    );

    const summoned = [...P(), ...(state.pendingParticipants ?? [])].filter(
        (p) => !before.has(p.basicInfo.id)
    );

    const pend = (await prisma.$queryRawUnsafe(
        `select "controlledBy", snapshot->'basicInfo'->>'name' n from battle_participants where "battleId"='${ctx.battleId}' and "isPending"`
    )) as any[];

    tcheck(
        'Прикликаний гравцем юніт належить цьому гравцю',
        sr.status === 200 &&
            (summoned.length > 0 || pend.length > 0) &&
            [
                ...summoned.map((s) => s.basicInfo.controlledBy),
                ...pend.map((x) => x.controlledBy),
            ].every((c) => c === ivan.controlledBy),
        `${sr.status} нові: ${summoned.map((s) => `${s.basicInfo.name}→${s.basicInfo.controlledBy.slice(0, 8)}`).join(', ')} pending: ${pend.map((x) => `${x.n}→${String(x.controlledBy).slice(0, 8)}`).join(', ')}; Айвен=${ivan.controlledBy.slice(0, 8)} ${sr.status !== 200 ? JSON.stringify(sr.body).slice(0, 150) : ''}`
    );

    // бій без гравців: усі союзні юніти й герої DM
    const dmOnly = [
        ...heroRows
            .filter((h) => h.controlledBy === dmId)
            .map((h) => ({
                id: h.id,
                type: ParticipantSourceType.CHARACTER,
                side: 'ally',
            })),
        {
            id: units[0].id,
            type: ParticipantSourceType.UNIT,
            side: 'ally',
            quantity: 1,
        },
        {
            id: units[1].id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 1,
        },
    ];

    const b2 = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ контроль без гравців',
            status: 'prepared',
            participants: dmOnly as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b2.id;
    state = await readState();
    await call('start', START);

    const au = P().filter(
        (p) => p.basicInfo.side === 'ally' && p.basicInfo.sourceType === 'unit'
    );

    const rr = await call('unit-control', UNIT_CONTROL, { mode: 'random' });

    tcheck(
        'Без гравців «роздати випадково» відхиляється',
        rr.status >= 400,
        `${rr.status}`
    );
    tcheck(
        'Сторона лише з героями DM: союзні юніти під DM',
        au.length > 0 && au.every((x) => x.basicInfo.controlledBy === 'dm'),
        au
            .map((x) => `${x.basicInfo.name}→${x.basicInfo.controlledBy}`)
            .join(', ')
    );
    await prisma.character.update({
        where: { id: top.id },
        data: { level: HERO_LEVEL },
    });
}

async function level5Check(spells: Map<string, any>) {
    const races = await prisma.race.findMany({
        where: { campaignId: ctx.campaignId },
    });

    for (const h of heroRows) {
        const race = races.find((r) => r.name === h.race);

        h.slots = fullSpellSlots(
            9,
            (race?.spellSlotProgression as any) ?? [],
            campaign.maxLevel ?? 20
        );
        await prisma.character.update({
            where: { id: h.id },
            data: { level: 9, spellSlots: h.slots as any },
        });
    }

    // раси, на які діють усі закляття (Слово світла не карає Людей, Ельфів, Гномів і Магів)
    const exposed = new Set(
        races
            .filter((r) =>
                ['Демони', 'Некроманти', 'Темні ельфи'].includes(r.name)
            )
            .map((r) => r.id)
    );

    const easy = (
        await prisma.unit.findMany({ where: { campaignId: ctx.campaignId } })
    )
        .filter(
            (u: any) =>
                exposed.has(u.raceId) &&
                !/дракон|титан|ліч|аватар|диявол|архідемон/i.test(u.name)
        )
        .slice(0, 3)
        .map((u: any) => u.id);

    const plan: Array<[number, string, string]> = [
        [0, 'Світло', 'Лорд Годрик Єдиноріг'],
        [0, 'Хаос', 'Зехір'],
        [0, 'Природа', 'Айвен'],
        [1, 'Темрява', 'Аграїл'],
    ];

    for (const [rot, school, casterName] of plan) {
        await applyRotation(rot);

        const owner = hero(casterName);

        const list = [...spells.values()].filter(
            (s: any) => s.level === 5 && s.spellGroup?.name === school
        );

        for (const sp of list) {
            battleLabel = `L5 ${sp.name}`;

            const setup = [
                ...heroRows.map((h) => ({
                    id: h.id,
                    type: ParticipantSourceType.CHARACTER,
                    side: 'ally',
                })),
                ...easy.map((id) => ({
                    id,
                    type: ParticipantSourceType.UNIT,
                    side: 'enemy',
                    quantity: 1,
                })),
            ];

            const b = await createTestBattle({
                data: {
                    campaignId: ctx.campaignId,
                    name: `ТЕСТ ${battleLabel}`,
                    status: 'prepared',
                    participants: setup as any,
                    currentRound: 1,
                    currentTurnIndex: 0,
                },
            });

            ctx.battleId = b.id;
            state = await readState();
            await call('start', START);
            await untilTurnOf((p) => p.basicInfo.name === casterName);

            const me = byName(casterName);

            const knows = (me.spellcasting?.knownSpells ?? []).includes(sp.id);

            if ((sp.targeting?.kind ?? '').includes('Dead'))
                await call(
                    'participants',
                    PATCH(byName('Семгрун').basicInfo.id),
                    { kill: true }
                );

            for (const p of friendsOf(me))
                await call('participants', PATCH(p.basicInfo.id), {
                    currentHp: Math.max(1, Math.floor(p.combatStats.maxHp / 2)),
                });

            const targets = spellTargets(byName(casterName), sp);

            const dice = casterSpellDice(
                byName(casterName),
                {
                    dice: sp.dice ?? 0,
                    groupId: sp.groupId ?? null,
                },
                DEFAULT_RULES
            );

            const before = snap(P().map((p: any) => p.basicInfo.id));

            const n0 = P().length;

            const slot0 =
                byName(casterName).spellcasting.spellSlots['5']?.current;

            const r = await call(
                'spell',
                SPELL,
                {
                    casterId: me.basicInfo.id,
                    spellId: sp.id,
                    targetIds: targets === 'needDead' ? [] : targets,
                    diceRolls: dice.count
                        ? rollDiceList(`${dice.count}d${dice.sides}`, rng)
                        : [],
                },
                owner.controlledBy
            );

            const slot1 =
                byName(casterName).spellcasting.spellSlots['5']?.current;

            const after = snap(P().map((p: any) => p.basicInfo.id));

            const saved = r.log.some((e: any) =>
                /рятівний кидок [^|]*— успіх(\s\||$)/.test(resultTextOf(e))
            );

            const changed =
                [...before.keys()].some(
                    (id) => before.get(id) !== after.get(id)
                ) ||
                P().length !== n0 ||
                saved;

            tcheck(
                `L5 ${school}: ${sp.name} (${casterName}, гравець)`,
                knows && r.status === 200 && slot1 === slot0 - 1 && changed,
                `знає=${knows} статус=${r.status} слот 5: ${slot0}→${slot1} зміни=${changed}; ${
                    r.status === 200
                        ? r.log
                              .map((e: any) => resultTextOf(e))
                              .join(' | ')
                              .slice(0, 220)
                        : JSON.stringify(r.body).slice(0, 200)
                }`
            );
        }
    }
    // другий каст 5-го рівня в тому ж бою — немає слота
    await call('next-turn', NEXT);
    await untilTurnOf((p) => p.basicInfo.name === 'Аграїл');

    const sp2 = [...spells.values()].find((s: any) => s.name === 'Вампіризм');

    const ag = hero('Аграїл');

    const r2 = await call(
        'spell',
        SPELL,
        {
            casterId: byName('Аграїл').basicInfo.id,
            spellId: sp2.id,
            targetIds: [byName('Аграїл').basicInfo.id],
            diceRolls: [],
        },
        ag.controlledBy
    );

    tcheck(
        'Другий каст 5-го рівня без слота відхиляється',
        r2.status === 422 &&
            JSON.stringify(r2.body).includes(API_ERRORS.BATTLE_NO_FREE_SLOT),
        `${r2.status} ${JSON.stringify(r2.body).slice(0, 150)}`
    );

    // Аватар Маркела
    await applyRotation(0);
    battleLabel = 'Аватар';

    const setup = [
        ...heroRows.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        ...easy.map((id) => ({
            id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 1,
        })),
    ];

    const b = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ Аватар',
            status: 'prepared',
            participants: setup as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b.id;
    state = await readState();
    await call('start', START);
    await untilTurnOf((p) => p.basicInfo.name === 'Маркел');

    const av = [...spells.values()].find((s: any) => s.name === 'Аватар');

    const mk = byName('Маркел');

    const knowsAv = (mk.spellcasting?.knownSpells ?? []).includes(av.id);

    const ids0 = new Set(P().map((p: any) => p.basicInfo.id));

    const ra = await call('spell', SPELL, {
        casterId: mk.basicInfo.id,
        spellId: av.id,
        targetIds: [],
        diceRolls: [],
    });

    const fresh = P().filter((p: any) => !ids0.has(p.basicInfo.id));

    tcheck(
        'Аватар: Маркел знає закляття і прикликає Аватара Смерті під своїм контролером',
        knowsAv &&
            ra.status === 200 &&
            fresh.some(
                (p: any) =>
                    /Аватар Смерті/.test(p.basicInfo.name) &&
                    p.basicInfo.controlledBy === mk.basicInfo.controlledBy &&
                    p.basicInfo.side === 'ally'
            ),
        `знає=${knowsAv} ${ra.status} нові: ${fresh.map((p: any) => `${p.basicInfo.name} (${p.basicInfo.side}, ${p.basicInfo.controlledBy.slice(0, 8)}) HP ${p.combatStats.maxHp}`).join(', ')}; ${ra.log
            .map((e: any) => resultTextOf(e))
            .join(' | ')
            .slice(0, 200)}`
    );
    for (const h of heroRows)
        await prisma.character.update({
            where: { id: h.id },
            data: {
                level: HERO_LEVEL,
                spellSlots: fullSpellSlots(
                    HERO_LEVEL,
                    ((
                        await prisma.race.findFirst({
                            where: { campaignId: ctx.campaignId, name: h.race },
                        })
                    )?.spellSlotProgression as any) ?? [],
                    campaign.maxLevel ?? 20
                ) as any,
            },
        });
}

// Аура страху Кошмару: зона на двох героях, решта без штрафу; гравець не може задати зону ворожому юніту
async function auraZoneCheck() {
    await applyRotation(0);
    battleLabel = 'Зона аури';

    const nightmare = await prisma.unit.findFirst({
        where: { campaignId: ctx.campaignId, name: 'Кошмар' },
    });

    if (!nightmare) return tcheck('Зона аури', false, 'немає юніта Кошмар');

    const setup = [
        ...heroRows.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        {
            id: nightmare.id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 1,
        },
    ];

    const b = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ Зона аури',
            status: 'prepared',
            participants: setup as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b.id;
    state = await readState();
    await call('start', START);

    const heroes = P().filter((p) => p.basicInfo.side === 'ally');

    const armorBefore = heroes.map((h) =>
        statWithModifiers(P(), h.basicInfo.id, 'armor', 10)
    );

    await untilTurnOf((p) => p.basicInfo.name.startsWith('Кошмар'));

    const nm = current();

    const pending = pendingAreaAuras(P(), nm.basicInfo.id, state.currentRound);

    const zone = heroes.slice(0, 2).map((h) => h.basicInfo.id);

    const asPlayer = await call(
        'aura-zone',
        AURA_ZONE,
        {
            participantId: nm.basicInfo.id,
            auraId: pending[0]?.id,
            targetIds: zone,
        },
        heroRows.find((h) => h.controlledBy !== dmId)?.controlledBy ?? 'nobody'
    );

    const r = await call('aura-zone', AURA_ZONE, {
        participantId: nm.basicInfo.id,
        auraId: pending[0]?.id,
        targetIds: zone,
    });

    const members = zoneMembers(P(), nm.basicInfo.id, pending[0]?.id ?? '').ids;

    const inZone = (id: string) =>
        (byId(id).battleData.activeEffects ?? []).some(
            (e: any) =>
                e.zone?.ownerId === nm.basicInfo.id &&
                e.abilityEffects?.some((x: any) => x.stat === 'morale')
        );

    const outside = heroes.slice(2).every((h) => !inZone(h.basicInfo.id));

    const armorSame = heroes.every(
        (h, i) =>
            statWithModifiers(P(), h.basicInfo.id, 'armor', 10) ===
            armorBefore[i]
    );

    tcheck(
        'Зона аури: Кошмар задає зону, штраф моралі лише на обраних',
        pending.length === 1 &&
            asPlayer.status === 403 &&
            r.status === 200 &&
            members.join() === zone.join() &&
            zone.every(inZone) &&
            outside &&
            armorSame &&
            pendingAreaAuras(P(), nm.basicInfo.id, state.currentRound)
                .length === 0,
        `аур=${pending.length} гравець=${asPlayer.status} DM=${r.status} у зоні: ${members.map((id) => byId(id).basicInfo.name).join(', ')}; ${r.log.map((e: any) => resultTextOf(e)).join(' | ')}`
    );
}

async function reserveCheck() {
    await applyRotation(0);
    battleLabel = 'Резерв';

    const [front, back] = await prisma.unit.findMany({
        where: { campaignId: ctx.campaignId },
        take: 2,
    });

    const setup = [
        ...heroRows.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        {
            id: front.id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 1,
        },
        {
            id: back.id,
            type: ParticipantSourceType.UNIT,
            side: 'enemy',
            quantity: 2,
            reserved: 2,
        },
    ];

    const b = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ Резерв',
            status: 'prepared',
            participants: setup as any,
            map: { cols: 12, rows: 8, background: null, opacity: 0.5 },
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b.id;
    state = await readState();
    await call('start', START);

    const reserve = () =>
        (state.pendingSummons ?? []).filter((p: any) => p.battleData.reserved);

    const startedOk =
        P().length === heroRows.length + 1 &&
        reserve().length === 2 &&
        reserve().every((p: any) => p.battleData.hpMultiplier !== undefined);

    const before = current().basicInfo.id;

    const revealedId = reserve()[0].basicInfo.id;

    const r = await call('reveal-participant', REVEAL, {
        participantIds: [revealedId],
    });

    const placedAt = byId(revealedId)?.battleData.position;

    const occupied = P()
        .filter((p) => p.basicInfo.id !== revealedId && p.battleData.position)
        .some((p) =>
            cellsOf(p).some((c) => c.x === placedAt?.x && c.y === placedAt?.y)
        );

    tcheck(
        'Резерв на карті: введений отримує вільну клітинку',
        r.status === 200 && !!placedAt && !occupied,
        `reveal=${r.status} позиція=${JSON.stringify(placedAt)} зайнята=${occupied}`
    );

    await nextOnly();

    const actedNext =
        current().basicInfo.id === revealedId && before !== revealedId;

    for (const e of P().filter((p) => p.basicInfo.side === 'enemy' && alive(p)))
        await call('participants', KILL(e.basicInfo.id), { kill: true });

    const awaitingOk = state.status === 'active' && reserve().length === 1;

    const blocked = await call('next-turn', NEXT);

    const r2 = await call('reveal-participant', REVEAL, {
        participantIds: [reserve()[0].basicInfo.id],
    });

    tcheck(
        'Резерв: старт, введення, очікування рішення ДМ',
        startedOk &&
            r.status === 200 &&
            actedNext &&
            awaitingOk &&
            blocked.status === 422 &&
            JSON.stringify(blocked.body).includes(
                API_ERRORS.BATTLE_AWAITING_DM
            ) &&
            r2.status === 200 &&
            state.status === 'active',
        `старт=${startedOk} reveal=${r.status} ходить-наступним=${actedNext} очікування=${awaitingOk} next-turn=${blocked.status} reveal2=${r2.status}`
    );
}

async function mapCheck(spells: Map<string, any>) {
    await applyRotation(0);
    battleLabel = 'Карта';

    const units = interleaveByRace(
        await prisma.unit.findMany({
            where: { campaignId: ctx.campaignId },
            select: { id: true, raceId: true },
        })
    ).slice(0, 4);

    const setup = [
        ...heroRows.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        ...units.map((id, i) => ({
            id,
            type: ParticipantSourceType.UNIT,
            side: i === 3 ? 'ally' : 'enemy',
            quantity: 1,
        })),
    ];

    const b = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ Карта',
            status: 'prepared',
            participants: setup as any,
            map: { cols: 12, rows: 8, background: null, opacity: 0.5 },
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b.id;
    state = await readState();
    await call('start', START);

    const posOf = (p: any) =>
        p.battleData.position as { x: number; y: number } | undefined;

    const isHero = (p: any) => p.basicInfo.side === 'ally' && alive(p);

    const placed = P()
        .filter(alive)
        .every((p) => posOf(p));

    tcheck(
        'Карта: розстановка після старту',
        placed,
        `${P().filter((p) => posOf(p)).length}/${P().length} учасників мають позицію`
    );

    await untilTurnOf(isHero);

    const mover = current();

    const from = posOf(mover);

    const taken = new Set(
        P()
            .filter(alive)
            .map((p) => `${posOf(p)?.x}:${posOf(p)?.y}`)
    );

    const near = from
        ? [-1, 0, 1]
              .flatMap((dx) =>
                  [-1, 0, 1].map((dy) => ({ x: from.x + dx, y: from.y + dy }))
              )
              .filter(
                  (c) =>
                      (c.x !== from.x || c.y !== from.y) &&
                      c.x >= 0 &&
                      c.y >= 0 &&
                      c.x < 12 &&
                      c.y < 8 &&
                      !taken.has(`${c.x}:${c.y}`)
              )
        : [];

    let mv: Awaited<ReturnType<typeof call>> | undefined;

    for (const c of near) {
        mv = await call('move', MOVE, {
            participantId: mover.basicInfo.id,
            to: c,
        });

        if (mv.status === 200) break;
    }

    const to = posOf(byId(mover.basicInfo.id));

    tcheck(
        'Карта: рух на сусідню клітинку',
        mv?.status === 200 &&
            !!from &&
            !!to &&
            (to.x !== from.x || to.y !== from.y),
        `${mover.basicInfo.name} ${JSON.stringify(from)} → ${JSON.stringify(to)}, статус ${mv?.status ?? 'немає вільної клітинки'}${mv && mv.status !== 200 ? ` ${JSON.stringify(mv.body).slice(0, 150)}` : ''}`
    );

    const dist = (a: any, c: any) =>
        Math.max(
            Math.abs(a.battleData.position.x - c.battleData.position.x),
            Math.abs(a.battleData.position.y - c.battleData.position.y)
        );

    const meleeOk = await untilTurnOf(
        (p) =>
            isHero(p) &&
            !p.actionFlags.hasUsedAction &&
            p.battleData.attacks?.some((a: any) =>
                /melee|ближн/i.test(a.type ?? '')
            ) &&
            foesOf(p).some((f) => dist(p, f) > 1)
    );

    const att = current();

    const w = att.battleData.attacks?.find((a: any) =>
        /melee|ближн/i.test(a.type ?? '')
    );

    const far = foesOf(att).find((f) => dist(att, f) > 1);

    const rm =
        meleeOk && w && far
            ? await call('attack', ATTACK, {
                  attackerId: att.basicInfo.id,
                  targetId: far.basicInfo.id,
                  attackId: w.id,
                  d20Roll: 15,
                  disadvantageRoll: 15,
                  advantageRoll: 15,
                  damageRolls: [],
                  endTurn: false,
              })
            : null;

    tcheck(
        'Карта: ближня атака не дістає далекої цілі',
        rm?.status === 422 &&
            JSON.stringify(rm.body).includes(REJECT.targetNotNear),
        `${att.basicInfo.name} → ${far?.basicInfo.name}: ${rm?.status ?? 'немає сценарію'} ${rm ? JSON.stringify(rm.body).slice(0, 150) : ''}`
    );

    const fire = [...spells.values()].find(
        (s: any) => s.name === 'Вогняна куля'
    );

    const caster = current();

    const foe = foesOf(caster)[0];

    const targetCell = posOf(foe);

    const fdice =
        fire &&
        casterSpellDice(
            caster,
            {
                dice: fire.dice ?? 0,
                groupId: fire.groupId ?? null,
            },
            DEFAULT_RULES
        );

    // мінімальні кубики — щоб куля не завершила бій до перевірки небезпеки
    const fr =
        fire && fdice && foe && targetCell
            ? await call('spell', SPELL, {
                  casterId: caster.basicInfo.id,
                  spellId: fire.id,
                  targetIds: [],
                  targetCell,
                  diceRolls: Array.from({ length: fdice.count }, () => 1),
                  free: true,
              })
            : null;

    const cast = fr?.log.find((e: any) => e.actionType === 'spell');

    const aim = cast?.actionDetails?.aimCell;

    const hitIds: string[] = (cast?.targets ?? []).map(
        (t: any) => t.participantId
    );

    tcheck(
        'Карта: шаблон «Вогняна куля» по клітинці',
        fr?.status === 200 &&
            aim?.x === targetCell?.x &&
            aim?.y === targetCell?.y &&
            !!foe &&
            hitIds.includes(foe.basicInfo.id),
        `${fr?.status ?? 'немає закляття/цілі'} aimCell=${JSON.stringify(aim)} ціль ${foe?.basicInfo.name} у ${JSON.stringify(targetCell)}; цілей: ${hitIds.length}${fr && fr.status !== 200 ? ` ${JSON.stringify(fr.body).slice(0, 200)}` : ''}`
    );

    await mapRingAndEmptyCheck(spells);

    const hazardName =
        "Карта: небезпека б'є на початку ходу й пишеться в журнал";

    if (state.status !== 'active')
        return tskip(
            hazardName,
            `бій уже не активний (${state.status}) після «Вогняної кулі»`
        );

    const victim = P()
        .filter(isHero)
        .find((p) => p.basicInfo.id !== current().basicInfo.id && posOf(p));

    const cell = victim && posOf(victim);

    const tr = cell
        ? await call('map-terrain', MAP_TERRAIN, {
              cells: [`${cell.x}:${cell.y}`],
              terrain: {
                  kind: 'hazard',
                  label: 'Жар',
                  damage: { dice: '1d4', type: 'fire' },
              },
          })
        : null;

    const hpBefore = victim?.combatStats.currentHp ?? 0;

    const hazardLogs: any[] = [];

    for (
        let i = 0;
        victim &&
        i < 60 &&
        state.status === 'active' &&
        current().basicInfo.id !== victim.basicInfo.id;
        i++
    ) {
        const r = await call('next-turn', NEXT);

        hazardLogs.push(...r.log);
    }

    const entry = hazardLogs.find((e: any) => e.actionDetails?.hazard);

    const after = victim && byId(victim.basicInfo.id);

    const change = entry?.hpChanges?.[0];

    // change > 0 — шкода (oldHp − newHp), як у решти журналу
    const signOk =
        !!change &&
        change.change === change.oldHp - change.newHp &&
        change.change > 0;

    tcheck(
        hazardName,
        tr?.status === 200 &&
            !!entry &&
            signOk &&
            !!after &&
            after.combatStats.currentHp < hpBefore,
        `${victim?.basicInfo.name} HP ${hpBefore} → ${after?.combatStats.currentHp}; terrain=${tr?.status}; ${entry ? `${resultTextOf(entry)}; hpChanges ${JSON.stringify(change)}` : 'запису hazard немає'}`
    );

    await mapSkillAllCheck(spells);
}

/** Вміння «all» на карті: одиночне вороже заклинання б'є всю ворожу сторону без точки й дальності. */
async function mapSkillAllCheck(spells: Map<string, any>) {
    const name = 'Карта: вміння «all» — уся ворожа сторона без наведення';

    if (state.status !== 'active')
        return tskip(name, `бій не активний (${state.status})`);

    const widenedAll = (p: any, s: any) =>
        s?.targeting?.kind === 'enemy' &&
        spellTargetingFor(P(), p.basicInfo.id, {
            id: s.id,
            groupId: s.groupId ?? null,
            level: s.level,
        }).mode === 'all';

    const found = P()
        .filter((p) => p.basicInfo.side === 'ally' && alive(p))
        .flatMap((p) =>
            (p.spellcasting?.knownSpells ?? [])
                .map((id: string) => spells.get(id))
                .filter((s: any) => widenedAll(p, s))
                .map((s: any) => ({ p, s }))
        )[0];

    if (!found)
        return tskip(
            name,
            'жоден герой не має вміння «all» на відоме вороже заклинання'
        );

    const foes = foesOf(found.p)
        .filter((f) => !f.battleData.airborne)
        .map((f) => f.basicInfo.id as string);

    const dice = casterSpellDice(
        found.p,
        {
            dice: found.s.dice ?? 0,
            groupId: found.s.groupId ?? null,
        },
        DEFAULT_RULES
    );

    const r = await call('spell', SPELL, {
        casterId: found.p.basicInfo.id,
        spellId: found.s.id,
        targetIds: [],
        diceRolls: Array.from({ length: dice.count }, () => 1),
        free: true,
    });

    const cast = r.log.find((e: any) => e.actionType === 'spell');

    const hitIds: string[] = (cast?.targets ?? []).map(
        (t: any) => t.participantId
    );

    const ok =
        r.status === 200 &&
        !cast?.actionDetails?.aimCell &&
        hitIds.length === foes.length &&
        foes.every((id) => hitIds.includes(id));

    tcheck(
        name,
        ok,
        `${found.p.basicInfo.name} «${found.s.name}»: ${r.status}; цілей ${hitIds.length}/${foes.length}${r.status !== 200 ? ` ${JSON.stringify(r.body).slice(0, 200)}` : ''}`
    );
}

/** Кільце «Коло зими» по зайнятому центру й «Вогняна куля» в порожню зону: обидва — каст з aimCell. */
async function mapRingAndEmptyCheck(spells: Map<string, any>) {
    const ringName = 'Карта: кільце «Коло зими» — центр не ціль, кільце — цілі';

    const emptyName =
        'Карта: каст у порожню зону — прийнято, aimCell є, цілей 0';

    const cols = 12;

    const rows = 8;

    const footprint = (p: any) =>
        new Set(cellsOf(p).map((c) => `${c.x}:${c.y}`));

    const near = (c: { x: number; y: number }) =>
        [-1, 0, 1]
            .flatMap((dy) =>
                [-1, 0, 1].map((dx) => ({ x: c.x + dx, y: c.y + dy }))
            )
            .filter((n) => n.x >= 0 && n.y >= 0 && n.x < cols && n.y < rows);

    const onCells = (cells: string[]) =>
        P().filter(
            (p) =>
                alive(p) &&
                p.battleData.position &&
                cellsOf(p).some((c) => cells.includes(`${c.x}:${c.y}`))
        );

    const castAt = async (spell: any, targetCell: { x: number; y: number }) => {
        const caster = current();

        const dice = casterSpellDice(
            caster,
            {
                dice: spell.dice ?? 0,
                groupId: spell.groupId ?? null,
            },
            DEFAULT_RULES
        );

        const r = await call('spell', SPELL, {
            casterId: caster.basicInfo.id,
            spellId: spell.id,
            targetIds: [],
            targetCell,
            diceRolls: Array.from({ length: dice.count }, () => 1),
            free: true,
        });

        const cast = r.log.find((e: any) => e.actionType === 'spell');

        return {
            r,
            aim: cast?.actionDetails?.aimCell,
            hitIds: (cast?.targets ?? []).map(
                (t: any) => t.participantId
            ) as string[],
        };
    };

    const winter = [...spells.values()].find(
        (s: any) => s.name === 'Коло зими'
    );

    if (state.status !== 'active')
        tskip(ringName, `бій не активний (${state.status})`);
    else if (!winter) tskip(ringName, 'закляття «Коло зими» немає в кампанії');
    else {
        const centreOf = P()
            .filter(
                (p) =>
                    alive(p) && p.battleData.position && cellsOf(p).length === 1
            )
            .map((p) => {
                const c = p.battleData.position;

                const ring = near(c)
                    .filter((n) => n.x !== c.x || n.y !== c.y)
                    .map((n) => `${n.x}:${n.y}`);

                return {
                    p,
                    c,
                    ring: onCells(ring).filter(
                        (o) => !footprint(o).has(`${c.x}:${c.y}`)
                    ),
                };
            });

        const pick = centreOf.find((x) => x.ring.length > 0);

        if (!pick) tskip(ringName, 'немає учасника 1×1 із сусідом у кільці');
        else {
            const { r, aim, hitIds } = await castAt(winter, pick.c);

            const ringIds = pick.ring.map((o) => o.basicInfo.id);

            const ok =
                r.status === 200 &&
                aim?.x === pick.c.x &&
                aim?.y === pick.c.y &&
                !hitIds.includes(pick.p.basicInfo.id) &&
                ringIds.every((id) => hitIds.includes(id));

            tcheck(
                ringName,
                ok,
                `${r.status} центр ${pick.p.basicInfo.name} у ${JSON.stringify(pick.c)}; кільце: ${pick.ring.map((o) => o.basicInfo.name).join(', ')}; цілі: ${hitIds.length}; aimCell=${JSON.stringify(aim)}${r.status !== 200 ? ` ${JSON.stringify(r.body).slice(0, 200)}` : ''}`
            );
        }
    }

    const fire = [...spells.values()].find(
        (s: any) => s.name === 'Вогняна куля'
    );

    if (state.status !== 'active')
        return tskip(emptyName, `бій не активний (${state.status})`);

    if (!fire)
        return tskip(emptyName, 'закляття «Вогняна куля» немає в кампанії');

    const all = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => ({ x, y }))
    ).flat();

    const empty = all.find(
        (c) => onCells(near(c).map((n) => `${n.x}:${n.y}`)).length === 0
    );

    if (!empty) return tskip(emptyName, 'немає вільної зони 3×3');

    const { r, aim, hitIds } = await castAt(fire, empty);

    tcheck(
        emptyName,
        r.status === 200 &&
            aim?.x === empty.x &&
            aim?.y === empty.y &&
            hitIds.length === 0,
        `${r.status} точка ${JSON.stringify(empty)}; aimCell=${JSON.stringify(aim)}; цілей ${hitIds.length}${r.status !== 200 ? ` ${JSON.stringify(r.body).slice(0, 200)}` : ''}`
    );
}

async function orchestrate() {
    let profiles: SweepProfile[];

    try {
        profiles = parseTemplateKeys(argv);

        if (CAMPAIGN && profiles.length !== 1)
            throw new Error('--campaign needs --template');
    } catch (e) {
        console.error(`❌ ${(e as Error).message}`);
        process.exit(1);
    }

    const passthrough: string[] = [];

    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--template' || argv[i] === '--out') i++;
        else passthrough.push(argv[i]);
    }

    const before = await snapshotRowCounts();

    const results: SweepRunResult[] = [];

    for (const profile of profiles) {
        console.info(`\n=== ${profile.key} ===`);

        const run = spawnSync(
            process.execPath,
            [
                ...process.execArgv,
                process.argv[1],
                ...passthrough,
                '--template',
                profile.key,
                '--worker',
                '--out',
                join(OUT, profile.key),
            ],
            { stdio: 'inherit', env: process.env }
        );

        results.push({ key: profile.key, exitCode: run.status ?? 1 });
    }

    const drift = diffRowCounts(before, await snapshotRowCounts());

    const lines = [
        ...results.map(
            (r) =>
                `${r.exitCode === 0 ? '✅' : '❌'} ${r.key}: exit ${r.exitCode}`
        ),
        drift.length && !KEEP_BATTLES
            ? `❌ row counts changed after the run:\n${drift.map((d) => `  ${d}`).join('\n')}`
            : '✅ row counts unchanged after the run',
    ];

    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'summary.txt'), lines.join('\n'));
    console.info(`\n${lines.join('\n')}`);
    await prisma.$disconnect();
    process.exit(
        overallExit(results) || (drift.length && !KEEP_BATTLES ? 1 : 0)
    );
}

const failWorker = async (e: unknown) => {
    console.error(e);
    await removeTestBattles().catch(() => undefined);
    await removeSyntheticSpells().catch(() => undefined);
    await templateRun?.cleanup().catch(() => undefined);
    await prisma.$disconnect();
    process.exit(1);
};

if (WORKER) PROFILE = parseTemplateKeys(argv)[0];

(WORKER ? main() : orchestrate()).catch(failWorker);

// ---------- лабіринт ----------
const mazeGrid = (): MazeGrid => mazeGridOf(state.map) as MazeGrid;

const posOf = (p: any) =>
    p.battleData.position as { x: number; y: number } | undefined;

const onField = (p: any) => onMazeField(p);

const isMazeAlly = (p: any) => p.basicInfo.side === 'ally' && onField(p);

/** Вільна для кроку клітинка: не зайнята учасником на полі, не вихід і не телепорт. */
const freeMazeCell = (key: string) =>
    !featureKeys(mazeGrid().maze).has(key) &&
    !P()
        .filter(onField)
        .some((p) => cellKey(posOf(p) as any) === key);

const logText = (log: any[]) =>
    log.map((e: any) => resultTextOf(e) ?? '').join(' | ');

/** Сплять рівно ті вороги, яких не бачить жоден герой. */
function sleepersMatchSight() {
    const grid = mazeGrid();

    const watchers = P()
        .filter((p) => isMazeHero(p) && viewpointOf(p))
        .map((p) => ({
            at: posOf(p) as any,
            vision: mazeVision(grid, viewpointOf(p) as any),
        }));

    const enemies = P().filter(
        (p) => p.basicInfo.side === 'enemy' && onField(p)
    );

    const bad = enemies.filter(
        (e) =>
            !!e.battleData.dormant ===
            watchers.some((w) =>
                seesParticipant(grid, w.vision, w.at, posOf(e) as any)
            )
    );

    return {
        ok: bad.length === 0,
        detail: bad.map((e) => e.basicInfo.name).join(', '),
    };
}

/** Стоячий на шляху учасник (прокинутий ворог не рухається сам) — ДМ переставляє його подалі від виходу. */
async function mazeClearBlocker(mover: any) {
    const grid = mazeGrid();

    const walls = wallSet(grid.maze);

    const exitDist = mazeDistances(grid, [grid.maze.exit as any]);

    const at = posOf(mover) as any;

    const here = exitDist.get(cellKey(at)) ?? Infinity;

    const occupied = new Map(
        P()
            .filter(onField)
            .map((p) => [cellKey(posOf(p) as any), p])
    );

    const blocker = neighbors(at)
        .filter(
            (n) =>
                canStep(grid, walls, at, n) &&
                (exitDist.get(cellKey(n)) ?? Infinity) < here
        )
        .map((n) => occupied.get(cellKey(n)))
        .find(Boolean);

    const spot = [...exitDist.entries()]
        .filter(([k]) => freeMazeCell(k))
        .sort((a, b) => b[1] - a[1])[0];

    if (!blocker || !spot) return false;

    return (
        (
            await call('move', MOVE, {
                participantId: blocker.basicInfo.id,
                to: parseCellKey(spot[0]),
                free: true,
            })
        ).status === 200
    );
}

async function mazeStepToExit(
    mover: any,
    retry = true
): Promise<Awaited<ReturnType<typeof call>> | null> {
    const grid = mazeGrid();

    const exitDist = mazeDistances(grid, [grid.maze.exit as any]);

    const teleports = new Set(grid.maze.teleports.flat().map(cellKey));

    const reach = [
        ...mazeReachable(grid, {
            participants: P(),
            mover,
            budget: mazeBudgetLeft(mover),
        }).entries(),
    ].filter(([k]) => exitDist.has(k));

    const here = exitDist.get(cellKey(posOf(mover) as any)) ?? Infinity;

    const best = reach.sort(
        (a, b) =>
            (exitDist.get(a[0]) as number) - (exitDist.get(b[0]) as number) ||
            Number(teleports.has(a[0])) - Number(teleports.has(b[0]))
    )[0];

    if (!best || (exitDist.get(best[0]) as number) >= here)
        return retry && (await mazeClearBlocker(mover))
            ? mazeStepToExit(byId(mover.basicInfo.id), false)
            : null;

    return call('move', MOVE, {
        participantId: mover.basicInfo.id,
        to: parseCellKey(best[0]),
    });
}

async function mazeWalkAllies(maxTurns: number) {
    for (let i = 0; i < maxTurns && state.status === 'active'; i++) {
        if (!P().some(isMazeAlly)) return;

        const c = current();

        const moved = isMazeAlly(c) ? await mazeStepToExit(c) : null;

        if (
            !(moved && moved.status === 200 && c.battleData.escaped) &&
            state.status === 'active' &&
            current()?.basicInfo.id === c.basicInfo.id
        )
            await call('next-turn', NEXT);
    }
}

async function mazeCheck() {
    await applyRotation(0);
    battleLabel = 'Лабіринт';

    const allyHeroes = heroRows
        .filter((h, i, all) => all.findIndex((x) => x.race === h.race) === i)
        .slice(0, 2);

    const enemyHero = heroRows.find((h) => !allyHeroes.includes(h));

    const units = interleaveByRace(
        await prisma.unit.findMany({
            where: { campaignId: ctx.campaignId },
            select: { id: true, raceId: true },
        })
    ).slice(0, 4);

    const setup = [
        ...allyHeroes.map((h) => ({
            id: h.id,
            type: ParticipantSourceType.CHARACTER,
            side: 'ally',
        })),
        ...(enemyHero
            ? [
                  {
                      id: enemyHero.id,
                      type: ParticipantSourceType.CHARACTER,
                      side: 'enemy',
                  },
              ]
            : []),
        ...units.map((id, i) => ({
            id,
            type: ParticipantSourceType.UNIT,
            side: i === 3 ? 'ally' : 'enemy',
            quantity: 1,
        })),
    ];

    const b = await createTestBattle({
        data: {
            campaignId: ctx.campaignId,
            name: 'ТЕСТ Лабіринт',
            status: 'prepared',
            participants: setup as any,
            map: {
                cols: 14,
                rows: 10,
                background: null,
                opacity: 0.5,
                maze: emptyMaze('medium'),
            } as any,
            currentRound: 1,
            currentTurnIndex: 0,
        },
    });

    ctx.battleId = b.id;
    state = await readState();
    await call('start', START);

    const enemies = () => P().filter((p) => p.basicInfo.side === 'enemy');

    tcheck(
        'Лабіринт: після старту вороги сплять',
        enemies().length > 0 && enemies().every((e) => e.battleData.dormant),
        `сплять ${enemies().filter((e) => e.battleData.dormant).length}/${enemies().length}; ворожий герой ${enemyHero ? 'є' : 'немає'}`
    );

    const gen = await call('maze', MAZE, {
        op: 'generate',
        difficulty: 'medium',
        teleportPairs: 2,
        fogPatches: 2,
        exit: null,
    });

    const maze = state.map?.maze;

    tcheck(
        'Лабіринт: генерація (вихід, 2 телепорти, туман, усі досяжні до виходу)',
        gen.status === 200 &&
            !!maze?.exit &&
            maze.teleports.length === 2 &&
            maze.fog.length >= 2 &&
            allReachExit(
                mazeGrid(),
                P()
                    .filter(onField)
                    .map((p) => posOf(p) as any)
            ),
        `${gen.status} вихід ${JSON.stringify(maze?.exit)} телепортів ${maze?.teleports?.length} туман ${maze?.fog?.length}${gen.status !== 200 ? ` ${JSON.stringify(gen.body).slice(0, 200)}` : ''}`
    );

    if (gen.status !== 200 || !maze?.exit) return;

    const watcher =
        P().find(
            (p) =>
                isMazeAlly(p) &&
                p.basicInfo.sourceType !== ParticipantSourceType.UNIT
        ) ?? P().find(isMazeAlly);

    const sleeper = enemies().find((e) => e.battleData.dormant && posOf(e));

    const stepNear = (w: any) =>
        neighbors(posOf(w) as any).find(
            (n) =>
                inBounds(state.map, n) &&
                freeMazeCell(cellKey(n)) &&
                canStep(
                    mazeGrid(),
                    wallSet(mazeGrid().maze),
                    posOf(w) as any,
                    n
                )
        );

    const nearCell = [watcher, ...P().filter(isMazeAlly)]
        .filter(Boolean)
        .map(stepNear)
        .find(Boolean);

    const home = sleeper && posOf(sleeper);

    const wake =
        sleeper && nearCell
            ? await call('move', MOVE, {
                  participantId: sleeper.basicInfo.id,
                  to: nearCell,
                  free: true,
              })
            : null;

    tcheck(
        'Лабіринт: ворог у полі зору прокидається, подія «помітив»',
        !!wake &&
            wake.status === 200 &&
            !byId(sleeper.basicInfo.id).battleData.dormant &&
            /помітив/.test(logText(wake.log)),
        `${sleeper?.basicInfo.name}: ${wake?.status ?? 'немає сценарію'} ${wake ? logText(wake.log).slice(0, 150) : ''}`
    );

    if (wake?.status === 200 && home)
        await call('move', MOVE, {
            participantId: sleeper.basicInfo.id,
            to: home,
            free: true,
        });

    await untilTurnOf(isMazeAlly);

    const wallCellOf = (h: any) => {
        const g = mazeGrid();

        const w = wallSet(g.maze);

        const from = mazeDistances(g, [posOf(h) as any]);

        return neighbors(posOf(h) as any).find(
            (n) =>
                inBounds(state.map, n) &&
                !canStep(g, w, posOf(h) as any, n) &&
                (from.get(cellKey(n)) ?? Infinity) > MAZE_STEPS_PER_TURN &&
                !P()
                    .filter(onField)
                    .some((p) => cellKey(posOf(p) as any) === cellKey(n))
        );
    };

    let hero = current();

    let blockedCell = wallCellOf(hero);

    for (
        let attempt = 0;
        attempt < 6 && !blockedCell && state.status === 'active';
        attempt++
    ) {
        await nextOnly();
        await untilTurnOf(isMazeAlly);
        hero = current();
        blockedCell = wallCellOf(hero);
    }

    const grid = mazeGrid();

    const wallMove = blockedCell
        ? await call('move', MOVE, {
              participantId: hero.basicInfo.id,
              to: blockedCell,
          })
        : null;

    if (wallMove)
        tcheck(
            'Лабіринт: крок крізь стіну → 422',
            wallMove.status === 422 &&
                JSON.stringify(wallMove.body).includes(MAZE_TEXTS.moveBlocked),
            `${hero.basicInfo.name} → ${JSON.stringify(blockedCell)}: ${wallMove.status}`
        );
    else
        tskip(
            'Лабіринт: крок крізь стіну → 422',
            'за стіною від героя немає клітинки без обходу ≤ 3 кроків'
        );

    const dist4 = [...mazeDistances(grid, [posOf(hero) as any]).entries()].find(
        ([k, d]) => d === MAZE_STEPS_PER_TURN + 1 && freeMazeCell(k)
    );

    const far =
        dist4 &&
        (await call('move', MOVE, {
            participantId: hero.basicInfo.id,
            to: parseCellKey(dist4[0]),
        }));

    if (far)
        tcheck(
            'Лабіринт: 4-й крок за хід → 422',
            far.status === 422 &&
                JSON.stringify(far.body).includes(MAZE_TEXTS.moveBlocked),
            `${hero.basicInfo.name} → ${dist4[0]}: ${far.status}`
        );
    else
        tskip(
            'Лабіринт: 4-й крок за хід → 422',
            'немає клітинки на відстані 4'
        );

    const mark = await call('maze-mark', MAZE_MARK, {
        participantId: hero.basicInfo.id,
        symbol: 'star',
    });

    const markKey = cellKey(posOf(byId(hero.basicInfo.id)) as any);

    tcheck(
        "Лабіринт: мітка гравця з'являється на клітинці",
        mark.status === 200 &&
            state.map.maze.marks?.[markKey]?.symbol === 'star',
        `${mark.status} ${markKey}${mark.status !== 200 ? ` ${JSON.stringify(mark.body).slice(0, 150)}` : ''}`
    );

    const step = await mazeStepToExit(byId(hero.basicInfo.id));

    tcheck(
        'Лабіринт: кроки до виходу (≤3 за хід)',
        !!step &&
            step.status === 200 &&
            (byId(hero.basicInfo.id).battleData.movementUsed ?? 0) <= 3,
        `${step?.status ?? 'немає прогресу'} витрачено ${byId(hero.basicInfo.id).battleData.movementUsed}`
    );

    const usedBeforeOver = byId(hero.basicInfo.id).battleData.movementUsed ?? 0;

    const over = await call('move', MOVE, {
        participantId: hero.basicInfo.id,
        to: neighbors(posOf(byId(hero.basicInfo.id)) as any).find(
            (n) =>
                canStep(
                    mazeGrid(),
                    wallSet(mazeGrid().maze),
                    posOf(byId(hero.basicInfo.id)) as any,
                    n
                ) &&
                !P()
                    .filter(onField)
                    .some((p) => cellKey(posOf(p) as any) === cellKey(n))
        ) ?? { x: 0, y: 0 },
    });

    if (
        usedBeforeOver >= 3 &&
        state.currentTurnIndex !== undefined &&
        current().basicInfo.id === hero.basicInfo.id
    )
        tcheck(
            'Лабіринт: ліміт кроків вичерпано → 422',
            over.status === 422 &&
                JSON.stringify(over.body).includes(MAZE_TEXTS.moveBlocked),
            `${over.status} ${JSON.stringify(over.body).slice(0, 120)}`
        );

    await untilTurnOf(isMazeAlly);

    const darkHero = current();

    const attacker = byId(darkHero.basicInfo.id);

    const foe = foesOf(attacker)[0];

    const atkBody = {
        attackerId: attacker.basicInfo.id,
        targetId: foe?.basicInfo.id,
        attackId: attacker.battleData.attacks?.[0]?.id ?? 'x',
        d20Roll: 10,
        disadvantageRoll: 10,
        advantageRoll: 10,
        damageRolls: [],
        endTurn: false,
    };

    await call('maze', MAZE, { op: 'dark', on: true });

    const darkAtk = await call('attack', ATTACK, atkBody);

    const darkNext = await call('next-turn', NEXT);

    tcheck(
        'Лабіринт: темрява блокує атаку (422), next-turn пропускає хід',
        darkAtk.status === 422 &&
            JSON.stringify(darkAtk.body).includes(API_ERRORS.MAZE_DARK) &&
            darkNext.status === 200 &&
            logText(darkNext.log).includes('Темрява — хід пропущено'),
        `атака ${darkAtk.status} ${JSON.stringify(darkAtk.body).slice(0, 100)}; next-turn ${darkNext.status} ${logText(darkNext.log).slice(0, 100)}`
    );

    const darkOff = await call('maze', MAZE, { op: 'dark', on: false });

    tcheck(
        'Лабіринт: темряву вимкнено',
        darkOff.status === 200 && state.map.maze.dark === false,
        `${darkOff.status}`
    );

    const exitBefore = JSON.stringify(state.map.maze.exit);

    const rw = await call('maze', MAZE, {
        op: 'reshuffle',
        mode: 'walls',
        teleportPairs: 2,
        fogPatches: 2,
    });

    const sleepW = sleepersMatchSight();

    tcheck(
        'Лабіринт: перетасовка стін — той самий вихід, невидимі вороги сплять',
        rw.status === 200 &&
            JSON.stringify(state.map.maze.exit) === exitBefore &&
            allReachExit(
                mazeGrid(),
                P()
                    .filter(onField)
                    .map((p) => posOf(p) as any)
            ) &&
            sleepW.ok,
        `${rw.status} вихід ${exitBefore === JSON.stringify(state.map.maze.exit) ? 'той самий' : 'інший'}; невідповідність сну: ${sleepW.detail || 'немає'}${rw.status !== 200 ? ` ${JSON.stringify(rw.body).slice(0, 150)}` : ''}`
    );

    const rs = await call('maze', MAZE, {
        op: 'reshuffle',
        mode: 'scatter',
        teleportPairs: 2,
        fogPatches: 2,
    });

    const cells = P()
        .filter(onField)
        .map((p) => posOf(p) as any);

    const minGap = Math.min(
        ...cells.flatMap((a, i) =>
            cells.slice(i + 1).map((c) => cellDistance(a, c))
        )
    );

    const sleepS = sleepersMatchSight();

    tcheck(
        `Лабіринт: розкидання — відстань між учасниками ≥ ${MAZE_SCATTER_MIN_GAP}`,
        rs.status === 200 &&
            minGap >= MAZE_SCATTER_MIN_GAP &&
            allReachExit(mazeGrid(), cells) &&
            sleepS.ok,
        `${rs.status} мін. відстань ${minGap}; невідповідність сну: ${sleepS.detail || 'немає'}${rs.status !== 200 ? ` ${JSON.stringify(rs.body).slice(0, 150)}` : ''}`
    );

    await mazeTunnelCheck();

    await mazeWalkAllies(120);

    const allies = P().filter((p) => p.basicInfo.side === 'ally' && alive(p));

    const escapedAll =
        allies.length > 0 && allies.every((p) => p.battleData.escaped);

    const awaiting = checkVictoryConditions(P()).awaiting;

    tcheck(
        'Лабіринт: усі союзники вибралися → очікування рішення ДМ',
        escapedAll && awaiting === 'victory' && state.status === 'active',
        `вибралися ${allies.filter((p) => p.battleData.escaped).length}/${allies.length}; awaiting=${awaiting}; статус ${state.status}`
    );
}

/** «1 тунель»: вороги в резерві, герої рядом у тунелі від центру, вихід у кінці тунелю; якщо ДМ має вирішити — вводить резерв і бій триває. */
async function mazeTunnelCheck() {
    const reserve = () =>
        (state.pendingSummons ?? []).filter((p: any) => p.battleData.reserved);

    const leaving = P()
        .filter(
            (p) =>
                p.basicInfo.side === 'enemy' &&
                p.combatStats.status !== 'dead' &&
                !p.basicInfo.isExtraTurnSlot
        )
        .map((p) => p.basicInfo.id);

    const rt = await call('maze', MAZE, {
        op: 'reshuffle',
        mode: 'tunnel',
        teleportPairs: 0,
        fogPatches: 0,
    });

    const centre = mapCentre(state.map);

    const maze = state.map.maze;

    const heroes = P().filter(isMazeAlly);

    const cells = heroes.map((h) => posOf(h) as any);

    const inLine =
        cells.length > 0 &&
        (cells.every((c) => c.x === centre.x) ||
            cells.every((c) => c.y === centre.y));

    const firstAtExit =
        cells.length > 0 &&
        Math.abs(cells[0].x - maze.exit.x) +
            Math.abs(cells[0].y - maze.exit.y) ===
            1;

    const exitOnLine =
        !!maze.exit && (maze.exit.x === centre.x || maze.exit.y === centre.y);

    const reach = mazeDistances(mazeGrid(), [maze.exit as any]);

    const onExitLine = (k: string) => {
        const c = parseCellKey(k);

        return c.x === maze.exit.x || c.y === maze.exit.y;
    };

    const onlyTunnel =
        cells.every((c) => reach.has(cellKey(c))) &&
        [...reach.keys()].every(onExitLine);

    const inReserve = new Set(reserve().map((p: any) => p.basicInfo.id));

    const enemiesGone =
        leaving.every((id) => inReserve.has(id)) &&
        !P().some((p) => p.basicInfo.side === 'enemy' && onField(p));

    tcheck(
        'Лабіринт: «1 тунель» — герої рядом від центру, вихід у кінці тунелю, вороги в резерві',
        rt.status === 200 &&
            inLine &&
            firstAtExit &&
            exitOnLine &&
            onlyTunnel &&
            enemiesGone &&
            maze.teleports.length === 0 &&
            maze.fog.length === 0,
        `${rt.status} у ряд=${inLine} вихід ${JSON.stringify(maze.exit)} лише тунель=${onlyTunnel} у резерві ${leaving.filter((id) => inReserve.has(id)).length}/${leaving.length}${rt.status !== 200 ? ` ${JSON.stringify(rt.body).slice(0, 150)}` : ''}`
    );

    if (checkVictoryConditions(P(), reserve()).awaiting && reserve().length > 0)
        await call('reveal-participant', REVEAL, {
            participantIds: reserve().map((p: any) => p.basicInfo.id),
        });
}
