import { gainCoins, spendCoins } from "./money";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { type Coin, InventoryLogKind, type InventoryLogKindValue } from "@/lib/constants/inventory";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";
import type { Purse, SpecialItem, StashState } from "@/types/inventory";

type ItemFields = { name: string; description?: string; quantity: number; consumable: boolean };

export type StashAction =
  | { action: "spend"; amount: number; coin: Coin; note: string }
  | { action: "gain"; amount: number; coin: Coin; note?: string }
  | { action: "setMoney"; gp: number; sp: number; cp: number }
  | ({ action: "addItem" } & ItemFields)
  | ({ action: "editItem"; itemId: string } & ItemFields)
  | { action: "useItem"; itemId: string }
  | { action: "removeItem"; itemId: string }
  | { action: "stash"; slot: string }
  | { action: "equip"; artifactId: string }
  | { action: "grant"; artifactId: string }
  | { action: "revoke"; artifactId: string };

export type StashActionName = StashAction["action"];

export const StashError = {
  NOT_ENOUGH_MONEY: "NOT_ENOUGH_MONEY",
  MONEY_OVERFLOW: "MONEY_OVERFLOW",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  SLOT_EMPTY: "SLOT_EMPTY",
  UNKNOWN_SLOT: "UNKNOWN_SLOT",
  NOT_IN_STASH: "NOT_IN_STASH",
  NO_SLOT_FOR_ARTIFACT: "NO_SLOT_FOR_ARTIFACT",
} as const;

export type StashErrorCode = (typeof StashError)[keyof typeof StashError];

type Log = { kind: InventoryLogKindValue; delta: Record<string, unknown>; note: string | null };

export type StashResult = { ok: true; state: StashState; log: Log } | { ok: false; error: StashErrorCode };

const INT4_MAX = 2_147_483_647;

const overflows = (p: Purse) => p.gp > INT4_MAX || p.sp > INT4_MAX || p.cp > INT4_MAX;

const diff = (a: Purse, b: Purse) => ({ gp: b.gp - a.gp, sp: b.sp - a.sp, cp: b.cp - a.cp });

const ok = (state: StashState, kind: InventoryLogKindValue, delta: Record<string, unknown>, note: string | null = null): StashResult => ({
  ok: true,
  state,
  log: { kind, delta, note },
});

const fail = (error: StashErrorCode): StashResult => ({ ok: false, error });

const itemFields = ({ name, description, quantity, consumable }: ItemFields) => ({
  name,
  ...(description ? { description } : {}),
  quantity,
  consumable,
});

export function applyStashAction(s: StashState, a: StashAction, ctx: { newItemId: string; artifactSlotType?: string }): StashResult {
  switch (a.action) {
    case "spend": {
      const purse = spendCoins(s.purse, a.amount, a.coin);

      if (!purse) return fail(StashError.NOT_ENOUGH_MONEY);

      return overflows(purse) ? fail(StashError.MONEY_OVERFLOW) : ok({ ...s, purse }, InventoryLogKind.MONEY_SPEND, diff(s.purse, purse), a.note);
    }
    case "gain": {
      const purse = gainCoins(s.purse, a.amount, a.coin);

      if (overflows(purse)) return fail(StashError.MONEY_OVERFLOW);

      return ok({ ...s, purse }, InventoryLogKind.MONEY_GAIN, diff(s.purse, purse), a.note ?? null);
    }
    case "setMoney": {
      const purse = { gp: a.gp, sp: a.sp, cp: a.cp };

      return ok({ ...s, purse }, InventoryLogKind.MONEY_SET, diff(s.purse, purse));
    }
    case "addItem": {
      const item: SpecialItem = { id: ctx.newItemId, ...itemFields(a) };

      return ok({ ...s, items: [...s.items, item] }, InventoryLogKind.ITEM_ADD, { item: item.name, qty: item.quantity });
    }
    case "editItem": {
      if (!s.items.some((i) => i.id === a.itemId)) return fail(StashError.ITEM_NOT_FOUND);

      return ok(
        { ...s, items: s.items.map((i) => (i.id === a.itemId ? { id: i.id, ...itemFields(a) } : i)) },
        InventoryLogKind.ITEM_EDIT,
        { item: a.name, qty: a.quantity },
      );
    }
    case "useItem": {
      const item = s.items.find((i) => i.id === a.itemId);

      if (!item?.consumable) return fail(StashError.ITEM_NOT_FOUND);

      const items =
        item.quantity > 1 ? s.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)) : s.items.filter((i) => i.id !== item.id);

      return ok({ ...s, items }, InventoryLogKind.ITEM_USE, { item: item.name, qty: -1 });
    }
    case "removeItem": {
      const item = s.items.find((i) => i.id === a.itemId);

      if (!item) return fail(StashError.ITEM_NOT_FOUND);

      return ok({ ...s, items: s.items.filter((i) => i.id !== item.id) }, InventoryLogKind.ITEM_REMOVE, { item: item.name, qty: -item.quantity });
    }
    case "stash": {
      if (!ARTIFACT_GRID_9.some((c) => c.key === a.slot)) return fail(StashError.UNKNOWN_SLOT);

      const id = s.equipped[a.slot];

      if (!id) return fail(StashError.SLOT_EMPTY);

      return ok(
        { ...s, equipped: buildEquipped(s.equipped, a.slot, null), stash: [...s.stash, id] },
        InventoryLogKind.ARTIFACT_STASH,
        { artifactId: id, slot: a.slot },
      );
    }
    case "equip": {
      if (!s.stash.includes(a.artifactId)) return fail(StashError.NOT_IN_STASH);

      const cell = ARTIFACT_GRID_9.find((c) => c.slotType === ctx.artifactSlotType);

      if (!cell) return fail(StashError.NO_SLOT_FOR_ARTIFACT);

      const occupant = s.equipped[cell.key];

      const stash = s.stash.filter((id) => id !== a.artifactId);

      return ok(
        { ...s, equipped: buildEquipped(s.equipped, cell.key, a.artifactId), stash: occupant ? [...stash, occupant] : stash },
        InventoryLogKind.ARTIFACT_EQUIP,
        { artifactId: a.artifactId, slot: cell.key, ...(occupant ? { swappedArtifactId: occupant } : {}) },
      );
    }
    case "grant":
      return ok({ ...s, stash: [...s.stash, a.artifactId] }, InventoryLogKind.ARTIFACT_GRANT, { artifactId: a.artifactId });
    case "revoke":
      if (!s.stash.includes(a.artifactId)) return fail(StashError.NOT_IN_STASH);

      return ok({ ...s, stash: s.stash.filter((id) => id !== a.artifactId) }, InventoryLogKind.ARTIFACT_REVOKE, { artifactId: a.artifactId });
  }
}
