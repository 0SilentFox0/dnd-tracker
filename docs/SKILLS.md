{
"meta": {
"version": "1.0",
"description": "Unified skill database"
},
"skills": [

    /* ========================= */
    /* ======= ATTACK ========== */
    /* ========================= */

    {
      "id": "attack_basic",
      "category": "Attack",
      "tier": "Basic",
      "name": "Напад — Базовий",
      "effects": [
        { "stat": "melee_damage", "type": "percent", "value": 15 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "attack_advanced",
      "category": "Attack",
      "tier": "Advanced",
      "name": "Напад — Просунутий",
      "effects": [
        { "stat": "melee_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "attack_expert",
      "category": "Attack",
      "tier": "Expert",
      "name": "Напад — Експерт",
      "effects": [
        { "stat": "melee_damage", "type": "percent", "value": 40 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "cleaving_strike",
      "category": "Attack",
      "tier": 1,
      "name": "Рублячий удар",
      "effects": [
        { "stat": "bleed_damage", "type": "dice", "value": "1d4", "duration": 2 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4"
    },
    {
      "id": "stunning_strike",
      "category": "Attack",
      "tier": 1,
      "name": "Оглушаючий удар",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": -2, "duration": 1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4"
    },
    {
      "id": "armor_break",
      "category": "Attack",
      "tier": 1,
      "name": "Пошкодження броні",
      "effects": [
        { "stat": "armor", "type": "flat", "value": -1 }
      ],
      "spells": [],
      "trigger": "onHit && rand() < 0.4"
    },
    {
      "id": "tenacity",
      "category": "Attack",
      "tier": 2,
      "name": "Завзятість",
      "effects": [
        { "stat": "damage", "type": "flat", "value": 3, "duration": 1 },
        { "stat": "armor", "type": "flat", "value": -1, "duration": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },
    {
      "id": "piercing_strike",
      "category": "Attack",
      "tier": 2,
      "name": "Пробивний удар",
      "effects": [
        { "stat": "damage_resistance", "type": "ignore", "value": true }
      ],
      "spells": [],
      "trigger": "onHit"
    },
    {
      "id": "sequence",
      "category": "Attack",
      "tier": 2,
      "name": "Послідовність",
      "effects": [
        { "stat": "damage", "type": "stack", "value": 2 }
      ],
      "spells": [],
      "trigger": "onHit"
    },
    {
      "id": "reward",
      "category": "Attack",
      "tier": 3,
      "name": "Нагорода",
      "effects": [
        { "stat": "actions", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "onKill"
    },

    /* ========================= */
    /* ===== RACE SKILLS ======= */
    /* ========================= */

    {
      "id": "race_human_counter_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Контр-атака — Люди",
      "effects": [
        { "stat": "counter_damage", "type": "percent", "value": 15 }
      ],
      "spells": [],
      "trigger": "onFirstHitTakenPerRound"
    },
    {
      "id": "race_human_counter_advanced",
      "category": "Race",
      "tier": "Advanced",
      "name": "Контр-атака — Люди",
      "effects": [
        { "stat": "counter_damage", "type": "percent", "value": 25 }
      ],
      "spells": [],
      "trigger": "onFirstHitTakenPerRound"
    },
    {
      "id": "race_human_counter_expert",
      "category": "Race",
      "tier": "Expert",
      "name": "Контр-атака — Люди",
      "effects": [
        { "stat": "counter_damage", "type": "percent", "value": 40 }
      ],
      "spells": [],
      "trigger": "onFirstHitTakenPerRound"
    },

    {
      "id": "race_demon_gate_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Відкриття воріт — Демони",
      "effects": [
        { "stat": "summon_tier", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },
    {
      "id": "race_demon_gate_advanced",
      "category": "Race",
      "tier": "Advanced",
      "name": "Відкриття воріт — Демони",
      "effects": [
        { "stat": "summon_tier", "type": "flat", "value": 3 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },
    {
      "id": "race_demon_gate_expert",
      "category": "Race",
      "tier": "Expert",
      "name": "Відкриття воріт — Демони",
      "effects": [
        { "stat": "summon_tier", "type": "flat", "value": 6 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },

    {
      "id": "race_elf_hunter_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Мисливець — Ельфи",
      "effects": [
        { "stat": "marked_targets", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },
    {
      "id": "race_elf_hunter_advanced",
      "category": "Race",
      "tier": "Advanced",
      "name": "Мисливець — Ельфи",
      "effects": [
        { "stat": "marked_targets", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },
    {
      "id": "race_elf_hunter_expert",
      "category": "Race",
      "tier": "Expert",
      "name": "Мисливець — Ельфи",
      "effects": [
        { "stat": "marked_targets", "type": "flat", "value": 3 }
      ],
      "spells": [],
      "trigger": "bonusAction"
    },

    {
      "id": "race_necromancer_raise_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Підняття мертвих",
      "effects": [
        { "stat": "resurrect_count", "type": "flat", "value": 1 },
        { "stat": "resurrect_hp", "type": "percent", "value": -10 }
      ],
      "spells": [],
      "trigger": "onCast"
    },

    {
      "id": "race_mage_omniscience_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Всезнання",
      "effects": [
        { "stat": "spell_slots_lvl4_5", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "race_mage_omniscience_advanced",
      "category": "Race",
      "tier": "Advanced",
      "name": "Всезнання",
      "effects": [
        { "stat": "spell_slots_lvl4_5", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "race_mage_omniscience_expert",
      "category": "Race",
      "tier": "Expert",
      "name": "Всезнання",
      "effects": [
        { "stat": "spell_slots_lvl4_5", "type": "flat", "value": 3 }
      ],
      "spells": [],
      "trigger": "passive"
    },

    {
      "id": "race_darkelf_bloodlust_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Жага крові",
      "effects": [
        { "stat": "damage", "type": "formula", "value": "3 * floor(lost_hp_percent / 10)" }
      ],
      "spells": [],
      "trigger": "passive"
    },

    {
      "id": "race_gnome_rune_armor_basic",
      "category": "Race",
      "tier": "Basic",
      "name": "Рунна броня",
      "effects": [
        { "stat": "all_resistance", "type": "percent", "value": 10 }
      ],
      "spells": [],
      "trigger": "passive"
    },

    /* ========================= */
    /* ======= ULTIMATES ======= */
    /* ========================= */

    {
      "id": "ultimate_human_angel",
      "category": "Ultimate",
      "tier": "Ultimate",
      "name": "Ангел Хранитель",
      "effects": [
        { "stat": "revive_hp", "type": "percent", "value": 50 }
      ],
      "spells": [],
      "trigger": "action && oncePerBattle"
    },
    {
      "id": "ultimate_demon_magma",
      "category": "Ultimate",
      "tier": "Ultimate",
      "name": "Пекельна Земля",
      "effects": [
        { "stat": "field_damage", "type": "formula", "value": "hero_level / 2" }
      ],
      "spells": [],
      "trigger": "oncePerBattle"
    },
    {
      "id": "ultimate_elf_luck",
      "category": "Ultimate",
      "tier": "Ultimate",
      "name": "Неймовірна удача",
      "effects": [
        { "stat": "crit_threshold", "type": "flat", "value": 18 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "ultimate_necromancer_banshee",
      "category": "Ultimate",
      "tier": "Ultimate",
      "name": "Крик Банші",
      "effects": [
        { "stat": "morale", "type": "flat", "value": -3 }
      ],
      "spells": [],
      "trigger": "action && oncePerBattle"
    },
    {
      "id": "ultimate_mage_mark",
      "category": "Ultimate",
      "tier": "Ultimate",
      "name": "Знак Мага",
      "effects": [
        { "stat": "extra_casts", "type": "flat", "value": 2 }
      ],
      "spells": [],
      "trigger": "bonusAction && twicePerBattle"
    },

    /* ========================= */
    /* ===== PERSONAL SKILLS === */
    /* ========================= */

    {
      "id": "personal_isabel",
      "category": "Personal",
      "tier": "Hero",
      "name": "Ізабель",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": 2 },
        { "stat": "damage", "type": "formula", "value": "1d4 + hero_level / 3" }
      ],
      "spells": [],
      "trigger": "onBattleStart"
    },
    {
      "id": "personal_godric",
      "category": "Personal",
      "tier": "Hero",
      "name": "Годрик",
      "effects": [
        { "stat": "morale", "type": "min", "value": 1 },
        { "stat": "damage", "type": "formula", "value": "1d4 + hero_level / 3" }
      ],
      "spells": [],
      "trigger": "passive && allyHP <= 0.15 * maxHP"
    },
    {
      "id": "personal_agriel",
      "category": "Personal",
      "tier": "Hero",
      "name": "Аграїл",
      "effects": [
        { "stat": "fire_damage", "type": "dice", "value": "1d6" }
      ],
      "spells": [],
      "trigger": "onAttack"
    },
    {
      "id": "personal_beatrice",
      "category": "Personal",
      "tier": "Hero",
      "name": "Беатріс",
      "effects": [
        { "stat": "control_units", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "personal_kha_beleth",
      "category": "Personal",
      "tier": "Hero",
      "name": "Кха-Белех",
      "effects": [
        { "stat": "area_damage", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "onAttack"
    },
    {
      "id": "personal_ivan",
      "category": "Personal",
      "tier": "Hero",
      "name": "Айвен",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": 999 },
        { "stat": "advantage", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "passive && onFirstRangedAttack"
    },
    {
      "id": "personal_raillag",
      "category": "Personal",
      "tier": "Hero",
      "name": "Раїлаг",
      "effects": [
        { "stat": "poison_damage", "type": "dice", "value": "1d8", "duration": 3 }
      ],
      "spells": [],
      "trigger": "onAttack"
    },
    {
      "id": "personal_wulfrina",
      "category": "Personal",
      "tier": "Hero",
      "name": "Вульфріна",
      "effects": [
        { "stat": "enemy_attack_disadvantage", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "personal_zehir",
      "category": "Personal",
      "tier": "Hero",
      "name": "Зехір",
      "effects": [
        { "stat": "magic_schools", "type": "flag", "value": "all" },
        { "stat": "exp_gain", "type": "multiplier", "value": 2 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "personal_markel",
      "category": "Personal",
      "tier": "Hero",
      "name": "Маркел",
      "effects": [
        { "stat": "new_spell", "type": "flag", "value": "Аватар" }
      ],
      "spells": ["Аватар"],
      "trigger": "passive"
    }

]
}
{
"magic_skills": [

    /* ========================= */
    /* ===== LIGHT MAGIC ====== */
    /* ========================= */

    {
      "id": "light_basic",
      "category": "MagicLight",
      "tier": "Basic",
      "name": "Магія Світла — Базовий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "1-2" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "light_advanced",
      "category": "MagicLight",
      "tier": "Advanced",
      "name": "Магія Світла — Просунутий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "3-4" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "light_expert",
      "category": "MagicLight",
      "tier": "Expert",
      "name": "Магія Світла — Експерт",
      "effects": [
        { "stat": "spell_access", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "light_righteous_fury",
      "category": "MagicLight",
      "tier": 1,
      "name": "Гнів праведний",
      "effects": [
        { "stat": "area_effect", "type": "flag", "value": true }
      ],
      "spells": ["Караючий удар", "Прискорення"],
      "trigger": "onCast"
    },
    {
      "id": "light_gifting_protection",
      "category": "MagicLight",
      "tier": 1,
      "name": "Даруючий захист",
      "effects": [
        { "stat": "area_effect", "type": "flag", "value": true }
      ],
      "spells": ["Ухилення", "Кам’яна шкіра"],
      "trigger": "onCast"
    },
    {
      "id": "light_gifting_blessing",
      "category": "MagicLight",
      "tier": 1,
      "name": "Даруючий благословення",
      "effects": [
        { "stat": "area_effect", "type": "flag", "value": true }
      ],
      "spells": ["Божественна сила", "Зняття чар"],
      "trigger": "onCast"
    },
    {
      "id": "light_divine_power",
      "category": "MagicLight",
      "tier": 2,
      "name": "Божа сила",
      "effects": [
        { "stat": "spell_power", "type": "percent", "value": 25 }
      ],
      "spells": ["усі світлі"],
      "trigger": "passive"
    },
    {
      "id": "light_eternal_light",
      "category": "MagicLight",
      "tier": 2,
      "name": "Вічне світло",
      "effects": [
        { "stat": "healing", "type": "dice", "value": "2d6 + hero_level" }
      ],
      "spells": ["нове заклинання"],
      "trigger": "onCast"
    },
    {
      "id": "light_banish",
      "category": "MagicLight",
      "tier": 2,
      "name": "Вигнання",
      "effects": [
        { "stat": "summon_hp", "type": "percent", "value": -50 }
      ],
      "spells": [],
      "trigger": "onCast"
    },
    {
      "id": "light_master",
      "category": "MagicLight",
      "tier": 3,
      "name": "Майстер Світла",
      "effects": [
        { "stat": "targets", "type": "flag", "value": "all_allies" }
      ],
      "spells": ["усі світлі"],
      "trigger": "onCast"
    },

    /* ========================= */
    /* ===== DARK MAGIC ======= */
    /* ========================= */

    {
      "id": "dark_basic",
      "category": "MagicDark",
      "tier": "Basic",
      "name": "Магія Темряви — Базовий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "1-2" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "dark_advanced",
      "category": "MagicDark",
      "tier": "Advanced",
      "name": "Магія Темряви — Просунутий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "3-4" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "dark_expert",
      "category": "MagicDark",
      "tier": "Expert",
      "name": "Магія Темряви — Експерт",
      "effects": [
        { "stat": "spell_access", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "dark_lord_of_pain",
      "category": "MagicDark",
      "tier": 1,
      "name": "Повелитель болі",
      "effects": [
        { "stat": "area_effect", "type": "flag", "value": true }
      ],
      "spells": ["Чума", "Промінь розрухи"],
      "trigger": "onCast"
    },
    {
      "id": "dark_lord_of_mind",
      "category": "MagicDark",
      "tier": 1,
      "name": "Повелитель розуму",
      "effects": [
        { "stat": "area_effect", "type": "flag", "value": true }
      ],
      "spells": ["Сповільнення", "Розсіяність"],
      "trigger": "onCast"
    },
    {
      "id": "dark_lord_of_curses",
      "category": "MagicDark",
      "tier": 1,
      "name": "Повелитель проклять",
      "effects": [
        { "stat": "area_effect", "type": "flag", "value": true }
      ],
      "spells": ["Ослаблення", "Немічність"],
      "trigger": "onCast"
    },
    {
      "id": "dark_march_of_death",
      "category": "MagicDark",
      "tier": 2,
      "name": "Поступ смерті",
      "effects": [
        { "stat": "spell_power", "type": "percent", "value": 25 }
      ],
      "spells": ["усі темні"],
      "trigger": "passive"
    },
    {
      "id": "dark_compensation",
      "category": "MagicDark",
      "tier": 2,
      "name": "Компенсація",
      "effects": [
        { "stat": "random_spell", "type": "range", "value": "1-3" }
      ],
      "spells": [],
      "trigger": "onAttack"
    },
    {
      "id": "dark_devourer",
      "category": "MagicDark",
      "tier": 2,
      "name": "Пожирач",
      "effects": [
        { "stat": "spell_slots", "type": "flat", "value": 1 }
      ],
      "spells": [],
      "trigger": "bonusAction && onUnitDeath"
    },
    {
      "id": "dark_master",
      "category": "MagicDark",
      "tier": 3,
      "name": "Майстер темряви",
      "effects": [
        { "stat": "targets", "type": "flat", "value": 2 }
      ],
      "spells": ["4-5 рівень"],
      "trigger": "onCast"
    },

    /* ========================= */
    /* ===== CHAOS MAGIC ====== */
    /* ========================= */

    {
      "id": "chaos_basic",
      "category": "MagicChaos",
      "tier": "Basic",
      "name": "Магія Хаосу — Базовий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "1-2" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "chaos_advanced",
      "category": "MagicChaos",
      "tier": "Advanced",
      "name": "Магія Хаосу — Просунутий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "3-4" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "chaos_expert",
      "category": "MagicChaos",
      "tier": "Expert",
      "name": "Магія Хаосу — Експерт",
      "effects": [
        { "stat": "spell_access", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "chaos_storm_lord",
      "category": "MagicChaos",
      "tier": 1,
      "name": "Повелитель бурі",
      "effects": [
        { "stat": "initiative", "type": "flat", "value": -5, "duration": 1 }
      ],
      "spells": ["Блискавка", "Ланцюгова блискавка"],
      "trigger": "onCast"
    },
    {
      "id": "chaos_fire_lord",
      "category": "MagicChaos",
      "tier": 1,
      "name": "Повелитель вогню",
      "effects": [
        { "stat": "defense", "type": "percent", "value": -30, "duration": 1 }
      ],
      "spells": ["Вогняний шар", "Стіна вогню", "Армагедон"],
      "trigger": "onCast"
    },
    {
      "id": "chaos_ice_lord",
      "category": "MagicChaos",
      "tier": 1,
      "name": "Повелитель холоду",
      "effects": [
        { "stat": "speed", "type": "percent", "value": -50, "duration": 1 }
      ],
      "spells": ["Льодяна брила", "Кільце холоду", "Зупиняючий холод"],
      "trigger": "onCast"
    },
    {
      "id": "chaos_mana_burst",
      "category": "MagicChaos",
      "tier": 2,
      "name": "Вибух мани",
      "effects": [
        { "stat": "reflect_spell", "type": "flag", "value": true }
      ],
      "spells": [],
      "trigger": "bonusAction && enemyCasts && rand() < 0.5 && uses < 2"
    },
    {
      "id": "chaos_hell_power",
      "category": "MagicChaos",
      "tier": 2,
      "name": "Пекельна сила",
      "effects": [
        { "stat": "spell_damage", "type": "percent", "value": 25 }
      ],
      "spells": ["усі хаосу"],
      "trigger": "passive"
    },
    {
      "id": "chaos_fire_attack",
      "category": "MagicChaos",
      "tier": 2,
      "name": "Вогняна атака",
      "effects": [
        { "stat": "fire_damage", "type": "dice", "value": "1d6" }
      ],
      "spells": [],
      "trigger": "onAttack"
    },
    {
      "id": "chaos_pyrokinesis",
      "category": "MagicChaos",
      "tier": 3,
      "name": "Пірокінез",
      "effects": [
        { "stat": "burn_damage", "type": "dice", "value": "2d6", "duration": 3 }
      ],
      "spells": ["усі хаосу"],
      "trigger": "onCast"
    },

    /* ========================= */
    /* ===== SUMMON MAGIC ===== */
    /* ========================= */

    {
      "id": "summon_basic",
      "category": "MagicSummon",
      "tier": "Basic",
      "name": "Магія Призиву — Базовий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "1-2" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "summon_advanced",
      "category": "MagicSummon",
      "tier": "Advanced",
      "name": "Магія Призиву — Просунутий",
      "effects": [
        { "stat": "spell_access", "type": "range", "value": "3-4" }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "summon_expert",
      "category": "MagicSummon",
      "tier": "Expert",
      "name": "Магія Призиву — Експерт",
      "effects": [
        { "stat": "spell_access", "type": "flat", "value": 5 }
      ],
      "spells": [],
      "trigger": "passive"
    },
    {
      "id": "summon_life_lord",
      "category": "MagicSummon",
      "tier": 1,
      "name": "Повелитель життя",
      "effects": [
        { "stat": "spell_power", "type": "percent", "value": 25 }
      ],
      "spells": ["Магічний кулак", "Підняття мертвих"],
      "trigger": "passive"
    },
    {
      "id": "summon_charm_lord",
      "category": "MagicSummon",
      "tier": 1,
      "name": "Повелитель чар",
      "effects": [
        { "stat": "summon_hp", "type": "percent", "value": 25 },
        { "stat": "summon_damage", "type": "percent", "value": 25 }
      ],
      "spells": ["Фенікс", "Елементалі"],
      "trigger": "passive"
    },
    {
      "id": "summon_frost_lord",
      "category": "MagicSummon",
      "tier": 1,
      "name": "Повелитель холоду",
      "effects": [
        { "stat": "summon_hp", "type": "percent", "value": 25 },
        { "stat": "summon_damage", "type": "percent", "value": 25 }
      ],
      "spells": ["Магічний кристал", "Стіна мечів", "Вогняна пастка"],
      "trigger": "passive"
    },
    {
      "id": "summon_banish",
      "category": "MagicSummon",
      "tier": 2,
      "name": "Вигнання",
      "effects": [
        { "stat": "summon_hp", "type": "percent", "value": -50 }
      ],
      "spells": [],
      "trigger": "onCast"
    },
    {
      "id": "summon_chosen_elemental",
      "category": "MagicSummon",
      "tier": 2,
      "name": "Обраний елементаль",
      "effects": [
        { "stat": "new_spell", "type": "flag", "value": "Призив обраного елементаля" }
      ],
      "spells": ["Призив обраного елементаля"],
      "trigger": "passive"
    },
    {
      "id": "summon_forest_roots",
      "category": "MagicSummon",
      "tier": 2,
      "name": "Корені лісу",
      "effects": [
        { "stat": "new_spell", "type": "flag", "value": "Корені" }
      ],
      "spells": ["Корені"],
      "trigger": "passive"
    },
    {
      "id": "summon_eternal_warriors",
      "category": "MagicSummon",
      "tier": 3,
      "name": "Вічні воїни",
      "effects": [
        { "stat": "summon_count", "type": "flat", "value": 2 }
      ],
      "spells": ["Елементалі"],
      "trigger": "onCast"
    }

]
}

# Скіли

## Напад

Базовий + 15% до мілі атак
Просунутий + 25% до мілі атак
Експерт + 40% до мілі атак

### 1 рівень

- Рублячий удар - з шансом 40% удар завдає рани яка кровить наступні 2 раунди з 1д4 урону
- Оглушаючий удар - з шансом 40% удар зменшує ініціативу жертви на 2 на 1 раунд
- Пошкодження броні - з шансом 40% удар зменшує 1 броню цілі

### Рівень 2

- Завзятість - обміняти на 1 раунд додаткові 3 шкоди на 1 броню
- Пробивний удар - ігнорування опору шкоди цілі
- Послідовність - кожен удар по цілі навішує на неї 1 стак, кожен стак + 2 шкоди по цілі від цього героя

### Рівень 3

- Нагорода - Вбивство ворога дає додаткову дію

---

## Стрільба

Базовий + 15% до рендж атак
Просунутий + 25% до рендж атак
Експерт + 40% до рендж атак

## Рівень 1

- Травмуючий постріл - з шаносом 40% зменшує швидкість на 50%
- Бронебійний снаряд - з шансом 40% Постріл по цілі зменшує броню цілі на 1 на 1 раунд
- Відбиваюча стріла - з шаносом 40%
  зменшує ініціативу на 2 на 1 раунд

## Рівень 2

- Стріла сили - Якщо за ціллю стоїть ворог він також отримує шкоду 50%
- В яблучко - гарантоване попадання по цілі 1 раз за бій
- Хмара стріл - 40% шкоди по 9 клітинкам

## Рівень 3

- Постріл по 2 цілям

---

## Захист

Базовий + 10% до опору фізичної шкоди
Просунутий + 20% до опору фізичної шкоди
Експерт + 30%до опору фізичної шкоди

## Рівень 1

- Стійкість - додає {2 \* рівень героя} HP
- Супротив - якщо у героя <= 15% HP
  знімає всі негативні ефекти 1 раз за бій
- Перенаправлення - бонус дія - накладає ефект на союзного героя і якщо цей герой отримує фізичну шкоду забирає 50% цієї шкоди на себе

## Рівень 2

- Битва до останнього - 1 раз за бій якщо герой втрачає всі життя - заишає йому 1 HP
- Магічний захист Дає 15% опору від шкоди заклинань
- Колюча броня - бонус дія - 1 раз за бій - наступна фізична атака ворога відбиває 100% шкоди в нього

## Рівень 3

- Готовність - проводить атаку на ворога перед атакою ворога

---

## Магія Світла

Базовий - дає заклинання 1-2 рівня
Просунутий - дає заклинання 3-4 рівня
Експерт - дає заклинання 5 рівня

## Рівень 1

- Гнів праведний - заклинання караючий удар та прискорення - діє по області
- Даруючий захист - ухилення та камяна шкіра діють по області
- Даруючий Благословення - божественна сила та Зняття чар діють по області

## Рівень 2

- Божа сила - посилення заклиань ствіла на 25%
- Вічне світло - додає заклинанння
  яке лікує на 2д6 + рівень героя
- Вигнання - забирає 50% всім ворожим призваним істотам

## Рівень 3

- Всі заклиання світла діють на всіх союзників

---

## Магія Темряви

Базовий - дає заклинання 1-2 рівня
Просунутий - дає заклинання 3-4 рівня
Експерт - дає заклинання 5 рівня

## Рівень 1

- Повелитель болі - заклинання Чема та Промінь Розрухи діють на область
- Повелитель розуму - сповільнення та розсіяність діють по області
- Повелитель Проклять - Ослабелння та Немічність діють по області

## Рівень 2

- Поступ смерті - посилення заклиань темряви на 25%
- Компенсація - Атака героя накладає випадкове заклинання 1-3 рівня
- Пожирач - бонус дія - герой пожирає душу мертвого юніта і відновлює 1 спел слот

## Рівень 3

- Майстер темряви - Заклинання 4 та 5 рівня діють на 2 істоти

---

## Магія Хаосу

Базовий - дає заклинання 1-2 рівня
Просунутий - дає заклинання 3-4 рівня
Експерт - дає заклинання 5 рівня

## Рівень 1

- Повелитель бурі - заклинання Блискавка та Ланцюгова блискавка зменшують ініціативу ворога на 5 на 1 раунд
- Повелитель вогню - заклинання Вогняний шар, Стіна Вогню та Армагедон знімають 30% захисту на 1 раунд
- Повелитель Холоду - заклинаня Льодяна Брила, Кільце Холоду та Зупиняючий холод зменшує швидкість істот на 50% на 1 раунд

## Рівень 2

- Вибух мани- бонус дія Ворожий заклинатель отримують з шансом 50% отримує шкоду свого заклинання (2 рази за бій)
- Пекельна сила -всі заклинання хаосу наносять на 25% більше шкоди
- Вогняна атака - атаки героя наносять додаткову шкоду вогенм 1к6

## Рівень 3

- Пірокінез - всі заклинання накладають модифікатор підпал на 3 раунди який наносить 2к6 шкоди

---

## Магія Призиву

Базовий - дає заклинання 1-2 рівня
Просунутий - дає заклинання 3-4 рівня
Експерт - дає заклинання 5 рівня

## Рівень 1

- Повелитель життя - заклинання Магічний кулак та Підняття мертвих мають + 25% то сили заклианнь
- Повелитель чар- заклинання призив Фенікса та призив елементалів прикликають сумонів з + 25% HP + 25% шкоди
- Повелитель Холоду - заклинаня Магічний Кристал та Стіна Мечів та Вогяна пастка отримують +25% до шкоди і HP

## Рівень 2

- Вигнання - забирає 50% всім ворожим призваним істотам
- Обраний елементаль - додає нове заклиання - призив обраного елементалю
- Корені лісу - Додає нове заклиання “Корені”

## Рівень 3

- Вічні воіни - прикликає по 2 елементаля

---

## Лідерство

Базовий - дає + 1 моралі
Просунутий - дає ще + 1 моралі
Експерт - дає ще + 1 моралі

## Рівень 1

- Співпереживання - Кожного разу коли союзний герой проходить перевірку на мораль отримує +1 ініціативи на 1 раунд (ефект скається)
- Відновлення - якщо мораль опускається до відємного значення - в наступному раунді відовлюється до 0
- Відплата - завдає {5% \* мораль} більше фізичної шкоди

## Рівень 2

- Натхнення -бонус дія дає +1 моралі союзнику на 1 раунд
- Успіх - за кожен успішний кидок моралі отримує +5 шкоди до кінця бою
- Помста - за кожного вбитого ворога отримує +1 моралі до кінця бою за кожного вбитого союзника -2 моралі

## Рівень 3

- Вічні воіни - прикликає по 2 елементаля

# Раси

### Люди

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
