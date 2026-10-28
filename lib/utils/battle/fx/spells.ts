import type { FxArchetype, FxAuraKind, FxElement } from "./types";

/** A library spell's signature look; anything left out comes from the generic rules (`spellRules`, `auraOf`). */
export interface SpellFx {
  archetype?: FxArchetype;
  element?: FxElement;
  /** The aura of the effect this spell applies (matched by the effect's name). */
  aura?: FxAuraKind;
}
