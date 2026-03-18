import { isFlagValueType } from "@/lib/constants/skill-effects";
import { getSimpleTriggerLabel } from "@/lib/constants/skill-triggers";
import type { SkillEffect } from "@/types/battle";
import type { ComplexSkillTrigger, SkillTrigger } from "@/types/skill-triggers";

export function formatEffectValue(e: SkillEffect): string {
  if (isFlagValueType(e.type)) return "✓";

  if (e.type === "percent") return `${e.value}%`;

  return String(e.value);
}

export function formatTrigger(t: SkillTrigger): string {
  if (t.type === "simple") {
    const label = getSimpleTriggerLabel(t.trigger);

    const mods: string[] = [];

    if (t.modifiers?.probability != null)
      mods.push(`${Math.round(t.modifiers.probability * 100)}%`);

    if (t.modifiers?.oncePerBattle) mods.push("1/бій");

    if (t.modifiers?.twicePerBattle) mods.push("2/бій");

    return mods.length > 0 ? `${label} (${mods.join(", ")})` : label;
  }

  const c = t as ComplexSkillTrigger;

  const pct = c.valueType === "percent" ? "%" : "";

  const targetLabel =
    c.target === "ally" ? "союзник" : c.target === "enemy" ? "ворог" : "герой";

  return `якщо ${targetLabel} ${c.operator} ${c.value}${pct} ${c.stat}`;
}
