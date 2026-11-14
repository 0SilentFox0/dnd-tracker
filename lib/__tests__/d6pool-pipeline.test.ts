import { beforeAll, describe, expect, it, vi } from 'vitest';

import { memoryPipeline } from './helpers/pipeline-memory';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { D6POOL_SERVER } from '@/lib/__tests__/fixtures/d6pool/server';
import {
    AttackType,
    BattleStatus,
    ParticipantSide,
} from '@/lib/constants/battle';
import type { RunBattleMutationOptions } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleAttack } from '@/types/battle';

let runGuardedBattleOperationCore: typeof import('@/lib/utils/battle/pipeline/run-battle-mutation').runGuardedBattleOperationCore;

let attackBodySchema: typeof import('@/lib/schemas/battles').attackBodySchema;

let attackMutation: typeof import('@/lib/server/battles/mutations/attack/attack-mutation').attackMutation;

let nextTurnMutation: typeof import('@/lib/server/battles/mutations/next-turn/next-turn-mutation').nextTurnMutation;

let createStartMutation: typeof import('@/lib/server/battles/mutations/start/start-mutation').createStartMutation;

let createBattleParticipantFromCharacter: typeof import('@/lib/server/battles/participant/from-character').createBattleParticipantFromCharacter;

let placed: typeof import('@/lib/utils/battle/__tests__/fixtures/placed').placed;

beforeAll(async () => {
    vi.resetModules();

    ({ runGuardedBattleOperationCore } = await import(
        '@/lib/utils/battle/pipeline/run-battle-mutation'
    ));
    ({ attackBodySchema } = await import('@/lib/schemas/battles'));
    ({ attackMutation } = await import(
        '@/lib/server/battles/mutations/attack/attack-mutation'
    ));
    ({ nextTurnMutation } = await import(
        '@/lib/server/battles/mutations/next-turn/next-turn-mutation'
    ));
    ({ createStartMutation } = await import(
        '@/lib/server/battles/mutations/start/start-mutation'
    ));
    ({ createBattleParticipantFromCharacter } = await import(
        '@/lib/server/battles/participant/from-character'
    ));
    ({ placed } = await import('@/lib/utils/battle/__tests__/fixtures/placed'));
});

vi.mock('@/lib/utils/rules/systems/lookup', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

vi.mock('@/lib/server/systems/lookup', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    systemServerOf: () => D6POOL_SERVER,
}));

const SPEAR: BattleAttack = {
    id: 's',
    name: 'Spear',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d4',
    damageType: 'piercing',
};

const CHARACTER = {
    id: 'ch1',
    campaignId: 'c1',
    name: 'Hero',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    speed: 30,
    initiative: 0,
    morale: 1,
    controlledBy: 'dm',
    immunities: [],
    knownSpells: [],
    equipment: {},
    skillTreeProgress: {},
    personalSkillId: null,
};

const CONTEXT = {
    skillTreeByRace: {},
    mainSkills: [],
    spells: [],
    allSkills: [],
    racesByName: {
        Human: {
            id: 'r',
            campaignId: 'c1',
            name: 'Human',
            icon: null,
            color: null,
            availableSkills: [],
            disabledSkills: [],
            spellSlotProgression: [],
            passiveAbility: null,
            abilities: [],
        },
    },
    campaign: { maxLevel: 20 },
    skillsById: {},
    artifactsById: {},
    artifactSetsById: {},
    artifactSetMemberIds: {},
} as never;

const PARAMS = { id: 'c1', battleId: 'b1' };

const SCENE = {
    id: 'b1',
    campaignId: 'c1',
    status: BattleStatus.PREPARED,
    round: 0,
    turnIndex: 0,
    version: 0,
    eventSeq: 0,
    pendingMoraleCheck: null,
    pendingChoice: null,
    startedAt: null,
    completedAt: null,
};

const META = {
    name: 'Battle',
    description: null,
    setup: [{ id: 'u1', type: 'unit', side: 'enemy' }] as never,
    friendlyFire: false,
    rules: DEFAULT_RULES,
    critChoiceByDm: false,
    map: null,
    createdAt: new Date(),
};

async function startedStore(enemyHp = 2) {
    const store = memoryPipeline({
        scene: SCENE,
        meta: META,
        participants: [],
        pending: [],
    });

    const hero = await createBattleParticipantFromCharacter(
        CHARACTER as never,
        'b1',
        ParticipantSide.ALLY,
        undefined,
        { ...(CONTEXT as object), rules: DEFAULT_RULES } as never,
        { artifactRows: [], rules: DEFAULT_RULES }
    );

    const withSpear = {
        ...hero,
        battleData: { ...hero.battleData, position: { x: 1, y: 1 } },
        attacks: [SPEAR],
    } as typeof hero;

    const enemy = placed('t', {
        side: ParticipantSide.ENEMY,
        hp: enemyHp,
        attacks: [SPEAR],
        at: { x: 2, y: 1 },
    });

    const start = createStartMutation(async () => ({
        order: [withSpear, enemy],
        reserve: [],
        triggerLogEntries: [],
    }));

    const options: RunBattleMutationOptions<undefined> = {
        params: PARAMS,
        access: 'dm',
        mutate: start,
    };

    await runGuardedBattleOperationCore(
        'dm',
        undefined,
        0,
        options,
        store.deps
    );

    return { store, heroId: withSpear.basicInfo.id };
}

describe('d6pool through the real battle pipeline', () => {
    it('starts with a character, attacks to 0 HP and completes the battle', async () => {
        const { store, heroId } = await startedStore();

        expect(store.state.scene.status).toBe(BattleStatus.ACTIVE);
        expect(store.state.participants.map((p) => p.basicInfo.id)).toContain(
            heroId
        );

        const attackerId = store.state.participants[0].basicInfo.id;

        const out = await runGuardedBattleOperationCore(
            'dm',
            {
                attackerId,
                targetId: 't',
                attackId: 's',
                d20Roll: 6,
                damageRolls: [2],
            },
            store.state.scene.version,
            {
                params: PARAMS,
                access: 'dm',
                schema: attackBodySchema,
                mutate: attackMutation,
            } as never,
            store.deps
        );

        expect(store.participant('t')?.combatStats.currentHp).toBe(0);
        expect(store.state.scene.status).toBe(BattleStatus.COMPLETED);
        expect(out.version).toBe(store.state.scene.version);
        expect(store.published.length).toBeGreaterThan(0);
        expect(store.events.length).toBeGreaterThan(0);
    });

    it('next-turn works without releaseInvalidGrapples and sustain.dropOrphaned', async () => {
        const { store } = await startedStore(20);

        const { combat, magic } = D6POOL_SYSTEM;

        const { participants } = store.state;

        expect(
            combat.actions.releaseInvalidGrapples(participants, null)
        ).toEqual({ participants, messages: [] });
        expect(magic.sustain.dropOrphaned(participants, null, 1)).toEqual({
            participants,
            messages: [],
        });

        await runGuardedBattleOperationCore(
            'dm',
            undefined,
            store.state.scene.version,
            {
                params: PARAMS,
                access: 'dm',
                mutate: nextTurnMutation,
            } as never,
            store.deps
        );

        expect(store.state.scene.turnIndex).toBe(1);
        expect(store.state.scene.status).toBe(BattleStatus.ACTIVE);
    });
});
