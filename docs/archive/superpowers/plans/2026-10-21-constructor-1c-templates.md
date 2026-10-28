# Конструктор 1c: шаблони кампаній — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Кампанію можна створити з шаблону: офіційного (HOMM5, «Порожня») або власного. Шаблон копіюється: правила, налаштування, увесь контент бібліотек і музика.
- ДМ може зберегти свою кампанію як шаблон, експортувати її в JSON і створити кампанію з JSON.
- Копія не має жодного посилання на кампанію-джерело.

**Architecture:**
- Шаблон — це рядок `Campaign` з `kind = "template"`, власник є DM-учасником. Тому шаблон редагують наявні DM-редактори.
- Один шлях коду для всіх сценаріїв: `exportCampaign(id) → Bundle` і `importBundle(bundle, targetId, tx)`.
- `importBundle` генерує нові id наперед, замінює кожне значення, яке точно збігається з id джерела (у FK-колонках і в будь-якому JSON), вставляє рядки `createMany` у порядку FK і проставляє `sourceId`/`sourceHash`.
- Після імпорту `assertNoLeak` перевіряє, що жодного id джерела не лишилося.
- Створення кампанії, «Зберегти як шаблон» та імпорт JSON — це один сервіс `createCampaignFromBundle`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Prisma 6, PostgreSQL (локальний Docker), Vitest, Zod 4, TanStack Query.

**Spec:** `docs/archive/superpowers/specs/2026-10-20-campaign-constructor-design.md` (розділ C, частина «1c»).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`. БД — тільки `postgresql://postgres:postgres@localhost:54322/constructor`. Міграції тільки розширюють схему (`prisma migrate deploy`, тека з датою після `20261024100000`). Кожна міграція з `CREATE TABLE` вмикає RLS; у цьому плані нових таблиць немає.
- **Ізоляція.** Імпорт пише тільки в цільову кампанію; `assertNoLeak` обов'язковий у кожному шляху імпорту, і порушення відкочує транзакцію.
- **Порядок вставки** (виправлення спеку): SpellGroup → Race → Unit → Spell → MainSkill → Skill → SkillTree → ArtifactSet → Artifact → CampaignTrack. `Unit.raceId` посилається на Race, тож раси йдуть перед юнітами.
- **Склад бандла:** `settings` (`maxLevel`, `xpMultiplier`, `allowPlayerEdit`, `friendlyFire`), `rules`, 10 таблиць контенту. Персонажі, бої, сценарій, слайди, учасники та invite-код не входять.
- **Колонки рядка бандла** — тільки зі `Prisma.<Model>ScalarFieldEnum`, без `campaignId`, `createdAt`, `updatedAt`, `sourceId`, `sourceHash`. Під час імпорту невідомі ключі відкидаються: це захист від ін'єкції `campaignId` через JSON.
- **Ассети Storage** (публічні URL) у копіях спільні з джерелом. Видалення контенту в кампанії не видаляє файл, шлях якого не належить цій кампанії (Task 5).
- Шаблони не з'являються у списках кампаній і не приймають гравців за invite-кодом.
- Конвенції CLAUDE.md:
  - логіка — в `lib/server/…`, `lib/schemas`, `lib/utils/api`, а не в `route.ts` (домовленість із сесією main перед фабрикою CRUD);
  - компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики `keys.ts`;
  - сторінки — `HudPage`/`HudTile`; `ResponsiveDialog`, `useConfirm`, `useNotify`; тексти українською;
  - клієнтський код не імпортує `@/lib/utils/rules/schema` (zod) — лише barrel `@/lib/utils/rules`.
- **Перевикористання** (правило CLAUDE.md):
  - `parseBody`, `requireCampaignAccess`, `requireDM`, `errorResponse`/`handleApiError` (`lib/utils/api`);
  - `generateInviteCode` і ретрай на колізію з `app/api/campaigns/route.ts`;
  - `invalidateCampaignLists`, `invalidateReference`;
  - `hashJson` (`lib/utils/battle/store/stable-json.ts`);
  - `parseRules` / `RulesetSchema` (`lib/utils/rules/schema`);
  - `ImportDialog` + `useFileImport` (`components/common`, `lib/hooks/common`);
  - `trackPathOwnedBy` (`lib/supabase/battle-music-storage.ts`);
  - `assertSeedTarget` (скрипти).

  Нове: генератор id (у репо немає cuid-бібліотеки), обхід JSON з заміною за значенням (`remapRefs` з `seed-library-lib` прив'язаний до ключів і не підходить).
- Тести під час роботи: `pnpm test:changed` / `pnpm test:related <files>` / `pnpm test:run <paths>`. Повний прогін — один раз у Task 8.

## Review Focus

1. **Бандл від користувача з чужим id** (наприклад, `summon.unitId` іншої кампанії, якого немає серед id бандла). Імпорт відхиляється з 400, а не створює посилання на чужу кампанію. Тест додається в Task 3.
2. **Бандл з `campaignId`, `id` іншої кампанії в FK-колонці або зайвими ключами.** Зайві ключі відкидаються, а FK, якого немає в бандлі, стає `null` з попередженням (для `Unit.raceId`, `Spell.groupId` тощо), без помилки БД. Тест додається в Task 3.
3. **Повторне створення з одного шаблону** (дві кампанії поспіль). Кожна має свої id, змінювати контент однієї можна, не зачіпаючи іншу. Тест додається в Task 4.
4. **Гравець чи сторонній користувач і чужий особистий шаблон.** Створення з `templateId` чужого приватного шаблону → 403; експорт чужої кампанії → 403; приєднання до шаблону за invite-кодом → 403. Тест додається в Task 4.
5. **Видалення треку в копії** не видаляє MP3 шаблону; видалення треку, завантаженого в саму копію, видаляє файл. Тест додається в Task 5.

---

## File Structure

| Файл | Що робить |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261025000000_campaign_templates/migration.sql` | `campaigns.kind/visibility/created_from_id`, `source_id/source_hash` у 10 таблицях |
| `lib/constants/campaigns.ts` | `CampaignKind`, `CampaignVisibility` |
| `lib/utils/api/platform-admin.ts` | `isPlatformAdmin(userId)` з env `PLATFORM_ADMIN_USER_IDS` |
| `lib/server/templates/ids.ts` | `newContentId()`, `CONTENT_ID_RE` |
| `lib/server/templates/remap-ids.ts` | `remapIds(value, idMap)`, `collectStrings(value)` |
| `lib/server/templates/bundle.ts` | `BUNDLE_TABLES` (порядок, модель, колонки, FK), `BundleSchema`, `type Bundle` |
| `lib/server/templates/export-campaign.ts` | `exportCampaign(db, campaignId)` |
| `lib/server/templates/import-bundle.ts` | `importBundle(tx, bundle, targetCampaignId)` → `{ idMap, warnings }` |
| `lib/server/templates/assert-no-leak.ts` | `assertNoLeak(tx, targetCampaignId, sourceIds)`, `findForeignIds(tx, ids)` |
| `lib/server/campaigns/create-campaign.ts` | `createCampaignFromBundle(…)`, `loadTemplateForUser(…)` |
| `app/api/campaigns/route.ts` (POST з `templateId`), `app/api/campaigns/import/route.ts`, `app/api/campaigns/[id]/export/route.ts`, `app/api/campaigns/[id]/save-as-template/route.ts`, `app/api/templates/route.ts` | Тонкі роути |
| `app/api/campaigns/join/route.ts`, `app/campaigns/page.tsx`, `app/api/campaigns/route.ts` (GET) | Фільтр `kind` |
| `app/api/campaigns/[id]/tracks/track-handlers.ts` | Видалення файлу лише свого шляху |
| `lib/api/templates.ts`, `lib/hooks/campaigns/{useTemplates,useSaveAsTemplate,useImportCampaign,useCampaignExportUrl}.ts` | Клієнт |
| `components/campaigns/NewCampaignForm.tsx`, `components/campaigns/templates/*`, `components/campaigns/settings/CampaignSettingsDialog.tsx`, `app/campaigns/[id]/page.tsx` | UI |
| `scripts/constructor/create-official-templates.ts`, `scripts/constructor/copy-test-heroes.ts` | Скрипти |

---

### Task 1: Міграція, константи, адміни платформи

**Files:**
- Modify: `prisma/schema.prisma`, `lib/constants/campaigns.ts`, `docs/archive/superpowers/specs/2026-10-20-campaign-constructor-design.md` (порядок вставки)
- Create: `prisma/migrations/20261025000000_campaign_templates/migration.sql`, `lib/utils/api/platform-admin.ts`
- Test: `lib/utils/api/__tests__/platform-admin.test.ts`

**Interfaces:**
- Produces:
  - `CampaignKind = { CAMPAIGN: "campaign", TEMPLATE: "template" } as const`;
  - `CampaignVisibility = { PRIVATE: "private", OFFICIAL: "official" } as const`;
  - `isPlatformAdmin(userId: string): boolean`;
  - Prisma: `Campaign.kind String @default("campaign")`, `Campaign.visibility String @default("private")`, `Campaign.createdFromId String?`, а на 10 моделях `sourceId String?`, `sourceHash String?`.

- [ ] **Step 1: Міграція.**
```sql
-- prisma/migrations/20261025000000_campaign_templates/migration.sql
ALTER TABLE "campaigns" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'campaign', ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private', ADD COLUMN "createdFromId" TEXT;
CREATE INDEX "campaigns_kind_visibility_idx" ON "campaigns"("kind", "visibility");
ALTER TABLE "spell_groups" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "races" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "units" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "spells" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "main_skills" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "skills" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "skill_trees" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "artifact_sets" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "artifacts" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "campaign_tracks" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;
```
Назви колонок звірте з поточним стилем схеми: якщо поля мапляться в snake_case через `@map`, пишіть snake_case і додайте `@map`. Індекс оголосіть у Prisma: `@@index([kind, visibility])`.
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/constructor DIRECT_URL=postgresql://postgres:postgres@localhost:54322/constructor pnpm exec prisma migrate deploy && pnpm exec prisma generate
```

- [ ] **Step 2: Константи і адміни (тест спершу).**
```ts
// lib/utils/api/__tests__/platform-admin.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { isPlatformAdmin } from "@/lib/utils/api/platform-admin";

describe("isPlatformAdmin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads a comma-separated env list, trims, ignores empty", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", " u1 , u2,,");

    expect(isPlatformAdmin("u1")).toBe(true);
    expect(isPlatformAdmin("u2")).toBe(true);
    expect(isPlatformAdmin("u3")).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
  });

  it("no env → nobody is admin", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", "");

    expect(isPlatformAdmin("u1")).toBe(false);
  });
});
```
```ts
// lib/utils/api/platform-admin.ts
import "server-only";

export function isPlatformAdmin(userId: string): boolean {
  if (!userId) return false;

  return (process.env.PLATFORM_ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean).includes(userId);
}
```
Якщо `server-only` у vitest не мокається (перевірте, як інші `server-only` модулі тестуються), приберіть імпорт `server-only` і залиште модуль лише серверним за розташуванням. Константи додайте в `lib/constants/campaigns.ts` поряд із `CampaignRole`.

- [ ] **Step 3: Спек.** У `docs/archive/superpowers/specs/2026-10-20-campaign-constructor-design.md` (розділ C, `import-bundle.ts`) замініть порядок «групи → юніти → раси → …» на «групи → раси → юніти → заклинання → гілки → скіли → дерева → сети → артефакти → треки» з приміткою «Unit.raceId → Race».

- [ ] **Step 4: Коміт.** `pnpm exec tsc --noEmit && pnpm test:run lib/utils/api`, потім `git commit -m "feat(constructor): campaign kind/visibility, content source ids, platform admins"`.

---

### Task 2: Генератор id і заміна за значенням

**Files:**
- Create: `lib/server/templates/ids.ts`, `lib/server/templates/remap-ids.ts`
- Test: `lib/server/templates/__tests__/{ids,remap-ids}.test.ts`

**Interfaces:**
- Produces:
```ts
export const CONTENT_ID_RE: RegExp;            // /^c[a-z0-9]{24}$/ — формат prisma cuid() і newContentId()
export function newContentId(): string;
export function remapIds<T>(value: T, idMap: ReadonlyMap<string, string>): T; // глибоко, нова структура, вхід не мутує
export function collectStrings(value: unknown, out?: Set<string>): Set<string>;
```

- [ ] **Step 1: Тести (падають).**
```ts
// lib/server/templates/__tests__/ids.test.ts
import { describe, expect, it } from "vitest";

import { CONTENT_ID_RE, newContentId } from "@/lib/server/templates/ids";

describe("newContentId", () => {
  it("matches the cuid shape and is unique", () => {
    const ids = new Set(Array.from({ length: 5000 }, newContentId));

    expect(ids.size).toBe(5000);
    for (const id of ids) expect(id).toMatch(CONTENT_ID_RE);
  });

  it("CONTENT_ID_RE accepts prisma cuids from the DB", () => {
    expect("cmuylhk0c0001ia06lg5eommv").toMatch(CONTENT_ID_RE);
  });
});
```
```ts
// lib/server/templates/__tests__/remap-ids.test.ts
import { describe, expect, it } from "vitest";

import { collectStrings, remapIds } from "@/lib/server/templates/remap-ids";

const map = new Map([["cold1", "cnew1"], ["cold2", "cnew2"]]);

describe("remapIds", () => {
  it("replaces exact string values anywhere, keeps others, does not mutate", () => {
    const input = { a: "cold1", b: ["x", "cold2", { c: "cold1 " }], d: { e: { unitId: "cold2", n: 3, t: true, z: null } } };
    const out = remapIds(input, map);

    expect(out).toEqual({ a: "cnew1", b: ["x", "cnew2", { c: "cold1 " }], d: { e: { unitId: "cnew2", n: 3, t: true, z: null } } });
    expect(input.a).toBe("cold1");
  });

  it("does not touch object keys", () => {
    expect(remapIds({ cold1: 1 }, map)).toEqual({ cold1: 1 });
  });
});

describe("collectStrings", () => {
  it("collects every string value", () => {
    expect([...collectStrings({ a: "x", b: ["y", { c: "z" }], d: 1 })].sort()).toEqual(["x", "y", "z"]);
  });
});
```
Ключі об'єктів не змінюються навмисно. Якщо якийсь JSON зберігає id як ключ (наприклад, `Character.skillTreeProgress`, але він не входить у бандл), це обробляється окремо. Для таблиць бандла перевірте в Task 3, чи немає id у ключах (`SkillTree.skills`, `Race.availableSkills`); якщо є — розширте `remapIds` прапорцем `{ keys: true }` і тестом.

- [ ] **Step 2: Реалізація.**
```ts
// lib/server/templates/ids.ts
import { randomBytes } from "node:crypto";

export const CONTENT_ID_RE = /^c[a-z0-9]{24}$/;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function newContentId(): string {
  const bytes = randomBytes(24);

  return "c" + Array.from(bytes, (b) => ALPHABET[b % 36]).join("");
}
```
```ts
// lib/server/templates/remap-ids.ts
export function remapIds<T>(value: T, idMap: ReadonlyMap<string, string>): T {
  if (typeof value === "string") return (idMap.get(value) ?? value) as T;

  if (Array.isArray(value)) return value.map((v) => remapIds(v, idMap)) as T;

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapIds(v, idMap)])) as T;
  }

  return value;
}

export function collectStrings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object" && !(value instanceof Date)) Object.values(value).forEach((v) => collectStrings(v, out));

  return out;
}
```
Модульне зміщення `b % 36` для 256 значень дає незначну нерівномірність; для id без криптографічних вимог це прийнятно.

- [ ] **Step 3: Коміт.** `pnpm test:run lib/server/templates`, потім `git commit -m "feat(constructor): content id generator and value-based id remap"`.

---

### Task 3: Бандл — схема, експорт, імпорт, перевірка витоку

**Files:**
- Create: `lib/server/templates/{bundle,export-campaign,import-bundle,assert-no-leak}.ts`
- Test: `lib/server/templates/__tests__/{bundle,import-bundle,assert-no-leak}.test.ts`

**Interfaces:**
- Consumes: `newContentId`, `CONTENT_ID_RE`, `remapIds`, `collectStrings` (Task 2), `hashJson`, `parseRules`.
- Produces:
```ts
export type BundleTable = "spellGroups" | "races" | "units" | "spells" | "mainSkills" | "skills" | "skillTrees" | "artifactSets" | "artifacts" | "tracks";
export const BUNDLE_TABLES: ReadonlyArray<{ key: BundleTable; model: Prisma.ModelName; columns: readonly string[]; fks: Partial<Record<string, BundleTable>> }>; // у порядку вставки
export const BundleSchema: z.ZodType<Bundle>;
export type Bundle = { formatVersion: 1; settings: { maxLevel: number; xpMultiplier: number; allowPlayerEdit: boolean; friendlyFire: boolean }; rules: unknown } & Record<BundleTable, Array<Record<string, unknown> & { id: string }>>;
export type TemplateDb = Pick<Prisma.TransactionClient, "spellGroup" | "race" | "unit" | "spell" | "mainSkill" | "skill" | "skillTree" | "artifactSet" | "artifact" | "campaignTrack" | "campaign">;
export function exportCampaign(db: TemplateDb, campaignId: string): Promise<Bundle>;
export function importBundle(tx: TemplateDb, bundle: Bundle, targetCampaignId: string): Promise<{ idMap: Map<string, string>; warnings: string[] }>;
export function assertNoLeak(tx: TemplateDb, targetCampaignId: string, sourceIds: ReadonlySet<string>): Promise<void>; // кидає TemplateLeakError
export function findForeignContentIds(tx: TemplateDb, candidates: ReadonlySet<string>, ownIds: ReadonlySet<string>): Promise<string[]>;
export class TemplateLeakError extends Error {}
export class BundleInvalidError extends Error { issues?: unknown }
```

- [ ] **Step 1: `bundle.ts`.**
  - Колонки кожної моделі: `Object.values(Prisma.<Model>ScalarFieldEnum)` мінус `campaignId`, `createdAt`, `updatedAt`, `sourceId`, `sourceHash`.
  - FK:
    - `units.raceId → races`;
    - `spells.groupId → spellGroups`, `spells.summonUnitId → units`;
    - `mainSkills.spellGroupId → spellGroups`;
    - `skills.spellId/spellNewSpellId/grantedSpellId → spells`, `skills.spellGroupId → spellGroups`, `skills.mainSkillId → mainSkills`;
    - `artifacts.setId → artifactSets`.
  - Порядок — з Global Constraints.
  - `BundleSchema`: `formatVersion: z.literal(1)`; `settings` — strict-об'єкт з межами як у `createCampaignSchema` (`maxLevel` 1..30, `xpMultiplier` 0..10); `rules: z.unknown()` (нормалізується `parseRules`); кожна таблиця — `z.array(z.looseObject({ id: z.string().regex(CONTENT_ID_RE) })).max(5000)`.
  - Тест: `BUNDLE_TABLES` у правильному порядку (кожен FK вказує на таблицю, що стоїть раніше); схема відхиляє `formatVersion: 2`, id не в форматі cuid і `maxLevel: 99`.

- [ ] **Step 2: `export-campaign.ts`.** Для кожної таблиці `findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } })`, далі `pick(row, columns)`. `settings` і `rules` (`parseRules(campaign.rules)`) — з рядка кампанії. Порядок рядків детермінований (`createdAt`, потім `id`), щоб бандл був стабільний для порівнянь.

- [ ] **Step 3: Тест імпорту (падає).** Використовуйте фейкову `TemplateDb` у пам'яті: обгортка з `createMany` (зберігає рядки), `findMany({ where: { campaignId } })` і `findMany({ where: { id: { in } }, select: { id, campaignId } })`, за зразком `ImportDb` у `lib/utils/units/import-units.ts`. Кейси:
  1. **Повний бандл:** група, раса, юніт (`raceId`), заклинання (`groupId`, `summonUnitId`, `spellEffects` з `summon.unitId`), гілка (`spellGroupId`), скіл (`spellId`, `mainSkillId`, `abilities` з `castSpellOnHit.spellId` та `trigger.spellIds`), дерево (`race` — назва, `skills` JSON із `levelSkillIds` на скіл), сет, артефакт (`setId`, `abilities` з посиланням на заклинання), трек.
     - Після імпорту в кожній таблиці нові id;
     - кожне посилання вказує на новий id;
     - `campaignId` = ціль, `sourceId` = старий id, `sourceHash` — 40 hex;
     - `SkillTree.race` незмінний;
     - `warnings` порожні.
  2. **FK на id, якого немає в бандлі** (`units[0].raceId = "cforeign…"`): у рядку стає `null`, у `warnings` — «units cX: raceId → null».
  3. **Зайві ключі** (`campaignId: "evil"`, `foo: 1`) відкидаються, `campaignId` = ціль.
  4. **JSON-посилання на чужий контент** (`spellEffects[0].unitId` = id юніта, який фейкова БД має в іншій кампанії) → `BundleInvalidError`.
  5. Цикл «імпорт → експорт» з ціллю рівний вихідному бандлу після заміни id через обернений `idMap`.
  6. Порожній бандл (усі масиви `[]`) імпортується без помилок.

- [ ] **Step 4: `import-bundle.ts`.**
```ts
export async function importBundle(tx: TemplateDb, raw: Bundle, targetCampaignId: string) {
  const bundle = BundleSchema.parse(raw);
  const warnings: string[] = [];
  const idMap = new Map<string, string>();

  for (const t of BUNDLE_TABLES) for (const row of bundle[t.key]) idMap.set(row.id, newContentId());

  const foreign = await findForeignContentIds(tx, idCandidates(bundle), new Set(idMap.keys()));

  if (foreign.length > 0) throw new BundleInvalidError(`Бандл посилається на контент інших кампаній: ${foreign.slice(0, 5).join(", ")}`);

  for (const t of BUNDLE_TABLES) {
    const rows = bundle[t.key].map((row) => {
      const clean = pick(row, t.columns);

      for (const [col, target] of Object.entries(t.fks)) {
        const ref = clean[col];

        if (typeof ref === "string" && !bundle[target!].some((r) => r.id === ref)) {
          warnings.push(`${t.key} ${row.id}: ${col} → null`);
          clean[col] = null;
        }
      }

      const remapped = remapIds(clean, idMap);

      return { ...remapped, id: idMap.get(row.id)!, campaignId: targetCampaignId, sourceId: row.id, sourceHash: hashJson(clean) };
    });

    if (rows.length > 0) await (tx[t.model] as { createMany(a: { data: unknown[] }): Promise<unknown> }).createMany({ data: rows.map(toPrismaJson) });
  }

  return { idMap, warnings };
}
```
  - `idCandidates(bundle)` — `collectStrings(bundle)`, відфільтровані `CONTENT_ID_RE`.
  - `findForeignContentIds` — один `findMany({ where: { id: { in: [...] } }, select: { id: true } })` по кожній із 10 таблиць (без фільтра кампанії), мінус `ownIds`. На імпорті з власного шаблону вихідні id теж є в БД, але вони входять в `ownIds` (ключі `idMap`), тож не рахуються чужими.
  - `toPrismaJson` перетворює `null` у Json-колонках на `Prisma.DbNull` (Json-колонки — з `Prisma.dmmf` або явним списком у `BUNDLE_TABLES`).
  - Поле `t.model` використовуйте як ключ делегата (`spellGroup`, `race`, …); `BUNDLE_TABLES` зберігає назву делегата.

- [ ] **Step 5: `assert-no-leak.ts`.** `assertNoLeak(tx, target, sourceIds)` читає всі 10 таблиць цілі, і якщо `collectStrings(rows)` має перетин із `sourceIds`, кидає `TemplateLeakError` з першими 5 збігами. Тест: фейкова БД з рядком, у якого лишився старий id у JSON, дає помилку; чиста — без помилки.

- [ ] **Step 6: Коміт.** `pnpm test:run lib/server/templates && pnpm exec tsc --noEmit`, потім `git commit -m "feat(constructor): campaign bundle export/import with id remap and leak guard"`.

---

### Task 4: Сервіс створення, роути, доступ, фільтри шаблонів

**Files:**
- Create: `lib/server/campaigns/create-campaign.ts`, `app/api/campaigns/import/route.ts`, `app/api/campaigns/[id]/export/route.ts`, `app/api/campaigns/[id]/save-as-template/route.ts`, `app/api/templates/route.ts`, `lib/schemas/templates.ts`
- Modify: `app/api/campaigns/route.ts` (POST через сервіс + `templateId`; GET — `kind: CAMPAIGN`), `lib/schemas/campaigns.ts` (`createCampaignSchema.templateId?`), `app/api/campaigns/join/route.ts` (шаблон → 403 `TEMPLATE_NOT_JOINABLE`), `app/campaigns/page.tsx` (`kind: CAMPAIGN`), `lib/constants/api-errors.ts`
- Test: `app/api/__tests__/campaign-templates-api.test.ts`, `lib/server/campaigns/__tests__/create-campaign.test.ts`

**Interfaces:**
- Consumes: `exportCampaign`, `importBundle`, `assertNoLeak`, `BundleSchema`, `BundleInvalidError`, `TemplateLeakError`, `isPlatformAdmin`, `CampaignKind`, `CampaignVisibility`, `generateInviteCode`, `invalidateCampaignLists`.
- Produces:
```ts
export async function createCampaignFromBundle(input: {
  userId: string; name: string; description?: string | null;
  bundle: Bundle | null;               // null → порожня кампанія (поточна поведінка POST)
  kind?: "campaign" | "template"; visibility?: "private" | "official"; createdFromId?: string | null;
  settings?: Partial<Bundle["settings"]>; // форма створення може перекрити maxLevel/allowPlayerEdit
}): Promise<{ campaign: Campaign; warnings: string[] }>;
export async function loadTemplateForUser(userId: string, templateId: string): Promise<{ ok: true; template: Campaign } | { ok: false; status: 403 | 404 }>;
```
Роути:
- `POST /api/campaigns` `{ name, description?, maxLevel?, allowPlayerEdit?, templateId? }`;
- `POST /api/campaigns/import` `{ name, bundle }` (тіло ≤ 4 МБ);
- `GET /api/campaigns/[id]/export` (DM) → JSON з `Content-Disposition: attachment; filename="<slug>-<yyyy-mm-dd>.json"`;
- `POST /api/campaigns/[id]/save-as-template` `{ name, description? }` (DM) → новий шаблон-копія;
- `GET /api/templates` → `{ official: TemplateCard[], mine: TemplateCard[] }`, де `TemplateCard = { id, name, description, counts: Record<BundleTable, number>, visibility }`;
- `PATCH /api/campaigns/[id]` приймає `visibility` тільки від `isPlatformAdmin`, інакше 403.

- [ ] **Step 1: Тести (падають).**
  - **Сервіс** (`prisma` мокнутий за зразком інших тестів `lib/server`, `$transaction` викликає колбек):
    - `bundle: null` створює кампанію + DM-учасника, як зараз;
    - з бандлом: кампанія, учасник, `importBundle`, `assertNoLeak` в одній транзакції; колізія invite-коду дає ретрай (до 5 спроб);
    - `TemplateLeakError` відкочує все і пробрасується далі;
    - `settings` з форми перекривають бандл.
  - **Роути:**
    1. Створення з офіційного шаблону від будь-якого користувача → 200; кампанія має `createdFromId`, `kind: campaign`; список кампаній інвалідовано.
    2. Створення з чужого приватного шаблону → 403; з неіснуючого → 404; з `templateId`, що вказує на звичайну кампанію (не шаблон) → 404.
    3. Двічі з одного шаблону → дві кампанії з різними id контенту (перевірка через `importBundle`-мок, що отримує той самий бандл; id генерує реальний `newContentId`).
    4. Експорт: ДМ → 200 з `Content-Disposition`; гравець → 403.
    5. `save-as-template`: ДМ → новий рядок `kind: template`, `visibility: private`, `createdFromId` = кампанія; гравець → 403.
    6. Імпорт: валідний бандл → 200; `formatVersion: 2` → 400 з `issues`; `BundleInvalidError` → 400 з текстом.
    7. Join за кодом шаблону → 403 `TEMPLATE_NOT_JOINABLE`.
    8. `GET /api/templates` повертає офіційні від будь-кого і мої (DM-учасник), без чужих приватних.
    9. `PATCH visibility: official` не від адміна → 403.

- [ ] **Step 2: Сервіс.**
```ts
// lib/server/campaigns/create-campaign.ts (скелет)
export async function createCampaignFromBundle(input: CreateFromBundleInput) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const s = { ...input.bundle?.settings, ...input.settings };

        const campaign = await tx.campaign.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            inviteCode: generateInviteCode(),
            dmUserId: input.userId,
            kind: input.kind ?? CampaignKind.CAMPAIGN,
            visibility: input.visibility ?? CampaignVisibility.PRIVATE,
            createdFromId: input.createdFromId ?? null,
            ...(s.maxLevel !== undefined && { maxLevel: s.maxLevel }),
            ...(s.xpMultiplier !== undefined && { xpMultiplier: s.xpMultiplier }),
            ...(s.allowPlayerEdit !== undefined && { allowPlayerEdit: s.allowPlayerEdit }),
            ...(s.friendlyFire !== undefined && { friendlyFire: s.friendlyFire }),
            ...(input.bundle && { rules: parseRules(input.bundle.rules) as Prisma.InputJsonObject }),
            members: { create: { userId: input.userId, role: CampaignRole.DM } },
          },
        });

        if (!input.bundle) return { campaign, warnings: [] };

        const { idMap, warnings } = await importBundle(tx, input.bundle, campaign.id);

        await assertNoLeak(tx, campaign.id, new Set(idMap.keys()));

        return { campaign, warnings };
      }, { timeout: 60_000, maxWait: 10_000 });
    } catch (error) {
      if (attempt >= INVITE_CODE_ATTEMPTS || !isInviteCodeClash(error)) throw error;
    }
  }
}
```
  `isInviteCodeClash` і `INVITE_CODE_ATTEMPTS` перенесіть з `app/api/campaigns/route.ts` у `lib/utils/campaigns/invite-code.ts` і імпортуйте в обох місцях. Після успіху роут викликає `invalidateCampaignLists([userId])`. `invalidateReference` для нової кампанії не потрібен: її кешу ще не існує.

  `loadTemplateForUser`: `findUnique({ where: { id }, include: { members: { where: { userId } } } })`:
  - немає рядка або `kind !== template` → 404;
  - `visibility === official` або `members[0]?.role === DM` → ok;
  - інакше 403.

- [ ] **Step 3: Роути** — тонкі, за зразком наявних; помилки — `{ error }` з текстами в `api-errors.ts`:
  - `TEMPLATE_NOT_FOUND`: «Шаблон не знайдено»;
  - `TEMPLATE_FORBIDDEN`: «Немає доступу до шаблону»;
  - `TEMPLATE_NOT_JOINABLE`: «До шаблону не можна приєднатися»;
  - `BUNDLE_INVALID`: «Некоректний файл кампанії»;
  - `BUNDLE_TOO_LARGE`: «Файл кампанії завеликий (до 4 МБ)».

  `TemplateLeakError` → 500 з логом `console.error`, бо це баг сервера, а не помилка користувача. `save-as-template` = `exportCampaign(prisma, id)` + `createCampaignFromBundle({ kind: template, createdFromId: id, … })`. Експорт і `save-as-template` — `requireDM(id)`.

- [ ] **Step 4: Фільтри.**
  - `app/campaigns/page.tsx` і `GET /api/campaigns`: `kind: CampaignKind.CAMPAIGN` у `where`.
  - Join: якщо `campaign.kind === TEMPLATE` → 403 до перевірки статусу.

- [ ] **Step 5: Коміт.** `pnpm test:run app/api/__tests__ lib/server && pnpm exec tsc --noEmit && pnpm lint`, потім `git commit -m "feat(constructor): create from template, save as template, JSON export/import, template access"`.

---

### Task 5: Спільні файли треків не видаляються з чужої кампанії

**Files:**
- Modify: `app/api/campaigns/[id]/tracks/track-handlers.ts:~151`
- Test: поряд із наявними тестами `track-handlers` (`grep -rln track-handlers app/api/__tests__`)

- [ ] **Step 1: Тест (падає).** Видалення треку `kind: "file"` з `url` у шляху `<іншийCampaignId>/…` не викликає `removeTrackFile`; з `url` у шляху `<цейCampaignId>/…` — викликає.
- [ ] **Step 2: Реалізація.** `if (track.kind === "file" && url && trackPathOwnedBy(url, campaignId)) after(() => removeTrackFile(url));` — перевірте сигнатуру `trackPathOwnedBy` (`lib/supabase/battle-music-storage.ts:13`). Якщо вона приймає шлях, а не URL, використайте наявну функцію витягу шляху з URL у тому ж модулі.
- [ ] **Step 3: Коміт.** `git commit -m "fix(constructor): deleting a cloned track never deletes the template's file"`.

---

### Task 6: UI — вибір шаблону, імпорт, «Зберегти як шаблон», експорт, сторінка шаблону

**Files:**
- Create: `lib/api/templates.ts`, `lib/hooks/campaigns/{useTemplates,useSaveAsTemplate,useImportCampaign,useCampaignExportUrl}.ts`, `components/campaigns/templates/{TemplatePicker,TemplateTile,SaveAsTemplateDialog}.tsx`
- Modify: `lib/api/campaigns.ts` (`createCampaign` з `templateId`), `lib/hooks/campaigns/{keys,index}.ts` (`campaignKeys.templates()`), `components/campaigns/NewCampaignForm.tsx`, `components/campaigns/settings/CampaignSettingsDialog.tsx`, `app/campaigns/page.tsx` (розділ «Мої шаблони»), `app/campaigns/[id]/page.tsx` (банер «Шаблон» і лише бібліотечні плитки для `kind: template`)
- Test: `components/campaigns/__tests__/template-picker.test.tsx`, `lib/hooks/campaigns/__tests__/useTemplates.test.tsx`

**Interfaces:**
- Consumes: роути Task 4; `ImportDialog` + `useFileImport` (`components/common/ImportDialog.tsx`, `lib/hooks/common/useFileImport.ts`).
- Produces:
  - `useTemplates()` → `{ data: { official, mine } }`;
  - `useSaveAsTemplate(campaignId)`;
  - `useImportCampaign()`;
  - `useCampaignExportUrl(campaignId)` → `string` (URL роуту експорту — компонент робить `<a href download>`, без імпорту `lib/api` у компоненті).

- [ ] **Step 1: Створення кампанії.**
  - `NewCampaignForm` отримує першим блоком `TemplatePicker`: сітка `HudTile` — офіційні шаблони (назва, опис, лічильники «N рас · N юнітів · N заклинань»), «Мої шаблони», плитка «Імпорт з файлу» і плитка «Без шаблону» (за замовчуванням обрана «Порожня», якщо вона є серед офіційних, інакше «Без шаблону»).
  - Вибір шаблону підставляє його назву в плейсхолдер назви кампанії.
  - «Імпорт з файлу» відкриває `ImportDialog` (`accept=".json"`): після вибору файлу форма показує «Файл: <ім'я>, N сутностей» і відправляє на `POST /api/campaigns/import`.
  - Кнопка «Створити» показує стан завантаження; після успіху — `router.push`.
  - Якщо імпорт повернув `warnings`, після переходу показується `useNotify()`: «Створено з попередженнями: N посилань скинуто».

- [ ] **Step 2: Налаштування кампанії (ДМ).** У `CampaignSettingsDialog` додайте секцію «Шаблони»:
  - «Зберегти як шаблон» відкриває `SaveAsTemplateDialog` (`ResponsiveDialog hud`: назва, опис), після успіху — `notify` «Шаблон створено» з посиланням;
  - «Експортувати в JSON» — `<a href={exportUrl} download>`.

- [ ] **Step 3: Список і сторінка шаблону.**
  - `app/campaigns/page.tsx` отримує розділ «Мої шаблони» під кампаніями (лише якщо є), з `HudCard` на кожен шаблон і посиланням на `/campaigns/<id>`.
  - Сторінка шаблону (`kind: template`) показує банер «Це шаблон: зміни потрапляють у нові кампанії, створені з нього; наявні кампанії не змінюються» і лише плитки бібліотек (заклинання, школи магії, скіли, гілки, раси, юніти, артефакти, сети, музика, правила).
  - Invite-код, персонажі, бої, показ і сценарій для шаблону приховані.

- [ ] **Step 4: Тести.**
  - `TemplatePicker` (happy-dom, хуки мокнуті): показує офіційні й мої; вибір плитки викликає `onChange({ templateId })`; «Імпорт з файлу» — `onChange({ file })`.
  - `useTemplates` використовує ключ `campaignKeys.templates()`.
  - `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run components/campaigns lib/hooks/campaigns`.
- [ ] **Step 5: Коміт.** `git commit -m "feat(constructor): template picker, JSON import, save as template, export, template page"`.

---

### Task 7: Скрипти — офіційні шаблони, герої для перевірки, фільтри в наявних скриптах

**Files:**
- Create: `scripts/constructor/create-official-templates.ts`, `scripts/constructor/copy-test-heroes.ts`
- Modify: `package.json` (`constructor:official-templates`, `constructor:copy-heroes` з тим самим префіксом `tsx --env-file=.env.local --tsconfig tsconfig.scripts.json`), `scripts/sim/battle-sweep.ts:365`, `scripts/seed/seed-homm5-characters.ts:197`, `scripts/sim/hero-growth-report.ts:104`, `scripts/sim/balance-library.ts:454`, `scripts/db/redistribute-character-spell-slots.ts:35` (додати `kind: "campaign"` у пошук кампанії)
- Test: `scripts/constructor/__tests__/copy-test-heroes.test.ts` (чиста функція мапінгу)

- [ ] **Step 1: `create-official-templates.ts <homm5CampaignId> [--owner <userId>] [--allow-remote]`.**
  - `assertSeedTarget`.
  - **HOMM5:** якщо шаблону з `createdFromId = <homm5CampaignId>`, `kind = template`, `visibility = official` ще немає, то `exportCampaign(prisma, id)` + `createCampaignFromBundle({ userId: owner ?? source.dmUserId, name: "HOMM5", description: "Герої Меча і Магії V: раси, юніти, заклинання, артефакти і музика", bundle, kind: TEMPLATE, visibility: OFFICIAL, createdFromId: id })`. Інакше — повідомлення «вже існує», бо скрипт ідемпотентний.
  - **«Порожня»:** `createCampaignFromBundle({ name: "Порожня", description: "Без контенту, правила за замовчуванням", bundle: emptyBundle(), kind: TEMPLATE, visibility: OFFICIAL })`, якщо офіційного шаблону з такою назвою немає.
  - Звіт: id шаблонів, лічильники рядків по таблицях, `warnings`.
- [ ] **Step 2: `copy-test-heroes.ts <fromCampaignId> <toCampaignId>`.**
  - Чиста функція `mapHeroRefs(character, inventory, skillRows, sourceIdToNew)`: замінює id у `knownSpells`, `personalSkillId`, `skillTreeProgress` (і ключі, і значення), `CharacterInventory.equipped/backpack/items`. `CharacterSkills.skillTreeId` іде через `sourceId` рядків цілі.
  - Мапа `sourceIdToNew` будується з рядків цілі: `sourceId → id`.
  - Персонаж копіюється з новим id, `campaignId` = ціль і тим самим `controlledBy`. Лише персонажі типу героя (як у `battle-sweep` — звірте фільтр там).
  - Тест чистої функції: усі id замінені, невідомі лишились, ключі `skillTreeProgress` замінені.
- [ ] **Step 3: Фільтри в скриптах** — у кожному місці зі списку додайте `kind: "campaign"` у `where`. `battle-sweep` уже приймає `--campaign`; без нього пошук за назвою «HOMM5» не повинен знаходити шаблон.
- [ ] **Step 4: Коміт.** `pnpm test:run scripts/constructor && pnpm exec tsc --noEmit`, потім `git commit -m "feat(constructor): official templates script, test hero copier, scripts ignore templates"`.

---

### Task 8: Повна перевірка 1c

- [ ] **Step 1:** `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run && pnpm build`. Очікується: зелене (відомі нестабільні таймаути — лише якщо окремо проходять).
- [ ] **Step 2: Офіційні шаблони на `constructor`.**
```bash
pnpm constructor:official-templates cmuylhk0c0001ia06lg5eommv
```
  Очікується: створено «HOMM5» і «Порожня». Лічильники HOMM5 збігаються з кількістю рядків вихідної кампанії по кожній таблиці (`select count(*) … where "campaignId" = …` для обох). `warnings` порожні. Повторний запуск повідомляє «вже існує».
- [ ] **Step 3: Кампанія з шаблону + бій.** Тимчасовим `tsx`-скриптом у `.superpowers/` (не комітиться) викличте `createCampaignFromBundle({ userId: <dmUserId джерела>, name: "ТЕСТ з шаблону", bundle: await exportCampaign(prisma, <homm5TemplateId>), createdFromId: <homm5TemplateId> })`. Далі:
  - `pnpm constructor:copy-heroes <джерело> <нова>`;
  - `DATABASE_URL=…/constructor pnpm battle-sweep --campaign <нова>` — без нових помилок відносно sweep на джерелі (відомі помилки лабіринту допустимі);
  - експорт нової кампанії дорівнює експорту шаблону з точністю до id (порівняння через обернену мапу `sourceId`).
  - Потім видаліть тестову кампанію (`campaign.delete`, каскад) і переконайтеся, що файли треків шаблону живі: `select url from campaign_tracks where "campaignId" = <шаблон>` не змінився, а в коді немає видалення файлів при каскаді.
- [ ] **Step 4: `/simplify`** (правило CLAUDE.md: у кінці гілки). Його запускає контролер, а не виконавець, на діапазоні гілки `feat/constructor` відносно `main`; фікси комітяться окремо.
- [ ] **Step 5: Звіт.** Числа, лічильники шаблонів, попередження, знахідки.
