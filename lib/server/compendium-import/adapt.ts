import { adaptBooks } from "./adapt/books";
import { finalizeAdapted } from "./adapt/finalize";
import { adaptOptionalFeatures } from "./adapt/optional-features";
import { createAdaptState } from "./adapt/state";
import { attachSubclasses } from "./adapt/subclasses";
import { attachSubraces } from "./adapt/subraces";
import { adaptTopLevel } from "./adapt/top-level";
import type { Compendium } from "./parse";
import type { AdaptedCompendium, AdaptOptions } from "./types";

export { effectiveEdition } from "./adapters/shared";

export function adaptCompendium(root: Compendium, options: AdaptOptions = {}): AdaptedCompendium {
  const state = createAdaptState(root, options);

  adaptTopLevel(state);
  attachSubclasses(state);
  attachSubraces(state);
  adaptBooks(state);
  adaptOptionalFeatures(state);

  return finalizeAdapted(state);
}
