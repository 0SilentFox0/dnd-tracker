import { WFRP_ADVANCEMENT } from './rules/advancement';
import { woundsBreakdown, woundsMax } from './rules/characteristics/derive';
import {
    DEFAULT_CHARACTERISTICS,
    fortuneMax,
    readCharacteristics,
} from './rules/characteristics/keys';
import {
    initialCharacteristics,
    isEmptyCharacteristics,
    reconcileCharacteristics,
    redactCharacteristics,
} from './rules/characteristics/reconcile';
import { wfrpSheetBlock } from './rules/characteristics/sheet-block';
import { isOutOfFight, wfrpOnRevived } from './rules/combat/critical';
import { wfrpActionDetails } from './rules/combat/details';
import { extractWfrpAttacks } from './rules/combat/extract-attacks';
import { wfrpHitModel, wfrpHitModelFor } from './rules/combat/hit-model';
import { wfrpInitiative } from './rules/combat/initiative';
import { assertWfrpInput } from './rules/combat/input';
import { wfrpLoseChannelled } from './rules/combat/lose-channelled';
import { wfrpDamage } from './rules/combat/mitigate';
import { wfrpOnZeroHp } from './rules/combat/on-zero-hp';
import {
    participantStats,
    wfrpBaseStats,
    wfrpParticipantFields,
} from './rules/combat/participant';
import {
    resolveWfrpAttack,
    wfrpAbortedRoll,
    wfrpAttackTarget,
} from './rules/combat/resolve-attack';
import { WFRP_CONDITIONS } from './rules/conditions';
import { WFRP_CONDITION_SET } from './rules/conditions/standard-set';
import { editionOf } from './rules/edition';
import { WFRP_EQUIPMENT } from './rules/equipment';
import { WFRP_MAGIC } from './rules/magic';
import { redactWfrpSlot } from './rules/redact';
import { onSession } from './rules/session';
import { acceptsWfrpSheetTest, rollWfrpSheetTest } from './rules/sheet-test';
import { wfrpFromStored, wfrpPersist } from './rules/state-parts';
import { WFRP_TRAITS } from './rules/traits';
import { WFRP_TURN } from './rules/turn';

import { COINS } from '@/lib/constants/inventory';
import type { SystemData } from '@/lib/utils/rules/systems/slot';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const WFRP_MODULE: RuleSystemDefinition = {
    key: 'wfrp',
    participant: {
        fromStored: [wfrpFromStored],
        persist: [wfrpPersist],
        redactSlot: [redactWfrpSlot],
    },
    progression: {
        levels: false,
        hpTerm: 'wounds',
        maxHp: ({ characteristics }) => {
            const c = readCharacteristics({ characteristics });

            return { total: woundsMax(c), breakdown: woundsBreakdown(c) };
        },
    },
    stats: {
        columns: [
            {
                owns: [],
                fill: (rules) => ({
                    level: 1,
                    strength: 10,
                    dexterity: 10,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 10,
                    charisma: 10,
                    armorClass: 10,
                    archetype: null,
                    class: '',
                    classes: [],
                    initiative: rules.initiative.heroMin,
                    speed: 30,
                }),
            },
        ],
    },
    characteristics: {
        persisted: true,
        defaults: () =>
            structuredClone(DEFAULT_CHARACTERISTICS) as unknown as SystemData,
        isEmpty: isEmptyCharacteristics,
        sheetBlock: wfrpSheetBlock,
        reconcile: reconcileCharacteristics,
        redact: redactCharacteristics,
        initial: initialCharacteristics,
    },
    resources: {
        limits: (row) => {
            const c = readCharacteristics(row);

            return { fateMax: fortuneMax(c), fateLimit: c.fate };
        },
        seed: (characteristics) => ({
            fortune: fortuneMax(readCharacteristics({ characteristics })),
        }),
    },
    sheetTest: {
        accepts: acceptsWfrpSheetTest,
        roll: rollWfrpSheetTest,
    },
    rest: { kinds: false, onSession },
    conditionSet: WFRP_CONDITION_SET,
    conditions: WFRP_CONDITIONS,
    magic: WFRP_MAGIC,
    advancement: WFRP_ADVANCEMENT,
    creation: true,
    downtime: true,
    corruption: true,
    equipment: WFRP_EQUIPMENT,
    traits: WFRP_TRAITS,
    currency: {
        coins: COINS,
        value: { gp: 240, sp: 12, cp: 1 },
        labelKeys: {
            gp: 'wfrpEquipment.money.gc',
            sp: 'wfrpEquipment.money.ss',
            cp: 'wfrpEquipment.money.d',
        },
    },
    identity: { alignments: false },
    combat: {
        input: { assert: assertWfrpInput },
        judge: 'server',
        dice: 100,
        attacksOf: extractWfrpAttacks,
        participantFields: wfrpParticipantFields,
        tieBreak: (p) => participantStats(p)?.ag ?? p.abilities.dexterity,
        baseStats: wfrpBaseStats,
        initiative: wfrpInitiative,
        resolveAttack: resolveWfrpAttack,
        abortedRoll: wfrpAbortedRoll,
        details: wfrpActionDetails,
        attackTarget: wfrpAttackTarget,
        damage: wfrpDamage,
        onZeroHp: wfrpOnZeroHp,
        autoUnconsciousAtZero: (rules) =>
            editionOf(rules).woundModel !== 'critical',
        keepsDown: isOutOfFight,
        onRevived: wfrpOnRevived,
        onDamaged: [wfrpLoseChannelled],
        turn: WFRP_TURN,
        hitModel: wfrpHitModel,
        hitModelFor: wfrpHitModelFor,
    },
    lineage: false,
    attacks: false,
    spells: true,
    items: false,
    inventory: true,
};
