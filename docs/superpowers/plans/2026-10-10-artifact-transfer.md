# Передача артефактів і артефакти в довіднику — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** артефакт — унікальний предмет; ДМ і власник героя передають його іншому герою (обмін при зайнятому слоті); довідник показує всі артефакти й сети з власниками.

**Architecture:** джерело істини лишається `character_inventories.equipped` (JSON `slotKey → artifactId`). Унікальність гарантує сервер: кожен запис `equipped` іде в `prisma.$transaction` з `pg_advisory_xact_lock` на кампанію. Чиста логіка — `lib/utils/artifacts/ownership.ts`; нові маршрути `POST …/characters/[characterId]/artifacts/transfer` і `GET …/characters/roster`; клієнт — `lib/api` → хуки `lib/hooks/characters` → компоненти. Довідник отримує некешований `loadArtifactReference`.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod, TanStack Query, Vitest (+ happy-dom для компонентів).

**Spec:** `docs/superpowers/specs/2026-10-10-artifact-transfer-design.md`

## Global Constraints

- Без міграцій Prisma.
- Тексти помилок — українською в `lib/constants/api-errors.ts`; формат `{ error: string }` через `errorResponse`.
- Компоненти не імпортують `@/lib/api/*`; запити — `lib/api/<domain>.ts`, логіка — хуки.
- Ключі запитів — фабрики в `lib/hooks/characters/keys.ts`, не інлайн-масиви.
- Діалоги — тільки `ResponsiveDialog`; підтвердження — `useConfirm`/`useNotify`.
- Мінімум коментарів (лише неочевидне «чому»), порожні рядки навколо `const`/`if`/`return` (ESLint `padding-line-between-statements`).
- Аватар у roster — лише URL (`http…`), base64 → `null` (egress Supabase).
- Перед кожним комітом: `pnpm lint` на змінених файлах, `pnpm exec tsc --noEmit`, `pnpm test:run` для зачеплених тестів.

## Review Focus

- Гравець передає артефакт героя, яким не керує → 403 (тест у Task 2).
- Отримувач з іншої кампанії → 403/404, нічого не записано (Task 2).
- ДМ у редакторі вдягає артефакт, який уже носить інший герой → 409 з ім'ям власника, UI показує повідомлення (Task 2, Task 4).
- Обмін: предмет отримувача опиняється у відправника в тому ж слоті, ніщо не губиться (Task 1, Task 2).
- Roster не віддає base64-аватари і не відкриває листів (Task 3).

---

### Task 1: Чиста логіка володіння

**Files:**
- Create: `lib/utils/artifacts/ownership.ts`
- Test: `lib/utils/artifacts/__tests__/ownership.test.ts`

**Interfaces:**
- Consumes: `buildEquipped(equipped, slotKey, artifactId | null)` з `lib/utils/artifacts/equipment.ts`; `ARTIFACT_GRID_9` з `lib/constants/artifacts.ts`.
- Produces:
  - `interface HeldInventory { characterId: string; equipped: EquippedItems }`
  - `findHolder(inventories: HeldInventory[], artifactId: string, exceptCharacterId?: string): string | null`
  - `const TransferError = { EMPTY_SLOT, SAME_CHARACTER, UNKNOWN_SLOT }`, `type TransferErrorCode`
  - `planTransfer(input: { from: HeldInventory; to: HeldInventory; slot: string }): TransferPlan`, де `TransferPlan = { ok: true; artifactId: string; swappedArtifactId: string | null; fromEquipped: EquippedItems; toEquipped: EquippedItems } | { ok: false; error: TransferErrorCode }`

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";

import { findHolder, planTransfer, TransferError } from "@/lib/utils/artifacts/ownership";

const inv = (characterId: string, equipped: Record<string, string>) => ({ characterId, equipped });

describe("findHolder", () => {
  it("знаходить героя, що носить артефакт", () => {
    expect(findHolder([inv("a", { helmet: "h1" }), inv("b", { boots: "b1" })], "b1")).toBe("b");
  });

  it("ігнорує героя-виняток і повертає null, якщо ніхто не носить", () => {
    expect(findHolder([inv("a", { helmet: "h1" })], "h1", "a")).toBeNull();
    expect(findHolder([inv("a", {})], "x")).toBeNull();
  });
});

describe("planTransfer", () => {
  it("вільний слот — артефакт переходить, у відправника слот порожній", () => {
    const plan = planTransfer({ from: inv("a", { helmet: "h1", boots: "b1" }), to: inv("b", {}), slot: "helmet" });

    expect(plan).toEqual({ ok: true, artifactId: "h1", swappedArtifactId: null, fromEquipped: { boots: "b1" }, toEquipped: { helmet: "h1" } });
  });

  it("зайнятий слот — обмін", () => {
    const plan = planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("b", { helmet: "h2", cape: "c1" }), slot: "helmet" });

    expect(plan).toEqual({ ok: true, artifactId: "h1", swappedArtifactId: "h2", fromEquipped: { helmet: "h2" }, toEquipped: { helmet: "h1", cape: "c1" } });
  });

  it("порожній слот, сам собі, невідомий слот — помилки", () => {
    expect(planTransfer({ from: inv("a", {}), to: inv("b", {}), slot: "helmet" })).toEqual({ ok: false, error: TransferError.EMPTY_SLOT });
    expect(planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("a", {}), slot: "helmet" })).toEqual({ ok: false, error: TransferError.SAME_CHARACTER });
    expect(planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("b", {}), slot: "tail" })).toEqual({ ok: false, error: TransferError.UNKNOWN_SLOT });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/artifacts/__tests__/ownership.test.ts` → FAIL (модуля нема).

- [ ] **Step 3: Implementation**

```ts
import { buildEquipped } from "./equipment";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

export interface HeldInventory {
  characterId: string;
  equipped: EquippedItems;
}

export const TransferError = { EMPTY_SLOT: "EMPTY_SLOT", SAME_CHARACTER: "SAME_CHARACTER", UNKNOWN_SLOT: "UNKNOWN_SLOT" } as const;

export type TransferErrorCode = (typeof TransferError)[keyof typeof TransferError];

export type TransferPlan =
  | { ok: true; artifactId: string; swappedArtifactId: string | null; fromEquipped: EquippedItems; toEquipped: EquippedItems }
  | { ok: false; error: TransferErrorCode };

export function findHolder(inventories: HeldInventory[], artifactId: string, exceptCharacterId?: string): string | null {
  const holder = inventories.find((inv) => inv.characterId !== exceptCharacterId && Object.values(inv.equipped).includes(artifactId));

  return holder?.characterId ?? null;
}

export function planTransfer({ from, to, slot }: { from: HeldInventory; to: HeldInventory; slot: string }): TransferPlan {
  if (!ARTIFACT_GRID_9.some((cell) => cell.key === slot)) return { ok: false, error: TransferError.UNKNOWN_SLOT };

  if (from.characterId === to.characterId) return { ok: false, error: TransferError.SAME_CHARACTER };

  const artifactId = from.equipped[slot];

  if (!artifactId) return { ok: false, error: TransferError.EMPTY_SLOT };

  const swappedArtifactId = to.equipped[slot] ?? null;

  return {
    ok: true,
    artifactId,
    swappedArtifactId,
    fromEquipped: buildEquipped(from.equipped, slot, swappedArtifactId),
    toEquipped: buildEquipped(to.equipped, slot, artifactId),
  };
}
```

- [ ] **Step 4:** тест → PASS.
- [ ] **Step 5:** `git commit -m "feat(artifacts): ownership helpers — findHolder, planTransfer"`

---

### Task 2: Маршрут передачі і перевірка власника в PATCH inventory

**Files:**
- Create: `lib/utils/artifacts/lock.ts`
- Create: `app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/route.ts`
- Create: `app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/transfer-artifact.ts`
- Modify: `app/api/campaigns/[id]/characters/[characterId]/inventory/update-inventory.ts`
- Modify: `lib/constants/api-errors.ts`
- Test: `app/api/__tests__/artifact-transfer-api.test.ts`

**Interfaces:**
- Consumes: Task 1 (`findHolder`, `planTransfer`, `TransferError`, `HeldInventory`).
- Produces:
  - `lockCampaignArtifacts(tx: Prisma.TransactionClient, campaignId: string): Promise<unknown>`
  - `ensureInventory(tx, characterId)` (в `lock.ts`, повертає `CharacterInventory`)
  - `POST` тіло `{ slot: string; toCharacterId: string }` → `200 { from: Inventory; to: Inventory }`
  - нові `API_ERRORS`: `ARTIFACT_SLOT_EMPTY: "У цьому слоті немає артефакта"`, `ARTIFACT_TRANSFER_SELF: "Не можна передати артефакт самому собі"`, `ARTIFACT_UNKNOWN_SLOT: "Невідомий слот"`, `ARTIFACT_HELD_BY_OTHER: "Артефакт уже носить інший герой"`

- [ ] **Step 1: `lock.ts`**

```ts
import type { Prisma } from "@prisma/client";

// pg_advisory_xact_lock повертає void — $queryRaw не вміє його десеріалізувати, тому $executeRaw
export const lockCampaignArtifacts = (tx: Prisma.TransactionClient, campaignId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`artifacts:${campaignId}`}))`;

export const ensureInventory = (tx: Prisma.TransactionClient, characterId: string) =>
  tx.characterInventory.upsert({
    where: { characterId },
    create: { characterId, equipped: {}, backpack: [], items: [], gold: 0, silver: 0, copper: 0 },
    update: {},
  });
```

- [ ] **Step 2: Failing route tests** (шаблон — `app/api/__tests__/character-tokens-api.test.ts`; мокати `@/lib/utils/api/api-auth` → `requireCampaignAccess`, `@/lib/db` → `prisma.character.findUnique`, `prisma.$transaction` = `(fn) => fn(tx)`, де `tx` має `$executeRaw`, `characterInventory.upsert`, `characterInventory.update`, `characterInventory.findMany`, `character.findMany`).

Кейси:
  - ДМ передає `helmet` від `a` до `b` (у `b` слот вільний) → 200, `update` викликано для `a` з `equipped: {}` і для `b` з `equipped: { helmet: "h1" }`, `$executeRaw` викликано.
  - Гравець `u1` (`controlledBy: "u1"`) передає свій → 200.
  - Гравець `u2` передає героя `controlledBy: "u1"` → 403, `$transaction` не викликано.
  - Отримувач із `campaignId: "other"` → 403, нічого не записано.
  - Відправник не знайдений → 404.
  - Порожній слот → 400 з `API_ERRORS.ARTIFACT_SLOT_EMPTY`.
  - Обмін: у `b` `helmet: "h2"` → `a` отримує `{ helmet: "h2" }`, `b` — `{ helmet: "h1" }`.
  - Невалідне тіло (`{}`) → 400.
  - PATCH inventory (ДМ) з `equipped: { helmet: "h1" }`, коли `findMany` повертає інвентар героя `b` з `helmet: "h1"` (ім'я «Боромир») → 409, `error` містить «Боромир»; `update` не викликано.
  - PATCH inventory з вільним артефактом → 200.

- [ ] **Step 3:** `pnpm test:run app/api/__tests__/artifact-transfer-api.test.ts` → FAIL.

- [ ] **Step 4: `transfer-artifact.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ensureInventory, lockCampaignArtifacts } from "@/lib/utils/artifacts/lock";
import { planTransfer, TransferError, type TransferErrorCode } from "@/lib/utils/artifacts/ownership";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { EquippedItems } from "@/types/inventory";

const transferSchema = z.object({ slot: z.string().min(1), toCharacterId: z.string().min(1) });

const ERROR_TEXT: Record<TransferErrorCode, string> = {
  [TransferError.EMPTY_SLOT]: API_ERRORS.ARTIFACT_SLOT_EMPTY,
  [TransferError.SAME_CHARACTER]: API_ERRORS.ARTIFACT_TRANSFER_SELF,
  [TransferError.UNKNOWN_SLOT]: API_ERRORS.ARTIFACT_UNKNOWN_SLOT,
};

const characterSelect = { id: true, campaignId: true, controlledBy: true } as const;

export async function transferArtifact(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const data = await parseBody(transferSchema, request);

  if (data instanceof NextResponse) return data;

  const from = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (from instanceof NextResponse) return from;

  if (!access.isDM && from.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const to = await loadOwned(prisma.character.findUnique({ where: { id: data.toCharacterId }, select: characterSelect }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (to instanceof NextResponse) return to;

  return prisma.$transaction(async (tx) => {
    await lockCampaignArtifacts(tx, campaignId);

    const fromInv = await ensureInventory(tx, from.id);

    const toInv = await ensureInventory(tx, to.id);

    const plan = planTransfer({
      from: { characterId: from.id, equipped: fromInv.equipped as EquippedItems },
      to: { characterId: to.id, equipped: toInv.equipped as EquippedItems },
      slot: data.slot,
    });

    if (!plan.ok) return errorResponse(ERROR_TEXT[plan.error], 400);

    const fromSaved = await tx.characterInventory.update({ where: { characterId: from.id }, data: { equipped: plan.fromEquipped } });

    const toSaved = await tx.characterInventory.update({ where: { characterId: to.id }, data: { equipped: plan.toEquipped } });

    return NextResponse.json({ from: fromSaved, to: toSaved });
  });
}
```

`route.ts` — як `inventory/route.ts`: `POST` викликає `transferArtifact(request, id, characterId)` у `try/catch` з `handleApiError(error, { action: "transfer artifact" })`.

- [ ] **Step 5: `update-inventory.ts`** — `parseBody` перенести перед завантаженням героя не обов'язково; змінити запис так: увесь блок `const current … return NextResponse.json(inventory)` загорнути в `prisma.$transaction(async (tx) => { … })`, на початку `await lockCampaignArtifacts(tx, campaignId)`; якщо `data.equipped` задано:

```ts
const others = await tx.characterInventory.findMany({
  where: { character: { campaignId }, characterId: { not: characterId } },
  select: { characterId: true, equipped: true, character: { select: { name: true } } },
});

for (const artifactId of Object.values(data.equipped).filter((v): v is string => !!v)) {
  const holderId = findHolder(others.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems })), artifactId);

  if (holderId) {
    const holderName = others.find((o) => o.characterId === holderId)?.character.name ?? "";

    return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${holderName}`, 409);
  }
}
```

`prisma.characterInventory.update/create` всередині замінити на `tx.…`. Решта логіки без змін.

- [ ] **Step 6:** тести → PASS; `pnpm test:run app/api` (нічого старого не зламано).
- [ ] **Step 7:** `git commit -m "feat(artifacts): transfer route and unique ownership check in inventory PATCH"`

---

### Task 3: Roster героїв, клієнтський API і хуки

**Files:**
- Create: `app/api/campaigns/[id]/characters/roster/route.ts`, `app/api/campaigns/[id]/characters/roster/read-roster.ts`
- Modify: `types/characters.ts` (тип `RosterHero`), `lib/api/characters.ts`, `lib/api/inventory.ts`, `lib/hooks/characters/keys.ts`, `lib/hooks/characters/index.ts`
- Create: `lib/hooks/characters/useCharacterRoster.ts`, `lib/hooks/characters/useTransferArtifact.ts`
- Test: `app/api/__tests__/character-roster-api.test.ts`, `lib/hooks/characters/__tests__/useTransferArtifact.test.tsx`

**Interfaces:**
- Consumes: маршрут transfer з Task 2.
- Produces:
  - `interface RosterHero { id: string; name: string; avatar: string | null; type: CharacterTypeValue; equipped: Record<string, { id: string; name: string }> }` (ключ — слот сітки)
  - `GET /characters/roster` → `RosterHero[]` (сортування за `name`)
  - `getCharacterRoster(campaignId): Promise<RosterHero[]>` (`lib/api/characters.ts`, через `campaignGet`)
  - `transferArtifact(campaignId, characterId, body: { slot: string; toCharacterId: string }): Promise<{ from: Inventory; to: Inventory }>` (`lib/api/inventory.ts`, через `campaignPost`)
  - `characterKeys.roster(campaignId) = ["character-roster", campaignId] as const`
  - `useCharacterRoster(campaignId)` — `useQuery`, `staleTime: 30_000`
  - `useTransferArtifact(campaignId, characterId)` — `useMutation<{from;to}, Error, { slot: string; toCharacterId: string }>`; `onSuccess` інвалідує `characterSheetKey(campaignId)` (префікс — усі листи), `characterKeys.roster(campaignId)`, `characterKeys.details(campaignId)`.

- [ ] **Step 1: Failing roster tests** — мок `requireCampaignAccess` і `prisma.character.findMany` / `prisma.artifact.findMany`:
  - учасник (не ДМ) → 200, масив з `id, name, avatar, type, equipped` з назвами артефактів;
  - аватар `data:image/png;base64,…` → `avatar: null`; `https://…` → як є;
  - герой без інвентарю → `equipped: {}`;
  - не учасник (`requireCampaignAccess` повертає 403) → 403.

- [ ] **Step 2: `read-roster.ts`**

```ts
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import type { CharacterTypeValue, RosterHero } from "@/types/characters";

const urlOnly = (avatar: string | null) => (avatar?.startsWith("http") ? avatar : null);

export async function readRoster(campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const heroes = await prisma.character.findMany({
    where: { campaignId },
    select: { id: true, name: true, avatar: true, type: true, inventory: { select: { equipped: true } } },
    orderBy: { name: "asc" },
  });

  const slotsOf = (h: (typeof heroes)[number]) => Object.entries((h.inventory?.equipped as Record<string, string | undefined>) ?? {}).filter((e): e is [string, string] => !!e[1]);

  const ids = [...new Set(heroes.flatMap((h) => slotsOf(h).map(([, id]) => id)))];

  const artifacts = ids.length ? await prisma.artifact.findMany({ where: { id: { in: ids }, campaignId }, select: { id: true, name: true } }) : [];

  const nameById = new Map(artifacts.map((a) => [a.id, a.name]));

  const roster: RosterHero[] = heroes.map((h) => ({
    id: h.id,
    name: h.name,
    avatar: urlOnly(h.avatar),
    type: h.type as CharacterTypeValue,
    equipped: Object.fromEntries(slotsOf(h).filter(([, id]) => nameById.has(id)).map(([slot, id]) => [slot, { id, name: nameById.get(id) as string }])),
  }));

  return NextResponse.json(roster);
}
```

(Перевірити, звідки імпортується `CharacterTypeValue` — `lib/constants/characters.ts`; імпортувати звідти, якщо в `types/characters.ts` його немає.) `route.ts` — `GET` з `handleApiError(error, { action: "fetch roster" })`.

- [ ] **Step 3: клієнт і хуки**

```ts
// lib/api/inventory.ts
export const transferArtifact = (campaignId: string, characterId: string, body: { slot: string; toCharacterId: string }) =>
  campaignPost<{ from: Inventory; to: Inventory }>(campaignId, `/characters/${characterId}/artifacts/transfer`, body);
```

```ts
// lib/hooks/characters/useTransferArtifact.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterKeys, characterSheetKey } from "./keys";

import { transferArtifact } from "@/lib/api/inventory";

export function useTransferArtifact(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { slot: string; toCharacterId: string }) => transferArtifact(campaignId, characterId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: characterSheetKey(campaignId) }),
        queryClient.invalidateQueries({ queryKey: characterKeys.roster(campaignId) }),
        queryClient.invalidateQueries({ queryKey: characterKeys.details(campaignId) }),
      ]),
  });
}
```

(Перевірити сигнатуру `campaignPost` у `lib/api/client.ts:157` і підлаштувати виклик.) Тест хука (happy-dom, `QueryClientProvider`, мок `@/lib/api/inventory`): після `mutateAsync` викликано `transferArtifact` з правильними аргументами і інвалідовано ключ `["character-sheet", campaignId]`.

- [ ] **Step 4:** тести → PASS, `tsc`, lint.
- [ ] **Step 5:** `git commit -m "feat(characters): hero roster endpoint, transfer API client and hooks"`

---

### Task 4: UI передачі і власники в редакторі ДМ

**Files:**
- Create: `components/character-profile/TransferArtifactDialog.tsx`
- Modify: `components/character-profile/ItemsTab.tsx`, `components/characters/artifacts/CharacterArtifactsSection.tsx`, `components/character-profile/ProfileEditor.tsx` (передати roster/власників), `lib/hooks/characters/useEquipArtifact.ts` (без змін логіки; тільки якщо треба прокинути текст помилки)
- Test: `components/character-profile/__tests__/transfer-artifact-dialog.test.tsx`, оновити `components/characters/__tests__/CharacterArtifactsSection.test.tsx`

**Interfaces:**
- Consumes: `useCharacterRoster`, `useTransferArtifact`, `RosterHero` (Task 3); `useProfile()` → `{ campaignId, characterId, sheet }`; `SheetArtifact.slot` — ключ слота сітки.
- Produces: `TransferArtifactDialog({ artifact, open, onOpenChange }: { artifact: SheetArtifact | null; open: boolean; onOpenChange: (open: boolean) => void })`.

Профіль бачать лише ДМ і власник героя (лист для інших — 403), тому кнопка «Передати» показується завжди.

- [ ] **Step 1: Failing component test** (`// @vitest-environment happy-dom`, рендер у `ConfirmProvider` з `components/ui/__tests__/render-with-confirm.tsx` + `QueryClientProvider` + `ProfileContext.Provider`; мок `@/lib/hooks/characters` для `useCharacterRoster`/`useTransferArtifact`):
  - roster з героями `a` (поточний), `b` (без шолома), `c` (`helmet: { id: "h2", name: "Шолом Ночі" }`) → у списку `b` і `c`, немає `a`; під `c` текст «обмін на Шолом Ночі».
  - клік на `b` → confirm → `mutate` з `{ slot: "helmet", toCharacterId: "b" }`.
  - порожній roster (лише поточний) → «Немає інших героїв у кампанії».

- [ ] **Step 2: Implementation**

```tsx
"use client";

import { useProfile } from "./ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCharacterRoster, useTransferArtifact } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { SheetArtifact } from "@/types/characters";

interface TransferArtifactDialogProps {
  artifact: SheetArtifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferArtifactDialog({ artifact, open, onOpenChange }: TransferArtifactDialogProps) {
  const { campaignId, characterId } = useProfile();

  const roster = useCharacterRoster(campaignId);

  const transfer = useTransferArtifact(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const recipients = (roster.data ?? []).filter((h) => h.id !== characterId);

  const give = (heroId: string, heroName: string) => {
    if (!artifact) return;

    void confirm({
      title: `Передати «${artifact.name}» герою ${heroName}?`,
      confirmLabel: "Передати",
      onConfirm: () =>
        transfer.mutateAsync({ slot: artifact.slot, toCharacterId: heroId }).then(
          () => onOpenChange(false),
          (e: Error) => notify(e.message || "Не вдалося передати артефакт"),
        ),
    });
  };

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={artifact ? `Передати: ${artifact.name}` : "Передати"}>
      {roster.isLoading ? (
        <LoadingState rows={3} label="Завантаження героїв…" />
      ) : recipients.length === 0 ? (
        <EmptyState title="Немає інших героїв у кампанії" />
      ) : (
        <ul>
          {recipients.map((h) => {
            const swap = artifact ? h.equipped[artifact.slot] : undefined;

            return (
              <li key={h.id}>
                <button type="button" disabled={transfer.isPending} onClick={() => give(h.id, h.name)} className="flex min-h-11 w-full items-center gap-3 border-b border-[#2a2218] py-2 text-left disabled:opacity-50">
                  <EntityIcon src={h.avatar} name={h.name} size={36} className="size-9 rounded-full" />
                  <span className="min-w-0">
                    <span className="block text-sm text-hud-ink">{h.name}</span>
                    {swap && <span className="block text-xs text-hud-muted">обмін на {swap.name}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
```

(Перевірити пропси `LoadingState`/`EmptyState`/`EntityIcon` у їхніх файлах і підлаштувати.)

`ItemsTab`: стан `transferOpen`; у діалог артефакта додати `footer={<Button variant="outline" onClick={() => { setOpen(false); setTransferOpen(true); }}>Передати</Button>}`; поруч рендерити `<TransferArtifactDialog artifact={shown} open={transferOpen} onOpenChange={setTransferOpen} />`.

`CharacterArtifactsSection`: новий необов'язковий проп `holders?: Record<string, string>` (artifactId → ім'я героя-власника, крім поточного). У списку вибору для слота артефакт із `holders[a.id]` — `DropdownMenuItem disabled` з підписом `у {ім'я}`. `onError` у `handleSlotChange`: `notify(e.message || "Не вдалося змінити спорядження")`. `ProfileEditor` будує `holders` з `useCharacterRoster(campaignId)`: для кожного героя ≠ `characterId` кожен `equipped[slot].id → hero.name`. Імпорт хука в компоненті ок (компонент викликає хук).

- [ ] **Step 3:** тести → PASS; оновити тест `CharacterArtifactsSection` кейсом «артефакт іншого героя неактивний з підписом у Боромир».
- [ ] **Step 4:** `git commit -m "feat(profile): transfer artifact dialog, holders in DM equipment picker"`

---

### Task 5: Артефакти в довіднику

**Files:**
- Modify: `types/info-reference.ts`, `lib/cache/info-reference.ts`, `app/campaigns/[id]/info/page.tsx`, `lib/hooks/common/useInfoReferenceFilters.ts`, `lib/utils/info-reference` (функція `artifactSearchText`), `components/campaigns/info/InfoReferenceClient.tsx`, `components/campaigns/info/ReferenceSearchBar.tsx`, `components/campaigns/info/ReferenceSectionAccordion.tsx`, `app/campaigns/[id]/page.tsx` (підзаголовок плитки)
- Create: `components/campaigns/info/ArtifactReferenceCard.tsx`, `components/campaigns/info/ArtifactSetReferenceCard.tsx`
- Test: `lib/cache/__tests__/artifact-reference.test.ts` (або поруч з наявними тестами info-reference — знайти `grep -rl loadInfoReference **/__tests__`), `lib/hooks/common/__tests__/useInfoReferenceFilters.test.ts` (доповнити, якщо існує), `app/campaigns/[id]/info/__tests__/page.test.tsx` (оновити моки)

**Interfaces:**
- Produces:
  - `interface ArtifactForReference { id: string; name: string; icon: string | null; rarity: string | null; slot: string; slotLabel: string; description: string | null; effects: string[]; setName: string | null; holderName: string | null }`
  - `interface ArtifactSetForReference { id: string; name: string; icon: string | null; description: string | null; bonuses: string[]; artifactNames: string[] }`
  - `type SectionTab = "all" | "skills" | "spells" | "artifacts"`
  - `loadArtifactReference(campaignId): Promise<{ artifacts: ArtifactForReference[]; sets: ArtifactSetForReference[] }>` — без `unstable_cache`.

- [ ] **Step 1: Failing loader test** (мок `prisma.artifact.findMany`, `prisma.artifactSet.findMany`, `prisma.characterInventory.findMany`): артефакт, який носить «Боромир» → `holderName: "Боромир"`; невдягнений → `null`; `slotLabel` з `ARTIFACT_SLOT_OPTIONS`; `effects` з `abilitySummary("artifact", row)`; сет → `bonuses` з `abilitySummary("artifactSet", row)`, `artifactNames` — назви артефактів сету за алфавітом.

- [ ] **Step 2: loader**

```ts
export async function loadArtifactReference(campaignId: string): Promise<ArtifactReference> {
  const [artifacts, sets, inventories] = await Promise.all([
    prisma.artifact.findMany({
      where: { campaignId },
      select: { id: true, name: true, icon: true, rarity: true, slot: true, description: true, abilities: true, artifactSet: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.artifactSet.findMany({
      where: { campaignId },
      select: { id: true, name: true, icon: true, description: true, abilities: true, artifacts: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.characterInventory.findMany({ where: { character: { campaignId } }, select: { equipped: true, character: { select: { name: true } } } }),
  ]);

  const holderById = new Map<string, string>();

  for (const inv of inventories) {
    for (const id of Object.values((inv.equipped as Record<string, string | undefined>) ?? {})) if (id) holderById.set(id, inv.character.name);
  }

  const slotLabel = (slot: string) => ARTIFACT_SLOT_OPTIONS.find((o) => o.value === slot)?.label ?? slot;

  return {
    artifacts: artifacts.map((a) => ({
      id: a.id, name: a.name, icon: a.icon, rarity: a.rarity, slot: a.slot, slotLabel: slotLabel(a.slot), description: a.description,
      effects: abilitySummary("artifact", a), setName: a.artifactSet?.name ?? null, holderName: holderById.get(a.id) ?? null,
    })),
    sets: sets.map((s) => ({
      id: s.id, name: s.name, icon: s.icon, description: s.description,
      bonuses: abilitySummary("artifactSet", s), artifactNames: s.artifacts.map((x) => x.name).sort((x, y) => x.localeCompare(y)),
    })),
  };
}
```

(Відформатувати по одному полю на рядок, як решта файлу.)

- [ ] **Step 3: сторінка** — `const [{ skills, spells }, { artifacts, sets }] = await Promise.all([getCachedInfoReference(campaignId), loadArtifactReference(campaignId)])`; передати `artifacts`, `sets` в `InfoReferenceClient`. Підзаголовок: «Скіли, заклинання та артефакти кампанії: як діють, опис вигляду, у кого артефакти.» Плитка на сторінці кампанії: subtitle «Скіли, заклинання й артефакти: як діють і в кого що.»

- [ ] **Step 4: фільтри** — `useInfoReferenceFilters(skills, spells, artifacts)`: стани `artifactRarityFilter`, `artifactSlotFilter`, `artifactSetFilter`; опції з даних; `filteredArtifacts` (пошук через `artifactSearchText(a) = [a.name, a.description, a.setName, a.holderName, ...a.effects].filter(Boolean).join(" ")` + фільтри); `showArtifacts = section === "all" || section === "artifacts"`; `artifactsEmpty`; `nothingFound` = усі три порожні; `clearAllFilters` скидає нові фільтри; `hasActiveFilters` враховує їх. Тест хука: фільтр за рідкістю і пошук за власником.

- [ ] **Step 5: UI**
  - `ReferenceSearchBar`: вкладка «Артефакти» в перемикачі секцій; блок фільтрів рідкість/слот/сет, коли `showArtifactsFilter` (за зразком фільтрів заклинань у тому ж файлі).
  - `InfoReferenceClient`: лічильник «Артефактів: N» і посилання «До артефактів» (`#ref-artifacts`), передача нових полів у акордеон.
  - `ReferenceSectionAccordion`: третій `HudPanel` з `id="ref-artifacts"` заголовком «Артефакти», групи за `setName ?? "Без сету"` (як `spellsByGroup`) з `ArtifactReferenceCard`; під ними підсекція «Сети» з `ArtifactSetReferenceCard`. `hasContent`/`showBoth` переписати так, щоб заголовки секцій показувались, коли видно більше однієї секції.
  - `ArtifactReferenceCard`: за зразком `SpellReferenceCard` (AccordionItem): іконка, назва, рідкість (`ARTIFACT_RARITY_OPTIONS` label), слот, рядок «у {holderName}» або «вільний»; у розгорнутому — опис і список ефектів.
  - `ArtifactSetReferenceCard`: назва, іконка, опис, «Предмети: …», список бонусів.

- [ ] **Step 6:** тести → PASS; `pnpm test:run components/campaigns app/campaigns lib/hooks/common lib/cache`; tsc; lint.
- [ ] **Step 7:** `git commit -m "feat(reference): artifacts and sets with holders in the info reference"`

---

### Task 6: Перевірка в браузері й заклинання (виконує контролер)

- [ ] `pnpm dev` (локальна БД), зайти гравцем у кампанію, відкрити довідник: секції скілів, заклинань, артефактів видно; якщо заклинань немає — `superpowers:systematic-debugging`, виправити з тестом.
- [ ] Гравцем передати свій артефакт іншому герою (вільний слот і обмін), перевірити листи обох; ДМ — спробувати вдягти чужий артефакт → повідомлення з іменем власника.
- [ ] `pnpm test:run`, `pnpm lint`, `pnpm build`.
