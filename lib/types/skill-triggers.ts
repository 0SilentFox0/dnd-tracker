/**
 * Типи для тригерів скілів
 */

/**
 * Прості тригери (коли спрацьовує скіл)
 */
export type SimpleSkillTrigger =
  | "startRound"
  | "endRound"
  | "beforeOwnerAttack"
  | "beforeEnemyAttack"
  | "afterOwnerAttack"
  | "afterEnemyAttack"
  | "beforeOwnerSpellCast"
  | "afterOwnerSpellCast"
  | "beforeEnemySpellCast"
  | "afterEnemySpellCast"
  | "bonusAction";

/**
 * Оператори порівняння для складних тригерів
 */
export type ComparisonOperator = ">" | "<" | "=" | "<=" | ">=";

/**
 * Тип значення для складних тригерів
 */
export type ValueType = "number" | "percent";

/**
 * Статистика для перевірки в складних тригерах
 */
export type StatType = "HP" | "Attack" | "AC" | "Speed" | "Morale" | "Level";

/**
 * Складний тригер (умовний)
 * Формат: if {target} {operator} {value} {stat}
 * Приклад: if ally <= 15% HP
 */
export interface ComplexSkillTrigger {
  type: "complex";
  target: "ally" | "enemy"; // a
  operator: ComparisonOperator; // b
  value: number; // c (число або відсоток)
  valueType: ValueType; // c (тип значення)
  stat: StatType; // d
}

/**
 * Простий тригер
 */
export interface SimpleSkillTriggerConfig {
  type: "simple";
  trigger: SimpleSkillTrigger;
}

/**
 * Тригер скіла (може бути простим або складним)
 */
export type SkillTrigger = SimpleSkillTriggerConfig | ComplexSkillTrigger;

/**
 * Масив тригерів для скіла
 */
export type SkillTriggers = SkillTrigger[];
