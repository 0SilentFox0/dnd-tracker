import type { DifficultyKey } from '../percentile/difficulty';
import type { Status, StatusTier } from './status';

import type { Coin } from '@/lib/constants/inventory';

// verify against 5e book
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
