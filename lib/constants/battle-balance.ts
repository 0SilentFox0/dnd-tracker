/** Рівні бої: цільова тривалість, перевага героїв і межі масштабування ворогів. */

export const TARGET_ROUNDS = 3.5;

/** Частка HP партії, яку вороги мають зняти за `TARGET_ROUNDS`; 0.75 після того, як «+N» з `damageDice` почав наноситися (`pnpm balance-library`: перемоги L3 87 / L6 88 / L10 91 %). */
export const HERO_EDGE = 0.75;

/** Поправка цілі ворогів для партій вище L6 (уміння й ультимати високих рівнів формула сили героя не бачить): повна на L10, лінійно до L14. `pnpm balance-library` з 0.06/0.06: перемоги L3 87 / L6 88 / L10 74 % (без поправки L10 90 %; 0.2/0.2 — 51 %, обидва важелі множаться). */
export const HIGH_LEVEL_FROM = 6;

export const HIGH_LEVEL_SPAN = 4;

export const HIGH_LEVEL_MAX_STEPS = 2;

export const HIGH_LEVEL_DPR_BOOST = 0.06;

export const HIGH_LEVEL_HP_BOOST = 0.06;

/** Частка номінального DPR героїв, що реально долітає (промахи, перевбивство); підібрано за `pnpm simulate-battle`. */
export const HIT_RATE = 0.55;

export const SCALE_MIN = 0.5;

export const SCALE_MAX = 3;

/** Допустиме відхилення досягнутої сили від цілі до підказки «слабко / забагато». */
export const BALANCE_TOLERANCE = 0.1;

/** Допустиме відхилення множників від 1 для підібраного складу. */
export const PICK_TOLERANCE = 0.25;

export const PICK_MAX_DISTINCT_UNITS = 3;

export const PICK_CANDIDATE_UNITS = 8;

export const HINT_MAX_STEPS = 6;

export const MAX_UNIT_QUANTITY = 20;

/** Скільки цілей у середньому зачіпає дальня атака або AoE-заклинання юніта. */
export const TYPICAL_TARGETS = 2;

/** Нижня межа DPR і HP юніта, щоб нульові значення не ламали множники. */
export const MIN_UNIT_STAT = 1;

/** Верхня межа кількості ворогів у підібраному складі. */
export const MAX_PICK_TOTAL = 14;

/** Верхня межа розміру партії у запиті балансу. */
export const MAX_BALANCE_ALLIES = 50;

/** Шанс влучання героя в «середньому» бою: партії `balance-library` L3/6/10 (+7.5…+12) проти медіанного КД тірів 1/4/7 (13/14/16). */
export const REF_HERO_HIT = 0.8;

/** Шанс влучання юніта в «середньому» бою: медіанна атака тірів 1/4/7 (+6/+8/+9) проти КД героїв тих партій (12…17). */
export const REF_UNIT_HIT = 0.67;

/** Межі поправки сили юніта за КД, влучанням і опорами. */
export const ARMOR_FACTOR_MIN = 0.5;

export const ARMOR_FACTOR_MAX = 2;

/** Верхня межа поправки HP: юніт з імунітетом до магії проти партії заклиначів (≈ 2/3 шкоди — закляття) справді втричі міцніший. */
export const DEFENSE_FACTOR_MAX = 3;

/** Крок живого підсилення/послаблення ворожих юнітів ДМом (×1.1 / ÷1.1, стакається). */
export const LIVE_SCALE_STEP = 1.1;

/** Слоти заклять юніта на бій (універсальні, як їх видає `from-unit`). */
export const UNIT_SPELL_SLOTS = 3;

/** Шанс рятунку партії, коли її модифікатори невідомі. */
export const FALLBACK_SAVE_SUCCESS = 0.55;

/** Частка тіру, нижче якої лежить стеля масштабування (нижній квартиль, а не мінімум — один кволий юніт не блокує тір). */
export const TIER_CEILING_QUANTILE = 0.25;
