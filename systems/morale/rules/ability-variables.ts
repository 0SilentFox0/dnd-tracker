import type { AbilityVariables } from '@/lib/utils/abilities/engine/core/variables';
import { ownMorale } from '@/lib/utils/abilities/engine/effects/morale';

export const MORALE_ABILITY_VARIABLES: AbilityVariables = { morale: ownMorale };
