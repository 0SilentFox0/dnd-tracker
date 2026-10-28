import type { PendingCritChoice, StoredPendingCritChoice } from "./types";

export const toPublicPendingCrit = (p: StoredPendingCritChoice | null | undefined): PendingCritChoice | null =>
  p ? { action: p.action, actorId: p.actorId, triggers: p.triggers } : null;
