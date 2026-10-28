import { COMPENDIUM_LIMITS } from "../parse";
import type { AdaptedCompendium } from "../types";
import type { AdaptState } from "./state";

export function finalizeAdapted(state: AdaptState): AdaptedCompendium {
  const { entries, issues, sources, embedded, blocked } = state;

  for (const entry of entries)
    for (const warning of issues) {
      if (entry.issues.includes(warning)) continue;

      if (warning.path.startsWith(`${entry.key}.`) || (entry.inputPath && warning.path.startsWith(`${entry.inputPath}.`))) entry.issues.push(warning);
    }

  if (entries.length > COMPENDIUM_LIMITS.selected) throw Error("SELECTED_RECORDS");

  embedded.optionalfeature = state.usedOptionals.size;

  return { entries, issues, sources, embedded, blocked };
}
