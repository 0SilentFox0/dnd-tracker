import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';
import { RULE_SYSTEM_REGISTRY } from '@/lib/utils/rules/systems/registry';

// d20 sandbox, independent of registry order and of the campaign; found by dice so no system key is named
export const PREVIEW_SYSTEM_KEY: string =
    RULE_SYSTEM_KEYS.find(
        (k) => RULE_SYSTEM_REGISTRY[k]?.combat.dice === 20
    ) ?? RULE_SYSTEM_KEYS[0];

export const PREVIEW_RULES = defaultRulesFor({ key: PREVIEW_SYSTEM_KEY });
