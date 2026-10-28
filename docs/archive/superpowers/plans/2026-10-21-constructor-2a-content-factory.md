# Конструктор 2a — фабрика CRUD контенту: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести роути контенту бібліотек (юніти, раси, заклинання, школи магії, основні скіли, скіли, артефакти, сети, треки) на один реєстр ресурсів, сервіс і фабрику роутів.

**Architecture:** Кожен вид контенту описується одним об'єктом `ContentResource` у `lib/server/content/resources/<kind>.ts`. В об'єкті:
- схеми вводу;
- доступ;
- кеш-теги;
- функції `list`/`find`/`create`/`update`/`remove`/`removeAll` з логікою, перенесеною з нинішніх `route.ts`.

`lib/server/content/service.ts` додає до цих функцій розбір вводу Zod-схемою, 404 і скидання кешу. `lib/utils/api/content-routes.ts` будує з ресурсу обробники `GET`/`POST`/`PATCH`/`DELETE`; автентифікацію робить `resolveActor`. У 2a він працює лише з cookie-сесією, а Bearer у ньому з'явиться в 2b. Роути зводяться до одного рядка.

**Tech Stack:** Next.js 16 route handlers, Prisma 6, Zod 4, vitest.

**Spec:** `docs/archive/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md` (розділ «2a»).

## Global Constraints

- Робота в worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`. Основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати. У `main` не зливати.
- БД лише локальна: `postgresql://postgres:postgres@localhost:54322/constructor`. Prod і prodcopy не чіпати.
- Міграцій у 2a немає.
- Відповіді (свідома уніфікація):
  - `POST` → 201 із записом;
  - `PATCH` → запис;
  - `DELETE` одного запису → `{ ok: true }`;
  - видалення всіх → `{ ok: true, deleted: n }`;
  - помилки → `{ error: string, issues? }` через `errorResponse`.
- Свідомі зміни поведінки (кожна — з тестом):
  - запис з іншої кампанії → 404 (було 403);
  - `PATCH` юніта записує `morale`;
  - `GET skill-trees` → стандартний доступ учасника: 403 для не-учасника (було 404).
- Доступ GET зберігається:
  - список — учасник для всіх видів, крім треків (ДМ);
  - запис за id — ДМ для рас, основних скілів і артефактів; учасник для юнітів, заклинань, скілів, сетів; ДМ для треків.
- Записи (`POST`/`PATCH`/`DELETE`) — лише ДМ.
- Серверні сторінки ДМ (`app/campaigns/[id]/dm/{races,spells,skills,artifacts,artifact-sets}/page.tsx`) і далі імпортують `readRaces`, `readSpells`, `readSkills`, `readArtifacts`, `readArtifactSets` з їхніх нинішніх файлів. Ці файли й сигнатури не змінюються.
- Тексти помилок — лише в `lib/constants/api-errors.ts`, українською.
- Код:
  - імпорти `@/…`;
  - порожній рядок навколо `const`/`if`/`return`/блоків (`padding-line-between-statements`);
  - `simple-import-sort` (`pnpm lint --fix`);
  - мінімум коментарів;
  - жодного `console.log`.
- Тести:
  - під час роботи — `pnpm test:related <files>` / `pnpm test:changed`;
  - повний `pnpm test:run` — один раз у Task 10.
- Підроути, що лишаються окремими (`spells/delete-by-level`, `spells/[spellId]/remove-from-group`, `spells/groups/[groupId]/remove-all-spells`, `skills/[skillId]/duplicate`, `units/import`, `tracks/order`, `tracks/upload-url`, `skill-trees/[treeId]`):
  - у 2a змінюється лише форма відповіді там, де вона видаляє записи (`{ ok: true, deleted }`);
  - перенесення в сервіси нестандартних операцій — у 2c.

## Review Focus

- **Запис з іншої кампанії за чужим id** (`PATCH /campaigns/A/units/<id з B>`) має дати 404 і нічого не змінити — ні запис, ні кеш. Тест у Task 1 (сервіс) і в кожному тесті ресурсу.
- **Неповне тіло `PATCH`** (лише `{ name }`) не повинно стирати JSON-поля (`abilities`, `attacks`, `fx`, `setBonus`, `icon`). Тести «PATCH без поля не чіпає його» в Tasks 2 (наявний тест avatar), 4 (fx, spellEffects), 7 (іконка).
- **Некоректний JSON або порожнє тіло `POST`** → 400 `INVALID_JSON`, а не 500. Тест у Task 1 (роути).
- **Видалення всіх у ресурсу без `removeAll`** (раси, основні скіли, школи, сети, треки) → 405, а не видалення. Тест у Task 1 (роути).
- **Перейменування раси** оновлює `characters.race` і `skill_trees.race` у тій самій транзакції, а конфлікт назви (регістр не враховується) → 409 без запису. Тест у Task 3.

---

## Файлова структура

| Файл | Відповідальність |
|---|---|
| `lib/server/content/errors.ts` (new) | `ContentError`, `parseInput` |
| `lib/server/content/define-resource.ts` (new) | типи `ContentResource`, `ContentKind`, `defineResource` |
| `lib/server/content/service.ts` (new) | `listContent`, `getContent`, `createContent`, `updateContent`, `removeContent`, `removeAllContent` |
| `lib/server/content/resources/{units,races,spells,spell-groups,main-skills,skills,artifacts,artifact-sets,tracks}.ts` (new) | опис кожного виду, логіка з нинішніх `route.ts` |
| `lib/server/content/resources/index.ts` (new) | `CONTENT_RESOURCES` |
| `lib/utils/api/actor.ts` (new) | `Actor`, `resolveActor` (у 2a — лише сесія) |
| `lib/utils/api/content-routes.ts` (new) | `collectionRoutes`, `itemRoutes`, `runContent` |
| `lib/server/campaigns/campaign-refs.ts` (modify) | + `foreignCampaignRef` (повідомлення замість `NextResponse`) |
| `lib/schemas/skills.ts` (new) | схеми скілів, перенесені з роутів |
| `app/api/campaigns/[id]/**/route.ts` (modify) | однорядкові експорти з фабрики |
| `lib/api/*.ts` (modify) | типи відповідей видалення, нові шляхи «видалити всі» |

---

### Task 1: Основа — помилки, ресурс, сервіс, актор, фабрика роутів

**Files:**
- Create: `lib/server/content/errors.ts`, `lib/server/content/define-resource.ts`, `lib/server/content/service.ts`, `lib/utils/api/actor.ts`, `lib/utils/api/content-routes.ts`
- Modify: `lib/server/campaigns/campaign-refs.ts`, `lib/constants/api-errors.ts`
- Test: `lib/server/content/__tests__/service.test.ts`, `lib/utils/api/__tests__/content-routes.test.ts`

**Interfaces:**
- Produces (використовують Tasks 2–10):
  - `class ContentError extends Error { status: number; issues?: unknown }`, `parseInput<T>(schema: ZodType<T>, raw: unknown): T`
  - `type ContentKind = "units" | "races" | "spells" | "spell-groups" | "main-skills" | "skills" | "artifacts" | "artifact-sets" | "tracks"`
  - `type AccessLevel = "member" | "dm"`
  - `interface ContentResource<Row, Create, Update>` (поля нижче) і `defineResource<Row, Create, Update>(def): ContentResource<Row, Create, Update>`
  - `listContent(r, actor, query: URLSearchParams)`, `getContent(r, actor, id)`, `createContent(r, actor, raw)`, `updateContent(r, actor, id, raw)`, `removeContent(r, actor, id)`, `removeAllContent(r, actor): Promise<number>`
  - `type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token" }`, `resolveActor(req: Request, campaignId: string, need: { access: AccessLevel }): Promise<Actor | NextResponse>`
  - `collectionRoutes(r)` → `{ GET, POST, DELETE }`, `itemRoutes(r, idParam: string)` → `{ GET, PATCH, DELETE }`
  - `foreignCampaignRef(campaignId, refs: CampaignRefs): Promise<string | null>`

- [ ] **Step 1: Додати тексти помилок**

У `lib/constants/api-errors.ts` в об'єкт `API_ERRORS` (поряд із `FOREIGN_ARTIFACT_SET`) додати:

```ts
  METHOD_NOT_ALLOWED: "Операція недоступна для цього виду контенту",
  FOREIGN_RACE: "Раса не належить цій кампанії",
```

- [ ] **Step 2: `foreignCampaignRef` у `lib/server/campaigns/campaign-refs.ts`**

Нинішню функцію `invalidCampaignRefs` розділити: логіку перенести в `foreignCampaignRef`, яка повертає повідомлення, а `invalidCampaignRefs` лишити обгорткою (нею ще користуються роути поза фабрикою):

```ts
/** First foreign ref's message, or null. FK guarantees a referenced row exists, not that it belongs to this campaign. */
export async function foreignCampaignRef(campaignId: string, refs: CampaignRefs): Promise<string | null> {
  const checks = (Object.entries(refs) as Array<[CampaignRefKind, RefId | RefId[]]>)
    .map(([kind, value]) => ({ kind, ids: [...new Set([value].flat().filter((id): id is string => !!id))] }))
    .filter(({ ids }) => ids.length > 0);

  for (const { kind, ids } of checks) {
    if ((await REF_KINDS[kind].count(campaignId, ids)) !== ids.length) return REF_KINDS[kind].message;
  }

  return null;
}

export async function invalidCampaignRefs(campaignId: string, refs: CampaignRefs): Promise<NextResponse | null> {
  const message = await foreignCampaignRef(campaignId, refs);

  return message ? errorResponse(message, 400) : null;
}
```

Тіло циклу звірити з нинішнім `invalidCampaignRefs`: якщо там перевірки йдуть паралельно (`Promise.all`), зберегти той самий порядок і семантику — повертається перше чуже посилання. Запустити `pnpm test:related lib/server/campaigns/campaign-refs.ts`; очікування — PASS без змін тестів.

- [ ] **Step 3: `lib/server/content/errors.ts`**

```ts
import type { ZodType } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";

export class ContentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: unknown,
  ) {
    super(message);
    this.name = "ContentError";
  }
}

export function parseInput<T>(schema: ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);

  if (!parsed.success) throw new ContentError(API_ERRORS.INVALID_BODY, 400, parsed.error.issues);

  return parsed.data;
}
```

- [ ] **Step 4: `lib/utils/api/actor.ts`**

```ts
import { NextResponse } from "next/server";

import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";

export type AccessLevel = "member" | "dm";

export type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token" };

export async function resolveActor(_req: Request, campaignId: string, need: { access: AccessLevel }): Promise<Actor | NextResponse> {
  const access = need.access === "dm" ? await requireDM(campaignId) : await requireCampaignAccess(campaignId, false);

  if (access instanceof NextResponse) return access;

  return { campaignId, userId: access.userId, isDM: need.access === "dm" || access.isDM === true, via: "session" };
}
```

`_req` використовується в 2b для заголовка `Authorization`. Тести роутів мокають `requireDM` і повертають `{ userId }` без `isDM`, тому `isDM` виводиться з рівня доступу.

- [ ] **Step 5: `lib/server/content/define-resource.ts`**

```ts
import type { ZodType } from "zod";

import "server-only";
import type { ReferenceKindValue } from "@/lib/cache/tags";
import type { AccessLevel, Actor } from "@/lib/utils/api/actor";

export type ContentKind = "units" | "races" | "spells" | "spell-groups" | "main-skills" | "skills" | "artifacts" | "artifact-sets" | "tracks";

export interface ContentResource<Row = unknown, Create = unknown, Update = unknown> {
  kind: ContentKind;
  label: string;
  description: string;
  /** path under /api/campaigns/{id} */
  path: string;
  schemas: { create: ZodType<Create>; update: ZodType<Update> };
  access: { list: AccessLevel; item: AccessLevel };
  invalidates: readonly ReferenceKindValue[];
  notFound: string;
  list(actor: Actor, query: URLSearchParams): Promise<unknown>;
  /** scoped to actor.campaignId; null when missing or in another campaign */
  find(actor: Actor, id: string): Promise<Row | null>;
  toItem?(row: Row): unknown;
  create(actor: Actor, input: Create): Promise<unknown>;
  update(actor: Actor, existing: Row, input: Update): Promise<unknown>;
  remove(actor: Actor, existing: Row): Promise<void>;
  /** absent → bulk delete is not offered (405) */
  removeAll?(actor: Actor): Promise<number>;
}

export const defineResource = <Row, Create, Update>(def: ContentResource<Row, Create, Update>) => def;

export type AnyContentResource = ContentResource<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
```

- [ ] **Step 6: Написати тест сервісу, що падає**

`lib/server/content/__tests__/service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const invalidateReference = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference }));

import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { createContent, getContent, removeAllContent, removeContent, updateContent } from "@/lib/server/content/service";

type Row = { id: string; campaignId: string; name: string };

const rows = new Map<string, Row>();

const thing = defineResource<Row, { name: string }, { name?: string }>({
  kind: "units",
  label: "Тест",
  description: "",
  path: "/things",
  schemas: { create: z.object({ name: z.string().min(1) }), update: z.object({ name: z.string().min(1).optional() }) },
  access: { list: "member", item: "member" },
  invalidates: ["units"],
  notFound: "Немає",
  list: async () => [...rows.values()],
  find: async (actor, id) => {
    const row = rows.get(id);

    return row && row.campaignId === actor.campaignId ? row : null;
  },
  create: async (actor, input) => ({ id: "n1", campaignId: actor.campaignId, ...input }),
  update: async (_a, existing, input) => ({ ...existing, ...input }),
  remove: async (_a, existing) => {
    rows.delete(existing.id);
  },
});

const actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session" as const };

const rejectsWith = async (p: Promise<unknown>, status: number) => {
  const error = await p.then(() => null, (e: unknown) => e);

  expect(error).toBeInstanceOf(ContentError);
  expect((error as ContentError).status).toBe(status);
};

describe("content service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rows.clear();
    rows.set("a", { id: "a", campaignId: "c1", name: "А" });
    rows.set("b", { id: "b", campaignId: "c2", name: "Б" });
  });

  it("create парсить ввід і скидає теги ресурсу", async () => {
    expect(await createContent(thing, actor, { name: "Н" })).toEqual({ id: "n1", campaignId: "c1", name: "Н" });
    expect(invalidateReference).toHaveBeenCalledWith(["units"], "c1");
  });

  it("невалідний ввід → 400 з issues, без запису і скидання", async () => {
    await rejectsWith(createContent(thing, actor, { name: "" }), 400);
    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("запис іншої кампанії → 404 для get, update і remove; нічого не змінено", async () => {
    await rejectsWith(getContent(thing, actor, "b"), 404);
    await rejectsWith(updateContent(thing, actor, "b", { name: "X" }), 404);
    await rejectsWith(removeContent(thing, actor, "b"), 404);
    expect(rows.get("b")?.name).toBe("Б");
    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("404 перевіряється раніше за валідацію тіла", async () => {
    await rejectsWith(updateContent(thing, actor, "missing", { name: "" }), 404);
  });

  it("remove видаляє і скидає теги", async () => {
    await removeContent(thing, actor, "a");
    expect(rows.has("a")).toBe(false);
    expect(invalidateReference).toHaveBeenCalledWith(["units"], "c1");
  });

  it("removeAll без підтримки в ресурсі → 405", async () => {
    await rejectsWith(removeAllContent(thing, actor), 405);
  });
});
```

- [ ] **Step 7: Запустити й побачити падіння**

Run: `pnpm test:run lib/server/content/__tests__/service.test.ts`
Expected: FAIL — `Cannot find module '@/lib/server/content/service'`.

- [ ] **Step 8: `lib/server/content/service.ts`**

```ts
import "server-only";
import { invalidateReference } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";

async function found(r: AnyContentResource, actor: Actor, id: string) {
  const row = await r.find(actor, id);

  if (!row) throw new ContentError(r.notFound, 404);

  return row;
}

const invalidate = (r: AnyContentResource, actor: Actor) => {
  if (r.invalidates.length > 0) invalidateReference(r.invalidates, actor.campaignId);
};

export const listContent = (r: AnyContentResource, actor: Actor, query: URLSearchParams) => r.list(actor, query);

export async function getContent(r: AnyContentResource, actor: Actor, id: string) {
  const row = await found(r, actor, id);

  return r.toItem ? r.toItem(row) : row;
}

export async function createContent(r: AnyContentResource, actor: Actor, raw: unknown) {
  const created = await r.create(actor, parseInput(r.schemas.create, raw));

  invalidate(r, actor);

  return created;
}

export async function updateContent(r: AnyContentResource, actor: Actor, id: string, raw: unknown) {
  const existing = await found(r, actor, id);

  const updated = await r.update(actor, existing, parseInput(r.schemas.update, raw));

  invalidate(r, actor);

  return updated;
}

export async function removeContent(r: AnyContentResource, actor: Actor, id: string): Promise<void> {
  await r.remove(actor, await found(r, actor, id));

  invalidate(r, actor);
}

export async function removeAllContent(r: AnyContentResource, actor: Actor): Promise<number> {
  if (!r.removeAll) throw new ContentError(API_ERRORS.METHOD_NOT_ALLOWED, 405);

  const deleted = await r.removeAll(actor);

  invalidate(r, actor);

  return deleted;
}
```

- [ ] **Step 9: Запустити тест сервісу**

Run: `pnpm test:run lib/server/content/__tests__/service.test.ts`
Expected: PASS (6).

- [ ] **Step 10: Написати тест фабрики роутів, що падає**

`lib/utils/api/__tests__/content-routes.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "dm" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "p", isDM: false })),
}));

import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { collectionRoutes, itemRoutes } from "@/lib/utils/api/content-routes";

const created = vi.fn(async (_a: unknown, input: { name: string }) => ({ id: "n1", ...input }));

const thing = defineResource<{ id: string; campaignId: string }, { name: string }, { name?: string }>({
  kind: "units",
  label: "Тест",
  description: "",
  path: "/things",
  schemas: { create: z.object({ name: z.string().min(1) }), update: z.object({ name: z.string().optional() }) },
  access: { list: "member", item: "dm" },
  invalidates: [],
  notFound: "Немає",
  list: async () => [{ id: "a" }],
  find: async (actor, id) => (id === "a" ? { id, campaignId: actor.campaignId } : null),
  create: created,
  update: async (_a, existing, input) => ({ ...existing, ...input }),
  remove: async () => {
    throw new ContentError("Зайнято", 409);
  },
});

const col = collectionRoutes(thing);

const one = itemRoutes(thing, "thingId");

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxOne = (thingId: string) => ({ params: Promise.resolve({ id: "c1", thingId }) });

const req = (method: string, body?: string) => new Request("http://x/api/campaigns/c1/things", { method, ...(body !== undefined && { body }) });

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

describe("content routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET списку — доступ учасника, private no-store", async () => {
    const res = await col.GET(req("GET"), ctx);

    expect(apiAuth.requireCampaignAccess).toHaveBeenCalledWith("c1", false);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual([{ id: "a" }]);
  });

  it("GET запису з access.item = dm вимагає ДМ", async () => {
    await one.GET(req("GET"), ctxOne("a"));
    expect(apiAuth.requireDM).toHaveBeenCalledWith("c1");
  });

  it("відмова доступу повертається як є", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValueOnce(NextResponse.json({ error: "x" }, { status: 403 }) as never);
    expect((await col.POST(req("POST", '{"name":"А"}'), ctx)).status).toBe(403);
    expect(created).not.toHaveBeenCalled();
  });

  it("POST → 201 із записом", async () => {
    expect(await json(await col.POST(req("POST", '{"name":"А"}'), ctx))).toEqual({ status: 201, body: { id: "n1", name: "А" } });
  });

  it("некоректний або порожній JSON → 400 INVALID_JSON", async () => {
    for (const body of ["{", ""]) {
      const res = await json(await col.POST(req("POST", body), ctx));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Некоректний JSON у тілі запиту");
    }
  });

  it("невалідне тіло → 400 з issues", async () => {
    const res = await json(await col.POST(req("POST", '{"name":""}'), ctx));

    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });

  it("PATCH відсутнього → 404 з повідомленням ресурсу", async () => {
    expect(await json(await one.PATCH(req("PATCH", "{}"), ctxOne("zzz")))).toEqual({ status: 404, body: { error: "Немає" } });
  });

  it("ContentError із хука → його статус і текст", async () => {
    expect(await json(await one.DELETE(req("DELETE"), ctxOne("a")))).toEqual({ status: 409, body: { error: "Зайнято" } });
  });

  it("DELETE колекції без removeAll → 405", async () => {
    expect((await col.DELETE(req("DELETE"), ctx)).status).toBe(405);
  });
});
```

- [ ] **Step 11: Запустити й побачити падіння**

Run: `pnpm test:run lib/utils/api/__tests__/content-routes.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils/api/content-routes'`.

- [ ] **Step 12: `lib/utils/api/content-routes.ts`**

```ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { createContent, getContent, listContent, removeAllContent, removeContent, updateContent } from "@/lib/server/content/service";
import { type AccessLevel, type Actor, resolveActor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

type Ctx = { params: Promise<Record<string, string>> };

class InvalidJson extends Error {}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new InvalidJson();
  }
}

/** Resolves the actor for the campaign in params, runs fn, maps ContentError / bad JSON / anything else to the shared error body. */
export async function runContent(
  req: Request,
  ctx: Ctx,
  access: AccessLevel,
  action: string,
  fn: (actor: Actor, params: Record<string, string>) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const actor = await resolveActor(req, params.id, { access });

    if (actor instanceof NextResponse) return actor;

    return await fn(actor, params);
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    if (error instanceof InvalidJson) return errorResponse(API_ERRORS.INVALID_JSON, 400);

    return handleApiError(error, { action });
  }
}

export function collectionRoutes(r: AnyContentResource) {
  return {
    GET: (req: Request, ctx: Ctx) =>
      runContent(req, ctx, r.access.list, `list ${r.kind}`, async (actor) =>
        NextResponse.json(await listContent(r, actor, new URL(req.url).searchParams), { headers: PRIVATE_NO_STORE_HEADERS }),
      ),
    POST: (req: Request, ctx: Ctx) =>
      runContent(req, ctx, "dm", `create ${r.kind}`, async (actor) => NextResponse.json(await createContent(r, actor, await readJson(req)), { status: 201 })),
    DELETE: (req: Request, ctx: Ctx) =>
      runContent(req, ctx, "dm", `delete all ${r.kind}`, async (actor) => NextResponse.json({ ok: true, deleted: await removeAllContent(r, actor) })),
  };
}

export function itemRoutes(r: AnyContentResource, idParam: string) {
  return {
    GET: (req: Request, ctx: Ctx) => runContent(req, ctx, r.access.item, `fetch ${r.kind}`, async (actor, p) => NextResponse.json(await getContent(r, actor, p[idParam]))),
    PATCH: (req: Request, ctx: Ctx) =>
      runContent(req, ctx, "dm", `update ${r.kind}`, async (actor, p) => NextResponse.json(await updateContent(r, actor, p[idParam], await readJson(req)))),
    DELETE: (req: Request, ctx: Ctx) =>
      runContent(req, ctx, "dm", `delete ${r.kind}`, async (actor, p) => {
        await removeContent(r, actor, p[idParam]);

        return NextResponse.json({ ok: true });
      }),
  };
}
```

Порядок у `PATCH`: спершу `readJson` (400 `INVALID_JSON`), потім сервіс (404, далі 400 схеми). Якщо Next.js 16 типізує другий аргумент обробника строгіше, ніж `Ctx` (`tsc` у Step 14 скаже), звузити тип до `{ params: Promise<{ id: string } & Record<string, string>> }`.

- [ ] **Step 13: Запустити тести фабрики**

Run: `pnpm test:run lib/utils/api/__tests__/content-routes.test.ts lib/server/content/__tests__/service.test.ts`
Expected: PASS.

- [ ] **Step 14: Типи, lint, коміт**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content lib/utils/api/actor.ts lib/utils/api/content-routes.ts lib/server/campaigns/campaign-refs.ts lib/constants/api-errors.ts lib/utils/api/__tests__/content-routes.test.ts
git add lib/server/content lib/utils/api/actor.ts lib/utils/api/content-routes.ts lib/utils/api/__tests__/content-routes.test.ts lib/server/campaigns/campaign-refs.ts lib/constants/api-errors.ts
git commit -m "feat(content): resource registry types, service, actor and route factory"
```

---

### Task 2: Юніти

**Files:**
- Create: `lib/server/content/resources/units.ts`, `lib/server/content/__tests__/units-resource.test.ts`
- Modify: `app/api/campaigns/[id]/units/route.ts`, `app/api/campaigns/[id]/units/[unitId]/route.ts`, `app/api/campaigns/[id]/units/delete-all/route.ts`, `lib/api/units.ts`, `app/api/__tests__/units-api.test.ts`
- Delete: `app/api/campaigns/[id]/units/unit-race.ts` (логіка переходить у ресурс; перед видаленням `grep -rn "unit-race" app lib` — інших споживачів бути не повинно)

**Interfaces:**
- Consumes: `defineResource`, `ContentError`, `collectionRoutes`, `itemRoutes`, `foreignCampaignRef` (Task 1)
- Produces: `export const unitsResource`

- [ ] **Step 1: Ресурс `lib/server/content/resources/units.ts`**

Дані запису беруться дослівно з нинішніх `units/route.ts` (POST) і `units/[unitId]/route.ts` (PATCH). Єдина зміна — `PATCH` тепер записує `morale`:

```ts
import { Prisma, type Unit as UnitRow } from "@prisma/client";

import "server-only";
import { getCachedUnits } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { abilitiesJson, readAbilities } from "@/lib/utils/abilities/read";
import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import { toUnit } from "@/lib/utils/units/to-unit";
import type { z } from "zod";

async function assertUnitRace(campaignId: string, raceId: string | null | undefined) {
  if (!raceId) return;

  const race = await prisma.race.findFirst({ where: { id: raceId, campaignId }, select: { id: true } });

  if (!race) throw new ContentError(API_ERRORS.FOREIGN_RACE, 400);
}

const json = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));

export const unitsResource = defineResource<UnitRow, z.infer<typeof createUnitSchema>, z.infer<typeof updateUnitSchema>>({
  kind: "units",
  label: "Юніти",
  description: "NPC-юніти та моби кампанії: стати, атаки, здібності, відомі заклинання.",
  path: "/units",
  schemas: { create: createUnitSchema, update: updateUnitSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.UNITS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => getCachedUnits(actor.campaignId),
  find: (actor, id) => prisma.unit.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: (row) => {
    const { abilities, issues: abilityIssues } = readAbilities("unit", row);

    return { ...toUnit(row), abilities, abilityIssues };
  },
  async create(actor, data) {
    await assertUnitRace(actor.campaignId, data.raceId);

    const unit = await prisma.unit.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        raceId: data.raceId ?? null,
        level: data.level,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        gridSize: data.gridSize,
        maxHp: data.maxHp,
        proficiencyBonus: data.proficiencyBonus || getProficiencyBonus(data.level),
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        attacks: data.attacks as Prisma.InputJsonValue,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        immunities: data.immunities as Prisma.InputJsonValue,
        knownSpells: data.knownSpells,
        morale: data.morale,
        avatar: data.avatar ?? null,
      },
    });

    return toUnit(unit);
  },
  async update(actor, existing, data) {
    await assertUnitRace(actor.campaignId, data.raceId);

    const unit = await prisma.unit.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        raceId: data.raceId,
        level: data.level,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        gridSize: data.gridSize,
        maxHp: data.maxHp,
        proficiencyBonus: data.proficiencyBonus,
        attacks: json(data.attacks),
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        immunities: json(data.immunities),
        knownSpells: json(data.knownSpells),
        morale: data.morale,
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        avatar: data.avatar,
      },
    });

    return toUnit(unit);
  },
  async remove(actor, existing) {
    await prisma.unit.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.unit.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
```

Перед записом звірити список полів із нинішніми `route.ts`: ресурс має писати рівно ті самі поля плюс `morale` у `update`. Якщо `updateUnitSchema` не містить `morale`, перевірити `lib/schemas/units.ts:79`: за розвідкою, поле там є.

- [ ] **Step 2: Роути юнітів**

`app/api/campaigns/[id]/units/route.ts` (увесь файл):

```ts
import { unitsResource } from "@/lib/server/content/resources/units";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST, DELETE } = collectionRoutes(unitsResource);
```

`app/api/campaigns/[id]/units/[unitId]/route.ts`:

```ts
import { unitsResource } from "@/lib/server/content/resources/units";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(unitsResource, "unitId");
```

`app/api/campaigns/[id]/units/delete-all/route.ts` — псевдонім видалення всіх:

```ts
import { unitsResource } from "@/lib/server/content/resources/units";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { DELETE } = collectionRoutes(unitsResource);
```

- [ ] **Step 3: Клієнт `lib/api/units.ts`**

```ts
const unitsApi = createCampaignCrudApi<Unit, Partial<Unit>, Partial<Unit>, { ok: true }>("/units");
```

```ts
export async function deleteAllUnits(campaignId: string): Promise<{ ok: true; deleted: number }> {
  return campaignDelete<{ ok: true; deleted: number }>(campaignId, "/units");
}
```

Потім `grep -rn "deleteAllUnits\|deleteUnit(" lib/hooks components app/campaigns` і звірити, що жоден споживач не читає `.success`. Якщо читає — замінити на `.ok`.

- [ ] **Step 4: Оновити регресійний тест `app/api/__tests__/units-api.test.ts`**

Зміни лише там, де свідомо змінюється поведінка:
- мок `db.unit` отримує `findFirst` (ресурс шукає через `findFirst({ where: { id, campaignId } })`). У `beforeEach` додати `db.unit.findFirst.mockResolvedValue(row)` поряд із наявним `findUnique`;
- очікування відповіді DELETE: `{ success: true }` → `{ ok: true }`; delete-all: `{ success: true, deleted: 3 }` → `{ ok: true, deleted: 3 }`;
- додати два тести:

```ts
  it("PATCH записує morale", async () => {
    await one.PATCH(req("PATCH", { morale: 2 }), ctxOne);

    expect(db.unit.update.mock.calls[0][0].data.morale).toBe(2);
  });

  it("юніт іншої кампанії — 404, нічого не змінено", async () => {
    db.unit.findFirst.mockResolvedValue(null);

    expect(((await one.PATCH(req("PATCH", { name: "X" }), ctxOne)) as NextResponse).status).toBe(404);
    expect(db.unit.update).not.toHaveBeenCalled();
  });
```

Решта тестів файлу (201, раса іншої кампанії → 400, avatar, gridSize, no-store) має пройти **без змін** очікувань.

- [ ] **Step 5: Тести**

Run: `pnpm test:related lib/server/content/resources/units.ts app/api/campaigns/[id]/units/route.ts lib/api/units.ts`
Expected: PASS. Якщо падає тест поза `units-api.test.ts`, розібратися з причиною; оновлювати очікування в такому тесті не можна.

- [ ] **Step 6: Коміт**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content app/api/campaigns/\[id\]/units lib/api/units.ts app/api/__tests__/units-api.test.ts
git add -A lib/server/content app/api/campaigns/\[id\]/units lib/api/units.ts app/api/__tests__/units-api.test.ts lib/hooks components
git commit -m "refactor(content): units through the content resource factory; PATCH writes morale"
```

---

### Task 3: Раси

**Files:**
- Create: `lib/server/content/resources/races.ts`
- Modify: `app/api/campaigns/[id]/races/route.ts`, `app/api/campaigns/[id]/races/[raceId]/route.ts`, `app/api/campaigns/[id]/races/race-name.ts`, `lib/api/races.ts`, `app/api/__tests__/races-api.test.ts`
- Keep: `app/api/campaigns/[id]/races/read-races.ts`, `app/api/campaigns/[id]/races/[raceId]/update-race.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `export const racesResource`

- [ ] **Step 1: `race-name.ts` → повідомлення**

```ts
import { prisma } from "@/lib/db";

export async function raceNameTaken(campaignId: string, name: string, exceptId?: string): Promise<boolean> {
  const clash = await prisma.race.findFirst({
    where: { campaignId, name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });

  return clash !== null;
}
```

У `lib/constants/api-errors.ts` додати функцію-текст поряд з іншими (або, якщо файл містить лише рядки, — константу-шаблон у самому ресурсі):

```ts
export const raceNameTakenMessage = (name: string) => `Раса «${name}» уже є в кампанії`;
```

`grep -rn "raceNameConflict" app lib` — після цього Task нових споживачів бути не повинно.

- [ ] **Step 2: Ресурс `lib/server/content/resources/races.ts`**

```ts
import { Prisma, type Race as RaceRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { raceNameTaken } from "@/app/api/campaigns/[id]/races/race-name";
import { updateRaceCascade } from "@/app/api/campaigns/[id]/races/[raceId]/update-race";
import { getCachedRaces } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS, raceNameTakenMessage } from "@/lib/constants/api-errors";
import { raceColorAt } from "@/lib/constants/race-colors";
import { prisma } from "@/lib/db";
import { createRaceSchema, updateRaceSchema } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { abilitiesJson, readAbilities } from "@/lib/utils/abilities/read";

async function assertNameFree(campaignId: string, name: string, exceptId?: string) {
  if (await raceNameTaken(campaignId, name, exceptId)) throw new ContentError(raceNameTakenMessage(name), 409);
}

export const racesResource = defineResource<RaceRow, z.infer<typeof createRaceSchema>, z.infer<typeof updateRaceSchema>>({
  kind: "races",
  label: "Раси",
  description: "Ігрові раси: колір, іконка, доступні скіли, прогресія слотів, расові здібності.",
  path: "/races",
  schemas: { create: createRaceSchema, update: updateRaceSchema },
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.RACES, ReferenceKind.UNITS],
  notFound: API_ERRORS.RACE_NOT_FOUND,
  list: (actor) => getCachedRaces(actor.campaignId),
  find: (actor, id) => prisma.race.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: (row) => {
    const { abilities, issues: abilityIssues } = readAbilities("race", row);

    return { ...row, abilities, abilityIssues };
  },
  async create(actor, data) {
    await assertNameFree(actor.campaignId, data.name);

    const color = data.color ?? raceColorAt(await prisma.race.count({ where: { campaignId: actor.campaignId } }));

    return prisma.race.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        icon: data.icon ?? null,
        color,
        availableSkills: data.availableSkills as Prisma.InputJsonValue,
        disabledSkills: data.disabledSkills as Prisma.InputJsonValue,
        passiveAbility: data.passiveAbility ? (data.passiveAbility as Prisma.InputJsonValue) : Prisma.JsonNull,
        spellSlotProgression: data.spellSlotProgression ? (data.spellSlotProgression as Prisma.InputJsonValue) : [],
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
      },
    });
  },
  async update(actor, existing, data) {
    if (data.name !== undefined) await assertNameFree(actor.campaignId, data.name, existing.id);

    return updateRaceCascade(actor.campaignId, existing, data);
  },
  async remove(actor, existing) {
    await prisma.race.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
```

Ресурс у `lib/server` імпортує `race-name.ts` і `update-race.ts` з `app/api/...`. Якщо ESLint або `import/no-cycle` це забороняють, перенести обидва файли в `lib/server/races/` (`git mv`) і оновити імпорти. Тест `races-api.test.ts` мокає ці шляхи — оновити і там.

- [ ] **Step 3: Роути рас**

`races/route.ts`:

```ts
import { racesResource } from "@/lib/server/content/resources/races";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(racesResource);
```

`races/[raceId]/route.ts`:

```ts
import { racesResource } from "@/lib/server/content/resources/races";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(racesResource, "raceId");
```

- [ ] **Step 4: Клієнт `lib/api/races.ts`**

Четвертий дженерик `Race` → `{ ok: true }` (роут ніколи не повертав `Race` на DELETE). `grep -rn "deleteRace" lib/hooks components` — споживач не повинен читати поля відповіді.

- [ ] **Step 5: Регресійний тест `app/api/__tests__/races-api.test.ts`**

- моки `db.race.findUnique` для пошуку запису → `findFirst`. Звернути увагу: `findFirst` уже мокається для перевірки назви. Розділити за аргументом (`where.id` є → пошук запису; `where.name` є → перевірка назви), наприклад через `mockImplementation(({ where }) => where.name ? clash : row)`;
- DELETE → `{ ok: true }`;
- додати тести:

```ts
  it("перейменування в назву іншої раси (інший регістр) → 409, без запису", async () => {
    // findFirst: запис знайдено; перевірка назви знаходить «ельф» → конфлікт
    const res = await one.PATCH(req("PATCH", { name: "ЕЛЬФ" }), ctxOne);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Раса «ЕЛЬФ» уже є в кампанії");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("перейменування оновлює characters.race і skill_trees.race у транзакції", async () => {
    // findFirst: запис { name: "Ельф" }; назва вільна
    await one.PATCH(req("PATCH", { name: "Високий ельф" }), ctxOne);

    expect(tx.character.updateMany).toHaveBeenCalledWith({ where: { campaignId: "c1", race: { equals: "Ельф", mode: "insensitive" } }, data: { race: "Високий ельф" } });
    expect(tx.skillTree.updateMany).toHaveBeenCalledWith({ where: { campaignId: "c1", race: { equals: "Ельф", mode: "insensitive" } }, data: { race: "Високий ельф" } });
  });
```

Назви `db`, `tx`, `one`, `ctxOne`, `req` узгодити з наявними в файлі. Якщо `$transaction` там ще не мокається, додати `db.$transaction = vi.fn((fn) => fn(tx))` з `tx = { race: { update }, character: { updateMany }, skillTree: { updateMany } }`.

- [ ] **Step 6: Тести і коміт**

Run: `pnpm test:related lib/server/content/resources/races.ts app/api/campaigns/[id]/races/route.ts lib/api/races.ts`
Expected: PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content app/api/campaigns/\[id\]/races lib/api/races.ts lib/constants/api-errors.ts app/api/__tests__/races-api.test.ts
git add -A lib/server app/api/campaigns/\[id\]/races lib/api/races.ts lib/constants/api-errors.ts app/api/__tests__/races-api.test.ts
git commit -m "refactor(content): races through the content resource factory"
```

---

### Task 4: Заклинання і школи магії

**Files:**
- Create: `lib/server/content/resources/spells.ts`, `lib/server/content/resources/spell-groups.ts`
- Modify: `app/api/campaigns/[id]/spells/route.ts`, `spells/[spellId]/route.ts`, `spells/delete-all/route.ts`, `spells/delete-by-level/route.ts`, `spells/groups/route.ts`, `spells/groups/[groupId]/route.ts`, `lib/api/spells.ts`, `app/api/__tests__/spells-api.test.ts`, `app/api/__tests__/spells-by-ids-api.test.ts`
- Keep: `spells/read-spells.ts`, `spells/list-spells-query.ts`, `spells/[spellId]/remove-from-group/route.ts`, `spells/groups/[groupId]/remove-all-spells/route.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `spellsResource`, `spellGroupsResource`

- [ ] **Step 1: `lib/server/content/resources/spells.ts`**

```ts
import { Prisma, type Spell as SpellRow } from "@prisma/client";

import "server-only";
import { listSpellsQuerySchema } from "@/app/api/campaigns/[id]/spells/list-spells-query";
import { getCachedSpells } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createSpellSchema, type CreateSpellInput, updateSpellSchema, type UpdateSpellInput } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";
import { parseInput } from "@/lib/server/content/errors";
import { loadBookSpellsByIds } from "@/lib/server/spells/book-spells-by-ids";
import { spellDefinitionColumns } from "@/lib/utils/spells/model/read";

const asJson = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));

const withGroup = { spellGroup: true } as const;

export const spellsResource = defineResource<SpellRow, CreateSpellInput, UpdateSpellInput>({
  kind: "spells",
  label: "Заклинання",
  description: "Заклинання кампанії: рівень, школа, ціль, кидок, ефекти, візуальний ефект (fx).",
  path: "/spells",
  schemas: { create: createSpellSchema, update: updateSpellSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.SPELLS],
  notFound: API_ERRORS.NOT_FOUND,
  async list(actor, query) {
    const { ids } = parseInput(listSpellsQuerySchema, Object.fromEntries(query));

    return ids ? loadBookSpellsByIds(actor.campaignId, ids) : getCachedSpells(actor.campaignId);
  },
  find: (actor, id) => prisma.spell.findFirst({ where: { id, campaignId: actor.campaignId }, include: withGroup }),
  create: (actor, data) =>
    prisma.spell.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        level: data.level,
        groupId: data.groupId || null,
        icon: data.icon || null,
        description: data.description ?? null,
        appearanceDescription: data.appearanceDescription ?? null,
        fx: data.fx ?? undefined,
        // legacy NOT NULL columns until a later migration; the new model never reads them
        type: "target",
        damageType: "damage",
        ...spellDefinitionColumns({ dice: data.dice, cost: data.cost, targeting: data.targeting, resolution: data.resolution, effects: data.spellEffects, raceModifiers: data.raceModifiers, stackable: data.stackable, maxStacks: data.maxStacks ?? undefined }),
      },
      include: withGroup,
    }),
  update: (_actor, existing, data) =>
    prisma.spell.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        level: data.level,
        groupId: data.groupId,
        icon: data.icon !== undefined ? data.icon || null : undefined,
        description: data.description,
        appearanceDescription: data.appearanceDescription,
        dice: data.dice,
        cost: data.cost,
        targeting: asJson(data.targeting),
        resolution: asJson(data.resolution),
        spellEffects: asJson(data.spellEffects),
        raceModifiers: asJson(data.raceModifiers),
        stackable: data.stackable,
        maxStacks: data.stackable === false ? null : data.maxStacks,
        fx: data.fx === null ? Prisma.DbNull : asJson(data.fx),
      },
      include: withGroup,
    }),
  async remove(actor, existing) {
    await prisma.spell.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.spell.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
```

Нюанс: `POST` заклинання досі відповідав 200. Тепер — 201. Клієнт статус не перевіряє (`request` у `lib/api/client.ts` дивиться на `response.ok`).

Помилка `listSpellsQuerySchema` раніше давала 400 через `ZodError` у `handleApiError`. Тепер вона дає 400 через `ContentError`: тіло те саме — `{ error: INVALID_BODY, issues }`.

- [ ] **Step 2: `lib/server/content/resources/spell-groups.ts`**

```ts
import type { SpellGroup as SpellGroupRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createSpellGroupSchema, updateSpellGroupSchema } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";

export const spellGroupsResource = defineResource<SpellGroupRow, z.infer<typeof createSpellGroupSchema>, z.infer<typeof updateSpellGroupSchema>>({
  kind: "spell-groups",
  label: "Школи магії",
  description: "Групи (школи) заклинань: назва, колір, іконка.",
  path: "/spells/groups",
  schemas: { create: createSpellGroupSchema, update: updateSpellGroupSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.SPELLS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => prisma.spellGroup.findMany({ where: { campaignId: actor.campaignId }, orderBy: { name: "asc" } }),
  find: (actor, id) => prisma.spellGroup.findFirst({ where: { id, campaignId: actor.campaignId } }),
  create: (actor, data) => prisma.spellGroup.create({ data: { campaignId: actor.campaignId, name: data.name, color: data.color ?? null, icon: data.icon ?? null } }),
  update: (_actor, existing, data) => prisma.spellGroup.update({ where: { id: existing.id }, data: { name: data.name, color: data.color, icon: data.icon } }),
  async remove(actor, existing) {
    // spells of the group stay: onDelete SetNull
    await prisma.spellGroup.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
```

`spells/groups/[groupId]` досі не мав `GET` за id. Тепер він з'явиться (`itemRoutes`) з доступом учасника, що узгоджено зі списком.

- [ ] **Step 3: Роути**

- `spells/route.ts`: `export const { GET, POST, DELETE } = collectionRoutes(spellsResource);`
- `spells/[spellId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(spellsResource, "spellId");`
- `spells/delete-all/route.ts`: `export const { DELETE } = collectionRoutes(spellsResource);`
- `spells/groups/route.ts`: `export const { GET, POST } = collectionRoutes(spellGroupsResource);`
- `spells/groups/[groupId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(spellGroupsResource, "groupId");`

Кожен файл має по два імпорти, як у Task 2. У `spells/delete-by-level/route.ts` змінити лише відповідь: `NextResponse.json({ success: true, deleted: result.count })` → `NextResponse.json({ ok: true, deleted: result.count })`.

- [ ] **Step 4: Клієнт `lib/api/spells.ts`**

- `createCampaignCrudApi<Spell, CreateSpellInput, UpdateSpellInput, { ok: true }>`;
- `deleteAllSpells` → `campaignDelete<{ ok: true; deleted: number }>(campaignId, "/spells")`;
- `deleteSpellsByLevel` → тип `{ ok: true; deleted: number }`;
- `removeAllSpellsFromGroup` лишається (`{ success: boolean }`, роут не змінюється).

`grep -rn "\.success" lib/hooks/spells components/spells` — замінити читання `.success` у відповідях видалення, якщо є.

- [ ] **Step 5: Регресійні тести**

`spells-api.test.ts`, `spells-by-ids-api.test.ts`:
- `findUnique` → `findFirst` у моках пошуку;
- DELETE-відповіді → `{ ok: true }` / `{ ok: true, deleted }`;
- статус `POST` → 201, якщо тест його перевіряє.

Додати:

```ts
  it("PATCH лише з name не чіпає fx і spellEffects", async () => {
    await one.PATCH(req("PATCH", { name: "Нова" }), ctxOne);

    const data = db.spell.update.mock.calls[0][0].data;

    expect(data.fx).toBeUndefined();
    expect(data.spellEffects).toBeUndefined();
  });

  it("PATCH fx: null → Prisma.DbNull", async () => {
    await one.PATCH(req("PATCH", { fx: null }), ctxOne);

    expect(db.spell.update.mock.calls[0][0].data.fx).toBe(Prisma.DbNull);
  });
```

`Prisma` імпортувати з `@prisma/client`, а назви хелперів узгодити з файлом.

- [ ] **Step 6: Тести і коміт**

Run: `pnpm test:related lib/server/content/resources/spells.ts lib/server/content/resources/spell-groups.ts lib/api/spells.ts app/api/campaigns/[id]/spells/route.ts`
Expected: PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content app/api/campaigns/\[id\]/spells lib/api/spells.ts app/api/__tests__/spells-api.test.ts app/api/__tests__/spells-by-ids-api.test.ts
git add -A lib/server/content app/api/campaigns/\[id\]/spells lib/api/spells.ts app/api/__tests__ lib/hooks components
git commit -m "refactor(content): spells and spell groups through the content resource factory"
```

---

### Task 5: Основні скіли

**Files:**
- Create: `lib/server/content/resources/main-skills.ts`
- Modify: `app/api/campaigns/[id]/main-skills/route.ts`, `main-skills/[mainSkillId]/route.ts`, `lib/api/main-skills.ts`, `app/api/__tests__/main-skills-api.test.ts`

- [ ] **Step 1: Ресурс**

```ts
import type { MainSkill as MainSkillRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedMainSkills } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createMainSkillSchema, updateMainSkillSchema } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { foreignCampaignRef } from "@/lib/server/campaigns/campaign-refs";

async function assertGroup(campaignId: string, spellGroupId: string | null | undefined) {
  const foreign = await foreignCampaignRef(campaignId, { spellGroup: spellGroupId });

  if (foreign) throw new ContentError(foreign, 400);
}

export const mainSkillsResource = defineResource<MainSkillRow, z.infer<typeof createMainSkillSchema>, z.infer<typeof updateMainSkillSchema>>({
  kind: "main-skills",
  label: "Основні скіли",
  description: "Гілки прокачки (атака, магія, лідерство…): роль, колір, іконка, школа магії.",
  path: "/main-skills",
  schemas: { create: createMainSkillSchema, update: updateMainSkillSchema },
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.MAIN_SKILLS, ReferenceKind.SKILLS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => getCachedMainSkills(actor.campaignId),
  find: (actor, id) => prisma.mainSkill.findFirst({ where: { id, campaignId: actor.campaignId } }),
  async create(actor, data) {
    await assertGroup(actor.campaignId, data.spellGroupId);

    return prisma.mainSkill.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        color: data.color,
        icon: data.icon || null,
        isEnableInSkillTree: data.isEnableInSkillTree ?? false,
        spellGroupId: data.spellGroupId || null,
        role: data.role ?? null,
      },
    });
  },
  async update(actor, existing, data) {
    await assertGroup(actor.campaignId, data.spellGroupId);

    return prisma.mainSkill.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
        isEnableInSkillTree: data.isEnableInSkillTree,
        spellGroupId: data.spellGroupId !== undefined ? data.spellGroupId || null : undefined,
        role: data.role,
      },
    });
  },
  async remove(actor, existing) {
    await prisma.mainSkill.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
```

`assertGroup` — нова перевірка: до цього школу з іншої кампанії можна було записати. Той самий принцип, що й у скілах (`invalidCampaignRefs` зі `spellGroup`), і вимога спеку «посилання в тілі перевіряються на належність кампанії».

- [ ] **Step 2: Роути**

`main-skills/route.ts`: `export const { GET, POST } = collectionRoutes(mainSkillsResource);`
`main-skills/[mainSkillId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(mainSkillsResource, "mainSkillId");`

- [ ] **Step 3: Клієнт.** `lib/api/main-skills.ts`: четвертий дженерик `void` → `{ ok: true }`.

- [ ] **Step 4: Регресійний тест `main-skills-api.test.ts`**

`findUnique` → `findFirst`, DELETE → `{ ok: true }`. Додати:

```ts
  it("школа магії іншої кампанії → 400, нічого не створено", async () => {
    db.spellGroup.count.mockResolvedValue(0);

    const res = await list.POST(req("POST", { name: "Магія", color: "#fff", spellGroupId: "foreign" }), ctx);

    expect(res.status).toBe(400);
    expect(db.mainSkill.create).not.toHaveBeenCalled();
  });
```

У мок `db` додати `spellGroup: { count: vi.fn(async () => 1) }`.

- [ ] **Step 5: Тести і коміт**

Run: `pnpm test:related lib/server/content/resources/main-skills.ts lib/api/main-skills.ts app/api/campaigns/[id]/main-skills/route.ts` → PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content app/api/campaigns/\[id\]/main-skills lib/api/main-skills.ts app/api/__tests__/main-skills-api.test.ts
git add -A lib/server/content app/api/campaigns/\[id\]/main-skills lib/api/main-skills.ts app/api/__tests__/main-skills-api.test.ts
git commit -m "refactor(content): main skills through the content resource factory; spell group must belong to the campaign"
```

---

### Task 6: Скіли

**Files:**
- Create: `lib/server/content/resources/skills.ts`, `lib/schemas/skills.ts`
- Modify: `app/api/campaigns/[id]/skills/route.ts`, `skills/[skillId]/route.ts`, `skills/[skillId]/build-skill-update-data.ts`, `lib/schemas/index.ts`, `lib/api/skills.ts`, `app/api/__tests__/skills-api.test.ts`, `app/api/__tests__/skills-cache-api.test.ts`
- Delete: `skills/create-skill-schema.ts`, `skills/[skillId]/update-skill-schema.ts` (перед видаленням `grep -rn "create-skill-schema\|update-skill-schema" app lib components types` — всі імпорти перевести на `@/lib/schemas`)
- Keep: `skills/read-skills.ts`, `skills/format-skills-response.ts`, `skills/[skillId]/format-skill-response.ts`, `skills/list-skills-query.ts`, `skills/[skillId]/duplicate/route.ts`

- [ ] **Step 1: Перенести схеми.** Вміст `create-skill-schema.ts` і `update-skill-schema.ts` дослівно перенести в `lib/schemas/skills.ts` з експортами `createSkillSchema`, `updateSkillSchema` і типами:

```ts
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
```

Додати `export * from "./skills";` у `lib/schemas/index.ts` (за алфавітом, після `./races`). У `build-skill-update-data.ts` замінити імпорт типу: `import type { UpdateSkillInput } from "@/lib/schemas";` та `export type UpdateSkillData = UpdateSkillInput;`.

- [ ] **Step 2: Ресурс `lib/server/content/resources/skills.ts`**

```ts
import type { Skill as SkillRow } from "@prisma/client";

import "server-only";
import { formatSkillResponse } from "@/app/api/campaigns/[id]/skills/[skillId]/format-skill-response";
import { buildSkillUpdateData } from "@/app/api/campaigns/[id]/skills/[skillId]/build-skill-update-data";
import { formatSkillsListResponse } from "@/app/api/campaigns/[id]/skills/format-skills-response";
import { listSkillsQuerySchema } from "@/app/api/campaigns/[id]/skills/list-skills-query";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createSkillSchema, type CreateSkillInput, updateSkillSchema, type UpdateSkillInput } from "@/lib/schemas";
import { foreignCampaignRef } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { abilitiesJson } from "@/lib/utils/abilities/read";

const withRefs = { spell: true, spellGroup: true, grantedSpell: true } as const;

async function assertRefs(campaignId: string, data: { spellData?: { spellId?: string | null; grantedSpellId?: string | null; spellGroupId?: string | null }; mainSkillData?: { mainSkillId?: string | null } }) {
  const foreign = await foreignCampaignRef(campaignId, {
    spell: [data.spellData?.spellId, data.spellData?.grantedSpellId],
    spellGroup: data.spellData?.spellGroupId,
    mainSkill: data.mainSkillData?.mainSkillId,
  });

  if (foreign) throw new ContentError(foreign, 400);
}

export const skillsResource = defineResource<SkillRow, CreateSkillInput, UpdateSkillInput>({
  kind: "skills",
  label: "Скіли",
  description: "Бібліотека скілів: опис, іконка, прив'язка до гілки й заклинань, здібності.",
  path: "/skills",
  schemas: { create: createSkillSchema, update: updateSkillSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.SKILLS],
  notFound: API_ERRORS.SKILL_NOT_FOUND,
  async list(actor, query) {
    const { mainSkillId } = parseInput(listSkillsQuerySchema, Object.fromEntries(query));

    if (mainSkillId) {
      return prisma.skill.findMany({
        where: { campaignId: actor.campaignId, mainSkillId },
        select: { id: true, name: true, icon: true, description: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return formatSkillsListResponse(await prisma.skill.findMany({ where: { campaignId: actor.campaignId }, include: withRefs, orderBy: { createdAt: "desc" } }));
  },
  find: (actor, id) => prisma.skill.findFirst({ where: { id, campaignId: actor.campaignId }, include: withRefs }),
  toItem: (row) => formatSkillResponse(row),
  async create(actor, data) {
    await assertRefs(actor.campaignId, data);

    const { basicInfo, spellData, mainSkillData } = data;

    return prisma.skill.create({
      data: {
        campaignId: actor.campaignId,
        image: data.image ?? null,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        name: basicInfo.name,
        description: basicInfo.description || null,
        icon: basicInfo.icon || null,
        spellId: spellData.spellId || null,
        spellGroupId: spellData.spellGroupId || null,
        grantedSpellId: spellData.grantedSpellId || null,
        mainSkillId: mainSkillData.mainSkillId || null,
        spellNewSpellId: spellData.grantedSpellId || null,
      },
      include: withRefs,
    });
  },
  async update(actor, existing, data) {
    await assertRefs(actor.campaignId, data);

    const updated = await prisma.skill.update({ where: { id: existing.id }, data: buildSkillUpdateData(data), include: { ...withRefs, mainSkill: true } });

    return formatSkillResponse(updated);
  },
  async remove(actor, existing) {
    await prisma.skill.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.skill.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
```

`readSkills` (серверна сторінка) лишається окремою функцією з тим самим запитом. Тест у Step 5 перевіряє, що обидва шляхи дають однаковий список.

- [ ] **Step 3: Роути**

`skills/route.ts`: `export const { GET, POST, DELETE } = collectionRoutes(skillsResource);`
`skills/[skillId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(skillsResource, "skillId");`

- [ ] **Step 4: Клієнт `lib/api/skills.ts`**

- дженерик видалення `void` → `{ ok: true }`;
- `deleteAllSkills`:

```ts
export async function deleteAllSkills(campaignId: string): Promise<{ ok: true; deleted: number }> {
  return campaignDelete<{ ok: true; deleted: number }>(campaignId, "/skills");
}
```

Так закривається баг: клієнт чекав `deleted`, а роут віддавав `deletedCount`. `grep -rn "deleteAllSkills" lib/hooks components` — якщо хук показує кількість видалених, тепер вона справжня.

- [ ] **Step 5: Регресійні тести**

`skills-api.test.ts` (20 тестів) і `skills-cache-api.test.ts`:
- `findUnique` → `findFirst` у моках пошуку;
- DELETE → `{ ok: true }`, delete-all → `{ ok: true, deleted: n }` (було `deletedCount`);
- `POST` → 201, якщо статус перевіряється;
- шлях імпорту схем, якщо тести імпортують `create-skill-schema` напряму.

Додати:

```ts
  it("DELETE колекції повертає deleted, а не deletedCount", async () => {
    db.skill.deleteMany.mockResolvedValue({ count: 4 });

    expect(await (await list.DELETE(req("DELETE"), ctx)).json()).toEqual({ ok: true, deleted: 4 });
  });
```

- [ ] **Step 6: Тести і коміт**

Run: `pnpm test:related lib/server/content/resources/skills.ts lib/schemas/skills.ts lib/api/skills.ts app/api/campaigns/[id]/skills/route.ts` → PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content lib/schemas app/api/campaigns/\[id\]/skills lib/api/skills.ts app/api/__tests__/skills-api.test.ts app/api/__tests__/skills-cache-api.test.ts
git add -A lib/server/content lib/schemas app/api/campaigns/\[id\]/skills lib/api/skills.ts app/api/__tests__ lib/hooks components
git commit -m "refactor(content): skills through the content resource factory; schemas move to lib/schemas; delete-all returns deleted"
```

---

### Task 7: Артефакти й сети

**Files:**
- Create: `lib/server/content/resources/artifacts.ts`, `lib/server/content/resources/artifact-sets.ts`
- Modify: `app/api/campaigns/[id]/artifacts/route.ts`, `artifacts/[artifactId]/route.ts`, `artifact-sets/route.ts`, `artifact-sets/[setId]/route.ts`, `lib/api/artifacts.ts`, `lib/api/artifact-sets.ts`, `app/api/__tests__/artifacts-weapon-api.test.ts`, `app/api/__tests__/artifact-transfer-api.test.ts` (якщо зачіпає ці роути)
- Delete: `artifact-sets/route-errors.ts` (`grep -rn "route-errors" app lib` перед видаленням)
- Keep: `artifacts/read-artifacts.ts`, `artifact-sets/read-artifact-sets.ts`, `lib/server/artifacts/*`

- [ ] **Step 1: Спільний хелпер іконки** — на початку `artifacts.ts`, експортований для сетів:

```ts
export async function persistIcon(campaignId: string, icon: string | null, objectBaseName: string): Promise<string | null> {
  const resolved = await resolveArtifactIconForPersistence(icon, { campaignId, objectBaseName });

  if (!resolved.ok) throw new ContentError(resolved.message, 422);

  return resolved.value;
}
```

Тип першого аргументу звірити з сигнатурою `resolveArtifactIconForPersistence` у `lib/supabase/artifact-icon-storage.ts`, так само як і тип `resolved.value`.

- [ ] **Step 2: `lib/server/content/resources/artifacts.ts`**

```ts
import type { Artifact as ArtifactRow } from "@prisma/client";
import { randomUUID } from "crypto";
import type { z } from "zod";

import "server-only";
import { readArtifactsList } from "@/app/api/campaigns/[id]/artifacts/read-artifacts";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";
import { foreignCampaignRef } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
import { abilitiesJson, readAbilities } from "@/lib/utils/abilities/read";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";

// persistIcon from Step 1

async function assertSet(campaignId: string, setId: string | null | undefined) {
  const foreign = await foreignCampaignRef(campaignId, { artifactSet: setId });

  if (foreign) throw new ContentError(foreign, 400);
}

const withSet = { artifactSet: true } as const;

export const artifactsResource = defineResource<ArtifactRow, z.infer<typeof createArtifactSchema>, z.infer<typeof patchArtifactSchema>>({
  kind: "artifacts",
  label: "Артефакти",
  description: "Артефакти: слот, рідкість, сет, зброя, бонуси (здібності).",
  path: "/artifacts",
  schemas: { create: createArtifactSchema, update: patchArtifactSchema },
  access: { list: "member", item: "dm" },
  invalidates: [],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => readArtifactsList(actor.campaignId),
  find: (actor, id) => prisma.artifact.findFirst({ where: { id, campaignId: actor.campaignId }, include: withSet }),
  toItem: (row) => {
    const { abilities, issues: abilityIssues } = readAbilities("artifact", row);

    return { ...row, abilities, abilityIssues };
  },
  async create(actor, data) {
    await assertSet(actor.campaignId, data.setId);

    const icon = data.icon !== undefined ? await persistIcon(actor.campaignId, data.icon, randomUUID()) : undefined;

    return prisma.artifact.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        ...(data.weapon && weaponStatsColumns(data.weapon)),
        setId: data.setId,
        icon,
      },
      include: withSet,
    });
  },
  async update(actor, existing, data) {
    await assertSet(actor.campaignId, data.setId);

    const icon =
      data.icon === undefined ? undefined : data.icon === existing.icon ? data.icon : await persistIcon(actor.campaignId, data.icon, `${existing.id}-${randomUUID()}`);

    return prisma.artifact.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        ...(data.weapon && weaponStatsColumns(data.weapon)),
        setId: data.setId !== undefined ? data.setId || null : undefined,
        icon: icon === undefined ? undefined : (icon ?? null),
      },
      include: withSet,
    });
  },
  async remove(actor, existing) {
    await prisma.artifact.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.artifact.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
```

`readArtifacts` (`artifacts/read-artifacts.ts`) розділити: тіло запиту і мапінг винести в експортовану `readArtifactsList(campaignId)`, яка повертає масив. `readArtifacts({ id, accessChecked })` лишається, перевіряє доступ і загортає `readArtifactsList(id)` у `NextResponse.json`. Сигнатура для серверної сторінки не змінюється.

- [ ] **Step 3: `lib/server/content/resources/artifact-sets.ts`**

```ts
import type { z } from "zod";
import { randomUUID } from "crypto";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { createArtifactSetSchema, patchArtifactSetSchema } from "@/lib/schemas/artifact-sets";
import {
  buildArtifactSetPatchInput,
  deleteArtifactSetAndClearArtifacts,
  findArtifactSetInCampaign,
  insertArtifactSet,
  listArtifactSets,
  reloadArtifactSetDetail,
  reloadArtifactSetWithArtifacts,
  updateArtifactSetRow,
} from "@/lib/server/artifacts/artifact-set-queries";
import { SyncArtifactSetError, syncArtifactSetMembers } from "@/lib/server/artifacts/sync-artifact-set-members";
import { persistIcon } from "@/lib/server/content/resources/artifacts";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { readAbilities } from "@/lib/utils/abilities/read";

type SetRow = NonNullable<Awaited<ReturnType<typeof findArtifactSetInCampaign>>>;

async function syncMembers(campaignId: string, setId: string, artifactIds: string[]) {
  try {
    await syncArtifactSetMembers(campaignId, setId, artifactIds);
  } catch (error) {
    if (error instanceof SyncArtifactSetError) throw new ContentError(error.message, 400);

    throw error;
  }
}

export const artifactSetsResource = defineResource<SetRow, z.infer<typeof createArtifactSetSchema>, z.infer<typeof patchArtifactSetSchema>>({
  kind: "artifact-sets",
  label: "Сети артефактів",
  description: "Сети: склад артефактів, бонус сету (текст і здібності), іконка.",
  path: "/artifact-sets",
  schemas: { create: createArtifactSetSchema, update: patchArtifactSetSchema },
  access: { list: "member", item: "member" },
  invalidates: [],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => listArtifactSets(actor.campaignId),
  find: (actor, id) => findArtifactSetInCampaign(actor.campaignId, id),
  toItem: (row) => {
    const { abilities, issues: abilityIssues } = readAbilities("artifactSet", row);

    return { ...row, abilities, abilityIssues };
  },
  async create(actor, data) {
    const icon = data.icon !== undefined ? await persistIcon(actor.campaignId, data.icon, randomUUID()) : undefined;

    const created = await insertArtifactSet(actor.campaignId, { name: data.name, description: data.description ?? null, setBonus: data.setBonus, icon, abilities: data.abilities });

    if (data.artifactIds?.length) await syncMembers(actor.campaignId, created.id, data.artifactIds);

    return reloadArtifactSetWithArtifacts(created.id);
  },
  async update(actor, existing, data) {
    const patch =
      data.icon !== undefined && data.icon !== existing.icon ? { ...data, icon: await persistIcon(actor.campaignId, data.icon, `${existing.id}-${randomUUID()}`) } : data;

    const updateData = buildArtifactSetPatchInput(patch);

    if (Object.keys(updateData).length > 0) await updateArtifactSetRow(existing.id, updateData);

    if (data.artifactIds !== undefined) await syncMembers(actor.campaignId, existing.id, data.artifactIds);

    return reloadArtifactSetDetail(existing.id);
  },
  remove: (actor, existing) => deleteArtifactSetAndClearArtifacts(actor.campaignId, existing.id),
});
```

`deleteArtifactSetAndClearArtifacts` видаляє сет через `deleteMany({ where: { id: setId } })`. У `lib/server/artifacts/artifact-set-queries.ts:145` додати туди `campaignId` (`where: { id: setId, campaignId }`), щоб і цей шлях був обмежений кампанією.

Форма помилки валідації сетів змінюється: `{ error: issues[] }` → `{ error: INVALID_BODY, issues }`. `bodyErrorMessage` у `lib/api/client.ts` розуміє обидві форми — звірити це там.

- [ ] **Step 4: Роути**

- `artifacts/route.ts`: `export const { GET, POST, DELETE } = collectionRoutes(artifactsResource);`
- `artifacts/[artifactId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(artifactsResource, "artifactId");`
- `artifact-sets/route.ts`: `export const { GET, POST } = collectionRoutes(artifactSetsResource);`
- `artifact-sets/[setId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(artifactSetsResource, "setId");`

- [ ] **Step 5: Клієнти.**
  - `lib/api/artifacts.ts`: видалення `void` → `{ ok: true }`; `deleteAllArtifacts` → `Promise<{ ok: true; deleted: number }>`.
  - `lib/api/artifact-sets.ts`: `{ success: boolean }` → `{ ok: true }`.
  - `grep -rn "deleteAllArtifacts\|deleteArtifactSet" lib/hooks components`: якщо хтось читає `.deleted`, поле лишилось.

- [ ] **Step 6: Регресійні тести.** `artifacts-weapon-api.test.ts` — `findUnique` → `findFirst`, форми відповідей. Додати в новий `lib/server/content/__tests__/artifact-resources.test.ts` (з моками `@/lib/db`, `@/lib/supabase/artifact-icon-storage`, `@/lib/server/artifacts/sync-artifact-set-members`):

```ts
  it("іконка, яку не вдалося зберегти → 422 з текстом сховища, без запису", async () => {
    resolveIcon.mockResolvedValue({ ok: false, message: "Завеликий файл" });

    const error = await createContent(artifactsResource, actor, { name: "Меч", slot: "weapon", icon: "data:image/png;base64,AAA" }).catch((e) => e);

    expect(error).toMatchObject({ status: 422, message: "Завеликий файл" });
    expect(db.artifact.create).not.toHaveBeenCalled();
  });

  it("PATCH з тією самою іконкою не перезавантажує її", async () => {
    db.artifact.findFirst.mockResolvedValue({ id: "a1", campaignId: "c1", icon: "https://x/i.png" });

    await updateContent(artifactsResource, actor, "a1", { icon: "https://x/i.png" });

    expect(resolveIcon).not.toHaveBeenCalled();
  });

  it("сет з артефактом іншої кампанії → 400 ContentError", async () => {
    sync.mockRejectedValue(new SyncArtifactSetError("Усі артефакти мають належати цій кампанії та існувати в базі."));

    const error = await updateContent(artifactSetsResource, actor, "s1", { artifactIds: ["foreign"] }).catch((e) => e);

    expect(error).toMatchObject({ status: 400 });
  });
```

`slot: "weapon"` замінити на будь-яке допустиме значення `createArtifactSchema`, а мінімальне валідне тіло звірити зі схемою.

- [ ] **Step 7: Тести і коміт**

Run: `pnpm test:related lib/server/content/resources/artifacts.ts lib/server/content/resources/artifact-sets.ts lib/api/artifacts.ts lib/api/artifact-sets.ts lib/server/artifacts/artifact-set-queries.ts` → PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server app/api/campaigns/\[id\]/artifacts app/api/campaigns/\[id\]/artifact-sets lib/api/artifacts.ts lib/api/artifact-sets.ts app/api/__tests__
git add -A lib/server app/api/campaigns/\[id\]/artifacts app/api/campaigns/\[id\]/artifact-sets lib/api app/api/__tests__ lib/hooks components
git commit -m "refactor(content): artifacts and artifact sets through the content resource factory"
```

---

### Task 8: Треки музики

**Files:**
- Create: `lib/server/content/resources/tracks.ts`
- Modify: `app/api/campaigns/[id]/tracks/route.ts`, `tracks/[trackId]/route.ts`, `tracks/track-handlers.ts`, `app/api/__tests__/tracks-api.test.ts`
- Keep: `tracks/order/route.ts`, `tracks/upload-url/route.ts` (їхні обробники лишаються в `track-handlers.ts`)

- [ ] **Step 1: Ресурс.** У `tracks.ts` перенести з `track-handlers.ts` функції `isLibraryFull`, `fileSource`, `youtubeSource` і тип `TrackSource`. З `track-handlers.ts` прибрати `getTracksHandler`, `createTrackHandler`, `updateTrackHandler`, `deleteTrackHandler`, `ownedTrack`. `issueUploadTicketHandler` і `reorderTracksHandler` лишаються (імпортують `isLibraryFull` з ресурсу).

```ts
import { after } from "next/server";
import type { CampaignTrack as TrackRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACKS_PER_CAMPAIGN } from "@/lib/constants/music";
import { prisma } from "@/lib/db";
import { createTrackSchema, updateTrackSchema } from "@/lib/schemas/music";
import { listTracks, toCampaignTrack } from "@/lib/server/audio/track-store";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { removeTrackFile, trackObjectPath, trackPathOwnedBy, verifyUploadedTrack } from "@/lib/supabase/battle-music-storage";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";
import { fetchYoutubeTitle } from "@/lib/utils/audio/youtube-oembed";
import type { Result } from "@/types/common";

// TrackSource, isLibraryFull (exported), fileSource, youtubeSource — moved verbatim from track-handlers.ts

const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) throw new ContentError(result.message, 400);

  return result.value;
};

export const tracksResource = defineResource<TrackRow, z.infer<typeof createTrackSchema>, z.infer<typeof updateTrackSchema>>({
  kind: "tracks",
  label: "Музика бою",
  description: "Треки плеєра бою. Через API — лише YouTube за посиланням; файли завантажуються в UI.",
  path: "/tracks",
  schemas: { create: createTrackSchema, update: updateTrackSchema },
  access: { list: "dm", item: "dm" },
  invalidates: [],
  notFound: API_ERRORS.TRACK_NOT_FOUND,
  list: (actor) => listTracks(actor.campaignId),
  find: (actor, id) => prisma.campaignTrack.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: toCampaignTrack,
  async create(actor, body) {
    if (await isLibraryFull(actor.campaignId)) throw new ContentError(API_ERRORS.TRACK_LIMIT, 400);

    const source = unwrap(body.kind === "file" ? await fileSource(actor.campaignId, body) : await youtubeSource(body));

    const last = await prisma.campaignTrack.aggregate({ where: { campaignId: actor.campaignId }, _max: { sortOrder: true } });

    return toCampaignTrack(await prisma.campaignTrack.create({ data: { campaignId: actor.campaignId, ...source, sortOrder: (last._max.sortOrder ?? -1) + 1 } }));
  },
  async update(_actor, existing, body) {
    if (body.url !== undefined && existing.kind !== "youtube") throw new ContentError(API_ERRORS.TRACK_URL_LOCKED, 400);

    const data = { title: body.title, durationSec: body.durationSec, youtubeId: body.url === undefined ? undefined : parseYoutubeId(body.url) };

    return toCampaignTrack(await prisma.campaignTrack.update({ where: { id: existing.id }, data }));
  },
  async remove(actor, existing) {
    await prisma.campaignTrack.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });

    const { url } = existing;

    if (existing.kind === "file" && url) {
      const path = trackObjectPath(url);

      if (path && trackPathOwnedBy(path, actor.campaignId)) after(() => removeTrackFile(url));
    }
  },
});
```

`MAX_TRACKS_PER_CAMPAIGN` потрібен лише `isLibraryFull`. Порядок перевірок у `update`/`remove`: раніше тіло парсилося до пошуку треку, тепер спершу 404, потім 400.

- [ ] **Step 2: Роути**

`tracks/route.ts`: `export const { GET, POST } = collectionRoutes(tracksResource);`
`tracks/[trackId]/route.ts`: `export const { GET, PATCH, DELETE } = itemRoutes(tracksResource, "trackId");`

- [ ] **Step 3: Клієнт `lib/api/tracks.ts`** — без змін: `{ ok: true }` уже був.

- [ ] **Step 4: Регресійний тест `tracks-api.test.ts` (13 тестів)**
  - мок пошуку `findUnique` → `findFirst`;
  - `delete` → `deleteMany`;
  - якщо тест чекає 400 на невалідне тіло для неіснуючого треку, тепер правильна відповідь — 404 (свідома зміна порядку). Решта очікувань — без змін.

- [ ] **Step 5: Тести і коміт**

Run: `pnpm test:related lib/server/content/resources/tracks.ts app/api/campaigns/[id]/tracks/track-handlers.ts` → PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content app/api/campaigns/\[id\]/tracks app/api/__tests__/tracks-api.test.ts
git add -A lib/server/content app/api/campaigns/\[id\]/tracks app/api/__tests__/tracks-api.test.ts
git commit -m "refactor(content): music tracks through the content resource factory"
```

---

### Task 9: Реєстр `CONTENT_RESOURCES`, дерева скілів, захист від регресу

**Files:**
- Create: `lib/server/content/resources/index.ts`, `lib/server/content/__tests__/registry.test.ts`
- Modify: `app/api/campaigns/[id]/skill-trees/route.ts`, `app/api/__tests__/skill-trees-api.test.ts`

- [ ] **Step 1: Реєстр**

```ts
import "server-only";
import type { AnyContentResource, ContentKind } from "@/lib/server/content/define-resource";
import { artifactSetsResource } from "@/lib/server/content/resources/artifact-sets";
import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { mainSkillsResource } from "@/lib/server/content/resources/main-skills";
import { racesResource } from "@/lib/server/content/resources/races";
import { skillsResource } from "@/lib/server/content/resources/skills";
import { spellGroupsResource } from "@/lib/server/content/resources/spell-groups";
import { spellsResource } from "@/lib/server/content/resources/spells";
import { tracksResource } from "@/lib/server/content/resources/tracks";
import { unitsResource } from "@/lib/server/content/resources/units";

export const CONTENT_RESOURCES = {
  units: unitsResource,
  races: racesResource,
  spells: spellsResource,
  "spell-groups": spellGroupsResource,
  "main-skills": mainSkillsResource,
  skills: skillsResource,
  artifacts: artifactsResource,
  "artifact-sets": artifactSetsResource,
  tracks: tracksResource,
} satisfies Record<ContentKind, AnyContentResource>;
```

- [ ] **Step 2: Тест реєстру**

Тест перевіряє: кожен ресурс має однаковий `kind` з ключем; `path` унікальний; для кожного `path` існує колекційний і item-роут, які експортують фабричні обробники.

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

const ROOT = "app/api/campaigns/[id]";

const ITEM_PARAM: Record<string, string> = {
  units: "unitId", races: "raceId", spells: "spellId", "spell-groups": "groupId", "main-skills": "mainSkillId",
  skills: "skillId", artifacts: "artifactId", "artifact-sets": "setId", tracks: "trackId",
};

describe("CONTENT_RESOURCES", () => {
  it("ключ = kind, шляхи унікальні", () => {
    for (const [key, r] of Object.entries(CONTENT_RESOURCES)) expect(r.kind).toBe(key);

    const paths = Object.values(CONTENT_RESOURCES).map((r) => r.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(Object.values(CONTENT_RESOURCES))("$kind: route.ts колекції і запису — з фабрики", (r) => {
    const collection = `${ROOT}${r.path}/route.ts`;

    const item = `${ROOT}${r.path}/[${ITEM_PARAM[r.kind]}]/route.ts`;

    expect(readFileSync(collection, "utf8")).toContain("collectionRoutes(");
    expect(existsSync(item) && readFileSync(item, "utf8")).toContain(`itemRoutes(`);
  });
});
```

Якщо імпорт реєстру в тесті тягне Prisma або Supabase і не працює без env, замокати `@/lib/db` і `@/lib/supabase/artifact-icon-storage`, `@/lib/supabase/battle-music-storage` порожніми об'єктами.

- [ ] **Step 3: `skill-trees/route.ts` GET → стандартний доступ учасника**

```ts
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { resolveActor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const actor = await resolveActor(req, id, { access: "member" });

    if (actor instanceof NextResponse) return actor;

    return NextResponse.json(await prisma.skillTree.findMany({ where: { campaignId: id } }));
  } catch (error) {
    return handleApiError(error, { action: "list skill trees" });
  }
}
```

У `skill-trees-api.test.ts` тест «не учасник → 404» замінити на «не учасник → 403». Мок: `requireCampaignAccess` повертає `NextResponse` 403; `requireAuth` і `prisma.campaign.findUnique` для цього роуту більше не потрібні.

- [ ] **Step 4: Тести і коміт**

Run: `pnpm test:run lib/server/content app/api/__tests__/skill-trees-api.test.ts` → PASS.

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/server/content app/api/campaigns/\[id\]/skill-trees app/api/__tests__/skill-trees-api.test.ts
git add -A lib/server/content app/api/campaigns/\[id\]/skill-trees app/api/__tests__/skill-trees-api.test.ts
git commit -m "feat(content): CONTENT_RESOURCES registry with route coverage test; skill trees use standard member access"
```

---

### Task 10: Повна перевірка частини 2a

Ця задача — для координатора (основна сесія), не для субагента-виконавця.

- [ ] **Step 1:** `pnpm test:run` — усі тести зелені. Кількість має бути ≥ поточної (5257) плюс нові.
- [ ] **Step 2:** `pnpm lint` — 0 errors; `pnpm build` — успішно.
- [ ] **Step 3:** `grep -rn "NextResponse.json({ error" app/api/campaigns/\[id\]/{units,races,spells,main-skills,skills,artifacts,artifact-sets,tracks}` — порожньо: «сирих» помилок у роутах контенту не лишилось.
- [ ] **Step 4:** battle-sweep на `constructor`:

```bash
set -a; source .env.local; set +a
pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv
```

Очікування: без помилок, крім відомого нестабільного сценарію лабіринту «ворог у полі зору прокидається».

- [ ] **Step 5: Браузер.** `pnpm dev -p 3001`, кампанія HOMM5 (`cmuylhk0c0001ia06lg5eommv`). У кожній бібліотеці (юніти, раси, заклинання, школи магії, основні скіли, скіли, артефакти, сети, музика — YouTube-трек):
  - створити тестовий запис «ТЕСТ 2a»;
  - змінити його;
  - видалити.

  Окремо:
  - перейменувати расу туди й назад — персонажі цієї раси зберегли расу;
  - «Видалити всі» не натискати на робочій кампанії. Перевірити лише на тестовій кампанії з «Порожньої», куди створено 2 юніти: «Видалити всі» показує правильну кількість.

  Після перевірки видалити тестові записи й тестову кампанію.
- [ ] **Step 6:** Оновити `docs/STATUS.md`: рядок конструктора — «2a (фабрика CRUD) готова». Закомітити.
