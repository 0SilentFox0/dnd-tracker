# Онбординг для ДМ і гравців — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Чеклісти «Перші кроки» для ДМ і гравця, контекстні підказки на екранах, «Що нового» в хедері й довідка `/help` — на одному декларативному реєстрі з мінімальним станом у БД.

**Architecture:** Реєстр у `lib/onboarding/` (чисті дані + функції прогресу). Виконання кроків рахується з фактів БД (один `$queryRaw` з підзапитами `count`), у таблиці `user_onboarding_flags` зберігається лише «закрив/бачив». Роути → `lib/api/onboarding.ts` → хуки `lib/hooks/onboarding/` → компоненти `components/onboarding/`.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, Prisma 6 / PostgreSQL, Zod, Vitest (+ happy-dom, Testing Library).

**Spec:** `docs/superpowers/specs/2026-10-22-onboarding-design.md`

**Робоче місце:** worktree `/Users/silentfox/Work/dnd-tracker-onboarding`, гілка `feat/onboarding`. Локальна БД `onboarding` на Docker Postgres (`localhost:54322`). Усі команди — з кореня worktree.

## Global Constraints

- Тексти UI, підказок, довідки, помилок — українською; ідентифікатори в коді — англійською.
- Мінімум коментарів: лише неочевидне «чому», один рядок.
- Компоненти не імпортують `@/lib/api/*`; запити тільки в `lib/api/onboarding.ts`, логіка й стан — у `lib/hooks/onboarding/`.
- Query keys лише з `lib/hooks/onboarding/keys.ts` (файл без `"use client"`), ніколи inline-масиви.
- Діалоги тільки через `ResponsiveDialog` (`components/ui/responsive-dialog`), без Radix/vaul напряму.
- Імпорти через `@/…`; порядок — `pnpm lint --fix`; порожній рядок навколо `const`/`if`/`return`/блоків.
- Міграція тільки expand: нова таблиця + `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
- Помилки API — `errorResponse(API_ERRORS.X, status)`, тексти з `lib/constants/api-errors.ts`.
- Будь-яка помилка API онбордингу → компонент рендерить `null`; онбординг ніколи не блокує роботу і не показує `ErrorState`.
- Тести: під час роботи `pnpm test:related <files>`; повний `pnpm test:run` — один раз у Task 9.
- Кожен коміт закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Перший візит нинішнього користувача** — у кампанії все вже виконано: чекліст не має розгортатися, бейдж «Що нового» не має показувати всю історію. Тест у Task 4 (`readOnboardingFlags` ставить `whats-new` на найновіший id, `readCampaignOnboarding` повертає `collapsed` і ставить `completedAt`).
2. **Гравець не бачить ДМ-кроків і чужих даних** — роль із `requireCampaignAccess`, факти гравця тільки про його персонажа. Тест у Task 4.
3. **Сміття в ключах прапорців** (довгі/довільні ключі, `checklist:` чужої кампанії) — Zod-regex + перевірка членства для `checklist:<id>`. Тест у Task 4.
4. **Падіння API онбордингу** — сторінка кампанії й екрани працюють, онбординг мовчить. Тести у Task 6 і Task 7 (помилка запиту → `container` порожній).
5. **Застарілий / видалений id у `whats-new`** (запис прибрали з реєстру) — нічого не вважається непобаченим, без падіння. Тест у Task 2.

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261025000000_user_onboarding_flags/migration.sql` | таблиця прапорців |
| `lib/onboarding/types.ts` | типи реєстру й фактів |
| `lib/onboarding/checklists.ts` | кроки ДМ і гравця |
| `lib/onboarding/progress.ts` | `checklistProgress`, `checklistState`, `unseenWhatsNew`, `isHintHidden` |
| `lib/onboarding/hints.ts` | підказки |
| `lib/onboarding/whats-new.ts` | записи «Що нового» |
| `lib/onboarding/help/*.ts`, `lib/onboarding/help/index.ts` | статті довідки |
| `lib/onboarding/flag-keys.ts` | конструктори й regex ключів прапорців |
| `lib/server/onboarding/facts.ts` | `readOnboardingFacts` (один SQL) |
| `lib/server/onboarding/flags.ts` | читання/запис/скидання прапорців |
| `app/api/onboarding/route.ts`, `…/flags/route.ts`, `…/reset/route.ts` | роути прапорців |
| `app/api/campaigns/[id]/onboarding/route.ts`, `read-onboarding.ts` | чекліст кампанії |
| `types/onboarding.ts` | відповіді API |
| `lib/api/onboarding.ts` | клієнтські обгортки |
| `lib/hooks/onboarding/{keys,useOnboardingFlags,useCampaignOnboarding,useWhatsNew,index}.ts` | хуки |
| `components/onboarding/{OnboardingChecklist,OnboardingHint,WhatsNewButton,HelpArticleView,HelpSettings}.tsx` | UI |
| `app/help/page.tsx`, `app/help/[slug]/page.tsx` | довідка |
| `docs/architecture/onboarding.md` | архітектура підсистеми |

---

### Task 1: Таблиця `user_onboarding_flags`

**Files:**
- Modify: `prisma/schema.prisma` (модель `User` рядки 11–23 + нова модель у кінці файлу)
- Create: `prisma/migrations/20261025000000_user_onboarding_flags/migration.sql`
- Test: `prisma/__tests__/migrations-rls.test.ts` (наявний, не змінюється)

**Interfaces:**
- Produces: Prisma-модель `UserOnboardingFlag { id, userId, key, value: string | null, updatedAt }`, клієнт `prisma.userOnboardingFlag`, унікальний індекс `userId_key`.

- [ ] **Step 1: Створити локальну БД `onboarding`**

```bash
pnpm db:local
docker exec -i $(docker ps -qf "publish=54322") psql -U postgres -c 'CREATE DATABASE onboarding;'
```

У `.env.local` worktree (скопіювати з основної папки `../dnd-tracker/.env.local`, якщо файлу немає) задати
`DATABASE_URL=postgresql://postgres:postgres@localhost:54322/onboarding` і `DIRECT_URL` з тим самим значенням.

- [ ] **Step 2: Додати модель у `prisma/schema.prisma`**

У модель `User` після `aiCredentials   AiCredential[]` додати:

```prisma
  onboardingFlags UserOnboardingFlag[]
```

У кінець файлу:

```prisma
model UserOnboardingFlag {
  id        String   @id @default(cuid())
  userId    String
  key       String
  value     String?
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, key])
  @@map("user_onboarding_flags")
}
```

- [ ] **Step 3: Згенерувати міграцію**

```bash
pnpm exec prisma migrate dev --name user_onboarding_flags --create-only
```

Перейменувати створену теку на `prisma/migrations/20261025000000_user_onboarding_flags` (щоб іти після `20261024000000_stash_and_player_drafts`) і дописати в кінець `migration.sql`:

```sql
ALTER TABLE "user_onboarding_flags" ENABLE ROW LEVEL SECURITY;
```

Застосувати: `pnpm exec prisma migrate dev` (застосує всі міграції до порожньої БД `onboarding` + згенерує клієнт).

- [ ] **Step 4: Перевірити RLS-тест**

Run: `pnpm test:run prisma/__tests__/migrations-rls.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261025000000_user_onboarding_flags
git commit -m "feat(onboarding): user_onboarding_flags table"
```

---

### Task 2: Реєстр — типи, чеклісти, прогрес

**Files:**
- Create: `lib/onboarding/types.ts`, `lib/onboarding/flag-keys.ts`, `lib/onboarding/checklists.ts`, `lib/onboarding/progress.ts`
- Test: `lib/onboarding/__tests__/checklists.test.ts`, `lib/onboarding/__tests__/progress.test.ts`, `lib/onboarding/__tests__/flag-keys.test.ts`

**Interfaces:**
- Produces (усі імпорти з `@/lib/onboarding/<file>`):

```ts
// types.ts
export type OnboardingRole = "dm" | "player";
export type OnboardingAudience = OnboardingRole | "all";

export interface DmFacts { races: number; units: number; players: number; activePlayerCharacters: number; pendingDrafts: number; battles: number; battlesStarted: number; scenarioPages: number; decks: number; tracks: number; aiKeys: number }
export interface PlayerFacts { ownCharacter: "none" | "pending" | "active"; sheetSeen: boolean; inActiveBattle: boolean }
export type OnboardingFacts = { role: "dm"; dm: DmFacts } | { role: "player"; player: PlayerFacts };

export interface OnboardingStep<F> { id: string; title: string; description: string | ((facts: F) => string); href: (campaignId: string) => string; helpSlug?: string; optional?: boolean; informational?: boolean; isDone: (facts: F) => boolean }

export interface OnboardingHintDef { id: string; audience: OnboardingRole; title: string; body: string; helpSlug?: string }
export interface WhatsNewEntry { id: string; date: string; audience: OnboardingAudience; title: string; body: string; href?: string }

export type HelpBlock = { kind: "p"; text: string } | { kind: "list"; items: string[] } | { kind: "link"; text: string; href: string };
export interface HelpArticle { slug: string; audience: OnboardingAudience; title: string; summary: string; sections: { heading: string; blocks: HelpBlock[] }[] }

export type ChecklistState = "open" | "collapsed" | "hidden";
export type OnboardingFlags = Record<string, string | null>;

// flag-keys.ts
export const HIDE_ALL_HINTS_KEY = "hint:*";
export const WHATS_NEW_KEY = "whats-new";
export const CHECKLIST_HIDDEN = "hidden";
export const hintKey: (id: string) => string;
export const checklistKey: (campaignId: string) => string;
export const FLAG_KEY_RE: RegExp;
export const campaignIdFromChecklistKey: (key: string) => string | null;

// checklists.ts
export const DM_STEPS: OnboardingStep<DmFacts>[];
export const PLAYER_STEPS: OnboardingStep<PlayerFacts>[];
export const PLAYER_SHEET_HINT_ID = "player.character";

// progress.ts
export const CHECKLIST_COLLAPSED_DAYS = 7;
export interface StepStatus { id: string; title: string; description: string; href: string; helpSlug?: string; optional: boolean; informational: boolean; done: boolean }
export function checklistProgress(facts: OnboardingFacts, campaignId: string): { steps: StepStatus[]; requiredDone: number; requiredTotal: number; allRequiredDone: boolean };
export function checklistState(flag: string | null | undefined, allRequiredDone: boolean, now: Date): ChecklistState;
export function unseenWhatsNew(entries: WhatsNewEntry[], audiences: OnboardingRole[], lastSeenId: string | null | undefined): WhatsNewEntry[];
export function visibleWhatsNew(entries: WhatsNewEntry[], audiences: OnboardingRole[]): WhatsNewEntry[];
export function isHintHidden(id: string, flags: OnboardingFlags): boolean;
```

- [ ] **Step 1: Write the failing tests**

`lib/onboarding/__tests__/flag-keys.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { campaignIdFromChecklistKey, checklistKey, FLAG_KEY_RE, hintKey, HIDE_ALL_HINTS_KEY, WHATS_NEW_KEY } from "@/lib/onboarding/flag-keys";

describe("flag keys", () => {
  it("дозволені ключі", () => {
    for (const key of [hintKey("dm.races"), HIDE_ALL_HINTS_KEY, WHATS_NEW_KEY, checklistKey("cmabc123")]) expect(FLAG_KEY_RE.test(key)).toBe(true);
  });

  it("сміття відхиляється", () => {
    for (const key of ["", "foo", "hint:", "hint:DM", "checklist:", "checklist:a b", "whats-new:x", `hint:${"a".repeat(100)}`]) expect(FLAG_KEY_RE.test(key)).toBe(false);
  });

  it("campaignId з ключа чекліста", () => {
    expect(campaignIdFromChecklistKey(checklistKey("cmabc"))).toBe("cmabc");
    expect(campaignIdFromChecklistKey("hint:x")).toBeNull();
  });
});
```

`lib/onboarding/__tests__/checklists.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import type { DmFacts, PlayerFacts } from "@/lib/onboarding/types";

const emptyDm: DmFacts = { races: 0, units: 0, players: 0, activePlayerCharacters: 0, pendingDrafts: 0, battles: 0, battlesStarted: 0, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0 };

const fullDm: DmFacts = { races: 1, units: 1, players: 1, activePlayerCharacters: 1, pendingDrafts: 0, battles: 1, battlesStarted: 1, scenarioPages: 1, decks: 1, tracks: 1, aiKeys: 1 };

const done = <F,>(steps: { id: string; isDone: (f: F) => boolean }[], facts: F) => steps.filter((s) => s.isDone(facts)).map((s) => s.id);

describe("DM_STEPS", () => {
  it("порожня кампанія — нічого не виконано", () => {
    expect(done(DM_STEPS, emptyDm)).toEqual([]);
  });

  it("повна кампанія — усе виконано", () => {
    expect(done(DM_STEPS, fullDm)).toEqual(DM_STEPS.map((s) => s.id));
  });

  it("кожен крок залежить від свого факту", () => {
    expect(done(DM_STEPS, { ...emptyDm, races: 2 })).toEqual(["races"]);
    expect(done(DM_STEPS, { ...emptyDm, battles: 1 })).toEqual(["battle-prepare"]);
    expect(done(DM_STEPS, { ...emptyDm, battlesStarted: 1 })).toEqual(["battle-run"]);
  });

  it("чернетки на схваленні — в описі кроку героя", () => {
    const step = DM_STEPS.find((s) => s.id === "characters")!;

    const text = typeof step.description === "function" ? step.description({ ...emptyDm, pendingDrafts: 2 }) : step.description;

    expect(text).toContain("2");
  });

  it("6 обов'язкових кроків, решта optional", () => {
    expect(DM_STEPS.filter((s) => !s.optional)).toHaveLength(6);
  });
});

describe("PLAYER_STEPS", () => {
  const base: PlayerFacts = { ownCharacter: "none", sheetSeen: false, inActiveBattle: false };

  it("чернетка на схваленні — крок героя ще не виконано, опис про очікування", () => {
    const step = PLAYER_STEPS.find((s) => s.id === "character")!;

    expect(step.isDone({ ...base, ownCharacter: "pending" })).toBe(false);
    expect(typeof step.description === "function" && step.description({ ...base, ownCharacter: "pending" })).toContain("схвален");
    expect(step.isDone({ ...base, ownCharacter: "active" })).toBe(true);
  });

  it("аркуш і бій", () => {
    expect(done(PLAYER_STEPS, { ownCharacter: "active", sheetSeen: true, inActiveBattle: true })).toEqual(["character", "sheet", "battle"]);
  });

  it("показ — інформаційний, не рахується", () => {
    expect(PLAYER_STEPS.find((s) => s.id === "show")).toMatchObject({ informational: true, optional: true });
  });
});
```

`lib/onboarding/__tests__/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { checklistProgress, checklistState, isHintHidden, unseenWhatsNew, visibleWhatsNew } from "@/lib/onboarding/progress";
import type { WhatsNewEntry } from "@/lib/onboarding/types";

const dm = { races: 1, units: 1, players: 0, activePlayerCharacters: 0, pendingDrafts: 0, battles: 0, battlesStarted: 0, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0 };

describe("checklistProgress", () => {
  it("рахує лише обов'язкові й підставляє campaignId у href", () => {
    const p = checklistProgress({ role: "dm", dm }, "c1");

    expect(p.requiredDone).toBe(2);
    expect(p.requiredTotal).toBe(6);
    expect(p.allRequiredDone).toBe(false);
    expect(p.steps[0].href).toContain("/campaigns/c1/");
  });

  it("гравцю — лише кроки гравця", () => {
    const p = checklistProgress({ role: "player", player: { ownCharacter: "active", sheetSeen: true, inActiveBattle: true } }, "c1");

    expect(p.steps.map((s) => s.id)).toEqual(["character", "sheet", "battle", "show"]);
    expect(p.allRequiredDone).toBe(true);
  });
});

describe("checklistState", () => {
  const now = new Date("2026-10-22T12:00:00Z");

  it("не все виконано — open, навіть зі старою датою", () => {
    expect(checklistState(undefined, false, now)).toBe("open");
  });

  it("hidden — завжди hidden", () => {
    expect(checklistState("hidden", false, now)).toBe("hidden");
  });

  it("виконано < 7 днів тому — collapsed, ≥ 7 — hidden", () => {
    expect(checklistState("2026-10-20T12:00:00.000Z", true, now)).toBe("collapsed");
    expect(checklistState("2026-10-15T12:00:00.000Z", true, now)).toBe("hidden");
  });

  it("виконано, але дати ще немає — collapsed", () => {
    expect(checklistState(undefined, true, now)).toBe("collapsed");
  });
});

describe("whats-new", () => {
  const entries: WhatsNewEntry[] = [
    { id: "n3", date: "2026-10-21", audience: "player", title: "", body: "" },
    { id: "n2", date: "2026-10-20", audience: "dm", title: "", body: "" },
    { id: "n1", date: "2026-10-19", audience: "all", title: "", body: "" },
  ];

  it("лише новіші за побачений і за аудиторією", () => {
    expect(unseenWhatsNew(entries, ["dm"], "n1").map((e) => e.id)).toEqual(["n2"]);
    expect(unseenWhatsNew(entries, ["dm", "player"], "n1").map((e) => e.id)).toEqual(["n3", "n2"]);
  });

  it("невідомий або порожній id — нічого непобаченого", () => {
    expect(unseenWhatsNew(entries, ["dm"], "deleted")).toEqual([]);
    expect(unseenWhatsNew(entries, ["dm"], null)).toEqual([]);
  });

  it("без ролей — бачить лише all", () => {
    expect(visibleWhatsNew(entries, []).map((e) => e.id)).toEqual(["n1"]);
  });
});

describe("isHintHidden", () => {
  it("закрита окремо або всі", () => {
    expect(isHintHidden("dm.races", { "hint:dm.races": null })).toBe(true);
    expect(isHintHidden("dm.races", { "hint:*": null })).toBe(true);
    expect(isHintHidden("dm.races", {})).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/onboarding`
Expected: FAIL — модулі не існують.

- [ ] **Step 3: Implement `types.ts`** — рівно типи з блоку Interfaces вище.

- [ ] **Step 4: Implement `flag-keys.ts`**

```ts
export const HIDE_ALL_HINTS_KEY = "hint:*";

export const WHATS_NEW_KEY = "whats-new";

export const CHECKLIST_HIDDEN = "hidden";

const CHECKLIST_PREFIX = "checklist:";

export const hintKey = (id: string) => `hint:${id}`;

export const checklistKey = (campaignId: string) => `${CHECKLIST_PREFIX}${campaignId}`;

export const FLAG_KEY_RE = /^(?:hint:(?:\*|[a-z0-9][a-z0-9.-]{0,63})|checklist:[a-z0-9]{1,40}|whats-new)$/;

export const campaignIdFromChecklistKey = (key: string): string | null => (key.startsWith(CHECKLIST_PREFIX) ? key.slice(CHECKLIST_PREFIX.length) : null);
```

- [ ] **Step 5: Implement `checklists.ts`**

```ts
import type { DmFacts, OnboardingStep, PlayerFacts } from "@/lib/onboarding/types";

export const PLAYER_SHEET_HINT_ID = "player.character";

const dm = (campaignId: string, path: string) => `/campaigns/${campaignId}/dm/${path}`;

export const DM_STEPS: OnboardingStep<DmFacts>[] = [
  { id: "races", title: "Створи расу", description: "Раса задає героям базові характеристики, доступні скіли й дерево прокачки.", href: (c) => dm(c, "races"), helpSlug: "dm-world", isDone: (f) => f.races > 0 },
  { id: "units", title: "Додай юнітів-супротивників", description: "Юніти — моби й загони для боїв. Їх можна створити вручну або імпортувати з JSON.", href: (c) => dm(c, "units"), helpSlug: "dm-units-balance", isDone: (f) => f.units > 0 },
  { id: "players", title: "Запроси гравців", description: "Надішли гравцям інвайт-код із блоку «Налаштування кампанії» нижче.", href: (c) => `/campaigns/${c}#invite`, helpSlug: "dm-quickstart", isDone: (f) => f.players > 0 },
  {
    id: "characters",
    title: "Схвали або створи героя",
    description: (f) => (f.pendingDrafts > 0 ? `Гравці надіслали чернеток на схвалення: ${f.pendingDrafts}.` : "Гравці створюють чернетки героїв, ти їх схвалюєш — або створюєш героя сам."),
    href: (c) => dm(c, "characters"),
    helpSlug: "dm-quickstart",
    isDone: (f) => f.activePlayerCharacters > 0,
  },
  { id: "battle-prepare", title: "Підготуй бій", description: "Збери сцену бою: сторони, юніти, мапа. Баланс підкаже, чи бій чесний.", href: (c) => dm(c, "battles"), helpSlug: "dm-battle", isDone: (f) => f.battles > 0 },
  { id: "battle-run", title: "Проведи перший бій", description: "Запусти бій — гравці побачать кнопку «Приєднатися» в хедері.", href: (c) => dm(c, "battles"), helpSlug: "dm-battle", isDone: (f) => f.battlesStarted > 0 },
  { id: "scenario", title: "Напиши сценарій", description: "Сцени, нотатки майстра й біографії героїв в одному рукописі.", href: (c) => dm(c, "scenario"), helpSlug: "dm-scenario-show", optional: true, isDone: (f) => f.scenarioPages > 0 },
  { id: "show", title: "Підготуй показ сцен", description: "Слайди з музикою, які гравці бачать на своїх екранах.", href: (c) => dm(c, "show"), helpSlug: "dm-scenario-show", optional: true, isDone: (f) => f.decks > 0 },
  { id: "music", title: "Додай музику бою", description: "Бібліотека треків для плеєра в бою.", href: (c) => dm(c, "music"), helpSlug: "dm-battle", optional: true, isDone: (f) => f.tracks > 0 },
  { id: "ai", title: "Підключи AI-асистента", description: "Власний ключ Claude, OpenAI або Gemini — співавтор сценарію й помічник під час гри.", href: () => "/settings/ai", helpSlug: "dm-ai", optional: true, isDone: (f) => f.aiKeys > 0 },
];

export const PLAYER_STEPS: OnboardingStep<PlayerFacts>[] = [
  {
    id: "character",
    title: "Створи героя",
    description: (f) => (f.ownCharacter === "pending" ? "Чернетка чекає схвалення ДМ — щойно він її прийме, герой з'явиться тут." : "Створи чернетку героя: раса, ім'я, портрет. ДМ її схвалить."),
    href: (c) => `/campaigns/${c}/character`,
    helpSlug: "player-quickstart",
    isDone: (f) => f.ownCharacter === "active",
  },
  { id: "sheet", title: "Ознайомся з аркушем героя", description: "Характеристики, скіли, заклинання, артефакти й прокачка.", href: (c) => `/campaigns/${c}/character`, helpSlug: "player-quickstart", isDone: (f) => f.sheetSeen },
  { id: "battle", title: "Приєднайся до бою", description: "ДМ запустить бій — кнопка «Приєднатися» з'явиться в хедері.", href: (c) => `/campaigns/${c}`, helpSlug: "player-battle", isDone: (f) => f.inActiveBattle },
  { id: "show", title: "Показ сцен", description: "Коли ДМ показує сцену, вона відкриється в розділі «Показ».", href: (c) => `/campaigns/${c}/show`, optional: true, informational: true, isDone: () => false },
];
```

На сторінці кампанії (Task 6) обгортці блоку інвайт-коду додається `id="invite"`.

- [ ] **Step 6: Implement `progress.ts`**

```ts
import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import { CHECKLIST_HIDDEN, HIDE_ALL_HINTS_KEY, hintKey } from "@/lib/onboarding/flag-keys";
import type { ChecklistState, OnboardingFacts, OnboardingFlags, OnboardingRole, OnboardingStep, WhatsNewEntry } from "@/lib/onboarding/types";

export const CHECKLIST_COLLAPSED_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StepStatus { id: string; title: string; description: string; href: string; helpSlug?: string; optional: boolean; informational: boolean; done: boolean }

function statuses<F>(steps: OnboardingStep<F>[], facts: F, campaignId: string): StepStatus[] {
  return steps.map((s) => ({
    id: s.id,
    title: s.title,
    description: typeof s.description === "function" ? s.description(facts) : s.description,
    href: s.href(campaignId),
    helpSlug: s.helpSlug,
    optional: !!s.optional,
    informational: !!s.informational,
    done: s.isDone(facts),
  }));
}

export function checklistProgress(facts: OnboardingFacts, campaignId: string) {
  const steps = facts.role === "dm" ? statuses(DM_STEPS, facts.dm, campaignId) : statuses(PLAYER_STEPS, facts.player, campaignId);

  const required = steps.filter((s) => !s.optional);

  const requiredDone = required.filter((s) => s.done).length;

  return { steps, requiredDone, requiredTotal: required.length, allRequiredDone: requiredDone === required.length };
}

export function checklistState(flag: string | null | undefined, allRequiredDone: boolean, now: Date): ChecklistState {
  if (flag === CHECKLIST_HIDDEN) return "hidden";

  if (!allRequiredDone) return "open";

  const completedAt = flag ? Date.parse(flag) : NaN;

  if (Number.isNaN(completedAt)) return "collapsed";

  return now.getTime() - completedAt >= CHECKLIST_COLLAPSED_DAYS * DAY_MS ? "hidden" : "collapsed";
}

export function visibleWhatsNew(entries: WhatsNewEntry[], audiences: OnboardingRole[]): WhatsNewEntry[] {
  return entries.filter((e) => e.audience === "all" || audiences.includes(e.audience));
}

export function unseenWhatsNew(entries: WhatsNewEntry[], audiences: OnboardingRole[], lastSeenId: string | null | undefined): WhatsNewEntry[] {
  const seenIndex = entries.findIndex((e) => e.id === lastSeenId);

  // невідомий id (запис прибрали) — вважаємо все побаченим, а не показуємо всю історію
  if (seenIndex < 0) return [];

  return visibleWhatsNew(entries.slice(0, seenIndex), audiences);
}

export function isHintHidden(id: string, flags: OnboardingFlags): boolean {
  return HIDE_ALL_HINTS_KEY in flags || hintKey(id) in flags;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/onboarding`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/onboarding
git commit -m "feat(onboarding): registry types, checklists and progress"
```

---

### Task 3: Контент — підказки, «Що нового», довідка

**Files:**
- Create: `lib/onboarding/hints.ts`, `lib/onboarding/whats-new.ts`, `lib/onboarding/help/index.ts`, `lib/onboarding/help/dm.ts`, `lib/onboarding/help/player.ts`
- Test: `lib/onboarding/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: типи з `lib/onboarding/types.ts`; `DM_STEPS`, `PLAYER_STEPS`, `PLAYER_SHEET_HINT_ID` з Task 2.
- Produces:

```ts
// hints.ts
export const HINTS: Record<string, OnboardingHintDef>; // ключ = id
// whats-new.ts
export const WHATS_NEW: WhatsNewEntry[]; // новіші першими
// help/index.ts
export const HELP_ARTICLES: HelpArticle[];
export function getHelpArticle(slug: string): HelpArticle | undefined;
```

- [ ] **Step 1: Write the failing test** `lib/onboarding/__tests__/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DM_STEPS, PLAYER_SHEET_HINT_ID, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import { FLAG_KEY_RE, hintKey } from "@/lib/onboarding/flag-keys";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";
import { HINTS } from "@/lib/onboarding/hints";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe("onboarding registry", () => {
  it("id унікальні", () => {
    expect(unique(DM_STEPS.map((s) => s.id))).toBe(true);
    expect(unique(PLAYER_STEPS.map((s) => s.id))).toBe(true);
    expect(unique(WHATS_NEW.map((e) => e.id))).toBe(true);
    expect(unique(HELP_ARTICLES.map((a) => a.slug))).toBe(true);
  });

  it("ключ HINTS збігається з id і дає валідний ключ прапорця", () => {
    for (const [key, hint] of Object.entries(HINTS)) {
      expect(hint.id).toBe(key);
      expect(FLAG_KEY_RE.test(hintKey(key))).toBe(true);
    }
  });

  it("кожен helpSlug існує", () => {
    const slugs = [...DM_STEPS, ...PLAYER_STEPS, ...Object.values(HINTS)].map((x) => x.helpSlug).filter(Boolean) as string[];

    for (const slug of slugs) expect(getHelpArticle(slug), slug).toBeDefined();
  });

  it("підказка аркуша гравця існує — від неї залежить крок чекліста", () => {
    expect(HINTS[PLAYER_SHEET_HINT_ID]?.audience).toBe("player");
  });

  it("«Що нового» відсортовано від новіших", () => {
    const dates = WHATS_NEW.map((e) => e.date);

    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("статті не порожні", () => {
    for (const a of HELP_ARTICLES) {
      expect(a.sections.length, a.slug).toBeGreaterThan(0);
      for (const s of a.sections) expect(s.blocks.length, `${a.slug}/${s.heading}`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test:run lib/onboarding/__tests__/registry.test.ts` → FAIL (модулі не існують).

- [ ] **Step 3: Implement `hints.ts`**

Перед написанням текстів прочитати відповідні розділи `docs/architecture/{battle,balance,abilities,characters,show,ai}.md` і перевірити, що кожне твердження відповідає реальному UI. Стартові тексти:

```ts
import type { OnboardingHintDef } from "@/lib/onboarding/types";

const list: OnboardingHintDef[] = [
  { id: "dm.races", audience: "dm", title: "Раси — основа героїв", body: "Раса задає базові характеристики, пасивну здібність і набір доступних скілів. Без раси гравець не створить героя.", helpSlug: "dm-world" },
  { id: "dm.skill-trees", audience: "dm", title: "Дерева прокачки", body: "Дерево прив'язане до раси й визначає, які скіли герой відкриває з рівнями. Спершу створи скіли в бібліотеці, потім розклади їх по колах дерева.", helpSlug: "dm-world" },
  { id: "dm.skills", audience: "dm", title: "Бібліотека скілів", body: "Скіл — набір ефектів (бонуси, тригери, реакції), які рушій бою застосовує автоматично. Один скіл можна використати в кількох деревах.", helpSlug: "dm-world" },
  { id: "dm.units", audience: "dm", title: "Юніти", body: "Моби й загони для боїв. Рівень і тір юніта впливають на баланс бою; цілі набори зручно імпортувати з JSON.", helpSlug: "dm-units-balance" },
  { id: "dm.spells", audience: "dm", title: "Заклинання", body: "База заклинань кампанії. Герої отримують заклинання через скіли й рівні; у бою їх кастують з аркуша або з мапи.", helpSlug: "dm-world" },
  { id: "dm.artifacts", audience: "dm", title: "Артефакти", body: "Предмети з бонусами; кілька артефактів одного сету дають додатковий ефект. Унікальні артефакти можна передавати між героями.", helpSlug: "dm-world" },
  { id: "dm.battles", audience: "dm", title: "Сцени боїв", body: "Підготуй бій заздалегідь: сторони, учасники, мапа, музика. Підготовлений бій запускається одним кліком під час сесії.", helpSlug: "dm-battle" },
  { id: "dm.battle-setup", audience: "dm", title: "Баланс і резерв", body: "Баланс підганяє силу юнітів під загін гравців — окремого рівня складності немає. Учасників можна тримати в резерві й вводити в бій пізніше.", helpSlug: "dm-units-balance" },
  { id: "dm.battle-scene", audience: "dm", title: "Ведення бою", body: "Ти бачиш усю мапу й ходи всіх сторін. Ходи юнітів робиш сам, гравці ходять зі своїх телефонів; хід передається лише кнопкою завершення ходу.", helpSlug: "dm-battle" },
  { id: "dm.scenario", audience: "dm", title: "Сценарій", body: "Рукопис кампанії: сцени, нотатки майстра, біографії. Рядок сценарію можна прив'язати до слайда показу або бою й запустити просто з тексту.", helpSlug: "dm-scenario-show" },
  { id: "dm.show", audience: "dm", title: "Показ сцен", body: "Набори слайдів із музикою. Коли ти показуєш слайд, він синхронно відкривається на екранах гравців.", helpSlug: "dm-scenario-show" },
  { id: "player.character", audience: "player", title: "Твій аркуш героя", body: "Тут характеристики, скіли, заклинання й артефакти. Нові рівні й прокачка з'являються тут після боїв.", helpSlug: "player-quickstart" },
  { id: "player.draft", audience: "player", title: "Чернетка героя", body: "Вибери расу, ім'я й портрет — можна згенерувати. Чернетка йде ДМ на схвалення; він може повернути її з коментарем.", helpSlug: "player-quickstart" },
  { id: "player.battle", audience: "player", title: "Бій з телефона", body: "Коли твій хід — обери дію: рух, атака, заклинання. Кидки й шкоду рахує сервер; хід завершується кнопкою внизу.", helpSlug: "player-battle" },
];

export const HINTS: Record<string, OnboardingHintDef> = Object.fromEntries(list.map((h) => [h.id, h]));
```

- [ ] **Step 4: Implement `whats-new.ts`**

Перевірити по `git log --oneline main` і `docs/STATUS.md` дати й факти (злиття: AI-асистент `8f41c95f`, рукопис `799b3383`, стрільба `caa1a3d7`, підсумок і чернетки `1af0bb56`).

```ts
import type { WhatsNewEntry } from "@/lib/onboarding/types";

export const WHATS_NEW: WhatsNewEntry[] = [
  { id: "2026-10-22-onboarding", date: "2026-10-22", audience: "all", title: "Перші кроки й довідка", body: "На сторінці кампанії — чекліст перших кроків, на екранах — підказки, у меню — довідка.", href: "/help" },
  { id: "2026-10-22-player-drafts", date: "2026-10-22", audience: "all", title: "Чернетки героїв від гравців", body: "Гравець сам створює чернетку героя з генерацією портрета, ДМ схвалює або повертає її. Новий розділ «Підсумок» показує скарбничку героя." },
  { id: "2026-10-21-ranged", date: "2026-10-21", audience: "all", title: "Стрільба", body: "Перешкоди на лінії пострілу дають укриття автоматично; з'явилися ланцюговий постріл і розщеплення в ближньому бою." },
  { id: "2026-10-21-manuscript", date: "2026-10-21", audience: "dm", title: "Рукопис сценарію", body: "Сценарій переробили на рукопис: прив'язки до слайдів і боїв над текстом, екран-завіса для гравців." },
  { id: "2026-10-20-ai", date: "2026-10-20", audience: "dm", title: "AI-асистент", body: "Підключи свій ключ Claude, OpenAI або Gemini — асистент пропонує правки сценарію й допомагає під час гри.", href: "/settings/ai" },
];
```

- [ ] **Step 5: Implement довідку**

`lib/onboarding/help/index.ts`:

```ts
import { DM_ARTICLES } from "./dm";
import { PLAYER_ARTICLES } from "./player";

import type { HelpArticle } from "@/lib/onboarding/types";

export const HELP_ARTICLES: HelpArticle[] = [...DM_ARTICLES, ...PLAYER_ARTICLES];

export const getHelpArticle = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);
```

`lib/onboarding/help/dm.ts` експортує `DM_ARTICLES: HelpArticle[]` (audience `"dm"`), `lib/onboarding/help/player.ts` — `PLAYER_ARTICLES` (audience `"player"`). Статті й обов'язкові розділи (тексти — 2–5 коротких абзаців/списків на розділ, українською, звіряючи з `docs/architecture/*.md` і реальним UI; посилання `link` — тільки на наявні маршрути):

| slug | title | розділи |
|---|---|---|
| `dm-quickstart` | Швидкий старт ДМ | «Що це за застосунок» · «Шлях до першого бою» (список 6 кроків чекліста) · «Як запросити гравців» (інвайт-код, гравець вводить його на сторінці кампаній) · «Чернетки героїв» (схвалення/повернення) |
| `dm-world` | Світ кампанії: раси, скіли, дерева | «Раси» · «Скіли й ефекти» · «Дерева прокачки» · «Заклинання й артефакти» · «Імпорт» |
| `dm-units-balance` | Юніти й баланс бою | «Юніти й тіри» · «Як працює баланс» (`computeFairScaling`, без складності) · «Резерв» |
| `dm-battle` | Проведення бою | «Підготовка сцени» · «Мапа й режими» · «Хід, мораль, завершення» · «Музика бою» |
| `dm-scenario-show` | Сценарій і показ | «Рукопис» · «Прив'язки до слайдів і боїв» · «Показ і завіса» |
| `dm-ai` | AI-асистент | «Власний ключ» (ключ лишається на сервері) · «Пропозиції правок» · «Живий режим» · «MCP і API-токени» |
| `player-quickstart` | Швидкий старт гравця | «Як приєднатися» (інвайт-код від ДМ) · «Чернетка героя» · «Аркуш героя» · «Показ сцен» |
| `player-battle` | Бій з телефона | «Твій хід» · «Атака й заклинання» · «Мораль і стани» · «Коли герой падає» |

- [ ] **Step 6: Run tests** — `pnpm test:run lib/onboarding` → PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/onboarding
git commit -m "feat(onboarding): hints, what's new and help articles"
```

---

### Task 4: Сервер — факти, прапорці, роути

**Files:**
- Create: `types/onboarding.ts`, `lib/server/onboarding/facts.ts`, `lib/server/onboarding/flags.ts`, `app/api/onboarding/route.ts`, `app/api/onboarding/flags/route.ts`, `app/api/onboarding/reset/route.ts`, `app/api/campaigns/[id]/onboarding/route.ts`, `app/api/campaigns/[id]/onboarding/read-onboarding.ts`, `lib/schemas/onboarding.ts`
- Modify: `lib/schemas/index.ts` (реекспорт, якщо barrel існує)
- Test: `app/api/__tests__/onboarding-api.test.ts`

**Interfaces:**
- Consumes: Task 1 (`prisma.userOnboardingFlag`), Task 2 (`checklistProgress`, `checklistState`, `FLAG_KEY_RE`, `checklistKey`, `campaignIdFromChecklistKey`, `WHATS_NEW_KEY`, `PLAYER_SHEET_HINT_ID`, `hintKey`), Task 3 (`WHATS_NEW`).
- Produces:

```ts
// types/onboarding.ts
import type { StepStatus } from "@/lib/onboarding/progress";
import type { ChecklistState, OnboardingFlags, OnboardingRole } from "@/lib/onboarding/types";
export interface OnboardingFlagsResponse { flags: OnboardingFlags; audiences: OnboardingRole[] }
export interface CampaignOnboardingResponse { role: OnboardingRole; state: ChecklistState; steps: StepStatus[]; requiredDone: number; requiredTotal: number }
export type SetFlagBody = { key: string; value?: string | null };
export type ResetScope = "hints" | "checklists";

// lib/server/onboarding/facts.ts
export async function readOnboardingFacts(campaignId: string, userId: string, isDM: boolean, flagKeys: Set<string>): Promise<OnboardingFacts>;
export async function readFlagMap(userId: string): Promise<OnboardingFlags>;
// lib/server/onboarding/flags.ts
export async function readOnboardingFlags(userId: string): Promise<OnboardingFlagsResponse>;
export async function setOnboardingFlag(userId: string, key: string, value: string | null): Promise<void>;
export async function resetOnboardingFlags(userId: string, scope: ResetScope): Promise<void>;
// read-onboarding.ts
export async function readCampaignOnboarding(args: { id: string; known?: { userId: string; isDM: boolean } }): Promise<NextResponse>;
```

HTTP:
- `GET /api/onboarding` → `OnboardingFlagsResponse`
- `PUT /api/onboarding/flags` body `SetFlagBody` → `{ ok: true }`; `checklist:<id>` дозволено лише члену кампанії `<id>` (інакше 403)
- `POST /api/onboarding/reset` body `{ scope }` → `{ ok: true }`
- `GET /api/campaigns/[id]/onboarding` → `CampaignOnboardingResponse`
- Усі відповіді з `PRIVATE_NO_STORE_HEADERS`.

- [ ] **Step 1: Write the failing test** `app/api/__tests__/onboarding-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userOnboardingFlag: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    campaignMember: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

const access = (role: "dm" | "player") => ({ userId: "u1", isDM: role === "dm", campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, members: [{ userId: "u1", role }] } }) as never;

const dmRow = { races: 1, units: 1, players: 1, activePlayerCharacters: 1, pendingDrafts: 0, battles: 1, battlesStarted: 1, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0 };

const json = (body: unknown, method = "PUT") => new Request("http://x", { method, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiAuth.requireAuth).mockResolvedValue({ userId: "u1" });
  vi.mocked(prisma.userOnboardingFlag.findMany).mockResolvedValue([]);
  vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ role: "dm" }] as never);
});

describe("GET /api/onboarding", () => {
  it("перший візит — whats-new ставиться на найновіший запис, бейджа немає", async () => {
    const { GET } = await import("@/app/api/onboarding/route");

    const body = await (await GET()).json();

    expect(body.flags["whats-new"]).toBe(WHATS_NEW[0].id);
    expect(body.audiences).toEqual(["dm"]);
    expect(prisma.userOnboardingFlag.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_key: { userId: "u1", key: "whats-new" } } }));
  });

  it("без сесії — 401", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 401 }));
    const { GET } = await import("@/app/api/onboarding/route");

    expect((await GET()).status).toBe(401);
  });
});

describe("PUT /api/onboarding/flags", () => {
  it("валідний ключ — upsert", async () => {
    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "hint:dm.races" }))).status).toBe(200);
    expect(prisma.userOnboardingFlag.upsert).toHaveBeenCalled();
  });

  it("сміттєвий ключ — 400", async () => {
    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "anything" }))).status).toBe(400);
    expect((await PUT(json({ key: "hint:x", value: "v".repeat(101) }))).status).toBe(400);
  });

  it("чекліст чужої кампанії — 403", async () => {
    vi.mocked(prisma.campaignMember.findUnique).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "checklist:other", value: "hidden" }))).status).toBe(403);
    expect(prisma.userOnboardingFlag.upsert).not.toHaveBeenCalled();
  });
});

describe("POST /api/onboarding/reset", () => {
  it("hints — видаляє hint:*", async () => {
    const { POST } = await import("@/app/api/onboarding/reset/route");

    expect((await POST(json({ scope: "hints" }, "POST"))).status).toBe(200);
    expect(prisma.userOnboardingFlag.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", key: { startsWith: "hint:" } } });
  });
});

describe("GET /api/campaigns/[id]/onboarding", () => {
  const get = async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/onboarding/route");

    return GET(new Request("http://x"), { params: Promise.resolve({ id: "camp" }) });
  };

  it("ДМ із виконаними кроками — collapsed і completedAt записано", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm"));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([dmRow]);
    vi.mocked(prisma.userOnboardingFlag.findMany).mockResolvedValue([]);

    const body = await (await get()).json();

    expect(body.role).toBe("dm");
    expect(body.state).toBe("collapsed");
    expect(prisma.userOnboardingFlag.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ key: "checklist:camp" }) }));
  });

  it("гравець отримує лише кроки гравця", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("player"));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ activeCharacter: 0, pendingCharacter: 1, inActiveBattle: 0 }]);

    const body = await (await get()).json();

    expect(body.role).toBe("player");
    expect(body.steps.map((s: { id: string }) => s.id)).toEqual(["character", "sheet", "battle", "show"]);
    expect(body.state).toBe("open");
  });

  it("не член кампанії — статус від requireCampaignAccess", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await get()).status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test:run app/api/__tests__/onboarding-api.test.ts` → FAIL.

- [ ] **Step 3: Implement `types/onboarding.ts`** — як у Interfaces.

- [ ] **Step 4: Implement `lib/schemas/onboarding.ts`**

```ts
import { z } from "zod";

import { FLAG_KEY_RE } from "@/lib/onboarding/flag-keys";

export const setOnboardingFlagSchema = z.object({ key: z.string().max(100).regex(FLAG_KEY_RE), value: z.string().max(100).nullish() });

export const resetOnboardingSchema = z.object({ scope: z.enum(["hints", "checklists"]) });
```

Якщо `lib/schemas/index.ts` — barrel, додати `export * from "./onboarding";` і імпортувати з `@/lib/schemas`.

- [ ] **Step 5: Implement `lib/server/onboarding/facts.ts`**

```ts
import "server-only";
import { Prisma } from "@prisma/client";

import { BattleStatus } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { PLAYER_SHEET_HINT_ID } from "@/lib/onboarding/checklists";
import { hintKey, HIDE_ALL_HINTS_KEY } from "@/lib/onboarding/flag-keys";
import type { DmFacts, OnboardingFacts } from "@/lib/onboarding/types";

// один запит замість 11 count: на Vercel connection_limit = 1, тож окремі count ішли б послідовно
async function readDmFacts(campaignId: string, userId: string): Promise<DmFacts> {
  const [row] = await prisma.$queryRaw<DmFacts[]>(Prisma.sql`
    SELECT
      (SELECT count(*)::int FROM races WHERE "campaignId" = ${campaignId}) AS races,
      (SELECT count(*)::int FROM units WHERE "campaignId" = ${campaignId}) AS units,
      (SELECT count(*)::int FROM campaign_members WHERE "campaignId" = ${campaignId} AND role = ${CampaignRole.PLAYER}) AS players,
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND type = ${CharacterType.PLAYER} AND status = ${CharacterStatus.ACTIVE}) AS "activePlayerCharacters",
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND status = ${CharacterStatus.PENDING}) AS "pendingDrafts",
      (SELECT count(*)::int FROM battle_scenes WHERE "campaignId" = ${campaignId}) AS battles,
      (SELECT count(*)::int FROM battle_scenes WHERE "campaignId" = ${campaignId} AND status IN (${BattleStatus.ACTIVE}, ${BattleStatus.COMPLETED})) AS "battlesStarted",
      (SELECT count(*)::int FROM scenario_pages WHERE "campaignId" = ${campaignId}) AS "scenarioPages",
      (SELECT count(*)::int FROM slide_decks WHERE "campaignId" = ${campaignId}) AS decks,
      (SELECT count(*)::int FROM campaign_tracks WHERE "campaignId" = ${campaignId}) AS tracks,
      (SELECT count(*)::int FROM ai_credentials WHERE "userId" = ${userId}) AS "aiKeys"
  `);

  return row;
}

type PlayerRow = { activeCharacter: number; pendingCharacter: number; inActiveBattle: number };

async function readPlayerRow(campaignId: string, userId: string): Promise<PlayerRow> {
  const [row] = await prisma.$queryRaw<PlayerRow[]>(Prisma.sql`
    SELECT
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND "controlledBy" = ${userId} AND type = ${CharacterType.PLAYER} AND status = ${CharacterStatus.ACTIVE}) AS "activeCharacter",
      (SELECT count(*)::int FROM characters WHERE "campaignId" = ${campaignId} AND "controlledBy" = ${userId} AND status = ${CharacterStatus.PENDING}) AS "pendingCharacter",
      (SELECT count(*)::int FROM battle_participants p JOIN battle_scenes b ON b.id = p."battleId"
        WHERE b."campaignId" = ${campaignId} AND b.status = ${BattleStatus.ACTIVE} AND p."controlledBy" = ${userId}) AS "inActiveBattle"
  `);

  return row;
}

export async function readOnboardingFacts(campaignId: string, userId: string, isDM: boolean, flagKeys: Set<string>): Promise<OnboardingFacts> {
  if (isDM) return { role: "dm", dm: await readDmFacts(campaignId, userId) };

  const row = await readPlayerRow(campaignId, userId);

  return {
    role: "player",
    player: {
      ownCharacter: row.activeCharacter > 0 ? "active" : row.pendingCharacter > 0 ? "pending" : "none",
      sheetSeen: flagKeys.has(hintKey(PLAYER_SHEET_HINT_ID)) || flagKeys.has(HIDE_ALL_HINTS_KEY),
      inActiveBattle: row.inActiveBattle > 0,
    },
  };
}
```

`flagKeys` — множина ключів прапорців користувача (з `readFlagMap`), потрібна для `sheetSeen`. Перед реалізацією перевірити в `prisma/schema.prisma` назви колонок (`"controlledBy"` у `battle_participants`, `status` у `characters`) — вони мають збігатися.

- [ ] **Step 6: Implement `lib/server/onboarding/flags.ts`**

```ts
import "server-only";

import { prisma } from "@/lib/db";
import { WHATS_NEW_KEY } from "@/lib/onboarding/flag-keys";
import type { OnboardingFlags, OnboardingRole } from "@/lib/onboarding/types";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";
import type { OnboardingFlagsResponse, ResetScope } from "@/types/onboarding";

export async function readFlagMap(userId: string): Promise<OnboardingFlags> {
  const rows = await prisma.userOnboardingFlag.findMany({ where: { userId }, select: { key: true, value: true } });

  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setOnboardingFlag(userId: string, key: string, value: string | null): Promise<void> {
  await prisma.userOnboardingFlag.upsert({ where: { userId_key: { userId, key } }, create: { userId, key, value }, update: { value } });
}

export async function readOnboardingFlags(userId: string): Promise<OnboardingFlagsResponse> {
  const [flags, roles] = await Promise.all([
    readFlagMap(userId),
    prisma.campaignMember.findMany({ where: { userId }, select: { role: true }, distinct: ["role"] }),
  ]);

  // перший візит: старі новини не мають горіти бейджем
  if (!(WHATS_NEW_KEY in flags) && WHATS_NEW[0]) {
    await setOnboardingFlag(userId, WHATS_NEW_KEY, WHATS_NEW[0].id);
    flags[WHATS_NEW_KEY] = WHATS_NEW[0].id;
  }

  return { flags, audiences: roles.map((r) => r.role as OnboardingRole) };
}

export async function resetOnboardingFlags(userId: string, scope: ResetScope): Promise<void> {
  await prisma.userOnboardingFlag.deleteMany({ where: { userId, key: { startsWith: scope === "hints" ? "hint:" : "checklist:" } } });
}
```

- [ ] **Step 7: Implement роути прапорців**

`app/api/onboarding/route.ts`:

```ts
import { NextResponse } from "next/server";

import { readOnboardingFlags } from "@/lib/server/onboarding/flags";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET() {
  try {
    const auth = await requireAuth();

    if (auth instanceof NextResponse) return auth;

    return NextResponse.json(await readOnboardingFlags(auth.userId), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "read onboarding flags" });
  }
}
```

`app/api/onboarding/flags/route.ts`:

```ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { campaignIdFromChecklistKey } from "@/lib/onboarding/flag-keys";
import { setOnboardingFlagSchema } from "@/lib/schemas/onboarding";
import { setOnboardingFlag } from "@/lib/server/onboarding/flags";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth();

    if (auth instanceof NextResponse) return auth;

    const body = await parseBody(setOnboardingFlagSchema, request);

    if (body instanceof NextResponse) return body;

    const campaignId = campaignIdFromChecklistKey(body.key);

    if (campaignId) {
      const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId: auth.userId } }, select: { id: true } });

      if (!member) return errorResponse(API_ERRORS.FORBIDDEN, 403);
    }

    await setOnboardingFlag(auth.userId, body.key, body.value ?? null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "set onboarding flag" });
  }
}
```

`app/api/onboarding/reset/route.ts` — той самий каркас: `requireAuth` → `parseBody(resetOnboardingSchema, request)` → `resetOnboardingFlags(auth.userId, body.scope)` → `NextResponse.json({ ok: true })`, `handleApiError(error, { action: "reset onboarding" })`, експорт `POST`.

Перевірити, що унікальний індекс `CampaignMember` у Prisma-клієнті називається `campaignId_userId` (`@@unique([campaignId, userId])`).

- [ ] **Step 8: Implement чекліст кампанії**

`app/api/campaigns/[id]/onboarding/read-onboarding.ts`:

```ts
import { NextResponse } from "next/server";

import { checklistKey } from "@/lib/onboarding/flag-keys";
import { checklistProgress, checklistState } from "@/lib/onboarding/progress";
import { readOnboardingFacts } from "@/lib/server/onboarding/facts";
import { readFlagMap } from "@/lib/server/onboarding/flags";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { prisma } from "@/lib/db";
import type { CampaignOnboardingResponse } from "@/types/onboarding";

export async function readCampaignOnboarding({ id, known }: { id: string; known?: { userId: string; isDM: boolean } }): Promise<NextResponse> {
  let who = known;

  if (!who) {
    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    who = { userId: access.userId, isDM: access.isDM };
  }

  const flags = await readFlagMap(who.userId);

  const facts = await readOnboardingFacts(id, who.userId, who.isDM, new Set(Object.keys(flags)));

  const progress = checklistProgress(facts, id);

  const key = checklistKey(id);

  let flag = flags[key];

  if (progress.allRequiredDone && flag === undefined) {
    flag = new Date().toISOString();
    // create, а не upsert: паралельний запит уже міг поставити дату — тоді лишаємо його
    await prisma.userOnboardingFlag.create({ data: { userId: who.userId, key, value: flag } }).catch(() => undefined);
  }

  const body: CampaignOnboardingResponse = {
    role: facts.role,
    state: checklistState(flag, progress.allRequiredDone, new Date()),
    steps: progress.steps,
    requiredDone: progress.requiredDone,
    requiredTotal: progress.requiredTotal,
  };

  return NextResponse.json(body, { headers: PRIVATE_NO_STORE_HEADERS });
}
```

`app/api/campaigns/[id]/onboarding/route.ts`:

```ts
import { readCampaignOnboarding } from "./read-onboarding";

import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    return await readCampaignOnboarding({ id });
  } catch (error) {
    return handleApiError(error, { action: "read campaign onboarding" });
  }
}
```

(Якщо в `types/api.ts` є тип контексту `{ params: Promise<{ id: string }> }` для кампанійних роутів — використати його.)

- [ ] **Step 9: Run tests** — `pnpm test:run app/api/__tests__/onboarding-api.test.ts lib/onboarding` → PASS. Далі `pnpm exec tsc --noEmit -p .` → без помилок.

- [ ] **Step 10: Перевірити SQL на реальній БД**

```bash
pnpm exec tsx -e 'import("@/lib/server/onboarding/facts").then(async (m) => console.log(await m.readOnboardingFacts("nonexistent", "nobody", true, new Set())))'
```

Якщо `tsx` не резолвить `@/` чи `server-only` — натомість виконати в `psql` тіло SQL з `readDmFacts` із підставленими рядками. Expected: рядок з нулями, без помилок «column does not exist».

- [ ] **Step 11: Commit**

```bash
git add types/onboarding.ts lib/schemas lib/server/onboarding app/api/onboarding "app/api/campaigns/[id]/onboarding" app/api/__tests__/onboarding-api.test.ts
git commit -m "feat(onboarding): facts, flags and onboarding routes"
```

---

### Task 5: Клієнтський API і хуки

**Files:**
- Create: `lib/api/onboarding.ts`, `lib/hooks/onboarding/keys.ts`, `lib/hooks/onboarding/useOnboardingFlags.ts`, `lib/hooks/onboarding/useCampaignOnboarding.ts`, `lib/hooks/onboarding/useWhatsNew.ts`, `lib/hooks/onboarding/index.ts`
- Test: `lib/hooks/onboarding/__tests__/onboarding-hooks.test.tsx`

**Interfaces:**
- Consumes: типи з `types/onboarding.ts`, `isHintHidden`, `unseenWhatsNew`, `visibleWhatsNew`, `hintKey`, `HIDE_ALL_HINTS_KEY`, `WHATS_NEW_KEY`, `checklistKey`, `CHECKLIST_HIDDEN`, `WHATS_NEW`.
- Produces:

```ts
// lib/api/onboarding.ts
export const getOnboardingFlags: () => Promise<OnboardingFlagsResponse>;
export const setOnboardingFlag: (body: SetFlagBody) => Promise<{ ok: true }>;
export const resetOnboarding: (scope: ResetScope) => Promise<{ ok: true }>;
export const getCampaignOnboarding: (campaignId: string) => Promise<CampaignOnboardingResponse>;

// keys.ts
export const onboardingKeys = { flags: () => ["onboarding-flags"] as const, campaigns: () => ["campaign-onboarding"] as const, campaign: (campaignId: string) => ["campaign-onboarding", campaignId] as const };

// hooks (з "@/lib/hooks/onboarding")
export function useOnboardingFlags(): { flags: OnboardingFlags | null; audiences: OnboardingRole[]; setFlag: (key: string, value?: string | null) => void; reset: (scope: ResetScope) => void };
export function useOnboardingHint(id: string): { visible: boolean; dismiss: () => void };
export function useCampaignOnboarding(campaignId: string): { data: CampaignOnboardingResponse | null; hide: () => void };
export function useWhatsNew(): { entries: WhatsNewEntry[]; unseen: WhatsNewEntry[]; markSeen: () => void };
```

- [ ] **Step 1: Write the failing test** `lib/hooks/onboarding/__tests__/onboarding-hooks.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/onboarding";
import { useCampaignOnboarding, useOnboardingHint, useWhatsNew } from "@/lib/hooks/onboarding";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(async () => ({ ok: true })),
  getCampaignOnboarding: vi.fn(),
}));

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: { "whats-new": WHATS_NEW[WHATS_NEW.length - 1].id }, audiences: ["dm", "player"] });
});

describe("useOnboardingHint", () => {
  it("показується, dismiss ховає одразу й пише прапорець", async () => {
    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: wrap() });

    await waitFor(() => expect(result.current.visible).toBe(true));
    act(() => result.current.dismiss());

    expect(result.current.visible).toBe(false);
    expect(api.setOnboardingFlag).toHaveBeenCalledWith({ key: "hint:dm.races", value: null });
  });

  it("поки прапорці не завантажені або впали — не показується", async () => {
    vi.mocked(api.getOnboardingFlags).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: wrap() });

    expect(result.current.visible).toBe(false);
    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(result.current.visible).toBe(false);
  });
});

describe("useWhatsNew", () => {
  it("непобачені → markSeen ставить найновіший id", async () => {
    const { result } = renderHook(() => useWhatsNew(), { wrapper: wrap() });

    await waitFor(() => expect(result.current.unseen.length).toBe(WHATS_NEW.length - 1));
    act(() => result.current.markSeen());

    expect(api.setOnboardingFlag).toHaveBeenCalledWith({ key: "whats-new", value: WHATS_NEW[0].id });
    expect(result.current.unseen).toEqual([]);
  });
});

describe("useCampaignOnboarding", () => {
  it("hide → state hidden і прапорець checklist:<id>", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [], requiredDone: 0, requiredTotal: 6 });
    const { result } = renderHook(() => useCampaignOnboarding("camp"), { wrapper: wrap() });

    await waitFor(() => expect(result.current.data?.state).toBe("open"));
    act(() => result.current.hide());

    expect(result.current.data?.state).toBe("hidden");
    expect(api.setOnboardingFlag).toHaveBeenCalledWith({ key: "checklist:camp", value: "hidden" });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test:run lib/hooks/onboarding` → FAIL.

- [ ] **Step 3: Implement `lib/api/onboarding.ts`**

```ts
import { campaignGet, request } from "./client";

import type { CampaignOnboardingResponse, OnboardingFlagsResponse, ResetScope, SetFlagBody } from "@/types/onboarding";

export const getOnboardingFlags = () => request<OnboardingFlagsResponse>("/api/onboarding", { cache: "no-store" });

export const setOnboardingFlag = (body: SetFlagBody) => request<{ ok: true }>("/api/onboarding/flags", { method: "PUT", body: JSON.stringify(body) });

export const resetOnboarding = (scope: ResetScope) => request<{ ok: true }>("/api/onboarding/reset", { method: "POST", body: JSON.stringify({ scope }) });

export const getCampaignOnboarding = (campaignId: string) => campaignGet<CampaignOnboardingResponse>(campaignId, "/onboarding", { cache: "no-store" });
```

- [ ] **Step 4: Implement `keys.ts`** (без `"use client"`):

```ts
export const onboardingKeys = {
  flags: () => ["onboarding-flags"] as const,
  campaigns: () => ["campaign-onboarding"] as const,
  campaign: (campaignId: string) => [...onboardingKeys.campaigns(), campaignId] as const,
};
```

- [ ] **Step 5: Implement `useOnboardingFlags.ts`**

```ts
"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingKeys } from "./keys";

import { getOnboardingFlags, resetOnboarding, setOnboardingFlag } from "@/lib/api/onboarding";
import { hintKey } from "@/lib/onboarding/flag-keys";
import { isHintHidden } from "@/lib/onboarding/progress";
import type { OnboardingFlagsResponse, ResetScope, SetFlagBody } from "@/types/onboarding";

export function useOnboardingFlags() {
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: onboardingKeys.flags(), queryFn: getOnboardingFlags, staleTime: Infinity, retry: false });

  const { mutate: write } = useMutation({
    mutationFn: setOnboardingFlag,
    onMutate: ({ key, value }: SetFlagBody) => {
      qc.setQueryData<OnboardingFlagsResponse>(onboardingKeys.flags(), (prev) => (prev ? { ...prev, flags: { ...prev.flags, [key]: value ?? null } } : prev));
    },
  });

  const { mutate: resetMutate } = useMutation({
    mutationFn: resetOnboarding,
    onSuccess: (_data, scope) => {
      qc.invalidateQueries({ queryKey: onboardingKeys.flags() });

      if (scope === "checklists") qc.invalidateQueries({ queryKey: onboardingKeys.campaigns() });
    },
  });

  const setFlag = useCallback((key: string, value: string | null = null) => write({ key, value }), [write]);

  const reset = useCallback((scope: ResetScope) => resetMutate(scope), [resetMutate]);

  return { flags: data?.flags ?? null, audiences: data?.audiences ?? [], setFlag, reset };
}

export function useOnboardingHint(id: string) {
  const { flags, setFlag } = useOnboardingFlags();

  const dismiss = useCallback(() => setFlag(hintKey(id)), [setFlag, id]);

  return { visible: !!flags && !isHintHidden(id, flags), dismiss };
}
```

- [ ] **Step 6: Implement `useCampaignOnboarding.ts`**

```ts
"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingKeys } from "./keys";
import { useOnboardingFlags } from "./useOnboardingFlags";

import { getCampaignOnboarding } from "@/lib/api/onboarding";
import { CHECKLIST_HIDDEN, checklistKey } from "@/lib/onboarding/flag-keys";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { CampaignOnboardingResponse } from "@/types/onboarding";

export function useCampaignOnboarding(campaignId: string) {
  const qc = useQueryClient();

  const { setFlag } = useOnboardingFlags();

  const { data } = useQuery({ queryKey: onboardingKeys.campaign(campaignId), queryFn: () => getCampaignOnboarding(campaignId), staleTime: ENTITY_STALE_MS, retry: false });

  const hide = useCallback(() => {
    qc.setQueryData<CampaignOnboardingResponse>(onboardingKeys.campaign(campaignId), (prev) => (prev ? { ...prev, state: "hidden" } : prev));
    setFlag(checklistKey(campaignId), CHECKLIST_HIDDEN);
  }, [qc, campaignId, setFlag]);

  return { data: data ?? null, hide };
}
```

Примітка: `useOnboardingFlags` усередині запускає запит прапорців — це той самий кешований запит, що й для підказок/хедера (staleTime Infinity), окремого трафіку немає.

- [ ] **Step 7: Implement `useWhatsNew.ts`**

```ts
"use client";

import { useCallback, useMemo } from "react";

import { useOnboardingFlags } from "./useOnboardingFlags";

import { WHATS_NEW_KEY } from "@/lib/onboarding/flag-keys";
import { unseenWhatsNew, visibleWhatsNew } from "@/lib/onboarding/progress";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

export function useWhatsNew() {
  const { flags, audiences, setFlag } = useOnboardingFlags();

  const entries = useMemo(() => visibleWhatsNew(WHATS_NEW, audiences), [audiences]);

  const unseen = useMemo(() => (flags ? unseenWhatsNew(WHATS_NEW, audiences, flags[WHATS_NEW_KEY]) : []), [flags, audiences]);

  const latestId = WHATS_NEW[0]?.id;

  const markSeen = useCallback(() => {
    if (latestId && flags?.[WHATS_NEW_KEY] !== latestId) setFlag(WHATS_NEW_KEY, latestId);
  }, [flags, latestId, setFlag]);

  return { entries, unseen, markSeen };
}
```

- [ ] **Step 8: `index.ts`**

```ts
export { useCampaignOnboarding } from "./useCampaignOnboarding";
export { useOnboardingFlags, useOnboardingHint } from "./useOnboardingFlags";
export { useWhatsNew } from "./useWhatsNew";
```

- [ ] **Step 9: Run tests** — `pnpm test:run lib/hooks/onboarding` → PASS; `pnpm lint --fix lib/hooks/onboarding lib/api/onboarding.ts` → без помилок.

- [ ] **Step 10: Commit**

```bash
git add lib/api/onboarding.ts lib/hooks/onboarding
git commit -m "feat(onboarding): client api and hooks"
```

---

### Task 6: Чекліст на сторінці кампанії

**Files:**
- Create: `components/onboarding/OnboardingChecklist.tsx`
- Modify: `app/campaigns/[id]/page.tsx`
- Test: `components/onboarding/__tests__/OnboardingChecklist.test.tsx`

**Interfaces:**
- Consumes: `useCampaignOnboarding` (Task 5), `readCampaignOnboarding` (Task 4), `onboardingKeys.campaign`, `StepStatus`.
- Produces: `export function OnboardingChecklist({ campaignId }: { campaignId: string }): JSX.Element | null`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import * as api from "@/lib/api/onboarding";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(async () => ({ flags: {}, audiences: ["dm"] })),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(),
  getCampaignOnboarding: vi.fn(),
}));

const step = (id: string, done: boolean, optional = false) => ({ id, title: `Крок ${id}`, description: "опис", href: `/campaigns/c/${id}`, helpSlug: "dm-quickstart", optional, informational: false, done });

const renderIt = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return render(<OnboardingChecklist campaignId="c" />, { wrapper });
};

afterEach(cleanup);

beforeEach(() => vi.clearAllMocks());

describe("OnboardingChecklist", () => {
  it("open — прогрес, кроки, «Як це?» веде в довідку", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [step("a", true), step("b", false), step("x", false, true)], requiredDone: 1, requiredTotal: 2 });
    renderIt();

    expect(await screen.findByText("1/2")).toBeTruthy();
    expect(screen.getByText("Крок b")).toBeTruthy();
    expect(screen.getByText("Більше можливостей")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Як це?" })[0].getAttribute("href")).toBe("/help/dm-quickstart");
  });

  it("collapsed — один рядок", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "collapsed", steps: [step("a", true)], requiredDone: 1, requiredTotal: 1 });
    renderIt();

    expect(await screen.findByText(/Перші кроки пройдено/)).toBeTruthy();
    expect(screen.queryByText("Крок a")).toBeNull();
  });

  it("«Сховати» прибирає панель", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [step("b", false)], requiredDone: 0, requiredTotal: 1 });
    const { container } = renderIt();

    fireEvent.click(await screen.findByRole("button", { name: "Сховати" }));

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("помилка API — нічого не рендерить", async () => {
    vi.mocked(api.getCampaignOnboarding).mockRejectedValue(new Error("down"));
    const { container } = renderIt();

    await waitFor(() => expect(api.getCampaignOnboarding).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test:run components/onboarding` → FAIL.

- [ ] **Step 3: Implement `OnboardingChecklist.tsx`**

```tsx
"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Info } from "lucide-react";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useCampaignOnboarding } from "@/lib/hooks/onboarding";
import type { StepStatus } from "@/lib/onboarding/progress";

function StepRow({ step }: { step: StepStatus }) {
  const Icon = step.informational ? Info : step.done ? CheckCircle2 : Circle;

  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className={step.done ? "mt-0.5 size-4 shrink-0 text-hud-gold" : "mt-0.5 size-4 shrink-0 text-hud-muted"} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={step.done ? "text-sm text-hud-muted line-through" : "text-sm text-hud-ink"}>{step.title}</p>
        {!step.done && <p className="text-xs text-hud-muted">{step.description}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        {step.helpSlug && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/help/${step.helpSlug}`}>Як це?</Link>
          </Button>
        )}
        {!step.done && (
          <Button variant="outline" size="sm" asChild>
            <Link href={step.href}>Перейти</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

export function OnboardingChecklist({ campaignId }: { campaignId: string }) {
  const { data, hide } = useCampaignOnboarding(campaignId);

  if (!data || data.state === "hidden") return null;

  if (data.state === "collapsed") {
    return (
      <HudPanel className="flex items-center justify-between gap-2 text-sm">
        <span className="text-hud-muted">Перші кроки пройдено ✓</span>
        <Link href="/help" className="text-hud-gold hover:underline">Довідка</Link>
      </HudPanel>
    );
  }

  const required = data.steps.filter((s) => !s.optional);

  const extra = data.steps.filter((s) => s.optional);

  return (
    <HudPanel>
      <HudSection
        title="Перші кроки"
        action={
          <div className="flex items-center gap-2">
            <span className="text-sm text-hud-muted">{`${data.requiredDone}/${data.requiredTotal}`}</span>
            <Button variant="ghost" size="sm" onClick={hide}>Сховати</Button>
          </div>
        }
      >
        <ol className="divide-y divide-hud-rule">{required.map((s) => <StepRow key={s.id} step={s} />)}</ol>
        {extra.length > 0 && (
          <>
            <p className="mt-3 text-xs uppercase tracking-wide text-hud-muted">Більше можливостей</p>
            <ul className="divide-y divide-hud-rule">{extra.map((s) => <StepRow key={s.id} step={s} />)}</ul>
          </>
        )}
      </HudSection>
    </HudPanel>
  );
}
```

Перевірити реальні пропси `HudSection` (`components/hud/form`) — `title` і `action` використовуються на `app/campaigns/[id]/page.tsx`; якщо `children` не приймається, обгорнути список поруч. Класи кольорів (`text-hud-gold`, `text-hud-ink`, `divide-hud-rule`) звірити з `components/hud/hud.css`/`app/globals.css` і замінити на наявні.

- [ ] **Step 4: Підключити на сторінці кампанії** — у `app/campaigns/[id]/page.tsx`:

```tsx
import { readCampaignOnboarding } from "@/app/api/campaigns/[id]/onboarding/read-onboarding";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { onboardingKeys } from "@/lib/hooks/onboarding/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { readOkJson } from "@/lib/utils/api/read-json";
```

Після `pendingDrafts` (паралельно з ним, через `Promise.all`):

```tsx
const onboarding = await readOkJson(await readCampaignOnboarding({ id, known: { userId: user.id, isDM } }));
```

Одразу після `<HudPageHeader … />`:

```tsx
<PrefetchedQuery queryKey={onboardingKeys.campaign(id)} data={onboarding}>
  <OnboardingChecklist campaignId={id} />
</PrefetchedQuery>
```

Якщо `onboarding === null` (помилка) — `PrefetchedQuery` все одно рендерить дітей; перевірити в `lib/providers/prefetched-query-client.tsx`, що `data: null` не засіює кеш, інакше рендерити `<OnboardingChecklist>` без обгортки при `null`. Обгортці блоку `InviteCodeDisplay` додати `id="invite"` (ціль кроку «Запроси гравців»). Перевірити, що `user.id` — правильне поле `authUser` з `requireCampaignWithMembers`.

- [ ] **Step 5: Run tests** — `pnpm test:related app/campaigns/[id]/page.tsx components/onboarding/OnboardingChecklist.tsx` → PASS.

- [ ] **Step 6: Commit**

```bash
git add components/onboarding "app/campaigns/[id]/page.tsx"
git commit -m "feat(onboarding): first-steps checklist on the campaign page"
```

---

### Task 7: Контекстні підказки на екранах

**Files:**
- Create: `components/onboarding/OnboardingHint.tsx`
- Modify (по одному `<OnboardingHint id=… />` одразу після `HudPageHeader` або на початку вмісту):
  - `app/campaigns/[id]/dm/races/page-client.tsx` → `dm.races`
  - `app/campaigns/[id]/dm/skill-trees/…page-client.tsx` → `dm.skill-trees`
  - `app/campaigns/[id]/dm/skills/…page-client.tsx` → `dm.skills`
  - `app/campaigns/[id]/dm/units/page-client.tsx` → `dm.units`
  - `app/campaigns/[id]/dm/spells/…page-client.tsx` → `dm.spells`
  - `app/campaigns/[id]/dm/artifacts/…page-client.tsx` → `dm.artifacts`
  - `app/campaigns/[id]/dm/battles/page-client.tsx` → `dm.battles`
  - `app/campaigns/[id]/dm/battles/new/…` (форма налаштування бою) → `dm.battle-setup`
  - DM-вигляд сцени бою (`components/battle/…`, знайти через `app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx`, гілка `isDM`) → `dm.battle-scene`
  - `app/campaigns/[id]/dm/scenario/page-client.tsx` → `dm.scenario`
  - `app/campaigns/[id]/dm/show/…` → `dm.show`
  - `components/character-profile` (верх профілю для власника-гравця) → `player.character`
  - `app/campaigns/[id]/character/draft/page.tsx` або його клієнтський компонент → `player.draft`
  - гравцевий вигляд бою (`BattlePageClient`, гілка не-ДМ) → `player.battle`
- Test: `components/onboarding/__tests__/OnboardingHint.test.tsx`

**Interfaces:**
- Consumes: `useOnboardingHint` (Task 5), `HINTS` (Task 3).
- Produces: `export function OnboardingHint({ id, className }: { id: string; className?: string }): JSX.Element | null`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import * as api from "@/lib/api/onboarding";
import { HINTS } from "@/lib/onboarding/hints";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(),
  getCampaignOnboarding: vi.fn(),
}));

const renderIt = (id = "dm.races") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(<OnboardingHint id={id} />, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider> });
};

afterEach(cleanup);

beforeEach(() => vi.clearAllMocks());

describe("OnboardingHint", () => {
  it("показує текст і посилання на статтю, хрестик ховає", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm"] });
    renderIt();

    expect(await screen.findByText(HINTS["dm.races"].title)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Детальніше" }).getAttribute("href")).toBe(`/help/${HINTS["dm.races"].helpSlug}`);
    fireEvent.click(screen.getByRole("button", { name: "Закрити підказку" }));
    expect(screen.queryByText(HINTS["dm.races"].title)).toBeNull();
  });

  it("усі підказки сховані — нічого", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: { "hint:*": null }, audiences: ["dm"] });
    const { container } = renderIt();

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("невідомий id — нічого", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm"] });
    const { container } = renderIt("nope");

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("помилка API — нічого", async () => {
    vi.mocked(api.getOnboardingFlags).mockRejectedValue(new Error("down"));
    const { container } = renderIt();

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test:run components/onboarding/__tests__/OnboardingHint.test.tsx` → FAIL.

- [ ] **Step 3: Implement `OnboardingHint.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Lightbulb, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingHint } from "@/lib/hooks/onboarding";
import { HINTS } from "@/lib/onboarding/hints";

export function OnboardingHint({ id, className }: { id: string; className?: string }) {
  const { visible, dismiss } = useOnboardingHint(id);

  const hint = HINTS[id];

  if (!hint || !visible) return null;

  return (
    <aside className={cn("flex items-start gap-3 rounded-lg border border-hud-rule bg-hud-panel p-3 text-sm", className)}>
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-hud-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-hud-ink">{hint.title}</p>
        <p className="text-hud-muted">{hint.body}</p>
        {hint.helpSlug && (
          <Link href={`/help/${hint.helpSlug}`} className="text-hud-gold hover:underline">Детальніше</Link>
        )}
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={dismiss} aria-label="Закрити підказку">
        <X className="size-4" />
      </Button>
    </aside>
  );
}
```

- [ ] **Step 4: Розставити підказки** за списком у **Files**. Для кожного екрана: знайти клієнтський компонент (`ls` теки, `grep -n "HudPageHeader"`), вставити `<OnboardingHint id="…" />` після заголовка. На сценах бою — у панель, що не перекриває мапу (бічна панель/док на десктопі; на телефоні — над нижнім доком). Якщо якогось екрана немає (наприклад, `dm/skills` має іншу назву) — вибрати найближчий і записати відхилення в повідомлення коміту.

- [ ] **Step 5: Run** — `pnpm test:changed` → PASS (зачеплені тести сторінок не мають падати: якщо тест сторінки рендерить компонент без `QueryClientProvider`, додати мок `vi.mock("@/components/onboarding/OnboardingHint", () => ({ OnboardingHint: () => null }))` у цей тест). `pnpm lint` → без помилок.

- [ ] **Step 6: Commit**

```bash
git add components/onboarding app components
git commit -m "feat(onboarding): contextual hints on DM and player screens"
```

---

### Task 8: «Що нового» в хедері й довідка `/help`

**Files:**
- Create: `components/onboarding/WhatsNewButton.tsx`, `components/onboarding/HelpArticleView.tsx`, `components/onboarding/HelpSettings.tsx`, `app/help/page.tsx`, `app/help/[slug]/page.tsx`
- Modify: `components/layout/Header.tsx` (кнопка поруч із `AbbreviationsInfoDialog`; пункт «Довідка» в меню кампанії + окрема іконка поза кампанією)
- Test: `components/onboarding/__tests__/WhatsNewButton.test.tsx`, `components/onboarding/__tests__/HelpArticleView.test.tsx`

**Interfaces:**
- Consumes: `useWhatsNew`, `useOnboardingFlags` (Task 5); `HELP_ARTICLES`, `getHelpArticle` (Task 3).
- Produces: `WhatsNewButton()`, `HelpArticleView({ article }: { article: HelpArticle })`, `HelpSettings()`.

- [ ] **Step 1: Write the failing tests**

`components/onboarding/__tests__/WhatsNewButton.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WhatsNewButton } from "@/components/onboarding/WhatsNewButton";
import * as api from "@/lib/api/onboarding";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(async () => ({ flags: { "whats-new": WHATS_NEW[WHATS_NEW.length - 1].id }, audiences: ["dm", "player"] })),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(),
  getCampaignOnboarding: vi.fn(),
}));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

describe("WhatsNewButton", () => {
  it("бейдж із кількістю, відкриття показує записи й позначає побаченим", async () => {
    render(<WhatsNewButton />, { wrapper });

    expect(await screen.findByText(String(WHATS_NEW.length - 1))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Що нового/ }));

    expect(await screen.findByText(WHATS_NEW[0].title)).toBeTruthy();
    expect(api.setOnboardingFlag).toHaveBeenCalledWith({ key: "whats-new", value: WHATS_NEW[0].id });
  });
});
```

`components/onboarding/__tests__/HelpArticleView.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HelpArticleView } from "@/components/onboarding/HelpArticleView";

afterEach(cleanup);

describe("HelpArticleView", () => {
  it("рендерить розділи, абзаци, списки й посилання", () => {
    render(
      <HelpArticleView
        article={{ slug: "s", audience: "dm", title: "Т", summary: "С", sections: [{ heading: "Розділ", blocks: [{ kind: "p", text: "Абзац" }, { kind: "list", items: ["Один", "Два"] }, { kind: "link", text: "Туди", href: "/help" }] }] }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Розділ" })).toBeTruthy();
    expect(screen.getByText("Абзац")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Туди" }).getAttribute("href")).toBe("/help");
  });
});
```

- [ ] **Step 2: Run to verify they fail** — `pnpm test:run components/onboarding` → FAIL.

- [ ] **Step 3: Implement `WhatsNewButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useWhatsNew } from "@/lib/hooks/onboarding";

export function WhatsNewButton() {
  const { entries, unseen, markSeen } = useWhatsNew();

  const [open, setOpen] = useState(false);

  // знімок при відкритті: після markSeen хук одразу поверне unseen = [], а мітки «нове» мають лишитися
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  const onOpenChange = (next: boolean) => {
    if (next) {
      setNewIds(new Set(unseen.map((e) => e.id)));
      markSeen();
    }

    setOpen(next);
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="relative h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong" onClick={() => onOpenChange(true)}>
        <Gift className="h-4 w-4" />
        <span className="sr-only">Що нового</span>
        {unseen.length > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-hud-gold px-1 text-[10px] leading-4 text-black">{unseen.length}</span>}
      </Button>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Що нового" hud>
        <ul className="space-y-4">
          {entries.map((e) => (
            <li key={e.id}>
              <p className="text-xs text-hud-muted">
                {e.date}
                {newIds.has(e.id) && " · нове"}
              </p>
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-hud-muted">{e.body}</p>
              {e.href && <Link href={e.href} className="text-sm text-hud-gold hover:underline" onClick={() => setOpen(false)}>Відкрити</Link>}
            </li>
          ))}
        </ul>
      </ResponsiveDialog>
    </>
  );
}
```

- [ ] **Step 4: Implement `HelpArticleView.tsx`**

```tsx
import Link from "next/link";

import type { HelpArticle, HelpBlock } from "@/lib/onboarding/types";

function Block({ block }: { block: HelpBlock }) {
  if (block.kind === "p") return <p>{block.text}</p>;

  if (block.kind === "list") return <ul className="list-disc space-y-1 pl-5">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;

  return <Link href={block.href} className="text-hud-gold hover:underline">{block.text}</Link>;
}

export function HelpArticleView({ article }: { article: HelpArticle }) {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {article.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 className="hud-sc text-base text-hud-ink">{section.heading}</h2>
          {section.blocks.map((block, i) => <Block key={i} block={block} />)}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement `HelpSettings.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useOnboardingFlags } from "@/lib/hooks/onboarding";
import { HIDE_ALL_HINTS_KEY } from "@/lib/onboarding/flag-keys";

export function HelpSettings() {
  const { flags, setFlag, reset } = useOnboardingFlags();

  if (!flags) return null;

  const allHidden = HIDE_ALL_HINTS_KEY in flags;

  return (
    <div className="flex flex-wrap gap-2">
      {allHidden ? (
        <Button variant="outline" size="sm" onClick={() => reset("hints")}>Показати підказки знову</Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setFlag(HIDE_ALL_HINTS_KEY)}>Сховати всі підказки</Button>
      )}
      <Button variant="outline" size="sm" onClick={() => reset("checklists")}>Повернути чеклісти перших кроків</Button>
    </div>
  );
}
```

Скидання чеклістів інвалідує й `onboardingKeys.campaigns()` — це вже зроблено в `useOnboardingFlags` (Task 5).

- [ ] **Step 6: Implement сторінки**

`app/help/page.tsx`:

```tsx
import Link from "next/link";

import { HelpSettings } from "@/components/onboarding/HelpSettings";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { HELP_ARTICLES } from "@/lib/onboarding/help";
import type { OnboardingAudience } from "@/lib/onboarding/types";

const GROUPS: { audience: OnboardingAudience; title: string }[] = [
  { audience: "dm", title: "Для ДМ" },
  { audience: "player", title: "Для гравців" },
];

export default function HelpPage() {
  return (
    <HudPage>
      <HudPageHeader title="Довідка" subtitle="Як провести першу гру й що вміє застосунок" />
      {GROUPS.map((g) => (
        <HudPanel key={g.audience}>
          <h2 className="hud-sc mb-2 text-hud-ink">{g.title}</h2>
          <ul className="space-y-2">
            {HELP_ARTICLES.filter((a) => a.audience === g.audience || a.audience === "all").map((a) => (
              <li key={a.slug}>
                <Link href={`/help/${a.slug}`} className="text-hud-gold hover:underline">{a.title}</Link>
                <p className="text-xs text-hud-muted">{a.summary}</p>
              </li>
            ))}
          </ul>
        </HudPanel>
      ))}
      <HudPanel>
        <h2 className="hud-sc mb-2 text-hud-ink">Підказки</h2>
        <HelpSettings />
      </HudPanel>
    </HudPage>
  );
}
```

`app/help/[slug]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { HelpArticleView } from "@/components/onboarding/HelpArticleView";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = getHelpArticle(slug);

  if (!article) notFound();

  return (
    <HudPage>
      <HudPageHeader title={article.title} subtitle={article.summary} actions={<Link href="/help" className="self-center text-sm text-hud-gold hover:underline">Уся довідка</Link>} />
      <HudPanel>
        <HelpArticleView article={article} />
      </HudPanel>
    </HudPage>
  );
}
```

Перевірити пропси `HudPageHeader` (`title`, `subtitle`, `actions` — як на сторінці кампанії) і те, що `/help` проходить через proxy для залогінених (`lib/supabase/middleware.ts`): незалогіненого має редіректнути на `/sign-in`, як інші сторінки.

- [ ] **Step 7: Хедер** — у `components/layout/Header.tsx`:
  - імпорт `WhatsNewButton` з `@/components/onboarding/WhatsNewButton`, `CircleHelp` з `lucide-react`;
  - рендерити `<WhatsNewButton />` поруч із `AbbreviationsInfoDialog` (на всіх сторінках, де є хедер);
  - у `DropdownMenuContent` меню кампанії після «Огляд кампанії» додати `<DropdownMenuItem asChild><Link href="/help">Довідка</Link></DropdownMenuItem>`;
  - поза кампанією (`!isCampaignPage`) — іконку-посилання `CircleHelp` на `/help` поруч із «На головну».
  - Якщо `components/layout/__tests__` рендерить `Header` без `QueryClientProvider` — замокати `WhatsNewButton` у цьому тесті.

- [ ] **Step 8: Run** — `pnpm test:related components/layout/Header.tsx components/onboarding/WhatsNewButton.tsx components/onboarding/HelpArticleView.tsx` → PASS; `pnpm lint` → без помилок.

- [ ] **Step 9: Commit**

```bash
git add components/onboarding components/layout/Header.tsx app/help
git commit -m "feat(onboarding): what's new in the header and /help pages"
```

---

### Task 9: Документація, повна перевірка, браузер

**Files:**
- Create: `docs/architecture/onboarding.md`
- Modify: `docs/architecture/README.md`, `docs/STATUS.md`, `CLAUDE.md`

- [ ] **Step 1: `docs/architecture/onboarding.md`** (українською, у стилі сусідніх файлів): призначення; реєстр `lib/onboarding/` (файли і що в них); правило «прогрес = факти, у БД лише прапорці» + перелік ключів; один `$queryRaw` для фактів і чому; роути та хуки; як додати крок / підказку / запис «Що нового» / статтю (по 2–3 рядки); поведінка при помилках (мовчки `null`).

- [ ] **Step 2: `docs/architecture/README.md`** — рядок-посилання на `onboarding.md` у таблиці/списку підсистем.

- [ ] **Step 3: `CLAUDE.md`** — у розділ «Subsystems — rules that must not be broken» додати:

```markdown
- **Onboarding** ([onboarding.md](docs/architecture/onboarding.md)): checklist progress is derived from DB facts, never stored; `user_onboarding_flags` holds only dismissed/seen keys. A user-facing feature adds an entry to `lib/onboarding/whats-new.ts` (and a hint/help article when it adds a screen).
```

- [ ] **Step 4: `docs/STATUS.md`** — рядок у «У роботі»: «Онбординг (чеклісти, підказки, Що нового, довідка) | `feat/onboarding`, `../dnd-tracker-onboarding`, локальна БД `onboarding` | код готовий, браузерна перевірка/злиття; міграція `user_onboarding_flags` піде на прод при деплої»; оновити дату.

- [ ] **Step 5: Повна перевірка**

```bash
pnpm lint
pnpm exec tsc --noEmit -p .
pnpm test:run
```

Expected: усе зелене. Будь-які падіння — виправити, не пропускати.

- [ ] **Step 6: Браузерна перевірка** (`pnpm dev` на БД `onboarding`; skill `run` / `claude-in-chrome`):
  1. Новий ДМ: створити кампанію → чекліст 0/6 → пройти «Створи расу» → повернутись → 1/6.
  2. Підказка на `dm/races` → закрити → після перезавантаження не з'являється.
  3. «Що нового»: новий користувач — без бейджа; у БД виставити `whats-new` на найстаріший id → бейдж 4 → відкрити → бейдж зник.
  4. Гравець (другий акаунт, інвайт-код): чекліст гравця, чернетка → «чекає схвалення», після схвалення ДМ — виконано.
  5. `/help`, стаття, «Сховати всі підказки» → підказки зникли; «Показати знову» → повернулись.
  6. Телефонна ширина (390px): чекліст, підказка, діалог «Що нового» (bottom sheet), меню «Довідка».
  7. Тестові кампанії/бої після перевірки видалити.

- [ ] **Step 7: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs: onboarding architecture, status and rule"
```

- [ ] **Step 8: Кінець гілки** — `/simplify` на дифі гілки, фінальне рев'ю (opus), далі `superpowers:finishing-a-development-branch`; при злитті `git mv` спеку й план у `docs/archive/superpowers/`.
