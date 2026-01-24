/**
 * Константи для тригерів скілів
 */

import type {
  ComparisonOperator,
  SimpleSkillTrigger,
  StatType,
} from "@/types/skill-triggers";

/**
 * Enum для типів тригерів
 */
export enum TriggerType {
  SIMPLE = "simple",
  COMPLEX = "complex",
}

/**
 * Enum для цілей складних тригерів
 */
export enum TriggerTarget {
  ALLY = "ally",
  ENEMY = "enemy",
}

/**
 * Enum для типів значень
 */
export enum TriggerValueType {
  NUMBER = "number",
  PERCENT = "percent",
}

/**
 * Опції для простих тригерів
 */
export const SIMPLE_TRIGGER_OPTIONS: {
  value: SimpleSkillTrigger;
  label: string;
}[] = [
  { value: "startRound", label: "Початок раунду" },
  { value: "endRound", label: "Кінець раунду" },
  { value: "beforeOwnerAttack", label: "Перед атакою власника" },
  { value: "beforeEnemyAttack", label: "Перед атакою ворога" },
  { value: "afterOwnerAttack", label: "Після атаки власника" },
  { value: "afterEnemyAttack", label: "Після атаки ворога" },
  { value: "beforeOwnerSpellCast", label: "Перед кастом заклинання власника" },
  { value: "afterOwnerSpellCast", label: "Після касту заклинання власника" },
  { value: "beforeEnemySpellCast", label: "Перед кастом заклинання ворога" },
  { value: "afterEnemySpellCast", label: "Після касту заклинання ворога" },
  { value: "bonusAction", label: "Бонусна дія" },
] as const;

/**
 * Опції для операторів порівняння
 */
export const COMPARISON_OPERATOR_OPTIONS: {
  value: ComparisonOperator;
  label: string;
}[] = [
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "=", label: "=" },
  { value: "<=", label: "<=" },
  { value: ">=", label: ">=" },
] as const;

/**
 * Опції для типів статистики
 */
export const STAT_TYPE_OPTIONS: {
  value: StatType;
  label: string;
}[] = [
  { value: "HP", label: "HP" },
  { value: "Attack", label: "Атака" },
  { value: "AC", label: "AC" },
  { value: "Speed", label: "Швидкість" },
  { value: "Morale", label: "Мораль" },
  { value: "Level", label: "Рівень" },
] as const;

/**
 * Опції для цілей складних тригерів
 */
export const TARGET_OPTIONS: {
  value: TriggerTarget;
  label: string;
}[] = [
  { value: TriggerTarget.ALLY, label: "Союзник" },
  { value: TriggerTarget.ENEMY, label: "Ворог" },
] as const;

/**
 * Опції для типів значень
 */
export const VALUE_TYPE_OPTIONS: {
  value: TriggerValueType;
  label: string;
}[] = [
  { value: TriggerValueType.NUMBER, label: "Число" },
  { value: TriggerValueType.PERCENT, label: "Відсоток" },
] as const;

/**
 * Значення за замовчуванням для складного тригера
 */
export const DEFAULT_COMPLEX_TRIGGER: {
  type: TriggerType.COMPLEX;
  target: TriggerTarget;
  operator: ComparisonOperator;
  value: number;
  valueType: TriggerValueType;
  stat: StatType;
} = {
  type: TriggerType.COMPLEX,
  target: TriggerTarget.ALLY,
  operator: "<=",
  value: 15,
  valueType: TriggerValueType.PERCENT,
  stat: "HP",
};
