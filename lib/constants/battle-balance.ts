/** Рівні бої: цільова тривалість, перевага героїв і межі масштабування ворогів. */

export const TARGET_ROUNDS = 3.5;

/** Частка HP партії, яку вороги мають зняти за `TARGET_ROUNDS`; 0.9 → 0.7, коли DPR юнітів перестав рахувати «+N» з кубиків (≈ 25 % на T4), — щоб L6 лишився на рівні. */
export const HERO_EDGE = 0.7;

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
