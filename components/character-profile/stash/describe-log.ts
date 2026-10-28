import { formatCoins } from "@/lib/utils/inventory/money";
import type { InventoryLogEntry, Purse } from "@/types/inventory";

const ARTIFACT_VERB: Record<string, string> = {
  artifact_stash: "знято в підсумок",
  artifact_equip: "вдягнено",
  artifact_unequip: "знято в підсумок (DM)",
  artifact_grant: "отримано від DM",
  artifact_revoke: "забрано DM",
  artifact_transfer: "передано",
};

const ITEM_VERB: Record<string, string> = { item_add: "додано", item_use: "використано", item_edit: "змінено", item_remove: "викинуто" };

export function describeLog({ kind, delta, note }: InventoryLogEntry): string {
  const tail = note ? ` — ${note}` : "";

  if (kind.startsWith("money_")) return `${formatCoins(delta as Partial<Purse>) || "0"}${kind === "money_set" ? " (DM)" : ""}${tail}`;

  if (kind in ITEM_VERB) return `${ITEM_VERB[kind]}: ${String(delta.item)}${tail}`;

  return `${ARTIFACT_VERB[kind] ?? kind}: ${String(delta.artifactName ?? "артефакт")}${tail}`;
}
