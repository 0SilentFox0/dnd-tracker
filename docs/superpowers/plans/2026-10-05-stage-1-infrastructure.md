# Етап 1 — Інфраструктура: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести додаток на новий Supabase-проєкт у Франкфурті, функції Vercel у `fra1` і Pusher у кластер `eu`, з однією чистою початковою міграцією, яку `prisma migrate deploy` накатує автоматично під час production-збірки.

**Architecture:** Етап 1 НЕ змінює модель бою (це етап 2). 27 історичних міграцій зводяться в одну `init`, згенеровану з поточної `schema.prisma` плюс відсутні індекси та RLS. Production-збірка на Vercel запускає `migrate deploy` через `DIRECT_URL`; preview-збірки міграції не запускають. Ручні кроки в дашбордах (Supabase, Pusher, Upstash) позначені **[USER]**; решту виконує агент.

**Tech Stack:** Prisma 6, PostgreSQL 17 (Supabase), Next.js 16 на Vercel, Pusher Channels, Vitest, Docker (локальна shadow-БД).

**Spec:** `docs/superpowers/specs/2026-10-05-battle-storage-redesign-design.md` (§4.3, §12 етап 1)

## Global Constraints

- Регіон Supabase: `eu-central-1` (Frankfurt). Регіон функцій Vercel: `regions: ["fra1"]`. Кластер Pusher: `eu`.
- `DATABASE_URL` для додатку: Transaction pooler, порт `6543`, `?pgbouncer=true&sslmode=require`.
- `DIRECT_URL` для міграцій: Session pooler або Direct connection, порт `5432`.
- Placeholder `DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build?schema=public'` для `prisma generate` у збірці лишається (див. `CLAUDE.md`).
- `migrate deploy` запускається лише при `VERCEL_ENV=production`: preview-збірки ділять ту саму БД і не мають накатувати незмерджені міграції.
- Модель `BattleScene` у цьому етапі не змінюється, крім відновлення індексу `@@index([campaignId])`.
- Документація українською; ідентифікатори в коді англійською.
- Імпорти сортуються `simple-import-sort`; порожній рядок навколо `const`/`if`/`return` (`padding-line-between-statements`).
- Пакетний менеджер `pnpm`; `pnpm install --frozen-lockfile`.

## Review Focus

1. **Відсутній `DIRECT_URL` у production env Vercel** → збірка має впасти з зрозумілим повідомленням, а не зависнути або пропустити міграцію (тест у Task 3).
2. **Preview-деплой гілки з новою міграцією** не має накатувати її на спільну prod-БД (тест у Task 3).
3. **Таблиця, створена без RLS** (зокрема `_prisma_migrations`) → дані доступні через анонімний ключ Supabase Data API (інтеграційний тест у Task 2 перевіряє всі таблиці `public`).
4. **Розбіжність `schema.prisma` і зведеної міграції** → наступний `prisma migrate dev` згенерує неочікуваний diff, як сталося з `battle_scenes_campaignId_idx` (перевірка `migrate diff --exit-code` у Task 2).
5. **Не задано `NEXT_PUBLIC_PUSHER_CLUSTER`** → клієнт і сервер мають тихо піти в `eu`, а не в `mt1` (тест у Task 1).

---

## File Structure

| Файл | Дія | Відповідальність |
|---|---|---|
| `lib/pusher-config.ts` | Create | Єдине джерело кластера Pusher (`getPusherCluster`) |
| `lib/__tests__/pusher-config.test.ts` | Create | Тест дефолту кластера |
| `lib/pusher.ts` | Modify | Використати `getPusherCluster()` у двох місцях |
| `prisma/schema.prisma` | Modify | Відсутні індекси |
| `prisma/migrations/*` | Delete 27 тек | Історичні міграції |
| `prisma/migrations/20261005000000_init/migration.sql` | Create | Згенерована схема + RLS |
| `tests/integration/db.integration.test.ts` | Modify | Перевірка RLS та індексів на живій БД |
| `scripts/vercel-build.mjs` | Create | Кроки збірки Vercel (generate → migrate лише в prod → next build) |
| `scripts/__tests__/vercel-build.test.ts` | Create | Тести вибору кроків |
| `vercel.json` | Modify | `regions: ["fra1"]`, `buildCommand: "node scripts/vercel-build.mjs"` |
| `package.json` | Modify | Прибрати baseline-скрипти і `build:with-migrations` |
| `scripts/prisma-baseline-resolve-all.sh`, `scripts/prisma-resolve-prefix-and-deploy.sh`, `scripts/enable-rls.sql` | Delete | Більше не потрібні (RLS у міграції, baseline не потрібен) |
| `.env.example`, `CLAUDE.md`, `docs/VERCEL.md`, `docs/DATABASE-SYNC.md`, `docs/SWITCH-SUPABASE-ACCOUNT.md` | Modify | Новий флоу |

---

### Task 1: Кластер Pusher за замовчуванням `eu`

**Files:**
- Create: `lib/pusher-config.ts`
- Create: `lib/__tests__/pusher-config.test.ts`
- Modify: `lib/pusher.ts:9` і `lib/pusher.ts:36`

**Interfaces:**
- Produces: `getPusherCluster(): string` — значення `NEXT_PUBLIC_PUSHER_CLUSTER` або `"eu"`.

- [ ] **Step 1: Написати тест, що падає**

`lib/__tests__/pusher-config.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPusherCluster } from "@/lib/pusher-config";

describe("getPusherCluster", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("повертає eu, якщо змінна не задана", () => {
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "");

    expect(getPusherCluster()).toBe("eu");
  });

  it("повертає значення змінної, якщо вона задана", () => {
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "ap2");

    expect(getPusherCluster()).toBe("ap2");
  });

  it("ігнорує пробіли", () => {
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "   ");

    expect(getPusherCluster()).toBe("eu");
  });
});
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `pnpm test:run lib/__tests__/pusher-config.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/pusher-config"`.

- [ ] **Step 3: Мінімальна реалізація**

`lib/pusher-config.ts`:
```ts
const DEFAULT_PUSHER_CLUSTER = "eu";

export function getPusherCluster(): string {
  return process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() || DEFAULT_PUSHER_CLUSTER;
}
```

У `lib/pusher.ts` додати `import { getPusherCluster } from "./pusher-config";` (у групу відносних імпортів, після `pusher-js`) і замінити обидва входження
`process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1"` на `getPusherCluster()`. Коментар `// Server-side Pusher instance` над `pusherServer` видалити (він переказує код).

`NEXT_PUBLIC_*` у клієнтському бандлі Next інлайнить лише за прямим зверненням `process.env.NEXT_PUBLIC_PUSHER_CLUSTER`, що в `getPusherCluster` і є, тож клієнт отримає значення.

- [ ] **Step 4: Запустити тести**

Run: `pnpm test:run lib/__tests__/pusher-config.test.ts && pnpm lint lib/pusher.ts lib/pusher-config.ts`
Expected: 3 passed; lint без помилок.

- [ ] **Step 5: Коміт**

```bash
git add lib/pusher-config.ts lib/__tests__/pusher-config.test.ts lib/pusher.ts
git commit -m "feat(pusher): default cluster eu"
```

---

### Task 2: Зведена початкова міграція з індексами та RLS

**Files:**
- Modify: `prisma/schema.prisma` (моделі `Campaign`, `CampaignMember`, `Character`, `UnitGroup`, `SpellGroup`, `ArtifactSet`, `BattleScene`, `RacialAbility`)
- Delete: усі теки в `prisma/migrations/` крім `migration_lock.toml`
- Create: `prisma/migrations/20261005000000_init/migration.sql`
- Delete: `scripts/enable-rls.sql`
- Modify: `tests/integration/db.integration.test.ts`

**Interfaces:**
- Produces: міграція `20261005000000_init`, яку Task 3 запускає в збірці, а Task 5 — проти нового Supabase.

- [ ] **Step 1: Написати інтеграційні тести, що падають**

У `tests/integration/db.integration.test.ts` всередині `describe.skipIf(...)` додати:
```ts
  it("усі таблиці public мають увімкнений RLS", async (ctx) => {
    if (!canConnect) ctx.skip();

    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT c.relname AS tablename
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    `;

    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it("існують індекси для частих фільтрів", async (ctx) => {
    if (!canConnect) ctx.skip();

    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `;

    const names = rows.map((r) => r.indexname);

    expect(names).toEqual(
      expect.arrayContaining([
        "battle_scenes_campaignId_idx",
        "campaign_members_userId_idx",
        "campaigns_dmUserId_idx",
        "characters_controlledBy_idx",
        "unit_groups_campaignId_idx",
        "spell_groups_campaignId_idx",
        "artifact_sets_campaignId_idx",
        "racial_abilities_campaignId_idx",
      ]),
    );
  });
```

- [ ] **Step 2: Підняти локальну shadow-БД і переконатися, що тести падають**

Якщо Docker не запущено, відкрити Docker Desktop (`open -a Docker`) і дочекатися `docker info`.
```bash
docker run -d --name dnd-shadow -e POSTGRES_PASSWORD=shadow -p 54329:5432 postgres:17
export LOCAL_DB="postgresql://postgres:shadow@localhost:54329/postgres"
DATABASE_URL="$LOCAL_DB" DIRECT_URL="$LOCAL_DB" pnpm exec prisma migrate deploy
DATABASE_URL="$LOCAL_DB" pnpm test:integration tests/integration/db.integration.test.ts
```
Expected: старі 27 міграцій накатуються; 2 нові тести FAIL (є таблиці без RLS; немає `campaign_members_userId_idx` тощо).

- [ ] **Step 3: Додати індекси в `schema.prisma`**

Додати рядки перед `@@map(...)` у відповідних моделях:

| Модель | Рядок |
|---|---|
| `Campaign` | `@@index([dmUserId])` |
| `CampaignMember` | `@@index([userId])` |
| `Character` | `@@index([controlledBy])` (поруч з наявним `@@index([campaignId])`) |
| `UnitGroup` | `@@index([campaignId])` |
| `SpellGroup` | `@@index([campaignId])` |
| `ArtifactSet` | `@@index([campaignId])` |
| `BattleScene` | `@@index([campaignId])` |
| `RacialAbility` | `@@index([campaignId])` |

Run: `pnpm exec prisma format && pnpm exec prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`.

- [ ] **Step 4: Звести міграції в одну**

```bash
find prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +
mkdir -p prisma/migrations/20261005000000_init
pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/20261005000000_init/migration.sql
```
Дописати в кінець `migration.sql`:
```sql

-- RLS: доступ через Supabase Data API (anon key) закритий; Prisma і service_role RLS не обмежує.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "characters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spells" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spell_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifact_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "character_inventories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_trees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "character_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_scenes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "status_effects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "racial_abilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "races" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "main_skills" ENABLE ROW LEVEL SECURITY;
```
Список таблиць має збігатися з `grep -o '@@map("[a-z_]*")' prisma/schema.prisma` (19 таблиць) плюс `_prisma_migrations`.
`_prisma_migrations` Prisma створює до запуску SQL міграції, тож `ALTER` на ній працює.

Видалити `scripts/enable-rls.sql` (його вміст тепер у міграції).

- [ ] **Step 5: Перевірити міграцію на чистій БД і відсутність drift**

```bash
docker rm -f dnd-shadow
docker run -d --name dnd-shadow -e POSTGRES_PASSWORD=shadow -p 54329:5432 postgres:17
sleep 3
DATABASE_URL="$LOCAL_DB" DIRECT_URL="$LOCAL_DB" pnpm exec prisma migrate deploy
DATABASE_URL="$LOCAL_DB" pnpm test:integration tests/integration/db.integration.test.ts
docker run -d --name dnd-shadow2 -e POSTGRES_PASSWORD=shadow -p 54330:5432 postgres:17
sleep 3
pnpm exec prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "postgresql://postgres:shadow@localhost:54330/postgres" --exit-code
```
Expected: `1 migration found … applied`; усі 5 тестів db PASS; `migrate diff` друкує `No difference detected` і повертає код 0.

- [ ] **Step 6: Прибрати контейнери, прогнати юніт-тести і збірку**

```bash
docker rm -f dnd-shadow dnd-shadow2
pnpm exec prisma generate && pnpm test:run && pnpm lint
```
Expected: усі тести PASS, lint без помилок.

- [ ] **Step 7: Коміт**

```bash
git add prisma tests/integration/db.integration.test.ts scripts/enable-rls.sql
git commit -m "feat(db): squash migrations into clean init with missing indexes and RLS"
```

---

### Task 3: Збірка Vercel — регіон `fra1` і `migrate deploy` лише в production

**Files:**
- Create: `scripts/vercel-build.mjs`
- Create: `scripts/__tests__/vercel-build.test.ts`
- Modify: `vercel.json`
- Modify: `package.json` (scripts)
- Delete: `scripts/prisma-baseline-resolve-all.sh`, `scripts/prisma-resolve-prefix-and-deploy.sh`

**Interfaces:**
- Produces:
  - `buildSteps(env: Record<string, string | undefined>): Array<{ cmd: string; env?: Record<string, string>; timeoutMs?: number }>`
  - `assertBuildEnv(env): void` — кидає `Error`, якщо production без `DIRECT_URL`.

- [ ] **Step 1: Написати тест, що падає**

`scripts/__tests__/vercel-build.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { assertBuildEnv, buildSteps } from "@/scripts/vercel-build.mjs";

const PLACEHOLDER = "postgresql://build:build@127.0.0.1:5432/build?schema=public";

describe("buildSteps", () => {
  it("production: generate з placeholder → migrate deploy → next build", () => {
    const steps = buildSteps({ VERCEL_ENV: "production", DIRECT_URL: "postgresql://x" });

    expect(steps.map((s) => s.cmd)).toEqual([
      "prisma generate",
      "prisma migrate deploy",
      "next build",
    ]);
    expect(steps[0].env).toEqual({ DATABASE_URL: PLACEHOLDER });
    expect(steps[1].timeoutMs).toBe(180_000);
  });

  it("preview не запускає міграції", () => {
    const steps = buildSteps({ VERCEL_ENV: "preview" });

    expect(steps.map((s) => s.cmd)).toEqual(["prisma generate", "next build"]);
  });

  it("локальна збірка без VERCEL_ENV не запускає міграції", () => {
    expect(buildSteps({}).map((s) => s.cmd)).toEqual(["prisma generate", "next build"]);
  });
});

describe("assertBuildEnv", () => {
  it("кидає помилку в production без DIRECT_URL", () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: "production" })).toThrow(/DIRECT_URL/);
  });

  it("кидає помилку в production з порожнім DIRECT_URL", () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: "production", DIRECT_URL: "  " })).toThrow(/DIRECT_URL/);
  });

  it("не вимагає DIRECT_URL для preview", () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: "preview" })).not.toThrow();
  });
});
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `pnpm test:run scripts/__tests__/vercel-build.test.ts`
Expected: FAIL — `Failed to resolve import "@/scripts/vercel-build.mjs"`.

- [ ] **Step 3: Реалізація**

`scripts/vercel-build.mjs`:
```js
/**
 * Build command для Vercel.
 * generate — з placeholder URL, бо CLI може висіти на TCP до pooler (див. docs/VERCEL.md).
 * migrate deploy — лише production: preview ділить ту саму БД і не має накатувати незмерджені міграції.
 */
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const PLACEHOLDER_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

const MIGRATE_TIMEOUT_MS = 180_000;

function isProduction(env) {
  return env.VERCEL_ENV === "production";
}

export function assertBuildEnv(env) {
  if (isProduction(env) && !env.DIRECT_URL?.trim()) {
    throw new Error(
      "DIRECT_URL не задано для Production у Vercel — потрібен для prisma migrate deploy (порт 5432).",
    );
  }
}

export function buildSteps(env) {
  const steps = [
    { cmd: "prisma generate", env: { DATABASE_URL: PLACEHOLDER_DATABASE_URL } },
  ];

  if (isProduction(env)) {
    steps.push({ cmd: "prisma migrate deploy", timeoutMs: MIGRATE_TIMEOUT_MS });
  }

  steps.push({ cmd: "next build" });

  return steps;
}

function run() {
  assertBuildEnv(process.env);

  for (const step of buildSteps(process.env)) {
    console.info(`[vercel-build] ${step.cmd}`);
    execSync(step.cmd, {
      stdio: "inherit",
      env: { ...process.env, ...step.env },
      timeout: step.timeoutMs,
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run();
}
```
`execSync` знаходить `prisma` і `next` у `node_modules/.bin`, бо Vercel запускає build command з `PATH`, що містить їх (так само, як поточний `buildCommand`).

`vercel.json`:
```json
{
  "buildCommand": "node scripts/vercel-build.mjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "regions": ["fra1"]
}
```

`package.json` → `scripts`: видалити `build:with-migrations`, `migrate:baseline:resolve-all`, `migrate:baseline:prefix`. `migrate:deploy` лишається (локальний запуск проти `.env.local`).

Видалити `scripts/prisma-baseline-resolve-all.sh` і `scripts/prisma-resolve-prefix-and-deploy.sh`.

- [ ] **Step 4: Запустити тести і перевірити локальну збірку без міграцій**

```bash
pnpm test:run scripts/__tests__/vercel-build.test.ts
pnpm lint scripts/vercel-build.mjs scripts/__tests__/vercel-build.test.ts
node scripts/vercel-build.mjs
```
Expected: 6 passed; lint чистий; локальний запуск друкує `[vercel-build] prisma generate`, `[vercel-build] next build` (без `migrate deploy`) і завершується успішною збіркою.

Якщо `tsc` або `next build` скаржиться на типи імпорту `.mjs` у тесті, додати поруч `scripts/vercel-build.d.mts`:
```ts
export type BuildStep = { cmd: string; env?: Record<string, string>; timeoutMs?: number };
export function buildSteps(env: Record<string, string | undefined>): BuildStep[];
export function assertBuildEnv(env: Record<string, string | undefined>): void;
```

- [ ] **Step 5: Коміт**

```bash
git add scripts/vercel-build.mjs scripts/__tests__/vercel-build.test.ts vercel.json package.json scripts/prisma-baseline-resolve-all.sh scripts/prisma-resolve-prefix-and-deploy.sh
git add -A scripts/vercel-build.d.mts 2>/dev/null || true
git commit -m "build: fra1 region and production-only migrate deploy on Vercel"
```

---

### Task 4: Документація і `.env.example`

**Files:**
- Modify: `.env.example`, `CLAUDE.md`, `docs/VERCEL.md`, `docs/DATABASE-SYNC.md`, `docs/SWITCH-SUPABASE-ACCOUNT.md`

- [ ] **Step 1: `.env.example`**

Замінити блок Prisma на:
```bash
# Prisma / PostgreSQL (Supabase, регіон eu-central-1)
# Додаток: Transaction pooler 6543
DATABASE_URL="postgresql://postgres.[REF]:[PWD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
# Міграції (prisma migrate deploy): Session pooler або Direct, порт 5432
DIRECT_URL="postgresql://postgres.[REF]:[PWD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```
Над `NEXT_PUBLIC_PUSHER_CLUSTER="eu"` додати рядок `# Pusher app має бути створений у кластері eu; за замовчуванням у коді теж eu`.

- [ ] **Step 2: `CLAUDE.md` → розділ «Database & deployment gotchas»**

Замінити перший пункт (про P3005) на:
```markdown
- **Міграції накатуються автоматично лише в production-збірці.** `vercel.json` запускає `node scripts/vercel-build.mjs`: `prisma generate` (placeholder URL) → `prisma migrate deploy` (лише `VERCEL_ENV=production`, через `DIRECT_URL`) → `next build`. Preview-збірки міграції не запускають, бо ділять ту саму БД. Нова міграція: `pnpm exec prisma migrate dev --name X` проти локальної/shadow БД, потім merge у `main`.
- **`DIRECT_URL` (порт 5432) обов'язковий у Vercel Production** — без нього збірка падає з поясненням.
- **Регіони:** Supabase `eu-central-1`, функції Vercel `fra1`, Pusher `eu`. Не змінюй один без інших — кожен запит до БД з іншого континенту додає ~100 мс.
```
Пункт «Vercel build placeholder URL» оновити: замість «`vercel.json` runs `prisma generate` with …» — «`scripts/vercel-build.mjs` runs `prisma generate` with …».
У «Common commands» рядок `pnpm build` лишити; рядок про `migrate deploy` змінити на `pnpm migrate:deploy  # apply migrations against DIRECT_URL from .env.local`.

- [ ] **Step 3: `docs/VERCEL.md`**

- Розділ «Деплой падає з P3005» видалити.
- У таблицю «Обов'язкові» додати рядок: `| DIRECT_URL | Production | Session pooler / Direct, порт 5432 — для prisma migrate deploy у збірці. |`.
- Рядок `NEXT_PUBLIC_PUSHER_CLUSTER`: `Кластер eu (за замовчуванням у коді eu).`
- Розділ «Міграції БД» замінити на:
```markdown
## Міграції БД

Production-збірка накатує міграції сама (`scripts/vercel-build.mjs` → `prisma migrate deploy` через `DIRECT_URL`).
Preview-збірки міграції не запускають. Вручну: `pnpm migrate:deploy` (бере `DIRECT_URL` з `.env.local`).
Історію міграцій зведено в `20261005000000_init` (2026-10-05) під час переходу на новий Supabase-проєкт.
```
- У розділі про placeholder згадку «білд-машини Vercel (наприклад iad1)» прибрати; функції тепер у `fra1`.

- [ ] **Step 4: `docs/DATABASE-SYNC.md` і `docs/SWITCH-SUPABASE-ACCOUNT.md`**

- `DATABASE-SYNC.md`, пункт «Схема»: замінити рядок про baseline на «`pnpm migrate:deploy` з відповідним `DIRECT_URL`; production накатується автоматично під час збірки».
- `SWITCH-SUPABASE-ACCOUNT.md`, крок 3: після «**New project**» додати «Регіон — **Central EU (Frankfurt) / eu-central-1** (поруч із Vercel `fra1`).»; крок 4: додати `DIRECT_URL` до списку змінних; крок 5: бакети `unit-icons`, `spell-icons`, `skill-icons`, `artifact-icons` створює `pnpm run upload-assets-to-supabase`; рядок «Pusher залишається тим самим» замінити на «Pusher app має бути в кластері `eu`».

- [ ] **Step 5: Перевірка і коміт**

Run: `grep -rn "P3005\|mt1\|baseline" CLAUDE.md docs/VERCEL.md docs/DATABASE-SYNC.md docs/SWITCH-SUPABASE-ACCOUNT.md .env.example`
Expected: жодного входження (крім історичної згадки зведення в `docs/VERCEL.md`, якщо слово «baseline» туди потрапило — прибрати).

```bash
git add .env.example CLAUDE.md docs/VERCEL.md docs/DATABASE-SYNC.md docs/SWITCH-SUPABASE-ACCOUNT.md
git commit -m "docs: new Supabase/Vercel/Pusher setup and migration flow"
```

---

### Task 5: Підготовка нових сервісів і застосування схеми

Операційне завдання: код не змінюється, результат перевіряють інтеграційні тести.

**Interfaces:**
- Consumes: міграцію з Task 2, `getPusherCluster` з Task 1.
- Produces: заповнений `.env.local` і env-змінні Vercel (Production, Preview, Development).

- [ ] **Step 1: [USER] Створити Supabase-проєкт**

Supabase Dashboard → New project → регіон **Central EU (Frankfurt)**, надійний пароль БД. Після створення передати агенту (у `.env.local`, не в чат):
`DATABASE_URL` (Transaction pooler 6543 + `?pgbouncer=true&sslmode=require`), `DIRECT_URL` (Session pooler 5432 + `?sslmode=require`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 2: [USER] Auth**

Authentication → Providers: увімкнути ті самі, що були (Email; Google, якщо використовувався — потрібні Client ID/Secret).
Authentication → URL Configuration: Site URL = production-домен; Redirect URLs = `http://localhost:3000/**` і `https://<prod-домен>/**`.

- [ ] **Step 3: [USER] Pusher і Upstash**

- Pusher → Create app → cluster **eu**. Передати `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`; `NEXT_PUBLIC_PUSHER_CLUSTER=eu`.
- Upstash: якщо наявна Redis-база не в `eu-central-1`, створити нову в **eu-central-1** і передати `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.

- [ ] **Step 4: Застосувати схему до нового Supabase**

```bash
pnpm migrate:deploy
pnpm test:integration
```
Expected: `1 migration found … applied`; db (5 тестів), pusher, redis — PASS, жодного skip через відсутні credentials.

- [ ] **Step 5: Сховище і довідкові дані**

```bash
pnpm run upload-assets-to-supabase
```
Expected: створено бакети `unit-icons`, `spell-icons`, `skill-icons`, `artifact-icons`; файли з `assets/` завантажено (у логах кількість файлів на бакет).

Довідкові дані (спели, юніти, бібліотека скілів, артефакти) прив'язані до кампанії, тож імпортуються після створення першої кампанії в Task 6, Step 3.

- [ ] **Step 6: Env у Vercel**

```bash
vercel link   # якщо проєкт ще не прив'язаний
for k in DATABASE_URL DIRECT_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY PUSHER_APP_ID PUSHER_SECRET NEXT_PUBLIC_PUSHER_KEY NEXT_PUBLIC_PUSHER_CLUSTER UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN; do
  vercel env rm "$k" production -y 2>/dev/null; vercel env rm "$k" preview -y 2>/dev/null
done
pnpm sync-env:vercel
vercel env ls
```
Перед запуском `sync-env:vercel` прочитати `scripts/sync-env-to-vercel.mjs` і переконатися, що він бере `.env.local` і пише в Production і Preview. Якщо ні — додати кожну змінну через `vercel env add <KEY> production` / `preview`.
Expected: `vercel env ls` показує всі 11 змінних для Production і Preview; `DIRECT_URL` є в Production.

---

### Task 6: Деплой і перевірка

- [ ] **Step 1: PR і preview**

```bash
git push -u origin docs/battle-redesign-spec
gh pr create --title "Stage 1: new Supabase (eu-central-1), Vercel fra1, Pusher eu, clean init migration" --body "$(cat <<'EOF'
Етап 1 зі спеки docs/superpowers/specs/2026-10-05-battle-storage-redesign-design.md.

- Зведена міграція 20261005000000_init (+ відсутні індекси, RLS на всіх таблицях)
- Vercel regions fra1; production-збірка запускає prisma migrate deploy через DIRECT_URL
- Pusher cluster за замовчуванням eu
- Документація оновлена

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
У логах preview-збірки має бути `[vercel-build] prisma generate` і `[vercel-build] next build` без `migrate deploy`.

- [ ] **Step 2: Production**

Після merge у `main`: у логах production-збірки є `[vercel-build] prisma migrate deploy` і `No pending migrations to apply.` (схема вже застосована в Task 5).

Перевірити регіон функцій:
```bash
curl -s -o /dev/null -D - https://<prod-домен>/api/campaigns | grep -i x-vercel-id
```
Expected: `x-vercel-id: fra1::…` (перший сегмент — edge, другий після `::` — регіон функції, має бути `fra1`).

- [ ] **Step 3: [USER] Смоук-тест і довідкові дані**

1. Зареєструватися, увійти, створити кампанію.
2. Імпортувати довідкові дані в цю кампанію: прочитати заголовки `scripts/import-units.ts`, `scripts/import-spells-from-csv.ts` / `import-docs-spells.ts`, `scripts/import-skills-library.ts`, `scripts/seed-artifacts.ts`, щоб дізнатися потрібні аргументи/env (зазвичай `CAMPAIGN_ID`), і запустити відповідні `pnpm import-units`, `pnpm import-skills-library`, `pnpm seed-artifacts`, `pnpm import-docs-spells`.
3. Створити персонажа, юніта, бій; провести 2 раунди в двох вкладках (DM + гравець) і переконатися, що Pusher оновлює другу вкладку без перезавантаження.
4. У Vercel logs переглянути рядки `[attack]` / `[next-turn]`: час після auth і після завантаження бою має бути помітно меншим, ніж до переїзду (раніше ~100 мс на кожен запит до БД).

---

## Self-review (виконано)

- **Покриття спеки (етап 1, §12):** новий Supabase у `eu-central-1` — Task 5; Vercel `fra1` — Task 3; Pusher `eu` — Tasks 1, 5; чиста початкова міграція — Task 2; `migrate deploy` у флоу деплою — Task 3; оновлення `CLAUDE.md`, `docs/VERCEL.md`, `docs/DATABASE-SYNC.md` — Task 4; індекси §4.3 — Task 2. Нова модель бою (§4) — свідомо етап 2.
- **Плейсхолдери:** `[REF]`, `[PWD]`, `<prod-домен>` — значення, які дає користувач; кодових плейсхолдерів немає.
- **Узгодженість імен:** `getPusherCluster`, `buildSteps`, `assertBuildEnv`, `20261005000000_init` використовуються однаково в усіх задачах.
