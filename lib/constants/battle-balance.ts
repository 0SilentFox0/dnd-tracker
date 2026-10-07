/** Рівні бої: цільова тривалість, перевага героїв і межі масштабування ворогів. */

export const TARGET_ROUNDS = 3.5;

export const HERO_EDGE = 0.9;

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
