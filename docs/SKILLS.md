{
"meta": {
"version": "1.0",
"description": "Unified skill database. У кожного скіла: category — код категорії (Attack, MagicDark тощо), mainSkill — канонічна назва базового навику в UI (Напад, Магія Темряви). Аліаси типу «Темна Магія» зводяться до «Магія Темряви» через lib/constants/main-skills.ts."
},
"skills": [

    /* ========================= */
    /* ===== RACE SKILLS ======= */
    /* ========================= */

    {
      "id": "race_human_counter_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Контр-атака — Люди",
      "effects": [
        { "stat": "counter_damage", "type": "percent", "value": 15 }
      ],
      "spells": [],
      "trigger": "onFirstHitTakenPerRound",
      "image": ""
    },
    {
      "id": "race_human_counter_advanced",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Advanced",
      "name": "Контр-атака — Люди",
      "effects": [
        { "stat": "counter_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "onFirstHitTakenPerRound",
      "image": ""
    },
    {
      "id": "race_human_counter_expert",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Expert",
      "name": "Контр-атака — Люди",
      "effects": [
        { "stat": "counter_damage", "type": "percent", "value": 40 }
      ],
      "spells": [],
      "trigger": "onFirstHitTakenPerRound",
      "image": ""
    },

    {
      "id": "race_demon_gate_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Відкриття воріт — Демони",
      "effects": [
        { "stat": "summon_tier", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },
    {
      "id": "race_demon_gate_advanced",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Advanced",
      "name": "Відкриття воріт — Демони",
      "effects": [
        { "stat": "summon_tier", "type": "flat", "value": 3 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },
    {
      "id": "race_demon_gate_expert",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Expert",
      "name": "Відкриття воріт — Демони",
      "effects": [
        { "stat": "summon_tier", "type": "flat", "value": 6 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },

    {
      "id": "race_elf_hunter_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Мисливець — Ельфи",
      "effects": [
        { "stat": "marked_targets", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },
    {
      "id": "race_elf_hunter_advanced",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Advanced",
      "name": "Мисливець — Ельфи",
      "effects": [
        { "stat": "marked_targets", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },
    {
      "id": "race_elf_hunter_expert",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Expert",
      "name": "Мисливець — Ельфи",
      "effects": [
        { "stat": "marked_targets", "type": "flat", "value": 3 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },

    {
      "id": "race_necromancer_raise_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Підняття мертвих",
      "effects": [
        { "stat": "resurrect_count", "type": "flat", "value": 1 },
        { "stat": "resurrect_hp", "type": "percent", "value": -10 }
      ],
      "spells": [],
      "trigger": "onCast",
      "image": ""
    },

    {
      "id": "race_mage_omniscience_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Всезнання",
      "effects": [
        { "stat": "spell_slots_lvl4_5", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "race_mage_omniscience_advanced",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Advanced",
      "name": "Всезнання",
      "effects": [
        { "stat": "spell_slots_lvl4_5", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "race_mage_omniscience_expert",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Expert",
      "name": "Всезнання",
      "effects": [
        { "stat": "spell_slots_lvl4_5", "type": "flat", "value": 3 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },

    {
      "id": "race_darkelf_bloodlust_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Жага крові",
      "effects": [
        { "stat": "damage", "type": "formula", "value": "3 * floor(lost_hp_percent / 10)" }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },

    {
      "id": "race_gnome_rune_armor_basic",
      "category": "Race",
      "mainSkill": "Раса",
      "tier": "Basic",
      "name": "Рунна броня",
      "effects": [
        { "stat": "all_resistance", "type": "percent", "value": 10 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },

    /* ========================= */
    /* ======= НАПАД =========== */
    /* ========================= */

    {
      "id": "attack_melee_basic",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": "Basic",
      "name": "Напад — Базовий",
      "effects": [
        { "stat": "melee_damage", "type": "percent", "value": 15 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "attack_melee_advanced",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": "Advanced",
      "name": "Напад — Просунутий",
      "effects": [
        { "stat": "melee_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "attack_melee_expert",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": "Expert",
      "name": "Напад — Експерт",
      "effects": [
        { "stat": "melee_damage", "type": "percent", "value": 40 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "attack_cleaving_strike",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": 1,
      "name": "Рублячий удар",
      "effects": [
        { "stat": "bleed_damage", "type": "dice", "value": "1d4", "duration": 2 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "attack_stunning_strike",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": 1,
      "name": "Оглушаючий удар",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": -2, "duration": 1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "attack_armor_break",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": 1,
      "name": "Пошкодження броні",
      "effects": [
        { "stat": "armor", "type": "flat", "value": -1, "duration": 1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "attack_piercing_strike",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": 2,
      "name": "Пробивний удар",
      "effects": [
        { "stat": "damage_resistance", "type": "ignore", "value": true }
      ],
      "spells": [],
      "trigger": "onHit",
      "image": ""
    },
    {
      "id": "attack_sequence",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": 2,
      "name": "Послідовність",
      "effects": [
        { "stat": "damage", "type": "stack", "value": 2 }
      ],
      "spells": [],
      "trigger": "onHit",
      "image": ""
    },
    {
      "id": "attack_reward",
      "category": "Attack",
      "mainSkill": "Напад",
      "tier": 3,
      "name": "Нагорода",
      "effects": [
        { "stat": "actions", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "onKill && oncePerBattle",
      "image": ""
    },

    /* ========================= */
    /* ===== СТРІЛЬБА ========== */
    /* ========================= */

    {
      "id": "ranged_basic",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": "Basic",
      "name": "Стрільба — Базовий",
      "effects": [
        { "stat": "ranged_damage", "type": "percent", "value": 15 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "ranged_advanced",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": "Advanced",
      "name": "Стрільба — Просунутий",
      "effects": [
        { "stat": "ranged_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "ranged_expert",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": "Expert",
      "name": "Стрільба — Експерт",
      "effects": [
        { "stat": "ranged_damage", "type": "percent", "value": 40 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "ranged_wounding_shot",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": 1,
      "name": "Травмуючий постріл",
      "effects": [
        { "stat": "speed", "type": "percent", "value": -50, "duration": 1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "ranged_armor_piercing",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": 1,
      "name": "Бронебійний снаряд",
      "effects": [
        { "stat": "armor", "type": "flat", "value": -1, "duration": 1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "ranged_deflecting_arrow",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": 1,
      "name": "Відбиваюча стріла",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": -2, "duration": 1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "ranged_bullseye",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": 2,
      "name": "В яблучко",
      "effects": [
        { "stat": "guaranteed_hit", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "onHit && oncePerBattle",
      "image": ""
    },
    {
      "id": "ranged_arrow_cloud",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": 2,
      "name": "Хмара стріл",
      "effects": [
        { "stat": "area_damage", "type": "percent", "value": 40 },
        { "stat": "area_cells", "type": "flat", "value": 9 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4",
      "image": ""
    },
    {
      "id": "ranged_double_target",
      "category": "Ranged",
      "mainSkill": "Стрільба",
      "tier": 3,
      "name": "Постріл по 2 цілям",
      "effects": [
        { "stat": "max_targets", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },

    /* ========================= */
    /* ===== ЗАХИСТ ============ */
    /* ========================= */

    {
      "id": "defense_basic",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": "Basic",
      "name": "Захист — Базовий",
      "effects": [
        { "stat": "physical_resistance", "type": "percent", "value": 10 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "defense_advanced",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": "Advanced",
      "name": "Захист — Просунутий",
      "effects": [
        { "stat": "physical_resistance", "type": "percent", "value": 20 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "defense_expert",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": "Expert",
      "name": "Захист — Експерт",
      "effects": [
        { "stat": "physical_resistance", "type": "percent", "value": 30 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "defense_tenacity",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": 1,
      "name": "Стійкість",
      "effects": [
        { "stat": "hp_bonus", "type": "formula", "value": "2 * hero_level" }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "defense_defiance",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": 1,
      "name": "Супротив",
      "effects": [
        { "stat": "clear_negative_effects", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "allyHP <= 0.15 && oncePerBattle",
      "image": ""
    },
    {
      "id": "defense_redirection",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": 1,
      "name": "Перенаправлення",
      "effects": [
        { "stat": "redirect_physical_damage", "type": "percent", "value": 50 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },
    {
      "id": "defense_last_stand",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": 2,
      "name": "Битва до останнього",
      "effects": [
        { "stat": "survive_lethal", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "onLethalDamage && oncePerBattle",
      "image": ""
    },
    {
      "id": "defense_magic_ward",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": 2,
      "name": "Магічний захист",
      "effects": [
        { "stat": "spell_resistance", "type": "percent", "value": 15 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "defense_readiness",
      "category": "Defense",
      "mainSkill": "Захист",
      "tier": 3,
      "name": "Готовність",
      "effects": [
        { "stat": "attack_before_enemy", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "beforeEnemyAttack",
      "image": ""
    },

    /* ========================= */
    /* ===== МАГІЯ СВІТЛА ====== */
    /* ========================= */

    {
      "id": "magic_light_basic",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": "Basic",
      "name": "Магія Світла — Базовий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_light_advanced",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": "Advanced",
      "name": "Магія Світла — Просунутий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 4 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_light_expert",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": "Expert",
      "name": "Магія Світла — Експерт",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_light_wrath",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": 1,
      "name": "Гнів праведний",
      "effects": [
        { "stat": "spell_area", "type": "flag", "value": true }
      ],
      "spells": ["Караючий удар", "Прискорення"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_light_protection",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": 1,
      "name": "Даруючий захист",
      "effects": [
        { "stat": "spell_area", "type": "flag", "value": true }
      ],
      "spells": ["Ухилення", "Кам'яна шкіра"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_light_blessing",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": 1,
      "name": "Даруючий Благословення",
      "effects": [
        { "stat": "spell_area", "type": "flag", "value": true }
      ],
      "spells": ["Божественна сила", "Зняття чар"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_light_eternal_light",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": 2,
      "name": "Вічне світло",
      "effects": [
        { "stat": "heal", "type": "formula", "value": "2d6 + hero_level" }
      ],
      "spells": [],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_light_banishment",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": 2,
      "name": "Вигнання",
      "effects": [
        { "stat": "enemy_summon_damage", "type": "percent", "value": 50 }
      ],
      "spells": [],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_light_all_allies",
      "category": "MagicLight",
      "mainSkill": "Магія Світла",
      "tier": 3,
      "name": "Всі заклинання світла на союзників",
      "effects": [
        { "stat": "light_spells_target_all_allies", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },

    /* ========================= */
    /* ===== МАГІЯ ТЕМРЯВИ ===== */
    /* ========================= */

    {
      "id": "magic_dark_basic",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": "Basic",
      "name": "Магія Темряви — Базовий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_dark_advanced",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": "Advanced",
      "name": "Магія Темряви — Просунутий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 4 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_dark_expert",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": "Expert",
      "name": "Магія Темряви — Експерт",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_dark_lord_pain",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": 1,
      "name": "Повелитель болі",
      "effects": [
        { "stat": "spell_area", "type": "flag", "value": true }
      ],
      "spells": ["Чума", "Промінь Руйнації"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_dark_lord_mind",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": 1,
      "name": "Повелитель розуму",
      "effects": [
        { "stat": "spell_area", "type": "flag", "value": true }
      ],
      "spells": ["Сповільнення", "Розсіяність"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_dark_lord_curse",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": 1,
      "name": "Повелитель Проклять",
      "effects": [
        { "stat": "spell_area", "type": "flag", "value": true }
      ],
      "spells": ["Ослаблення", "Немічність"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_dark_death_march",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": 2,
      "name": "Поступ смерті",
      "effects": [
        { "stat": "dark_spell_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_dark_devourer",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": 2,
      "name": "Пожирач",
      "effects": [
        { "stat": "restore_spell_slot", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction && onConsumeDead",
      "image": ""
    },
    {
      "id": "magic_dark_master",
      "category": "MagicDark",
      "mainSkill": "Магія Темряви",
      "tier": 3,
      "name": "Майстер темряви",
      "effects": [
        { "stat": "spell_targets_lvl4_5", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },

    /* ========================= */
    /* ===== МАГІЯ ХАОСУ ====== */
    /* ========================= */

    {
      "id": "magic_chaos_basic",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": "Basic",
      "name": "Магія Хаосу — Базовий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_chaos_advanced",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": "Advanced",
      "name": "Магія Хаосу — Просунутий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 4 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_chaos_expert",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": "Expert",
      "name": "Магія Хаосу — Експерт",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_chaos_lord_storm",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": 1,
      "name": "Повелитель бурі",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": -5, "duration": 1 }
      ],
      "spells": ["Блискавка", "Ланцюгова блискавка"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_chaos_lord_fire",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": 1,
      "name": "Повелитель вогню",
      "effects": [
        { "stat": "armor_reduction", "type": "percent", "value": 30, "duration": 1 }
      ],
      "spells": ["Вогняний шар", "Стіна Вогню", "Армагедон"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_chaos_lord_cold",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": 1,
      "name": "Повелитель холоду",
      "effects": [
        { "stat": "speed", "type": "percent", "value": -50, "duration": 1 }
      ],
      "spells": ["Льодяна Брила", "Кільце Холоду", "Зупиняючий холод"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_chaos_mana_burst",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": 2,
      "name": "Вибух мани",
      "effects": [
        { "stat": "caster_self_damage", "type": "percent", "value": 100 }
      ],
      "spells": [],
      "trigger": "bonusAction && rand() < 0.5 && twicePerBattle",
      "image": ""
    },
    {
      "id": "magic_chaos_infernal_power",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": 2,
      "name": "Пекельна сила",
      "effects": [
        { "stat": "chaos_spell_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_chaos_pyrokinesis",
      "category": "MagicChaos",
      "mainSkill": "Магія Хаосу",
      "tier": 3,
      "name": "Пірокінез",
      "effects": [
        { "stat": "burn_damage", "type": "dice", "value": "2d6", "duration": 3 }
      ],
      "spells": [],
      "trigger": "onCast",
      "image": ""
    },

    /* ========================= */
    /* ===== МАГІЯ ПРИЗИВУ ===== */
    /* ========================= */

    {
      "id": "magic_summon_basic",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": "Basic",
      "name": "Магія Призиву — Базовий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_summon_advanced",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": "Advanced",
      "name": "Магія Призиву — Просунутий",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 4 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_summon_expert",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": "Expert",
      "name": "Магія Призиву — Експерт",
      "effects": [
        { "stat": "spell_levels", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_summon_lord_charms",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": 1,
      "name": "Повелитель чар",
      "effects": [
        { "stat": "summon_hp", "type": "percent", "value": 25 },
        { "stat": "summon_damage", "type": "percent", "value": 25 }
      ],
      "spells": ["Призив Фенікса", "Призив елементалів"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_summon_lord_crystal",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": 1,
      "name": "Повелитель кристалу",
      "effects": [
        { "stat": "spell_damage", "type": "percent", "value": 25 },
        { "stat": "spell_hp", "type": "percent", "value": 25 }
      ],
      "spells": ["Магічний Кристал", "Стіна Мечів", "Вогняна пастка"],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_summon_banishment",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": 2,
      "name": "Вигнання",
      "effects": [
        { "stat": "enemy_summon_damage", "type": "percent", "value": 50 }
      ],
      "spells": [],
      "trigger": "onCast",
      "image": ""
    },
    {
      "id": "magic_summon_chosen_elemental",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": 2,
      "name": "Обраний елементаль",
      "effects": [
        { "stat": "new_spell", "type": "flag", "value": "Призив обраного елементаля" }
      ],
      "spells": ["Призив обраного елементаля"],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_summon_forest_roots",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": 2,
      "name": "Корені лісу",
      "effects": [
        { "stat": "new_spell", "type": "flag", "value": "Корені" }
      ],
      "spells": ["Корені"],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "magic_summon_eternal_warriors",
      "category": "MagicSummon",
      "mainSkill": "Магія Призиву",
      "tier": 3,
      "name": "Вічні воїни",
      "effects": [
        { "stat": "summon_count", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "onCast",
      "image": ""
    },

    /* ========================= */
    /* ===== ЛІДЕРСТВО ========= */
    /* ========================= */

    {
      "id": "leadership_basic",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": "Basic",
      "name": "Лідерство — Базовий",
      "effects": [
        { "stat": "morale", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "leadership_advanced",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": "Advanced",
      "name": "Лідерство — Просунутий",
      "effects": [
        { "stat": "morale", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "leadership_expert",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": "Expert",
      "name": "Лідерство — Експерт",
      "effects": [
        { "stat": "morale", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "leadership_empathy",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": 1,
      "name": "Співпереживання",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": 1, "duration": 1 }
      ],
      "spells": [],
      "trigger": "allyMoraleCheck && stackable",
      "image": ""
    },
    {
      "id": "leadership_recovery",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": 1,
      "name": "Відновлення",
      "effects": [
        { "stat": "morale_restore", "type": "flat", "value": 0 }
      ],
      "spells": [],
      "trigger": "passive && moraleNegativeNextRound",
      "image": ""
    },
    {
      "id": "leadership_vengeance",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": 1,
      "name": "Відплата",
      "effects": [
        { "stat": "physical_damage", "type": "formula", "value": "0.05 * morale" }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "leadership_inspiration",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": 2,
      "name": "Натхнення",
      "effects": [
        { "stat": "morale", "type": "flat", "value": 1, "duration": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction",
      "image": ""
    },
    {
      "id": "leadership_vengeance_kill",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": 2,
      "name": "Помста",
      "effects": [
        { "stat": "morale_per_kill", "type": "flat", "value": 1 },
        { "stat": "morale_per_ally_death", "type": "flat", "value": -2 }
      ],
      "spells": [],
      "trigger": "onKill || onAllyDeath",
      "image": ""
    },
    {
      "id": "leadership_success",
      "category": "Leadership",
      "mainSkill": "Лідерство",
      "tier": 3,
      "name": "Успіх",
      "effects": [
        { "stat": "damage", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "onMoraleSuccess && stackable",
      "image": ""
    },

    /* ========================= */
    /* ======= ULTIMATES ======= */
    /* ========================= */

    {
      "id": "ultimate_human_angel",
      "category": "Ultimate",
      "mainSkill": "Ультимат",
      "tier": "Ultimate",
      "name": "Ангел Хранитель",
      "effects": [
        { "stat": "revive_hp", "type": "percent", "value": 50 }
      ],
      "spells": [],
      "trigger": "action && oncePerBattle",
      "image": ""
    },
    {
      "id": "ultimate_demon_magma",
      "category": "Ultimate",
      "mainSkill": "Ультимат",
      "tier": "Ultimate",
      "name": "Пекельна Земля",
      "effects": [
        { "stat": "field_damage", "type": "formula", "value": "hero_level / 2" }
      ],
      "spells": [],
      "trigger": "oncePerBattle",
      "image": ""
    },
    {
      "id": "ultimate_elf_luck",
      "category": "Ultimate",
      "mainSkill": "Ультимат",
      "tier": "Ultimate",
      "name": "Неймовірна удача",
      "effects": [
        { "stat": "crit_threshold", "type": "flat", "value": 18 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "ultimate_necromancer_banshee",
      "category": "Ultimate",
      "mainSkill": "Ультимат",
      "tier": "Ultimate",
      "name": "Крик Банші",
      "effects": [
        { "stat": "morale", "type": "flat", "value": -3 }
      ],
      "spells": [],
      "trigger": "action && oncePerBattle",
      "image": ""
    },
    {
      "id": "ultimate_mage_mark",
      "category": "Ultimate",
      "mainSkill": "Ультимат",
      "tier": "Ultimate",
      "name": "Знак Мага",
      "effects": [
        { "stat": "extra_casts", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "bonusAction && twicePerBattle",
      "image": ""
    },

    /* ========================= */
    /* ===== PERSONAL SKILLS === */
    /* ========================= */

    {
      "id": "personal_isabel",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Ізабель",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": 2 },
        { "stat": "damage", "type": "formula", "value": "1d4 + hero_level / 3" }
      ],
      "spells": [],
      "trigger": "onBattleStart",
      "image": ""
    },
    {
      "id": "personal_godric",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Годрик",
      "effects": [
        { "stat": "morale", "type": "min", "value": 1 },
        { "stat": "damage", "type": "formula", "value": "1d4 + hero_level / 3" }
      ],
      "spells": [],
      "trigger": "passive && allyHP <= 0.15 * maxHP",
      "image": ""
    },
    {
      "id": "personal_agriel",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Аграїл",
      "effects": [
        { "stat": "fire_damage", "type": "dice", "value": "1d6" }
      ],
      "spells": [],
      "trigger": "onAttack",
      "image": ""
    },
    {
      "id": "personal_beatrice",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Беатріс",
      "effects": [
        { "stat": "control_units", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "personal_kha_beleth",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Кха-Белех",
      "effects": [
        { "stat": "area_damage", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "onAttack",
      "image": ""
    },
    {
      "id": "personal_ivan",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Айвен",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": 999 },
        { "stat": "advantage", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "passive && onFirstRangedAttack",
      "image": ""
    },
    {
      "id": "personal_raillag",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Раїлаг",
      "effects": [
        { "stat": "poison_damage", "type": "dice", "value": "1d8", "duration": 3 }
      ],
      "spells": [],
      "trigger": "onAttack",
      "image": ""
    },
    {
      "id": "personal_wulfrina",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Вульфріна",
      "effects": [
        { "stat": "enemy_attack_disadvantage", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "personal_zehir",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Зехір",
      "effects": [
        { "stat": "magic_schools", "type": "flag", "value": "all" },
        { "stat": "exp_gain", "type": "multiplier", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive",
      "image": ""
    },
    {
      "id": "personal_markel",
      "category": "Personal",
      "mainSkill": "Персональні",
      "tier": "Hero",
      "name": "Маркел",
      "effects": [
        { "stat": "new_spell", "type": "flag", "value": "Аватар" }
      ],
      "spells": ["Аватар"],
      "trigger": "passive",
      "image": ""
    }

]
}

# Скіли

Расовий навик: Контр атака, 1 раз за раунд герой дає посилений удар відсіч першому ворогу який його атакував +15%/+25%/+40%
Ульта - Ангел Хранитель - 1 раз за бій воскресити союзника з 50% HP - дія

### Демони

Расовий навик: Відкриття воріт, бонус дія яка прикликає з пекла 1 юніта-демона Tier 1/3/6
Ульта - Пекельна Земля- 1 раз за бій все ігрове поле стає магмою яка наносить шкоду всім ворогам {рівень героя /2}

### Ельфи

Расовий навик: Мисливець, бонус дія позначає істот на яких на наступний рауд буде advantage на атаку. Позначених істот 1/2/3
Ульта - Неймовірна Удача - значення критичного успіху ≥ 18

Некромант
Расовий навик: Підняття мертвих, піднімає 1/2/3 істоти які були мертві з -10% HP
Ульта - Крик Банші - дія 1 раз за бій, Понижає мораль всіх юнітів на 3

Маги
Расовий навик: Всезнання додає 1/2/3 магічних слота для 4 та 5 рівня магії
Ульта - Знак Мага, бонус дія, дозволяє 2 рази за бій використати одразу два заклианання

Темні ельфи
Расовий навик - Жага Крові - додає +3/+4/+5 шкоди за кожні 10% втраченого здоровя
Ульта - Кривавий ритуал, Показує життя всіх ворогів в кого ≤ 50% HP

Гноми
Расовий навик Рунна Броня дає опір від всієї шкоди 10%/15%/20%
Ульта Рунічна Атака - після кожного удару отримує на 1 раунд 1 з 4 рун

Персональні скіли

Ізабель - на початку бою дає всім союзникам +2 ініціативи + {1к4 + рівень героя /3}
Годрик - мораль завжди > 0, якщо хтось з союзників має ≤15% HP отримує + {1к4 + рівень героя /3} шкоди

Агарїл - всі атаки героя і його демонів наносять додатково 1к6 шкоди вогнем
Беатрис - +1 юніт для заклинань коетролю
Кха-Белех - атака наносить шкоду всім ворогам на полі

Айвен - ініціатива завжди 999, advantage на перший постріл
Райлаг - отруєння всі атаки героя отруюють ворога на 1к8 шкоди на 3 раунди
Вульфріна - disadvantage на всі направлені атаки ворога

Зехір - може вивчати всі школи магії, отримує х2 досвіду

Маркел - додаткове заклинання Аватар
