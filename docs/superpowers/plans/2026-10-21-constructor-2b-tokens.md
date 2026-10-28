# Конструктор 2b — токени й автентифікація: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API-токени AI-асистента отримують права (`ai`, `content:read`, `content:write`), і всі роути контенту, правил та експорту приймають `Authorization: Bearer` через єдиний `resolveActor`.

**Architecture:** `verifyApiToken` повертає scopes; `resolveActor(req, campaignId, need)` у `lib/utils/api/actor.ts` за наявності заголовка `Authorization` працює тільки з токеном (без відкату до cookie), інакше — як зараз із сесією. `runContent` передає `need` (`access` + `scope` + `sessionOnly`) з фабрики й нестандартних роутів. CSRF-перевірка пропускає запити з Bearer. UI `/dm/ai` отримує галочки прав і показує на шаблонах лише секцію токенів («API»).

**Tech Stack:** Next.js 16 route handlers, Zod 4, Prisma 6, TanStack Query, Vitest (+ happy-dom для UI).

**Spec:** `docs/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md` (розділ «2b. Токени й автентифікація»). Попередня частина: `docs/superpowers/plans/2026-10-21-constructor-2a-content-factory.md`.

## Global Constraints

- Робота лише в worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; БД лише `postgresql://postgres:postgres@localhost:54322/constructor`. Без злиття в `main` і без prod.
- Без міграцій: колонка `api_tokens.scopes String[]` уже є. Наявні токени мають `["ai"]` і нових прав не отримують.
- `API_TOKEN_SCOPES = ["ai", "content:read", "content:write"]`; `content:write` включає `content:read`.
- Недійсний / відкликаний / невідомий Bearer → 401, **відкату до cookie немає**. Токен іншої кампанії або без потрібного scope → 403. Через токен актор завжди `isDM: true`, `via: "token"`.
- `sessionOnly` (масове видалення: `DELETE` колекції, `spells/delete-all`, `units/delete-all`, `spells/delete-by-level`) — токен отримує 403.
- Роути поза контентом (бої, персонажі, сценарій, показ, AI-чат, `tracks/upload-url`, `api-tokens`) Bearer не читають.
- Треки через токен — лише YouTube (`kind: "file"` з токеном → 403).
- Тексти помилок — українською в `lib/constants/api-errors.ts`; тіло помилки `{ error, issues? }` через `errorResponse`.
- Мінімум коментарів (лише неочевидне «чому», один рядок). Порожній рядок навколо `const`/`if`/`return` (ESLint `padding-line-between-statements`). Імпорти через `@/`.
- Коміти: англійською, з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Тести під час роботи — `pnpm test:related <files>` / `pnpm test:changed`; повний `pnpm test:run` — один раз наприкінці.

## Review Focus

1. **Застарілі id, уже збережені в записі** (видалене заклинання в `knownSpells`, видалений основний скіл в `availableSkills`) — редагування такого юніта/раси з UI має й далі зберігатися; перевіряються лише **нові** id, яких не було в записі. Тест — Task 4.
2. **Заголовок `Authorization` без валідного токена разом із cookie** (`Bearer` без значення, `Basic …`, чужий префікс) — 401, жодного звернення до сесії. Тест — Task 2.
3. **Наявні токени `["ai"]`** — MCP і далі працює, роути контенту віддають 403, у списку токенів видно чип «AI-асистент». Тести — Task 1, Task 2, Task 5.
4. **Токен з `content:*`, але без `ai`, на `/api/mcp`** — 403 (до 2d, де набір інструментів фільтруватиметься за scopes), а не повний доступ до інструментів AI. Тест — Task 1.
5. **Токен з правом `ai` на шаблоні** — 400 під час створення (на шаблоні немає AI-асистента). Тест — Task 1.

---

## File Structure

| Файл | Що змінюється |
|---|---|
| `lib/constants/ai.ts` | `API_TOKEN_SCOPES` (3 права), `ApiTokenScope`, `API_TOKEN_SCOPE_LABELS`, `hasScope` |
| `lib/constants/api-errors.ts` | нові тексти: `API_TOKEN_SCOPE_MISSING`, `API_TOKEN_WRONG_CAMPAIGN`, `API_TOKEN_SESSION_ONLY`, `API_TOKEN_AI_ON_TEMPLATE`, `TRACK_FILE_SESSION_ONLY`, `FOREIGN_SKILL` |
| `lib/schemas/ai.ts` | `createApiTokenSchema` + `scopes` |
| `types/ai.ts` | `ApiTokenSummary.scopes`, `CreateApiTokenInput` |
| `lib/ai/api-tokens.ts` | `createApiToken(campaignId, userId, input)`, `scopes` у `SELECT`, `verifyApiToken` повертає `scopes`, `bearerToken(req)` |
| `lib/utils/api/api-auth.ts` | `campaign.kind` у `CampaignAccessResult` |
| `app/api/campaigns/[id]/api-tokens/token-handlers.ts` | scopes у створенні; `ai` на шаблоні → 400 |
| `app/api/mcp/route.ts` | `bearerToken`; без scope `ai` → 403 |
| `lib/utils/api/actor.ts` | Bearer-гілка, `ContentScope`, `ActorNeed` |
| `lib/utils/api/content-routes.ts` | `runContent({ need })`, scope за методом, `sessionOnly` для «видалити всі» |
| `lib/supabase/middleware.ts` | пропуск CSRF для `Authorization: Bearer` |
| `lib/server/campaigns/rules.ts` (новий) | `readCampaignRules`, `updateCampaignRules` |
| нестандартні роути контенту (11 файлів) | перехід на `runContent` / `resolveActor` |
| `lib/server/content/resources/tracks.ts` | `kind: "file"` через токен → 403 |
| `lib/server/campaigns/campaign-refs.ts` | вид `skill`; хелпер `addedIds` |
| `lib/server/content/resources/{units,races}.ts` | перевірка `knownSpells`, `availableSkills`, `disabledSkills` |
| `lib/api/ai.ts`, `lib/hooks/ai/useApiTokens.ts` | `createApiToken(campaignId, input)` |
| `components/ai/ApiTokenList.tsx` | галочки прав, чипи прав |
| `app/campaigns/[id]/dm/ai/{page,page-client}.tsx` | шаблон → лише токени, заголовок «API» |
| `components/layout/{dm-menu.ts,Header.tsx}` | пункт «API» для шаблонів |
| `docs/architecture/ai.md`, `docs/STATUS.md` | опис прав і Bearer |

---

### Task 1: Права токенів — константи, створення, перевірка, MCP

**Files:**
- Modify: `lib/constants/ai.ts:78-79`
- Modify: `lib/constants/api-errors.ts` (біля `API_TOKEN_NOT_FOUND`, рядок ~100)
- Modify: `lib/schemas/ai.ts:36`
- Modify: `types/ai.ts:83-93`
- Modify: `lib/ai/api-tokens.ts`
- Modify: `lib/utils/api/api-auth.ts:29-38, 81-120`
- Modify: `app/api/campaigns/[id]/api-tokens/token-handlers.ts`
- Modify: `app/api/mcp/route.ts`
- Test: `app/api/__tests__/api-tokens-mcp.test.ts`, `lib/constants/__tests__/ai-scopes.test.ts` (новий)

**Interfaces:**
- Produces:
  - `API_TOKEN_SCOPES = ["ai", "content:read", "content:write"] as const`; `type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number]`; `type ContentScope = Exclude<ApiTokenScope, "ai">`
  - `API_TOKEN_SCOPE_LABELS: Record<ApiTokenScope, string>`
  - `hasScope(scopes: readonly string[], need: ApiTokenScope): boolean`
  - `createApiToken(campaignId: string, userId: string, input: CreateApiTokenInput): Promise<CreatedApiToken>`
  - `verifyApiToken(raw: string): Promise<{ campaignId: string; userId: string; scopes: ApiTokenScope[] } | null>`
  - `bearerToken(req: Request): string | null` — `null`, якщо заголовка `Authorization` немає; інакше значення після `Bearer ` (або `""`, якщо формат інший)
  - `interface CreateApiTokenInput { name: string; scopes: ApiTokenScope[] }`; `ApiTokenSummary.scopes: ApiTokenScope[]`
  - `CampaignAccessResult.campaign.kind: string`

- [ ] **Step 1: Тест `hasScope`**

`lib/constants/__tests__/ai-scopes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { hasScope } from "@/lib/constants/ai";

describe("hasScope", () => {
  it("content:write включає content:read", () => {
    expect(hasScope(["content:write"], "content:read")).toBe(true);
    expect(hasScope(["content:read"], "content:write")).toBe(false);
  });

  it("ai не дає прав на контент і навпаки", () => {
    expect(hasScope(["ai"], "content:read")).toBe(false);
    expect(hasScope(["content:write"], "ai")).toBe(false);
    expect(hasScope(["ai"], "ai")).toBe(true);
  });
});
```

Run: `pnpm test:run lib/constants/__tests__/ai-scopes.test.ts` → FAIL (`hasScope` не існує).

- [ ] **Step 2: Константи й тексти помилок**

`lib/constants/ai.ts` (замінити рядок `API_TOKEN_SCOPES`):

```ts
export const API_TOKEN_SCOPES = ["ai", "content:read", "content:write"] as const;

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

export type ContentScope = Exclude<ApiTokenScope, "ai">;

export const API_TOKEN_SCOPE_LABELS: Record<ApiTokenScope, string> = {
  ai: "AI-асистент (MCP)",
  "content:read": "Читання контенту",
  "content:write": "Запис контенту",
};

export const hasScope = (scopes: readonly string[], need: ApiTokenScope) => scopes.includes(need) || (need === "content:read" && scopes.includes("content:write"));
```

`lib/constants/api-errors.ts` — поруч з `API_TOKEN_NOT_FOUND`:

```ts
  API_TOKEN_SCOPE_MISSING: "У токена немає потрібного права",
  API_TOKEN_WRONG_CAMPAIGN: "Токен належить іншій кампанії",
  API_TOKEN_SESSION_ONLY: "Ця дія доступна лише з інтерфейсу",
  API_TOKEN_AI_ON_TEMPLATE: "На шаблоні немає AI-асистента — оберіть лише права на контент",
```

і поруч з `TRACK_URL_LOCKED`:

```ts
  TRACK_FILE_SESSION_ONLY: "Через API можна додати лише трек з YouTube",
```

і поруч з `FOREIGN_RACE`:

```ts
  FOREIGN_SKILL: "Скіл не належить цій кампанії",
```

Run step 1 test → PASS.

- [ ] **Step 3: Падаючі тести токенів і MCP**

У `app/api/__tests__/api-tokens-mcp.test.ts`:
- у моку `prisma` додати `campaign: { findUnique: vi.fn() }` не потрібно — шаблон перевіряється через `requireDM`; натомість замокати `@/lib/utils/api/api-auth`: `vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }))`;
- оновити тест створення: `createApiToken("camp1", "dm", { name: "Claude Desktop", scopes: ["content:read"] })` і перевірити `data.scopes` = `["content:read"]`;
- у всіх `findUnique` мок-рядках додати `scopes: ["ai"]`;
- додати тести:

```ts
  it("verifyApiToken повертає scopes і відкидає невідомі", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write", "junk"] } as never);

    const { verifyApiToken } = await import("@/lib/ai/api-tokens");

    expect(await verifyApiToken("dndt_abc")).toEqual({ campaignId: "camp1", userId: "dm", scopes: ["content:write"] });
  });

  it("токен без права ai на MCP — 403", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write"] } as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(403);
  });

  it("bearerToken: немає заголовка → null, інший формат → порожній рядок", async () => {
    const { bearerToken } = await import("@/lib/ai/api-tokens");

    expect(bearerToken(new Request("http://x"))).toBeNull();
    expect(bearerToken(new Request("http://x", { headers: { authorization: "Bearer  dndt_x " } }))).toBe("dndt_x");
    expect(bearerToken(new Request("http://x", { headers: { authorization: "Basic abc" } }))).toBe("");
  });

  describe("POST /api-tokens", () => {
    const post = async (body: unknown, kind = "campaign") => {
      const apiAuth = await import("@/lib/utils/api/api-auth");

      vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp1", kind } } as never);
      vi.mocked(prisma.apiToken.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({ id: "k1", name: data.name, prefix: data.prefix, scopes: data.scopes, lastUsedAt: null, createdAt: new Date() })) as never);

      const { POST } = await import("@/app/api/campaigns/[id]/api-tokens/route");

      return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp1" }) });
    };

    it("без прав — 400", async () => {
      expect((await post({ name: "X", scopes: [] })).status).toBe(400);
    });

    it("право ai на шаблоні — 400", async () => {
      expect((await post({ name: "X", scopes: ["ai", "content:read"] }, "template")).status).toBe(400);
    });

    it("content:* на шаблоні — 201 з правами в відповіді", async () => {
      const res = await post({ name: "X", scopes: ["content:write", "content:write"] }, "template");

      expect(res.status).toBe(201);
      expect((await res.json()).scopes).toEqual(["content:write"]);
    });
  });
```

Наявний тест «валідний токен — tools/list…» має мати `scopes: ["ai"]` у моку й лишатися зеленим.

Run: `pnpm test:run app/api/__tests__/api-tokens-mcp.test.ts` → FAIL.

- [ ] **Step 4: Типи, схема, `api-auth`**

`types/ai.ts`:

```ts
import type { ApiTokenScope } from "@/lib/constants/ai";

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiTokenScope[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiTokenInput {
  name: string;
  scopes: ApiTokenScope[];
}
```

(якщо `types/ai.ts` уже імпортує з `lib/constants/ai` — додати до наявного імпорту.)

`lib/schemas/ai.ts`:

```ts
export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1).max(60),
  scopes: z
    .array(z.enum(API_TOKEN_SCOPES))
    .min(1)
    .transform((s) => [...new Set(s)]),
});
```

(`API_TOKEN_SCOPES` імпортувати з `@/lib/constants/ai`.)

`lib/utils/api/api-auth.ts`: у `CampaignAccessResult.campaign` додати `kind: string;`, у `select` — `kind: true`, у результат — `kind: campaign.kind`.

- [ ] **Step 5: `lib/ai/api-tokens.ts`**

```ts
const SELECT = { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, createdAt: true } as const;

const knownScopes = (raw: string[]): ApiTokenScope[] => raw.filter((s): s is ApiTokenScope => (API_TOKEN_SCOPES as readonly string[]).includes(s));

const toSummary = (r: { id: string; name: string; prefix: string; scopes: string[]; lastUsedAt: Date | null; createdAt: Date }): ApiTokenSummary => ({
  ...r,
  scopes: knownScopes(r.scopes),
  lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");

  if (header === null) return null;

  return header.match(/^Bearer\s+(.+)$/i)?.[1].trim() ?? "";
}

export async function createApiToken(campaignId: string, userId: string, { name, scopes }: CreateApiTokenInput): Promise<CreatedApiToken> {
  // ...як було, але scopes: [...scopes]
}
```

`verifyApiToken`: у `select` додати `scopes: true`, тип повернення `Promise<{ campaignId: string; userId: string; scopes: ApiTokenScope[] } | null>`, повертати `{ campaignId: row.campaignId, userId: row.userId, scopes: knownScopes(row.scopes) }`.

- [ ] **Step 6: Хендлер створення і MCP**

`token-handlers.ts` → `createApiTokenHandler`:

```ts
    const body = await parseBody(createApiTokenSchema, req);

    if (body instanceof NextResponse) return body;

    if (access.campaign.kind === CampaignKind.TEMPLATE && body.scopes.includes("ai")) return errorResponse(API_ERRORS.API_TOKEN_AI_ON_TEMPLATE, 400);

    return NextResponse.json(await createApiToken(campaignId, access.userId, body), { status: 201 });
```

`app/api/mcp/route.ts`:

```ts
  const raw = bearerToken(req);

  const auth = raw ? await verifyApiToken(raw) : null;

  if (!auth) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

  // content-only tokens get MCP tools in 2d (filtered by scope)
  if (!hasScope(auth.scopes, "ai")) return errorResponse(API_ERRORS.API_TOKEN_SCOPE_MISSING, 403);
```

- [ ] **Step 7: Тести → PASS, typecheck**

Run: `pnpm test:run app/api/__tests__/api-tokens-mcp.test.ts lib/constants/__tests__/ai-scopes.test.ts` → PASS.
Run: `pnpm exec tsc --noEmit` → помилки лише в `lib/api/ai.ts` / `useApiTokens` / `ApiTokenList` (виправляє Task 5) або жодних. Якщо `lib/api/ai.ts` не компілюється — у цьому ж таску змінити `createApiToken` у `lib/api/ai.ts` на `(campaignId: string, input: CreateApiTokenInput) => campaignPost<CreatedApiToken>(campaignId, "/api-tokens", input)`, а `useApiTokens.create` — на `(input: CreateApiTokenInput)`; `ApiTokenList` тимчасово передає `{ name, scopes: ["ai"] }` (Task 5 замінює на галочки).

- [ ] **Step 8: Commit**

```bash
git add lib/constants lib/schemas/ai.ts types/ai.ts lib/ai/api-tokens.ts lib/utils/api/api-auth.ts app/api/campaigns/\[id\]/api-tokens app/api/mcp lib/api/ai.ts lib/hooks/ai components/ai app/api/__tests__/api-tokens-mcp.test.ts
git commit -m "feat(tokens): scopes ai/content:read/content:write on API tokens; MCP requires ai"
```

---

### Task 2: `resolveActor` з Bearer, scopes у фабриці, CSRF

**Files:**
- Modify: `lib/utils/api/actor.ts`
- Modify: `lib/utils/api/content-routes.ts`
- Modify: `lib/supabase/middleware.ts:22-23`
- Test: `lib/utils/api/__tests__/actor.test.ts` (новий), `lib/utils/api/__tests__/content-routes.test.ts`, `lib/supabase/__tests__/middleware-csrf.test.ts`, `app/api/__tests__/bearer-non-content-routes.test.ts` (новий)

**Interfaces:**
- Consumes: `verifyApiToken`, `bearerToken`, `hasScope`, `ContentScope` (Task 1).
- Produces:
  - `type ActorNeed = { access: AccessLevel; scope: ContentScope; sessionOnly?: true }`
  - `resolveActor(req: Request, campaignId: string, need: ActorNeed): Promise<Actor | NextResponse>`
  - `runContent({ req, ctx, need, action }: { req: Request; ctx: Ctx; need: ActorNeed; action: string }, fn)` — **параметр `access` замінено на `need`**
  - `export type RouteCtx = { params: Promise<Record<string, string>> }` (перейменований `Ctx`, експортується для нестандартних роутів у Task 3)

- [ ] **Step 1: Падаючі тести `resolveActor`**

`lib/utils/api/__tests__/actor.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/api-tokens", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/api-tokens")>()), verifyApiToken: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "dm", isDM: true })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "p", isDM: false })),
}));

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { resolveActor } from "@/lib/utils/api/actor";
import * as apiAuth from "@/lib/utils/api/api-auth";

const withBearer = (value: string) => new Request("http://x", { headers: { authorization: value, cookie: "sb=session" } });

const token = (scopes: string[], campaignId = "c1") => vi.mocked(verifyApiToken).mockResolvedValue({ campaignId, userId: "dm", scopes } as never);

const status = (r: unknown) => (r instanceof NextResponse ? r.status : 200);

describe("resolveActor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("без заголовка — сесія учасника", async () => {
    expect(await resolveActor(new Request("http://x"), "c1", { access: "member", scope: "content:read" })).toEqual({ campaignId: "c1", userId: "p", isDM: false, via: "session" });
    expect(verifyApiToken).not.toHaveBeenCalled();
  });

  it("токен з правом — актор ДМ через токен, cookie не читається", async () => {
    token(["content:write"]);
    expect(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:read" })).toEqual({ campaignId: "c1", userId: "dm", isDM: true, via: "token" });
    expect(apiAuth.requireDM).not.toHaveBeenCalled();
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
  });

  it("недійсний або відкликаний токен із cookie — 401 без відкату до сесії", async () => {
    vi.mocked(verifyApiToken).mockResolvedValue(null);
    expect(status(await resolveActor(withBearer("Bearer dndt_bad"), "c1", { access: "member", scope: "content:read" }))).toBe(401);
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
  });

  it.each(["Bearer", "Bearer   ", "Basic abc"])("заголовок «%s» — 401", async (value) => {
    vi.mocked(verifyApiToken).mockResolvedValue(null);
    expect(status(await resolveActor(withBearer(value), "c1", { access: "member", scope: "content:read" }))).toBe(401);
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
  });

  it("немає scope — 403", async () => {
    token(["ai"]);
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "member", scope: "content:read" }))).toBe(403);
  });

  it("лише читання на запис — 403", async () => {
    token(["content:read"]);
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:write" }))).toBe(403);
  });

  it("токен іншої кампанії — 403", async () => {
    token(["content:write"], "other");
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:read" }))).toBe(403);
  });

  it("sessionOnly з токеном — 403", async () => {
    token(["content:write"]);
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:write", sessionOnly: true }))).toBe(403);
  });
});
```

Run: `pnpm test:run lib/utils/api/__tests__/actor.test.ts` → FAIL.

- [ ] **Step 2: Реалізація `actor.ts`**

```ts
import { NextResponse } from "next/server";

import { bearerToken, verifyApiToken } from "@/lib/ai/api-tokens";
import { type ContentScope, hasScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";

export type AccessLevel = "member" | "dm";

export type ActorNeed = { access: AccessLevel; scope: ContentScope; sessionOnly?: true };

export type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token" };

async function tokenActor(raw: string, campaignId: string, need: ActorNeed): Promise<Actor | NextResponse> {
  const token = raw ? await verifyApiToken(raw) : null;

  if (!token) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

  if (need.sessionOnly) return errorResponse(API_ERRORS.API_TOKEN_SESSION_ONLY, 403);

  if (token.campaignId !== campaignId) return errorResponse(API_ERRORS.API_TOKEN_WRONG_CAMPAIGN, 403);

  if (!hasScope(token.scopes, need.scope)) return errorResponse(API_ERRORS.API_TOKEN_SCOPE_MISSING, 403);

  return { campaignId, userId: token.userId, isDM: true, via: "token" };
}

/** With an Authorization header only the token counts — a bad token never falls back to the cookie session. */
export async function resolveActor(req: Request, campaignId: string, need: ActorNeed): Promise<Actor | NextResponse> {
  const raw = bearerToken(req);

  if (raw !== null) return tokenActor(raw, campaignId, need);

  const access = need.access === "dm" ? await requireDM(campaignId) : await requireCampaignAccess(campaignId, false);

  if (access instanceof NextResponse) return access;

  return { campaignId, userId: access.userId, isDM: need.access === "dm" || access.isDM === true, via: "session" };
}
```

Якщо `lib/ai/api-tokens.ts` (`server-only`) у `actor.ts` ламає імпорт з клієнтського коду — перевірити `grep -rn "utils/api/actor" app components lib` (очікується лише серверний код).

Run step 1 → PASS.

- [ ] **Step 3: Падаючі тести фабрики**

У `lib/utils/api/__tests__/content-routes.test.ts` додати мок `vi.mock("@/lib/ai/api-tokens", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/api-tokens")>()), verifyApiToken: vi.fn() }))`, імпорт `verifyApiToken`, хелпер

```ts
const bearer = (method: string, body?: string) => new Request("http://x/api/campaigns/c1/things", { method, headers: { authorization: "Bearer dndt_x" }, ...(body !== undefined && { body }) });

const scopes = (s: string[]) => vi.mocked(verifyApiToken).mockResolvedValue({ campaignId: "c1", userId: "dm", scopes: s } as never);
```

і тести:

```ts
  it("токен content:read читає список і запис, але не пише", async () => {
    scopes(["content:read"]);
    expect((await col.GET(bearer("GET"), ctx)).status).toBe(200);
    expect((await one.GET(bearer("GET"), ctxOne("a"))).status).toBe(200);
    expect((await col.POST(bearer("POST", '{"name":"А"}'), ctx)).status).toBe(403);
    expect((await one.PATCH(bearer("PATCH", '{"name":"Б"}'), ctxOne("a"))).status).toBe(403);
    expect(created).not.toHaveBeenCalled();
  });

  it("токен content:write створює", async () => {
    scopes(["content:write"]);
    expect((await col.POST(bearer("POST", '{"name":"А"}'), ctx)).status).toBe(201);
  });

  it("видалити всі через токен — 403 навіть із content:write", async () => {
    scopes(["content:write"]);
    expect((await col.DELETE(bearer("DELETE"), ctx)).status).toBe(403);
  });
```

Run: `pnpm test:run lib/utils/api/__tests__/content-routes.test.ts` → FAIL (403 замість 200/201 немає — scope не передається).

- [ ] **Step 4: `content-routes.ts`**

- `type Ctx` → `export type RouteCtx = { params: Promise<Record<string, string>> };` (замінити всі вживання).
- `runContent({ req, ctx, need, action }: { req: Request; ctx: RouteCtx; need: ActorNeed; action: string }, fn)` → `resolveActor(req, params.id, need)`.
- Мапінг:

```ts
const read = (access: AccessLevel): ActorNeed => ({ access, scope: "content:read" });

const WRITE: ActorNeed = { access: "dm", scope: "content:write" };

const WRITE_ALL: ActorNeed = { access: "dm", scope: "content:write", sessionOnly: true };
```

`collectionRoutes`: `GET` → `need: read(r.access.list)`, `POST` → `WRITE`, `DELETE` → `WRITE_ALL`. `itemRoutes`: `GET` → `read(r.access.item)`, `PATCH`/`DELETE` → `WRITE`.

Роути, що вже кличуть `runContent` або `resolveActor` напряму (`skill-trees/route.ts`; знайти: `grep -rn "runContent(\|resolveActor(" app lib --include=*.ts | grep -v __tests__`), оновити на `need`. `units/delete-all` і `spells/delete-all` — псевдоніми `DELETE` колекції, отже отримують `sessionOnly` автоматично; перевірити, що вони реекспортують `collectionRoutes(...).DELETE`.

Run step 3 → PASS. Run: `pnpm test:related lib/utils/api/content-routes.ts lib/utils/api/actor.ts` → PASS.

- [ ] **Step 5: CSRF — тести й реалізація**

У `lib/supabase/__tests__/middleware-csrf.test.ts` розширити `makeRequest` полем `authorization?: string` (`headers.set("authorization", …)`) і додати:

```ts
  it("Bearer з чужим Origin проходить (токен, не cookie)", () => {
    expect(rejectCrossOriginMutation(makeRequest({ method: "POST", pathname: "/api/campaigns/c1/units", origin: "https://evil.example", authorization: "Bearer dndt_x" }))).toBeNull();
  });

  it("cookie-запит з чужим Origin — 403", () => {
    expect(rejectCrossOriginMutation(makeRequest({ method: "POST", pathname: "/api/campaigns/c1/units", origin: "https://evil.example" }))?.status).toBe(403);
  });

  it("Basic з чужим Origin — 403", () => {
    expect(rejectCrossOriginMutation(makeRequest({ method: "POST", pathname: "/api/campaigns/c1/units", origin: "https://evil.example", authorization: "Basic abc" }))?.status).toBe(403);
  });
```

`lib/supabase/middleware.ts` — замінити пропуск `/api/mcp`:

```ts
  // bearer requests never read cookies (resolveActor, /api/mcp); browsers can't send Authorization cross-site without CORS
  if (/^Bearer\s/i.test(request.headers.get("authorization") ?? "")) return null;

  if (pathname === "/api/mcp" || pathname.startsWith("/api/mcp/")) return null;
```

(Пропуск `/api/mcp` лишається для MCP-клієнтів у браузері, що шлють запит без заголовка до 401.)

Run: `pnpm test:run lib/supabase/__tests__/middleware-csrf.test.ts` → PASS.

- [ ] **Step 6: Bearer на роут поза контентом → 401**

`app/api/__tests__/bearer-non-content-routes.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getSessionUserId: vi.fn(async () => null) }));

describe("роути поза контентом не читають Bearer", () => {
  it("GET боїв лише з токеном — 401", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/battles/route");

    const res = await GET(new Request("http://x/api/campaigns/c1/battles", { headers: { authorization: "Bearer dndt_x" } }), { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(401);
  });
});
```

Якщо імпорт роуту тягне модулі, що падають у node-оточенні без моків, додати мінімальні `vi.mock` (подивитися `app/api/__tests__/battles-api.test.ts`).

Run: `pnpm test:run app/api/__tests__/bearer-non-content-routes.test.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/api lib/supabase app/api
git commit -m "feat(tokens): Bearer in resolveActor with scopes, session-only bulk delete, CSRF skip for Bearer"
```

---

### Task 3: Нестандартні роути контенту, правила, експорт — через `resolveActor`

**Files:**
- Create: `lib/server/campaigns/rules.ts`
- Modify: `app/api/campaigns/[id]/units/import/route.ts`
- Modify: `app/api/campaigns/[id]/spells/delete-by-level/route.ts`
- Modify: `app/api/campaigns/[id]/spells/[spellId]/remove-from-group/route.ts`
- Modify: `app/api/campaigns/[id]/spells/groups/[groupId]/remove-all-spells/route.ts`
- Modify: `app/api/campaigns/[id]/skills/[skillId]/duplicate/route.ts`
- Modify: `app/api/campaigns/[id]/skill-trees/[treeId]/route.ts`
- Modify: `app/api/campaigns/[id]/tracks/track-handlers.ts` (`reorderTracksHandler`; `issueUploadTicketHandler` НЕ чіпати)
- Modify: `app/api/campaigns/[id]/rules/route.ts`
- Modify: `app/api/campaigns/[id]/export/route.ts`
- Modify: `lib/server/content/resources/tracks.ts`
- Test: `app/api/__tests__/content-token-needs.test.ts` (новий), `app/api/__tests__/campaign-rules-api.test.ts`, `app/api/__tests__/tracks-api.test.ts`

**Interfaces:**
- Consumes: `runContent`, `RouteCtx`, `ActorNeed`, `Actor` (Task 2).
- Produces:
  - `readCampaignRules(campaignId: string): Promise<Ruleset>` — `parseRules` над `campaign.rules`; кампанії немає → `ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404)`
  - `updateCampaignRules(campaignId: string, patch: RulesetPatch): Promise<Ruleset>` — `mergeRules`; невалідно → `ContentError(API_ERRORS.INVALID_RULES, 400, issues)`
  - (2d використає обидві для `get_rules` / `update_rules`.)

Права:

| Роут | `need` |
|---|---|
| `POST units/import` | `{ access: "dm", scope: "content:write" }` |
| `DELETE spells/delete-by-level` | `{ access: "dm", scope: "content:write", sessionOnly: true }` |
| `POST spells/[spellId]/remove-from-group` | `{ access: "dm", scope: "content:write" }` |
| `POST spells/groups/[groupId]/remove-all-spells` | `{ access: "dm", scope: "content:write" }` |
| `POST skills/[skillId]/duplicate` | `{ access: "dm", scope: "content:write" }` |
| `GET skill-trees` | `{ access: "member", scope: "content:read" }` |
| `PATCH skill-trees/[treeId]` | `{ access: "dm", scope: "content:write" }` |
| `PUT tracks/order` | `{ access: "dm", scope: "content:write" }` |
| `GET rules` | `{ access: "member", scope: "content:read" }` |
| `PATCH rules` | `{ access: "dm", scope: "content:write" }` |
| `GET export` | `{ access: "dm", scope: "content:read" }` |

- [ ] **Step 1: Падаючий табличний тест прав**

`app/api/__tests__/content-token-needs.test.ts` — мокаємо `resolveActor` і перевіряємо, з яким `need` його кличе кожен роут (відповідь-заглушка 418 гарантує, що далі роут не йде):

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => NextResponse.json({ error: "stop" }, { status: 418 })) }));

import { resolveActor } from "@/lib/utils/api/actor";

const W = { access: "dm", scope: "content:write" };

const CASES: Array<[string, () => Promise<Record<string, unknown>>, string, Record<string, string>, unknown]> = [
  ["units/import", () => import("@/app/api/campaigns/[id]/units/import/route"), "POST", {}, W],
  ["spells/delete-by-level", () => import("@/app/api/campaigns/[id]/spells/delete-by-level/route"), "DELETE", {}, { ...W, sessionOnly: true }],
  ["remove-from-group", () => import("@/app/api/campaigns/[id]/spells/[spellId]/remove-from-group/route"), "POST", { spellId: "s" }, W],
  ["remove-all-spells", () => import("@/app/api/campaigns/[id]/spells/groups/[groupId]/remove-all-spells/route"), "POST", { groupId: "g" }, W],
  ["skills duplicate", () => import("@/app/api/campaigns/[id]/skills/[skillId]/duplicate/route"), "POST", { skillId: "k" }, W],
  ["skill-trees GET", () => import("@/app/api/campaigns/[id]/skill-trees/route"), "GET", {}, { access: "member", scope: "content:read" }],
  ["skill-trees PATCH", () => import("@/app/api/campaigns/[id]/skill-trees/[treeId]/route"), "PATCH", { treeId: "t" }, W],
  ["tracks/order", () => import("@/app/api/campaigns/[id]/tracks/order/route"), "PUT", {}, W],
  ["rules GET", () => import("@/app/api/campaigns/[id]/rules/route"), "GET", {}, { access: "member", scope: "content:read" }],
  ["rules PATCH", () => import("@/app/api/campaigns/[id]/rules/route"), "PATCH", {}, W],
  ["export", () => import("@/app/api/campaigns/[id]/export/route"), "GET", {}, { access: "dm", scope: "content:read" }],
];

describe("нестандартні роути контенту кличуть resolveActor з правильними правами", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(CASES)("%s", async (_name, load, method, extra, need) => {
    const handler = (await load())[method] as (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

    const res = await handler(new Request("http://x", { method, ...(method !== "GET" && { body: "{}" }) }), { params: Promise.resolve({ id: "c1", ...extra }) });

    expect(res.status).toBe(418);
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", need);
  });
});
```

Run: `pnpm test:run app/api/__tests__/content-token-needs.test.ts` → FAIL (роути кличуть `requireDM`).

- [ ] **Step 2: `lib/server/campaigns/rules.ts`**

```ts
import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import type { Ruleset } from "@/lib/utils/rules";
import { mergeRules, parseRules, type RulesetPatch } from "@/lib/utils/rules/schema";

export async function readCampaignRules(campaignId: string): Promise<Ruleset> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

  if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  return parseRules(campaign.rules);
}

export async function updateCampaignRules(campaignId: string, patch: RulesetPatch): Promise<Ruleset> {
  const merged = mergeRules(await readCampaignRules(campaignId), patch);

  if (!merged.ok) throw new ContentError(API_ERRORS.INVALID_RULES, 400, merged.issues);

  await prisma.campaign.update({ where: { id: campaignId }, data: { rules: merged.rules as Prisma.InputJsonObject } });

  return merged.rules;
}
```

Якщо `RulesetPatch` не експортується з `lib/utils/rules/schema.ts` — експортувати `export type RulesetPatch = z.infer<typeof RulesetPatchSchema>` поруч зі схемою. Перевірити сигнатуру `mergeRules` (перший аргумент — `Ruleset`, як у поточному роуті `access.campaign.rules`).

- [ ] **Step 3: Переписати роути**

Шаблон для кожного роуту (приклад — `rules/route.ts`):

```ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { readCampaignRules, updateCampaignRules } from "@/lib/server/campaigns/rules";
import { ContentError } from "@/lib/server/content/errors";
import { type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export const GET = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: { access: "member", scope: "content:read" }, action: "get campaign rules" }, async (actor) => NextResponse.json(await readCampaignRules(actor.campaignId)));

export const PATCH = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: { access: "dm", scope: "content:write" }, action: "update campaign rules" }, async (actor) => {
    const patch = RulesetPatchSchema.safeParse(await req.json().catch(() => undefined));

    if (!patch.success) throw new ContentError(API_ERRORS.INVALID_RULES, 400, patch.error.issues);

    return NextResponse.json(await updateCampaignRules(actor.campaignId, patch.data));
  });
```

Порівняти з `parseBody` (`lib/utils/api/parse-body.ts`): якщо `parseBody(schema, req, message)` вміє повернути `NextResponse` з тим самим тілом — використовувати його всередині `fn` (`if (body instanceof NextResponse) return body;`) замість ручного `safeParse`, щоб формат `issues` лишився тим самим, що чекає `campaign-rules-api.test.ts`.

Інші роути: тіло лишається тим самим, але `requireDM(id)` + `try/catch/handleApiError` замінюються на `runContent({ req, ctx, need, action }, async (actor, p) => …)`, де `id` → `actor.campaignId`, параметри шляху → `p.spellId` / `p.groupId` / `p.skillId` / `p.treeId`. `export/route.ts`: `bundleErrorResponse(error)` лишається — обгорнути тіло `fn` у `try { … } catch (e) { const r = bundleErrorResponse(e); if (r) return r; throw e; }`. `skill-trees/[treeId]`: `parseBody` і `saveSkillTree(actor.campaignId, p.treeId, …)` без змін. `reorderTracksHandler(req, campaignId)` → сигнатура `(req: Request, ctx: RouteCtx)`, `tracks/order/route.ts` → `export const PUT = reorderTracksHandler;` (або `export { reorderTracksHandler as PUT }`). `units/import`: `invalidateReference(ReferenceKind.UNITS, actor.campaignId)` лишається.

- [ ] **Step 4: Трек-файл через токен → 403**

`lib/server/content/resources/tracks.ts`, на початку `create`:

```ts
    if (body.kind === "file" && actor.via === "token") throw new ContentError(API_ERRORS.TRACK_FILE_SESSION_ONLY, 403);
```

Тест у `app/api/__tests__/tracks-api.test.ts` (за наявним стилем моків файлу): `POST` з `kind: "file"` і актором `via: "token"` (через мок `verifyApiToken` + заголовок `authorization`) → 403, `prisma.campaignTrack.create` не викликаний; з `kind: "youtube"` → 201.

- [ ] **Step 5: Тести → PASS**

Run: `pnpm test:run app/api/__tests__/content-token-needs.test.ts` → PASS.
Run: `pnpm test:related lib/server/campaigns/rules.ts lib/server/content/resources/tracks.ts "app/api/campaigns/[id]/rules/route.ts" "app/api/campaigns/[id]/export/route.ts" "app/api/campaigns/[id]/units/import/route.ts" "app/api/campaigns/[id]/tracks/track-handlers.ts" "app/api/campaigns/[id]/skill-trees/[treeId]/route.ts"` → PASS. `campaign-rules-api.test.ts` переписати з моку `requireDM/requireCampaignAccess` на мок `resolveActor` (повертає `{ campaignId: "c1", userId: "u", isDM: true, via: "session" }`) і `prisma.campaign.findUnique` (`{ rules: {...} }`) — поведінкові очікування (злиття, 400 на невалідних, 403 відмова) зберегти. Аналогічно інші тести, що мокали `requireDM` для цих роутів (`units-import-api.test.ts`, `skill-trees-api.test.ts`, `tracks-api.test.ts`, `dm-only-routes-api.test.ts`): якщо `resolveActor` іде в справжні `requireDM`/`requireCampaignAccess` з моку `api-auth`, тести мають лишитися зеленими без змін — міняти лише ті, що впали.

- [ ] **Step 6: Commit**

```bash
git add lib/server app/api
git commit -m "feat(tokens): non-standard content routes, rules and export resolve the actor with scopes"
```

---

### Task 4: Перевірка посилань у `knownSpells`, `availableSkills`, `disabledSkills`

**Files:**
- Modify: `lib/server/campaigns/campaign-refs.ts`
- Modify: `lib/server/content/resources/units.ts`
- Modify: `lib/server/content/resources/races.ts`
- Test: `lib/server/campaigns/__tests__/campaign-refs.test.ts` (наявний або новий), `lib/server/content/__tests__/` (тести ресурсів units/races — знайти: `ls lib/server/content/__tests__`)

**Interfaces:**
- Produces:
  - `CampaignRefKind` + `"skill"` (`prisma.skill.count`, `API_ERRORS.FOREIGN_SKILL`)
  - `addedIds(next: string[] | undefined, prev: unknown): string[] | undefined` — id з `next`, яких немає в `prev` (`prev` — JSON-масив з рядка БД; не масив → порожній); `next === undefined` → `undefined`

Формати: `Unit.knownSpells` — id заклинань; `Race.availableSkills` — id основних скілів (`main_skills`); `Race.disabledSkills` — id скілів (`skills`). Перевіряються лише **нові** id: застарілі, що вже лежать у записі (видалене заклинання), не блокують збереження з UI.

- [ ] **Step 1: Падаючі тести**

`addedIds`:

```ts
describe("addedIds", () => {
  it("лише нові id", () => {
    expect(addedIds(["a", "b", "c"], ["a", "gone"])).toEqual(["b", "c"]);
  });

  it("undefined — поле не змінюється", () => {
    expect(addedIds(undefined, ["a"])).toBeUndefined();
  });

  it("prev не масив — усі нові", () => {
    expect(addedIds(["a"], null)).toEqual(["a"]);
  });
});
```

Ресурси (за стилем наявних тестів сервісу в `lib/server/content/__tests__`; моки `prisma.spell.count`, `prisma.mainSkill.count`, `prisma.skill.count`):
- створення юніта з `knownSpells: ["foreign"]`, коли `prisma.spell.count` → 0 → `ContentError` 400 з `API_ERRORS.FOREIGN_SPELL`, `prisma.unit.create` не викликаний;
- оновлення юніта, у якого вже є `knownSpells: ["gone"]`, з `knownSpells: ["gone"]` → `prisma.spell.count` не викликаний (нічого нового), оновлення проходить;
- оновлення з `knownSpells: ["gone", "new"]` → перевіряється лише `["new"]`;
- створення раси з `availableSkills: ["x"]`, `prisma.mainSkill.count` → 0 → 400 `FOREIGN_MAIN_SKILL`;
- створення раси з `disabledSkills: ["y"]`, `prisma.skill.count` → 0 → 400 `FOREIGN_SKILL`.

Run → FAIL.

- [ ] **Step 2: Реалізація**

`campaign-refs.ts`:

```ts
export type CampaignRefKind = "spell" | "spellGroup" | "mainSkill" | "skill" | "artifactSet" | "race";
```

```ts
  skill: {
    count: (campaignId, ids) => prisma.skill.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_SKILL,
  },
```

```ts
export function addedIds(next: string[] | undefined, prev: unknown): string[] | undefined {
  if (next === undefined) return undefined;

  const known = new Set(Array.isArray(prev) ? prev : []);

  return next.filter((id) => !known.has(id));
}
```

`units.ts`: `create` → `assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: data.knownSpells })`; `update` → `assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: addedIds(data.knownSpells, existing.knownSpells) })`.

`races.ts`: `create` → після `assertNameFree`: `await assertCampaignRefs(actor.campaignId, { mainSkill: data.availableSkills, skill: data.disabledSkills })`; `update` → `await assertCampaignRefs(actor.campaignId, { mainSkill: addedIds(data.availableSkills, existing.availableSkills), skill: addedIds(data.disabledSkills, existing.disabledSkills) })`.

Перевірити імпорт юнітів (`lib/utils/units/import-units.ts`): якщо він пише `knownSpells` з id із тіла запиту без перевірки — додати той самий `assertCampaignRefs` (або фільтрацію) там і тест; якщо там імена, що резолвляться в id цієї кампанії, — нічого не робити.

- [ ] **Step 3: Тести → PASS**

Run: `pnpm test:related lib/server/campaigns/campaign-refs.ts lib/server/content/resources/units.ts lib/server/content/resources/races.ts` → PASS (у т.ч. `app/api/__tests__/units-api.test.ts`, `races-api.test.ts`; якщо їхні моки `prisma` не мають `spell.count` / `mainSkill.count` / `skill.count` — додати в мок).

- [ ] **Step 4: Commit**

```bash
git add lib/server app/api/__tests__
git commit -m "feat(content): check knownSpells, availableSkills and disabledSkills belong to the campaign"
```

---

### Task 5: UI — права токена, шаблони, документація

**Files:**
- Modify: `components/ai/ApiTokenList.tsx`
- Modify: `lib/api/ai.ts:58` (якщо Task 1 ще не змінив)
- Modify: `lib/hooks/ai/useApiTokens.ts` (якщо Task 1 ще не змінив)
- Modify: `app/campaigns/[id]/dm/ai/page.tsx`, `app/campaigns/[id]/dm/ai/page-client.tsx`
- Modify: `components/layout/dm-menu.ts`, `components/layout/Header.tsx:149-155`
- Modify: `docs/architecture/ai.md`, `docs/STATUS.md`
- Test: `components/ai/__tests__/api-token-list.test.tsx`, `components/layout/__tests__/dm-menu.test.ts`

**Interfaces:**
- Consumes: `API_TOKEN_SCOPES`, `API_TOKEN_SCOPE_LABELS`, `ApiTokenScope`, `CreateApiTokenInput`, `ApiTokenSummary.scopes` (Task 1).
- Produces:
  - `ApiTokenList` props: `{ tokens: ApiTokenSummary[]; scopes: readonly ApiTokenScope[]; actions: { onCreate: (input: CreateApiTokenInput) => Promise<CreatedApiToken | null>; onRevoke: (id: string) => void } }` — `scopes` = доступні галочки; перша галочка за замовчуванням увімкнена
  - `DmAiPageClient({ campaignId, isTemplate }: { campaignId: string; isTemplate: boolean })`

- [ ] **Step 1: Падаючі тести UI**

`api-token-list.test.tsx`: у `token` додати `scopes: ["ai"]`; рендер з `scopes={API_TOKEN_SCOPES}`; додати:

```ts
  it("права: чипи в списку, галочки в діалозі, без прав не створити", async () => {
    const onCreate = vi.fn(async () => ({ ...token, id: "k2", scopes: ["ai", "content:write"], token: "dndt_S" }));

    renderWithConfirm(<ApiTokenList tokens={[token]} scopes={API_TOKEN_SCOPES} actions={{ onCreate, onRevoke: vi.fn() }} />);

    expect(screen.getByText("AI-асистент (MCP)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Створити токен" }));
    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "Cursor" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "AI-асистент (MCP)" }));
    expect((screen.getByRole("button", { name: "Створити" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: "Запис контенту" }));
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ name: "Cursor", scopes: ["content:write"] }));
  });

  it("на шаблоні лише права на контент", () => {
    renderWithConfirm(<ApiTokenList tokens={[]} scopes={["content:read", "content:write"]} actions={{ onCreate: vi.fn(), onRevoke: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Створити токен" }));
    expect(screen.queryByRole("checkbox", { name: "AI-асистент (MCP)" })).toBeNull();
  });
```

`dm-menu.test.ts`: очікування для `"ai"` на шаблоні змінити на `true` (пункт видно, але з назвою «API»).

Run: `pnpm test:run components/ai/__tests__/api-token-list.test.tsx components/layout/__tests__/dm-menu.test.ts` → FAIL.

- [ ] **Step 2: `ApiTokenList`**

- стан `selected: ApiTokenScope[]`, початково `[scopes[0]]`; `close()` скидає його до `[scopes[0]]`;
- у формі під полем «Назва» — `fieldset` з легендою «Права» і по рядку на кожне право з `scopes`:

```tsx
            <fieldset className="space-y-2 pt-2">
              <legend className="text-sm text-hud-muted">Права</legend>
              {scopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-hud-ink">
                  <Checkbox
                    checked={selected.includes(scope)}
                    onCheckedChange={(on) => setSelected((prev) => (on === true ? [...prev, scope] : prev.filter((s) => s !== scope)))}
                    aria-label={API_TOKEN_SCOPE_LABELS[scope]}
                  />
                  {API_TOKEN_SCOPE_LABELS[scope]}
                </label>
              ))}
            </fieldset>
```

- кнопка «Створити» `disabled={pending || !name.trim() || selected.length === 0}`; `submit` → `actions.onCreate({ name: name.trim(), scopes: selected })`;
- у картці токена під назвою — чипи: `token.scopes.map((s) => <Badge key={s} variant="outline">{API_TOKEN_SCOPE_LABELS[s]}</Badge>)` у `div className="mt-1 flex flex-wrap gap-1"`;
- в описі діалогу: «Дайте токену назву й оберіть права. Змінити права пізніше не можна — лише відкликати й створити новий.»

`useApiTokens.create(input: CreateApiTokenInput)`, `lib/api/ai.ts` `createApiToken(campaignId, input)` — якщо ще не зроблено в Task 1.

- [ ] **Step 3: Сторінка й меню**

`page.tsx`:

```tsx
  const { campaign } = await requireCampaignDM(id);

  return <DmAiPageClient campaignId={id} isTemplate={campaign.kind === CampaignKind.TEMPLATE} />;
```

`page-client.tsx`:
- блок токенів винести в локальний компонент `TokensPanel({ campaignId, scopes })` (хук `useApiTokens` усередині);
- інструкції, ключі, MCP-сніпети — у локальний `AssistantPanels({ campaignId })` (хук `useAiSettings` усередині, щоб на шаблоні він не робив запит);
- `isTemplate` → `HudPageHeader title="API" subtitle="Токени для доступу до контенту шаблону через API."` і лише `<TokensPanel scopes={["content:read", "content:write"]} />`; інакше — як зараз, `<TokensPanel scopes={API_TOKEN_SCOPES} />` на тому самому місці між панелями.

`dm-menu.ts`: прибрати `"ai"` з `TEMPLATE_HIDDEN_DM_PATHS`. `Header.tsx`: пункт «AI і API» → `{isTemplate ? "API" : "AI і API"}`.

Run step 1 → PASS. Run: `pnpm test:related components/ai/ApiTokenList.tsx "app/campaigns/[id]/dm/ai/page-client.tsx" components/layout/Header.tsx` → PASS.

- [ ] **Step 4: Документація**

`docs/architecture/ai.md`, розділ про токени — додати (українською):
- права `ai` / `content:read` / `content:write`, `content:write` ⊃ `content:read`, наявні токени `["ai"]`;
- `/api/mcp` поки вимагає `ai` (у 2d — фільтр інструментів за правами);
- `resolveActor`: Bearer → лише токен (401 без відкату до cookie, 403 інша кампанія / немає права / `sessionOnly`), актор через токен = ДМ; роути поза контентом Bearer не читають;
- CSRF пропускає запити з `Authorization: Bearer`;
- на шаблоні — лише токени з правами на контент (сторінка «API»).

`docs/STATUS.md`, рядок «Конструктор кампаній»: «2b токени готова» + що далі 2c/2d (з перенесеними пунктами з хендофу).

- [ ] **Step 5: Lint, typecheck, commit**

Run: `pnpm lint` → 0 errors. Run: `pnpm exec tsc --noEmit` → 0 errors.

```bash
git add components app lib docs
git commit -m "feat(tokens): scope checkboxes and chips on /dm/ai, API-only page on templates"
```

---

## Перевірка наприкінці частини (контролер)

1. `pnpm test:run` (повний, один раз), `pnpm lint` (0 errors), `pnpm build`.
2. `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` (відомі нестабільні: «ворог у полі зору прокидається», `battle-fx.test.tsx`).
3. Живий прогін на `pnpm dev -p 3001`:
   - на `/dm/ai` кампанії HOMM5 створити токен `content:write`; `curl -H "Authorization: Bearer …" localhost:3001/api/campaigns/<id>/races` → 200; `POST /units` → 201 і юніт видно в UI; `DELETE /units` (усі) → 403; `PATCH /rules` → 200; `GET /battles` → 401; той самий токен на `/api/mcp` → 403; `curl` з чужим `Origin` і Bearer → не 403 від CSRF;
   - токен лише `content:read` → `POST` 403;
   - на шаблоні «Порожня» меню показує «API», сторінка — лише токени без галочки AI;
   - створені тестові записи й токени видалити/відкликати.
4. Фінальне рев'ю всієї частини (opus) → одна хвиля виправлень → коротке повторне рев'ю → `/simplify` → оновити пам'ять `project-constructor.md` і хендоф `docs/superpowers/constructor-handoff.md`.
