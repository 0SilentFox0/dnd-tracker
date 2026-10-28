import { backgroundSpellIds } from "./references";

import { API_ERRORS } from "@/lib/constants/api-errors";

export function backgroundReferenceError(background: { originFeatId?: unknown; choices?: unknown }, feats: readonly { id: unknown; type?: unknown }[], spells: ReadonlySet<unknown>): string | null {
  if (background.originFeatId && !feats.some((f) => f.id === background.originFeatId && f.type === "origin")) return API_ERRORS.BACKGROUND_ORIGIN_FEAT_INVALID;

  if (backgroundSpellIds(background.choices).some((id) => !spells.has(id))) return API_ERRORS.BACKGROUND_SPELL_UNKNOWN;

  return null;
}
