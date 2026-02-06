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
  | "bonusAction"
  // --- нові тригери для повного покриття SKILLS.md ---
  | "passive" // завжди активний (пасивний ефект)
  | "onBattleStart" // один раз на початку бою
  | "onHit" // коли атака власника влучає
  | "onAttack" // коли власник атакує
  | "onKill" // коли власник вбиває ціль
  | "onAllyDeath" // коли гине союзник
  | "onLethalDamage" // коли власник отримує летальну шкоду
  | "onCast" // коли власник кастує заклинання
  | "onFirstHitTakenPerRound" // перший удар по власнику за раунд
  | "onFirstRangedAttack" // перша дальня атака за бій
  | "onMoraleSuccess" // при успішній перевірці моралі
  | "allyMoraleCheck"; // при перевірці моралі союзника

/**
 * Усі допустимі тригери у вигляді масиву (для zod-валідації та імпорту)
 */
export const ALL_SIMPLE_TRIGGERS: readonly SimpleSkillTrigger[] = [
  "startRound",
  "endRound",
  "beforeOwnerAttack",
  "beforeEnemyAttack",
  "afterOwnerAttack",
  "afterEnemyAttack",
  "beforeOwnerSpellCast",
  "afterOwnerSpellCast",
  "beforeEnemySpellCast",
  "afterEnemySpellCast",
  "bonusAction",
  "passive",
  "onBattleStart",
  "onHit",
  "onAttack",
  "onKill",
  "onAllyDeath",
  "onLethalDamage",
  "onCast",
  "onFirstHitTakenPerRound",
  "onFirstRangedAttack",
  "onMoraleSuccess",
  "allyMoraleCheck",
] as const;

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
 * Модифікатори тригера (умови спрацювання)
 */
export interface SkillTriggerModifiers {
  probability?: number; // rand() < 0.4 → 0.4
  oncePerBattle?: boolean; // може спрацювати лише раз за бій
  twicePerBattle?: boolean; // може спрацювати двічі за бій
  stackable?: boolean; // ефект стакується
  condition?: string; // додаткова умова ("onConsumeDead", "allyHP <= 0.15", тощо)
}

/**
 * Складний тригер (умовний)
 * Формат: if {target} {operator} {value} {stat}
 * Приклад: if ally <= 15% HP
 */
export interface ComplexSkillTrigger {
  type: "complex";
  target: "ally" | "enemy" | "self";
  operator: ComparisonOperator;
  value: number;
  valueType: ValueType;
  stat: StatType;
  modifiers?: SkillTriggerModifiers;
}

/**
 * Простий тригер
 */
export interface SimpleSkillTriggerConfig {
  type: "simple";
  trigger: SimpleSkillTrigger;
  modifiers?: SkillTriggerModifiers;
}

/**
 * Тригер скіла (може бути простим або складним)
 */
export type SkillTrigger = SimpleSkillTriggerConfig | ComplexSkillTrigger;

/**
 * Масив тригерів для скіла
 */
export type SkillTriggers = SkillTrigger[];
