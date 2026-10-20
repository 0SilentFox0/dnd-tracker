import { elementOf } from "./element";
import { spellFx } from "./spells";
import type { FxAuraKind, FxElement } from "./types";

import type { ActiveEffect } from "@/types/battle";

export const MAX_AURAS = 2;

const AURA_PRIORITY: readonly FxAuraKind[] = ["stun", "dizzy", "frozen", "strings", "charm", "rage", "bind", "roots", "blind", "plague", "burning", "frost", "decay", "vines", "bleeding", "static", "dust", "stings", "marked", "moonmark", "shackles", "rust", "thorncrown", "raincloud", "sapped", "curse", "lifedome", "sunglow", "stag", "regen", "bloodlust", "haste", "spellward", "deflect", "might", "holyweapon", "stoneskin", "shield", "blessing"];

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

const marksAttackers = (effect: ActiveEffect) => (effect.abilityEffects ?? []).some((e) => e.kind === "flag" && e.flag === "advantageForAttackers");

const ELEMENT_AURA: Partial<Record<FxElement, (effect: ActiveEffect) => FxAuraKind | null>> = {
  cold: (effect) => (hasEffect(effect, "skip_action") ? "frozen" : "frost"),
  lightning: () => "static",
  fire: () => "burning",
  poison: () => "plague",
  necrotic: () => "decay",
  radiant: (effect) => (marksAttackers(effect) ? "moonmark" : null),
};

const elementAura = (effect: ActiveEffect) => ELEMENT_AURA[elementOf(effect.fxElement, "arcane")]?.(effect) ?? null;

const isShield = (effect: ActiveEffect) =>
  effect.effects.some((e) => SHIELD_EFFECTS.has(e.type)) || (effect.abilityEffects ?? []).some((e) => e.kind === "modifyStat" && e.stat === "armor");

export function auraOf(effect: ActiveEffect): FxAuraKind | null {
  if (effect.permanent || effect.zone || effect.duration < 1) return null;

  const named = spellFx(effect.name)?.aura;

  if (named) return named;

  if (effect.charmOrigin) return "charm";

  if (hasEffect(effect, "berserk")) return "rage";

  if (effect.fxElement && effect.type !== "buff") {
    const byElement = elementAura(effect);

    if (byElement) return byElement;
  }

  if (effect.type === "condition") return hasEffect(effect, "skip_action") ? "stun" : "bind";

  if (effect.dotDamage) return DOT_AURA[effect.dotDamage.damageType] ?? "decay";

  if (effect.hotHeal) return "regen";

  if (marksAttackers(effect)) return "marked";

  if (effect.type === "buff") return isShield(effect) ? "shield" : "blessing";

  if (effect.type === "debuff") return "curse";

  return null;
}

export function aurasOf(effects: readonly ActiveEffect[]): FxAuraKind[] {
  const kinds = new Set<FxAuraKind>();

  for (const effect of effects) {
    const kind = auraOf(effect);

    if (kind) kinds.add(kind);
  }

  return AURA_PRIORITY.filter((k) => kinds.has(k)).slice(0, MAX_AURAS);
}
