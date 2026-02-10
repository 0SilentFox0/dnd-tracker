# Тестування механік скілів

Перевірка: **тригер спрацьовує вчасно** і **ефекти накладаються коректно**.

Скіли беруться з **БД кампанії** (ті самі, що на `/campaigns/[id]/dm/skills`). Скрипт завантажує всі скіли кампанії, для кожного визначає основний тригер і викликає відповідний виконавець (onHit, onKill, passive, bonusAction тощо).

## Формат тест-кейсу

- **id** — libraryId скіла з SKILLS.md (наприклад `attack_cleaving_strike`)
- **trigger** — основний тригер для перевірки: `onHit`, `onKill`, `passive`, `bonusAction`, `startRound`, `onBattleStart`, `onLethalDamage`, `beforeOwnerAttack`, тощо
- **expected** — що очікується:
  - для onHit: опис ефекту на ціль або атакуючого (наприклад "target gets bleed 1d4, 2 rounds")
  - для bonusAction/startRound: опис змін (наприклад "participant gets +1 initiative")
  - для passive: "applied at battle start or in damage/AC calculations"

## Скорочення

- **TE** — target enemy (ворог)
- **TA** — target ally (союзник)
- **self** — ефект на того, хто має скіл
- **Dn** — duration n раундів

---

## 1. OnHit — ефекти при попаданні атакою

1. attack_cleaving_strike — Рублячий удар  
   - trigger: onHit  
   - expected: TE отримує DoT bleed 1d4, 2 раунди

2. attack_stunning_strike — Оглушаючий удар  
   - trigger: onHit  
   - expected: TE отримує debuff initiative -2, 1 раунд

3. attack_armor_break — Пошкодження броні  
   - trigger: onHit  
   - expected: TE отримує debuff armor -1, 1 раунд

4. attack_piercing_strike — Пробивний удар  
   - trigger: onHit  
   - expected: ефект damage_resistance (ignore) — ігнорує опір цілі

5. attack_sequence — Послідовність  
   - trigger: onHit  
   - expected: ефект damage stack x2

6. ranged_wounding_shot — Травмуючий постріл  
   - trigger: onHit  
   - expected: TE отримує debuff speed -50%, 1 раунд

7. ranged_armor_piercing — Бронебійний снаряд  
   - trigger: onHit  
   - expected: TE отримує debuff armor -1, 1 раунд

8. ranged_deflecting_arrow — Відбиваюча стріла  
   - trigger: onHit  
   - expected: TE отримує debuff initiative -2, 1 раунд

9. ranged_bullseye — В яблучко  
   - trigger: onHit  
   - expected: ефект guaranteed_hit (oncePerBattle)

10. attack_reward — Нагорода  
    - trigger: onKill  
    - expected: self отримує +1 додаткову дію (oncePerBattle)

---

## 2. Passive / onBattleStart

11. attack_melee_basic — Напад Базовий  
    - trigger: passive  
    - expected: melee_damage +15% (враховується в розрахунку урону)

12. race_human_counter_basic — Контр-атака Люди  
    - trigger: onFirstHitTakenPerRound  
    - expected: counter_damage 15% при першому ударі по учаснику за раунд

13. race_gnome_rune_armor_basic — Рунна броня  
    - trigger: passive  
    - expected: all_resistance 10%

---

## 3. BonusAction

14. race_demon_gate_basic — Відкриття воріт Демони  
    - trigger: bonusAction  
    - expected: summon_tier +1 (або призив істоти — за реалізацією)

15. race_elf_hunter_basic — Мисливець Ельфи  
    - trigger: bonusAction  
    - expected: marked_targets +1

---

## 4. Інші тригери

16. defense_last_stand — Битва до останнього  
    - trigger: onLethalDamage  
    - expected: survive_lethal oncePerBattle — замість смерті залишається 1 HP

17. leadership_resistance — Супротив  
    - trigger: allyHP <= 0.15 (complex)  
    - expected: clear_negative_effects на обраного союзника (oncePerBattle)

---

## Запуск тестів

**CAMPAIGN_ID обов'язковий** — скіли завантажуються з БД кампанії.

```bash
npx tsx scripts/run-skills-testing.ts CAMPAIGN_ID
```

Тільки один тип тригера:

```bash
npx tsx scripts/run-skills-testing.ts CAMPAIGN_ID --filter onHit
```

Якщо CAMPAIGN_ID не вказано, використовується значення з `lib/constants`. Підсумок: скільки скілів пройшло, провалилось, пропущено (скіли лише зі складним тригером або без простого тригера).
