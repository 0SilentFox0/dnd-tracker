import type { Effect, StaticEffect } from './effects';
import type { Trigger } from './triggers';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import { AttackType, EffectMarker } from '@/lib/constants/battle';
import { DICE_PATTERN } from '@/lib/utils/common/dice';
import {
    moduleVocab,
    type ModuleVocabId,
    type VocabEntry,
} from '@/lib/utils/rules/systems/vocab';

export const DICE_RE = DICE_PATTERN;

export const MANEUVERS = ['dive', 'squall', 'fireBurst'] as const;

export const ABILITY_TARGETS = [
    'self',
    'eventTarget',
    'eventActor',
    'otherEnemy',
    'allAllies',
    'allEnemies',
    'everyone',
    'nearbyAllies',
    'nearbyEnemies',
] as const;

export const AREA_TARGETS = ['nearbyAllies', 'nearbyEnemies'] as const;

export type AreaTarget = (typeof AREA_TARGETS)[number];

export const isAreaTarget = (t: string | undefined): t is AreaTarget =>
    (AREA_TARGETS as readonly string[]).includes(t ?? '');

export const PASSIVE_TARGETS: ReadonlySet<string> = new Set([
    'self',
    'allAllies',
    'allEnemies',
    ...AREA_TARGETS,
]);

export const ATTACK_KINDS = [AttackType.MELEE, AttackType.RANGED] as const;

export const DAMAGE_KINDS = [
    AttackType.MELEE,
    AttackType.RANGED,
    'magic',
] as const;

export const DAMAGE_FILTER_KINDS = [
    AttackType.MELEE,
    AttackType.RANGED,
    'magic',
    'physical',
    'all',
] as const;

export const CONDITION_SUBJECTS = [
    'self',
    'eventTarget',
    'eventActor',
    'anyAlly',
    'anyEnemy',
] as const;

export const DYNAMIC_STATS = [
    'armor',
    'attackBonus',
    'critThreshold',
    'actionsPerTurn',
    'savingThrow',
    'attacksPerAction',
] as const;

type StatVocabFlag = 'baked' | 'timed';

const moduleStats = (flag: StatVocabFlag) =>
    moduleVocab('abilityStats')
        .filter((e) => e[flag])
        .map((e) => e.id as ModuleVocabId<'abilityStats'>);

export const BAKED_STATS = [
    'initiative',
    'maxHp',
    'speed',
    ...moduleStats('baked'),
    'minTargets',
    'maxTargets',
    'spellSlots',
    ...ABILITY_KEYS,
] as const;

export const STAT_KEYS = [...DYNAMIC_STATS, ...BAKED_STATS] as const;

export const TIMED_STATS = [
    'armor',
    'attackBonus',
    'critThreshold',
    'initiative',
    'speed',
    ...moduleStats('timed'),
    'actionsPerTurn',
    'savingThrow',
] as const;

export const CONDITION_KEYS = [
    EffectMarker.NO_BONUS_ACTION,
    EffectMarker.NO_REACTION,
    'disable_melee_attacks',
    'disable_ranged_attacks',
    'disable_spell_casting',
    'no_hostile_spells',
    'no_damage_dealt',
    EffectMarker.SKIP_ACTION,
    EffectMarker.IMMOBILIZED,
] as const;

export const CONDITION_KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

export type StandardConditionKey = string;

export const isMechanicalConditionKey = (key: unknown): boolean =>
    (CONDITION_KEYS as readonly unknown[]).includes(key);

export const CUSTOM_CONDITION_KEY_RE = /^custom:[a-z0-9-]{1,40}$/;

export type CustomConditionKey = `custom:${string}`;

export const isCustomConditionKey = (key: unknown): key is CustomConditionKey =>
    typeof key === 'string' && CUSTOM_CONDITION_KEY_RE.test(key);

export type AnyConditionKey = string;

export type AbilityTarget = (typeof ABILITY_TARGETS)[number];

export type AttackKind = (typeof ATTACK_KINDS)[number];

export type DamageKind = (typeof DAMAGE_KINDS)[number];

export type DamageFilterKind = (typeof DAMAGE_FILTER_KINDS)[number];

export type ConditionSubject = (typeof CONDITION_SUBJECTS)[number];

export type StatKey = (typeof STAT_KEYS)[number];

export type ConditionImmunityKey =
    | AnyConditionKey
    | 'fear'
    | 'berserk'
    | 'charm';

export function isStaticEffect(e: Effect): e is StaticEffect {
    return (
        e.kind === 'modifyStat' || e.kind === 'damageBonus' || e.kind === 'flag'
    );
}

export const statFlag = (
    stat: string,
    flag: Exclude<keyof VocabEntry<'abilityStats'>, 'id' | 'defaultValue' | 'sheetKey'>
): boolean => moduleVocab('abilityStats').some((e) => e.id === stat && e[flag]);

export function isBakedStat(stat: StatKey): boolean {
    return (BAKED_STATS as readonly string[]).includes(stat);
}

export function isActionScopedTrigger(t: Trigger): boolean {
    return (
        (t.event === 'attack' || t.event === 'spellCast') &&
        t.phase === 'before'
    );
}
