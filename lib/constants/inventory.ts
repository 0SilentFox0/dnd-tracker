export const COINS = ["gp", "sp", "cp"] as const;

export type Coin = (typeof COINS)[number];

export const COIN_VALUE: Record<Coin, number> = { gp: 100, sp: 10, cp: 1 };

export const COIN_LABEL: Record<Coin, string> = { gp: "зм", sp: "см", cp: "мм" };

export const InventoryLogKind = {
  MONEY_SPEND: "money_spend",
  MONEY_GAIN: "money_gain",
  MONEY_SET: "money_set",
  ITEM_ADD: "item_add",
  ITEM_USE: "item_use",
  ITEM_EDIT: "item_edit",
  ITEM_REMOVE: "item_remove",
  ARTIFACT_STASH: "artifact_stash",
  ARTIFACT_EQUIP: "artifact_equip",
  ARTIFACT_UNEQUIP: "artifact_unequip",
  ARTIFACT_GRANT: "artifact_grant",
  ARTIFACT_REVOKE: "artifact_revoke",
  ARTIFACT_TRANSFER: "artifact_transfer",
} as const;

export type InventoryLogKindValue = (typeof InventoryLogKind)[keyof typeof InventoryLogKind];

export const LOG_PAGE_SIZE = 20;
