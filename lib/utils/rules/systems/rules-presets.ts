// <systems:generated>
import { D20_RULES_PRESET } from '@/systems/d20/rules/rules-preset';
import { HOMM_RULES_PRESET } from '@/systems/homm/rules/rules-preset';
import { WFRP_RULES_PRESET } from '@/systems/wfrp/rules/rules-preset';
// </systems:generated>

/** Raw partial rules JSON of a module (section → item → value): data only, merged by `initialRules` */
export type RulesPreset = Readonly<
    Record<string, Readonly<Record<string, unknown>>>
>;

export const RULES_PRESETS: Readonly<Record<string, RulesPreset>> = {
    // <systems:generated>
    d20: D20_RULES_PRESET,
    homm: HOMM_RULES_PRESET,
    wfrp: WFRP_RULES_PRESET,
    // </systems:generated>
};
