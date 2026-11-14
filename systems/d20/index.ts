import { D20_ACTIONS } from './rules/actions';
import {
    D20_ATTACK_HOOKS,
    d20AbortedRoll,
    resolveD20Attack,
} from './rules/attack';
import { D20_REACH, d20AttackAbility } from './rules/attack/ability';
import { d20HitModel } from './rules/balance';
import { concentrationFallout } from './rules/concentration/damaged';
import { D20_CONDITION_SET } from './rules/conditions';
import { d20Damage } from './rules/damage';
import { d20Initiative, d20TieBreak } from './rules/initiative';
import { D20_MAGIC } from './rules/magic';
import { d20UnitSpellDc } from './rules/participant/unit-spell-dc';
import { proficiencyForLevel } from './rules/proficiency/level';
import { d20MaxHp } from './rules/progression/max-hp';
import { D20_REACTIONS, d20ProvokedOpportunity } from './rules/reactions';
import { D20_PROFICIENCY, D20_SAVES } from './rules/saves';
import { d20SheetBlock } from './rules/sheet/block';
import { rollFromSheet } from './rules/sheet-roll';
import { D20_STAT_COLUMNS } from './rules/stats';
import { D20_TURN } from './rules/turn';
import { d20OnZeroHp } from './rules/zero-hp';

import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';
import { d20ZoneAttack } from '@/systems/d20/rules/magic/spell-roll';
import type { SheetRollSubject } from '@/types/characters';

export const D20_MODULE: RuleSystemDefinition = {
    key: 'd20',
    progression: {
        levels: true,
        hpTerm: 'hp',
        maxHp: d20MaxHp,
        proficiency: (level, rules) =>
            proficiencyForLevel(level, rules.formulas),
        classes: (rules) => rules.classes.enabled,
        initiativeRange: (rules) => ({
            min: rules.initiative.heroMin,
            max: rules.initiative.heroMax,
        }),
    },
    stats: { columns: [{ owns: D20_STAT_COLUMNS }] },
    sheet: { blocks: [d20SheetBlock] },
    characteristics: {
        persisted: false,
        defaults: () => undefined,
        isEmpty: (v) =>
            v == null || (typeof v === 'object' && Object.keys(v).length === 0),
        sheetBlock: () => undefined,
    },
    sheetTest: {
        accepts: (body) => body.kind !== 'test',
        roll: (i) =>
            rollFromSheet(i.participant, i.body as SheetRollSubject, i),
    },
    rest: { kinds: true },
    combat: {
        judge: 'client',
        crit: (rules) => rules.criticals,
        autoXp: (rules) => rules.encounters.autoXp,
        attackAbility: d20AttackAbility,
        reach: D20_REACH,
        attack: D20_ATTACK_HOOKS,
        zoneAttack: d20ZoneAttack,
        dice: 20,
        actionEconomy: { bonusAction: true, reaction: true },
        resolveAttack: resolveD20Attack,
        damage: d20Damage,
        abortedRoll: d20AbortedRoll,
        onZeroHp: d20OnZeroHp,
        onDamaged: [concentrationFallout],
        turn: D20_TURN,
        actions: D20_ACTIONS,
        reactions: D20_REACTIONS,
        saves: D20_SAVES,
        proficiency: D20_PROFICIENCY,
        afterAttack: [d20ProvokedOpportunity],
        initiative: d20Initiative,
        tieBreak: d20TieBreak,
        hitModel: d20HitModel,
    },
    participant: {
        fromUnit: [d20UnitSpellDc],
    },
    conditionSet: D20_CONDITION_SET,
    magic: D20_MAGIC,
    identity: { alignments: true },
    lineage: true,
    attacks: true,
    spells: true,
    items: true,
    inventory: true,
};
