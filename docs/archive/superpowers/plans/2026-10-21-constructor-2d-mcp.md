# Конструктор, етап 2d — MCP-інструменти контенту: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Зовнішній MCP-клієнт із токеном `content:read`/`content:write` читає й змінює контент і правила кампанії через загальні інструменти `content_*`. Для цього використовуються ті самі сервіси й Zod-схеми, що й REST.

**Architecture:**
- Перевірка прав переходить у сам сервіс. `Actor` несе `scopes`, а кожна функція сервісу перевіряє свою потребу (`assertCan`). REST і MCP проходять ту саму перевірку.
- `AiToolDef` отримує `scopes`. `/api/mcp` приймає будь-який дійсний токен і реєструє лише інструменти, доступні за його правами.
- Новий файл `lib/ai/tools/content.ts` містить 11 інструментів з параметром `kind`. Схеми для агента — самодостатні JSON Schema з генератора 2c: здібності й ефекти віддаються окремими запитами, щоб кожен результат вмістився в 24 000 символів.

**Tech Stack:** Next.js 16 route handlers, `mcp-handler` / `@modelcontextprotocol/server`, Zod 4.3, Vitest, Prisma 6.

**Spec:** `docs/archive/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md`, розділ «2d. MCP-інструменти контенту», «Перевірка → 2d» і «Наприкінці». Перенесені пункти — у `docs/archive/superpowers/constructor-handoff.md` («2d: …»).

## Global Constraints

- Робота лише у worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`. БД — лише локальна `constructor`. Prod і prodcopy не чіпати, у `main` не зливати.
- Без міграцій Prisma.
- Права: `ai`, `content:read`, `content:write`. `content:write` включає `content:read` (`hasScope` у `lib/constants/ai.ts`). Наявні інструменти мають `scopes: ["ai"]`.
- Чат усередині застосунку працює з `["ai"]` і нових інструментів не бачить.
- Масового видалення й експорту бандла в MCP немає.
- Ліміт результату інструмента — `AI_LIMITS.toolResultChars` = 24 000 символів. Кожен результат `content_schema` і `content_list` (на 150 юнітах) має вміщатися в нього БЕЗ обрізання.
- `content_list` повертає до 50 записів (за замовчуванням 20) і `total`.
- Помилки валідації повертаються агентові текстом зі шляхами полів (`AiToolError`), а не винятком MCP.
- Ізоляція: `campaignId` — лише з токена/актора. Пошук завжди за `{ id, campaignId }`.
- Наявні `search_reference` / `read_reference` (scope `ai`) не змінюються.
- Тексти для агента (описи інструментів, помилки) — українською. Ідентифікатори — англійською.
- ESLint: `padding-line-between-statements`, `simple-import-sort`, `import/no-cycle`, без `console.log`, без `any`. Коментарі мінімальні.
- Тести — у сусідніх `__tests__/`. Під час роботи: `pnpm test:run <файли>` / `pnpm test:changed`. Повний набір — один раз наприкінці.
- Коміти — з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Токен `content:read` викликає `content_create`, або інструмент запису вкликано всупереч фільтру** (клієнт кешує список, а токен перевипустили з меншими правами) → сервіс відповідає 403 текстом, запис не відбувається. Тест у задачі 1 (`assertCan` у сервісі) і в задачі 5.
- **`content_get` / `content_update` з id запису іншої кампанії** → «не знайдено», жодних даних чужої кампанії. Тест у задачі 5.
- **`content_create` з невалідним тілом** (без `name`, неіснуючий вид ефекту, чужий `raceId`) → текст з `path: message` для кожної помилки, щоб агент міг виправити. Тест у задачі 5.
- **`content_list` на великій бібліотеці** (150 юнітів, 300 заклинань) → без обрізання, з `total`, а `offset` дає наступну сторінку. Тест у задачі 5.
- **`save_skill_tree` для раси, якої ще немає в дереві** → дерево створюється. З невідомими id скілів — текстова помилка зі списком проблем, а не 500. Тест у задачі 2.

---

## Карта файлів

| Файл | Що робить |
|---|---|
| `lib/utils/api/actor.ts` | `Actor.scopes: readonly ApiTokenScope[] \| null` (null — сесія); `authenticateToken` повертає `scopes`, параметр `scope` стає необов'язковим |
| `lib/server/content/access.ts` (новий) | `assertCan(actor, need)` — 403 через `ContentError` |
| `lib/server/content/service.ts` | Кожна функція спершу викликає `assertCan` зі своєю потребою |
| `lib/server/skills/skill-tree-service.ts` (новий) | `readSkillTree(campaignId, race)`, `saveSkillTree(campaignId, { treeId?, race, skills })` → рядок дерева або `ContentError` |
| `app/api/campaigns/[id]/skill-trees/[treeId]/*` | Роут кличе сервіс; `save-skill-tree-handler.ts` видаляється |
| `lib/ai/tools/define.ts` | `AiToolDef.scopes`, `AiToolContext.scopes` |
| `lib/ai/tools/index.ts` | Фільтр інструментів за правами для MCP і чату |
| `app/api/mcp/route.ts` | Будь-який дійсний токен; права передаються в реєстрацію |
| `lib/server/content/tool-schemas.ts` (новий) | `contentSchema({ kind, op, effectKind })` — самодостатня JSON Schema для агента |
| `lib/server/content/define-resource.ts`, `resources/*.ts` | `listFields` для коротких записів у `content_list` |
| `lib/ai/tools/content.ts` (новий) | 11 інструментів контенту |
| `app/campaigns/[id]/dm/ai/page-client.tsx` | Панель MCP показується й на шаблоні |
| `docs/architecture/content-api.md` (новий), `ai.md`, `STATUS.md`, хендоф | Кінець етапу 2 |

---

### Task 1: Перевірка прав у сервісі

**Files:**
- Create: `lib/server/content/access.ts`
- Modify: `lib/utils/api/actor.ts`, `lib/server/content/service.ts`, `app/api/mcp/route.ts` (виклик `authenticateToken` — лише сигнатура)
- Test: `lib/server/content/__tests__/access.test.ts`, `lib/server/content/__tests__/service.test.ts`, наявні тести `actor`

**Interfaces:**
- Produces:
  - `type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token"; scopes: readonly ApiTokenScope[] | null }`. `resolveActor` заповнює `scopes`: `null` для сесії, права токена для Bearer.
  - `authenticateToken(raw, campaignId, scope?: ApiTokenScope, opts?) → { campaignId; userId; scopes: ApiTokenScope[] } | NextResponse`. Без `scope` перевіряється лише дійсність токена й кампанія.
  - `assertCan(actor: Actor, need: ActorNeed): void` кидає `ContentError(…, 403)`:
    - `need.access === "dm" && !actor.isDM` → `API_ERRORS.FORBIDDEN` (або наявний текст «лише ДМ» з `api-errors.ts`);
    - `need.sessionOnly && actor.via === "token"` → `API_ERRORS.API_TOKEN_SESSION_ONLY`;
    - `actor.scopes && !hasScope(actor.scopes, need.scope)` → `API_ERRORS.API_TOKEN_SCOPE_MISSING`.
  - Потреби в сервісі (з `NEED`, `lib/utils/api/need.ts`):
    - `listContent` → `NEED.read(r.access.list)`;
    - `getContent` → `NEED.read(r.access.item)`;
    - `createContent`, `updateContent`, `removeContent` → `NEED.write`;
    - `removeAllContent` → `NEED.writeAll`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/server/content/__tests__/access.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { NEED } from "@/lib/utils/api/need";

const base = { campaignId: "c1", userId: "u1", isDM: true, via: "token" as const };

const status = (fn: () => void) => {
  try {
    fn();

    return 0;
  } catch (e) {
    return e instanceof ContentError ? e.status : -1;
  }
};

describe("assertCan", () => {
  it("токен content:read не пише", () => expect(status(() => assertCan({ ...base, scopes: ["content:read"] }, NEED.write))).toBe(403));
  it("content:write читає і пише", () => {
    expect(status(() => assertCan({ ...base, scopes: ["content:write"] }, NEED.read("member")))).toBe(0);
    expect(status(() => assertCan({ ...base, scopes: ["content:write"] }, NEED.write))).toBe(0);
  });
  it("токен ai без контенту — 403", () => expect(status(() => assertCan({ ...base, scopes: ["ai"] }, NEED.read("member")))).toBe(403));
  it("sessionOnly через токен — 403", () => expect(status(() => assertCan({ ...base, scopes: ["content:write"] }, NEED.writeAll))).toBe(403));
  it("сесія гравця: читання member — так, dm — ні", () => {
    const player = { ...base, via: "session" as const, isDM: false, scopes: null };

    expect(status(() => assertCan(player, NEED.read("member")))).toBe(0);
    expect(status(() => assertCan(player, NEED.read("dm")))).toBe(403);
    expect(status(() => assertCan(player, NEED.write))).toBe(403);
  });
});
```

У `service.test.ts`:
- онови `actor` (додай `scopes: null`);
- додай тести «`createContent` з актором-токеном `content:read` → 403 і `create` ресурсу не викликано» та «`removeAllContent` через токен → 403».

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test:run lib/server/content/__tests__/access.test.ts lib/server/content/__tests__/service.test.ts`
Expected: FAIL — модуля `access` немає.

- [ ] **Step 3: Implement**

```ts
// lib/server/content/access.ts
import "server-only";
import { hasScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";

export function assertCan(actor: Actor, need: ActorNeed): void {
  if (need.access === "dm" && !actor.isDM) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  if (need.sessionOnly && actor.via === "token") throw new ContentError(API_ERRORS.API_TOKEN_SESSION_ONLY, 403);

  if (actor.scopes && !hasScope(actor.scopes, need.scope)) throw new ContentError(API_ERRORS.API_TOKEN_SCOPE_MISSING, 403);
}
```

Якщо `API_ERRORS.FORBIDDEN` немає, візьми наявний ключ для «лише ДМ» (`rg "ДМ" lib/constants/api-errors.ts`). Новий ключ не додавай, якщо підходящий уже є.

`service.ts`: першим рядком кожної функції — `assertCan(actor, <need>)`.

`actor.ts`:
- `tokenActor` повертає `scopes: auth.scopes`, сесійна гілка — `scopes: null`;
- `authenticateToken` перевіряє `scope` лише якщо його передано і повертає `scopes: token.scopes`.

`app/api/mcp/route.ts` поки лишає `authenticateToken(bearerToken(req), null, "ai")`, сигнатура сумісна. Права MCP змінює задача 3.

Усі інші місця, де будується `Actor` (`rg "via: \"session\"|via: \"token\"" lib app`), мають отримати `scopes`. Компілятор їх покаже.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/server/content/__tests__ app/api/__tests__/content-token-needs.test.ts app/api/__tests__/bearer-non-content-routes.test.ts && pnpm test:changed && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A lib/server/content lib/utils/api app/api
git commit -m "feat(content): access check inside content service (assertCan), actor carries token scopes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Сервіс дерева скілів

**Files:**
- Create: `lib/server/skills/skill-tree-service.ts`
- Delete: `app/api/campaigns/[id]/skill-trees/[treeId]/save-skill-tree-handler.ts` (логіка переїжджає)
- Modify: `app/api/campaigns/[id]/skill-trees/[treeId]/route.ts`, `app/api/campaigns/[id]/skill-trees/route.ts`
- Test: `lib/server/skills/__tests__/skill-tree-service.test.ts` (перенеси наявні тести handler-а, якщо є: `rg "save-skill-tree-handler" -l`)

**Interfaces:**
- Produces:
  - `listSkillTrees(campaignId: string): Promise<SkillTree[]>` — та сама вибірка, що зараз у `GET /skill-trees`;
  - `readSkillTree(campaignId: string, race: string): Promise<SkillTree | null>`;
  - `saveSkillTree(campaignId: string, input: { treeId?: string; race: string; skills: unknown }): Promise<SkillTree>`:
    - невалідне дерево → `ContentError(API_ERRORS.INVALID_SKILL_TREE, 400, errors)`;
    - конфлікт перенесення прогресу після `MOVE_ATTEMPTS` → `ContentError(<наявний ключ API_ERRORS про конфлікт прогресу>, 409)`;
    - успіх → збережений рядок дерева;
    - скидання кешу, якщо воно є в старому handler-і, зберігається.

Логіка (`validateTree`, пошук за id → за `race`, створення, `moveProgressKey` з оптимістичним повтором) переноситься БЕЗ змін. Змінюється лише спосіб повернення: дані або `ContentError` замість `NextResponse`.

Роут:

```ts
export const PATCH = operationRoute(CONTENT_OPERATIONS["skill-trees.save"], async ({ actor, params, body }) =>
  NextResponse.json(await saveSkillTree(actor.campaignId, { treeId: params.treeId, race: body.race, skills: body.skills })),
);
```

`runContent` уже перетворює `ContentError` на `errorResponse`. Подивись, що зараз повертає успішна відповідь handler-а, і збережи цю форму. Якщо форма була іншою, ніж сирий рядок, поверни ту саму обгортку.

- [ ] **Step 1: Write the failing tests**

У `skill-tree-service.test.ts` (Prisma мокається за зразком `lib/server/content/__tests__/*.test.ts`):

```ts
it("невалідне дерево → ContentError 400 з issues", async () => { /* mainSkill/skill findMany → []; skills з невідомим id → rejects { status: 400, issues: [..] } */ });
it("раси ще немає → створює дерево і повертає рядок", async () => { /* skillTree.findFirst → null двічі; create викликано з { campaignId, race } */ });
it("readSkillTree шукає за { campaignId, race }", async () => { /* findFirst викликано з where { campaignId: "c1", race: "Люди" } */ });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run lib/server/skills/__tests__/skill-tree-service.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: Implement the move**

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/server/skills/__tests__/skill-tree-service.test.ts && pnpm test:changed`
Expected: PASS. Наявні тести роутів дерев зелені; змінитися можуть лише імпорти.

- [ ] **Step 5: Commit**

```bash
git add -A lib/server/skills "app/api/campaigns/[id]/skill-trees" app/api/__tests__
git commit -m "refactor(skills): skill tree read/save as a service shared by REST and MCP

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Права інструментів і фільтр у MCP

**Files:**
- Modify: `lib/ai/tools/define.ts`, `lib/ai/tools/index.ts`, усі наявні інструменти в `lib/ai/tools/*.ts` (`scopes: ["ai"]`), `app/api/mcp/route.ts`, `app/campaigns/[id]/dm/ai/page-client.tsx`
- Test: `lib/ai/tools/__tests__/registry.test.ts`, `app/api/__tests__/api-tokens-mcp.test.ts`

**Interfaces:**
- Consumes: `authenticateToken(raw, null)` → `{ campaignId, userId, scopes }` (задача 1).
- Produces:
  - `AiToolDef.scopes: readonly ApiTokenScope[]` — інструмент доступний, якщо `def.scopes.some((s) => hasScope(tokenScopes, s))`;
  - `AiToolContext.scopes: readonly ApiTokenScope[]` (чат: `["ai"]`, MCP: права токена);
  - `toolsFor(scopes: readonly ApiTokenScope[]): AiToolDef[]`;
  - `toAiSdkTools(base)` використовує `toolsFor(["ai"])`;
  - `registerMcpTools(server, base)` використовує `toolsFor(base.scopes)`.
- `/api/mcp`:
  - `authenticateToken(bearerToken(req), null)` без обов'язкового права;
  - у контекст іде `scopes: auth.scopes`;
  - токен лише з `content:*` більше не отримує 403;
  - токен без жодного доступного інструмента отримує порожній список.

`defineTool` вимагає `scopes` (без значення за замовчуванням), щоб новий інструмент не міг його забути.

На `/dm/ai` панель MCP показується й на шаблоні: прибери `!isTemplate &&` перед `<McpPanel />`, бо контентні токени тепер працюють через MCP.

- [ ] **Step 1: Write the failing tests**

`lib/ai/tools/__tests__/registry.test.ts`:

```ts
import { AI_TOOLS, toolsFor } from "@/lib/ai/tools";

it("кожен інструмент має scopes; наявні — ai", () => {
  for (const t of AI_TOOLS) expect(t.scopes.length).toBeGreaterThan(0);
  expect(toolsFor(["ai"]).map((t) => t.name)).toContain("search_reference");
});

it("content:read не бачить ai-інструментів", () => {
  expect(toolsFor(["content:read"]).some((t) => t.name === "search_reference")).toBe(false);
});
```

У `api-tokens-mcp.test.ts` знайди тест, який чекає 403 для токена без `ai`, і переведи його на нову поведінку: токен `["content:read"]` → 200, `tools/list` не містить `search_reference`. Після задачі 5 цей тест розшириться інструментами `content_*`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test:run lib/ai/tools/__tests__/registry.test.ts app/api/__tests__/api-tokens-mcp.test.ts`
Expected: FAIL — немає `toolsFor` / `scopes`; MCP повертає 403.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/ai/tools/__tests__ app/api/__tests__/api-tokens-mcp.test.ts "app/campaigns/[id]/dm/ai/__tests__" && pnpm test:changed && pnpm exec tsc --noEmit -p .`
Expected: PASS. Тест сторінки `/dm/ai` для шаблону тепер може бачити MCP-панель; онови очікування, якщо тест перевіряв її відсутність.

- [ ] **Step 5: Commit**

```bash
git add -A lib/ai/tools app/api/mcp "app/campaigns/[id]/dm/ai" app/api/__tests__
git commit -m "feat(mcp): tool scopes — MCP registers only tools the token's scopes allow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Схеми для агента (`contentSchema`) і короткі поля списків

**Files:**
- Create: `lib/server/content/tool-schemas.ts`
- Modify: `lib/server/content/define-resource.ts` (`listFields`), `lib/server/content/resources/*.ts`
- Test: `lib/server/content/__tests__/tool-schemas.test.ts`

**Interfaces:**
- Consumes:
  - `toJsonSchemas(entries, { uriPrefix })`, `SHARED_SCHEMAS` (2c, `lib/server/content/json-schema.ts`);
  - `CONTENT_RESOURCES` з `schemas.create/update/apiCreate`;
  - `RulesetPatchSchema`, `saveSkillTreeSchema`;
  - `NonRandomEffectSchema.options` (видів ефектів 22).
- Produces:
  - `type SchemaTarget = ContentKind | "abilities" | "rules" | "skill-tree"`.
  - `contentSchema(input: { kind: SchemaTarget; op?: "create" | "update"; effectKind?: string }): Record<string, unknown>`. Кидає `ContentError(…, 400)` на невідомий `effectKind` і перелічує допустимі.
  - `EFFECT_KINDS: readonly string[]`.
  - `ContentResource.listFields: readonly string[]` — поля для `content_list`, крім `id` і `name`/`title`.

Правила побудови:
- Компоненти будуються ОДИН раз і кешуються в модулі, через `toJsonSchemas(entries, { uriPrefix: "#/$defs/" })`. До `entries` входять:
  - тіла ресурсів: `apiCreate ?? create` як `<Pascal>Create`, `update` як `<Pascal>Update`;
  - `RulesetPatchSchema` (уже серед спільних, id `RulesetPatch`);
  - `saveSkillTreeSchema` як `SkillTreeSave`.
- Результат для кореня `R` = `{ ...components[R], $defs: closure }`. `closure` — усі компоненти, на які `R` посилається транзитивно (шукай `"$ref":"#/$defs/<id>"` у JSON), крім «зупинених».
- Зупинені компоненти замінюються в `$defs` заглушкою `{ description: "<підказка>" }`, щоб `$ref` лишався валідним:
  - для ресурсів, правил і дерева — `Ability`: «Схема здібності: content_schema(kind: "abilities")»;
  - для `kind: "abilities"` — `Effect` і `NonRandomEffect`: «Один з видів ефекту: <EFFECT_KINDS через кому>. Схема виду: content_schema(kind: "abilities", effectKind: "<вид>")». Також `Effect.*`, якщо до них веде посилання.
- `kind: "abilities"` без `effectKind` → корінь `Ability`. З `effectKind` → корінь `Effect.<effectKind>`, без зупинок.
- `kind: "rules"` → корінь `RulesetPatch`. `kind: "skill-tree"` → корінь `SkillTreeSave`. `op` для них ігнорується.
- Ресурс: `op` за замовчуванням `"create"`.

`listFields` (бери лише ті, що реально є в елементах `r.list(...)`; перевір вибіркою на БД `constructor` або за типом повернення):
- units: `["raceId", "level", "maxHp", "armorClass"]`;
- spells: `["level", "groupId", "cost"]`;
- skills: `["mainSkillId"]`;
- artifacts: `["slot", "rarity", "setId"]`;
- artifact-sets: `[]`;
- main-skills: `["role", "spellGroupId"]`;
- races: `["color"]`;
- spell-groups: `["color"]`;
- tracks: `["kind", "durationSec"]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/server/content/__tests__/tool-schemas.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AI_LIMITS } from "@/lib/constants/ai";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { contentSchema, EFFECT_KINDS } from "@/lib/server/content/tool-schemas";

const fits = (v: unknown) => expect(JSON.stringify(v).length).toBeLessThanOrEqual(AI_LIMITS.toolResultChars);

const refsResolve = (v: Record<string, unknown>) => {
  const defs = (v.$defs ?? {}) as Record<string, unknown>;

  for (const [, id] of JSON.stringify(v).matchAll(/"\$ref":"#\/\$defs\/([^"]+)"/g)) expect(defs, id).toHaveProperty([id]);
};

describe("contentSchema", () => {
  it.each(Object.keys(CONTENT_RESOURCES))("%s create/update — вміщається, $ref валідні, здібність — заглушка", (kind) => {
    for (const op of ["create", "update"] as const) {
      const s = contentSchema({ kind: kind as never, op });

      fits(s);
      refsResolve(s);
    }
  });

  it("юніт: Ability — заглушка з підказкою", () => {
    const s = contentSchema({ kind: "units" }) as { $defs: Record<string, { description?: string }> };

    expect(s.$defs.Ability.description).toContain('content_schema(kind: "abilities")');
  });

  it("abilities — вміщається, ефекти перелічені, а не вбудовані", () => {
    const s = contentSchema({ kind: "abilities" });

    fits(s);
    refsResolve(s);
    expect(JSON.stringify(s)).toContain("modifyStat");
    expect(JSON.stringify(s)).not.toContain('"Effect.modifyStat":{"type"');
  });

  it.each(EFFECT_KINDS)("ефект %s — вміщається", (effectKind) => {
    const s = contentSchema({ kind: "abilities", effectKind });

    fits(s);
    refsResolve(s);
  });

  it("rules і skill-tree", () => {
    for (const kind of ["rules", "skill-tree"] as const) {
      fits(contentSchema({ kind }));
      refsResolve(contentSchema({ kind }));
    }
  });

  it("невідомий effectKind → помилка з переліком", () => {
    expect(() => contentSchema({ kind: "abilities", effectKind: "nope" })).toThrow(/modifyStat/);
  });

  it("listFields оголошені для кожного ресурсу", () => {
    for (const r of Object.values(CONTENT_RESOURCES)) expect(Array.isArray(r.listFields)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run lib/server/content/__tests__/tool-schemas.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: Implement** за правилами вище. `EFFECT_KINDS` бери тим самим способом, що й `effectKind()` у `json-schema.ts`. Якщо там є функція, експортуй її, а не копіюй.

- [ ] **Step 4: Run test**

Run: `pnpm test:run lib/server/content/__tests__/tool-schemas.test.ts lib/server/content/__tests__/json-schema.test.ts lib/server/content/__tests__/openapi.test.ts`
Expected: PASS. Якщо якийсь ефект або ресурс не вміщається, вкажи розмір у звіті. Не обрізай схему: це DONE_WITH_CONCERNS.

- [ ] **Step 5: Commit**

```bash
git add lib/server/content
git commit -m "feat(content): self-contained per-kind JSON schemas for agents, listFields per resource

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Інструменти `content_*`

**Files:**
- Create: `lib/ai/tools/content.ts`
- Modify: `lib/ai/tools/index.ts` (реєстрація в `AI_TOOLS`)
- Test: `lib/ai/tools/__tests__/content.test.ts`, `app/api/__tests__/api-tokens-mcp.test.ts`

**Interfaces:**
- Consumes:
  - `listContent`, `getContent`, `createContent`, `updateContent`, `removeContent` (`lib/server/content/service.ts`, з `assertCan` усередині);
  - `CONTENT_RESOURCES` (з `listFields`, `label`, `description`);
  - `contentSchema`, `EFFECT_KINDS`;
  - `readCampaignRules` / `updateCampaignRules` (`lib/server/campaigns/rules.ts`);
  - `readSkillTree` / `saveSkillTree` (задача 2);
  - `assertCan` + `CONTENT_OPERATIONS[...].need` для правил і дерев;
  - `AiToolContext.scopes` (задача 3).
- Produces — `AI_TOOLS` поповнюється інструментами:

| name | scopes | input (Zod, `z.object`) | результат |
|---|---|---|---|
| `content_kinds` | `["content:read"]` | `{}` | `[{ kind, label, description, listFields, ops: ["list","get","create","update","delete"] }]` + `extra: ["abilities","rules","skill-tree"]` |
| `content_schema` | `["content:read"]` | `{ kind: z.enum([...kinds, "abilities", "rules", "skill-tree"]), op: z.enum(["create","update"]).optional(), effectKind: z.string().optional() }` | `contentSchema(...)` |
| `content_list` | `["content:read"]` | `{ kind, query: z.record(z.string(), z.string()).optional(), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).optional() }` | `{ total, offset, items: [{ id, name, ...listFields }] }` (`name` = `row.name ?? row.title`) |
| `content_get` | `["content:read"]` | `{ kind, id }` | `getContent` |
| `content_create` | `["content:write"]` | `{ kind, data: z.record(z.string(), z.unknown()) }` | створений запис |
| `content_update` | `["content:write"]` | `{ kind, id, patch: z.record(z.string(), z.unknown()) }` | оновлений запис |
| `content_delete` | `["content:write"]` | `{ kind, id }` | `{ ok: true }` |
| `get_rules` | `["content:read"]` | `{}` | `readCampaignRules` |
| `update_rules` | `["content:write"]` | `{ patch: z.record(...) }` | `updateCampaignRules(campaignId, parseInput(RulesetPatchSchema, patch))` |
| `get_skill_tree` | `["content:read"]` | `{ race: z.string().min(1) }` | `readSkillTree` або текст «Дерева для раси … ще немає» |
| `save_skill_tree` | `["content:write"]` | `{ race, tree: z.record(...) }` | `saveSkillTree(campaignId, { race, skills: tree })` |

Правила:
- Актор: `{ campaignId: ctx.campaignId, userId: ctx.userId, isDM: true, via: "token", scopes: ctx.scopes }`. Хелпер `toolActor(ctx)` у `content.ts`.
- Помилки: обгортка `withContentErrors(fn)` ловить `ContentError` і кидає `AiToolError`. Текст: `message`, а якщо є `issues` (масив Zod-issue або помилок дерева) — `\n- <path.join(".") || "(корінь)">: <message>` для кожної, до 20 рядків.
- Описи інструментів українською, з підказками. Наприклад, у `content_create`: «Спершу візьми схему через content_schema(kind, "create"). Посилання (raceId, groupId, knownSpells…) — id цієї ж кампанії з content_list».
- `content_list`: якщо `r.list` повертає не масив, нормалізуй до масиву, а в разі потреби додай `listItems` у ресурс (перевір `skills` і `artifact-sets`). Сортування — як віддає ресурс.

- [ ] **Step 1: Write the failing tests**

`lib/ai/tools/__tests__/content.test.ts` — мокаєш `@/lib/server/content/service` (in-memory `Map`) і `@/lib/server/campaigns/rules`. Тести:

```ts
it("content_list: 150 юнітів → 50 за раз, total=150, вміщається в ліміт без обрізання", async () => { /* listContent → 150 рядків з повними полями юніта; runTool(content_list, ctx, { kind: "units", limit: 50 }); результат не містить «[обрізано]», JSON.parse(...).total === 150, items.length === 50, у item лише id,name,raceId,level,maxHp,armorClass */ });
it("content_list offset дає наступну сторінку", async () => { /* offset: 50 → items[0].id === rows[50].id */ });
it("content_create: ContentError з issues → текст із шляхами полів", async () => { /* createContent кидає ContentError("Некоректні дані запиту", 400, [{ path: ["name"], message: "Too small" }]) → результат runTool містить "name: Too small" */ });
it("content_get чужої кампанії → «не знайдено» текстом", async () => { /* getContent кидає ContentError(notFound, 404) → текст, без винятку */ });
it("content_create з токеном content:read → помилка прав текстом", async () => { /* реальний assertCan: не мокати access; ctx.scopes=["content:read"]; service мок викликає справжній assertCan — або тест на рівні реєстру, що інструмент не видно в toolsFor(["content:read"]) + окремо: виклик напряму повертає текст 403 */ });
it("save_skill_tree з невалідним деревом → текст зі списком помилок", async () => { /* saveSkillTree мок кидає ContentError(INVALID_SKILL_TREE, 400, [{ code: "duplicateSkill", ref: "o1" }]) */ });
```

Для тесту «content:read не пише» не мокай `service` повністю: замокай лише ресурс через `vi.mock("@/lib/server/content/resources", …)` з простим in-memory ресурсом (як `thing` у `service.test.ts`). Тоді справжній `createContent` → `assertCan` поверне 403, і тест перевірить шлях від інструмента до сервісу.

`app/api/__tests__/api-tokens-mcp.test.ts`:
- `tools/list` з токеном `["content:read"]` містить `content_list`, `content_get`, `content_schema`, `content_kinds`, `get_rules`, `get_skill_tree`, але НЕ `content_create` і `search_reference`;
- з `["content:write"]` — плюс `content_create`, `content_update`, `content_delete`, `update_rules`, `save_skill_tree`;
- з `["ai"]` — без `content_*`;
- `tools/call content_create → content_get → content_update → content_delete` через JSON-RPC на мокнутому ресурсі (in-memory, як у тесті вище): запис з'являється, змінюється, зникає;
- `tools/call content_create` з невалідним `data` → `result.content[0].text` містить шлях поля.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test:run lib/ai/tools/__tests__/content.test.ts app/api/__tests__/api-tokens-mcp.test.ts`
Expected: FAIL — модуля `content` немає.

- [ ] **Step 3: Implement** `lib/ai/tools/content.ts` за таблицею, через `defineTool({ name, title, description, scopes, input, handler })`. Додай інструменти в `AI_TOOLS`.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/ai/tools/__tests__ app/api/__tests__/api-tokens-mcp.test.ts && pnpm test:changed && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A lib/ai/tools app/api/__tests__
git commit -m "feat(mcp): content_* tools — kinds, schema, list, get, create, update, delete, rules, skill trees

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Перевірка, документація кінця етапу 2

Виконує контролер.

- [ ] **Step 1:** `pnpm test:run`, `pnpm lint` (0 errors), `pnpm build`.
- [ ] **Step 2: Живий прогін на `constructor`:**
  - токен `content:write` (`pnpm dev -p 3001`; створи на `/dm/ai` або вставкою в БД, як у 2c);
  - `curl` до `/api/mcp`: `tools/list` → `content_schema(races)` → `content_create(races)` з двома здібностями → `content_create(units)` цієї раси → `content_create(spells)` → `content_get`;
  - перевір у браузері, що раса, юніт і заклинання видні в бібліотеках;
  - видали їх через `content_delete`, відклич токен.
- [ ] **Step 3:** `battle-sweep` на `constructor`.
- [ ] **Step 4:** Фінальне рев'ю (opus) → одна хвиля виправлень → коротке повторне рев'ю → `/simplify`.
- [ ] **Step 5: Документація:**
  - `docs/architecture/content-api.md` (новий, українською):
    - реєстр ресурсів і операцій;
    - сервіс з `assertCan`;
    - роути `collectionRoutes` / `itemRoutes` / `operationRoute`;
    - токени й права;
    - `/api/openapi.json`;
    - MCP-інструменти та ліміти;
    - як додати новий вид контенту (ресурс + рядок реєстру → REST, OpenAPI і MCP автоматично).
  - Рядок у `docs/architecture/README.md`.
  - `ai.md`: права інструментів, `toolsFor`.
  - `STATUS.md` і хендоф: «етап 2 готовий, далі етап 3 (оновлення з шаблону)».
  - Пам'ять `project-constructor.md`.

---

## Self-review (виконано під час написання)

- **Відповідність спеку 2d:**
  - `AiToolDef.scopes` і фільтр `registerMcpTools` — задача 3;
  - чат з `["ai"]` — задача 3;
  - 11 інструментів — задача 5;
  - `content_schema` з `effectKind` — задача 4;
  - `content_list` ≤ 50 + `total` — задача 5;
  - помилки Zod текстом — задача 5;
  - без масового видалення й експорту — задачі 1 і 5 (немає інструментів; `assertCan` блокує `sessionOnly`);
  - `search_reference` / `read_reference` без змін — задача 3;
  - перевірки 2d (інтеграційний MCP, ліміт на 150 юнітах, живий прогін) — задачі 4, 5, 6;
  - кінець етапу (рев'ю, `/simplify`, `content-api.md`, `ai.md`, STATUS, хендоф) — задача 6.
- **Перенесені пункти з хендофу:**
  - перевірка доступу в сервісі — задача 1;
  - `/api/mcp` без обов'язкового `ai` — задача 3;
  - сервіс дерева, спільний для REST і MCP — задача 2.
  - «Типізований сервіс» свідомо зведено до того, що функції сервісу приймають типізований `Actor` з правами. Генерики за `Row`/`Create` не дають користі, бо відповідь проходить через `toItem` і так лишається `unknown`.
