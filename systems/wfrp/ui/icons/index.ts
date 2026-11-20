import { CONDITION_ICONS } from './conditions';
import { HERO_ICONS } from './hero';
import { HIT_LOCATION_ICONS } from './hit-locations';
import { TEST_OUTCOME_ICONS } from './outcomes';
import { PASSION_ICONS, PSYCHOLOGY_ICONS } from './psychology';
import { RESOURCE_ICONS } from './resources';
import { SIZE_ICONS } from './sizes';
import type { WfrpIcon } from './types';

export * from './keys';
export type { WfrpIcon, WfrpIconProps } from './types';
export type { WfrpConditionKey as WfrpConditionIcon } from '@/systems/wfrp/constants/conditions';
export type {
    PassionKind as WfrpPassionIcon,
    PsychologyKind as WfrpPsychologyIcon,
    TraitSize as WfrpSizeIcon,
} from '@/systems/wfrp/rules/trait-kinds';

export const WFRP_UI_ICONS = {
    conditions: CONDITION_ICONS,
    sizes: SIZE_ICONS,
    psychology: PSYCHOLOGY_ICONS,
    passions: PASSION_ICONS,
    resources: RESOURCE_ICONS,
    hitLocations: HIT_LOCATION_ICONS,
    testOutcomes: TEST_OUTCOME_ICONS,
    hero: HERO_ICONS,
} as const;

export type WfrpIconGroup = keyof typeof WFRP_UI_ICONS;

export const wfrpIcon = (
    group: WfrpIconGroup,
    key: string
): WfrpIcon | undefined =>
    (WFRP_UI_ICONS[group] as Record<string, WfrpIcon>)[key];
