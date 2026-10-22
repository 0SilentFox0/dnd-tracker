# Підсумок персонажа + персонаж від гравця — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** вкладка «Підсумок» (невдягнені артефакти, особливі речі, гроші з витратами, журнал) для кожного персонажа + створення/автогенерація персонажа гравцем зі схваленням DM.

**Architecture:** сховок живе в наявній `CharacterInventory` (нова колонка `stash`, типізовані `items`, гроші вже є); усі зміни — одна дія через `POST …/stash`, чистий редуктор `applyStashAction` у `lib/utils/inventory/`, запис у `inventory_log` у тій самій транзакції під `lockCampaignArtifacts`. Чернетки — `Character.status = PENDING`, що відфільтровується з бою/балансу/ростера/AI через один хелпер; генератор і валідатор характеристик — чисті функції.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6 / Postgres, Zod, TanStack Query, Vitest, AI SDK (`ai`, `generateObject`).

**Spec:** `docs/superpowers/specs/2026-10-22-stash-and-player-drafts-design.md`

**Робоча папка:** `/Users/silentfox/Work/dnd-tracker-stash` (worktree, гілка `feat/stash-and-player-drafts`). Локальна БД — Docker `pnpm db:local` (порт 54322); для міграцій окрема БД `stash` (`DATABASE_URL=postgresql://postgres:postgres@localhost:54322/stash`, `DIRECT_URL` — той самий). `.env.local` скопіювати з `../dnd-tracker/.env.local` і замінити обидва URL.

## Global Constraints

- Міграція лише expand-only; кожен `CREATE TABLE` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (перевіряє `prisma/__tests__/migrations-rls.test.ts`).
- Тексти UI і помилок — українською; помилки API — `{ error }` через `errorResponse`, тексти в `lib/constants/api-errors.ts`.
- `route.ts` тонкий: Zod + доступ + делегування в сусідній `*.ts`; компоненти не імпортують `@/lib/api/*`; запити — `lib/api/inventory.ts`, хуки — `lib/hooks/characters/` (файли `useX.ts`, експорт з `index.ts`), ключі — `lib/hooks/characters/keys.ts`.
- Діалоги тільки `ResponsiveDialog hud`; підтвердження — `useConfirm`, повідомлення — `useNotify`.
- Курс монет: 1 зм = 10 см = 100 мм. Point-buy: бюджет 27, значення 8–15, вартість 8:0 9:1 10:2 11:3 12:4 13:5 14:7 15:9. Стандартний масив: 15, 14, 13, 12, 10, 8.
- **Расових бонусів до характеристик у проєкті немає** (модель `Race` не має таких полів) — форма й сервер перевіряють «чистий» масив/point-buy. Пункт специфікації про расові бонуси — no-op.
- AI-ключі в проєкті належать користувачу (`aiCredential.userId`); «ключ кампанії» = ключ DM кампанії (`campaign_members.role = 'dm'`). Ключ ніколи не потрапляє у відповідь/лог.
- Коментарі мінімальні (лише «чому»). Порожній рядок навколо `const`/`if`/`return`/блоків (ESLint `padding-line-between-statements`).
- Тести під час роботи — `pnpm test:related <файли>`; повний `pnpm test:run` — один раз у кінці.

## Review Focus

1. **Витрата більше, ніж є, або дробові/від'ємні суми** — 400 «Недостатньо коштів»/помилка валідації, гаманець не змінюється (тест у Task 2 і Task 4).
2. **Два одночасні запити (гравець і DM) на один сховок або грант того самого артефакта двом героям** — блокування `lockCampaignArtifacts` у транзакції; артефакт не може опинитися у двох місцях (тест `findHolder` зі сховком у Task 3).
3. **Гравець надсилає дію DM (`grant`/`revoke`/`setMoney`) або діє над чужим персонажем / над своєю чернеткою** — 403 (тест `canStashAction` у Task 4).
4. **Ручний POST чернетки з характеристиками 18/18/18 або другою чернеткою** — 400 (тести `validateAbilityScores` у Task 8 і `draftRejection` у Task 9).
5. **Чернетка (`PENDING`) з'являється в бою/балансі/ростері/AI-групі** — фільтр `ACTIVE_CHARACTER` скрізь (тест у Task 7).

---

### Task 1: Схема, міграція, типи

**Files:**
- Modify: `prisma/schema.prisma` (моделі `Character`, `CharacterInventory`, нова `InventoryLog`, зворотні зв'язки в `Character`/`Campaign`)
- Create: `prisma/migrations/20261024000000_stash_and_player_drafts/migration.sql`
- Modify: `types/inventory.ts`
- Create: `lib/constants/inventory.ts`
- Create: `lib/utils/inventory/items.ts`, `lib/utils/inventory/__tests__/items.test.ts`
- Modify: `lib/constants/characters.ts` (додати `CharacterStatus`)

**Interfaces:**
- Produces: `SpecialItem`, `Purse`, `Coin`, `StashState`, `InventoryLogKind`, `InventoryLogEntry` (types/inventory.ts); `COIN_VALUE`, `COINS`, `COIN_LABEL`, `InventoryLogKind` const (lib/constants/inventory.ts); `normalizeItems(raw: unknown): SpecialItem[]`, `normalizeStash(raw: unknown): string[]` (lib/utils/inventory/items.ts); `CharacterStatus = { ACTIVE: "active", PENDING: "pending" }`, `ACTIVE_CHARACTER = { status: CharacterStatus.ACTIVE }` (lib/constants/characters.ts).

- [ ] **Step 1: Схема.** У `Character` додати:

```prisma
  status              String              @default("active")
  reviewNote          String?
  inventoryLog        InventoryLog[]
```

У `CharacterInventory` додати `stash Json @default("[]")`. Нова модель (і `inventoryLog InventoryLog[]` у `Campaign`):

```prisma
model InventoryLog {
  id          String    @id @default(cuid())
  campaignId  String
  characterId String
  actorUserId String
  kind        String
  delta       Json      @default("{}")
  note        String?
  createdAt   DateTime  @default(now())
  campaign    Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([characterId, createdAt(sort: Desc)])
  @@map("inventory_log")
}
```

- [ ] **Step 2: Міграція.** `pnpm exec prisma migrate dev --name stash_and_player_drafts --create-only`, перейменувати теку на `20261024000000_stash_and_player_drafts` (після останньої `20261023000000_show_curtain`), переконатися, що SQL містить і дописати:

```sql
ALTER TABLE "inventory_log" ENABLE ROW LEVEL SECURITY;
```

Потім `pnpm exec prisma migrate dev` (застосувати) і `pnpm exec prisma generate`.

- [ ] **Step 3: Константи й типи.** `lib/constants/inventory.ts`:

```ts
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
  ARTIFACT_GRANT: "artifact_grant",
  ARTIFACT_REVOKE: "artifact_revoke",
  ARTIFACT_TRANSFER: "artifact_transfer",
} as const;

export type InventoryLogKindValue = (typeof InventoryLogKind)[keyof typeof InventoryLogKind];

export const LOG_PAGE_SIZE = 20;
```

У `types/inventory.ts` додати (старі типи не видаляти):

```ts
import type { Coin, InventoryLogKindValue } from "@/lib/constants/inventory";

export type { Coin };

export interface SpecialItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  consumable: boolean;
}

export type Purse = Record<Coin, number>;

export interface StashState {
  equipped: EquippedItems;
  stash: string[];
  items: SpecialItem[];
  purse: Purse;
}

export interface InventoryLogEntry {
  id: string;
  kind: InventoryLogKindValue;
  delta: Record<string, unknown>;
  note: string | null;
  createdAt: string;
  actor: { id: string; displayName: string | null };
}
```

У `lib/constants/characters.ts`:

```ts
export const CharacterStatus = { ACTIVE: "active", PENDING: "pending" } as const;

export type CharacterStatusValue = (typeof CharacterStatus)[keyof typeof CharacterStatus];

export const ACTIVE_CHARACTER = { status: CharacterStatus.ACTIVE } as const;
```

- [ ] **Step 4: Тест нормалізації (падає).** `lib/utils/inventory/__tests__/items.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";

describe("normalizeItems", () => {
  it("fills id/quantity/consumable for legacy rows and drops nameless", () => {
    const out = normalizeItems([{ name: "Ключ" }, { name: "Зілля", quantity: 3, consumable: true, id: "x" }, { quantity: 1 }, "junk"]);

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: "Ключ", quantity: 1, consumable: false });
    expect(out[0].id).toBe("legacy-0");
    expect(out[1]).toEqual({ id: "x", name: "Зілля", quantity: 3, consumable: true });
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeItems(null)).toEqual([]);
  });
});

describe("normalizeStash", () => {
  it("keeps unique non-empty strings", () => {
    expect(normalizeStash(["a", "a", "", 3, "b"])).toEqual(["a", "b"]);
  });
});
```

Run: `pnpm test:run lib/utils/inventory/__tests__/items.test.ts` → FAIL (модуля немає).

- [ ] **Step 5: Реалізація.** `lib/utils/inventory/items.ts`:

```ts
import type { SpecialItem } from "@/types/inventory";

export function normalizeItems(raw: unknown): SpecialItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((r, i): SpecialItem[] => {
    if (!r || typeof r !== "object" || typeof (r as { name?: unknown }).name !== "string") return [];

    const o = r as Record<string, unknown>;

    return [
      {
        id: typeof o.id === "string" && o.id ? o.id : `legacy-${i}`,
        name: o.name as string,
        ...(typeof o.description === "string" && o.description ? { description: o.description } : {}),
        quantity: typeof o.quantity === "number" && o.quantity > 0 ? Math.floor(o.quantity) : 1,
        consumable: o.consumable === true,
      },
    ];
  });
}

export function normalizeStash(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return [...new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0))];
}
```

Run тест → PASS. Також `pnpm test:run prisma/__tests__/migrations-rls.test.ts` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add prisma types/inventory.ts lib/constants/inventory.ts lib/constants/characters.ts lib/utils/inventory
git commit -m "feat(inventory): stash column, inventory_log, character status"
```

---

### Task 2: Гроші — витрата з розміном

**Files:**
- Create: `lib/utils/inventory/money.ts`, `lib/utils/inventory/__tests__/money.test.ts`

**Interfaces:**
- Consumes: `Coin`, `COIN_VALUE`, `COINS` (Task 1), `Purse`.
- Produces: `toCopper(p: Purse): number`, `spendCoins(p: Purse, amount: number, coin: Coin): Purse | null` (null = не вистачає), `gainCoins(p: Purse, amount: number, coin: Coin): Purse`, `formatCoins(delta: Partial<Purse>): string`.

- [ ] **Step 1: Тести (падають).**

```ts
import { describe, expect, it } from "vitest";

import { formatCoins, gainCoins, spendCoins, toCopper } from "@/lib/utils/inventory/money";

const p = (gp: number, sp: number, cp: number) => ({ gp, sp, cp });

describe("spendCoins", () => {
  it("pays with the named coin first", () => {
    expect(spendCoins(p(10, 5, 5), 3, "gp")).toEqual(p(7, 5, 5));
  });

  it("uses smaller coins when the named coin runs out", () => {
    expect(spendCoins(p(0, 20, 0), 1, "gp")).toEqual(p(0, 10, 0));
  });

  it("breaks the smallest bigger coin and returns change", () => {
    expect(spendCoins(p(1, 0, 0), 5, "cp")).toEqual(p(0, 9, 5));
    expect(spendCoins(p(1, 1, 0), 5, "cp")).toEqual(p(1, 0, 5));
  });

  it("returns null when total is not enough", () => {
    expect(spendCoins(p(0, 9, 9), 1, "gp")).toBeNull();
  });

  it("never produces negative counts and preserves total", () => {
    const before = p(3, 7, 2);
    const after = spendCoins(before, 46, "cp")!;

    expect(Object.values(after).every((n) => n >= 0)).toBe(true);
    expect(toCopper(after)).toBe(toCopper(before) - 46);
  });
});

describe("gainCoins / formatCoins", () => {
  it("adds without converting", () => {
    expect(gainCoins(p(1, 0, 0), 25, "sp")).toEqual(p(1, 25, 0));
  });

  it("formats signed deltas", () => {
    expect(formatCoins({ gp: -50 })).toBe("−50 зм");
    expect(formatCoins({ gp: 1, cp: 5 })).toBe("+1 зм +5 мм");
  });
});
```

Run: `pnpm test:run lib/utils/inventory/__tests__/money.test.ts` → FAIL.

- [ ] **Step 2: Реалізація.**

```ts
import { type Coin, COIN_LABEL, COIN_VALUE, COINS } from "@/lib/constants/inventory";
import type { Purse } from "@/types/inventory";

export const toCopper = (p: Purse) => COINS.reduce((s, c) => s + p[c] * COIN_VALUE[c], 0);

const payOrder = (coin: Coin): Coin[] => {
  const lower = COINS.filter((c) => COIN_VALUE[c] < COIN_VALUE[coin]);
  const higher = COINS.filter((c) => COIN_VALUE[c] > COIN_VALUE[coin]).reverse();

  return [coin, ...lower, ...higher];
};

export function spendCoins(purse: Purse, amount: number, coin: Coin): Purse | null {
  let due = amount * COIN_VALUE[coin];

  if (toCopper(purse) < due) return null;

  const next = { ...purse };

  for (const c of payOrder(coin)) {
    const use = Math.min(next[c], Math.floor(due / COIN_VALUE[c]));

    next[c] -= use;
    due -= use * COIN_VALUE[c];
  }

  if (due === 0) return next;

  // greedy left a remainder smaller than every coin still held: break the smallest one
  const breakCoin = [...COINS].reverse().find((c) => next[c] > 0)!;

  next[breakCoin] -= 1;

  let change = COIN_VALUE[breakCoin] - due;

  for (const c of COINS.filter((x) => COIN_VALUE[x] < COIN_VALUE[breakCoin])) {
    next[c] += Math.floor(change / COIN_VALUE[c]);
    change %= COIN_VALUE[c];
  }

  return next;
}

export const gainCoins = (purse: Purse, amount: number, coin: Coin): Purse => ({ ...purse, [coin]: purse[coin] + amount });

export const formatCoins = (delta: Partial<Purse>) =>
  COINS.filter((c) => delta[c])
    .map((c) => `${delta[c]! < 0 ? "−" : "+"}${Math.abs(delta[c]!)} ${COIN_LABEL[c]}`)
    .join(" ");
```

Run → PASS.

- [ ] **Step 3: Commit.** `git add lib/utils/inventory && git commit -m "feat(inventory): coin spending with change"`

---

### Task 3: Редуктор сховку + власність артефактів зі сховком

**Files:**
- Create: `lib/utils/inventory/stash-actions.ts`, `lib/utils/inventory/__tests__/stash-actions.test.ts`
- Modify: `lib/utils/artifacts/ownership.ts`, `lib/utils/artifacts/__tests__/ownership.test.ts`

**Interfaces:**
- Consumes: `StashState`, `SpecialItem`, `spendCoins`, `gainCoins`, `InventoryLogKind`, `buildEquipped`, `ARTIFACT_GRID_9`.
- Produces:
  - `StashAction` (union, той самий, що Zod-схема в Task 4):
    `{action:"spend";amount;coin;note}` · `{action:"gain";amount;coin;note?}` · `{action:"setMoney";gp;sp;cp}` · `{action:"addItem";name;description?;quantity;consumable}` · `{action:"editItem";itemId;name;description?;quantity;consumable}` · `{action:"useItem";itemId}` · `{action:"removeItem";itemId}` · `{action:"stash";slot}` · `{action:"equip";artifactId}` · `{action:"grant";artifactId}` · `{action:"revoke";artifactId}`
  - `StashError` const: `NOT_ENOUGH_MONEY | ITEM_NOT_FOUND | SLOT_EMPTY | UNKNOWN_SLOT | NOT_IN_STASH | NO_SLOT_FOR_ARTIFACT` (зайнятість артефакта перевіряє маршрут через `findHolder`)
  - `applyStashAction(state: StashState, action: StashAction, ctx: { newItemId: string; artifactSlotType?: string }): { ok: true; state: StashState; log: { kind: InventoryLogKindValue; delta: Record<string, unknown>; note: string | null } } | { ok: false; error: StashErrorCode }`
  - ownership: `HeldInventory = { characterId; equipped; stash: string[] }`; `findHolder` перевіряє `equipped` і `stash`; `planTransfer({ from, to, source }: { from; to; source: { slot: string } | { artifactId: string } })` → `{ ok: true; artifactId; fromEquipped; fromStash; toStash } | { ok: false; error }` (додати `TransferError.NOT_IN_STASH`). Переданий артефакт іде в **сховок** отримувача (без обміну).

- [ ] **Step 1: Тести редуктора (падають).** Покрити:

```ts
import { describe, expect, it } from "vitest";

import { applyStashAction, StashError } from "@/lib/utils/inventory/stash-actions";
import type { StashState } from "@/types/inventory";

const base = (): StashState => ({
  equipped: { weapon: "sword" },
  stash: ["ring-a"],
  items: [{ id: "p1", name: "Зілля", quantity: 2, consumable: true }],
  purse: { gp: 10, sp: 0, cp: 0 },
});
const ctx = { newItemId: "new-1" };

describe("applyStashAction", () => {
  it("spend deducts and logs negative delta with note", () => {
    const r = applyStashAction(base(), { action: "spend", amount: 3, coin: "gp", note: "човен" }, ctx);

    expect(r.ok && r.state.purse).toEqual({ gp: 7, sp: 0, cp: 0 });
    expect(r.ok && r.log).toEqual({ kind: "money_spend", delta: { gp: -3, sp: 0, cp: 0 }, note: "човен" });
  });

  it("spend over balance fails", () => {
    expect(applyStashAction(base(), { action: "spend", amount: 11, coin: "gp", note: "x" }, ctx)).toEqual({ ok: false, error: StashError.NOT_ENOUGH_MONEY });
  });

  it("useItem decrements and removes at zero", () => {
    const once = applyStashAction(base(), { action: "useItem", itemId: "p1" }, ctx);

    expect(once.ok && once.state.items[0].quantity).toBe(1);

    const twice = once.ok ? applyStashAction(once.state, { action: "useItem", itemId: "p1" }, ctx) : once;

    expect(twice.ok && twice.state.items).toEqual([]);
    expect(twice.ok && twice.log.kind).toBe("item_use");
  });

  it("addItem uses ctx.newItemId", () => {
    const r = applyStashAction(base(), { action: "addItem", name: "Ключ", quantity: 1, consumable: false }, ctx);

    expect(r.ok && r.state.items.at(-1)).toEqual({ id: "new-1", name: "Ключ", quantity: 1, consumable: false });
  });

  it("stash moves equipped slot to stash", () => {
    const r = applyStashAction(base(), { action: "stash", slot: "weapon" }, ctx);

    expect(r.ok && r.state.equipped).toEqual({});
    expect(r.ok && r.state.stash).toEqual(["ring-a", "sword"]);
  });

  it("equip puts artifact in its grid cell and swaps occupant into stash", () => {
    const s = { ...base(), equipped: { ring1: "ring-old" } };
    const r = applyStashAction(s, { action: "equip", artifactId: "ring-a" }, { ...ctx, artifactSlotType: "ring" });

    expect(r.ok && r.state.equipped).toEqual({ ring1: "ring-a" });
    expect(r.ok && r.state.stash).toEqual(["ring-old"]);
  });

  it("equip of ITEM-slot artifact fails", () => {
    expect(applyStashAction(base(), { action: "equip", artifactId: "ring-a" }, { ...ctx, artifactSlotType: "item" })).toEqual({ ok: false, error: StashError.NO_SLOT_FOR_ARTIFACT });
  });

  it("grant appends, revoke removes", () => {
    const g = applyStashAction(base(), { action: "grant", artifactId: "amulet" }, ctx);

    expect(g.ok && g.state.stash).toEqual(["ring-a", "amulet"]);

    const r = applyStashAction(base(), { action: "revoke", artifactId: "ring-a" }, ctx);

    expect(r.ok && r.state.stash).toEqual([]);
  });
});
```

Тести `ownership.test.ts` оновити: `findHolder` знаходить артефакт у `stash` іншого героя; `planTransfer` зі `source: { slot }` очищає слот відправника й додає в `toStash`; зі `source: { artifactId }` прибирає зі `fromStash`; `NOT_IN_STASH`, `EMPTY_SLOT`, `SAME_CHARACTER`, `UNKNOWN_SLOT` лишаються.

Run: `pnpm test:run lib/utils/inventory lib/utils/artifacts/__tests__/ownership.test.ts` → FAIL.

- [ ] **Step 2: Реалізація редуктора** `lib/utils/inventory/stash-actions.ts`:

```ts
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
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  SLOT_EMPTY: "SLOT_EMPTY",
  UNKNOWN_SLOT: "UNKNOWN_SLOT",
  NOT_IN_STASH: "NOT_IN_STASH",
  NO_SLOT_FOR_ARTIFACT: "NO_SLOT_FOR_ARTIFACT",
} as const;

export type StashErrorCode = (typeof StashError)[keyof typeof StashError];

type Log = { kind: InventoryLogKindValue; delta: Record<string, unknown>; note: string | null };

export type StashResult = { ok: true; state: StashState; log: Log } | { ok: false; error: StashErrorCode };

const diff = (a: Purse, b: Purse) => ({ gp: b.gp - a.gp, sp: b.sp - a.sp, cp: b.cp - a.cp });

const ok = (state: StashState, kind: InventoryLogKindValue, delta: Record<string, unknown>, note: string | null = null): StashResult => ({ ok: true, state, log: { kind, delta, note } });

const fail = (error: StashErrorCode): StashResult => ({ ok: false, error });

const itemFields = ({ name, description, quantity, consumable }: ItemFields) => ({ name, ...(description ? { description } : {}), quantity, consumable });

export function applyStashAction(s: StashState, a: StashAction, ctx: { newItemId: string; artifactSlotType?: string }): StashResult {
  switch (a.action) {
    case "spend": {
      const purse = spendCoins(s.purse, a.amount, a.coin);

      return purse ? ok({ ...s, purse }, InventoryLogKind.MONEY_SPEND, diff(s.purse, purse), a.note) : fail(StashError.NOT_ENOUGH_MONEY);
    }
    case "gain": {
      const purse = gainCoins(s.purse, a.amount, a.coin);

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

      return ok({ ...s, items: s.items.map((i) => (i.id === a.itemId ? { id: i.id, ...itemFields(a) } : i)) }, InventoryLogKind.ITEM_EDIT, { item: a.name, qty: a.quantity });
    }
    case "useItem": {
      const item = s.items.find((i) => i.id === a.itemId);

      if (!item) return fail(StashError.ITEM_NOT_FOUND);

      const items = item.quantity > 1 ? s.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)) : s.items.filter((i) => i.id !== item.id);

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

      return ok({ ...s, equipped: buildEquipped(s.equipped, a.slot, null), stash: [...s.stash, id] }, InventoryLogKind.ARTIFACT_STASH, { artifactId: id, slot: a.slot });
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
```

- [ ] **Step 3: Оновити `ownership.ts`.**

```ts
export interface HeldInventory {
  characterId: string;
  equipped: EquippedItems;
  stash: string[];
}

export const TransferError = { EMPTY_SLOT: "EMPTY_SLOT", SAME_CHARACTER: "SAME_CHARACTER", UNKNOWN_SLOT: "UNKNOWN_SLOT", NOT_IN_STASH: "NOT_IN_STASH" } as const;

export type TransferPlan =
  | { ok: true; artifactId: string; fromEquipped: EquippedItems; fromStash: string[]; toStash: string[] }
  | { ok: false; error: TransferErrorCode };

export function findHolder(inventories: HeldInventory[], artifactId: string, exceptCharacterId?: string): string | null {
  const holder = inventories.find((inv) => inv.characterId !== exceptCharacterId && (Object.values(inv.equipped).includes(artifactId) || inv.stash.includes(artifactId)));

  return holder?.characterId ?? null;
}

export function planTransfer({ from, to, source }: { from: HeldInventory; to: HeldInventory; source: { slot: string } | { artifactId: string } }): TransferPlan {
  if (from.characterId === to.characterId) return { ok: false, error: TransferError.SAME_CHARACTER };

  if ("slot" in source) {
    if (!ARTIFACT_GRID_9.some((cell) => cell.key === source.slot)) return { ok: false, error: TransferError.UNKNOWN_SLOT };

    const artifactId = from.equipped[source.slot];

    if (!artifactId) return { ok: false, error: TransferError.EMPTY_SLOT };

    return { ok: true, artifactId, fromEquipped: buildEquipped(from.equipped, source.slot, null), fromStash: from.stash, toStash: [...to.stash, artifactId] };
  }

  if (!from.stash.includes(source.artifactId)) return { ok: false, error: TransferError.NOT_IN_STASH };

  return { ok: true, artifactId: source.artifactId, fromEquipped: from.equipped, fromStash: from.stash.filter((id) => id !== source.artifactId), toStash: [...to.stash, source.artifactId] };
}
```

Знайти всіх споживачів: `grep -rn "findHolder\|planTransfer\|HeldInventory" app lib components` — у кожному місці передати `stash: normalizeStash(inv.stash)` (решта виправляється в Task 4).

Run: `pnpm test:run lib/utils/inventory lib/utils/artifacts` → PASS; `pnpm exec tsc --noEmit -p .` — помилки лише в маршрутах, які чіпає Task 4.

- [ ] **Step 4: Commit.** `git add lib/utils && git commit -m "feat(inventory): stash reducer, ownership counts stash"`

---

### Task 4: API сховку, журнал, передача й DM-екіпірування

**Files:**
- Create: `app/api/campaigns/[id]/characters/[characterId]/stash/route.ts`, `…/stash/stash-schema.ts`, `…/stash/read-stash.ts`, `…/stash/apply-stash.ts`, `…/stash/log/route.ts`, `…/stash/log/read-log.ts`
- Create: `lib/utils/inventory/permissions.ts`, `lib/utils/inventory/__tests__/permissions.test.ts`
- Create: `lib/server/inventory/log.ts` (`writeInventoryLog(tx, entries)`)
- Modify: `app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/transfer-artifact.ts`
- Modify: `app/api/campaigns/[id]/characters/[characterId]/inventory/update-inventory.ts` (DM вдягає з власного сховку — прибрати зі `stash`; `findHolder` з `stash`)
- Modify: `app/api/campaigns/[id]/characters/roster/read-roster.ts` (якщо використовує `HeldInventory`)
- Modify: `lib/server/artifacts/lock.ts` (`ensureInventory` створює `stash: []`)
- Modify: `lib/constants/api-errors.ts`
- Modify: `types/inventory.ts` (`StashView`)

**Interfaces:**
- Consumes: `applyStashAction`, `StashAction`, `StashError`, `normalizeItems`, `normalizeStash`, `findHolder`, `planTransfer`, `lockCampaignArtifacts`, `ensureInventory`.
- Produces:
  - `canStashAction(action: StashActionName, who: { isDM: boolean; isOwner: boolean; pending: boolean }): boolean`
  - `GET /api/campaigns/:id/characters/:cid/stash` → `StashView = { purse: Purse; items: SpecialItem[]; artifacts: Array<{ id; name; icon: string | null; rarity: string | null; slot: string; description: string | null }>; freeArtifacts?: same[] /* лише DM */ }`
  - `POST …/stash` body `StashAction` → `StashView`
  - `GET …/stash/log?cursor=<id>` → `{ entries: InventoryLogEntry[]; nextCursor: string | null }`
  - `POST …/artifacts/transfer` body `{ toCharacterId; slot?: string; artifactId?: string }` (рівно одне з двох)

- [ ] **Step 1: Тест прав (падає)** `lib/utils/inventory/__tests__/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { canStashAction } from "@/lib/utils/inventory/permissions";

const owner = { isDM: false, isOwner: true, pending: false };

describe("canStashAction", () => {
  it.each(["spend", "gain", "addItem", "editItem", "useItem", "removeItem", "stash", "equip"] as const)("owner may %s", (a) => {
    expect(canStashAction(a, owner)).toBe(true);
  });

  it.each(["grant", "revoke", "setMoney"] as const)("owner may not %s", (a) => {
    expect(canStashAction(a, owner)).toBe(false);
  });

  it("stranger may nothing, DM everything", () => {
    expect(canStashAction("spend", { isDM: false, isOwner: false, pending: false })).toBe(false);
    expect(canStashAction("grant", { isDM: true, isOwner: false, pending: true })).toBe(true);
  });

  it("owner of a pending draft may nothing", () => {
    expect(canStashAction("spend", { ...owner, pending: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Реалізація прав.**

```ts
import type { StashActionName } from "./stash-actions";

const PLAYER_ACTIONS: ReadonlySet<StashActionName> = new Set(["spend", "gain", "addItem", "editItem", "useItem", "removeItem", "stash", "equip"]);

export const canStashAction = (action: StashActionName, who: { isDM: boolean; isOwner: boolean; pending: boolean }) =>
  who.isDM || (who.isOwner && !who.pending && PLAYER_ACTIONS.has(action));
```

Run `pnpm test:run lib/utils/inventory` → PASS.

- [ ] **Step 3: Помилки.** У `API_ERRORS` додати:

```ts
  NOT_ENOUGH_MONEY: "Недостатньо коштів",
  ITEM_NOT_FOUND: "Річ не знайдено",
  ARTIFACT_NOT_IN_STASH: "Цього артефакта немає в підсумку",
  ARTIFACT_NO_SLOT: "Цей артефакт не вдягається — він лежить у підсумку",
  ARTIFACT_NOT_FOUND: "Артефакт не знайдено",
```

- [ ] **Step 4: Zod-схема** `stash-schema.ts` (відповідає `StashAction` один-в-один):

```ts
import { z } from "zod";

import { COINS } from "@/lib/constants/inventory";

const amount = z.number().int().min(1).max(1_000_000);
const coin = z.enum(COINS);
const money = z.number().int().min(0).max(10_000_000);
const item = { name: z.string().trim().min(1).max(100), description: z.string().trim().max(1000).optional(), quantity: z.number().int().min(1).max(9999), consumable: z.boolean() };
const id = z.string().min(1).max(64);

export const stashActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("spend"), amount, coin, note: z.string().trim().min(1).max(200) }),
  z.object({ action: z.literal("gain"), amount, coin, note: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("setMoney"), gp: money, sp: money, cp: money }),
  z.object({ action: z.literal("addItem"), ...item }),
  z.object({ action: z.literal("editItem"), itemId: id, ...item }),
  z.object({ action: z.literal("useItem"), itemId: id }),
  z.object({ action: z.literal("removeItem"), itemId: id }),
  z.object({ action: z.literal("stash"), slot: id }),
  z.object({ action: z.literal("equip"), artifactId: id }),
  z.object({ action: z.literal("grant"), artifactId: id }),
  z.object({ action: z.literal("revoke"), artifactId: id }),
]);
```

- [ ] **Step 5: `read-stash.ts`** — `readStash(campaignId, characterId)` і хелпер `buildStashView(tx, campaignId, inventory, isDM)`:
  - доступ `requireCampaignAccess`; персонаж через `loadOwned`; не DM і не власник → 403.
  - `ensureInventory` не викликати на GET (порожній інвентар → нулі/порожні списки).
  - артефакти сховку: `prisma.artifact.findMany({ where: { campaignId, id: { in: stash } }, select: { id, name, icon, rarity, slot, description } })` у порядку `stash`.
  - `freeArtifacts` (лише DM): усі артефакти кампанії мінус ті, що знаходить `findHolder` у будь-якому інвентарі кампанії (один `findMany` інвентарів `select: { characterId, equipped, stash }`).

- [ ] **Step 6: `apply-stash.ts`** — `applyStash(request, campaignId, characterId)`:

```ts
// порядок: доступ → parseBody(stashActionSchema) → loadOwned(character {id, campaignId, controlledBy, status})
// → canStashAction(data.action, { isDM, isOwner: character.controlledBy === userId, pending: character.status === CharacterStatus.PENDING }) інакше 403
return prisma.$transaction(async (tx) => {
  await lockCampaignArtifacts(tx, campaignId);

  const inv = await ensureInventory(tx, characterId);

  const state: StashState = { equipped: inv.equipped as EquippedItems, stash: normalizeStash(inv.stash), items: normalizeItems(inv.items), purse: { gp: inv.gold, sp: inv.silver, cp: inv.copper } };

  let artifactSlotType: string | undefined;

  if (data.action === "equip" || data.action === "grant") {
    const artifact = await tx.artifact.findFirst({ where: { id: data.artifactId, campaignId }, select: { slot: true } });

    if (!artifact) return errorResponse(API_ERRORS.ARTIFACT_NOT_FOUND, 404);

    artifactSlotType = artifact.slot;
  }

  if (data.action === "grant") {
    const all = await tx.characterInventory.findMany({ where: { character: { campaignId } }, select: { characterId: true, equipped: true, stash: true, character: { select: { name: true } } } });
    const holder = findHolder(all.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) })), data.artifactId);

    if (holder) return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${all.find((o) => o.characterId === holder)?.character.name ?? ""}`, 409);
  }

  const result = applyStashAction(state, data, { newItemId: randomUUID(), artifactSlotType });

  if (!result.ok) return errorResponse(STASH_ERROR_TEXT[result.error], 400);

  const saved = await tx.characterInventory.update({
    where: { characterId },
    data: { equipped: result.state.equipped, stash: result.state.stash, items: result.state.items as unknown as Prisma.InputJsonValue, gold: result.state.purse.gp, silver: result.state.purse.sp, copper: result.state.purse.cp },
  });

  await writeInventoryLog(tx, [{ campaignId, characterId, actorUserId: userId, ...result.log }]);

  return NextResponse.json(await buildStashView(tx, campaignId, saved, isDM));
});
```

`STASH_ERROR_TEXT: Record<StashErrorCode, string>` мапить на `API_ERRORS` (`SLOT_EMPTY → ARTIFACT_SLOT_EMPTY`, `UNKNOWN_SLOT → ARTIFACT_UNKNOWN_SLOT`, `NO_SLOT_FOR_ARTIFACT → ARTIFACT_NO_SLOT` тощо). `randomUUID` — з `node:crypto`.

`lib/server/inventory/log.ts`:

```ts
import type { Prisma } from "@prisma/client";

import "server-only";

export type LogInput = { campaignId: string; characterId: string; actorUserId: string; kind: string; delta: Record<string, unknown>; note: string | null };

export const writeInventoryLog = (tx: Prisma.TransactionClient, entries: LogInput[]) =>
  tx.inventoryLog.createMany({ data: entries.map((e) => ({ ...e, delta: e.delta as Prisma.InputJsonValue })) });
```

`route.ts` (GET → `readStash`, POST → `applyStash`) у стилі `artifacts/transfer/route.ts` з `handleApiError`.

- [ ] **Step 7: Журнал.** `log/read-log.ts`: доступ як у GET сховку; `prisma.inventoryLog.findMany({ where: { characterId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: LOG_PAGE_SIZE + 1, ...(cursor && { cursor: { id: cursor }, skip: 1 }) })`; імена акторів — одним `prisma.user.findMany({ where: { id: { in } }, select: PUBLIC_USER_SELECT })`; для `kind` з `artifactId` у `delta` додати `artifactName` (один `artifact.findMany`). Повертає `{ entries, nextCursor }`.

- [ ] **Step 8: Передача.** У `transfer-artifact.ts`: схема `z.object({ toCharacterId: z.string().min(1), slot: z.string().min(1).optional(), artifactId: z.string().min(1).optional() }).refine((d) => !!d.slot !== !!d.artifactId)`; `source = data.slot ? { slot: data.slot } : { artifactId: data.artifactId! }`; передавати `stash: normalizeStash(...)`; оновлювати `from: { equipped: plan.fromEquipped, stash: plan.fromStash }`, `to: { stash: plan.toStash }`; після оновлення `writeInventoryLog(tx, [{…from, kind: ARTIFACT_TRANSFER, delta: { artifactId, toCharacterId }}, {…to, kind: ARTIFACT_TRANSFER, delta: { artifactId, fromCharacterId }}])`. Відправник-`PENDING` для не-DM → 403. Додати `[TransferError.NOT_IN_STASH]: API_ERRORS.ARTIFACT_NOT_IN_STASH` в `ERROR_TEXT`.

- [ ] **Step 9: DM-екіпірування.** У `update-inventory.ts`: `others` вибирати з `stash`, у `held` передавати `stash: normalizeStash(o.stash)`; якщо `equipSlot.artifactId` лежить у власному `stash` — прибрати його звідти в тому ж `upsert` (`stash: normalizeStash(current?.stash).filter((id) => id !== data.equipSlot.artifactId)`). У `ensureInventory` додати `stash: []` у `create`.

- [ ] **Step 10: Перевірка.** `pnpm exec tsc --noEmit -p .` → без помилок; `pnpm test:related lib/utils/artifacts/ownership.ts lib/utils/inventory/stash-actions.ts "app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/transfer-artifact.ts"` → PASS; `pnpm lint --fix` на змінених файлах.

- [ ] **Step 11: Commit.** `git add app lib types && git commit -m "feat(inventory): stash API, inventory log, transfer into stash"`

---

### Task 5: Клієнт — API-обгортки й хуки

**Files:**
- Modify: `lib/api/inventory.ts`, `lib/hooks/characters/keys.ts`, `lib/hooks/characters/index.ts`, `lib/hooks/characters/useTransferArtifact.ts`
- Create: `lib/hooks/characters/useStash.ts`

**Interfaces:**
- Consumes: `StashView`, `StashAction`, `InventoryLogEntry`.
- Produces: `getStash(campaignId, characterId)`, `postStashAction(campaignId, characterId, action)`, `getInventoryLog(campaignId, characterId, cursor?)`; `transferArtifact(campaignId, characterId, body: { toCharacterId: string; slot?: string; artifactId?: string })`; ключі `characterKeys.stash(campaignId, characterId)`, `characterKeys.inventoryLog(campaignId, characterId)`; хуки `useStash(campaignId, characterId, opts?: { enabled?: boolean })`, `useStashAction(campaignId, characterId)` (mutation, `mutateAsync(action)`), `useInventoryLog(campaignId, characterId)` (`useInfiniteQuery`).

- [ ] **Step 1: API.**

```ts
export const getStash = (campaignId: string, characterId: string) => campaignGet<StashView>(campaignId, `/characters/${characterId}/stash`);

export const postStashAction = (campaignId: string, characterId: string, action: StashAction) => campaignPost<StashView>(campaignId, `/characters/${characterId}/stash`, action);

export const getInventoryLog = (campaignId: string, characterId: string, cursor?: string) =>
  campaignGet<{ entries: InventoryLogEntry[]; nextCursor: string | null }>(campaignId, `/characters/${characterId}/stash/log${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
```

(`campaignGet` імпортувати з `@/lib/api/client`; `StashAction` — тип з `@/lib/utils/inventory/stash-actions`.) Тип тіла `transferArtifact` змінити на `{ toCharacterId: string; slot?: string; artifactId?: string }`.

- [ ] **Step 2: Ключі.** У `characterKeys`:

```ts
  stash: (campaignId: string, characterId: string) => ["character-stash", campaignId, characterId] as const,
  stashes: (campaignId: string) => ["character-stash", campaignId] as const,
  inventoryLog: (campaignId: string, characterId: string) => ["inventory-log", campaignId, characterId] as const,
```

- [ ] **Step 3: Хуки** `useStash.ts` (`"use client"`), за зразком `useCharacterSheet`/`useTransferArtifact`:

```ts
export function useStash(campaignId: string, characterId: string, opts?: { enabled?: boolean }) {
  return useQuery({ queryKey: characterKeys.stash(campaignId, characterId), queryFn: () => getStash(campaignId, characterId), enabled: opts?.enabled ?? true });
}

export function useStashAction(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (action: StashAction) => postStashAction(campaignId, characterId, action),
    awaitInvalidation: true,
    invalidateKeys: [characterKeys.stash(campaignId, characterId), characterKeys.inventoryLog(campaignId, characterId), characterKeys.sheet(campaignId, characterId), characterKeys.roster(campaignId)],
  });
}

export function useInventoryLog(campaignId: string, characterId: string) {
  return useInfiniteQuery({
    queryKey: characterKeys.inventoryLog(campaignId, characterId),
    queryFn: ({ pageParam }) => getInventoryLog(campaignId, characterId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
```

`useTransferArtifact`: тип тіла як у Step 1, до `invalidateKeys` додати `characterKeys.stashes(campaignId)` і `["inventory-log", campaignId]`.

Експортувати три хуки з `index.ts`.

- [ ] **Step 4: Перевірка й commit.** `pnpm exec tsc --noEmit -p .`; `git commit -am "feat(inventory): stash client api and hooks"` (+ `git add lib/hooks/characters/useStash.ts`).

---

### Task 6: UI — вкладка «Підсумок»

**Files:**
- Create: `components/character-profile/stash/StashTab.tsx`, `PursePanel.tsx`, `MoneyDialog.tsx`, `StashArtifactsPanel.tsx`, `GrantArtifactDialog.tsx`, `SpecialItemsPanel.tsx`, `ItemDialog.tsx`, `InventoryLogPanel.tsx`, `describe-log.ts`, `__tests__/describe-log.test.ts`
- Modify: `components/character-profile/CharacterProfile.tsx`, `ProfileTabs.tsx` (`ProfileTabId` + `"stash"`), `ItemsTab.tsx`, `TransferArtifactDialog.tsx`

**Interfaces:**
- Consumes: `useProfile()` (`campaignId`, `characterId`, `sheet.viewer.{isDM,isOwner}`, `sheet.review` з Task 7), `useStash`, `useStashAction`, `useInventoryLog`, `useTransferArtifact`, `formatCoins`, `COIN_LABEL`.
- Produces: `describeLog(entry: InventoryLogEntry): string`.

- [ ] **Step 1: Тест `describeLog` (падає).**

```ts
import { describe, expect, it } from "vitest";

import { describeLog } from "@/components/character-profile/stash/describe-log";

const e = (kind: string, delta: Record<string, unknown>, note: string | null = null) => ({ id: "1", kind, delta, note, createdAt: "2026-10-22T10:00:00Z", actor: { id: "u", displayName: "Зехір" } }) as never;

describe("describeLog", () => {
  it("money", () => expect(describeLog(e("money_spend", { gp: -50, sp: 0, cp: 0 }, "найм човна"))).toBe("−50 зм — найм човна"));
  it("item use", () => expect(describeLog(e("item_use", { item: "Зілля", qty: -1 }))).toBe("використано: Зілля"));
  it("artifact", () => expect(describeLog(e("artifact_stash", { artifactId: "a", artifactName: "Меч" }))).toBe("знято в підсумок: Меч"));
});
```

- [ ] **Step 2: `describe-log.ts`.**

```ts
import { formatCoins } from "@/lib/utils/inventory/money";
import type { InventoryLogEntry, Purse } from "@/types/inventory";

const ARTIFACT_VERB: Record<string, string> = {
  artifact_stash: "знято в підсумок",
  artifact_equip: "вдягнено",
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
```

Run `pnpm test:run components/character-profile/stash` → PASS.

- [ ] **Step 3: Компоненти** (усі `"use client"`, `HudPanel`/`HudTile` з `@/components/hud/page`, `QueryState`/`EmptyState` з `@/components/common/states`, `ResponsiveDialog hud` з футер-кнопкою `form="<id>"`):
  - `StashTab`: `const { campaignId, characterId, sheet } = useProfile()`; якщо `sheet.review?.pending` → `EmptyState title="Підсумок з'явиться після схвалення персонажа"`; інакше `QueryState query={useStash(...)}` → `PursePanel`, `StashArtifactsPanel`, `SpecialItemsPanel`, `InventoryLogPanel`. `canAct = sheet.viewer.isDM || sheet.viewer.isOwner`; `isDM = sheet.viewer.isDM`.
  - `PursePanel`: три числа з `COIN_LABEL`; кнопки «Витратити» / «Отримати» (`canAct`), «Задати суму» (`isDM`) → `MoneyDialog` з `mode: "spend" | "gain" | "set"`.
  - `MoneyDialog`: форма (сума `type="number" min=1 step=1`, `select` монети, поле «На що» — `required` для `spend`); `mode="set"` — три поля. Сабміт → `action.mutateAsync({...})`, помилка → `notify(e.message)`; підказка під формою не потрібна.
  - `StashArtifactsPanel`: `HudTile` на кожен `view.artifacts` (іконка `EntityIcon`, назва, `artifactSlotLabel(slot)`, колір рідкості `ARTIFACT_RARITY_COLOR`); дії: «Вдягнути» (сховати, якщо `slot === ArtifactSlot.ITEM`) → `{action:"equip", artifactId}`; «Передати» → `TransferArtifactDialog` з `source={{ artifactId }}`; «Забрати» (DM) → `confirm` → `{action:"revoke"}`. Під списком підказка «Зміни під час бою діють з наступного бою». DM: кнопка «Видати артефакт» → `GrantArtifactDialog` (список `view.freeArtifacts`, клік → `{action:"grant"}`).
  - `SpecialItemsPanel`: список (назва, `×quantity`, опис, бейдж «одноразова»); «Використати» (лише `consumable`) → `{action:"useItem"}`; «Редагувати» → `ItemDialog`; «Видалити» → `confirm` → `{action:"removeItem"}`; «Додати річ» → `ItemDialog`.
  - `ItemDialog`: назва, опис (`textarea`), кількість, чекбокс «Одноразова»; `addItem` або `editItem`.
  - `InventoryLogPanel`: `useInventoryLog`; рядки `дата (toLocaleDateString("uk-UA")) · actor.displayName · describeLog(entry)`; «Показати ще» якщо `hasNextPage`.
- [ ] **Step 4: Підключення.** `ProfileTabId` + `"stash"`; у `CharacterProfile` `VIEW_TABS` = `["combat","skills","magic","items","stash","story"]` і рядок `{ id: "stash", label: "Підсумок", content: <StashTab /> }` після «Речі». `TransferArtifactDialog`: проп `artifact: { name: string; slot: string; id: string } | null` + `source: { slot: string } | { artifactId: string }`; прибрати «обмін на …» (тепер у сховок), рядок під іменем: «у підсумок». `ItemsTab`: у футері діалогу артефакту поруч із «Передати» кнопка «Зняти в підсумок» (`sheet.viewer.isDM || sheet.viewer.isOwner`) → `useStashAction(...).mutateAsync({ action: "stash", slot: shown.slot })`; «Передати» передає `source={{ slot: shown.slot }}`. Перевірити, що `SheetArtifact.slot` — ключ клітинки сітки (`grep -n "slot" lib/utils/characters/sheet/build-sheet.ts`); якщо там тип слота, додати поле `cell` у `SheetArtifact` і використовувати його.
- [ ] **Step 5: Перевірка.** `pnpm exec tsc --noEmit -p .`, `pnpm lint --fix`, `pnpm test:related components/character-profile/ItemsTab.tsx components/character-profile/TransferArtifactDialog.tsx`.
- [ ] **Step 6: Commit.** `git add components && git commit -m "feat(profile): stash tab — purse, artifacts, special items, log"`

---

### Task 7: Статус чернетки — фільтри й поле в sheet

**Files:**
- Modify: `app/api/campaigns/[id]/characters/list-characters.ts`, `…/characters/roster/read-roster.ts`, `…/battles/balance/character-stats.ts`, `…/battles/[battleId]/start/start-battle-handler.ts`, `lib/ai/tools/party.ts`, `app/campaigns/[id]/character/page.tsx` (`findFirst` без змін — бачить і `PENDING`), `lib/utils/characters/sheet/build-sheet.ts`, `app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet.ts`, `types/characters.ts`, `lib/api/characters.ts`, `lib/hooks/characters/useCharacters.ts`
- Test: `lib/utils/characters/sheet/__tests__/` (наявний тест build-sheet) + `app/api/campaigns/[id]/characters/__tests__/list-characters.test.ts` (створити, якщо немає; мок `prisma` як у сусідніх тестах маршрутів)

**Interfaces:**
- Consumes: `ACTIVE_CHARACTER`, `CharacterStatus`.
- Produces: `CharacterSheet.review: { pending: boolean; note: string | null }`; `GET /characters?status=pending` (лише DM; повертає `LIST_SELECT` + `reviewNote`), за замовчуванням список лише `ACTIVE`; `getCharacters(campaignId, { status: "pending" })` і `useCharacters(campaignId, { status: "pending" })` з ключем `characterKeys.list(campaignId, "pending", false)`.

- [ ] **Step 1: Тести (падають).** `list-characters`: без параметра → `findMany` викликано з `where` що містить `status: "active"`; `?status=pending` від гравця → 403; від DM → `status: "pending"`. `build-sheet`: `review` = `{ pending: true, note: "додай ціль" }` для `status: "pending"`, `{ pending: false, note: null }` для активного.
- [ ] **Step 2: Реалізація.**
  - `list-characters.ts`: `const pending = searchParams.get("status") === CharacterStatus.PENDING; if (pending && !accessResult.isDM) return errorResponse(API_ERRORS.FORBIDDEN, 403); where.status = pending ? CharacterStatus.PENDING : CharacterStatus.ACTIVE;` (тип `where` розширити), до select для pending — `reviewNote: true`.
  - `read-roster.ts`, `character-stats.ts`: `where: { campaignId, ...ACTIVE_CHARACTER, … }`.
  - `start-battle-handler.ts`: `where: { id: { in: charIds }, ...ACTIVE_CHARACTER }` (чернетка, що якось потрапила в бій, мовчки відкидається).
  - `party.ts`: обидва запити + `...ACTIVE_CHARACTER`.
  - `build-sheet.ts`: `review: { pending: c.status === CharacterStatus.PENDING, note: c.status === CharacterStatus.PENDING ? (c.reviewNote ?? null) : null }`; додати поля до select у `read-sheet.ts`; тип у `CharacterSheet`.
  - `lib/api/characters.ts`/`useCharacters`: опція `status?: "pending"` → `?status=pending`; ключ `characterKeys.list(campaignId, opts?.status ?? opts?.type ?? "all", !!opts?.compact)`.
- [ ] **Step 3:** `pnpm test:related` по змінених файлах → PASS; `pnpm exec tsc --noEmit -p .`.
- [ ] **Step 4: Commit.** `git commit -am "feat(characters): pending drafts excluded from battle, balance, roster, AI"`

---

### Task 8: Генератор і валідатор характеристик

**Files:**
- Create: `lib/utils/characters/generate/rng.ts`, `abilities.ts`, `names.ts`, `backstory.ts`, `generate-character.ts`, `index.ts`, `__tests__/abilities.test.ts`, `__tests__/generate-character.test.ts`

**Interfaces:**
- Consumes: `ABILITY_KEYS` (`@/lib/constants/abilities`), `HERO_ARCHETYPE_KEYS`, `heroArchetype`, `GoalKind`, `GoalStatus`, `GoalAuthor`.
- Produces:
  - `createRng(seed: number): () => number` (mulberry32), `pick<T>(rng, list: readonly T[]): T`
  - `STANDARD_ARRAY = [15,14,13,12,10,8] as const`, `POINT_BUY_BUDGET = 27`, `POINT_BUY_COST: Record<number, number>`, `type AbilityMethod = "standard" | "pointBuy"`, `type AbilityScores = Record<AbilityKey, number>`
  - `validateAbilityScores(scores: AbilityScores, method: AbilityMethod): boolean`, `pointBuySpent(scores): number`
  - `ARCHETYPE_PRIMARY: Record<HeroArchetypeKey, AbilityKey[]>` (порядок пріоритету), `ARCHETYPE_CLASS: Record<HeroArchetypeKey, string>`
  - `assignStandardArray(archetype: HeroArchetypeKey, rng): AbilityScores`
  - `generateName(raceName: string, rng): string`
  - `generateBackstory(input: { name; raceName; archetype: HeroArchetypeKey }, rng): { background: string; goals: Array<{ text: string; kind: GoalKind }> }`
  - `generateCharacter(input: { races: string[]; seed: number }): GeneratedCharacter` де `GeneratedCharacter = { name; race; archetype: HeroArchetypeKey; class: string; alignment: string; method: "standard"; scores: AbilityScores; primaryAbility: AbilityKey; background: string; goals: Array<{ text; kind }> }`

- [ ] **Step 1: Тести (падають).**

```ts
// abilities.test.ts
import { describe, expect, it } from "vitest";

import { assignStandardArray, createRng, pointBuySpent, validateAbilityScores } from "@/lib/utils/characters/generate";

const s = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({ strength: str, dexterity: dex, constitution: con, intelligence: int, wisdom: wis, charisma: cha });

describe("validateAbilityScores", () => {
  it("standard array in any order", () => {
    expect(validateAbilityScores(s(8, 10, 12, 13, 14, 15), "standard")).toBe(true);
    expect(validateAbilityScores(s(15, 15, 13, 12, 10, 8), "standard")).toBe(false);
  });

  it("point buy within 27 and 8..15", () => {
    expect(validateAbilityScores(s(15, 15, 15, 8, 8, 8), "pointBuy")).toBe(true);
    expect(pointBuySpent(s(15, 15, 15, 8, 8, 8))).toBe(27);
    expect(validateAbilityScores(s(15, 15, 15, 9, 8, 8), "pointBuy")).toBe(false);
    expect(validateAbilityScores(s(16, 8, 8, 8, 8, 8), "pointBuy")).toBe(false);
    expect(validateAbilityScores(s(18, 18, 18, 18, 18, 18), "pointBuy")).toBe(false);
  });
});

describe("assignStandardArray", () => {
  it("puts 15 on the archetype's primary ability", () => {
    const mage = assignStandardArray("mage", createRng(1));

    expect(mage.intelligence).toBe(15);
    expect(validateAbilityScores(mage, "standard")).toBe(true);
  });
});
```

```ts
// generate-character.test.ts
import { describe, expect, it } from "vitest";

import { generateCharacter, validateAbilityScores } from "@/lib/utils/characters/generate";

describe("generateCharacter", () => {
  it("is deterministic for a seed", () => {
    expect(generateCharacter({ races: ["Люди", "Ельфи"], seed: 42 })).toEqual(generateCharacter({ races: ["Люди", "Ельфи"], seed: 42 }));
  });

  it("uses a campaign race and valid scores", () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = generateCharacter({ races: ["Орки"], seed });

      expect(c.race).toBe("Орки");
      expect(validateAbilityScores(c.scores, "standard")).toBe(true);
      expect(c.name.length).toBeGreaterThan(1);
      expect(c.background.length).toBeGreaterThan(20);
      expect(c.goals.length).toBeGreaterThan(0);
    }
  });

  it("works with no campaign races", () => {
    expect(generateCharacter({ races: [], seed: 1 }).race).toBe("");
  });
});
```

- [ ] **Step 2: Реалізація.**
  - `rng.ts`:

```ts
export function createRng(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rng: () => number, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

export const shuffle = <T>(rng: () => number, list: readonly T[]): T[] => {
  const out = [...list];

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
};
```

  - `abilities.ts`:

```ts
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { HeroArchetypeKey } from "@/lib/constants/hero-archetypes";

import { shuffle } from "./rng";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_BUDGET = 27;

export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export type AbilityMethod = "standard" | "pointBuy";

export type AbilityScores = Record<AbilityKey, number>;

export const ARCHETYPE_PRIMARY: Record<HeroArchetypeKey, AbilityKey[]> = {
  warrior: ["strength", "constitution"],
  paladin: ["strength", "charisma", "constitution"],
  ranger: ["dexterity", "wisdom"],
  rogue: ["dexterity", "intelligence"],
  mage: ["intelligence", "wisdom"],
};

export const ARCHETYPE_CLASS: Record<HeroArchetypeKey, string> = { warrior: "Воїн", paladin: "Паладин", ranger: "Слідопит", rogue: "Розбійник", mage: "Маг" };

export const pointBuySpent = (scores: AbilityScores) => ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COST[scores[k]] ?? Infinity), 0);

export function validateAbilityScores(scores: AbilityScores, method: AbilityMethod): boolean {
  const values = ABILITY_KEYS.map((k) => scores[k]);

  if (values.some((v) => !Number.isInteger(v))) return false;

  if (method === "standard") return [...values].sort((a, b) => b - a).every((v, i) => v === STANDARD_ARRAY[i]);

  return values.every((v) => v >= 8 && v <= 15) && pointBuySpent(scores) <= POINT_BUY_BUDGET;
}

export function assignStandardArray(archetype: HeroArchetypeKey, rng: () => number): AbilityScores {
  const primary = ARCHETYPE_PRIMARY[archetype];
  const order = [...primary, ...shuffle(rng, ABILITY_KEYS.filter((k) => !primary.includes(k)))];

  return Object.fromEntries(order.map((k, i) => [k, STANDARD_ARRAY[i]])) as AbilityScores;
}
```

(Перевірити, що `ABILITY_KEYS` у `@/lib/constants/abilities` — це `strength…charisma`; якщо там скорочення — підлаштувати ключі під поля `Character`.)

  - `names.ts`: таблиці складів `{ match: RegExp; first: string[]; second: string[] }[]` для `/орк/i`, `/ельф|ельв/i`, `/гном|дварф/i`, `/нежит|некро/i`, `/демон|інферн/i`, `/люд|лицар|орден/i`, і `GENERIC`; `generateName(raceName, rng)` = `pick(first) + pick(second)` з першої таблиці, чий `match` проходить (інакше `GENERIC`), перша літера велика. Мінімум 6×6 складів у кожній таблиці, українською (напр. орки: `["Гра","Ур","Тор","Маг","Зуг","Кра"]` × `["ш","ак","гол","руг","нар","зог"]`).
  - `backstory.ts`: масиви шаблонів (≥ 4 на кожну частину): `ORIGIN` (`"${name} народився серед народу ${race}…"`), `TURN` (подія, що змінила життя, залежна від архетипу — `Record<HeroArchetypeKey, string[]>`), `DRIVE`; `background = [origin, turn, drive].join(" ")`; `goals = [{ kind: GoalKind.MAIN, text: pick(MAIN_GOALS) }, { kind: GoalKind.PERSONAL, text: pick(PERSONAL_GOALS) }]`. Якщо `raceName` порожня — «у далеких землях».
  - `generate-character.ts`:

```ts
export function generateCharacter({ races, seed }: { races: string[]; seed: number }): GeneratedCharacter {
  const rng = createRng(seed);
  const race = races.length ? pick(rng, races) : "";
  const archetype = pick(rng, HERO_ARCHETYPE_KEYS);
  const name = generateName(race, rng);
  const scores = assignStandardArray(archetype, rng);
  const story = generateBackstory({ name, raceName: race, archetype }, rng);

  return { name, race, archetype, class: ARCHETYPE_CLASS[archetype], alignment: pick(rng, ALIGNMENTS), method: "standard", scores, primaryAbility: ARCHETYPE_PRIMARY[archetype][0], ...story };
}
```

(`ALIGNMENTS` — значення з наявної константи світоглядів у `lib/constants/` — знайти `grep -rn "Законно-добрий\|ALIGNMENT" lib/constants`.)

  - `index.ts` реекспортує все вище.
- [ ] **Step 3:** `pnpm test:run lib/utils/characters/generate` → PASS.
- [ ] **Step 4: Commit.** `git add lib/utils/characters/generate && git commit -m "feat(characters): character generator and ability score validation"`

---

### Task 9: API чернетки й схвалення

**Files:**
- Create: `app/api/campaigns/[id]/characters/draft/route.ts`, `…/draft/draft-schema.ts`, `…/draft/create-draft.ts`, `…/draft/draft-rules.ts`, `…/draft/__tests__/draft-rules.test.ts`
- Create: `app/api/campaigns/[id]/characters/[characterId]/draft/route.ts`, `…/[characterId]/draft/update-draft.ts`
- Create: `app/api/campaigns/[id]/characters/[characterId]/review/route.ts`, `…/review/review-character.ts`
- Create: `app/api/campaigns/[id]/characters/derive-character-defaults.ts` (спільна з `create-character.ts`)
- Modify: `app/api/campaigns/[id]/characters/create-character.ts`, `lib/constants/api-errors.ts`

**Interfaces:**
- Consumes: `validateAbilityScores`, `AbilityMethod`, `CharacterStatus`, `CampaignRole`, `fullSpellSlots`, `resolveAvatarForPersistence`, `requireCampaignAccess`, `requireDM`.
- Produces:
  - `deriveCharacterDefaults(campaignId: string, input: { level: number; race: string; spellSlots?: Record<string, { max: number; current: number }> }): Promise<{ spellSlots: Record<string, { max: number; current: number }> }>` (логіка з `create-character.ts` рядки зі `spellSlots`), і `createEmptyInventory(characterId)` дані.
  - `draftSchema` (Zod): `{ name (1..100), race (1..), class (1..100), archetype: enum HERO_ARCHETYPE_KEYS, alignment?, background? (≤4000), avatar?, method: enum ["standard","pointBuy"], strength…charisma (int), primaryAbility?: enum ABILITY_KEYS, goals?: array({ text 1..500, kind enum GoalKind }) max 5 }`; `DraftInput`.
  - `draftRejection(input: { role: string; existing: number; method; scores }): string | null` — текст помилки або null.
  - `POST /characters/draft` → `Character`; `PATCH /characters/:cid/draft` → `Character`; `POST /characters/:cid/review` body `{ action: "approve" } | { action: "return"; note: string }` → `{ id, status, reviewNote }`.

- [ ] **Step 1: Тест правил (падає).**

```ts
import { describe, expect, it } from "vitest";

import { draftRejection } from "../draft-rules";

const scores = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };

describe("draftRejection", () => {
  it("accepts a player without a character", () => {
    expect(draftRejection({ role: "player", existing: 0, method: "standard", scores })).toBeNull();
  });

  it("rejects DM, second character and invented scores", () => {
    expect(draftRejection({ role: "dm", existing: 0, method: "standard", scores })).toMatch(/гравц/i);
    expect(draftRejection({ role: "player", existing: 1, method: "standard", scores })).toMatch(/вже є/i);
    expect(draftRejection({ role: "player", existing: 0, method: "pointBuy", scores: { ...scores, strength: 18 } })).toMatch(/характеристик/i);
  });
});
```

- [ ] **Step 2: Реалізація.** `API_ERRORS`:

```ts
  DRAFT_PLAYERS_ONLY: "Створити персонажа може лише гравець кампанії",
  DRAFT_ALREADY_EXISTS: "У вас уже є персонаж у цій кампанії",
  DRAFT_INVALID_SCORES: "Характеристики мають відповідати стандартному масиву або point-buy (27)",
  DRAFT_NOT_PENDING: "Персонаж уже схвалений — редагує DM",
```

`draft-rules.ts`:

```ts
export function draftRejection({ role, existing, method, scores }: { role: string; existing: number; method: AbilityMethod; scores: AbilityScores }): string | null {
  if (role !== CampaignRole.PLAYER) return API_ERRORS.DRAFT_PLAYERS_ONLY;

  if (existing > 0) return API_ERRORS.DRAFT_ALREADY_EXISTS;

  if (!validateAbilityScores(scores, method)) return API_ERRORS.DRAFT_INVALID_SCORES;

  return null;
}
```

`create-draft.ts`: `requireCampaignAccess` → `parseBody(draftSchema)` → `role = access.campaign.members.find((m) => m.userId === access.userId)?.role ?? ""`; `existing = await prisma.character.count({ where: { campaignId, controlledBy: userId, type: CharacterType.PLAYER } })`; `draftRejection(...)` → 400; аватар через `resolveAvatarForPersistence`; `deriveCharacterDefaults` → `prisma.$transaction`: `character.create({ data: { campaignId, type: PLAYER, status: PENDING, controlledBy: userId, level: 1, name, race, class, archetype, alignment, background, avatar, strength…charisma, primaryAbility, spellSlots, goals: goals.map((g) => ({ id: randomUUID(), text: g.text, kind: g.kind, status: GoalStatus.ACTIVE, author: GoalAuthor.PLAYER })), skillTreeProgress: {} } })` + `characterInventory.create(... stash: [] ...)`. Решта полів — дефолти схеми (КБ 10, ініціатива 0, швидкість 30 — DM правит при схваленні).

`update-draft.ts` (PATCH): доступ; персонаж `loadOwned`; `controlledBy !== userId` → 403; `status !== PENDING` → 400 `DRAFT_NOT_PENDING`; той самий `draftSchema` + `validateAbilityScores`; `update` тих самих полів, `reviewNote` не чіпати.

`review-character.ts`: `requireDM`; `loadOwned`; схема `z.discriminatedUnion("action", [z.object({ action: z.literal("approve") }), z.object({ action: z.literal("return"), note: z.string().trim().min(1).max(1000) })])`; approve → `{ status: ACTIVE, reviewNote: null }`; return → `{ reviewNote: note }` (статус лишається). Не-`PENDING` + `return` → 400.

`derive-character-defaults.ts` — винести блок `spellSlots` з `create-character.ts` і викликати з обох місць (поведінка `create-character` не змінюється).

Route-файли — тонкі, як `characters/route.ts`.

- [ ] **Step 3:** `pnpm test:run "app/api/campaigns/[id]/characters"` → PASS; `pnpm exec tsc --noEmit -p .`.
- [ ] **Step 4: Commit.** `git add app lib && git commit -m "feat(characters): player drafts and DM review API"`

---

### Task 10: AI — «Оживити передісторію»

**Files:**
- Create: `app/api/campaigns/[id]/characters/draft/backstory/route.ts`, `…/backstory/generate-backstory.ts`
- Create: `lib/ai/dm-model.ts`
- Modify: `lib/constants/api-errors.ts`

**Interfaces:**
- Consumes: `loadApiKey`, `AiKeyUnreadableError` (`lib/ai/credentials`), `createModel` (`lib/ai/providers`), `AI_PROVIDERS`, `AI_MODELS`, `aiErrorMessage` (`lib/ai/errors`), `CampaignRole`, `generateObject` з `ai`.
- Produces: `pickDmTextModel(campaignId: string): Promise<LanguageModel | null>`; `GET /characters/draft/backstory` → `{ available: boolean }`; `POST /characters/draft/backstory` body `{ name; race; archetype; class; background? }` → `{ background: string; goals: Array<{ text: string; kind: GoalKind }> }`.

- [ ] **Step 1: `lib/ai/dm-model.ts`.**

```ts
import "server-only";

import type { LanguageModel } from "ai";

import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { createModel } from "@/lib/ai/providers";
import { AI_MODELS, AI_PROVIDERS } from "@/lib/constants/ai";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

// ключі належать користувачам; для гравця використовуємо ключ DM кампанії (fast-модель)
export async function pickDmTextModel(campaignId: string): Promise<LanguageModel | null> {
  const dm = await prisma.campaignMember.findFirst({ where: { campaignId, role: CampaignRole.DM }, select: { userId: true } });

  if (!dm) return null;

  for (const provider of AI_PROVIDERS) {
    try {
      const key = await loadApiKey(dm.userId, provider);
      const model = AI_MODELS[provider].find((m) => m.tier === "fast");

      if (key && model) return createModel(provider, key, model.id);
    } catch (error) {
      if (!(error instanceof AiKeyUnreadableError)) throw error;
    }
  }

  return null;
}
```

(Перевірити імпорт `CampaignRole` — файл, де він оголошений: `grep -rn "export const CampaignRole" lib/constants`.)

- [ ] **Step 2: `generate-backstory.ts`.** GET: `requireCampaignAccess` → `{ available: !!(await pickDmTextModel(campaignId)) }`. POST: `requireCampaignAccess`; Zod `{ name 1..100, race ≤100, archetype enum, class ≤100, background? ≤4000 }`; модель `null` → 400 `AI_NOT_CONFIGURED_FOR_PLAYERS` («DM кампанії ще не підключив AI»); 

```ts
const { object } = await generateObject({
  model,
  schema: z.object({ background: z.string().max(2500), goals: z.array(z.object({ text: z.string().max(300), kind: z.enum([GoalKind.MAIN, GoalKind.PERSONAL, GoalKind.INNER, GoalKind.SECRET]) })).min(1).max(3) }),
  prompt: [
    "Ти допомагаєш гравцю D&D-кампанії у світі Heroes of Might and Magic V.",
    `Напиши українською передісторію (3–5 речень, без механіки й чисел) і 2–3 цілі для героя: ${data.name}, раса «${data.race}», клас «${data.class}», архетип «${heroArchetype(data.archetype).name}».`,
    data.background ? `Збережи суть чернетки гравця: ${data.background}` : "",
  ].join("\n"),
});
```

помилки провайдера → `errorResponse(aiErrorMessage(error), 502)` (ніколи не логувати ключ/запит з ключем).

- [ ] **Step 3:** `pnpm exec tsc --noEmit -p .`, `pnpm test:related lib/ai/dm-model.ts`.
- [ ] **Step 4: Commit.** `git add app lib && git commit -m "feat(characters): AI backstory for player drafts via DM key"`

---

### Task 11: UI гравця — порожній стан, форма, генерація, чернетка

**Files:**
- Create: `app/campaigns/[id]/character/new/page.tsx`, `app/campaigns/[id]/character/draft/page.tsx`
- Create: `components/characters/player-draft/PlayerDraftForm.tsx`, `AbilityScoresPicker.tsx`, `DraftBanner.tsx`, `NoCharacterState.tsx`
- Create: `lib/hooks/characters/usePlayerDraftForm.ts`, `lib/hooks/characters/__tests__/usePlayerDraftForm.test.ts`
- Modify: `lib/api/characters.ts`, `lib/hooks/characters/index.ts`, `app/campaigns/[id]/character/page.tsx`, `components/character-profile/CharacterProfile.tsx`

**Interfaces:**
- Consumes: `generateCharacter`, `validateAbilityScores`, `pointBuySpent`, `STANDARD_ARRAY`, `POINT_BUY_BUDGET`, `DraftInput`, `useRaces`, `HudFormPage`/`HudForm`/`HudSection`, `CharacterSheet.review`.
- Produces: `createDraft(campaignId, body: DraftInput)`, `updateDraft(campaignId, characterId, body: DraftInput)`, `getBackstoryAvailability(campaignId)`, `generateBackstory(campaignId, body)`; хук `usePlayerDraftForm({ campaignId, characterId?, initial? })` → `{ form: { values, set, setScore, method, setMethod }, generate: { all(), name(), scores(), backstory() }, ai: { available, run(), isPending }, submit: { run(), isPending, error }, scoreStatus: { valid: boolean; spent?: number } }`.

- [ ] **Step 1: Тест хука (падає)** (`// @vitest-environment happy-dom`, `renderHook` з обгорткою `QueryClientProvider`, моки `@/lib/api/characters` і `@/lib/hooks/races`): `generate.all()` заповнює `name`, `race` з переданих рас, `method === "standard"`, `scoreStatus.valid === true`; `setMethod("pointBuy")` скидає всі характеристики на 8, `scoreStatus.spent === 0`; `setScore("strength", 16)` у pointBuy → `valid === false`.
- [ ] **Step 2: API-обгортки** в `lib/api/characters.ts`:

```ts
export const createDraft = (campaignId: string, body: DraftInput) => campaignPost<Character>(campaignId, "/characters/draft", body);

export const updateDraft = (campaignId: string, characterId: string, body: DraftInput) => campaignPatch<Character>(campaignId, `/characters/${characterId}/draft`, body);

export const getBackstoryAvailability = (campaignId: string) => campaignGet<{ available: boolean }>(campaignId, "/characters/draft/backstory");

export const generateBackstory = (campaignId: string, body: { name: string; race: string; archetype: string; class: string; background?: string }) =>
  campaignPost<{ background: string; goals: Array<{ text: string; kind: GoalKind }> }>(campaignId, "/characters/draft/backstory", body);
```

(`DraftInput` винести типом у `types/characters.ts`, щоб клієнт не імпортував з `app/api`; `draftSchema` — `satisfies z.ZodType<DraftInput>`.)

- [ ] **Step 3: Хук `usePlayerDraftForm`.** Стан `values: DraftInput`; `seed` = `Date.now()` на кожен виклик генерації; `generate.all()` = `generateCharacter({ races: races.map((r) => r.name), seed })` → у `values`; `generate.name()/scores()/backstory()` — та сама генерація з новим seed, але копіюється лише відповідне поле; `ai.available` з `useQuery(["draft-backstory-available", campaignId], getBackstoryAvailability)`; `ai.run()` → `generateBackstory` → `background` і `goals`; `submit.run()` → `createDraft` або `updateDraft`, `onSuccess` → інвалідація `characterKeys.sheet(campaignId)` і `router.push(`/campaigns/${campaignId}/character`)`; `scoreStatus` через `validateAbilityScores`/`pointBuySpent`. Якщо `?generate=1` (передається як `initial: "generate"`) — `generate.all()` один раз після завантаження рас (`useEffect` з guard-ref).
- [ ] **Step 4: Компоненти.**
  - `NoCharacterState`: `HudPage` + `EmptyState title="У вас поки немає персонажа в цій кампанії"` з `action`-слотом (перевірити API `EmptyState`) — дві кнопки-посилання: «Створити персонажа» → `/campaigns/${id}/character/new`, «🎲 Згенерувати» → `/campaigns/${id}/character/new?generate=1`.
  - `AbilityScoresPicker`: перемикач `HudChipTabs` «Стандартний масив» / «Point-buy (27)»; для standard — шість `select` зі значеннями `STANDARD_ARRAY` (кожне значення можна обрати лише раз — вже обрані `disabled`); для pointBuy — шість степперів 8–15 і лічильник «Витрачено N / 27»; червоний текст, якщо `!scoreStatus.valid`.
  - `PlayerDraftForm`: `HudFormPage` (заголовок «Новий персонаж» / «Чернетка персонажа») + `HudForm id="player-draft"`; секції `HudSection`: «Основне» (ім'я, аватар — перевикористати поле аватара з `components/characters/basic/CharacterBasicInfo.tsx`, якщо воно винесене окремим компонентом, інакше `input` URL; раса `select` з `useRaces`; клас `input`; архетип `select` з `HERO_ARCHETYPE_OPTIONS` без «Універсал»; світогляд), «Характеристики» (`AbilityScoresPicker`), «Історія» (`textarea` передісторії, список цілей з видаленням). Кнопки: «🎲 Згенерувати ще раз» (меню: усе / ім'я / характеристики / передісторія), «✨ Оживити передісторію (AI)» (лише `ai.available`), `ActionBar` з «Відправити DM» (`type="submit" form="player-draft"`, `disabled={!scoreStatus.valid || submit.isPending}`).
  - `DraftBanner`: `HudPanel` «На розгляді в DM» + `review.note` (якщо є, як «Коментар DM: …») + кнопка «Редагувати чернетку» → `/campaigns/${id}/character/draft` (лише власнику).
- [ ] **Step 5: Сторінки.**
  - `character/page.tsx`: замість `EmptyState` → `<NoCharacterState campaignId={id} canCreate={!isDM} />` (DM бачить старий текст без кнопок).
  - `character/new/page.tsx`: `requireCampaignMember`; якщо вже є персонаж (`findFirst` як у `page.tsx`) → `redirect(`/campaigns/${id}/character`)`; DM → `redirect` на `/campaigns/${id}/dm/characters/new?type=player`; інакше `<PlayerDraftForm campaignId={id} initial={searchParams.generate === "1" ? "generate" : undefined} />`.
  - `character/draft/page.tsx`: персонаж гравця `status = pending` (інакше `redirect` на профіль); дані для форми — `prisma.character.findFirst(... select: name, race, class, archetype, alignment, background, avatar, strength…charisma, primaryAbility, goals)` → `initial` (`method` визначити: `validateAbilityScores(scores, "standard") ? "standard" : "pointBuy"`).
  - `CharacterProfile`: якщо `sheet.review.pending` — `DraftBanner` над `ProfileTabs`.
- [ ] **Step 6:** `pnpm test:related lib/hooks/characters/usePlayerDraftForm.ts`, `pnpm exec tsc --noEmit -p .`, `pnpm lint --fix`.
- [ ] **Step 7: Commit.** `git add app components lib types && git commit -m "feat(characters): player creates or generates a character draft"`

---

### Task 12: UI DM — черга схвалення

**Files:**
- Create: `components/characters/review/PendingDraftsPanel.tsx`, `components/characters/review/ReviewActions.tsx`, `lib/hooks/characters/useReviewCharacter.ts`
- Modify: `app/campaigns/[id]/dm/characters/page-client.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/page.tsx` (або його client-компонент — знайти, де рендериться заголовок редактора), `app/campaigns/[id]/page.tsx` (лічильник на плитці DM «Персонажі»), `lib/api/characters.ts`, `lib/hooks/characters/index.ts`

**Interfaces:**
- Consumes: `useCharacters(campaignId, { status: "pending" })`, `POST …/review`.
- Produces: `reviewCharacter(campaignId, characterId, body: { action: "approve" } | { action: "return"; note: string })`; `useReviewCharacter(campaignId, characterId)` → `{ approve(): Promise<void>; returnWithNote(note: string): Promise<void>; isPending }` (інвалідація `characterWriteKeys(campaignId)` + `characterKeys.sheet(campaignId, characterId)` + `characterKeys.list(campaignId, "pending", false)`).

- [ ] **Step 1: API + хук** за зразком `useTransferArtifact` (`useCrudMutation`).
- [ ] **Step 2: `PendingDraftsPanel`** — `HudPanel title="Очікують схвалення"`, рендериться лише якщо `data.length > 0`; рядки `HudCard`: аватар, ім'я, раса · клас, `user.displayName`, `reviewNote` (якщо повернуто — «повернуто з коментарем»); клік → `/campaigns/${id}/dm/characters/${c.id}`. Вставити першим блоком у `dm/characters/page-client.tsx`.
- [ ] **Step 3: `ReviewActions`** — у DM-редакторі персонажа, якщо `character.status === "pending"`: `HudPanel` «Чернетка гравця» з кнопками «Схвалити» (`confirm` → `approve`, `notify("Персонажа схвалено")`) і «Повернути з коментарем» (`ResponsiveDialog hud` з `textarea`, `required`); «Видалити» — наявна дія видалення. Поле `status` додати у відповідь `read-character.ts` (воно вже є в `findUnique` без `select` — перевірити тип клієнта `Character` у `types/characters.ts` і додати `status`/`reviewNote`).
- [ ] **Step 4: Лічильник.** На головній сторінці кампанії (`app/campaigns/[id]/page.tsx`), для DM: `prisma.character.count({ where: { campaignId: id, status: CharacterStatus.PENDING } })` у наявному `Promise.all` (якщо є) і бейдж «N на схваленні» на плитці «Персонажі».
- [ ] **Step 5:** `pnpm exec tsc --noEmit -p .`, `pnpm lint --fix`, `pnpm test:related` змінених файлів.
- [ ] **Step 6: Commit.** `git commit -am "feat(dm): pending character drafts queue and review actions"` (+ нові файли).

---

### Task 13: Документація, повна перевірка, браузер

**Files:**
- Modify: `docs/architecture/` — файл про персонажів/артефакти (знайти: `grep -ln "артефакт\|CharacterInventory" docs/architecture/*.md`), `docs/STATUS.md`

- [ ] **Step 1: Документація.** У відповідний `docs/architecture/*.md` додати розділ «Підсумок» (stash у `CharacterInventory`, одна дія через `POST …/stash`, редуктор `applyStashAction`, журнал `inventory_log` лише додається, власність артефакта = `equipped` ∪ `stash`, передача йде в сховок) і «Чернетки гравця» (`status`, `ACTIVE_CHARACTER` обов'язковий у кожному запиті героїв для бою/балансу/ростера/AI, валідація характеристик на сервері, AI через ключ DM). У `docs/STATUS.md` — рядок про гілку.
- [ ] **Step 2: `/simplify`** на diff гілки (вимога CLAUDE.md).
- [ ] **Step 3: Повний прогін.** `pnpm lint` → 0 помилок; `pnpm exec tsc --noEmit -p .` → 0; `pnpm test:run` → усе зелене.
- [ ] **Step 4: Браузер** (`pnpm dev` у worktree, локальна БД `stash` з даними — `./scripts/db/prodcopy-db.sh` у БД `stash` або сид). Перевірити гравцем: витрата 50 зм з приміткою, спроба витратити більше, ніж є; додати «Зілля ×2 одноразове» → «Використати» двічі → річ зникла; зняти артефакт у підсумок → вдягнути назад; передати артефакт іншому герою (з'являється в його підсумку); журнал показує всі дії. DM: видати вільний артефакт, забрати, задати суму. Гравець без персонажа: «Згенерувати» → «Згенерувати ще раз» → відправити → банер «На розгляді» → DM бачить у черзі → «Повернути з коментарем» → гравець бачить коментар, редагує → DM «Схвалити» → герой з'являється в налаштуванні бою. Мобільна ширина (390 px) для вкладки «Підсумок» і форми. Тестові записи після перевірки видалити.
- [ ] **Step 5: Commit.** `git commit -am "docs: stash and player drafts"`
