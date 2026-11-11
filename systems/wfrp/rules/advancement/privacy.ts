import type { Characteristics } from "../characteristics/keys";

export type LedgerViewer = { isDM: boolean; isOwner: boolean };

export function withoutLedgers<T extends Partial<Characteristics>>(characteristics: T): Omit<T, "downtime" | "corruption"> {
  const { downtime: _downtime, corruption: _corruption, ...rest } = characteristics;

  return rest;
}

export function redactLedger(characteristics: Characteristics, viewer: LedgerViewer): Characteristics {
  if (viewer.isDM || viewer.isOwner) return characteristics;

  const rest = withoutLedgers(characteristics);

  return "ledger" in rest ? { ...rest, ledger: [] } : rest;
}

/** Fields only `advance` / `advance-undo` (or the DM) may change. */
export function preserveServerOwned(existing: Characteristics, incoming: Characteristics): Characteristics {
  const { career: _career, downtime: _downtime, corruption: _corruption, ...rest } = incoming;

  return { ...rest, talents: existing.talents, ledger: existing.ledger, advances: existing.advances, skillAdvances: existing.skillAdvances, spentArchived: existing.spentArchived, ...(existing.career ? { career: existing.career } : {}), ...(existing.downtime ? { downtime: existing.downtime } : {}), ...(existing.corruption ? { corruption: existing.corruption } : {}) };
}
