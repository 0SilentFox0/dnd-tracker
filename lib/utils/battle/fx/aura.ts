import { elementOf } from "./element";

import type { ActiveEffect } from "@/types/battle";

export type FxAuraKind = "stun" | "charm" | "rage" | "bind" | "plague" | "burning" | "frost" | "decay" | "bleeding" | "static" | "marked" | "curse" | "regen" | "shield" | "blessing" | "frozen" | "moonmark" | "dust" | "stings" | "roots" | "blind" | "bloodlust" | "haste" | "shackles" | "stoneskin" | "lifedome" | "sunglow" | "spellward" | "deflect" | "might" | "holyweapon" | "sapped" | "rust" | "dizzy" | "thorncrown" | "raincloud" | "strings" | "vines" | "stag";

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

const AURA_BY_NAME: Record<string, FxAuraKind> = {
  "Корені": "roots",
  "Сплутування": "roots",
  "Сліпота": "blind",
  "Вампіризм": "bloodlust",
  "Поспіх": "haste",
  "Сповільнення": "shackles",
  "Ослаблення": "sapped",
  "Немічність": "rust",
  "Розсіяність": "dizzy",
  "Страждання": "thorncrown",
  "Смуток": "raincloud",
  "Ляльковод": "strings",
  "Кам'яна шкіра": "stoneskin",
  "Землетрус": "dust",
  "Рій ос": "stings",
  "Регенерація": "lifedome",
  "Вічне світло": "sunglow",
  "Магічний імунітет": "spellward",
  "Ухилення": "deflect",
  "Праведна міць": "might",
  "Божественна сила": "holyweapon",
  "Колючі лози": "vines",
  "Дух лісу": "stag",
};

const SHIELD_EFFECTS = new Set(["armor", "ac", "guard"]);

const hasEffect = (effect: ActiveEffect, type: string) => effect.effects.some((e) => e.type === type);

function elementAura(effect: ActiveEffect): FxAuraKind | null {
  switch (elementOf(effect.fxElement, "arcane")) {
    case "cold":
      return hasEffect(effect, "skip_action") ? "frozen" : "frost";
    case "lightning":
      return "static";
    case "fire":
      return "burning";
    case "poison":
      return "plague";
    case "necrotic":
      return "decay";
    case "radiant":
      return (effect.abilityEffects ?? []).some((e) => e.kind === "flag" && e.flag === "advantageForAttackers") ? "moonmark" : null;
    default:
      return null;
  }
}

const isShield = (effect: ActiveEffect) =>
  effect.effects.some((e) => SHIELD_EFFECTS.has(e.type)) || (effect.abilityEffects ?? []).some((e) => e.kind === "modifyStat" && e.stat === "armor");

export function auraOf(effect: ActiveEffect): FxAuraKind | null {
  if (effect.permanent || effect.zone || effect.duration < 1) return null;

  const named = AURA_BY_NAME[effect.name];

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

  if ((effect.abilityEffects ?? []).some((e) => e.kind === "flag" && e.flag === "advantageForAttackers")) return "marked";

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
