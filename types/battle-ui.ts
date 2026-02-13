/**
 * Типи для UI компонентів битви
 */

import type { BattleScene } from "./api";
import type { ActiveSkill, BattleParticipant } from "./battle";
import type { SkillCircle as SkillCircleEnum, SkillLevel } from "./skill-tree";

import { SpellDamageType, SpellType } from "@/lib/constants/spell-abilities";

/**
 * Дані для атаки
 */
export interface AttackData {
  attackerId: string;
  targetId?: string; // для однієї цілі (зворотна сумісність)
  targetIds?: string[]; // для AOE — масив цілей
  attackId?: string;
  attackRoll: number;
  advantageRoll?: number;
  damageRolls: number[];
}

/**
 * Дані для заклинання
 */
export interface SpellCastData {
  casterId: string;
  casterType: string;
  spellId: string;
  targetIds: string[];
  damageRolls: number[];
  savingThrows?: Array<{ participantId: string; roll: number }>;
  additionalRollResult?: number;
  hitRoll?: number;
}

/**
 * Слот скіла
 */
export interface SkillSlot {
  mainSkillId: string;
  circle: SkillCircleEnum;
  level: SkillLevel;
  index: number;
  isMainSkillLevel?: boolean;
  isRacial?: boolean;
  skillName?: string;
}

/**
 * Пропси для PlayerTurnView
 */
export interface PlayerTurnViewProps {
  battle: BattleScene;
  participant: BattleParticipant;
  isDM: boolean;
  campaignId: string;
  /** DM або скіл бачить HP/AC ворогів */
  canSeeEnemyHp?: boolean;
  onAttack: (data: AttackData) => void;
  onSpell: (data: SpellCastData) => void;
  onBonusAction: (skill: ActiveSkill) => void;
  onSkipTurn: () => void;
  onMoraleCheck: (d10Roll: number) => void;
  /** Не запускати авто-таймер завершення ходу, поки next-turn виконується */
  isNextTurnPending?: boolean;
}

/**
 * Заклинання для UI
 */
export interface Spell {
  id: string;
  name: string;
  level: number;
  type: SpellType;
  damageType: SpellDamageType;
  description?: string;
}
