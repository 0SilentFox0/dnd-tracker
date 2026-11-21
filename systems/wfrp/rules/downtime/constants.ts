import type { DifficultyKey } from '../percentile/difficulty';
import type { Status, StatusTier } from './status';

import type { Coin } from '@/lib/constants/inventory';

export const MAX_DAYS = 30;
export const REST_HEAL_MULTIPLIER = 2;
export const TEND_HEAL_PER_SL = 1;
export const TEND_DAYS_PER_SL = 1;
export const FESTERING_FAIL_WOUNDS = 2;
export const FESTERING_RENEW_DAYS = 7;
export const TRAIN_DISCOUNT_BASE = 5;
export const TRAIN_DISCOUNT_PER_SL = 5;
export const EARN_STATUS_DEFAULT: Status = { tier: 'brass', level: 1 };
export const STATUS_COIN: Record<StatusTier, Coin> = {
    brass: 'cp',
    silver: 'sp',
    gold: 'gp',
};
export const ENDEAVOUR_DIFFICULTY: DifficultyKey = 'challenging';

/** 5e canon: endeavours per downtime period (p196) and the Income test difficulty (p199) */
export const CANON_ENDEAVOURS_MAX = 3;
export const CANON_INCOME_DIFFICULTY: DifficultyKey = 'average';
export const CANON_RECOVERY_DIFFICULTY: DifficultyKey = 'average';
/** Dice of 1d10 per Standing level by Status tier; gold pays a flat crown per level (p199) */
export const CANON_INCOME_DICE_PER_LEVEL: Record<StatusTier, number> = {
    brass: 2,
    silver: 1,
    gold: 0,
};
export const CANON_INCOME_DIE = 10;

/** One coin of the Status tier for a hero who skipped Income (p199) */
export const HARDLY_WORKING_COINS = 1;
