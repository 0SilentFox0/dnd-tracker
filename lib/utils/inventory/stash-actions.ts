import { gainCoins, spendCoins } from "./money";

import { ARTIFACT_GRID_9, ITEM_LIMITS } from "@/lib/constants/artifacts";
import { type Coin, InventoryLogKind, type InventoryLogKindValue } from "@/lib/constants/inventory";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";
import { canEquipOffHand } from "@/lib/utils/artifacts/off-hand";
import type { GrantPlan } from "@/lib/utils/items/grant";
import { isComposedRef } from "@/lib/utils/items/ref";
import { heldRefs, pruneAttuned } from "@/lib/utils/items/resolve";
import type { Purse, SpecialItem, StashState } from "@/types/inventory";

type ItemFields = { name: string; description?: string; quantity: number; consumable: boolean; parameter?: string; spellId?: string; worthGp?: number; ingredient?: string };

export type StashAction =
  | { action: "spend"; amount: number; coin: Coin; note: string }
  | { action: "gain"; amount: number; coin: Coin; note?: string }
  | { action: "setMoney"; gp: number; sp: number; cp: number }
  | ({ action: "addItem" } & ItemFields)
  | ({ action: "editItem"; itemId: string } & ItemFields)
  | { action: "useItem"; itemId: string }
  | { action: "removeItem"; itemId: string }
  | { action: "stash"; slot: string }
  | { action: "equip"; artifactId: string; slot?: "shield" }
  | { action: "grant"; artifactId: string; baseId?: string; quantity?: number; parameter?: string; spellId?: string }
  | { action: "revoke"; artifactId: string }
  | { action: "attune"; ref: string }
  | { action: "unattune"; ref: string };

export type StashActionName = StashAction["action"];

export const StashError = {
  NOT_ENOUGH_MONEY: "NOT_ENOUGH_MONEY",
  MONEY_OVERFLOW: "MONEY_OVERFLOW",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  SLOT_EMPTY: "SLOT_EMPTY",
  UNKNOWN_SLOT: "UNKNOWN_SLOT",
  NOT_IN_STASH: "NOT_IN_STASH",
  NO_SLOT_FOR_ARTIFACT: "NO_SLOT_FOR_ARTIFACT",
  ALREADY_IN_STASH: "ALREADY_IN_STASH",
  ITEMS_DISABLED: "ITEMS_DISABLED",
  ITEM_NOT_HELD: "ITEM_NOT_HELD",
  ATTUNEMENT_NOT_REQUIRED: "ATTUNEMENT_NOT_REQUIRED",
  ALREADY_ATTUNED: "ALREADY_ATTUNED",
  ATTUNEMENT_LIMIT: "ATTUNEMENT_LIMIT",
  ITEM_NOT_ATTUNED: "ITEM_NOT_ATTUNED",
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

const itemFields = ({ name, description, quantity, consumable, parameter, spellId, worthGp, ingredient }: ItemFields) => ({
  name,
  ...(description ? { description } : {}),
  quantity,
  consumable,
  ...(parameter && { parameter }),
  ...(spellId && { spellId }),
  ...(worthGp !== undefined && { worthGp }),
  ...(ingredient && { ingredient }),
});

const named = (ref: string, name?: string) => (name && isComposedRef(ref) ? { artifactName: name } : {});

const keepAttuned = (s: StashState, next: StashState, keep: (ref: string) => boolean): StashState => (s.attuned ? { ...next, attuned: s.attuned.filter(keep) } : next);

type Of<N extends StashActionName> = Extract<StashAction, { action: N }>;

type ItemsCtx = { items?: { enabled: boolean; limit: number; attunable: boolean }; name?: string };

export type StashCtx = {
  newItemId: string;
  artifactSlotType?: string;
  artifact?: { slot: string; bonuses?: unknown; modifiers?: unknown };
  classesEnabled?: boolean;
  grant?: GrantPlan;
  isDM?: boolean;
} & ItemsCtx;

function spendAction(s: StashState, a: Of<"spend">): StashResult {
  const purse = spendCoins(s.purse, a.amount, a.coin);

  if (!purse) return fail(StashError.NOT_ENOUGH_MONEY);

  return overflows(purse) ? fail(StashError.MONEY_OVERFLOW) : ok({ ...s, purse }, InventoryLogKind.MONEY_SPEND, diff(s.purse, purse), a.note);
}

function gainAction(s: StashState, a: Of<"gain">): StashResult {
  const purse = gainCoins(s.purse, a.amount, a.coin);

  if (overflows(purse)) return fail(StashError.MONEY_OVERFLOW);

  return ok({ ...s, purse }, InventoryLogKind.MONEY_GAIN, diff(s.purse, purse), a.note ?? null);
}

function setMoneyAction(s: StashState, a: Of<"setMoney">): StashResult {
  const purse = { gp: a.gp, sp: a.sp, cp: a.cp };

  return ok({ ...s, purse }, InventoryLogKind.MONEY_SET, diff(s.purse, purse));
}

function addItemAction(s: StashState, a: Of<"addItem">, ctx: Pick<StashCtx, "newItemId">): StashResult {
  const item: SpecialItem = { id: ctx.newItemId, ...itemFields(a) };

  return ok({ ...s, items: [...s.items, item] }, InventoryLogKind.ITEM_ADD, { item: item.name, qty: item.quantity });
}

function editItemAction(s: StashState, a: Of<"editItem">, ctx: Pick<StashCtx, "isDM">): StashResult {
  if (!s.items.some((i) => i.id === a.itemId)) return fail(StashError.ITEM_NOT_FOUND);

  // a player may not raise a DM-granted (mechanical) consumable: raising it unlinks the item
  const keepLink = (i: SpecialItem) => !!i.artifactId && (ctx.isDM !== false || a.quantity <= i.quantity);

  return ok(
    { ...s, items: s.items.map((i) => (i.id === a.itemId ? { id: i.id, ...itemFields(a), ...(keepLink(i) && { artifactId: i.artifactId }), ...(i.parameter && { parameter: i.parameter }), ...(i.spellId && { spellId: i.spellId }) } : i)) },
    InventoryLogKind.ITEM_EDIT,
    { item: a.name, qty: a.quantity },
  );
}

function consumeItemAction(s: StashState, a: Of<"useItem">): StashResult {
  const item = s.items.find((i) => i.id === a.itemId);

  if (!item?.consumable) return fail(StashError.ITEM_NOT_FOUND);

  const items = item.quantity > 1 ? s.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)) : s.items.filter((i) => i.id !== item.id);

  return ok({ ...s, items }, InventoryLogKind.ITEM_USE, { item: item.name, qty: -1 });
}

function removeItemAction(s: StashState, a: Of<"removeItem">): StashResult {
  const item = s.items.find((i) => i.id === a.itemId);

  if (!item) return fail(StashError.ITEM_NOT_FOUND);

  return ok({ ...s, items: s.items.filter((i) => i.id !== item.id) }, InventoryLogKind.ITEM_REMOVE, { item: item.name, qty: -item.quantity });
}

function stashAction(s: StashState, a: Of<"stash">): StashResult {
  if (!ARTIFACT_GRID_9.some((c) => c.key === a.slot)) return fail(StashError.UNKNOWN_SLOT);

  const id = s.equipped[a.slot];

  if (!id) return fail(StashError.SLOT_EMPTY);

  if (s.stash.includes(id)) return fail(StashError.ALREADY_IN_STASH);

  const equipped = buildEquipped(s.equipped, a.slot, null);

  return ok(
    keepAttuned(s, { ...s, equipped, stash: [...s.stash, id] }, (r) => r !== id || Object.values(equipped).includes(id)),
    InventoryLogKind.ARTIFACT_STASH,
    { artifactId: id, slot: a.slot },
  );
}

function equipAction(s: StashState, a: Of<"equip">, ctx: Pick<StashCtx, "artifact" | "artifactSlotType" | "classesEnabled">): StashResult {
  if (!s.stash.includes(a.artifactId)) return fail(StashError.NOT_IN_STASH);

  const cell =
    a.slot === "shield"
      ? ctx.artifact && canEquipOffHand(ctx.artifact, !!ctx.classesEnabled) && ARTIFACT_GRID_9.find((c) => c.key === a.slot)
      : ARTIFACT_GRID_9.find((c) => c.slotType === ctx.artifactSlotType);

  if (!cell) return fail(StashError.NO_SLOT_FOR_ARTIFACT);

  const occupant = s.equipped[cell.key];

  if (occupant && occupant !== a.artifactId && s.stash.includes(occupant)) return fail(StashError.ALREADY_IN_STASH);

  const stash = s.stash.filter((id) => id !== a.artifactId);

  return ok(
    { ...s, equipped: buildEquipped(s.equipped, cell.key, a.artifactId), stash: occupant ? [...stash, occupant] : stash },
    InventoryLogKind.ARTIFACT_EQUIP,
    { artifactId: a.artifactId, slot: cell.key, ...(occupant ? { swappedArtifactId: occupant } : {}) },
  );
}

function grantAction(s: StashState, a: Of<"grant">, ctx: Pick<StashCtx, "grant" | "newItemId">): StashResult {
  const plan = ctx.grant;

  if (plan?.kind === "consumable") {
    const existing = s.items.find((i) => i.artifactId === plan.artifactId && i.parameter === plan.parameter && i.spellId === plan.spellId);

    const items = existing
      ? s.items.map((i) => (i === existing ? { ...i, quantity: Math.min(ITEM_LIMITS.quantity, i.quantity + plan.quantity) } : i))
      : [...s.items, { id: ctx.newItemId, name: plan.name, ...(plan.description && { description: plan.description }), quantity: plan.quantity, consumable: true, artifactId: plan.artifactId, ...(plan.parameter && { parameter: plan.parameter }), ...(plan.spellId && { spellId: plan.spellId }) }];

    return ok({ ...s, items }, InventoryLogKind.ITEM_ADD, { item: plan.name, qty: plan.quantity, artifactId: plan.artifactId, ...(plan.parameter && { parameter: plan.parameter }) });
  }

  const ref = plan?.ref ?? a.artifactId;

  if (plan && s.stash.includes(ref)) return fail(StashError.ALREADY_IN_STASH);

  return ok({ ...s, stash: [...s.stash, ref] }, InventoryLogKind.ARTIFACT_GRANT, { artifactId: ref, ...named(ref, plan?.name) });
}

function revokeAction(s: StashState, a: Of<"revoke">): StashResult {
  if (!s.stash.includes(a.artifactId)) return fail(StashError.NOT_IN_STASH);

  const next = { ...s, stash: s.stash.filter((id) => id !== a.artifactId) };

  return ok(s.attuned ? { ...next, attuned: pruneAttuned(s.attuned, next) } : next, InventoryLogKind.ARTIFACT_REVOKE, { artifactId: a.artifactId });
}

function attuneAction(s: StashState, a: Of<"attune">, ctx: ItemsCtx): StashResult {
  if (!ctx.items?.enabled) return fail(StashError.ITEMS_DISABLED);

  if (!heldRefs(s).includes(a.ref)) return fail(StashError.ITEM_NOT_HELD);

  if (!ctx.items.attunable) return fail(StashError.ATTUNEMENT_NOT_REQUIRED);

  const attuned = s.attuned ?? [];

  if (attuned.includes(a.ref)) return fail(StashError.ALREADY_ATTUNED);

  if (attuned.length >= ctx.items.limit) return fail(StashError.ATTUNEMENT_LIMIT);

  return ok({ ...s, attuned: [...attuned, a.ref] }, InventoryLogKind.ITEM_ATTUNE, { artifactId: a.ref, ...named(a.ref, ctx.name) });
}

function unattuneAction(s: StashState, a: Of<"unattune">, ctx: ItemsCtx): StashResult {
  if (!ctx.items?.enabled) return fail(StashError.ITEMS_DISABLED);

  if (!(s.attuned ?? []).includes(a.ref)) return fail(StashError.ITEM_NOT_ATTUNED);

  return ok({ ...s, attuned: (s.attuned ?? []).filter((r) => r !== a.ref) }, InventoryLogKind.ITEM_UNATTUNE, { artifactId: a.ref, ...named(a.ref, ctx.name) });
}

export function applyStashAction(s: StashState, a: StashAction, ctx: StashCtx): StashResult {
  switch (a.action) {
    case "spend":
      return spendAction(s, a);
    case "gain":
      return gainAction(s, a);
    case "setMoney":
      return setMoneyAction(s, a);
    case "addItem":
      return addItemAction(s, a, ctx);
    case "editItem":
      return editItemAction(s, a, ctx);
    case "useItem":
      return consumeItemAction(s, a);
    case "removeItem":
      return removeItemAction(s, a);
    case "stash":
      return stashAction(s, a);
    case "equip":
      return equipAction(s, a, ctx);
    case "grant":
      return grantAction(s, a, ctx);
    case "revoke":
      return revokeAction(s, a);
    case "attune":
      return attuneAction(s, a, ctx);
    case "unattune":
      return unattuneAction(s, a, ctx);
  }
}
