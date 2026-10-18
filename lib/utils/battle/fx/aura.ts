import type { ActiveEffect } from "@/types/battle";

export type FxAuraKind = "stun" | "charm" | "rage" | "bind" | "plague" | "burning" | "frost" | "decay" | "bleeding" | "static" | "marked" | "curse" | "regen" | "shield" | "blessing";

export const MAX_AURAS = 2;

const AURA_PRIORITY: readonly FxAuraKind[] = ["stun", "charm", "rage", "bind", "plague", "burning", "frost", "decay", "bleeding", "static", "marked", "curse", "regen", "shield", "blessing"];

const DOT_AURA: Record<string, FxAuraKind> = {
  poison: "plague",
  acid: "plague",
  fire: "burning",
  cold: "frost",
  necrotic: "decay",
  bleed: "bleeding",
  slashing: "bleeding",
  piercing: "bleeding",
  bludgeoning: "bleeding",
  physical: "bleeding",
  lightning: "static",
  thunder: "static",
};

const SHIELD_EFFECTS = new Set(["armor", "ac", "guard"]);

const hasEffect = (effect: ActiveEffect, type: string) => effect.effects.some((e) => e.type === type);

const isShield = (effect: ActiveEffect) =>
  effect.effects.some((e) => SHIELD_EFFECTS.has(e.type)) || (effect.abilityEffects ?? []).some((e) => e.kind === "modifyStat" && e.stat === "armor");

export function auraOf(effect: ActiveEffect): FxAuraKind | null {
  if (effect.permanent || effect.zone || effect.duration < 1) return null;

  if (effect.charmOrigin) return "charm";

  if (hasEffect(effect, "berserk")) return "rage";

  if (effect.type === "condition") return hasEffect(effect, "skip_action") ? "stun" : "bind";

  if (effect.dotDamage) return DOT_AURA[effect.dotDamage.damageType] ?? "decay";

  if (effect.hotHeal) return "regen";

  if ((effect.abilityEffects ?? []).some((e) => e.kind === "flag" && e.flag === "advantageForAttackers")) return "marked";

  if (effect.type === "buff") return isShield(effect) ? "shield" : "blessing";

  if (effect.type === "debuff") return "curse";

  return null;
}

export function aurasOf(effects: ActiveEffect[]): FxAuraKind[] {
  const kinds = new Set<FxAuraKind>();

  for (const effect of effects) {
    const kind = auraOf(effect);

    if (kind) kinds.add(kind);
  }

  return AURA_PRIORITY.filter((k) => kinds.has(k)).slice(0, MAX_AURAS);
}
