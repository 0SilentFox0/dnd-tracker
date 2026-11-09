import type { Characteristics } from "../characteristics/keys";

export type LedgerViewer = { isDM: boolean; isOwner: boolean };

export function redactLedger(characteristics: Characteristics, viewer: LedgerViewer): Characteristics {
  if (viewer.isDM || viewer.isOwner) return characteristics;

  const { downtime: _downtime, corruption: _corruption, ...rest } = characteristics;

  return "ledger" in rest ? { ...rest, ledger: [] } : rest;
}

/** Fields only `advance` / `advance-undo` (or the DM) may change. */
export function preserveServerOwned(existing: Characteristics, incoming: Characteristics): Characteristics {
  const { career: _career, downtime: _downtime, corruption: _corruption, ...rest } = incoming;

  return { ...rest, talents: existing.talents, ledger: existing.ledger, advances: existing.advances, skillAdvances: existing.skillAdvances, spentArchived: existing.spentArchived, ...(existing.career ? { career: existing.career } : {}), ...(existing.downtime ? { downtime: existing.downtime } : {}), ...(existing.corruption ? { corruption: existing.corruption } : {}) };
}
