import type { Translator } from "@/lib/i18n/translator";
import { formatCoins } from "@/lib/utils/inventory/money";
import type { InventoryLogEntry, Purse } from "@/types/inventory";

const ITEM_KINDS = new Set(["item_add", "item_use", "item_edit", "item_remove"]);

const ARTIFACT_KINDS = new Set(["artifact_stash", "artifact_equip", "artifact_unequip", "artifact_grant", "artifact_revoke", "artifact_transfer", "artifact_attune", "artifact_unattune"]);

export function describeLog({ kind, delta, note }: InventoryLogEntry, t: Translator): string {
  const withNote = (text: string) => (note ? t("log.withNote", { text, note }) : text);

  if (kind.startsWith("money_")) {
    const coins = formatCoins(delta as Partial<Purse>, (c) => t(`coins.${c}`)) || "0";

    return withNote(t(kind === "money_set" ? "log.moneySet" : "log.money", { coins }));
  }

  if (ITEM_KINDS.has(kind)) return withNote(t(`log.item.${kind}`, { name: String(delta.item) }));

  const name = String(delta.artifactName ?? t("log.artifactFallback"));

  return withNote(ARTIFACT_KINDS.has(kind) ? t(`log.artifact.${kind}`, { name }) : t("log.unknown", { kind, name }));
}
