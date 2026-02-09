/**
 * Типи для боїв
 */

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { SkillLevel } from "@/lib/types/skill-tree";

export type { CriticalEffect };
export { AttackType, ParticipantSide };
export { SkillLevel };

export interface BattleLogEntry {
  round: number;
  timestamp: string;
  actorName: string;
  action: string;
  target?: string;
  result: string;
  damage?: number;
  healing?: number;
}

/**
 * Типи для активних ефектів
 */
export interface ActiveEffect {
  id: string;
  name: string;
  type: "buff" | "debuff" | "condition";
  description?: string;
  icon?: string;
  duration: number; // кількість раундів що залишилось
  appliedAt: {
    round: number;
    timestamp: Date;
  };
  effects: Array<{
    type: string; // attack_bonus, ac_bonus, poison_damage, тощо
    value: number;
    isPercentage?: boolean;
    damageType?: string; // для DOT: fire, poison, тощо
  }>;
  dotDamage?: {
    damagePerRound: number;
    damageType: string;
  };
}

/**
 * Типи для пасивних здібностей
 */
export interface PassiveAbility {
  id: string;
  name: string;
  description: string;
  trigger: {
    type:
      | "always"
      | "on_hit"
      | "on_attack"
      | "ally_low_hp"
      | "start_of_turn"
      | "end_of_turn"
      | "start_of_battle";
    condition?: string; // умова (наприклад "ally_hp <= 15%")
    chance?: number; // відсоток спрацювання (25%, 20%)
    lowHpThresholdPercent?: number; // поріг низького HP для trigger "ally_low_hp" (наприклад, 15, 25, тощо)
  };
  effect: {
    type: string;
    value?: number;
    // ... специфічні поля залежно від типу
  };
}

/**
 * Типи для расових здібностей
 */
export interface RacialAbility {
  id: string;
  name: string;
  effect: Record<string, unknown>; // деталі ефекту
  // Наприклад: fire_immunity, magic_resistance, morale_rules
}

/**
 * Типи для активних скілів
 */
/**
 * Один ефект скіла (збагачений формат)
 */
export interface SkillEffect {
  stat: string;           // "counter_damage", "hp_bonus", "bleed_damage", "melee_damage" тощо
  type: string;           // "percent", "flat", "formula", "dice", "flag", "ignore", "stack", "min"
  value: number | string | boolean;  // 25, "2*hero_level", "1d4", true
  isPercentage: boolean;  // зручний прапорець (type === "percent")
  duration?: number;      // тривалість у раундах
  target?: "self" | "enemy" | "all_enemies" | "all_allies";
  /** Скільки разів може спрацювати: undefined/null = постійно, 1–100 = обмеження */
  maxTriggers?: number | null;
}

export interface ActiveSkill {
  skillId: string;
  name: string;
  mainSkillId: string;
  level: SkillLevel;
  effects: SkillEffect[];
  spellEnhancements?: {
    spellEffectIncrease?: number; // +25% ефекту
    spellTargetChange?: { target: string }; // зміна цілі
    spellAdditionalModifier?: {
      modifier?: string; // "burning", "poison", тощо
      damageDice?: string; // "1d6" для додаткової шкоди
      duration?: number; // тривалість в раундах
    };
    spellNewSpellId?: string; // нове заклинання
  };
  skillTriggers?: import("@/types/skill-triggers").SkillTriggers; // Тригери скіла
}

/**
 * Типи для екіпірованих артефактів
 */
export interface EquippedArtifact {
  artifactId: string;
  name: string;
  slot: string; // weapon, shield, cloak, ring, helmet, amulet, item
  bonuses: Record<string, number>; // бонуси до статів
  modifiers: Array<{
    type: string;
    value: number;
    isPercentage?: boolean;
  }>;
  passiveAbility?: Record<string, unknown>; // пасивна здібність артефакту
}

/**
 * Типи для атак
 */
export interface BattleAttack {
  id?: string;
  name: string;
  type: AttackType;
  attackBonus: number; // базовий бонус
  damageDice: string; // "2d6", "1d8+3" тощо
  damageType: string; // slashing, piercing, fire, тощо
  range?: string; // для ranged
  properties?: string; // спеціальні властивості
  minTargets?: number;
  maxTargets?: number;
}

/**
 * Повна структура учасника бою (BattleParticipant)
 * Містить всі дані персонажа/юніта для бою
 */
/**
 * Базова інформація про учасника бою
 */
export interface BattleParticipantBasicInfo {
  id: string; // унікальний ID учасника В ЦІЙ БИТВІ
  battleId: string; // ID битви
  sourceId: string; // оригінальний ID character/unit
  sourceType: "character" | "unit";
  instanceNumber?: number; // номер копії (для units: 1, 2, 3...)
  instanceId?: string; // унікальний ID інстансу (для units)
  name: string;
  avatar?: string;
  side: ParticipantSide;
  controlledBy: string; // userId (для players) або "dm" (для NPC/units)
  isExtraTurnSlot?: boolean; // чи є цей слот додатковим ходом
}

/**
 * Характеристики учасника бою
 */
export interface BattleParticipantAbilities {
  level: number;
  initiative: number; // поточна ініціатива (з урахуванням бонусів)
  baseInitiative: number; // базова ініціатива (без тимчасових бонусів)
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  modifiers: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  proficiencyBonus: number;
  race: string;
}

/**
 * Бойові параметри учасника.
 * На початку бою currentHp = maxHp. Під час бою maxHp може тимчасово знижуватись
 * (наприклад, лікування -10% maxHP на час бою); після завершення бою стан не зберігається.
 */
export interface BattleParticipantCombatStats {
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number; // швидкість переміщення
  morale: number; // від -3 до +3, default 0
  status: "active" | "unconscious" | "dead";
  minTargets: number;
  maxTargets: number;
}

/**
 * Дані про заклинання учасника
 */
export interface BattleParticipantSpellcasting {
  spellcastingClass?: string;
  spellcastingAbility?: "intelligence" | "wisdom" | "charisma";
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellSlots: Record<string, { max: number; current: number }>; // "1" до "5"
  knownSpells: string[]; // масив ID заклинань
}

/**
 * Бойові дані учасника
 */
export interface BattleParticipantBattleData {
  attacks: BattleAttack[];
  activeEffects: ActiveEffect[];
  passiveAbilities: PassiveAbility[];
  racialAbilities: RacialAbility[];
  activeSkills: ActiveSkill[];
  equippedArtifacts: EquippedArtifact[];
  /** Лічильник використань скілів за бій (skillId → count). Для oncePerBattle/twicePerBattle */
  skillUsageCounts?: Record<string, number>;
}

/**
 * Флаги дій учасника
 */
export interface BattleParticipantActionFlags {
  hasUsedAction: boolean;
  hasUsedBonusAction: boolean;
  hasUsedReaction: boolean;
  hasExtraTurn: boolean;
}

/**
 * Повна структура учасника бою
 */
export interface BattleParticipant {
  basicInfo: BattleParticipantBasicInfo;
  abilities: BattleParticipantAbilities;
  combatStats: BattleParticipantCombatStats;
  spellcasting: BattleParticipantSpellcasting;
  battleData: BattleParticipantBattleData;
  actionFlags: BattleParticipantActionFlags;
}

/**
 * Тип для участі в підготовці бою (при створенні)
 */
export interface BattlePreparationParticipant {
  id: string;
  type: "character" | "unit";
  side: ParticipantSide;
  quantity?: number;
}

/**
 * Детальна дія в бою (BattleAction)
 * Кожна дія записується для історії та можливості відміни
 */
export interface BattleAction {
  id: string; // унікальний ідентифікатор
  battleId: string; // ID битви
  round: number; // в якому раунді
  actionIndex: number; // порядковий номер дії (для відміни)
  timestamp: Date; // час виконання
  actorId: string; // ID учасника що виконав дію
  actorName: string; // ім'я актора
  actorSide: "ally" | "enemy";
  actionType:
    | "attack"
    | "spell"
    | "bonus_action"
    | "ability"
    | "end_turn"
    | "skip_turn"
    | "morale_skip";
  targets: Array<{
    participantId: string;
    participantName: string;
  }>;
  actionDetails: {
    // Для атак:
    weaponName?: string;
    attackRoll?: number;
    attackBonus?: number;
    totalAttackValue?: number;
    targetAC?: number;
    isHit?: boolean;
    isCritical?: boolean;
    isCriticalFail?: boolean;
    // Для урону:
    damageRolls?: Array<{
      dice: string;
      results: number[];
      total: number;
      damageType: string;
    }>;
    totalDamage?: number;
    damageBreakdown?: string; // детальний опис урону
    // Для заклинань:
    spellId?: string;
    spellName?: string;
    spellLevel?: number;
    spellSlotUsed?: number;
    // Для saving throws:
    savingThrows?: Array<{
      participantId: string;
      ability: string;
      roll: number;
      result: "success" | "fail";
    }>;
    // Для лікування:
    healingRolls?: Array<{
      dice: string;
      results: number[];
      total: number;
    }>;
    totalHealing?: number;
    // Для ефектів:
    appliedEffects?: Array<{
      id: string;
      name: string;
      duration: number;
    }>;
    // Для пасивок:
    triggeredAbilities?: Array<{
      id: string;
      name: string;
    }>;
    // Для модифікаторів:
    appliedModifiers?: Array<{
      type: string;
      value: number;
      source: string;
    }>;
    // Для перевірки моралі:
    d10Roll?: number;
    morale?: number;
    // Критичний ефект (Natural 20/1):
    criticalEffect?: {
      id: number;
      name: string;
      description: string;
      type: "success" | "fail";
    };
  };
  resultText: string; // текстовий опис для лога
  hpChanges: Array<{
    participantId: string;
    participantName: string;
    oldHp: number;
    newHp: number;
    change: number; // позитивне = урон, негативне = лікування
  }>;
  isCancelled: boolean; // чи була відмінена дія
  cancelledAt?: Date; // коли відмінена
  /** Стан бою перед цією дією (для rollback) */
  stateBefore?: {
    initiativeOrder: BattleParticipant[];
    currentTurnIndex: number;
    currentRound: number;
  };
}
