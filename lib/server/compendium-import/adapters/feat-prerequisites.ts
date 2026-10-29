import { stableJson } from "../identity";
import { type AdapterContext, issue } from "../types";
import { ABILITIES, array, num, object, str } from "./shared";

import { type AbilityKey } from "@/lib/constants/abilities";

export function featPrerequisite(raw: unknown, ctx: AdapterContext): { level?: number; scores?: { abilities: AbilityKey[]; min: number }; text?: string; manualText: string[] } {
  const alternatives = array(raw).map(object);

  const manualText: string[] = [];

  if (alternatives.length === 0) return { manualText };

  const [only] = alternatives;

  if (alternatives.length > 1) {
    manualText.push(...alternatives.map((a) => stableJson(a)));
    ctx.issues.push(issue("MANUAL_PREREQUISITE", `${ctx.path}.prerequisite`, "warning", { variant: "alternatives" }));

    return { manualText };
  }

  const out: ReturnType<typeof featPrerequisite> = { manualText };

  const level = num(only.level) ?? num(object(only.level).level);

  if (level !== undefined && Number.isInteger(level) && level >= 1 && level <= 20 && !object(only.level).class && !object(only.level).subclass) out.level = level;

  const abilityRows = array(only.ability).map(object);

  const picked = abilityRows.flatMap((r) => Object.entries(r).filter(([k, v]) => ABILITIES[k] && typeof v === "number") as Array<[string, number]>);

  const single = abilityRows.length > 0 && abilityRows.every((r) => Object.keys(r).length === 1) && picked.length === abilityRows.length && new Set(picked.map(([, v]) => v)).size === 1;

  if (single) out.scores = { abilities: picked.map(([k]) => ABILITIES[k] as AbilityKey), min: picked[0][1] };

  const unhandled = Object.entries(only).filter(([k]) => !(k === "level" && out.level !== undefined) && !(k === "ability" && out.scores) && !(k === "other"));

  const others = array(only.other).length > 0 ? array(only.other).map(str) : typeof only.other === "string" ? [only.other] : [];

  manualText.push(...others.filter(Boolean), ...unhandled.map(([k, v]) => `${k}: ${stableJson(v)}`));

  const bits = [out.level ? ctx.t("derived.level", { level: out.level }) : "", out.scores ? `${out.scores.abilities.map((a) => ctx.t(`derived.ability.${a}`)).join(ctx.t("derived.or"))} ${out.scores.min}+` : ""].filter(Boolean);

  if (bits.length > 0) out.text = bits.join(", ");

  if (manualText.length > 0) ctx.issues.push(issue("MANUAL_PREREQUISITE", `${ctx.path}.prerequisite`, "warning"));

  return out;
}
