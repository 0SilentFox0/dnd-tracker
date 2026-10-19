import { aurasOf } from "./aura";
import type { FxAuraKind } from "./types";

import type { ActiveEffect } from "@/types/battle";

export type HudMotif = "frost" | "fire" | "plague" | "blood" | "stun" | "nature" | "curse" | "storm" | "gold" | "holy" | "life";

const MOTIF: Record<FxAuraKind, HudMotif> = {
  frost: "frost",
  frozen: "frost",
  burning: "fire",
  rage: "fire",
  plague: "plague",
  stings: "plague",
  bleeding: "blood",
  bloodlust: "blood",
  stun: "stun",
  dizzy: "stun",
  roots: "nature",
  vines: "nature",
  bind: "nature",
  thorncrown: "nature",
  curse: "curse",
  decay: "curse",
  sapped: "curse",
  rust: "curse",
  shackles: "curse",
  strings: "curse",
  charm: "curse",
  blind: "curse",
  dust: "curse",
  marked: "curse",
  static: "storm",
  raincloud: "storm",
  shield: "gold",
  stoneskin: "gold",
  deflect: "gold",
  might: "gold",
  haste: "gold",
  sunglow: "gold",
  stag: "gold",
  blessing: "holy",
  holyweapon: "holy",
  spellward: "holy",
  moonmark: "holy",
  regen: "life",
  lifedome: "life",
};

/** Мотиви плашки HP на карті — з тих самих топ-аур, що й портрет, без дублів. */
export function hudMotifsOf(effects: readonly ActiveEffect[]): HudMotif[] {
  return [...new Set(aurasOf(effects).map((k) => MOTIF[k]))];
}
