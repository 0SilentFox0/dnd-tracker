# Конструктор, етап 2c — OpenAPI: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публічний `GET /api/openapi.json` з документом OpenAPI 3.1. Документ генерується з `CONTENT_RESOURCES` і нового реєстру `CONTENT_OPERATIONS`, тож REST і документ не можуть розійтися.

**Architecture:**
- Описи нестандартних операцій (шлях, метод, права, схема тіла) переїжджають у `CONTENT_OPERATIONS`. Роути беруть `need` звідти ж, тому права в документі збігаються з реальними.
- JSON Schema будуються з тих самих Zod-схем через `z.toJSONSchema` у режимі реєстру. Спільні підсхеми (здібність, тригер, умова, кожен вид ефекту, `SpellFx`, `WeaponStats`, `RulesetPatch`) реєструються під своїми id і потрапляють у `components/schemas` через `$ref`.
- Відповіді запису (`POST`/`PATCH`) проходять через `toItem` ресурсу, тому мають ту саму форму, що й `GET` запису.

**Tech Stack:** Next.js 16 route handlers, Zod 4.3 (`z.toJSONSchema`, `z.registry`), Vitest, Prisma 6.

**Spec:** `docs/archive/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md`, розділ «2c. OpenAPI» і «Перевірка → 2c». Перенесені пункти — у `docs/archive/superpowers/constructor-handoff.md` («2c: …», «2c/2d: роути abilities/*»).

## Global Constraints

- Робота лише у worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`. БД — тільки локальна `constructor` (`postgresql://postgres:postgres@localhost:54322/constructor`). Prod і prodcopy не чіпати, у `main` не зливати.
- Без міграцій Prisma.
- Одне джерело правди: схеми з `lib/schemas` / `lib/utils/**/schema*`. Окремих «API-схем» немає. Єдиний виняток — `createYoutubeTrackSchema`: це член наявного `createTrackSchema`, а не копія.
- Документ: OpenAPI `3.1.0`, `securitySchemes.bearerAuth` (`type: http`, `scheme: bearer`). Кожна операція має `x-scopes` і права в описі. Операції `sessionOnly` (масове видалення) в документ не входять.
- `GET /api/openapi.json` публічний, без сесії й токена. Заголовок `Cache-Control: public, max-age=3600`. Документ будується ліниво, один раз на інстанс.
- Помилки — `{ error: string, issues?: unknown[] }` (компонент `Error`). Успіх запису — об'єкт з обов'язковими `id` і `name` та `additionalProperties: true`. Повних схем відповідей немає.
- Тексти для людей (описи, `summary`, `.describe()`) — українською. Ідентифікатори — англійською.
- `.describe()` повертає НОВИЙ екземпляр схеми: експортувати й використовувати саме його.
- ESLint: `padding-line-between-statements`, `simple-import-sort`, без `console.log`, без `any` (там, де без нього не обійтися, — точковий `eslint-disable-next-line` з причиною).
- Коментарі мінімальні: лише неочевидне «чому», один рядок.
- Тести — у сусідніх `__tests__/`. Під час роботи: `pnpm test:related <файли>` / `pnpm test:changed`. Повний `pnpm test:run` — один раз наприкінці (задача 7).
- Коміти — з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Схема, зареєстрована під двома id** (той самий Zod-об'єкт як `create` і `update` або в двох операціях) → у документі не повинно бути `$ref` на «чужий» id і дублів. Очікування: одна схема — один id. Тест у задачі 4 («однакова схема в двох місцях отримує один компонент»).
- **Рекурсивна `ConditionSchema` (`z.lazy`) і `randomOf`** → генерація не зациклюється, а `Condition` посилається сам на себе через `$ref`. Тест у задачі 1.
- **Шлях у документі, якого немає в `app/api`** (перейменований підроут, `{param}` з іншою назвою, ніж тека `[param]`) → тест-обхід падає. Тест у задачі 4.
- **Токен на `GET /api/openapi.json`, або запит із cookie чи без нічого** → завжди 200, однаковий документ, без `Set-Cookie` і без даних кампанії. Тест у задачі 5.
- **`POST` скіла чи юніта з UI після переходу на `toItem`** → клієнт отримує ту саму форму, що й раніше, плюс `abilities`/`abilityIssues`. Ні форма редактора, ні кеш TanStack не ламаються. Тести в задачі 2 і браузерна перевірка в задачі 7.

---

## Карта файлів

| Файл | Що робить |
|---|---|
| `lib/server/content/json-schema.ts` (новий) | `SHARED_SCHEMAS` (схема → id) і `toJsonSchemas(entries)`: реєстр → `Record<id, JSONSchema>` без `$schema`/`$id`. Використовують 2c, а в 2d — `content_schema` |
| `lib/server/content/define-resource.ts` | `schemas.query?`, `schemas.apiCreate?`, `errors?`. `create`/`update` повертають `Row` |
| `lib/server/content/service.ts` | `createContent`/`updateContent` віддають `toItem(row)` |
| `lib/server/content/resources/*.ts` | `create`/`update` повертають сирий рядок у формі `find(…, "read")`. `query` у spells/skills, `apiCreate` у tracks, `errors` у races/artifacts/artifact-sets |
| `lib/server/content/operations.ts` (новий) | `defineOperation`, `CONTENT_OPERATIONS` — описи нестандартних операцій |
| `lib/utils/api/content-routes.ts` | `operationRoute(op, fn)` — роут нестандартної операції з `need` з опису |
| `app/api/campaigns/[id]/{rules,export,skill-trees,…}/route.ts` | Переходять на `operationRoute` |
| `app/api/campaigns/[id]/abilities/**/route.ts` | Отримують `content:read` (доступ ДМ) через `operationRoute` |
| `lib/schemas/skills.ts` | `saveSkillTreeSchema`, перенесена з роуту дерева |
| `lib/schemas/music.ts` | Експорт `createYoutubeTrackSchema` |
| `lib/server/content/openapi.ts` (новий) | `buildOpenApi()`, `getOpenApiDocument()` (лінивий кеш) |
| `app/api/openapi.json/route.ts` (новий) | Публічний `GET` |
| `app/campaigns/[id]/dm/ai/page-client.tsx` | Панель «REST API»: посилання на `openapi.json` і приклад `curl` |
| `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md` | Стан після 2c |

---

### Task 1: Спільні JSON-схеми і описи полів

**Files:**
- Create: `lib/server/content/json-schema.ts`
- Modify: `lib/utils/abilities/schema/ability.ts`, `lib/schemas/units.ts`, `lib/schemas/spells.ts`, `lib/schemas/artifacts.ts`, `lib/schemas/artifact-sets.ts`, `lib/schemas/races.ts`, `lib/schemas/skills.ts` (лише `.describe()`)
- Test: `lib/server/content/__tests__/json-schema.test.ts`

**Interfaces:**
- Produces: `SHARED_SCHEMAS: ReadonlyArray<readonly [ZodType, string]>`; `toJsonSchemas(entries: ReadonlyArray<readonly [ZodType, string]>, opts?: { uriPrefix?: string }): Record<string, Record<string, unknown>>`. Параметр `uriPrefix` за замовчуванням `#/components/schemas/`. Повертає спільні схеми і `entries`. Один і той самий об'єкт схеми отримує лише перший id. Ключі `$schema` і `$id` прибрано з кожного компонента.

- [ ] **Step 1: Write the failing test**

```ts
// lib/server/content/__tests__/json-schema.test.ts
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { createUnitSchema } from "@/lib/schemas";
import { SHARED_SCHEMAS, toJsonSchemas } from "@/lib/server/content/json-schema";

const json = (v: unknown) => JSON.stringify(v);

describe("toJsonSchemas", () => {
  const schemas = toJsonSchemas([[createUnitSchema, "UnitsCreate"]]);

  it("спільні схеми — окремі компоненти, юніт посилається на Ability через $ref", () => {
    for (const [, id] of SHARED_SCHEMAS) expect(schemas[id]).toBeDefined();
    expect(json(schemas.UnitsCreate)).toContain('"$ref":"#/components/schemas/Ability"');
    expect(json(schemas.UnitsCreate).length).toBeLessThan(6000);
  });

  it("кожен вид ефекту — свій компонент; Effect і randomOf посилаються на них", () => {
    expect(schemas["Effect.modifyStat"]).toBeDefined();
    expect(schemas["Effect.summon"]).toBeDefined();
    expect(json(schemas.Effect)).toContain('"$ref":"#/components/schemas/Effect.modifyStat"');
    expect(json(schemas.Effect)).toContain('"$ref":"#/components/schemas/NonRandomEffect"');
  });

  it("рекурсивна Condition посилається сама на себе", () => {
    expect(json(schemas.Condition)).toContain('"$ref":"#/components/schemas/Condition"');
  });

  it("без $schema/$id у компонентах", () => {
    for (const s of Object.values(schemas)) {
      expect(s).not.toHaveProperty("$schema");
      expect(s).not.toHaveProperty("$id");
    }
  });

  it("одна схема під двома id — лише перший", () => {
    const shared = z.object({ name: z.string() });
    const out = toJsonSchemas([[shared, "A"], [shared, "B"]]);

    expect(out.A).toBeDefined();
    expect(out.B).toBeUndefined();
  });

  it("опис ключових полів доходить до документа", () => {
    expect(json(schemas.UnitsCreate)).toMatch(/knownSpells[^}]*description/);
  });

  it("весь набір спільних схем — менше 60 КБ", () => {
    expect(json(toJsonSchemas([])).length).toBeLessThan(60_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/server/content/__tests__/json-schema.test.ts`
Expected: FAIL — модуля `@/lib/server/content/json-schema` немає.

- [ ] **Step 3: Implement `json-schema.ts`**

```ts
// lib/server/content/json-schema.ts
import { z, type ZodType } from "zod";

import "server-only";
import { AbilitySchema, LimitsSchema } from "@/lib/utils/abilities/schema/ability";
import { ConditionSchema } from "@/lib/utils/abilities/schema/conditions";
import { EffectSchema, NonRandomEffectSchema } from "@/lib/utils/abilities/schema/effects";
import { TriggerSchema } from "@/lib/utils/abilities/schema/triggers";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";
import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

type Entry = readonly [ZodType, string];

// the discriminator value lives in _zod.propValues; refined members (summon) have no .shape
const effectKind = (s: ZodType) => [...((s._zod as unknown as { propValues: { kind: Set<string> } }).propValues.kind)][0];

export const SHARED_SCHEMAS: readonly Entry[] = [
  [AbilitySchema, "Ability"],
  [TriggerSchema, "Trigger"],
  [ConditionSchema, "Condition"],
  [LimitsSchema, "AbilityLimits"],
  [EffectSchema, "Effect"],
  [NonRandomEffectSchema, "NonRandomEffect"],
  ...NonRandomEffectSchema.options.map((s): Entry => [s, `Effect.${effectKind(s)}`]),
  [SpellFxSchema, "SpellFx"],
  [WeaponStatsSchema, "WeaponStats"],
  [RulesetPatchSchema, "RulesetPatch"],
];

export function toJsonSchemas(entries: readonly Entry[], opts: { uriPrefix?: string } = {}): Record<string, Record<string, unknown>> {
  const prefix = opts.uriPrefix ?? "#/components/schemas/";

  const registry = z.registry<{ id: string }>();

  for (const [schema, id] of [...SHARED_SCHEMAS, ...entries]) if (!registry.has(schema)) registry.add(schema, { id });

  const { schemas } = z.toJSONSchema(registry, { io: "input", unrepresentable: "any", uri: (id) => `${prefix}${id}` });

  return Object.fromEntries(
    Object.entries(schemas).map(([id, s]) => {
      const { $schema: _s, $id: _i, ...rest } = s as Record<string, unknown>;

      return [id, rest];
    }),
  );
}
```

Якщо `NonRandomEffectSchema.options` не типізується як масив схем, обійди це через `as readonly ZodType[]`, а не через `any`. Якщо `ConditionSchema` не дає `$ref` на себе, перевір, що в реєстр додано саме експортований `ConditionSchema` (обгортку `z.lazy`), а не його внутрішню схему.

- [ ] **Step 4: Add `.describe()` to key fields**

Описи потрапляють у глобальний реєстр Zod і доходять до `toJSONSchema` у режимі реєстру. Кожен `.describe()` став у ланцюжку останнім або перед `.optional()`/`.default()`, і експортуй результат:

- `lib/utils/abilities/schema/ability.ts`: `AbilitySchema = z.object({...}).superRefine(...).describe("Здібність: тригер (коли), умова (якщо), ефекти (що), ліміти. Пасивки — лише статичні ефекти без тривалості.")`.
- `lib/schemas/units.ts` (create, update та import, де поле є):
  - `knownSpells: z.array(z.string()).describe("id заклинань кампанії, які юніт може кастувати").default([])`;
  - `attacks: z.array(unitAttackSchema).describe("Атаки юніта: назва, бонус, кістки шкоди, тип").default([])`;
  - `abilities: AbilitiesSchema.describe("Здібності юніта").optional()`.
- `lib/schemas/races.ts`, `artifacts.ts`, `artifact-sets.ts`, `skills.ts`: `abilities: AbilitiesSchema.describe("Здібності <раси|артефакту|сету|скіла>").optional()`.
- `lib/schemas/spells.ts`: `fx: SpellFxSchema.describe("Візуальний ефект заклинання на мапі бою").nullable().optional()`.
- `lib/schemas/artifacts.ts`: поле бонусів (знайди у схемі `bonuses`/`modifiers`) — `.describe("Бонуси до характеристик, коли артефакт екіпіровано")`.

- [ ] **Step 5: Run tests**

Run: `pnpm test:run lib/server/content/__tests__/json-schema.test.ts && pnpm test:related lib/utils/abilities/schema/ability.ts lib/schemas/units.ts lib/schemas/spells.ts lib/schemas/races.ts lib/schemas/artifacts.ts lib/schemas/artifact-sets.ts lib/schemas/skills.ts`
Expected: PASS. `.describe()` не змінює валідацію, тож наявні тести схем зелені.

- [ ] **Step 6: Commit**

```bash
git add lib/server/content/json-schema.ts lib/server/content/__tests__/json-schema.test.ts lib/utils/abilities/schema/ability.ts lib/schemas
git commit -m "feat(openapi): shared JSON schemas with \$ref per effect kind, field descriptions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Метадані ресурсів і відповіді запису через `toItem`

**Files:**
- Modify: `lib/server/content/define-resource.ts`, `lib/server/content/service.ts`, `lib/server/content/resources/{spells,skills,tracks,races,artifacts,artifact-sets,units}.ts`, `lib/schemas/music.ts`
- Test: `lib/server/content/__tests__/service.test.ts`, `lib/server/content/__tests__/registry.test.ts`, наявні `units-resource.test.ts` / `races-resource.test.ts` / `artifact-resources.test.ts`

**Interfaces:**
- Consumes: —
- Produces — у `ContentResource<Row, Create, Update>`:
  - `schemas: { create; update; query?: ZodType; apiCreate?: ZodType }`;
  - `errors?: readonly (409 | 422)[]`;
  - `create(...): Promise<Row>`, `update(...): Promise<Row>`.
- Produces — у сервісі: `createContent` / `updateContent` повертають `r.toItem ? r.toItem(row) : row`.
- Produces — у `lib/schemas/music.ts`: `createYoutubeTrackSchema`.

- [ ] **Step 1: Write the failing tests**

У `service.test.ts` — новий ресурс `shaped` з `toItem` і два тести:

```ts
const shaped = defineResource<Row, { name: string }, { name?: string }>({
  ...thing,
  toItem: (row) => ({ ...row, shaped: true }),
});

it("create і update віддають ту саму форму, що й get (toItem)", async () => {
  expect(await createContent(shaped, actor, { name: "Н" })).toEqual({ id: "n1", campaignId: "c1", name: "Н", shaped: true });
  expect(await updateContent(shaped, actor, "a", { name: "Нове" })).toEqual({ id: "a", campaignId: "c1", name: "Нове", shaped: true });
  expect(await getContent(shaped, actor, "a")).toEqual({ id: "a", campaignId: "c1", name: "А", shaped: true });
});
```

У `registry.test.ts`:

```ts
import { createYoutubeTrackSchema, listSkillsQuerySchema, listSpellsQuerySchema } from "@/lib/schemas";

it("query-схеми і apiCreate оголошені там, де є параметри або обмеження API", () => {
  expect(CONTENT_RESOURCES.spells.schemas.query).toBe(listSpellsQuerySchema);
  expect(CONTENT_RESOURCES.skills.schemas.query).toBe(listSkillsQuerySchema);
  expect(CONTENT_RESOURCES.tracks.schemas.apiCreate).toBe(createYoutubeTrackSchema);
  expect(CONTENT_RESOURCES.races.errors).toContain(409);
  expect(CONTENT_RESOURCES.artifacts.errors).toContain(422);
});
```

У тестах ресурсів (`units-resource.test.ts`, `races-resource.test.ts`, `artifact-resources.test.ts`) виклики `createContent`/`updateContent`, що порівнюють результат, мають тепер очікувати поля `abilities` і `abilityIssues` (через `withAbilityIssues`). Онови їх лише там, де вони впадуть після кроку 3.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/server/content/__tests__/service.test.ts lib/server/content/__tests__/registry.test.ts`
Expected: FAIL — `shaped` не отримує `shaped: true` з create/update; `schemas.query` undefined.

- [ ] **Step 3: Implement**

`define-resource.ts`:

```ts
schemas: { create: ZodType<Create>; update: ZodType<Update>; query?: ZodType; /** narrower create body for API docs (tracks: YouTube only) */ apiCreate?: ZodType };
/** extra error statuses beyond 400/401/403/404, for API docs */
errors?: readonly (409 | 422)[];
...
create(actor: Actor, input: Create): Promise<Row>;
update(actor: Actor, existing: Row, input: Update): Promise<Row>;
```

`service.ts`:

```ts
const item = (r: AnyContentResource, row: unknown) => (r.toItem ? r.toItem(row) : row);
// createContent: return item(r, created);  updateContent: return item(r, updated);
// getContent: return item(r, row);
```

Ресурси. Правило: `create`/`update` повертають сирий рядок з тими самими `include`, що й `find(…, "read")`. Форматування робить лише `toItem`.
- `units.ts`: повертати `unit`, а не `toUnit(unit)`, бо `toItem` уже викликає `toUnit`.
- `skills.ts`: `update` повертає `updated`, а не `formatSkillResponse(updated)`. `create` уже включає `withRefs`.
- `tracks.ts`: повертати рядок `prisma.campaignTrack.create/update`, без `toCampaignTrack`.
- `spells.ts`: `schemas.query: listSpellsQuerySchema`, а `list` парсить `this`-незалежно через ту саму константу (`parseInput(listSpellsQuerySchema, …)` лишається).
- `skills.ts`: `schemas.query: listSkillsQuerySchema`.
- `tracks.ts`: `schemas.apiCreate: createYoutubeTrackSchema`.
- `races.ts`: `errors: [409]`.
- `artifacts.ts` і `artifact-sets.ts`: `errors: [422]`. Перевір через `persist-icon.ts`, що 422 справді доходить до обох.
- `artifact-sets.ts`: `find` і `reloadArtifactSet*` мають давати однакову форму. Якщо форми різні, `create`/`update` повертають результат `findArtifactSetInCampaign(actor.campaignId, id)`, а `NonNullable` прибирає `null`.

`lib/schemas/music.ts`:

```ts
export const createYoutubeTrackSchema = z.object({ kind: z.literal("youtube"), url: youtubeUrlSchema, title: trackTitleSchema.optional() });

export const createTrackSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("file"), path: z.string().min(1).max(200), title: trackTitleSchema, durationSec: trackDurationSchema.optional() }),
  createYoutubeTrackSchema,
]);
```

Клієнти: знайди споживачів відповідей create/update (`rg "createSkill|updateSkill|createUnit|createTrack|updateTrack" lib/api lib/hooks`). Нові поля `abilities`/`abilityIssues` лише додаються. Перевір, що форма для `lib/api/skills.ts` (create) відповідає типу, який повертає `formatSkillResponse`. Якщо тип у `types/*` описував сирий рядок Prisma, онови тип.

- [ ] **Step 4: Run tests**

Run: `pnpm test:related lib/server/content/service.ts lib/server/content/define-resource.ts lib/server/content/resources/*.ts lib/schemas/music.ts`
Expected: PASS, разом із тестами роутів в `app/api/__tests__`, які імпортують ці модулі.

- [ ] **Step 5: Commit**

```bash
git add -A lib/server/content lib/schemas/music.ts lib/api lib/hooks types app/api/__tests__
git commit -m "feat(content): write responses via toItem, query/apiCreate/errors metadata on resources

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Реєстр нестандартних операцій `CONTENT_OPERATIONS`

**Files:**
- Create: `lib/server/content/operations.ts`
- Modify: `lib/utils/api/content-routes.ts`, `lib/schemas/skills.ts`
- Modify routes (`app/api/campaigns/[id]/…`): `rules/route.ts`, `export/route.ts`, `skill-trees/route.ts`, `skill-trees/[treeId]/route.ts`, `skills/[skillId]/duplicate/route.ts`, `units/import/route.ts`, `spells/delete-by-level/route.ts`, `spells/[spellId]/remove-from-group/route.ts`, `spells/groups/[groupId]/remove-all-spells/route.ts`, `tracks/track-handlers.ts` (reorder), `abilities/sources/route.ts`, `abilities/[kind]/[ownerId]/route.ts`
- Test: `lib/server/content/__tests__/operations.test.ts`, `app/api/__tests__/content-token-needs.test.ts`, `app/api/__tests__/abilities-api.test.ts`

**Interfaces:**
- Consumes: `ActorNeed`, `NEED` з `content-routes.ts`.
- Produces:

```ts
export type OperationResponse = "item" | "list" | "ok" | "object";

export interface ContentOperation {
  id: string;                 // operationId, e.g. "rules.update"
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;               // under /api/campaigns/{id}, OpenAPI template: "/skill-trees/{treeId}"
  summary: string;
  description: string;
  need: ActorNeed;
  body?: ZodType;
  query?: ZodType;
  response: OperationResponse;
  errors?: readonly (409 | 422)[];
}

export const defineOperation = (op: ContentOperation) => op;
export const CONTENT_OPERATIONS: Record<string, ContentOperation>;
// lib/utils/api/content-routes.ts
export function operationRoute(op: ContentOperation, fn: (actor: Actor, params: Record<string, string>, req: Request) => Promise<NextResponse>): (req: Request, ctx: RouteCtx) => Promise<NextResponse>;
```

`operationRoute(op, fn)` = `(req, ctx) => runContent({ req, ctx, need: op.need, action: op.summary }, (actor, p) => fn(actor, p, req))`.

`lib/server/content/operations.ts` імпортує `NEED` з `@/lib/utils/api/content-routes`. Перевір, щоб `import/no-cycle` не спрацював: `content-routes.ts` не повинен імпортувати `operations.ts` значенням, лише `import type`.

- [ ] **Step 1: Move the skill tree body schema**

У `lib/schemas/skills.ts`:

```ts
export const saveSkillTreeSchema = z.object({
  race: z.string().min(1).describe("Назва раси, для якої це дерево"),
  skills: z
    .object({ mainSkills: z.array(z.object({ id: z.string() }).passthrough()).describe("Гілки дерева: id основного скіла і рівні з id скілів бібліотеки") })
    .passthrough(),
});
```

Роут дерева імпортує її з `@/lib/schemas` замість локальної `bodySchema`.

- [ ] **Step 2: Write the failing tests**

```ts
// lib/server/content/__tests__/operations.test.ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";

const routeFile = (path: string) => `app/api/campaigns/[id]${path.replace(/\{(\w+)\}/g, "[$1]")}/route.ts`;

describe("CONTENT_OPERATIONS", () => {
  const ops = Object.entries(CONTENT_OPERATIONS);

  it("ключ = id, пара метод+шлях унікальна", () => {
    for (const [key, op] of ops) expect(op.id).toBe(key);

    const pairs = ops.map(([, op]) => `${op.method} ${op.path}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it.each(ops)("%s: route.ts існує, експортує метод і бере опис з реєстру", (key, op) => {
    const file = routeFile(op.path);

    expect(existsSync(file)).toBe(true);

    const source = readFileSync(file, "utf8") + (existsSync(file.replace("route.ts", "../track-handlers.ts")) ? readFileSync(file.replace("route.ts", "../track-handlers.ts"), "utf8") : "");

    expect(source).toContain(`CONTENT_OPERATIONS["${key}"]`);
  });

  it("усі очікувані операції на місці", () => {
    expect(Object.keys(CONTENT_OPERATIONS).sort()).toEqual(
      [
        "abilities.get",
        "abilities.sources",
        "campaign.export",
        "rules.get",
        "rules.update",
        "skill-trees.list",
        "skill-trees.save",
        "skills.duplicate",
        "spell-groups.remove-all-spells",
        "spells.delete-by-level",
        "spells.remove-from-group",
        "tracks.reorder",
        "units.import",
      ].sort(),
    );
  });
});
```

Посилання на `track-handlers.ts` у тесті потрібне, бо `tracks/order/route.ts` реекспортує хендлер звідти. Якщо після задачі `tracks/order/route.ts` сам містить `operationRoute(CONTENT_OPERATIONS["tracks.reorder"], …)`, спрости тест: прибери гілку з `track-handlers.ts`.

У `app/api/__tests__/content-token-needs.test.ts` додай два випадки, а наявні лиши як є:

```ts
["abilities sources", () => import("@/app/api/campaigns/[id]/abilities/sources/route"), "GET", {}, { access: "dm", scope: "content:read" }],
["abilities owner", () => import("@/app/api/campaigns/[id]/abilities/[kind]/[ownerId]/route"), "GET", { kind: "unit", ownerId: "o" }, { access: "dm", scope: "content:read" }],
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test:run lib/server/content/__tests__/operations.test.ts app/api/__tests__/content-token-needs.test.ts`
Expected: FAIL — модуля `operations` немає; роути abilities не кличуть `resolveActor`.

- [ ] **Step 4: Implement `operations.ts`**

```ts
import "server-only";
import { deleteSpellsByLevelSchema, importUnitsSchema, reorderTracksSchema, saveSkillTreeSchema } from "@/lib/schemas";
import { NEED } from "@/lib/utils/api/content-routes";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";
// ContentOperation / defineOperation як в Interfaces

export const CONTENT_OPERATIONS = {
  "rules.get": defineOperation({ id: "rules.get", method: "GET", path: "/rules", summary: "Правила кампанії", description: "Повний набір правил кампанії (ruleset) з урахуванням значень за замовчуванням.", need: NEED.read("member"), response: "object" }),
  "rules.update": defineOperation({ id: "rules.update", method: "PATCH", path: "/rules", summary: "Змінити правила", description: "Частковий патч правил; не вказані поля лишаються як були.", need: NEED.write, body: RulesetPatchSchema, response: "object" }),
  "campaign.export": defineOperation({ id: "campaign.export", method: "GET", path: "/export", summary: "Експорт бандла", description: "Увесь контент і правила кампанії одним JSON — бекап або основа шаблону.", need: NEED.read("dm"), response: "object" }),
  "skill-trees.list": defineOperation({ id: "skill-trees.list", method: "GET", path: "/skill-trees", summary: "Дерева скілів", description: "Дерева скілів усіх рас кампанії.", need: NEED.read("member"), response: "list" }),
  "skill-trees.save": defineOperation({ id: "skill-trees.save", method: "PATCH", path: "/skill-trees/{treeId}", summary: "Зберегти дерево скілів", description: "Зберігає дерево раси; створює його, якщо ще немає. Прогрес персонажів переноситься. 409 — прогрес змінився паралельно, повторіть.", need: NEED.write, body: saveSkillTreeSchema, response: "object", errors: [409] }),
  "skills.duplicate": defineOperation({ id: "skills.duplicate", method: "POST", path: "/skills/{skillId}/duplicate", summary: "Дублювати скіл", description: "Копія скіла з суфіксом «(копія)».", need: NEED.write, response: "item" }),
  "spells.remove-from-group": defineOperation({ id: "spells.remove-from-group", method: "POST", path: "/spells/{spellId}/remove-from-group", summary: "Прибрати заклинання з групи", description: "Відв'язує заклинання від школи магії.", need: NEED.write, response: "item" }),
  "spell-groups.remove-all-spells": defineOperation({ id: "spell-groups.remove-all-spells", method: "POST", path: "/spells/groups/{groupId}/remove-all-spells", summary: "Очистити школу", description: "Відв'язує всі заклинання від школи магії; самі заклинання лишаються.", need: NEED.write, response: "ok" }),
  "spells.delete-by-level": defineOperation({ id: "spells.delete-by-level", method: "DELETE", path: "/spells/delete-by-level", summary: "Видалити заклинання рівня", description: "Лише з UI.", need: NEED.writeAll, body: deleteSpellsByLevelSchema, response: "ok" }),
  "units.import": defineOperation({ id: "units.import", method: "POST", path: "/units/import", summary: "Імпорт юнітів", description: "Масове додавання/оновлення юнітів за назвою; повертає звіт.", need: NEED.write, body: importUnitsSchema, response: "object" }),
  "tracks.reorder": defineOperation({ id: "tracks.reorder", method: "PUT", path: "/tracks/order", summary: "Порядок треків", description: "Повний список id треків кампанії в новому порядку.", need: NEED.write, body: reorderTracksSchema, response: "list" }),
  "abilities.sources": defineOperation({ id: "abilities.sources", method: "GET", path: "/abilities/sources", summary: "Власники здібностей", description: "Список скілів, рас, артефактів, сетів і юнітів (kind, id, name) — джерела для копіювання здібностей.", need: NEED.read("dm"), response: "object" }),
  "abilities.get": defineOperation({ id: "abilities.get", method: "GET", path: "/abilities/{kind}/{ownerId}", summary: "Здібності власника", description: "Здібності одного власника; kind: skill | race | artifact | artifactSet | unit.", need: NEED.read("dm"), response: "object" }),
} satisfies Record<string, ContentOperation>;
```

Тип `CONTENT_OPERATIONS` має лишатися індексованим ключами-літералами: `satisfies` замість анотації. Тоді `CONTENT_OPERATIONS["rules.get"]` перевіряється компілятором.

- [ ] **Step 5: Switch routes to `operationRoute`**

Приклад (rules):

```ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { readCampaignRules, updateCampaignRules } from "@/lib/server/campaigns/rules";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";
import { parseBody } from "@/lib/utils/api/parse-body";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export const GET = operationRoute(CONTENT_OPERATIONS["rules.get"], async (actor) => NextResponse.json(await readCampaignRules(actor.campaignId)));

export const PATCH = operationRoute(CONTENT_OPERATIONS["rules.update"], async (actor, _p, req) => {
  const patch = await parseBody(RulesetPatchSchema, req, API_ERRORS.INVALID_RULES);

  if (patch instanceof NextResponse) return patch;

  return NextResponse.json(await updateCampaignRules(actor.campaignId, patch));
});
```

Решта роутів переходять так само. Тіло хендлера не змінюється: лише `runContent({...need...})` → `operationRoute(CONTENT_OPERATIONS[…], …)`, а `req` береться з третього аргументу.

Роути `abilities/**`:
- замість `requireDM` → `operationRoute(CONTENT_OPERATIONS["abilities.*"], …)`;
- `id` кампанії береться з `actor.campaignId`, параметри — з `p`;
- помилки віддаються через `errorResponse` / `ContentError`, як і раніше.

`app/api/__tests__/abilities-api.test.ts`, мабуть, мокає `requireDM`. Переведи моки на `resolveActor` у стилі `content-token-needs.test.ts` або на мок `requireDM`, якщо `resolveActor` без Bearer його й так викликає. Обери варіант з меншим diff.

`spells/delete-all` і `units/delete-all` — псевдоніми `DELETE` колекції. У реєстр вони не входять: ці операції `sessionOnly`, і в документі їх немає.

- [ ] **Step 6: Run tests**

Run: `pnpm test:run lib/server/content/__tests__/operations.test.ts app/api/__tests__/content-token-needs.test.ts app/api/__tests__/abilities-api.test.ts && pnpm test:changed`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A lib/server/content lib/utils/api/content-routes.ts lib/schemas/skills.ts "app/api/campaigns/[id]" app/api/__tests__
git commit -m "feat(content): CONTENT_OPERATIONS registry drives custom routes; abilities routes accept content:read tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Генератор `buildOpenApi()`

**Files:**
- Create: `lib/server/content/openapi.ts`
- Test: `lib/server/content/__tests__/openapi.test.ts`

**Interfaces:**
- Consumes: `CONTENT_RESOURCES` (з `schemas.query/apiCreate`, `errors`, `access`, `idParam`, `path`, `label`, `description`, `removeAll?`), `CONTENT_OPERATIONS`, `toJsonSchemas`, `NEED`.
- Produces: `buildOpenApi(): OpenApiDocument`, `getOpenApiDocument(): OpenApiDocument` (мемоізований), `type OpenApiDocument = Record<string, unknown> & { paths: Record<string, Record<string, OpenApiOperation>>; components: { schemas: Record<string, unknown> } }`, `type OpenApiOperation = { operationId: string; "x-scopes": string[]; … }`.

Правила побудови:
- `openapi: "3.1.0"`, `info: { title: "D&D Tracker — Content API", version: "2c" }`, `servers: [{ url: "/" }]`, `security: [{ bearerAuth: [] }]`.
- Префікс шляху — `/api/campaigns/{id}`. Параметр `id` (path, required) додається до кожної операції, `{<idParam>}` — до операцій запису.
- Ресурс → до 5 операцій з `operationId`:
  - `<kind>.list` — `GET path`, scope `content:read`, параметри з `schemas.query`;
  - `<kind>.create` — `POST path`, scope `content:write`, тіло з `schemas.apiCreate ?? schemas.create`, відповідь 201;
  - `<kind>.get`, `<kind>.update` (`PATCH`, тіло з `schemas.update`), `<kind>.delete` (`DELETE`) — на `path/{idParam}`.
  - Колекційний `DELETE` (масове видалення, `writeAll`) у документ не входить.
- Операція з `CONTENT_OPERATIONS` з `need.sessionOnly` пропускається.
- Id компонентів:
  - ресурси — `${Pascal(kind)}Create`, `${Pascal(kind)}Update`, `${Pascal(kind)}ApiCreate`, наприклад `SpellGroupsCreate`;
  - тіла операцій — `${Pascal(op.id)}Body`, наприклад `RulesUpdateBody`;
  - `Pascal("spell-groups.remove-all-spells")` = `SpellGroupsRemoveAllSpells`.
  - Компоненти будуються ОДНИМ викликом `toJsonSchemas([...])` з усіма тілами. Якщо схема вже має id (спільна або раніше додана), `$ref` іде на перший id. Ref для тіла бери з мапи «схема → id», яку збирає `openapi.ts` (перший id для кожного об'єкта).
- Query: `toJsonSchemas` для query не потрібен. Для кожного `[name, prop]` з `z.toJSONSchema(query, { io: "input" }).properties` — `{ name, in: "query", required: required.includes(name), schema: prop }` (без `$schema`).
- `x-scopes: [scope]`. Опис операції: `"${description}\n\nПрава токена: ${scope}${need.access === "dm" ? "; з сесії — лише ДМ" : ""}."`.
- Відповіді:
  - `item` → `ContentItem` (`{ type: "object", required: ["id","name"], properties: { id: {type:"string"}, name: {type:"string"} }, additionalProperties: true }`);
  - `list` → `{ type: "array", items: { type: "object", additionalProperties: true } }`;
  - `ok` → `Ok` (`{ ok: true }`);
  - `object` → `{ type: "object", additionalProperties: true }`.
  - `get`/`create`/`update` ресурсу → `item`, `list` → `list`, `delete` → `ok`.
  - Помилки — `Error` (`{ type:"object", required:["error"], properties: { error: {type:"string"}, issues: {type:"array", items: {}} } }`) на 400/401/403/404 і на кожен код з `errors` ресурсу чи операції. Тексти: 400 «Невалідний запит», 401 «Немає або недійсний токен», 403 «Немає прав або токен іншої кампанії», 404 «Не знайдено в цій кампанії», 409 «Конфлікт», 422 «Недійсні дані (іконка тощо)».
- `tags`: ресурс → `label`; операція → `label` ресурсу з того самого префікса шляху. Для `rules`, `export`, `abilities` — «Кампанія».
- `components.securitySchemes.bearerAuth = { type: "http", scheme: "bearer", description: "Токен з /dm/ai (права content:read / content:write)." }`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/server/content/__tests__/openapi.test.ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildOpenApi, getOpenApiDocument } from "@/lib/server/content/openapi";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

const doc = buildOpenApi();

const ops = Object.entries(doc.paths).flatMap(([path, methods]) => Object.entries(methods).filter(([m]) => m !== "parameters").map(([method, op]) => ({ path, method, op })));

const opById = (id: string) => ops.find((o) => o.op.operationId === id);

describe("buildOpenApi", () => {
  it("OpenAPI 3.1 з bearerAuth", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.components).toMatchObject({ securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } });
  });

  it.each(Object.values(CONTENT_RESOURCES))("$kind: list/create/get/update/delete", (r) => {
    for (const verb of ["list", "create", "get", "update", "delete"]) expect(opById(`${r.kind}.${verb}`)).toBeDefined();
  });

  it("усі операції не-sessionOnly є, sessionOnly — немає", () => {
    for (const op of Object.values(CONTENT_OPERATIONS)) expect(Boolean(opById(op.id))).toBe(!op.need.sessionOnly);
  });

  it("масового DELETE колекції немає", () => {
    for (const r of Object.values(CONTENT_RESOURCES)) expect(doc.paths[`/api/campaigns/{id}${r.path}`]).not.toHaveProperty("delete");
  });

  it("кожна операція має x-scopes і operationId; scope читання/запису відповідає методу ресурсу", () => {
    for (const { op } of ops) expect(op["x-scopes"]).toHaveLength(1);
    expect(opById("units.list")!.op["x-scopes"]).toEqual(["content:read"]);
    expect(opById("units.create")!.op["x-scopes"]).toEqual(["content:write"]);
    expect(opById("abilities.get")!.op["x-scopes"]).toEqual(["content:read"]);
  });

  it("шляхи документа відповідають route.ts з тим самим методом", () => {
    for (const { path, method } of ops) {
      const file = `app${path.replace(/\{(\w+)\}/g, "[$1]")}/route.ts`;

      expect(existsSync(file), file).toBe(true);

      const source = readFileSync(file, "utf8");

      expect(new RegExp(`\\b${method.toUpperCase()}\\b`).test(source) || source.includes("Routes(") || source.includes("Handler"), `${method} ${file}`).toBe(true);
    }
  });

  it("здібності йдуть через $ref, документ компактний", () => {
    const json = JSON.stringify(doc);

    expect(JSON.stringify(doc.components.schemas.UnitsCreate)).toContain("#/components/schemas/Ability");
    expect(json.match(/"trigger":\{"\$ref"/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(json.length).toBeLessThan(150_000);
  });

  it("query-параметри spells?ids і skills?mainSkillId", () => {
    expect(opById("spells.list")!.op.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "ids", in: "query" })]));
    expect(opById("skills.list")!.op.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "mainSkillId", in: "query" })]));
  });

  it("треки через API — лише YouTube", () => {
    const body = JSON.stringify(opById("tracks.create")!.op.requestBody);

    expect(body).toContain("TracksApiCreate");
    expect(JSON.stringify(doc.components.schemas.TracksApiCreate)).not.toContain('"file"');
  });

  it("409 у рас, 422 у артефактів, 409 у збереження дерева", () => {
    expect(opById("races.create")!.op.responses).toHaveProperty("409");
    expect(opById("artifacts.create")!.op.responses).toHaveProperty("422");
    expect(opById("skill-trees.save")!.op.responses).toHaveProperty("409");
  });

  it("усі $ref ведуть на наявні компоненти", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)].map((m) => m[1]);

    for (const id of new Set(refs)) expect(doc.components.schemas, id).toHaveProperty([id]);
  });

  it("getOpenApiDocument кешує документ", () => {
    expect(getOpenApiDocument()).toBe(getOpenApiDocument());
  });
});
```

Перевірка методу в тесті «шляхи відповідають route.ts» м'яка: файли фабрики експортують методи через деструктуризацію `collectionRoutes(`/`itemRoutes(`. Якщо можна, посиль її: динамічно імпортуй модуль і перевір `typeof mod[METHOD] === "function"`. Для цього додай `vi.mock` для `@/lib/db` і `@/lib/supabase/server` за зразком `content-token-needs.test.ts`, бо імпорт роуту тягне Prisma.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run lib/server/content/__tests__/openapi.test.ts`
Expected: FAIL — модуля `openapi` немає.

- [ ] **Step 3: Implement `lib/server/content/openapi.ts`**

Каркас (доповни дрібниці за правилами вище):

```ts
import { z, type ZodType } from "zod";

import "server-only";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { toJsonSchemas } from "@/lib/server/content/json-schema";
import { type ContentOperation, CONTENT_OPERATIONS, type OperationResponse } from "@/lib/server/content/operations";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { type ActorNeed, NEED } from "@/lib/utils/api/content-routes";

const BASE = "/api/campaigns/{id}";

const pascal = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");

const ref = (id: string) => ({ $ref: `#/components/schemas/${id}` });

const ERROR_TEXT: Record<number, string> = { 400: "Невалідний запит", 401: "Немає або недійсний токен", 403: "Немає прав або токен іншої кампанії", 404: "Не знайдено в цій кампанії", 409: "Конфлікт", 422: "Недійсні дані (іконка тощо)" };

const RESPONSE_SCHEMA: Record<OperationResponse, object> = {
  item: ref("ContentItem"),
  list: { type: "array", items: { type: "object", additionalProperties: true } },
  ok: ref("Ok"),
  object: { type: "object", additionalProperties: true },
};

type OpSpec = { id: string; method: string; path: string; tag: string; summary: string; description: string; need: ActorNeed; bodyId?: string; query?: ZodType; response: OperationResponse; status?: number; errors?: readonly number[]; itemParam?: string };

// ... resourceSpecs(r) → OpSpec[] (5 шт.), operationSpecs() → OpSpec[] з CONTENT_OPERATIONS без sessionOnly
// ... queryParams(schema), pathParams(path), toOperation(spec), buildOpenApi(), getOpenApiDocument()

let cached: ReturnType<typeof buildOpenApi> | undefined;

export const getOpenApiDocument = () => (cached ??= buildOpenApi());
```

Збери всі тіла (`[schema, id]`) з ресурсів і операцій в один масив. Виклич `toJsonSchemas(entries)` один раз. Мапа `bodyRef(schema)`: перший id цього об'єкта схеми з `SHARED_SCHEMAS` або `entries`. Для `RulesetPatchSchema` вийде `RulesetPatch`, а не `RulesUpdateBody`. Додай до компонентів `ContentItem`, `Ok`, `Error`.

Path-параметри беруться з шаблону шляху регуляркою `\{(\w+)\}`, кожен `{ name, in: "path", required: true, schema: { type: "string" } }`.

- [ ] **Step 4: Run test**

Run: `pnpm test:run lib/server/content/__tests__/openapi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/server/content/openapi.ts lib/server/content/__tests__/openapi.test.ts
git commit -m "feat(openapi): build OpenAPI 3.1 document from content resources and operations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Публічний `GET /api/openapi.json`

**Files:**
- Create: `app/api/openapi.json/route.ts`
- Test: `app/api/__tests__/openapi-route.test.ts`
- Check: `lib/supabase/middleware.ts` (проксі для `/api/*` робить лише CSRF для мутацій, отже GET пройде; переконайся в цьому і НЕ додавай виняток, якщо він не потрібен)

**Interfaces:**
- Consumes: `getOpenApiDocument()`.
- Produces: `GET` → 200 JSON, `Cache-Control: public, max-age=3600`.

- [ ] **Step 1: Write the failing test**

```ts
// app/api/__tests__/openapi-route.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/openapi.json/route";

describe("GET /api/openapi.json", () => {
  it("публічний, кешований, однаковий з токеном і без", async () => {
    const anon = await GET(new Request("http://x/api/openapi.json"));

    const withToken = await GET(new Request("http://x/api/openapi.json", { headers: { Authorization: "Bearer dt_whatever" } }));

    expect(anon.status).toBe(200);
    expect(anon.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(anon.headers.get("Set-Cookie")).toBeNull();
    expect(await anon.text()).toBe(await withToken.text());
  });

  it("документ без даних кампанії (лише шаблон {id})", async () => {
    const body = await (await GET(new Request("http://x/api/openapi.json"))).json();

    expect(body.openapi).toBe("3.1.0");
    expect(Object.keys(body.paths).every((p: string) => p.startsWith("/api/campaigns/{id}"))).toBe(true);
  });
});
```

Якщо імпорт роуту тягне `@/lib/db` (через ресурси) і падає без `DATABASE_URL`, додай `vi.mock("@/lib/db", () => ({ prisma: {} }))`. Так само зроблено в `registry.test.ts`/`operations.test.ts`, якщо там знадобилося.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run app/api/__tests__/openapi-route.test.ts`
Expected: FAIL — роуту немає.

- [ ] **Step 3: Implement**

```ts
// app/api/openapi.json/route.ts
import { NextResponse } from "next/server";

import { getOpenApiDocument } from "@/lib/server/content/openapi";

export const GET = (_req: Request) => NextResponse.json(getOpenApiDocument(), { headers: { "Cache-Control": "public, max-age=3600" } });
```

Next.js 16: тека з крапкою `openapi.json` працює як сегмент. Якщо `next build` скаржиться, використай `app/api/openapi.json/route.ts` з `export const dynamic = "force-static"`. Перевір результат у задачі 7 через `curl`.

- [ ] **Step 4: Run test**

Run: `pnpm test:run app/api/__tests__/openapi-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/openapi.json app/api/__tests__/openapi-route.test.ts
git commit -m "feat(openapi): public GET /api/openapi.json

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Панель «REST API» на `/dm/ai`

**Files:**
- Modify: `app/campaigns/[id]/dm/ai/page-client.tsx`
- Test: `app/campaigns/[id]/dm/ai/__tests__/page-client.test.tsx` (створити або доповнити наявний; happy-dom)

**Interfaces:**
- Consumes: `campaignId`, `origin` (той самий `useSyncExternalStore`, що в `McpPanel`).
- Produces: `RestApiPanel({ campaignId })`. Рендериться і для кампанії, і для шаблону: одразу після `TokensPanel`, перед `McpPanel`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// у тесті сторінки: відрендерити DmAiPageClient з isTemplate=true (щоб не тягнути AI-панелі), замокати useApiTokens
it("шаблон: є посилання на openapi.json і приклад curl з campaignId", () => {
  render(<DmAiPageClient campaignId="c1" isTemplate />);

  expect(screen.getByRole("link", { name: /openapi\.json/ })).toHaveAttribute("href", "/api/openapi.json");
  expect(screen.getByText(/curl/).textContent).toContain("/api/campaigns/c1/units");
  expect(screen.getByText(/curl/).textContent).toContain("Authorization: Bearer");
});
```

Подивись, як інші тести сторінок мокають хуки (`rg "vi.mock\(\"@/lib/hooks/ai" app components`). Візьми той самий підхід, а `ConfirmProvider` — через `renderWithConfirm`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:run "app/campaigns/[id]/dm/ai/__tests__/page-client.test.tsx"`
Expected: FAIL — посилання немає.

- [ ] **Step 3: Implement**

```tsx
function RestApiPanel({ campaignId }: { campaignId: string }) {
  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => "");

  const curl = `curl -H "Authorization: Bearer <токен>" ${origin}/api/campaigns/${campaignId}/units`;

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">REST API</h2>
      <p className="mb-2 text-sm text-hud-muted">
        Опис усіх операцій контенту:{" "}
        <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="underline">
          openapi.json
        </a>
        . Права токена вказано в кожній операції (x-scopes).
      </p>
      <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-hud-ink">{curl}</pre>
    </HudPanel>
  );
}
```

У `DmAiPageClient`: `<RestApiPanel campaignId={campaignId} />` після `TokensPanel`.

- [ ] **Step 4: Run test and lint**

Run: `pnpm test:run "app/campaigns/[id]/dm/ai/__tests__/page-client.test.tsx" && pnpm lint`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "app/campaigns/[id]/dm/ai"
git commit -m "feat(openapi): REST API panel with openapi.json link and curl example on /dm/ai

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Перевірка, документація, хендоф

Виконує контролер (не субагент-виконавець), після всіх задач.

**Files:**
- Modify: `docs/STATUS.md` (рядок «Конструктор кампаній»), `docs/archive/superpowers/constructor-handoff.md`, `docs/architecture/ai.md` (абзац про токени: посилання на `/api/openapi.json`)

- [ ] **Step 1: Повна перевірка**

```bash
pnpm test:run
pnpm lint
pnpm build
```
Expected: усі тести зелені; на прапорці з відомих нестабільних (`battle-fx.test.tsx`) — перезапуск окремо. Lint 0 errors. Build успішний, роут `/api/openapi.json` у списку.

- [ ] **Step 2: Живий прогін**

```bash
docker start dnd-tracker-db-1 2>/dev/null; pnpm dev -p 3001
curl -s -D - http://localhost:3001/api/openapi.json -o /tmp/openapi.json | grep -i cache-control
node -e 'const d=require("/tmp/openapi.json");console.log(Object.keys(d.paths).length, JSON.stringify(d).length)'
```
Потім:
- створи токен `content:write` на `/dm/ai` кампанії HOMM5 (`cmuylhk0c0001ia06lg5eommv`);
- `curl -X POST -H "Authorization: Bearer …" -H "Content-Type: application/json" -d '{"name":"ТЕСТ 2c",…}' …/units` — за тілом з документа;
- переконайся, що відповідь має ту саму форму, що й `GET …/units/{unitId}`;
- видали юніт, відклич токен.

Браузер:
- створити й відредагувати скіл і юніт у бібліотеці (форми після `toItem`);
- панель «REST API» на `/dm/ai` кампанії і шаблону.

- [ ] **Step 3: `battle-sweep`**

```bash
set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv
```
Expected: exit 0. Відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається» — не блокер.

- [ ] **Step 4: Фінальне рев'ю (opus) → одна хвиля виправлень → коротке повторне рев'ю → `/simplify`**

- [ ] **Step 5: Документація і хендоф**

`docs/STATUS.md`: «2a, 2b, 2c готові». Опис 2c: `/api/openapi.json`, `CONTENT_OPERATIONS`, `toJsonSchemas`, відповіді запису через `toItem`, abilities з `content:read`. Далі — 2d.

`constructor-handoff.md`, блок «Стан» і «Перенесені пункти»:
- 2c ГОТОВА (до <sha>);
- для 2d: `toJsonSchemas` для `content_schema` (режим реєстру; одиночний `toJSONSchema` з `metadata` втрачає `.describe()`); `CONTENT_OPERATIONS` для `get_rules`/`update_rules`/дерев.

```bash
git add docs
git commit -m "docs(constructor): 2c OpenAPI done — status and handoff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review (виконано під час написання)

- **Відповідність спеку 2c:**
  - `buildOpenApi` — задача 4;
  - тіла через `toJSONSchema` з `$ref` спільних — задачі 1 і 4;
  - `.describe()` — задача 1;
  - помилки 400/401/403/404/409/422 — задача 4;
  - успіх `id`/`name` + `additionalProperties` — задача 4;
  - `bearerAuth`, `x-scopes`, без `sessionOnly` — задача 4;
  - публічний роут з кешем — задача 5;
  - UI-посилання й `curl` — задача 6;
  - тести «кожен ресурс/операція має шлях», «шляхи = route.ts», «$ref здібностей» — задача 4.
- **Перенесені пункти з хендофу:**
  - `schemas.query` — задача 2;
  - `toItem` для запису — задача 2;
  - `CONTENT_OPERATIONS` — задача 3;
  - abilities → `content:read` — задача 3.
- **Відхилення від спеку:** замість `.meta({ id })` на спільних схемах — локальний реєстр у `json-schema.ts`. Причина: ids з глобального реєстру Zod при генерації з локального потрапляють у службовий `__shared#/$defs/…`, а не в `components/schemas`, і для документа потрібен локальний реєстр усе одно. Ефект той самий: `$ref` на кожну спільну схему, документ ~50 КБ замість ~55 КБ на кожну схему здібностей.
