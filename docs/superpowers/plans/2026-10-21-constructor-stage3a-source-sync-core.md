# Етап 3a — оновлення з джерела: ядро й API. План реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кампанія (або шаблон) з `createdFromId` отримує diff зі своїм джерелом і вибірково застосовує або ігнорує зміни (контент 10 таблиць бандла, правила по механіках, налаштування) через REST, OpenAPI і MCP.

**Architecture:**
- Таблиця `campaign_source_syncs` зберігає baseline (хеші версії джерела, з якою кампанія синхронізована) і `ignored`.
- Модуль `lib/server/templates/sync/` (без `server-only`, щоб його міг викликати tsx-скрипт):
  - `context.ts` вантажить джерело й ціль;
  - `classify.ts` — чиста тристороння класифікація S/B/L;
  - `apply.ts` пише зміни в транзакції.
- `service.ts` (`server-only`) додає `assertCan`, доступ до джерела, транзакцію й інвалідацію кешу.
- Операції `source.diff` / `source.apply` в `CONTENT_OPERATIONS`, MCP-інструменти `source_diff` / `source_apply`.

**Tech Stack:** Next.js 16 route handlers, Prisma 6, Zod 4, Vitest, MCP (`lib/ai/tools`).

**Spec:** `docs/superpowers/specs/2026-10-21-constructor-stage3-source-sync-design.md`

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку не чіпати. БД лише `postgresql://postgres:postgres@localhost:54322/constructor`. Перед Prisma CLI: `set -a; source .env.local; set +a`. Міграції застосовувати `pnpm exec prisma migrate deploy` (не `migrate dev` проти цієї БД).
- Міграції тільки розширюють схему; кожна `CREATE TABLE` має `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`).
- Джерело — лише `campaign.createdFromId`; `sourceId` з тіла запиту чи файлу ніколи не довіряємо.
- Пошук і запис у цілі — завжди `{ id, campaignId }`; `assertNoLeak` обов'язковий; id наявних записів не змінюються.
- Ассети Storage (файли треків) не видаляються.
- Тексти помилок — у `lib/constants/api-errors.ts`, українською.
- Коментарі мінімальні (лише неочевидне «чому», один рядок). Імпорти через `@/…`; `pnpm lint --fix` для порядку імпортів і порожніх рядків навколо `const`/`if`/`return`.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Не зливати в `main`, нічого не деплоїти.
- Тести під час роботи: `pnpm test:related <files>` або `pnpm test:run <file>`; повний `pnpm test:run` — лише в останній задачі.

## Review Focus

1. Хеш `L` рахується не в тому просторі id (локальний рядок не переведено в id джерела) — тоді кожен клонований запис виглядає «зміненим локально». Тест: свіжий клон → порожній diff (Task 2, Task 6).
2. Залежність не додана (новий юніт з новою расою, `knownSpells` з новим заклинанням) → `assertNoLeak` падає або FK стає `null`. Тест на автододавання (Task 3).
3. Повторний diff після apply не порожній, бо baseline не оновлено для автододаних або видалених пунктів. Тест: apply → diff порожній (Task 3, Task 6).
4. Застарілий `sourceHash` (джерело змінилося між переглядом і apply) мовчки застосовує нову версію. Тест 409 (Task 3).
5. Чужий приватний шаблон як джерело (`createdFromId` вказує на шаблон, де користувач уже не DM) → 403, а не витік даних. Тест (Task 4).

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261026000000_campaign_source_sync/migration.sql` | модель `CampaignSourceSync` |
| `lib/server/templates/import-bundle.ts` | повертає `hashes` рядків; експортує `toPrismaJson` |
| `lib/server/templates/sync/types.ts` | внутрішні типи стану й пунктів |
| `lib/server/templates/sync/hash.ts` | хеші рядків, правил, налаштувань; baseline з бандла |
| `lib/server/templates/sync/context.ts` | `loadSyncContext(db, campaignId)` |
| `lib/server/templates/sync/classify.ts` | `classify(ctx)` — чиста функція |
| `lib/server/templates/sync/usage.ts` | лічильник використань для `deletedInSource` |
| `lib/server/templates/sync/apply.ts` | `applySourceChanges(db, campaignId, body)` |
| `lib/server/templates/sync/service.ts` | `getSourceDiff`, `applySource` (права, транзакція, кеш) |
| `lib/server/campaigns/create-campaign.ts` | пише baseline при клонуванні з `createdFromId` |
| `lib/schemas/source-sync.ts` | `sourceSyncApplySchema` |
| `lib/server/content/operations.ts` | `source.diff`, `source.apply` |
| `app/api/campaigns/[id]/source-sync/route.ts` | `GET`/`POST` |
| `lib/ai/tools/content.ts` | `source_diff`, `source_apply` |
| `types/campaigns.ts` | `SourceDiff`, `SourceDiffItem`, `SourceApplyResult`, `SyncRef` |
| `scripts/constructor/source-sync-check.ts` | живий прогін на БД `constructor` |

---

### Task 1: Таблиця стану + baseline при клонуванні

**Files:**
- Modify: `prisma/schema.prisma` (модель `Campaign` + нова модель)
- Create: `prisma/migrations/20261026000000_campaign_source_sync/migration.sql`
- Create: `lib/server/templates/sync/types.ts`, `lib/server/templates/sync/hash.ts`
- Modify: `lib/server/templates/import-bundle.ts`
- Modify: `lib/server/campaigns/create-campaign.ts`
- Test: `lib/server/templates/sync/__tests__/hash.test.ts`, `lib/server/templates/__tests__/import-bundle.test.ts` (доповнити)

**Interfaces:**
- Produces:
  - `type TableHashes = Partial<Record<BundleTable, Record<string, string>>>`
  - `type SyncState = { tables: TableHashes; rules: Record<string, string>; settings?: string }` (baseline; у `ignored` значення може бути `"deleted"`)
  - `rowHash(row: Record<string, unknown>, t: BundleTableDef): string` = `hashJson(pick(row, t.columns))`
  - `rulesHashes(rules: unknown): Record<string, string>` — за ключами `MECHANIC_REGISTRY`, значення `hashJson(parseRules(rules)[key])`
  - `settingsHash(s: Bundle["settings"]): string` = `hashJson({ maxLevel, xpMultiplier, allowPlayerEdit, friendlyFire })`
  - `baselineFromBundle(bundle: Bundle, hashes: TableHashes): SyncState`
  - `importBundle(...)` тепер повертає `{ idMap, warnings, hashes: TableHashes }`, де `hashes[table][sourceId] = sourceHash`
  - `export function toPrismaJson(row, t)` з `import-bundle.ts`
  - `createCampaignFromBundle` при `createdFromId && bundle` створює `campaignSourceSync` у тій самій транзакції

- [ ] **Step 1: Prisma-модель**

У `prisma/schema.prisma` до моделі `Campaign` додати поле `sourceSync CampaignSourceSync?`, а наприкінці файлу — модель:

```prisma
model CampaignSourceSync {
  campaignId       String   @id
  sourceCampaignId String
  baseline         Json
  ignored          Json     @default("{}")
  syncedAt         DateTime @default(now())
  campaign         Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@map("campaign_source_syncs")
}
```

- [ ] **Step 2: Міграція**

`prisma/migrations/20261026000000_campaign_source_sync/migration.sql`:

```sql
CREATE TABLE "campaign_source_syncs" (
    "campaignId" TEXT NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "baseline" JSONB NOT NULL,
    "ignored" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_source_syncs_pkey" PRIMARY KEY ("campaignId")
);

ALTER TABLE "campaign_source_syncs" ADD CONSTRAINT "campaign_source_syncs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_source_syncs" ENABLE ROW LEVEL SECURITY;
```

Застосувати й згенерувати клієнт:

```bash
set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate
```

Expected: `1 migration applied`. Потім `pnpm test:run prisma/__tests__/migrations-rls.test.ts` → PASS.

- [ ] **Step 3: Типи**

`lib/server/templates/sync/types.ts`:

```ts
import type { BundleTable } from "@/lib/server/templates/bundle";

export type TableHashes = Partial<Record<BundleTable, Record<string, string>>>;

export type SyncState = { tables: TableHashes; rules: Record<string, string>; settings?: string };

export const IGNORED_DELETED = "deleted";
```

- [ ] **Step 4: Падаючий тест хешів**

`lib/server/templates/sync/__tests__/hash.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, emptyBundle } from "@/lib/server/templates/bundle";
import { baselineFromBundle, rowHash, rulesHashes, settingsHash } from "@/lib/server/templates/sync/hash";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";

const spells = BUNDLE_TABLES.find((t) => t.key === "spells")!;

describe("sync hashes", () => {
  it("rowHash ignores columns outside the bundle", () => {
    const row = { id: "c" + "a".repeat(24), name: "Fireball" };

    expect(rowHash({ ...row, sourceId: "x", campaignId: "y" }, spells)).toBe(rowHash(row, spells));
  });

  it("rulesHashes covers every mechanic and treats {} as defaults", () => {
    const h = rulesHashes({});

    expect(Object.keys(h).sort()).toEqual(Object.keys(MECHANIC_REGISTRY).sort());
    expect(h.morale).toBe(hashJson(parseRules({}).morale));
  });

  it("settingsHash depends only on the four settings", () => {
    const s = { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false };

    expect(settingsHash({ ...s })).toBe(settingsHash(s));
    expect(settingsHash({ ...s, maxLevel: 10 })).not.toBe(settingsHash(s));
  });

  it("baselineFromBundle keeps table hashes and adds rules/settings", () => {
    const b = emptyBundle();

    const base = baselineFromBundle(b, { spells: { a: "h1" } });

    expect(base.tables).toEqual({ spells: { a: "h1" } });
    expect(base.rules).toEqual(rulesHashes(b.rules));
    expect(base.settings).toBe(settingsHash(b.settings));
  });
});
```

Run: `pnpm test:run lib/server/templates/sync/__tests__/hash.test.ts` → FAIL (модуля немає).

- [ ] **Step 5: Реалізація хешів**

`lib/server/templates/sync/hash.ts`:

```ts
import { type Bundle, type BundleTableDef, pick } from "@/lib/server/templates/bundle";
import type { SyncState, TableHashes } from "@/lib/server/templates/sync/types";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";

export const MECHANIC_KEYS = Object.keys(MECHANIC_REGISTRY) as Array<keyof typeof MECHANIC_REGISTRY>;

export const rowHash = (row: Record<string, unknown>, t: BundleTableDef): string => hashJson(pick(row, t.columns));

export function rulesHashes(rules: unknown): Record<string, string> {
  const parsed = parseRules(rules);

  return Object.fromEntries(MECHANIC_KEYS.map((k) => [k, hashJson(parsed[k])]));
}

export const settingsHash = ({ maxLevel, xpMultiplier, allowPlayerEdit, friendlyFire }: Bundle["settings"]): string =>
  hashJson({ maxLevel, xpMultiplier, allowPlayerEdit, friendlyFire });

export const baselineFromBundle = (bundle: Bundle, tables: TableHashes): SyncState => ({
  tables,
  rules: rulesHashes(bundle.rules),
  settings: settingsHash(bundle.settings),
});
```

Run тест → PASS.

- [ ] **Step 6: `importBundle` повертає хеші**

У `lib/server/templates/import-bundle.ts`:
- `function toPrismaJson` → `export function toPrismaJson`;
- перед циклом `const hashes: TableHashes = {};`;
- у `map` по рядках, там, де рахується `sourceHash: hashJson(clean)`, винести хеш у змінну і записати `(hashes[t.key] ??= {})[row.id] = hash;`;
- `return { idMap, warnings, hashes };`.

Хеш лишається `hashJson(clean)`, як зараз. Для рядка без завислих FK це дорівнює `rowHash(row, t)`.

Доповнити `lib/server/templates/__tests__/import-bundle.test.ts` тестом (за зразком наявних у файлі, з `createFakeDb`):

```ts
it("returns per-table source hashes equal to rowHash of the source row", async () => {
  const { db } = createFakeDb();

  const bundle = { ...emptyBundle(), spells: [{ id: SPELL, name: "Fireball" }] } as Bundle; // SPELL — валідний cuid-рядок

  const { hashes } = await importBundle(db, bundle, "camp");

  expect(hashes.spells![SPELL]).toBe(rowHash(bundle.spells[0], BUNDLE_TABLES.find((t) => t.key === "spells")!));
});
```

Якщо `BundleSchema` вимагає інших обов'язкових полів у рядку — подивитися фікстури наявних тестів у файлі й узяти мінімальний рядок звідти.

Run: `pnpm test:run lib/server/templates` → PASS.

- [ ] **Step 7: Baseline при клонуванні**

У `lib/server/campaigns/create-campaign.ts` у гілці з бандлом:

```ts
const { warnings, hashes } = await importBundle(tx, bundle, campaign.id);

if (input.createdFromId) {
  await tx.campaignSourceSync.create({
    data: {
      campaignId: campaign.id,
      sourceCampaignId: input.createdFromId,
      baseline: baselineFromBundle(bundle, hashes) as Prisma.InputJsonObject,
    },
  });
}

return { campaign, warnings };
```

JSON-імпорт (`app/api/campaigns/import/route.ts`) не передає `createdFromId`, тож стану не отримує — так і задумано.

Мок `$transaction` в `app/api/__tests__/campaign-templates-api.test.ts` і `campaigns-create-api.test.ts` передає `tx`, у якого немає `campaignSourceSync` → додати `campaignSourceSync: { create: vi.fn() }` у мок `db` цих тестів. Додати перевірку у тест створення з шаблону: `expect(m.db.campaignSourceSync.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sourceCampaignId: <templateId> }) }))`, і в тест імпорту JSON — `not.toHaveBeenCalled()`. Мок `importBundle` має повертати `{ warnings: [], hashes: {} }`.

Run: `pnpm test:related lib/server/campaigns/create-campaign.ts lib/server/templates/import-bundle.ts` → PASS.

- [ ] **Step 8: Commit**

```bash
git add prisma lib/server/templates lib/server/campaigns app/api/__tests__
git commit -m "feat(constructor): campaign_source_syncs + baseline on clone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Контекст і класифікатор

**Files:**
- Create: `lib/server/templates/sync/context.ts`, `lib/server/templates/sync/classify.ts`
- Modify: `lib/server/templates/sync/types.ts`
- Modify: `lib/constants/api-errors.ts`
- Test: `lib/server/templates/sync/__tests__/classify.test.ts`

**Interfaces:**
- Consumes: Task 1 (`rowHash`, `rulesHashes`, `settingsHash`, `SyncState`, `IGNORED_DELETED`, `MECHANIC_KEYS`).
- Produces (у `types.ts`):

```ts
export type SyncScope = BundleTable | "rules" | "settings";
export type SyncStatus = "new" | "updated" | "conflict" | "deletedInSource" | "deletedLocally";
export type LocalRow = { table: BundleTable; row: Record<string, unknown> & { id: string; sourceId: string | null } };

export interface SyncContext {
  campaignId: string;
  source: { id: string; name: string; kind: string; visibility: string };
  sourceBundle: Bundle;
  target: { settings: Bundle["settings"]; rules: unknown; rows: LocalRow[] };
  baseline: SyncState;
  ignored: SyncState;
  hasState: boolean;
  syncedAt: Date | null;
}

export interface SyncItem {
  scope: SyncScope;
  key: string;
  localId: string | null;
  name: string;
  status: SyncStatus;
  changedFields: string[];
  sourceHash: string | null;
  requires: Array<{ scope: BundleTable; key: string; name: string }>;
  visible: boolean;
  ignored: boolean;
}
```

- `loadSyncContext(db: SyncDb, campaignId: string): Promise<SyncContext>` (у `context.ts`), де `SyncDb = TemplateDb & Pick<Prisma.TransactionClient, "campaignSourceSync" | "character">`;
- `classify(ctx: SyncContext): SyncItem[]` — повний список, включно з `visible: false` та `ignored: true`;
- `sourceToLocalMap(ctx): Map<string, string>`, `localToSourceMap(ctx): Map<string, string>` (у `classify.ts`, експорт);
- `API_ERRORS.SOURCE_NONE`, `SOURCE_NOT_FOUND`, `SOURCE_FORBIDDEN`, `SOURCE_CHANGED`.

- [ ] **Step 1: Тексти помилок**

У `lib/constants/api-errors.ts` (поруч з іншими константами шаблонів):

```ts
  SOURCE_NONE: "У кампанії немає джерела для оновлення",
  SOURCE_NOT_FOUND: "Джерело оновлень недоступне",
  SOURCE_FORBIDDEN: "Немає доступу до джерела оновлень",
  SOURCE_CHANGED: "Джерело змінилося — оновіть перегляд змін",
```

- [ ] **Step 2: Падаючі тести класифікатора**

`lib/server/templates/sync/__tests__/classify.test.ts`. Будувати `SyncContext` вручну, без БД:

```ts
import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, type Bundle, emptyBundle } from "@/lib/server/templates/bundle";
import { classify } from "@/lib/server/templates/sync/classify";
import { baselineFromBundle, rowHash } from "@/lib/server/templates/sync/hash";
import type { LocalRow, SyncContext } from "@/lib/server/templates/sync/types";

const id = (ch: string) => "c" + ch.repeat(24);
const spells = BUNDLE_TABLES.find((t) => t.key === "spells")!;
const units = BUNDLE_TABLES.find((t) => t.key === "units")!;

// джерело: S1 Fireball; клон: L1 (sourceId S1)
const S1 = id("a"), S2 = id("b"), L1 = id("x"), L2 = id("y"), U1 = id("u"), LU = id("v");

function ctx(source: Partial<Bundle>, local: LocalRow[], baselineRows: Partial<Bundle>, ignored: SyncContext["ignored"] = { tables: {}, rules: {} }): SyncContext {
  const sourceBundle = { ...emptyBundle(), ...source } as Bundle;
  const base = { ...emptyBundle(), ...baselineRows } as Bundle;
  const tables = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, Object.fromEntries(base[t.key].map((r) => [r.id, rowHash(r, t)]))]));

  return {
    campaignId: "camp",
    source: { id: "src", name: "HOMM5", kind: "template", visibility: "official" },
    sourceBundle,
    target: { settings: emptyBundle().settings, rules: {}, rows: local },
    baseline: baselineFromBundle(base, tables),
    ignored,
    hasState: true,
    syncedAt: null,
  };
}

const spell = (sid: string, name: string, extra: Record<string, unknown> = {}) => ({ id: sid, name, ...extra });
const local = (lid: string, sid: string | null, name: string, extra: Record<string, unknown> = {}): LocalRow => ({ table: "spells", row: { id: lid, sourceId: sid, name, ...extra } });
const visible = (c: SyncContext) => classify(c).filter((i) => i.visible && !i.ignored);

describe("classify", () => {
  it("fresh clone has no visible changes", () => {
    expect(visible(ctx({ spells: [spell(S1, "Fireball")] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }))).toEqual([]);
  });

  it("source changed, local untouched → updated with changed fields", () => {
    const [item] = visible(ctx({ spells: [spell(S1, "Fireball II")] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }));

    expect(item).toMatchObject({ scope: "spells", key: S1, localId: L1, status: "updated", changedFields: ["name"], sourceHash: rowHash(spell(S1, "Fireball II"), spells) });
  });

  it("both changed → conflict", () => {
    expect(visible(ctx({ spells: [spell(S1, "A")] }, [local(L1, S1, "B")], { spells: [spell(S1, "Fireball")] }))[0].status).toBe("conflict");
  });

  it("only local changed → nothing visible", () => {
    expect(visible(ctx({ spells: [spell(S1, "Fireball")] }, [local(L1, S1, "Mine")], { spells: [spell(S1, "Fireball")] }))).toEqual([]);
  });

  it("new in source", () => {
    expect(visible(ctx({ spells: [spell(S2, "Ice")] }, [], {}))[0]).toMatchObject({ key: S2, status: "new", localId: null });
  });

  it("deleted in source", () => {
    expect(visible(ctx({}, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }))[0]).toMatchObject({ status: "deletedInSource", localId: L1, sourceHash: null });
  });

  it("deleted locally is visible only when the source changed since baseline", () => {
    const same = classify(ctx({ spells: [spell(S1, "Fireball")] }, [], { spells: [spell(S1, "Fireball")] }));

    expect(same).toEqual([expect.objectContaining({ status: "deletedLocally", visible: false })]);
    expect(visible(ctx({ spells: [spell(S1, "Fireball II")] }, [], { spells: [spell(S1, "Fireball")] }))[0].status).toBe("deletedLocally");
  });

  it("local hash is computed in source id space (fk and json refs)", () => {
    const src = { units: [{ id: U1, name: "Imp" }], spells: [spell(S1, "Summon", { summonUnitId: U1, spellEffects: [{ unitId: U1 }] })] };

    const rows: LocalRow[] = [
      { table: "units", row: { id: LU, sourceId: U1, name: "Imp" } },
      local(L1, S1, "Summon", { summonUnitId: LU, spellEffects: [{ unitId: LU }] }),
    ];

    expect(visible(ctx(src, rows, src))).toEqual([]);
  });

  it("ref to a DM-own row counts as a local change", () => {
    const own = id("o");

    const src = { spells: [spell(S1, "Summon", { summonUnitId: null })] };

    const rows: LocalRow[] = [{ table: "units", row: { id: own, sourceId: null, name: "Mine" } }, local(L1, S1, "Summon", { summonUnitId: own })];

    const changedSrc = { spells: [spell(S1, "Summon II", { summonUnitId: null })] };

    expect(visible(ctx(changedSrc, rows, src))[0].status).toBe("conflict");
  });

  it("requires lists source ids without a local pair", () => {
    const src = { units: [{ id: U1, name: "Imp" }], spells: [spell(S2, "Summon", { summonUnitId: U1 })] };

    const item = visible(ctx(src, [], {})).find((i) => i.key === S2)!;

    expect(item.requires).toEqual([{ scope: "units", key: U1, name: "Imp" }]);
  });

  it("ignored hides the item until the source changes again", () => {
    const changed = spell(S1, "Fireball II");

    const ign = { tables: { spells: { [S1]: rowHash(changed, spells) } }, rules: {} };

    expect(visible(ctx({ spells: [changed] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }, ign))).toEqual([]);
    expect(visible(ctx({ spells: [spell(S1, "III")] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }, ign))).toHaveLength(1);
  });

  it("ignored deletion uses the 'deleted' marker", () => {
    const ign = { tables: { spells: { [S1]: "deleted" } }, rules: {} };

    expect(visible(ctx({}, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }, ign))).toEqual([]);
  });

  it("rules: per mechanic statuses", () => {
    const c = ctx({ rules: { morale: { enabled: false } } }, [], {});

    const items = visible(c);

    expect(items).toEqual([expect.objectContaining({ scope: "rules", key: "morale", status: "updated", name: "Мораль" })]);
  });

  it("settings: one item with changed field names", () => {
    const c = ctx({ settings: { ...emptyBundle().settings, maxLevel: 10 } }, [], {});

    expect(visible(c)).toEqual([expect.objectContaining({ scope: "settings", key: "settings", status: "updated", changedFields: ["maxLevel"] })]);
  });

  it("no baseline entry and local equals source → nothing; differs → conflict", () => {
    expect(visible(ctx({ spells: [spell(S1, "F")] }, [local(L1, S1, "F")], {}))).toEqual([]);
    expect(visible(ctx({ spells: [spell(S1, "F")] }, [local(L1, S1, "G")], {}))[0].status).toBe("conflict");
  });

  it("untracked local rows are ignored", () => {
    expect(visible(ctx({}, [local(L2, null, "Mine")], {}))).toEqual([]);
  });

  it("unused helper refs compile", () => {
    expect(units.key).toBe("units");
  });
});
```

Останній тест прибрати, якщо `units` використовується в інших тестах; `lint` не повинен скаржитися на невикористані змінні. Ключ правила `morale.enabled` звірити зі схемою `lib/utils/rules/schema.ts`: узяти будь-яке поле механіки `morale`, яке реально існує, щоб `parseRules` дав інше значення.

Run: `pnpm test:run lib/server/templates/sync/__tests__/classify.test.ts` → FAIL.

- [ ] **Step 3: Класифікатор**

`lib/server/templates/sync/classify.ts`:

```ts
import { BUNDLE_TABLES, type BundleTable, type BundleTableDef, pick } from "@/lib/server/templates/bundle";
import { collectKeysAndStrings, remapIds } from "@/lib/server/templates/remap-ids";
import { MECHANIC_KEYS, rowHash } from "@/lib/server/templates/sync/hash";
import { IGNORED_DELETED, type SyncContext, type SyncItem, type SyncStatus } from "@/lib/server/templates/sync/types";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";

type Row = Record<string, unknown> & { id: string };

export const rowName = (row: Record<string, unknown>): string => String(row.name ?? row.title ?? row.race ?? row.id);

export function sourceToLocalMap(ctx: SyncContext): Map<string, string> {
  return new Map(ctx.target.rows.filter((r) => r.row.sourceId).map((r) => [r.row.sourceId!, r.row.id]));
}

export function localToSourceMap(ctx: SyncContext): Map<string, string> {
  return new Map(ctx.target.rows.filter((r) => r.row.sourceId).map((r) => [r.row.id, r.row.sourceId!]));
}

// S/B/L present → status; null = no change
function pairStatus(s: string, b: string | undefined, l: string): SyncStatus | null {
  if (b === undefined) return s === l ? null : "conflict";

  if (s === b) return null;

  return l === b ? "updated" : "conflict";
}

const changed = (a: Record<string, unknown>, b: Record<string, unknown>, keys: readonly string[]) => keys.filter((k) => k !== "id" && hashJson(a[k]) !== hashJson(b[k]));

export function classify(ctx: SyncContext): SyncItem[] {
  const toLocal = sourceToLocalMap(ctx);

  const toSource = localToSourceMap(ctx);

  const sourceIndex = new Map<string, { table: BundleTable; row: Row }>();

  for (const t of BUNDLE_TABLES) for (const row of ctx.sourceBundle[t.key]) sourceIndex.set(row.id, { table: t.key, row });

  const items: SyncItem[] = [];

  const isIgnored = (scope: string, key: string, s: string | null) => {
    const v = scope === "rules" ? ctx.ignored.rules[key] : scope === "settings" ? ctx.ignored.settings : ctx.ignored.tables[scope as BundleTable]?.[key];

    return v !== undefined && v === (s ?? IGNORED_DELETED);
  };

  for (const t of BUNDLE_TABLES) items.push(...classifyTable(ctx, t, { toLocal, toSource, sourceIndex, isIgnored }));

  items.push(...classifyRules(ctx, isIgnored), ...classifySettings(ctx, isIgnored));

  return items;
}

type Helpers = {
  toLocal: Map<string, string>;
  toSource: Map<string, string>;
  sourceIndex: Map<string, { table: BundleTable; row: Row }>;
  isIgnored: (scope: string, key: string, s: string | null) => boolean;
};

function classifyTable(ctx: SyncContext, t: BundleTableDef, h: Helpers): SyncItem[] {
  const sourceRows = new Map(ctx.sourceBundle[t.key].map((r) => [r.id, r]));

  const localRows = new Map(ctx.target.rows.filter((r) => r.table === t.key && r.row.sourceId).map((r) => [r.row.sourceId!, r.row]));

  const base = ctx.baseline.tables[t.key] ?? {};

  const keys = new Set([...sourceRows.keys(), ...Object.keys(base), ...localRows.keys()]);

  const out: SyncItem[] = [];

  for (const key of keys) {
    const src = sourceRows.get(key);

    const loc = localRows.get(key);

    const b = base[key];

    const s = src ? rowHash(src, t) : null;

    const locInSource = loc ? (remapIds(pick(loc, t.columns), h.toSource) as Row) : null;

    const l = locInSource ? rowHash(locInSource, t) : null;

    let status: SyncStatus | null;

    let visible = true;

    if (s && l) status = pairStatus(s, b, l);
    else if (!s && l) status = "deletedInSource";
    else if (s && !l) {
      status = b === undefined ? "new" : "deletedLocally";
      visible = b === undefined || s !== b;
    } else status = null;

    if (!status) continue;

    const requires =
      src && status !== "deletedInSource"
        ? [...collectKeysAndStrings(src)]
            .filter((v) => v !== key && h.sourceIndex.has(v) && !h.toLocal.has(v))
            .map((v) => ({ scope: h.sourceIndex.get(v)!.table, key: v, name: rowName(h.sourceIndex.get(v)!.row) }))
        : [];

    out.push({
      scope: t.key,
      key,
      localId: loc?.id ?? null,
      name: rowName(src ?? loc!),
      status,
      changedFields: src && locInSource ? changed(src, locInSource, t.columns) : [],
      sourceHash: s,
      requires,
      visible,
      ignored: h.isIgnored(t.key, key, s),
    });
  }

  return out;
}

function classifyRules(ctx: SyncContext, isIgnored: Helpers["isIgnored"]): SyncItem[] {
  const src = parseRules(ctx.sourceBundle.rules) as Record<string, unknown>;

  const loc = parseRules(ctx.target.rules) as Record<string, unknown>;

  return MECHANIC_KEYS.flatMap((key): SyncItem[] => {
    const s = hashJson(src[key]);

    const status = pairStatus(s, ctx.baseline.rules[key], hashJson(loc[key]));

    if (!status) return [];

    const a = (src[key] ?? {}) as Record<string, unknown>;

    const b = (loc[key] ?? {}) as Record<string, unknown>;

    return [{ scope: "rules", key, localId: null, name: MECHANIC_REGISTRY[key].label, status, changedFields: changed(a, b, [...new Set([...Object.keys(a), ...Object.keys(b)])]), sourceHash: s, requires: [], visible: true, ignored: isIgnored("rules", key, s) }];
  });
}

function classifySettings(ctx: SyncContext, isIgnored: Helpers["isIgnored"]): SyncItem[] {
  const keys = ["maxLevel", "xpMultiplier", "allowPlayerEdit", "friendlyFire"] as const;

  const s = hashJson(pick(ctx.sourceBundle.settings, keys));

  const status = pairStatus(s, ctx.baseline.settings, hashJson(pick(ctx.target.settings, keys)));

  if (!status) return [];

  return [{ scope: "settings", key: "settings", localId: null, name: "Налаштування кампанії", status, changedFields: changed(ctx.sourceBundle.settings, ctx.target.settings, keys), sourceHash: s, requires: [], visible: true, ignored: isIgnored("settings", "settings", s) }];
}
```

Хеш налаштувань тут — `hashJson(pick(settings, keys))`. Переконатися, що `settingsHash` з Task 1 дає той самий результат (`hashJson({ maxLevel, xpMultiplier, allowPlayerEdit, friendlyFire })`). Найкраще викликати `settingsHash` і тут, щоб не мати двох формул.

Run: `pnpm test:run lib/server/templates/sync/__tests__/classify.test.ts` → PASS.

- [ ] **Step 4: Контекст**

`lib/server/templates/sync/context.ts`:

```ts
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { BUNDLE_TABLES, delegateOf, type TemplateDb } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { baselineFromBundle } from "@/lib/server/templates/sync/hash";
import type { LocalRow, SyncContext, SyncState, TableHashes } from "@/lib/server/templates/sync/types";

export type SyncDb = TemplateDb & Pick<Prisma.TransactionClient, "campaignSourceSync" | "character">;

const asState = (v: unknown): SyncState => {
  const o = (v ?? {}) as Partial<SyncState>;

  return { tables: o.tables ?? {}, rules: o.rules ?? {}, settings: o.settings };
};

export async function loadSyncContext(db: SyncDb, campaignId: string): Promise<SyncContext> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { createdFromId: true, maxLevel: true, xpMultiplier: true, allowPlayerEdit: true, friendlyFire: true, rules: true },
  });

  if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  if (!campaign.createdFromId) throw new ContentError(API_ERRORS.SOURCE_NONE, 404);

  const source = await db.campaign.findUnique({ where: { id: campaign.createdFromId }, select: { id: true, name: true, kind: true, visibility: true } });

  if (!source) throw new ContentError(API_ERRORS.SOURCE_NOT_FOUND, 404);

  const [sourceBundle, rows, state] = await Promise.all([
    exportCampaign(db, source.id),
    loadTargetRows(db, campaignId),
    db.campaignSourceSync.findUnique({ where: { campaignId } }),
  ]);

  const { maxLevel, xpMultiplier, allowPlayerEdit, friendlyFire, rules } = campaign;

  return {
    campaignId,
    source,
    sourceBundle,
    target: { settings: { maxLevel, xpMultiplier, allowPlayerEdit, friendlyFire }, rules, rows: rows.map(({ table, row }) => ({ table, row })) },
    baseline: state && state.sourceCampaignId === source.id ? asState(state.baseline) : fallbackBaseline(sourceBundle, rows),
    ignored: state && state.sourceCampaignId === source.id ? asState(state.ignored) : { tables: {}, rules: {} },
    hasState: !!state,
    syncedAt: state?.syncedAt ?? null,
  };
}

type LoadedRow = LocalRow & { sourceHash: string | null };

async function loadTargetRows(db: TemplateDb, campaignId: string): Promise<LoadedRow[]> {
  const out: LoadedRow[] = [];

  for (const t of BUNDLE_TABLES) {
    const rows = await delegateOf(db, t).findMany({
      where: { campaignId },
      select: Object.fromEntries([...t.columns, "sourceId", "sourceHash"].map((c) => [c, true])),
    });

    for (const { sourceHash, ...row } of rows) out.push({ table: t.key, row: row as LocalRow["row"], sourceHash: (sourceHash as string | null) ?? null });
  }

  return out;
}

// campaigns cloned before stage 3: rows' sourceHash is the baseline, rules/settings count as synced
function fallbackBaseline(sourceBundle: SyncContext["sourceBundle"], rows: LoadedRow[]): SyncState {
  const tables: TableHashes = {};

  for (const r of rows) if (r.row.sourceId && r.sourceHash) (tables[r.table] ??= {})[r.row.sourceId] = r.sourceHash;

  return baselineFromBundle(sourceBundle, tables);
}
```

`API_ERRORS.CAMPAIGN_NOT_FOUND` уже існує (використовується в `lib/server/campaigns/rules.ts`). Якщо `ContentError` чи `API_ERRORS` тягнуть `server-only` — перевірити: `lib/server/content/errors.ts` його не імпортує, тож tsx-скрипт працюватиме.

Окремого тесту для `context.ts` немає. Його покривають тест у Task 3 (через фейкову БД) і живий прогін у Task 6.

- [ ] **Step 5: Commit**

```bash
git add lib/server/templates/sync lib/constants/api-errors.ts
git commit -m "feat(constructor): source sync context + three-way classifier

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Застосування й ігнорування

**Files:**
- Create: `lib/server/templates/sync/apply.ts`, `lib/server/templates/sync/usage.ts`
- Create: `lib/server/templates/sync/__tests__/fake-sync-db.ts`
- Test: `lib/server/templates/sync/__tests__/apply.test.ts`
- Modify: `types/campaigns.ts`

**Interfaces:**
- Consumes: `loadSyncContext`, `SyncDb`, `classify`, `sourceToLocalMap`, `rowName`, `toPrismaJson`, `rulesHashes`, `settingsHash`, `IGNORED_DELETED`.
- Produces:

```ts
// types/campaigns.ts
export type SyncRef = { scope: string; key: string; sourceHash: string | null };
export type SourceDiffItem = {
  scope: string; key: string; localId: string | null; name: string;
  status: "new" | "updated" | "conflict" | "deletedInSource" | "deletedLocally";
  changedFields: string[]; sourceHash: string | null;
  requires: Array<{ scope: string; key: string; name: string }>;
  usage?: { characters: number; content: number };
};
export type SourceDiff = { source: { id: string; name: string; kind: string }; syncedAt: string | null; items: SourceDiffItem[] };
export type SourceApplyResult = { applied: number; ignored: number; autoAdded: Array<{ scope: string; key: string; name: string }>; warnings: string[] };
```

- `applySourceChanges(db: SyncDb, campaignId: string, body: { apply: SyncRef[]; ignore: SyncRef[] }): Promise<SourceApplyResult>` — викликається всередині транзакції;
- `buildDiff(db: SyncDb, ctx: SyncContext, scope?: string): Promise<SourceDiff>` (у `usage.ts`, разом з `usage`).

- [ ] **Step 1: Фейкова БД**

`lib/server/templates/sync/__tests__/fake-sync-db.ts` — розширення ідеї `lib/server/templates/__tests__/fake-db.ts`. Сховище `Map<delegate, Row[]>` для всіх `BUNDLE_TABLES` плюс:
- `campaign` — масив рядків кампаній;
- `campaignSourceSync` — `Map`;
- `character` — масив.

Методи, які викликають `exportCampaign`, `loadSyncContext` і `apply`:
- `campaign.findUnique({ where: { id }, select })` — повертає рядок або `null`;
- `campaign.update({ where: { id }, data })` — `Object.assign`;
- для кожної таблиці:
  - `findMany({ where: { campaignId } | { id: { in } }, select?, orderBy? })` — фільтр за `campaignId`, повертає копії; `select` можна ігнорувати, бо зайві поля відкидає `pick`, але `sourceId`/`sourceHash` мусять бути в рядках;
  - `createMany({ data })` — пуш, `Prisma.DbNull` → `null`;
  - `update({ where: { id }, data })`;
  - `deleteMany({ where: { id, campaignId } })` → `{ count }`;
- `campaignSourceSync.findUnique({ where: { campaignId } })`, `upsert({ where, create, update })`;
- `character.findMany({ where: { campaignId } })`.

Експорт: `createFakeSyncDb()` → `{ db: SyncDb, store, campaigns, syncs }` і хелпер `clone(db, sourceId, targetId)`, який робить те саме, що й `createCampaignFromBundle`:

```ts
export async function clone(db: SyncDb, sourceId: string, targetId: string) {
  const bundle = await exportCampaign(db, sourceId);

  campaigns.push({ id: targetId, createdFromId: sourceId, name: "T", kind: "campaign", visibility: "private", ...bundle.settings, rules: bundle.rules });

  const { hashes } = await importBundle(db, bundle, targetId);

  await db.campaignSourceSync.upsert({ where: { campaignId: targetId }, create: { campaignId: targetId, sourceCampaignId: sourceId, baseline: baselineFromBundle(bundle, hashes) }, update: {} });
}
```

`importBundle` викликає `findForeignContentIds` → `findMany({ where: { id: { in } } })`. Рядки джерела в тій самій фейковій БД, але їхні id входять в `idMap.keys()` (власні), тож це не помилка.

- [ ] **Step 2: Падаючі тести apply**

`lib/server/templates/sync/__tests__/apply.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { ContentError } from "@/lib/server/content/errors";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { clone, createFakeSyncDb } from "./fake-sync-db";

const id = (ch: string) => "c" + ch.repeat(24);
const SRC = "src", TGT = "tgt";
const RACE = id("r"), UNIT = id("u"), SPELL = id("s"), SPELL2 = id("t");

let f: ReturnType<typeof createFakeSyncDb>;

const visible = async () => classify(await loadSyncContext(f.db, TGT)).filter((i) => i.visible && !i.ignored);
const ref = (i: { scope: string; key: string; sourceHash: string | null }) => ({ scope: i.scope, key: i.key, sourceHash: i.sourceHash });
const rows = (delegate: string, campaignId: string) => f.store.get(delegate)!.filter((r) => r.campaignId === campaignId);

beforeEach(async () => {
  f = createFakeSyncDb();
  f.addCampaign({ id: SRC, kind: "template" });
  f.addRow("race", { id: RACE, campaignId: SRC, name: "Haven" });
  f.addRow("unit", { id: UNIT, campaignId: SRC, name: "Archer", raceId: RACE, knownSpells: [SPELL] });
  f.addRow("spell", { id: SPELL, campaignId: SRC, name: "Bless" });
  await clone(f.db, SRC, TGT);
});

describe("applySourceChanges", () => {
  it("fresh clone → empty diff", async () => {
    expect(await visible()).toEqual([]);
  });

  it("applies an update in place, keeping the local id", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    const localId = item.localId!;

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(rows("spell", TGT)).toEqual([expect.objectContaining({ id: localId, name: "Bless II" })]);
    expect(await visible()).toEqual([]);
  });

  it("adds a new unit with its new race and remaps knownSpells to local ids", async () => {
    const R2 = id("q"), U2 = id("w");

    f.addRow("race", { id: R2, campaignId: SRC, name: "Inferno" });
    f.addRow("unit", { id: U2, campaignId: SRC, name: "Imp", raceId: R2, knownSpells: [SPELL] });

    const unit = (await visible()).find((i) => i.key === U2)!;

    const res = await applySourceChanges(f.db, TGT, { apply: [ref(unit)], ignore: [] });

    expect(res.autoAdded).toEqual([expect.objectContaining({ key: R2 })]);

    const localSpell = rows("spell", TGT)[0].id;

    const imp = rows("unit", TGT).find((u) => u.name === "Imp")!;

    const inferno = rows("race", TGT).find((r) => r.name === "Inferno")!;

    expect(imp).toMatchObject({ raceId: inferno.id, knownSpells: [localSpell], sourceId: U2 });
    expect(JSON.stringify(rows("unit", TGT))).not.toContain(SPELL);
    expect(await visible()).toEqual([]);
  });

  it("deletes on deletedInSource and drops the baseline key", async () => {
    f.removeRow("spell", SPELL);
    f.patchRow("unit", UNIT, { knownSpells: [] });

    const items = await visible();

    await applySourceChanges(f.db, TGT, { apply: items.map(ref), ignore: [] });

    expect(rows("spell", TGT)).toEqual([]);
    expect(await visible()).toEqual([]);
  });

  it("re-adds a locally deleted row when chosen", async () => {
    const local = rows("spell", TGT)[0];

    f.removeRow("spell", local.id as string);
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    expect(item.status).toBe("deletedLocally");

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(rows("spell", TGT)).toEqual([expect.objectContaining({ name: "Bless II", sourceId: SPELL })]);
  });

  it("ignore hides until the next source change", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    await applySourceChanges(f.db, TGT, { apply: [], ignore: [ref(item)] });

    expect(await visible()).toEqual([]);

    f.patchRow("spell", SPELL, { name: "Bless III" });

    expect(await visible()).toHaveLength(1);
  });

  it("stale sourceHash → 409, nothing written", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    f.patchRow("spell", SPELL, { name: "Bless III" });

    await expect(applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] })).rejects.toMatchObject({ status: 409 });
    expect(rows("spell", TGT)[0].name).toBe("Bless");
  });

  it("applies rules per mechanic and settings", async () => {
    f.patchCampaign(SRC, { maxLevel: 10, rules: { morale: { enabled: false } } });

    const items = await visible();

    await applySourceChanges(f.db, TGT, { apply: items.map(ref), ignore: [] });

    const tgt = f.campaign(TGT);

    expect(tgt.maxLevel).toBe(10);
    expect((tgt.rules as { morale: { enabled: boolean } }).morale.enabled).toBe(false);
    expect(await visible()).toEqual([]);
  });

  it("unknown key → 409", async () => {
    await expect(applySourceChanges(f.db, TGT, { apply: [{ scope: "spells", key: id("z"), sourceHash: "x" }], ignore: [] })).rejects.toBeInstanceOf(ContentError);
  });
});
```

Хелпери фейкової БД, які використовуються вище: `addCampaign`, `addRow`, `patchRow`, `removeRow`, `patchCampaign`, `campaign(id)`. Реалізувати їх у `fake-sync-db.ts`. `addCampaign` ставить налаштування за замовчуванням (`maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false, rules: {}`). Поле `enabled` моралі звірити зі схемою, як у Task 2.

Run: `pnpm test:run lib/server/templates/sync/__tests__/apply.test.ts` → FAIL.

- [ ] **Step 3: Реалізація `apply.ts`**

```ts
import { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { assertNoLeak } from "@/lib/server/templates/assert-no-leak";
import { BUNDLE_TABLES, delegateOf, pick } from "@/lib/server/templates/bundle";
import { newContentId } from "@/lib/server/templates/ids";
import { toPrismaJson } from "@/lib/server/templates/import-bundle";
import { remapIds } from "@/lib/server/templates/remap-ids";
import { classify, sourceToLocalMap } from "@/lib/server/templates/sync/classify";
import { loadSyncContext, type SyncDb } from "@/lib/server/templates/sync/context";
import { IGNORED_DELETED, type SyncContext, type SyncItem, type SyncState } from "@/lib/server/templates/sync/types";
import { parseRules } from "@/lib/utils/rules/schema";
import type { SourceApplyResult, SyncRef } from "@/types/campaigns";

const keyOf = (i: { scope: string; key: string }) => `${i.scope}:${i.key}`;

export async function applySourceChanges(db: SyncDb, campaignId: string, body: { apply: SyncRef[]; ignore: SyncRef[] }): Promise<SourceApplyResult> {
  const ctx = await loadSyncContext(db, campaignId);

  const all = new Map(classify(ctx).map((i) => [keyOf(i), i]));

  const pickItems = (refs: SyncRef[]) =>
    refs.map((r) => {
      const item = all.get(keyOf(r));

      if (!item || item.sourceHash !== r.sourceHash) throw new ContentError(API_ERRORS.SOURCE_CHANGED, 409);

      return item;
    });

  const chosen = pickItems(body.apply);

  const ignored = pickItems(body.ignore);

  const { selected, autoAdded } = closeOverRequires(chosen, all);

  const warnings = await writeTables(db, ctx, selected);

  await writeCampaign(db, ctx, selected);

  await saveState(db, ctx, selected, ignored);

  return { applied: selected.length, ignored: ignored.length, autoAdded: autoAdded.map(({ scope, key, name }) => ({ scope, key, name })), warnings };
}

function closeOverRequires(chosen: SyncItem[], all: Map<string, SyncItem>) {
  const selected = new Map(chosen.map((i) => [keyOf(i), i]));

  const autoAdded: SyncItem[] = [];

  const queue = [...chosen];

  while (queue.length > 0) {
    for (const req of queue.pop()!.requires) {
      const k = keyOf(req);

      const dep = all.get(k);

      if (selected.has(k) || !dep || (dep.status !== "new" && dep.status !== "deletedLocally")) continue;

      selected.set(k, dep);
      autoAdded.push(dep);
      queue.push(dep);
    }
  }

  return { selected: [...selected.values()], autoAdded };
}

async function writeTables(db: SyncDb, ctx: SyncContext, selected: SyncItem[]): Promise<string[]> {
  const warnings: string[] = [];

  const map = sourceToLocalMap(ctx);

  const creates = selected.filter((i) => i.status === "new" || i.status === "deletedLocally");

  for (const i of creates) map.set(i.key, newContentId());

  const sourceIds = new Set(BUNDLE_TABLES.flatMap((t) => ctx.sourceBundle[t.key].map((r) => r.id)));

  const byKey = new Map(selected.map((i) => [keyOf(i), i]));

  const written: unknown[] = [];

  for (const t of BUNDLE_TABLES) {
    const sourceRows = ctx.sourceBundle[t.key].filter((r) => byKey.has(`${t.key}:${r.id}`));

    const toCreate: Record<string, unknown>[] = [];

    for (const src of sourceRows) {
      const item = byKey.get(`${t.key}:${src.id}`)!;

      const clean = pick(src, t.columns);

      for (const col of Object.keys(t.fks)) {
        const ref = clean[col];

        if (typeof ref === "string" && !map.has(ref)) {
          warnings.push(`${t.key} ${item.name}: ${col} → null`);
          clean[col] = null;
        }
      }

      const { id: _id, ...data } = remapIds(clean, map);

      written.push(data);

      if (item.localId) {
        await delegateOf(db, t).update({ where: { id: item.localId }, data: toPrismaJson({ ...data, sourceHash: item.sourceHash }, t) });
      } else {
        toCreate.push(toPrismaJson({ ...data, id: map.get(src.id), campaignId: ctx.campaignId, sourceId: src.id, sourceHash: item.sourceHash }, t));
      }
    }

    if (toCreate.length > 0) await delegateOf(db, t).createMany({ data: toCreate });
  }

  assertNoLeak(written, sourceIds);

  for (const t of [...BUNDLE_TABLES].reverse()) {
    for (const i of selected) {
      if (i.scope === t.key && i.status === "deletedInSource" && i.localId) await delegateOf(db, t).deleteMany({ where: { id: i.localId, campaignId: ctx.campaignId } });
    }
  }

  return warnings;
}
```

Примітки до `writeTables`:
- `update` використовує `where: { id: localId }`: `localId` отримано з рядків цілі, завантажених за `campaignId`, тож він гарантовано належить цій кампанії;
- `RowDelegate` у `bundle.ts` не має `update` / `deleteMany` — розширити інтерфейс: `update(args: { where: { id: string }; data: unknown }): Promise<unknown>; deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>`;
- `_id` у деструктуризації: якщо lint лається на невикористану змінну, використати `const data = remapIds(clean, map); delete data.id;`, але з типом `Record<string, unknown>`.

```ts
async function writeCampaign(db: SyncDb, ctx: SyncContext, selected: SyncItem[]) {
  const rules = selected.filter((i) => i.scope === "rules");

  const settings = selected.some((i) => i.scope === "settings");

  if (rules.length === 0 && !settings) return;

  const src = parseRules(ctx.sourceBundle.rules) as Record<string, unknown>;

  const next = { ...(parseRules(ctx.target.rules) as Record<string, unknown>) };

  for (const r of rules) next[r.key] = src[r.key];

  await db.campaign.update({
    where: { id: ctx.campaignId },
    data: { ...(rules.length > 0 && { rules: next as Prisma.InputJsonObject }), ...(settings && ctx.sourceBundle.settings) },
  });
}

async function saveState(db: SyncDb, ctx: SyncContext, selected: SyncItem[], ignored: SyncItem[]) {
  const baseline: SyncState = { tables: structuredClone(ctx.baseline.tables), rules: { ...ctx.baseline.rules }, settings: ctx.baseline.settings };

  const ign: SyncState = { tables: structuredClone(ctx.ignored.tables), rules: { ...ctx.ignored.rules }, settings: ctx.ignored.settings };

  const set = (state: SyncState, i: SyncItem, value: string | undefined) => {
    if (i.scope === "rules") {
      if (value === undefined) delete state.rules[i.key];
      else state.rules[i.key] = value;
    } else if (i.scope === "settings") state.settings = value;
    else {
      const table = (state.tables[i.scope] ??= {});

      if (value === undefined) delete table[i.key];
      else table[i.key] = value;
    }
  };

  for (const i of selected) {
    set(baseline, i, i.status === "deletedInSource" ? undefined : i.sourceHash!);
    set(ign, i, undefined);
  }

  for (const i of ignored) set(ign, i, i.sourceHash ?? IGNORED_DELETED);

  // deleted on both sides: no S, no local row
  const sourceIds = new Set(BUNDLE_TABLES.flatMap((t) => ctx.sourceBundle[t.key].map((r) => r.id)));

  const linked = new Set(ctx.target.rows.map((r) => r.row.sourceId));

  for (const t of BUNDLE_TABLES) for (const k of Object.keys(baseline.tables[t.key] ?? {})) if (!sourceIds.has(k) && !linked.has(k)) delete baseline.tables[t.key]![k];

  const data = { sourceCampaignId: ctx.source.id, baseline: baseline as Prisma.InputJsonObject, ignored: ign as Prisma.InputJsonObject, syncedAt: new Date() };

  await db.campaignSourceSync.upsert({ where: { campaignId: ctx.campaignId }, create: { campaignId: ctx.campaignId, ...data }, update: data });
}
```

`settings === undefined` у JSON просто зникне — це нормально.

Run: `pnpm test:run lib/server/templates/sync/__tests__/apply.test.ts` → PASS.

- [ ] **Step 4: `usage.ts` і `buildDiff`**

```ts
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import { classify } from "@/lib/server/templates/sync/classify";
import type { SyncDb } from "@/lib/server/templates/sync/context";
import type { SyncContext } from "@/lib/server/templates/sync/types";
import type { SourceDiff, SourceDiffItem } from "@/types/campaigns";

export async function buildDiff(db: SyncDb, ctx: SyncContext, scope?: string): Promise<SourceDiff> {
  const items = classify(ctx).filter((i) => i.visible && !i.ignored && (!scope || i.scope === scope));

  const deleted = items.filter((i) => i.status === "deletedInSource" && i.localId);

  const usage = deleted.length > 0 ? await countUsage(db, ctx, new Set(deleted.map((i) => i.localId!))) : new Map();

  return {
    source: { id: ctx.source.id, name: ctx.source.name, kind: ctx.source.kind },
    syncedAt: ctx.syncedAt?.toISOString() ?? null,
    items: items.map(({ visible: _v, ignored: _i, ...i }): SourceDiffItem => ({ ...i, ...(i.localId && usage.has(i.localId) && { usage: usage.get(i.localId) }) })),
  };
}

async function countUsage(db: SyncDb, ctx: SyncContext, ids: Set<string>) {
  const out = new Map<string, { characters: number; content: number }>(Array.from(ids, (id) => [id, { characters: 0, content: 0 }]));

  for (const r of ctx.target.rows) {
    for (const s of collectKeysAndStrings(r.row)) if (s !== r.row.id && out.has(s)) out.get(s)!.content++;
  }

  const characters = await db.character.findMany({ where: { campaignId: ctx.campaignId }, include: { characterSkills: true } });

  for (const c of characters) {
    const seen = collectKeysAndStrings(c);

    for (const id of ids) if (seen.has(id)) out.get(id)!.characters++;
  }

  return out;
}
```

Тест у `apply.test.ts`:

```ts
it("buildDiff reports usage for deletedInSource", async () => {
  f.removeRow("spell", SPELL);

  const ctx = await loadSyncContext(f.db, TGT);

  const diff = await buildDiff(f.db, ctx);

  expect(diff.items.find((i) => i.status === "deletedInSource")!.usage).toEqual({ characters: 0, content: 1 });
});
```

`content: 1`, бо локальний юніт має `knownSpells: [локальне заклинання]`. Фейковий `character.findMany` повертає `[]`. `BUNDLE_TABLES` в `usage.ts` не потрібен — прибрати імпорт, якщо lint скаже.

Run → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/server/templates types/campaigns.ts
git commit -m "feat(constructor): apply/ignore source changes with dependency closure

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Сервіс, операції REST/OpenAPI

**Files:**
- Create: `lib/server/templates/sync/service.ts`, `lib/schemas/source-sync.ts`, `app/api/campaigns/[id]/source-sync/route.ts`
- Modify: `lib/server/content/operations.ts`, `lib/schemas/index.ts` (якщо є barrel і схеми там реекспортуються)
- Test: `app/api/__tests__/source-sync-api.test.ts`

**Interfaces:**
- Consumes: `loadSyncContext`, `buildDiff`, `applySourceChanges`, `SyncDb`.
- Produces:
  - `getSourceDiff(actor: Actor, scope?: string): Promise<SourceDiff>`;
  - `applySource(actor: Actor, body: SourceSyncApplyInput): Promise<SourceApplyResult>`;
  - `sourceSyncApplySchema`, `type SourceSyncApplyInput`;
  - `CONTENT_OPERATIONS["source.diff"]`, `CONTENT_OPERATIONS["source.apply"]`.

- [ ] **Step 1: Схема**

`lib/schemas/source-sync.ts`:

```ts
import { z } from "zod";

const ref = z.strictObject({ scope: z.string().min(1).max(40), key: z.string().min(1).max(64), sourceHash: z.string().max(128).nullable() });

export const sourceSyncApplySchema = z.strictObject({
  apply: z.array(ref).max(5000).default([]),
  ignore: z.array(ref).max(5000).default([]),
});

export type SourceSyncApplyInput = z.infer<typeof sourceSyncApplySchema>;
```

- [ ] **Step 2: Операції**

У `OPERATION_ROWS` (`lib/server/content/operations.ts`), після `campaign.export`:

```ts
  "source.diff": { method: "GET", path: "/source-sync", summary: "Зміни в джерелі", description: "Різниця між кампанією і шаблоном (або кампанією), з якого її створено: нові, оновлені, конфліктні й видалені записи, правила по механіках, налаштування. query scope — лише одна таблиця.", need: NEED.read("dm"), response: "object", tag: "Кампанія" },
  "source.apply": { method: "POST", path: "/source-sync", summary: "Застосувати зміни джерела", description: "apply — пункти з diff (scope, key, sourceHash), які взяти з джерела; залежності додаються автоматично. ignore — сховати пункти до наступної зміни джерела. 409 — джерело змінилося, візьміть свіжий diff.", need: NEED.write, body: sourceSyncApplySchema, response: "object", errors: [409], tag: "Кампанія" },
```

Якщо `ContentOperation` вимагає `query` для `scope` — додати `query: z.object({ scope: z.string().optional() })` за зразком наявних операцій з `query`.

- [ ] **Step 3: Сервіс**

`lib/server/templates/sync/service.ts`:

```ts
import "server-only";
import { ReferenceKind, invalidateReference } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { buildDiff } from "@/lib/server/templates/sync/usage";
import type { SourceSyncApplyInput } from "@/lib/schemas/source-sync";
import type { Actor } from "@/lib/utils/api/actor";
import { isDmMember } from "@/lib/utils/api/is-dm";
import type { SourceApplyResult, SourceDiff } from "@/types/campaigns";

async function assertCanReadSource(userId: string, campaignId: string): Promise<void> {
  const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { createdFromId: true } });

  if (!c?.createdFromId) return; // loadSyncContext throws SOURCE_NONE

  const source = await prisma.campaign.findUnique({ where: { id: c.createdFromId }, select: { visibility: true, members: { where: { userId } } } });

  if (!source) return; // loadSyncContext throws SOURCE_NOT_FOUND

  if (source.visibility !== CampaignVisibility.OFFICIAL && !isDmMember(source.members)) throw new ContentError(API_ERRORS.SOURCE_FORBIDDEN, 403);
}

export async function getSourceDiff(actor: Actor, scope?: string): Promise<SourceDiff> {
  assertCan(actor, CONTENT_OPERATIONS["source.diff"].need);
  await assertCanReadSource(actor.userId, actor.campaignId);

  return buildDiff(prisma, await loadSyncContext(prisma, actor.campaignId), scope);
}

export async function applySource(actor: Actor, body: SourceSyncApplyInput): Promise<SourceApplyResult> {
  assertCan(actor, CONTENT_OPERATIONS["source.apply"].need);
  await assertCanReadSource(actor.userId, actor.campaignId);

  const result = await prisma.$transaction((tx) => applySourceChanges(tx, actor.campaignId, body), { timeout: 60_000, maxWait: 10_000 });

  invalidateReference(Object.values(ReferenceKind), actor.campaignId);

  return result;
}
```

Звірити шлях і сигнатуру `isDmMember` (`lib/utils/api/is-dm`, використовується в `create-campaign.ts`). `CampaignVisibility.OFFICIAL` — з `lib/constants/campaigns`.

- [ ] **Step 4: Роут**

`app/api/campaigns/[id]/source-sync/route.ts`:

```ts
import { NextResponse } from "next/server";

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["source.diff"], async ({ actor, req }) =>
  NextResponse.json(await getSourceDiff(actor, new URL(req.url).searchParams.get("scope") ?? undefined), { headers: PRIVATE_NO_STORE_HEADERS }),
);

export const POST = operationRoute(CONTENT_OPERATIONS["source.apply"], async ({ actor, body }) => NextResponse.json(await applySource(actor, body)));
```

`TemplateLeakError` з `assertNoLeak` перетвориться на 500 через `handleApiError`. Так і має бути: це баг, а не помилка користувача.

- [ ] **Step 5: Тест роуту**

`app/api/__tests__/source-sync-api.test.ts` — за зразком `app/api/__tests__/campaign-rules-api.test.ts`: замокати `@/lib/server/templates/sync/service`, `resolveActor` (або `requireDM`, як у зразку) і перевірити:
- `GET` повертає `getSourceDiff(...)` і передає `scope` з query;
- `POST` з некоректним тілом (`{ apply: "x" }`) → 400 і сервіс не викликано;
- `POST` з `{ apply: [{ scope: "spells", key: "k", sourceHash: "h" }] }` → 200 і `applySource` викликано з `ignore: []`;
- `ContentError(…, 409)` із сервісу → статус 409 і `{ error }`;
- Bearer-токен без `content:write` на `POST` → 403 (як у наявних тестах токенів, якщо вони мокають `verifyApiToken`).

Окремий тест сервісу на 403 до джерела (`lib/server/templates/sync/__tests__/service.test.ts`): замокати `@/lib/db` (`campaign.findUnique` повертає ціль з `createdFromId: "s"`, потім приватне джерело без членства) → `getSourceDiff(actor)` кидає `ContentError` зі статусом 403. Для офіційного джерела помилки немає (замокати `loadSyncContext` / `buildDiff`).

Run: `pnpm test:related lib/server/content/operations.ts lib/server/templates/sync/service.ts` → PASS, разом із `lib/server/content/__tests__/operations.test.ts` і `openapi.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/source-sync.ts lib/server/content/operations.ts lib/server/templates/sync/service.ts "app/api/campaigns/[id]/source-sync" app/api/__tests__/source-sync-api.test.ts lib/server/templates/sync/__tests__
git commit -m "feat(constructor): source-sync REST operations + service access checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: MCP-інструменти

**Files:**
- Modify: `lib/ai/tools/content.ts` (додати до `CONTENT_TOOLS`)
- Test: `lib/ai/tools/__tests__/` — доповнити наявний тест контент-інструментів (знайти файл з `CONTENT_TOOLS` / `toolsFor`)

**Interfaces:**
- Consumes: `getSourceDiff`, `applySource`, `sourceSyncApplySchema`, `toolActor`, `defineTool`, `parseInput`.
- Produces: інструменти `source_diff` (`content:read`) і `source_apply` (`content:write`).

- [ ] **Step 1: Інструменти**

У `lib/ai/tools/content.ts`, за зразком `getRulesTool` / `updateRulesTool`:

```ts
export const sourceDiffTool = defineTool({
  name: "source_diff",
  title: "Зміни в джерелі кампанії",
  description:
    "Що змінилося в шаблоні (або кампанії), з якого створено цю кампанію: items зі scope (таблиця, rules або settings), key, name, status (new | updated | conflict | deletedInSource | deletedLocally), changedFields, sourceHash, requires. Для застосування передай scope/key/sourceHash у source_apply. Великий список — фільтр scope.",
  scopes: ["content:read"],
  input: z.object({ scope: z.string().optional() }),
  handler: (ctx, { scope }) => getSourceDiff(toolActor(ctx), scope),
});

export const sourceApplyTool = defineTool({
  name: "source_apply",
  title: "Застосувати зміни джерела",
  description:
    "apply — пункти з source_diff, які взяти з джерела (залежності додаються самі, див. autoAdded); ignore — сховати пункти до наступної зміни джерела. Конфлікт у apply = взяти версію джерела замість своєї. Помилка «Джерело змінилося» — повтори source_diff.",
  scopes: ["content:write"],
  input: z.object({ apply: z.array(z.unknown()).optional(), ignore: z.array(z.unknown()).optional() }),
  handler: (ctx, input) => applySource(toolActor(ctx), parseInput(sourceSyncApplySchema, input)),
});
```

Додати обидва в масив `CONTENT_TOOLS`. Якщо результат handler-а серіалізується `runTool` і перевищує `AI_LIMITS.toolResultChars`, перевірити, як `runTool` обрізає. Тоді в `source_diff` при перевищенні повернути рядок: «Змін забагато (N) — виклич з scope: <список scope з кількостями>».

- [ ] **Step 2: Тест**

У наявному тесті переліку інструментів за правами (`toolsFor`): `source_diff` є для `["content:read"]`, `source_apply` — лише для `["content:write"]`. Тест handler-а `source_apply` з мокнутим сервісом: невалідне тіло → помилка валідації текстом.

Run: `pnpm test:related lib/ai/tools/content.ts` → PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/tools
git commit -m "feat(constructor): MCP tools source_diff / source_apply

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Живий прогін на БД `constructor` + повна перевірка

**Files:**
- Create: `scripts/constructor/source-sync-check.ts`

**Interfaces:**
- Consumes: `createCampaignFromBundle`, `exportCampaign`, `loadSyncContext`, `buildDiff`, `applySourceChanges` (усе без `server-only`).

- [ ] **Step 1: Скрипт**

`scripts/constructor/source-sync-check.ts` (запуск `pnpm exec tsx scripts/constructor/source-sync-check.ts <templateId> <userId>`, `DATABASE_URL` з `.env.local`):
1. Створити кампанію з шаблону: `exportCampaign(prisma, templateId)` → `createCampaignFromBundle({ userId, name: "ТЕСТ sync", bundle, createdFromId: templateId })`.
2. `buildDiff` → очікується 0 пунктів. Інакше вивести перші 5 і `process.exit(1)`.
3. У шаблоні (прямим `prisma`, у транзакції, яку потім відкотимо — або запам'ятати старі значення і повернути):
   - змінити `name` першого заклинання (+ « (sync)»);
   - додати расу й юніт з `raceId` на неї та `knownSpells: [id першого заклинання шаблону]`;
   - видалити один артефакт без посилань (запам'ятати рядок для відновлення).
4. У клоні змінити опис другого заклинання і видалити один скіл.
5. `buildDiff` → вивести статуси. Очікування:
   - `updated` для першого заклинання;
   - `new` для юніта з `requires` на расу;
   - `new` для раси;
   - `deletedInSource` для артефакту;
   - немає пунктів для другого заклинання і видаленого скіла (шаблон їх не змінював).
6. `applySourceChanges` у `prisma.$transaction` для всіх видимих пунктів → повторний `buildDiff` = 0. Перевірити, що `knownSpells` нового юніта в клоні — локальний id.
7. Прибрання: повернути шаблон у вихідний стан (видалити расу/юніт, відновити заклинання й артефакт); видалити тестову кампанію (`prisma.campaign.delete`, каскад). Вивести «OK».

`userId` взяти з DM-члена робочої кампанії HOMM5:

```bash
psql postgresql://postgres:postgres@localhost:54322/constructor -tAc "select \"userId\" from campaign_members where \"campaignId\"='cmuylhk0c0001ia06lg5eommv' and role='dm' limit 1"
```

Run:

```bash
set -a; source .env.local; set +a; pnpm exec tsx scripts/constructor/source-sync-check.ts cmvhyai5g0001eyfadqth6y7b <userId>
```

Expected: «OK», exit 0.

Також прогнати diff «шаблон HOMM5 ← жива HOMM5» лише на читання. Шаблон створено до етапу 3, тож працює запасний baseline. Скрипт з аргументом `--diff-only <campaignId>` друкує кількість пунктів за статусами. Очікується небагато пунктів: тих, що правили на живій кампанії після створення шаблону.

- [ ] **Step 2: battle-sweep на оновленій кампанії**

Опційний режим скрипта `--keep` лишає тестову кампанію після apply. Скопіювати героїв (`pnpm exec tsx scripts/constructor/copy-test-heroes.ts cmuylhk0c0001ia06lg5eommv <newId>`) і прогнати:

```bash
set -a; source .env.local; set +a; pnpm battle-sweep --campaign <newId>
```

Expected: exit 0. Відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається» допустимий. Потім видалити тестову кампанію.

- [ ] **Step 3: Повна перевірка**

```bash
pnpm test:run
pnpm lint
pnpm build
```

Expected: усі тести зелені (відомо нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо), lint 0 errors, build успішний.

- [ ] **Step 4: Commit**

```bash
git add scripts/constructor/source-sync-check.ts
git commit -m "chore(constructor): live source-sync check script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
