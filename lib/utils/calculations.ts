// Утиліти для розрахунків D&D

/**
 * Розраховує модифікатор з ability score
 * Формула: (score - 10) / 2 (rounded down)
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Розраховує proficiency bonus залежно від рівня
 */
export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

/**
 * Розраховує пасивне значення (perception, investigation, insight)
 * Формула: 10 + ability modifier + (proficiency bonus якщо є proficiency)
 */
export function getPassiveScore(
  abilityModifier: number,
  hasProficiency: boolean,
  proficiencyBonus: number
): number {
  return 10 + abilityModifier + (hasProficiency ? proficiencyBonus : 0)
}

/**
 * Розраховує Spell Save DC
 * Формула: 8 + proficiency bonus + ability modifier
 */
export function getSpellSaveDC(
  proficiencyBonus: number,
  abilityModifier: number
): number {
  return 8 + proficiencyBonus + abilityModifier
}

/**
 * Розраховує Spell Attack Bonus
 * Формула: proficiency bonus + ability modifier
 */
export function getSpellAttackBonus(
  proficiencyBonus: number,
  abilityModifier: number
): number {
  return proficiencyBonus + abilityModifier
}

/**
 * Розраховує XP для рівня
 * Level 1 = 1000 XP
 * Кожен наступний рівень = попередній × multiplier
 */
export function getXPForLevel(level: number, multiplier: number = 2.5): number {
  if (level === 1) return 1000
  return Math.floor(getXPForLevel(level - 1, multiplier) * multiplier)
}

/**
 * Розраховує рівень на основі XP
 */
export function getLevelFromXP(xp: number, multiplier: number = 2.5): number {
  let level = 1
  let requiredXP = 1000
  
  while (xp >= requiredXP) {
    level++
    requiredXP = Math.floor(requiredXP * multiplier)
  }
  
  return level
}

/**
 * Розраховує HP при прокачці
 * Формула: hitDice середнє значення + CON modifier
 */
export function calculateHPGain(
  hitDice: string,
  constitutionModifier: number
): number {
  // Парсимо hitDice (наприклад "1d8" -> 8)
  const match = hitDice.match(/(\d+)d(\d+)/)
  if (!match) return 0
  
  const diceSize = parseInt(match[2])
  const averageRoll = Math.ceil(diceSize / 2) + 0.5 // Середнє значення для dN
  
  return Math.floor(averageRoll) + constitutionModifier
}

/**
 * Розраховує урон з кубиків
 * Підтримує формати: "2d4", "3d8+4", "1d6-1"
 */
export function rollDamage(dice: string, modifier: number = 0): number {
  const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!match) return 0
  
  const count = parseInt(match[1])
  const size = parseInt(match[2])
  const diceModifier = match[3] ? parseInt(match[3]) : 0
  
  // В реальному застосунку тут буде генерація випадкових чисел
  // Для тестування повертаємо середнє значення
  const averageRoll = (count * (size + 1)) / 2
  
  return Math.floor(averageRoll) + diceModifier + modifier
}

/**
 * Перевіряє чи є критичне попадання (20 на d20)
 */
export function isCriticalHit(roll: number): boolean {
  return roll === 20
}

/**
 * Перевіряє чи є критичний промах (1 на d20)
 */
export function isCriticalMiss(roll: number): boolean {
  return roll === 1
}

/**
 * Розраховує чи попадання успішне
 */
export function isHit(attackRoll: number, targetAC: number): boolean {
  return attackRoll >= targetAC
}
