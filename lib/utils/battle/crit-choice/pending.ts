import type { CritPendingHidden, PendingCritChoice } from "./types";

import type { PendingChoice } from "@/lib/utils/battle/store/types";

export interface CritPending {
  shown: PendingCritChoice;
  hidden: CritPendingHidden;
}

export const critPendingOf = (p: PendingChoice | null | undefined): CritPending | null => (p && asShownCrit(p.shown) ? (p as CritPending) : null);

export function asShownCrit(raw: unknown): PendingCritChoice | null {
  const shown = raw as Partial<PendingCritChoice> | null | undefined;

  return shown && typeof shown === "object" && Array.isArray(shown.triggers) ? (shown as PendingCritChoice) : null;
}

/** Rows stored before the shown/hidden split are one flat object */
export function pendingFromStored(raw: unknown): PendingChoice | null {
  if (!raw || typeof raw !== "object") return null;

  if ("shown" in raw && "hidden" in raw) return raw as PendingChoice;

  const { action, actorId, triggers } = raw as PendingCritChoice;

  return { shown: { action, actorId, triggers }, hidden: raw };
}
