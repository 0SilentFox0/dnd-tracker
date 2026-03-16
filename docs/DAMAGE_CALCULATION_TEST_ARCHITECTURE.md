# Архітектура тестів обрахунку шкоди (TDD)

Тести — основний джерело правди для логіки обрахунку шкоди. Цей документ фіксує запитаня для побудови тестів і флоу обрахунку.

---

## 1. Запитання для побудови тестів

### 1.1 Межі та входи/виходи

| # | Запитання | Відповідь / Джерело правди |
|---|-----------|----------------------------|
| 1 | Які **входи** має функція обрахунку урону атаки? | `attacker`, `baseDamage` (сума кубиків), `statModifier`, `attackType`, опційно `context` (allParticipants, additionalDamage, heroLevelPart, heroDicePart, нотації для breakdown). |
| 2 | Який **вихід** очікується? | `DamageCalculationResult`: baseDamage, skillPercentBonus, skillFlatBonus, artifactPercentBonus, artifactFlatBonus, passiveAbilityBonus, additionalDamage, totalDamage, breakdown[]. |
| 3 | Де закінчується «обрахунок урону» і починається «застосування до цілі»? | Обрахунок: до `totalDamage` включно. Резист цілі (`applyResistance`) і зміна HP — окремий шар; тести обрахунку не зобов’язані мокати ціль, окрім випадків breakdown з контекстом (наприклад passive ally_low_hp). |
| 4 | Чи тестуємо **breakdown** (рядки для UI) окремо чи разом із числами? | Разом: breakdown має відповідати числовим полям (наприклад «Бонуси зі скілів: +30%» лише коли skillPercentBonus === 30). Тести можуть перевіряти наявність підрядка або точний формат. |

### 1.2 Джерела модифікаторів

| # | Запитання | Відповідь |
|---|-----------|-----------|
| 5 | Які джерела **процентного** бонусу до фізичної атаки? | Скіли (activeSkills: melee_damage/ranged_damage, isPercentage), активні ефекти (activeEffects), артефакти (equippedArtifacts, isPercentage), пасивки (passiveAbilities, ally_low_hp тощо). |
| 6 | Які джерела **flat** бонусу? | Скіли (isPercentage === false), активні ефекти, артефакти, пасивки. |
| 7 | Як визначається, що скіл стосується **melee** чи **ranged**? | `matchesAttackType(effect.stat, attackType)`: stat може бути melee_damage, ranged_damage, physical_damage; physical_damage — для обох типів. Додатково skill.affectsDamage + skill.damageType (melee/ranged). |
| 8 | Як стакуються кілька бонусів? | Всі процентні — адитивно (totalPercent = sum). Всі flat — адитивно. Фінальний урон: `floor(baseWithStat + percentBonusDamage + totalFlat)`. |

### 1.3 Базовий урон і мінімум

| # | Запитання | Відповідь |
|---|-----------|-----------|
| 9 | Як формується **baseWithStat**? | baseDamage + heroLevelPart + heroDicePart + statModifier; обмежується знизу `BATTLE_CONSTANTS.MIN_DAMAGE` (0). |
| 10 | Чи може baseDamage бути 0? | Так; тоді baseWithStat = heroLevelPart + heroDicePart + statModifier (або 0 якщо сума від’ємна). |

### 1.4 Спеціальні випадки

| # | Запитання | Відповідь |
|---|-----------|-----------|
| 11 | Як обробляються **activeEffects** (бафи/дебафи) у скілах урону? | У `calculateSkillDamagePercentBonus` і `calculateSkillDamageFlatBonus` перебираються також `attacker.battleData.activeEffects`; ефекти з type (melee_damage/ranged_damage тощо) і value/isPercentage додаються до бонусу. |
| 12 | Пасивка **ally_low_hp**: коли спрацьовує? | Коли є союзник з currentHp/maxHp <= threshold (наприклад 15%). Потрібен context.allParticipants. |
| 13 | **additionalDamage** (fire, poison): як входить у підсумок? | У `DamageCalculationResult.additionalDamage`; у поточній реалізації фінальний totalDamage рахується без них (лише physical). У processAttack/breakdown вони можуть додаватися окремо — потрібно узгодити: тест має знати, чи additionalDamage входить у totalDamage, чи ні. | 
| 14 | Крит: подвоєння урону — де? | Не в `calculateDamageWithModifiers`, а в `computeDamageBreakdown`: після виклику multiply totalDamage * 2 і додають рядок у breakdown. Тести криту — в breakdown, не в calculations. |

### 1.5 Заклинання

| # | Запитання | Відповідь |
|---|-----------|-----------|
| 15 | Які функції відповідають за урон заклинання? | `calculateSpellDamageWithEnhancements`, `calculateSpellEffectIncrease`, `calculateSpellAdditionalModifier`, `getSpellTargetChange`. |
| 16 | Які джерела бонусу до заклинання? | activeSkills з spellEnhancements.spellEffectIncrease (%), spellAdditionalModifier (dice/flat). |
| 17 | Резист до заклинання? | `applyResistance(damage, defender, "spell")` — окрема функція; тести обрахунку заклинання можуть не включати резист, або один інтеграційний тест. |

### 1.6 Резист і фінальний урон по цілі

| # | Запитання | Відповідь |
|---|-----------|-----------|
| 18 | Як рахується фінальний урон по цілі з резистом? | `applyResistance(damage, defender, "physical"|"spell")`: з extras.resistances.physical/spell; finalDamage = max(0, damage - floor(damage * resistPercent/100)). |
| 19 | Що якщо резистів немає? | finalDamage = damage, resistMessage = null. |

---

## 2. Флоу обрахунку шкоди (як джерело правди для тестів)

### 2.1 Фізична атака (атака зброєю)

```
1. Вхід: attacker, damageRolls[] → baseDamage = sum(damageRolls)
2. statModifier = (STR|DEX - 10) / 2 (floor) залежно від attackType
3. heroLevelPart = level (якщо герой), heroDicePart = 0 або середнє за нотацією (якщо не передані кубики)
4. baseWithStat = max(MIN_DAMAGE, baseDamage + heroLevelPart + heroDicePart + statModifier)
5. skillPercent = calculateSkillDamagePercentBonus(attacker, attackType)
6. skillFlat = calculateSkillDamageFlatBonus(attacker, attackType)
7. artifactBonuses = calculateArtifactDamageBonus(attacker, attackType)
8. passiveBonuses = calculatePassiveAbilityDamageBonus(attacker, context)
9. totalPercent = skillPercent + artifactBonuses.percent + passiveBonuses.percent
10. percentBonusDamage = floor(baseWithStat * totalPercent / 100)
11. totalFlat = skillFlat + artifactBonuses.flat + passiveBonuses.flat
12. totalDamage = floor(baseWithStat + percentBonusDamage + totalFlat)
13. (Опційно) isCritical → totalDamage *= 2 (у computeDamageBreakdown)
14. (Окремо) applyResistance(totalDamage, target) → finalDamage для цілі
```

### 2.2 Заклинання

```
1. baseDamage = сума кубиків заклинання
2. effectIncrease = calculateSpellEffectIncrease(participant)
3. increaseDamage = floor(baseDamage * effectIncrease / 100)
4. additionalModifier = calculateSpellAdditionalModifier(participant, rollResult)
5. totalDamage = baseDamage + increaseDamage + additionalModifier.damage
6. (Окремо) applyResistance(totalDamage, target, "spell") → finalDamage
```

---

## 3. Рекомендована структура тестів

- **lib/utils/battle/__tests__/battle-damage-calculations.test.ts**
  - `calculateSkillDamagePercentBonus`: без скілів; один скіл melee +30%; ranged не впливає; physical_damage для обох; activeEffects; skill.damageType фільтр.
  - `calculateSkillDamageFlatBonus`: аналогічно для flat.
  - `calculateArtifactDamageBonus`: без артефактів; один артефакт percent; flat; melee vs ranged.
  - `calculatePassiveAbilityDamageBonus`: без пасивок; ally_low_hp спрацьовує/не спрацьовує.
  - `calculateDamageWithModifiers`: мінімальний вхід (baseDamage, statModifier, attackType); з одним скілом +30%; з артефактом; baseWithStat = base + level + dice + stat; перевірка breakdown містить очікувані рядки.
  - `applyResistance`: без резисту; physical 25%; spell 50%; finalDamage не менше 0.

- **lib/utils/battle/__tests__/battle-damage-breakdown.test.ts**
  - `computeDamageBreakdown`: базовий виклик; з критом (totalDamage * 2, breakdown містить "крит"); з additionalDamage з on_attack пасивки.

- **lib/utils/battle/__tests__/battle-spell-calculations.test.ts** (або розширити існуючі spell тести)
  - `calculateSpellEffectIncrease`: без скілів; один скіл +25%.
  - `calculateSpellDamageWithEnhancements`: базовий урон; з spellEffectIncrease; з additionalModifier.

- **lib/utils/battle/__tests__/battle-modifiers-common.test.ts**
  - `matchesAttackType`: melee_damage/ranged_damage/physical_damage для MELEE/RANGED.
  - `calculatePercentBonus`: 100 + 25% = 25; 0% = 0; округлення floor.

Цей список запитань і флоу використовувати як чекліст при написанні та рефакторингу тестів: кожен сценарій має відповідати одному або кільком пунктам вище.
