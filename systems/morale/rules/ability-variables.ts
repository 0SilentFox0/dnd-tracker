import type { AbilityVariables } from '@/lib/utils/abilities/engine/core/variables';
import { ownMorale } from '@/systems/morale/rules/effects';

export const MORALE_ABILITY_VARIABLES: AbilityVariables = { morale: ownMorale };
