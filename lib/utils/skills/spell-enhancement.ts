import { DICE_OPTIONS } from "@/lib/constants/dice";
import { DAMAGE_MODIFIER_OPTIONS, SPELL_TARGET_OPTIONS } from "@/lib/constants/spells";

export const SPELL_TARGET_SELECT_OPTIONS = SPELL_TARGET_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const DAMAGE_MODIFIER_SELECT_OPTIONS = DAMAGE_MODIFIER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const DICE_SIDE_OPTIONS = DICE_OPTIONS.map((d) => ({ value: d.value.replace("d", ""), label: d.label }));

export function parseDamageDice(dice?: string) {
  return { count: dice?.match(/^(\d+)/)?.[1] || "", sides: dice?.match(/d(\d+)/)?.[1] || "6" };
}
