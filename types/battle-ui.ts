/**
 * Типи для UI компонентів битви
 */

import type { AttackData, BattleScene } from "./api";
import type { ActiveSkill, BattleParticipant } from "./battle";
import type { SkillCircle as SkillCircleEnum, SkillLevel } from "./skill-tree";

import { SpellDamageType, SpellType } from "@/lib/constants/spell-abilities";

/** Дані для атаки — реекспорт з api для єдиного джерела істини */
export type { AttackData };

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
  /** Показати модалку підрахунку шкоди перед застосуванням; після підтвердження викликається onSpell */
  onSpellPreview?: (data: SpellCastData) => void;
  onBonusAction: (skill: ActiveSkill) => void;
  onSkipTurn: () => void;
  onMoraleCheck: (d10Roll: number) => void;
  /** Не запускати авто-таймер завершення ходу, поки next-turn виконується */
  isNextTurnPending?: boolean;
  /** Не запускати авто-таймер, поки атака (застосування шкоди) виконується */
  isAttackPending?: boolean;
  /** Показувати лоадер під час обробки моралі */
  isMoraleCheckPending?: boolean;
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
