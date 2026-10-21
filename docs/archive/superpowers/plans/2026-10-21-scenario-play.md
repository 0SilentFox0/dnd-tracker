# Гра зі сценарію — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DM веде сесію зі сторінки сценарію: клік по абзацу показує гравцям прив'язаний слайд (з його треком), кнопка в абзаці запускає прив'язаний бій і кличе гравців «До бою!», внизу — панель показу з плеєром.

**Architecture:** Прив'язки рядків (`slide`, `battleId`) живуть у JSON контенту сценарію; набір має nullable `scenarioPageId`. Стан показу (`campaign_shows`) отримує необов'язкове поле `battle`, яке ставить нова команда показу `battle` і скидають `open/next/prev/end`. Клієнт: чиста логіка стану рядка в `lib/utils/scenario/play.ts`, хук `useScenarioPlay` у `lib/hooks/scenario`, компоненти лише рендерять.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, Prisma 6 / Postgres, Zod, Pusher, Vitest (+ happy-dom для компонентів).

**Spec:** `docs/archive/superpowers/specs/2026-10-21-scenario-play-design.md`

## Global Constraints

- Робота лише у worktree `/Users/silentfox/Work/dnd-tracker-play` (гілка `feat/scenario-play`); головну папку не чіпати.
- Локальна БД: Docker Postgres на `localhost:54322` (`pnpm db:local`); міграцію створювати `pnpm exec prisma migrate dev --name scenario_play` проти локальної БД, ніколи не проти prod.
- Міграція тільки expand (додати колонки), без `DROP`/`NOT NULL` на наявних даних.
- Тексти UI і помилок — українською; ідентифікатори — англійською. Помилки API — `errorResponse` + `API_ERRORS`.
- Компоненти не імпортують `@/lib/api/*`; запити — у `lib/api/<domain>.ts`, стан — у хуках `lib/hooks/<domain>`, імпорт хуків через barrel `index.ts`.
- Query keys — лише фабрики в `keys.ts`; нові ключі додати в `lib/hooks/__tests__/keys.test.ts`.
- Діалоги — тільки `ResponsiveDialog` (`hud`); підтвердження/повідомлення — `useConfirm`/`useNotify`.
- Мінімум коментарів: лише неочевидне «чому», один рядок.
- ESLint: `simple-import-sort`, порожні рядки навколо `const`/`if`/`return` (`pnpm lint --fix`), без `console.log`, `react-hooks/exhaustive-deps` = error.
- Кожен коміт закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Висяче посилання** — абзац посилається на видалений набір/слайд/бій: рядок не клікабельний, бейдж «недоступно», жодного запиту (Task 4 тест `rowSlideState`/`rowBattleState` з `missing`).
2. **Бій уже завершений або ще йде** при натисканні — `completed` не стартує і не кличе; `active` лише кличе без повторного `start` (Task 4 тест хука-логіки `battleAction`, Task 2 тест 422 для `completed`).
3. **Клік по згадці (`@посилання`) усередині клікабельного рядка** не має перемикати слайд (Task 6 тест).
4. **Відкритий редактор набору + зміна сцени** — зміна сцени не ламає наступне збереження слайдів (409) (Task 3 тест: `PATCH` не змінює `updatedAt`).
5. **Старі стани показу без `battle`** (рядки, записані до міграції, і наявні тести з точним `toEqual`) — поле відсутнє, а не `null`, тож нічого не ламається (Task 2 тест `toShowState` без `battle`).

---

## File Structure

| Файл | Що робить |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/<ts>_scenario_play/migration.sql` | `SlideDeck.scenarioPageId` (+ FK, індекс), `CampaignShow.battle` |
| `types/scenario.ts` | `ScenarioRowSlide`, `ScenarioRow.slide?`, `ScenarioRow.battleId?` |
| `types/show.ts` | `ShowBattle`, `ShowState.battle?`, команда `battle`, `scenarioPageId` у наборах |
| `types/battle.ts` | `BattleBrief` |
| `lib/schemas/scenario.ts`, `lib/schemas/show.ts` | Zod для нових полів, `deckSceneSchema` |
| `lib/constants/api-errors.ts` | `SHOW_BATTLE_NOT_ACTIVE`, `DECK_SCENE_INVALID` |
| `lib/utils/show/show-command.ts` | команда `battle`, спільний `stopAudio` |
| `lib/server/show/show-store.ts`, `lib/server/show/deck-store.ts` | читання/запис `battle`, `scenarioPageId` у DTO |
| `app/api/campaigns/[id]/show/show-handler.ts` | вантажить бій для команди `battle` |
| `app/api/campaigns/[id]/decks/deck-handlers.ts`, `.../decks/[deckId]/route.ts` | `PATCH` сцени набору |
| `app/api/campaigns/[id]/battles/route.ts` | `GET ?brief=1` |
| `lib/api/decks.ts`, `lib/api/battles.ts` | `setDeckScene`, `getBattleBriefs` |
| `lib/hooks/battles/keys.ts`, `lib/hooks/battles/useBattleBriefs.ts` | список боїв для сценарію |
| `lib/hooks/show/useDecks.ts` | `useDeckScene` |
| `lib/utils/scenario/play.ts` | чисті стани рядка для гри |
| `lib/utils/scenario/structure.ts` | `setRowSlide`, `setRowBattle` |
| `lib/hooks/scenario/useScenarioPlay.ts` | дані + дії режиму гри |
| `components/show/editor/DeckSceneSelect.tsx` | вибір сцени набору |
| `components/scenario/editor/RowBindings.tsx`, `SlidePickerDialog.tsx`, `BattlePickerDialog.tsx` | прив'язка рядка в редакторі |
| `components/scenario/ScenarioPageView.tsx`, `components/scenario/play/RowPlayControls.tsx`, `components/scenario/play/ScenarioShowDock.tsx`, `components/scenario/scenario-book.css` | режим гри |
| `components/show/stage/ShowBattleCall.tsx`, `app/campaigns/[id]/show/page-client.tsx` | «До бою!» у гравців |

---

### Task 1: Модель даних, типи, схеми

**Files:**
- Modify: `prisma/schema.prisma` (моделі `SlideDeck` ~350, `CampaignShow` ~364, `ScenarioPage` ~532)
- Create: `prisma/migrations/<timestamp>_scenario_play/migration.sql` (згенерує `migrate dev`)
- Modify: `types/scenario.ts`, `types/show.ts`, `types/battle.ts`
- Modify: `lib/schemas/scenario.ts:35`, `lib/schemas/show.ts`
- Modify: `lib/constants/api-errors.ts`
- Test: `lib/schemas/__tests__/scenario.test.ts`, `lib/schemas/__tests__/show.test.ts`

**Interfaces:**
- Produces:
  - `type ScenarioRowSlide = { deckId: string; slideId: string }`; `ScenarioRow { …; slide?: ScenarioRowSlide; battleId?: string }`
  - `interface ShowBattle { id: string; name: string }`; `ShowState.battle?: ShowBattle`
  - `ShowCommand` + `{ action: "battle"; battleId: string }`
  - `SlideDeck.scenarioPageId: string | null`, `SlideDeckSummary.scenarioPageId: string | null`
  - `interface BattleBrief { id: string; name: string; status: BattleStatus }` (у `types/battle.ts`)
  - `deckSceneSchema = z.object({ scenarioPageId: z.string().min(1).max(64).nullable() })`, тип `DeckSceneData = { scenarioPageId: string | null }` у `types/show.ts`
  - `API_ERRORS.SHOW_BATTLE_NOT_ACTIVE = "Бій ще не почався або вже завершений"`, `API_ERRORS.DECK_SCENE_INVALID = "Набір можна прив'язати лише до сцени цієї кампанії"`

- [ ] **Step 1: Failing schema tests**

Додати в `lib/schemas/__tests__/scenario.test.ts`:

```ts
describe("scenarioContentSchema — прив'язки рядка", () => {
  const doc = { type: "doc", content: [] };

  const content = (row: Record<string, unknown>) => ({ legend: [], sections: [{ id: "s1", title: "Розділ", played: false, rows: [{ id: "r1", story: doc, notes: doc, ...row }] }] });

  it("приймає slide і battleId", () => {
    const parsed = scenarioContentSchema.parse(content({ slide: { deckId: "d1", slideId: "slide-0001" }, battleId: "b1" }));

    expect(parsed.sections[0].rows[0]).toMatchObject({ slide: { deckId: "d1", slideId: "slide-0001" }, battleId: "b1" });
  });

  it("без прив'язок рядок як раніше", () => {
    expect(scenarioContentSchema.parse(content({})).sections[0].rows[0]).not.toHaveProperty("slide");
  });

  it("відкидає slide без slideId", () => {
    expect(scenarioContentSchema.safeParse(content({ slide: { deckId: "d1" } })).success).toBe(false);
  });
});
```

Додати в `lib/schemas/__tests__/show.test.ts`:

```ts
describe("showCommandSchema battle / deckSceneSchema", () => {
  it("команда battle з battleId", () => {
    expect(showCommandSchema.parse({ action: "battle", battleId: "b1" })).toEqual({ action: "battle", battleId: "b1" });
    expect(showCommandSchema.safeParse({ action: "battle" }).success).toBe(false);
  });

  it("сцена набору — id або null", () => {
    expect(deckSceneSchema.parse({ scenarioPageId: null })).toEqual({ scenarioPageId: null });
    expect(deckSceneSchema.parse({ scenarioPageId: "p1" })).toEqual({ scenarioPageId: "p1" });
    expect(deckSceneSchema.safeParse({ scenarioPageId: "" }).success).toBe(false);
  });
});
```

(імпорти `scenarioContentSchema`, `showCommandSchema`, `deckSceneSchema` — дописати до наявних у файлах.)

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run lib/schemas/__tests__/scenario.test.ts lib/schemas/__tests__/show.test.ts`
Expected: FAIL (`deckSceneSchema` не експортується, `slide` відкидається/зрізається).

- [ ] **Step 3: Types**

`types/scenario.ts`:

```ts
export interface ScenarioRowSlide {
  deckId: string;
  slideId: string;
}

export interface ScenarioRow {
  id: string;
  story: RichDoc;
  notes: RichDoc;
  slide?: ScenarioRowSlide;
  battleId?: string;
}
```

`types/show.ts` — додати й змінити:

```ts
export interface ShowBattle {
  id: string;
  name: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  scenarioPageId: string | null;
  slides: Slide[];
  updatedAt: string;
}

export interface SlideDeckSummary {
  id: string;
  title: string;
  scenarioPageId: string | null;
  slideCount: number;
  coverUrl: string | null;
  updatedAt: string;
}

export interface DeckSceneData {
  scenarioPageId: string | null;
}
```

У `ShowState` після `audio` додати рядок `/** Бій, до якого кличуть гравців; відсутнє — нікого не кличемо. */ battle?: ShowBattle;`. У `ShowCommand` додати `| { action: "battle"; battleId: string }`.

`types/battle.ts` (імпорт `BattleStatus` з `@/lib/constants/battle`, якщо його там ще немає — перевірити, що не утворює циклу; інакше `status: "prepared" | "active" | "completed"`):

```ts
export interface BattleBrief {
  id: string;
  name: string;
  status: BattleStatus;
}
```

- [ ] **Step 4: Schemas + errors**

`lib/schemas/scenario.ts` — замінити рядок `rows:` у `sectionSchema`:

```ts
const rowSchema = z.object({
  id: idSchema,
  story: docSchema,
  notes: docSchema,
  slide: z.object({ deckId: idSchema, slideId: z.string().min(1).max(64) }).optional(),
  battleId: idSchema.optional(),
});
```

і `rows: z.array(rowSchema).max(200),`. (`idSchema` max 40 — cuid вміщається; `slideId` має формат `slide-<uuid>` = 42 символи, тому окремо max 64.)

`lib/schemas/show.ts` — у `showCommandSchema` додати `z.object({ action: z.literal("battle"), battleId: z.string().min(1).max(64) }),`; нижче:

```ts
export const deckSceneSchema = z.object({ scenarioPageId: z.string().min(1).max(64).nullable() });
```

`lib/constants/api-errors.ts` — поруч із `SHOW_CONFLICT`:

```ts
  SHOW_BATTLE_NOT_ACTIVE: "Бій ще не почався або вже завершений",
  DECK_SCENE_INVALID: "Набір можна прив'язати лише до сцени цієї кампанії",
```

- [ ] **Step 5: Prisma + migration**

`prisma/schema.prisma`:
- `SlideDeck`: `scenarioPageId String?`, `scenarioPage ScenarioPage? @relation(fields: [scenarioPageId], references: [id], onDelete: SetNull)`, `@@index([scenarioPageId])`.
- `ScenarioPage`: `decks SlideDeck[]`.
- `CampaignShow`: `battle Json?` (після `audio`).

Run: `pnpm db:local` (якщо контейнер не запущено), потім `pnpm exec prisma migrate dev --name scenario_play`.
Перевірити, що `migration.sql` містить лише `ALTER TABLE "slide_decks" ADD COLUMN "scenarioPageId" TEXT;`, `ALTER TABLE "campaign_shows" ADD COLUMN "battle" JSONB;`, `CREATE INDEX …`, `ADD CONSTRAINT … ON DELETE SET NULL`. Ніяких `DROP`.

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test:run lib/schemas/__tests__/scenario.test.ts lib/schemas/__tests__/show.test.ts prisma/__tests__` → PASS.
Run: `pnpm exec tsc --noEmit` — очікувано впадуть місця, що будують `SlideDeck`/`SlideDeckSummary` (`deck-store.ts`) і тести з літералами наборів. `deck-store.ts` полагодити зараз: у `toSlideDeck` і `toDeckSummary` додати `scenarioPageId: row.scenarioPageId`. Тестові літерали `SlideDeck` у `lib/hooks/show/__tests__/*`, `app/api/__tests__/decks-api.test.ts` доповнити `scenarioPageId: null`. Повторити `tsc` до нуля помилок.

- [ ] **Step 7: Commit**

```bash
git add prisma types lib/schemas lib/constants/api-errors.ts lib/server/show/deck-store.ts lib/hooks/show/__tests__ app/api/__tests__
git commit -m "feat(scenario-play): data model for row bindings, deck scene and show battle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Команда показу `battle` і її збереження

**Files:**
- Modify: `lib/utils/show/show-command.ts`
- Modify: `lib/server/show/show-store.ts`
- Modify: `app/api/campaigns/[id]/show/show-handler.ts`
- Test: `lib/utils/show/__tests__/show-command.test.ts`, `app/api/__tests__/show-api.test.ts`

**Interfaces:**
- Consumes: `ShowBattle`, `ShowCommand.battle`, `API_ERRORS.SHOW_BATTLE_NOT_ACTIVE` (Task 1).
- Produces: `Ctx.battle?: { id: string; name: string; status: string } | null` у `applyShowCommand(prev, cmd, ctx)`; `POST /show {action:"battle", battleId}` → 200 `{ show }` з `show.battle`, 404 якщо бою немає в кампанії, 422 якщо не `active`.

- [ ] **Step 1: Failing unit tests** (`show-command.test.ts`, новий `describe`)

```ts
describe("команда battle", () => {
  const battle = (status: string) => ({ id: "b1", name: "Засідка", status });

  it("активний бій: battle у стані, музика зупинена, seq+1, слайд лишається", () => {
    const next = ok(applyShowCommand(showing(1, { audio: audio() }), { action: "battle", battleId: "b1" }, { ...ctx, battle: battle("active") }));

    expect(next.battle).toEqual({ id: "b1", name: "Засідка" });
    expect(next.slide).toEqual(s(2, "t2"));
    expect(next.audio).toMatchObject({ trackId: null, playing: false });
    expect(next.seq).toBe(5);
  });

  it("без запущеного показу — стан без слайда з battle", () => {
    const next = ok(applyShowCommand(null, { action: "battle", battleId: "b1" }, { ...ctx, battle: battle("active") }));

    expect(next).toMatchObject({ deckId: null, slide: null, battle: { id: "b1", name: "Засідка" }, seq: 1 });
  });

  it("бій не active — помилка", () => {
    for (const status of ["prepared", "completed"]) {
      expect(applyShowCommand(null, { action: "battle", battleId: "b1" }, { ...ctx, battle: battle(status) })).toEqual({ ok: false, message: "Бій ще не почався або вже завершений" });
    }
  });

  it("open / next / prev / end скидають battle", () => {
    const called = showing(0, { battle: { id: "b1", name: "Засідка" } });

    expect(ok(applyShowCommand(called, { action: "next" }, ctx))).not.toHaveProperty("battle");
    // з першого слайда prev нікуди не рухається і повертає той самий стан — тому з другого
    expect(ok(applyShowCommand(showing(1, { battle: { id: "b1", name: "Засідка" } }), { action: "prev" }, ctx))).not.toHaveProperty("battle");
    expect(ok(applyShowCommand(called, { action: "open", deckId: "d1", slideId: "slide-0003" }, ctx))).not.toHaveProperty("battle");
    expect(ok(applyShowCommand(called, { action: "end" }, ctx))).not.toHaveProperty("battle");
  });

  it("audio-команда не скидає battle", () => {
    const called = showing(0, { battle: { id: "b1", name: "Засідка" } });

    expect(ok(applyShowCommand(called, { action: "audio", command: { action: "play", trackId: "t1" } }, ctx)).battle).toEqual({ id: "b1", name: "Засідка" });
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run lib/utils/show/__tests__/show-command.test.ts` → FAIL.

- [ ] **Step 3: Implement in `show-command.ts`**

```ts
import { BattleStatus } from "@/lib/constants/battle";
import type { ShowBattle, ShowCommand, ShowState, Slide } from "@/types/show";

interface Ctx {
  now: number;
  deck: ShowDeck | null;
  library: AudioLibraryEntry[];
  battle?: (ShowBattle & { status: string }) | null;
}

function stopAudio(prev: ShowState | null, ctx: Ctx): BattleAudioState | null {
  const audio = prev?.audio ?? null;

  const stopped = audio?.trackId ? applyAudioCommand(audio, { action: "stop" }, ctx) : null;

  return stopped?.ok ? stopped.value : audio;
}

function callToBattle(prev: ShowState | null, battleId: string, ctx: Ctx): Outcome {
  const battle = ctx.battle;

  if (!battle || battle.id !== battleId) return fail(API_ERRORS.NOT_FOUND);

  if (battle.status !== BattleStatus.ACTIVE) return fail(API_ERRORS.SHOW_BATTLE_NOT_ACTIVE);

  return done({ ...(prev ?? EMPTY), audio: stopAudio(prev, ctx), battle: { id: battle.id, name: battle.name }, seq: (prev?.seq ?? 0) + 1 });
}
```

У `applyShowCommand`: гілка `end` → `return done({ ...EMPTY, audio: stopAudio(prev, ctx), seq: (prev?.seq ?? 0) + 1 });`; нова гілка `case "battle": return callToBattle(prev, cmd.battleId, ctx);`. `moveTo` уже будує новий об'єкт без `battle` — нічого не міняти. `deckIdFor` у handler повертає `null` для `battle` — так і треба.

- [ ] **Step 4: Run — PASS**

Run: `pnpm test:run lib/utils/show/__tests__/show-command.test.ts` → PASS (і старі тести теж: `battle` відсутній у їхніх станах).

- [ ] **Step 5: Store**

`lib/server/show/show-store.ts`: `SHOW_SELECT` + `battle: true`; у `toShowState` після `seq` — `...(row.battle ? { battle: row.battle as unknown as ShowBattle } : {}),`; у `writeShowState` `data` + `battle: json(next.battle ?? null)`. Імпорт `ShowBattle`.

- [ ] **Step 6: Failing API tests** (`show-api.test.ts`)

У `vi.mock("@/lib/db")` додати `battleScene: { findFirst: vi.fn() }`. Тести:

```ts
it("battle: активний бій — стан з battle, Pusher", async () => {
  vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", name: "Засідка", status: "active" } as never);

  const res = await post({ action: "battle", battleId: "b1" });

  expect(res.status).toBe(200);
  expect((await res.json()).show).toMatchObject({ battle: { id: "b1", name: "Засідка" }, seq: 1 });
  expect(vi.mocked(prisma.battleScene.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "b1", campaignId: "c1" } });
  expect(vi.mocked(prisma.campaignShow.createMany).mock.calls[0][0]).toMatchObject({ data: [{ battle: { id: "b1", name: "Засідка" } }] });

  await Promise.all(afterCallbacks.map((cb) => cb()));
  expect(trigger).toHaveBeenCalled();
});

it("battle: чужий/відсутній бій — 404 без запису", async () => {
  vi.mocked(prisma.battleScene.findFirst).mockResolvedValue(null);

  expect((await post({ action: "battle", battleId: "zz" })).status).toBe(404);
  expect(prisma.campaignShow.createMany).not.toHaveBeenCalled();
});

it("battle: завершений бій — 422", async () => {
  vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", name: "Засідка", status: "completed" } as never);

  expect((await post({ action: "battle", battleId: "b1" })).status).toBe(422);
});

it("стан без battle у БД — поле відсутнє у відповіді", async () => {
  vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[0], nextImageUrl: url(2), audio: null, battle: null, seq: 4 } as never);

  const res = await post({ action: "next" });

  expect((await res.json()).show).not.toHaveProperty("battle");
});
```

- [ ] **Step 7: Run — FAIL**, потім **Implement handler**

У `commandShow` після `deck`:

```ts
const battle = cmd.action === "battle" ? await prisma.battleScene.findFirst({ where: { id: cmd.battleId, campaignId }, select: { id: true, name: true, status: true } }) : null;

if (cmd.action === "battle" && !battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);
```

і передати `battle` у `ctx`: `applyShowCommand(prev, cmd, { now: Date.now(), deck, library, battle })`. Імпорт `prisma` з `@/lib/db`.

У `useShowControl` (`lib/hooks/show/useShowControl.ts`) розширити інвалідацію: `if (cmd.action === "open" || cmd.action === "end" || cmd.action === "battle")`.

- [ ] **Step 8: Run — PASS**

Run: `pnpm test:run lib/utils/show app/api/__tests__/show-api.test.ts app/api/__tests__/decks-api.test.ts lib/hooks/show` → PASS. Якщо `decks-api` перевіряє точні `data` для `updateMany` — додати `battle` у очікування (`Prisma.DbNull` або значення).

- [ ] **Step 9: Commit**

```bash
git add lib/utils/show lib/server/show app/api/campaigns/[id]/show lib/hooks/show app/api/__tests__
git commit -m "feat(show): battle command calls players to an active battle and stops show music

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: API сцени набору і короткий список боїв

**Files:**
- Modify: `app/api/campaigns/[id]/decks/deck-handlers.ts`, `app/api/campaigns/[id]/decks/[deckId]/route.ts`
- Modify: `app/api/campaigns/[id]/battles/route.ts` (GET)
- Modify: `lib/api/decks.ts`, `lib/api/battles.ts`
- Modify: `lib/hooks/battles/keys.ts`; Create: `lib/hooks/battles/useBattleBriefs.ts`; Modify: `lib/hooks/battles/index.ts`
- Modify: `lib/hooks/show/useDecks.ts`, `lib/hooks/show/index.ts`
- Test: `app/api/__tests__/decks-api.test.ts`, новий `app/api/__tests__/battles-brief-api.test.ts`, `lib/hooks/__tests__/keys.test.ts`

**Interfaces:**
- Consumes: `deckSceneSchema`, `DeckSceneData`, `BattleBrief`, `API_ERRORS.DECK_SCENE_INVALID` (Task 1).
- Produces:
  - `PATCH /api/campaigns/[id]/decks/[deckId]` body `DeckSceneData` → 200 `SlideDeck`; 400 `DECK_SCENE_INVALID`; `updatedAt` не змінюється.
  - `GET /api/campaigns/[id]/battles?brief=1` → `BattleBrief[]` (сортування `createdAt desc`).
  - `setDeckScene(campaignId, deckId, data: DeckSceneData): Promise<SlideDeck>` у `lib/api/decks.ts`
  - `getBattleBriefs(campaignId): Promise<BattleBrief[]>` у `lib/api/battles.ts`
  - `battleKeys.briefs(campaignId) = ["battle-briefs", campaignId]`
  - `useBattleBriefs(campaignId): UseQueryResult<BattleBrief[]>` (staleTime 15 000)
  - `useDeckScene(campaignId, deckId): { set(scenarioPageId: string | null): Promise<void>; pending: boolean }`

- [ ] **Step 1: Failing API tests**

`decks-api.test.ts` — у mock `prisma` додати `scenarioPage: { findFirst: vi.fn() }` і `slideDeck.update` (якщо ще немає). Тести (`patch` — хелпер за зразком наявного `put`, через `PATCH` з `@/app/api/campaigns/[id]/decks/[deckId]/route`):

```ts
it("PATCH сцени: своя сцена — зберігає, updatedAt не змінюється", async () => {
  vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({ updatedAt: new Date("2026-10-21T10:00:00Z") }) as never);
  vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1" } as never);
  vi.mocked(prisma.slideDeck.update).mockResolvedValue(deckRowWith({ scenarioPageId: "p1", updatedAt: new Date("2026-10-21T10:00:00Z") }) as never);

  const res = await patch("d1", { scenarioPageId: "p1" });

  expect(res.status).toBe(200);
  expect(vi.mocked(prisma.scenarioPage.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "p1", campaignId: "c1", kind: "scene" } });
  expect(vi.mocked(prisma.slideDeck.update).mock.calls[0][0]).toMatchObject({ data: { scenarioPageId: "p1", updatedAt: new Date("2026-10-21T10:00:00Z") } });
  expect((await res.json()).scenarioPageId).toBe("p1");
});

it("PATCH сцени: не сцена або чужа кампанія — 400", async () => {
  vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({}) as never);
  vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

  expect((await patch("d1", { scenarioPageId: "hero1" })).status).toBe(400);
  expect(prisma.slideDeck.update).not.toHaveBeenCalled();
});

it("PATCH сцени: null відв'язує без перевірки сторінки", async () => {
  vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({ scenarioPageId: "p1" }) as never);
  vi.mocked(prisma.slideDeck.update).mockResolvedValue(deckRowWith({ scenarioPageId: null }) as never);

  expect((await patch("d1", { scenarioPageId: null })).status).toBe(200);
  expect(prisma.scenarioPage.findFirst).not.toHaveBeenCalled();
});
```

(`deckRowWith(over)` — хелпер у файлі тесту, що повертає повний рядок `slide_decks` з `campaignId: "c1"`, `scenarioPageId: null`, `slides: []`, `sortOrder: 0`, `createdAt`, `updatedAt` + `over`; якщо в тесті вже є аналогічна фабрика — розширити її.)

Новий `app/api/__tests__/battles-brief-api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findMany: vi.fn() } } }));

const get = async (query: string) => {
  const { GET } = await import("@/app/api/campaigns/[id]/battles/route");

  return GET(new Request(`http://x/api/campaigns/c1/battles${query}`), { params: Promise.resolve({ id: "c1" }) });
};

describe("GET /battles?brief=1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true } as never);
    vi.mocked(prisma.battleScene.findMany).mockResolvedValue([{ id: "b1", name: "Засідка", status: "prepared" }] as never);
  });

  it("лише id/name/status", async () => {
    const res = await get("?brief=1");

    expect(await res.json()).toEqual([{ id: "b1", name: "Засідка", status: "prepared" }]);
    expect(vi.mocked(prisma.battleScene.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1" }, select: { id: true, name: true, status: true } });
  });
});
```

(Якщо `battles/route.ts` імпортує ще щось важке, що падає без моків, — додати потрібні `vi.mock` за зразком інших тестів у `app/api/__tests__`.)

`lib/hooks/__tests__/keys.test.ts` — додати `battleKeys.briefs(C)` у `allKeys`.

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run app/api/__tests__/decks-api.test.ts app/api/__tests__/battles-brief-api.test.ts lib/hooks/__tests__/keys.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`deck-handlers.ts`:

```ts
export function setDeckSceneHandler(req: Request, campaignId: string, deckId: string) {
  return asDM(campaignId, "set deck scene", async () => {
    const body = await parseBody(deckSceneSchema, req);

    if (body instanceof NextResponse) return body;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    if (body.scenarioPageId) {
      const page = await prisma.scenarioPage.findFirst({ where: { id: body.scenarioPageId, campaignId, kind: "scene" }, select: { id: true } });

      if (!page) return errorResponse(API_ERRORS.DECK_SCENE_INVALID, 400);
    }

    // прив'язка — не правка вмісту: expectedUpdatedAt відкритого редактора має лишитися дійсним
    const row = await prisma.slideDeck.update({ where: { id: deckId }, data: { scenarioPageId: body.scenarioPageId, updatedAt: deck.updatedAt } });

    return NextResponse.json(toSlideDeck(row));
  });
}
```

`decks/[deckId]/route.ts`:

```ts
export async function PATCH(req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return setDeckSceneHandler(req, id, deckId);
}
```

`battles/route.ts` GET — після перевірки доступу:

```ts
if (new URL(request.url).searchParams.get("brief") === "1") {
  const briefs = await prisma.battleScene.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true } });

  return NextResponse.json(briefs);
}
```

`lib/api/decks.ts`: `export const setDeckScene = (campaignId: string, deckId: string, data: DeckSceneData) => campaignPatch<SlideDeck>(campaignId, \`/decks/${deckId}\`, data);` (імпорт `campaignPatch`, `DeckSceneData`).

`lib/api/battles.ts`: `export const getBattleBriefs = (campaignId: string) => campaignGet<BattleBrief[]>(campaignId, "/battles?brief=1", { cache: "no-store" });`

`lib/hooks/battles/keys.ts`: `briefs: (campaignId: string) => ["battle-briefs", campaignId] as const,`.

`lib/hooks/battles/useBattleBriefs.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { battleKeys } from "./keys";

import { getBattleBriefs } from "@/lib/api/battles";
import type { BattleBrief } from "@/types/battle";

export function useBattleBriefs(campaignId: string, options: { enabled?: boolean } = {}) {
  return useQuery<BattleBrief[]>({ queryKey: battleKeys.briefs(campaignId), queryFn: () => getBattleBriefs(campaignId), staleTime: 15_000, enabled: options.enabled ?? true });
}
```

Експорт у `lib/hooks/battles/index.ts`. У `useBattleAction` (`lib/hooks/battles/useBattleAction.ts`) там, де інвалідується `"battles"`, додати також `battleKeys.briefs(campaignId)` — щоб старт/завершення бою оновлювали статуси в сценарії.

`lib/hooks/show/useDecks.ts`:

```ts
export function useDeckScene(campaignId: string, deckId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (scenarioPageId: string | null) => setDeckScene(campaignId, deckId, { scenarioPageId }),
    onSuccess: (deck) => {
      queryClient.setQueryData(showKeys.deck(campaignId, deckId), deck);
      void queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
    },
    onError: (error) => void notify(errorMessage(error, "Не вдалося прив'язати набір до сцени")),
  });

  return { set: (scenarioPageId: string | null) => mutateAsync(scenarioPageId).then(() => undefined, () => undefined), pending: isPending };
}
```

Експорт у `lib/hooks/show/index.ts`.

- [ ] **Step 4: Run — PASS**

Run: `pnpm test:run app/api/__tests__ lib/hooks` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api lib/api lib/hooks
git commit -m "feat(show): deck scene link endpoint and brief battle list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Логіка режиму гри (чиста + хук)

**Files:**
- Create: `lib/utils/scenario/play.ts`
- Modify: `lib/utils/scenario/structure.ts`
- Create: `lib/hooks/scenario/useScenarioPlay.ts`; Modify: `lib/hooks/scenario/index.ts`
- Test: `lib/utils/scenario/__tests__/play.test.ts`, `lib/utils/scenario/__tests__/structure.test.ts` (додати кейси; якщо файлу немає — створити)

**Interfaces:**
- Consumes: `ScenarioRow.slide/battleId`, `ShowState.battle`, `BattleBrief`, `useBattleBriefs`, `useShowState`, `useShowControl`, `usePusherShowSync`, `getDeck`, `startBattle` (наявний у `lib/api/battles.ts`).
- Produces:

```ts
// lib/utils/scenario/play.ts
export type RowSlideState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; slide: Slide; active: boolean };

export type RowBattleState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; battle: BattleBrief; called: boolean };

export interface PlayLookup {
  /** відсутній ключ — ще вантажиться; null — набору немає */
  decks: ReadonlyMap<string, Slide[] | null>;
  /** null — список боїв ще не завантажено */
  battles: ReadonlyMap<string, BattleBrief> | null;
  show: ShowState | null;
}

export function boundDeckIds(content: ScenarioContent): string[];
export function rowSlideState(row: ScenarioRow, lookup: PlayLookup): RowSlideState;
export function rowBattleState(row: ScenarioRow, lookup: PlayLookup): RowBattleState;
export type BattleAction = "start" | "call" | "none";
export function battleAction(state: RowBattleState): BattleAction;

// lib/utils/scenario/structure.ts
export const setRowSlide: (c: ScenarioContent, sectionId: string, rowId: string, slide: ScenarioRowSlide | undefined) => ScenarioContent;
export const setRowBattle: (c: ScenarioContent, sectionId: string, rowId: string, battleId: string | undefined) => ScenarioContent;

// lib/hooks/scenario/useScenarioPlay.ts
export interface ScenarioPlay {
  lookup: PlayLookup;
  showSlide(row: ScenarioRow): void;
  runBattle(row: ScenarioRow): void;
  pending: boolean;
  control: ShowControl;
}
export function useScenarioPlay(campaignId: string, content: ScenarioContent): ScenarioPlay;
```

- [ ] **Step 1: Failing tests** (`lib/utils/scenario/__tests__/play.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import { battleAction, boundDeckIds, type PlayLookup, rowBattleState, rowSlideState } from "../play";

import type { RichDoc, ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { ShowState, Slide } from "@/types/show";

const doc: RichDoc = { type: "doc", content: [] };

const row = (over: Partial<ScenarioRow> = {}): ScenarioRow => ({ id: "r1", story: doc, notes: doc, ...over });

const slide = (id: string): Slide => ({ id, imageUrl: `https://x/${id}.webp` });

const show = (over: Partial<ShowState> = {}): ShowState => ({ deckId: "d1", deckTitle: "Ліс", slide: slide("slide-a"), nextImageUrl: null, audio: null, seq: 1, ...over });

const lookup = (over: Partial<PlayLookup> = {}): PlayLookup => ({
  decks: new Map([["d1", [slide("slide-a"), slide("slide-b")]], ["gone", null]]),
  battles: new Map([["b1", { id: "b1", name: "Засідка", status: "prepared" }], ["b2", { id: "b2", name: "Вовки", status: "active" }], ["b3", { id: "b3", name: "Старий", status: "completed" }]]),
  show: show(),
  ...over,
});

describe("rowSlideState", () => {
  it("без прив'язки — none", () => expect(rowSlideState(row(), lookup())).toEqual({ kind: "none" }));

  it("поточний слайд показу — active", () => {
    expect(rowSlideState(row({ slide: { deckId: "d1", slideId: "slide-a" } }), lookup())).toEqual({ kind: "ready", slide: slide("slide-a"), active: true });
    expect(rowSlideState(row({ slide: { deckId: "d1", slideId: "slide-b" } }), lookup())).toMatchObject({ kind: "ready", active: false });
  });

  it("набір ще вантажиться — loading", () => expect(rowSlideState(row({ slide: { deckId: "d9", slideId: "x" } }), lookup())).toEqual({ kind: "loading" }));

  it("набору або слайда немає — missing", () => {
    expect(rowSlideState(row({ slide: { deckId: "gone", slideId: "x" } }), lookup())).toEqual({ kind: "missing" });
    expect(rowSlideState(row({ slide: { deckId: "d1", slideId: "slide-zzz" } }), lookup())).toEqual({ kind: "missing" });
  });
});

describe("rowBattleState / battleAction", () => {
  it("список не завантажено — loading; бою немає — missing", () => {
    expect(rowBattleState(row({ battleId: "b1" }), lookup({ battles: null }))).toEqual({ kind: "loading" });
    expect(rowBattleState(row({ battleId: "nope" }), lookup())).toEqual({ kind: "missing" });
  });

  it("called — коли показ уже кличе саме цей бій", () => {
    expect(rowBattleState(row({ battleId: "b2" }), lookup({ show: show({ battle: { id: "b2", name: "Вовки" } }) }))).toMatchObject({ kind: "ready", called: true });
    expect(rowBattleState(row({ battleId: "b2" }), lookup())).toMatchObject({ kind: "ready", called: false });
  });

  it("prepared → start, active → call, completed/missing → none", () => {
    expect(battleAction(rowBattleState(row({ battleId: "b1" }), lookup()))).toBe("start");
    expect(battleAction(rowBattleState(row({ battleId: "b2" }), lookup()))).toBe("call");
    expect(battleAction(rowBattleState(row({ battleId: "b3" }), lookup()))).toBe("none");
    expect(battleAction(rowBattleState(row({ battleId: "nope" }), lookup()))).toBe("none");
  });
});

describe("boundDeckIds", () => {
  it("унікальні набори з усіх рядків", () => {
    const content: ScenarioContent = { legend: [], sections: [{ id: "s", title: "", played: false, rows: [row({ slide: { deckId: "d1", slideId: "a" } }), row({ id: "r2", slide: { deckId: "d1", slideId: "b" } }), row({ id: "r3", slide: { deckId: "d2", slideId: "c" } }), row({ id: "r4" })] }] };

    expect(boundDeckIds(content)).toEqual(["d1", "d2"]);
  });
});
```

`structure.test.ts`:

```ts
it("setRowSlide / setRowBattle ставлять і знімають прив'язку без зайвих ключів", () => {
  const base = addSection(emptyContent(), "Р");

  const sectionId = base.sections[0].id;

  const rowId = base.sections[0].rows[0].id;

  const bound = setRowBattle(setRowSlide(base, sectionId, rowId, { deckId: "d1", slideId: "s1" }), sectionId, rowId, "b1");

  expect(bound.sections[0].rows[0]).toMatchObject({ slide: { deckId: "d1", slideId: "s1" }, battleId: "b1" });

  const cleared = setRowBattle(setRowSlide(bound, sectionId, rowId, undefined), sectionId, rowId, undefined);

  expect(cleared.sections[0].rows[0]).not.toHaveProperty("slide");
  expect(cleared.sections[0].rows[0]).not.toHaveProperty("battleId");
});
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run lib/utils/scenario` → FAIL.

- [ ] **Step 3: Implement `play.ts`**

```ts
import { BattleStatus } from "@/lib/constants/battle";
import type { BattleBrief } from "@/types/battle";
import type { ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { ShowState, Slide } from "@/types/show";

// типи RowSlideState / RowBattleState / PlayLookup / BattleAction — як в Interfaces

export const boundDeckIds = (content: ScenarioContent): string[] => [...new Set(content.sections.flatMap((s) => s.rows.flatMap((r) => (r.slide ? [r.slide.deckId] : []))))];

export function rowSlideState(row: ScenarioRow, lookup: PlayLookup): RowSlideState {
  if (!row.slide) return { kind: "none" };

  const { deckId, slideId } = row.slide;

  if (!lookup.decks.has(deckId)) return { kind: "loading" };

  const slide = lookup.decks.get(deckId)?.find((s) => s.id === slideId);

  if (!slide) return { kind: "missing" };

  return { kind: "ready", slide, active: lookup.show?.deckId === deckId && lookup.show.slide?.id === slideId };
}

export function rowBattleState(row: ScenarioRow, lookup: PlayLookup): RowBattleState {
  if (!row.battleId) return { kind: "none" };

  if (!lookup.battles) return { kind: "loading" };

  const battle = lookup.battles.get(row.battleId);

  if (!battle) return { kind: "missing" };

  return { kind: "ready", battle, called: lookup.show?.battle?.id === battle.id };
}

export function battleAction(state: RowBattleState): BattleAction {
  if (state.kind !== "ready") return "none";

  if (state.battle.status === BattleStatus.PREPARED) return "start";

  return state.battle.status === BattleStatus.ACTIVE ? "call" : "none";
}
```

`structure.ts`:

```ts
export const setRowSlide = (c: ScenarioContent, sectionId: string, rowId: string, slide: ScenarioRowSlide | undefined): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : slide ? { ...r, slide } : without(r, "slide"))) }));

export const setRowBattle = (c: ScenarioContent, sectionId: string, rowId: string, battleId: string | undefined): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : battleId ? { ...r, battleId } : without(r, "battleId"))) }));

function without<K extends "slide" | "battleId">(row: ScenarioRow, key: K): ScenarioRow {
  const { [key]: _, ...rest } = row;

  return rest;
}
```

(якщо `no-unused-vars` скаржиться на `_` — використати `const next = { ...row }; delete next[key]; return next;`.)

- [ ] **Step 4: Run — PASS**

Run: `pnpm test:run lib/utils/scenario` → PASS.

- [ ] **Step 5: Hook `useScenarioPlay`**

```ts
"use client";

import { useMemo } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";

import { startBattle } from "@/lib/api/battles";
import { ApiError } from "@/lib/api/client";
import { getDeck } from "@/lib/api/decks";
import { battleKeys, useBattleBriefs } from "@/lib/hooks/battles";
import { useNotify } from "@/lib/hooks/common";
import { showKeys, usePusherShowSync, type ShowControl, useShowControl, useShowState } from "@/lib/hooks/show";
import { errorMessage } from "@/lib/utils/common/error-message";
import { battleAction, boundDeckIds, type PlayLookup, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { Slide } from "@/types/show";

export interface ScenarioPlay {
  lookup: PlayLookup;
  showSlide(row: ScenarioRow): void;
  runBattle(row: ScenarioRow): void;
  pending: boolean;
  control: ShowControl;
}

export function useScenarioPlay(campaignId: string, content: ScenarioContent): ScenarioPlay {
  const queryClient = useQueryClient();

  const notify = useNotify();

  usePusherShowSync(campaignId);

  const { show } = useShowState(campaignId);

  const control = useShowControl(campaignId, notify);

  const { data: briefs } = useBattleBriefs(campaignId);

  const deckIds = boundDeckIds(content);

  const deckQueries = useQueries({
    queries: deckIds.map((deckId) => ({
      queryKey: showKeys.deck(campaignId, deckId),
      queryFn: () => getDeck(campaignId, deckId),
      staleTime: 30_000,
      retry: (count: number, error: unknown) => !(error instanceof ApiError && error.status === 404) && count < 2,
    })),
  });

  const decks = useMemo(() => {
    const map = new Map<string, Slide[] | null>();

    deckQueries.forEach((q, i) => {
      if (q.data) map.set(deckIds[i], q.data.slides);
      else if (q.error instanceof ApiError && q.error.status === 404) map.set(deckIds[i], null);
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deckQueries — новий масив щорендеру; залежимо від даних
  }, [deckIds.join(), ...deckQueries.map((q) => q.data), ...deckQueries.map((q) => q.error)]);
```

> Якщо `exhaustive-deps` не дозволяє такі залежності — прибрати `useMemo` і будувати `Map` прямо в рендері (дешево: кілька наборів).

```ts
  const battles = useMemo(() => (briefs ? new Map(briefs.map((b) => [b.id, b])) : null), [briefs]);

  const lookup: PlayLookup = { decks, battles, show };

  const battleRun = useMutation({
    mutationFn: async (row: ScenarioRow) => {
      const action = battleAction(rowBattleState(row, lookup));

      if (action === "none" || !row.battleId) return;

      if (action === "start") await startBattle(campaignId, row.battleId, {});

      await control.send({ action: "battle", battleId: row.battleId });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: battleKeys.briefs(campaignId) });
      void queryClient.invalidateQueries({ queryKey: battleKeys.active() });
    },
    onError: (error) => void notify(errorMessage(error, "Не вдалося почати бій")),
  });

  return {
    lookup,
    showSlide: (row) => {
      if (row.slide && rowSlideState(row, lookup).kind === "ready") void control.send({ action: "open", deckId: row.slide.deckId, slideId: row.slide.slideId });
    },
    runBattle: (row) => battleRun.mutate(row),
    pending: control.pending || battleRun.isPending,
    control,
  };
}
```

Експорт у `lib/hooks/scenario/index.ts`: `export { type ScenarioPlay, useScenarioPlay } from "./useScenarioPlay";`.

Перевірити, що `lib/hooks/show/index.ts` → `lib/hooks/scenario` не створює циклу (scenario імпортує show, не навпаки — ок).

- [ ] **Step 6: Run lint + tests**

Run: `pnpm lint --fix lib/hooks/scenario lib/utils/scenario && pnpm test:run lib/utils/scenario lib/hooks` → PASS, 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/scenario lib/hooks/scenario
git commit -m "feat(scenario-play): row play state and useScenarioPlay hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Редактор — сцена набору і прив'язки рядка

**Files:**
- Create: `components/show/editor/DeckSceneSelect.tsx`
- Modify: `app/campaigns/[id]/dm/show/[deckId]/page-client.tsx`
- Modify: `components/show/editor/DeckCard.tsx`, `app/campaigns/[id]/dm/show/page-client.tsx` (назва сцени на картці)
- Create: `components/scenario/editor/RowBindings.tsx`, `components/scenario/editor/SlidePickerDialog.tsx`, `components/scenario/editor/BattlePickerDialog.tsx`
- Modify: `components/scenario/editor/ScenarioEditor.tsx`
- Test: `components/scenario/editor/__tests__/row-bindings.test.tsx`, `components/show/__tests__/DeckSceneSelect.test.tsx`

**Interfaces:**
- Consumes: `useDeckScene`, `useDecks`, `useDeck` (show), `useScenarioPages` (scenario), `useBattleBriefs` (battles), `setRowSlide`, `setRowBattle`, `ScenarioRowSlide`.
- Produces:
  - `DeckSceneSelect({ campaignId, deck }: { campaignId: string; deck: SlideDeck })`
  - `RowBindings({ campaignId, pageId, row, onChange }: { campaignId: string; pageId: string; row: ScenarioRow; onChange: { slide(v: ScenarioRowSlide | undefined): void; battle(v: string | undefined): void } })`
  - `SlidePickerDialog({ campaignId, pageId, open, onOpenChange, onPick }: { …; onPick(v: ScenarioRowSlide): void })`
  - `BattlePickerDialog({ campaignId, open, onOpenChange, onPick }: { …; onPick(battleId: string): void })`

- [ ] **Step 1: Failing component tests**

`components/show/__tests__/DeckSceneSelect.test.tsx` (happy-dom; моки хуків через `vi.mock("@/lib/hooks/show", …)` і `vi.mock("@/lib/hooks/scenario", …)`):

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckSceneSelect } from "@/components/show/editor/DeckSceneSelect";

const set = vi.fn();

vi.mock("@/lib/hooks/show", () => ({ useDeckScene: () => ({ set, pending: false }) }));
vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioPages: () => ({ data: [{ id: "p1", kind: "scene", title: "Монастир" }, { id: "h1", kind: "hero", title: "Годрик" }] }),
}));

afterEach(cleanup);

describe("DeckSceneSelect", () => {
  it("лише сцени; вибір і скидання", () => {
    render(<DeckSceneSelect campaignId="c" deck={{ id: "d1", title: "Ліс", scenarioPageId: null, slides: [], updatedAt: "" }} />);

    const select = screen.getByLabelText("Сцена") as HTMLSelectElement;

    expect([...select.options].map((o) => o.textContent)).toEqual(["Без сцени", "Монастир"]);

    fireEvent.change(select, { target: { value: "p1" } });
    expect(set).toHaveBeenCalledWith("p1");

    fireEvent.change(select, { target: { value: "" } });
    expect(set).toHaveBeenLastCalledWith(null);
  });
});
```

`components/scenario/editor/__tests__/row-bindings.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RowBindings } from "@/components/scenario/editor/RowBindings";

vi.mock("@/lib/hooks/show", () => ({
  useDeck: (_c: string, id: string | null) => ({ data: id === "d1" ? { id: "d1", title: "Ліс", scenarioPageId: "p1", slides: [{ id: "slide-a", imageUrl: "https://x/a.webp", title: "Галявина" }], updatedAt: "" } : undefined }),
  useDecks: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/battles", () => ({ useBattleBriefs: () => ({ data: [{ id: "b1", name: "Засідка", status: "prepared" }] }) }));
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: (p: { alt: string }) => <img alt={p.alt} /> }));

afterEach(cleanup);

const doc = { type: "doc" as const, content: [] };

describe("RowBindings", () => {
  it("чипи прив'язок і відв'язування", () => {
    const onChange = { slide: vi.fn(), battle: vi.fn() };

    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc, slide: { deckId: "d1", slideId: "slide-a" }, battleId: "b1" }} onChange={onChange} />);

    expect(screen.getByText("Галявина")).toBeTruthy();
    expect(screen.getByText("⚔ Засідка")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Відв'язати слайд" }));
    expect(onChange.slide).toHaveBeenCalledWith(undefined);

    fireEvent.click(screen.getByRole("button", { name: "Відв'язати бій" }));
    expect(onChange.battle).toHaveBeenCalledWith(undefined);
  });

  it("слайд зник — «недоступно»", () => {
    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc, slide: { deckId: "d1", slideId: "slide-gone" } }} onChange={{ slide: vi.fn(), battle: vi.fn() }} />);

    expect(screen.getByText("Слайд недоступний")).toBeTruthy();
  });

  it("без прив'язок — кнопки «Слайд» і «Бій»", () => {
    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc }} onChange={{ slide: vi.fn(), battle: vi.fn() }} />);

    expect(screen.getByRole("button", { name: "Прив'язати слайд" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Прив'язати бій" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run components/show/__tests__/DeckSceneSelect.test.tsx components/scenario/editor/__tests__/row-bindings.test.tsx` → FAIL.

- [ ] **Step 3: `DeckSceneSelect`**

```tsx
"use client";

import { useScenarioPages } from "@/lib/hooks/scenario";
import { useDeckScene } from "@/lib/hooks/show";
import type { SlideDeck } from "@/types/show";

export function DeckSceneSelect({ campaignId, deck }: { campaignId: string; deck: SlideDeck }) {
  const { data: pages = [] } = useScenarioPages(campaignId);

  const scene = useDeckScene(campaignId, deck.id);

  return (
    <label className="flex items-center gap-2 text-sm text-hud-muted">
      Сцена
      <select
        aria-label="Сцена"
        value={deck.scenarioPageId ?? ""}
        disabled={scene.pending}
        onChange={(e) => void scene.set(e.target.value || null)}
        className="h-9 rounded border border-hud-rule bg-black/70 px-2 text-sm text-hud-bone"
      >
        <option value="">Без сцени</option>
        {pages
          .filter((p) => p.kind === "scene")
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
      </select>
    </label>
  );
}
```

У `[deckId]/page-client.tsx`: `const { data: live = deck } = useDeck(campaignId, deck.id, { initial: deck });` і під полем назви — `<DeckSceneSelect campaignId={campaignId} deck={live} />`.

`DeckCard` — новий необов'язковий prop `scene?: string` (≤7 props), рядок `<p className="text-xs text-hud-muted">Сцена: {scene}</p>`, якщо є. У `dm/show/page-client.tsx`: `const { data: pages = [] } = useScenarioPages(campaignId);` і `scene={pages.find((p) => p.id === deck.scenarioPageId)?.title}`.

- [ ] **Step 4: `SlidePickerDialog`, `BattlePickerDialog`, `RowBindings`**

`SlidePickerDialog`: `ResponsiveDialog hud title="Слайд для абзацу"`. Тіло — `useDecks(campaignId)`; поділ `own = decks.filter(d => d.scenarioPageId === pageId)`, `others = решта`. Стан `openDeckId` (за замовчуванням `own[0]?.id ?? null`). Список наборів кнопками (власні; потім заголовок «Інші набори» і решта); вибраний набір розгортає сітку мініатюр через `useDeck(campaignId, openDeckId)` — `OptimizedImage` 96×54, `aria-label={slide.title ?? \`Слайд ${i + 1}\`}`; клік → `onPick({ deckId, slideId: slide.id }); onOpenChange(false)`. Порожньо — `EmptyState` «Немає наборів слайдів».

`BattlePickerDialog`: `ResponsiveDialog hud title="Бій для абзацу"`, `useBattleBriefs(campaignId, { enabled: open })`, список кнопок `{name} · {STATUS_LABEL[status]}` (локальна мапа `{ prepared: "підготовлений", active: "йде", completed: "завершений" }`), `completed` у кінці (`[...briefs].sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed"))`). Клік → `onPick(id)` і закрити.

`RowBindings`:

```tsx
"use client";

import { useState } from "react";
import { Image as ImageIcon, Swords, X } from "lucide-react";

import { BattlePickerDialog } from "./BattlePickerDialog";
import { SlidePickerDialog } from "./SlidePickerDialog";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useBattleBriefs } from "@/lib/hooks/battles";
import { useDeck } from "@/lib/hooks/show";
import type { ScenarioRow, ScenarioRowSlide } from "@/types/scenario";

type Props = { campaignId: string; pageId: string; row: ScenarioRow; onChange: { slide(v: ScenarioRowSlide | undefined): void; battle(v: string | undefined): void } };

export function RowBindings({ campaignId, pageId, row, onChange }: Props) {
  const [picking, setPicking] = useState<"slide" | "battle" | null>(null);

  const { data: deck } = useDeck(campaignId, row.slide?.deckId ?? null);

  const { data: briefs } = useBattleBriefs(campaignId, { enabled: !!row.battleId });

  const slide = row.slide && deck?.slides.find((s) => s.id === row.slide?.slideId);

  const battle = row.battleId && briefs?.find((b) => b.id === row.battleId);

  return (
    <div className="sb-bindings sans">
      {row.slide ? (
        <span className="sb-chip">
          {slide ? (
            <>
              <OptimizedImage src={slide.imageUrl} alt="" width={48} height={27} className="h-[27px] w-12 rounded object-cover" />
              {slide.title ?? deck?.title}
            </>
          ) : (
            deck && "Слайд недоступний"
          )}
          <button type="button" aria-label="Відв'язати слайд" onClick={() => onChange.slide(undefined)}>
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button type="button" className="toggle" aria-label="Прив'язати слайд" onClick={() => setPicking("slide")}>
          <ImageIcon className="size-3" /> Слайд
        </button>
      )}
      {row.battleId ? (
        <span className="sb-chip">
          {battle ? `⚔ ${battle.name}` : briefs && "Бій недоступний"}
          <button type="button" aria-label="Відв'язати бій" onClick={() => onChange.battle(undefined)}>
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button type="button" className="toggle" aria-label="Прив'язати бій" onClick={() => setPicking("battle")}>
          <Swords className="size-3" /> Бій
        </button>
      )}
      <SlidePickerDialog campaignId={campaignId} pageId={pageId} open={picking === "slide"} onOpenChange={(v) => setPicking(v ? "slide" : null)} onPick={onChange.slide} />
      <BattlePickerDialog campaignId={campaignId} open={picking === "battle"} onOpenChange={(v) => setPicking(v ? "battle" : null)} onPick={onChange.battle} />
    </div>
  );
}
```

> Тест «слайд зник» мокає `useDeck` з набором `d1` без `slide-gone` → показує «Слайд недоступний».

У `ScenarioEditor.tsx`, в `<aside className="notes">` перед блоком `OrderButtons`:

```tsx
<RowBindings
  campaignId={campaignId}
  pageId={page.id}
  row={r}
  onChange={{ slide: (v) => draft.setContent((c) => setRowSlide(c, s.id, r.id, v)), battle: (v) => draft.setContent((c) => setRowBattle(c, s.id, r.id, v)) }}
/>
```

CSS у `components/scenario/scenario-book.css`:

```css
.sb-bindings { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.sb-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 6px; border: 1px solid var(--rule, currentColor); border-radius: 6px; font-size: 12px; }
```

(перед додаванням перевірити, які CSS-змінні реально використовує `scenario-book.css`, і взяти їх замість `--rule`).

- [ ] **Step 5: Run — PASS** + наявні тести редактора

Run: `pnpm test:run components/scenario components/show` → PASS. Якщо `scenario-editor.test.tsx` падає через нові хуки в `RowBindings` — додати в нього `vi.mock` для `@/lib/hooks/show` (`useDeck`, `useDecks`) і `@/lib/hooks/battles` (`useBattleBriefs`) з порожніми даними.

- [ ] **Step 6: Commit**

```bash
git add components app/campaigns
git commit -m "feat(scenario-play): bind decks to scenes and rows to slides/battles in editors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Режим гри в сценарії — клік по абзацу, кнопка бою, панель показу

**Files:**
- Create: `components/scenario/play/RowPlayControls.tsx`, `components/scenario/play/ScenarioShowDock.tsx`
- Modify: `components/scenario/ScenarioPageView.tsx`, `components/scenario/scenario-book.css`
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`
- Test: `components/scenario/__tests__/scenario-page-view.test.tsx`

**Interfaces:**
- Consumes: `useScenarioPlay` / `ScenarioPlay` (Task 4), `rowSlideState`, `rowBattleState`, `battleAction`, `ShowControlPanel`, `AudioPlayerProvider`, `AudioDock`, `useShowAudioHost`.
- Produces: `ScenarioPageView` отримує необов'язковий prop `play?: ScenarioPlay`; без нього рендер незмінний.

- [ ] **Step 1: Failing tests** (`scenario-page-view.test.tsx`, новий `describe`)

```tsx
describe("ScenarioPageView — режим гри", () => {
  const doc = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

  const mention = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "mention" as const, attrs: { type: "unit", id: "u1", label: "Вовк" } }] }] };

  const pageWith = (rows: ScenarioRow[]): ScenarioPage => ({ ...basePage, content: { legend: [], sections: [{ id: "s1", title: "Розділ", played: false, rows }] } });

  const play = (over: Partial<ScenarioPlay> = {}): ScenarioPlay => ({
    lookup: {
      decks: new Map([["d1", [{ id: "slide-a", imageUrl: "https://x/a.webp" }]]]),
      battles: new Map([["b1", { id: "b1", name: "Засідка", status: "prepared" }], ["b3", { id: "b3", name: "Старий", status: "completed" }]]),
      show: null,
    },
    showSlide: vi.fn(),
    runBattle: vi.fn(),
    pending: false,
    control: { send: vi.fn(), pending: false },
    ...over,
  });

  it("клік по рядку зі слайдом — showSlide; по згадці — ні", () => {
    const p = play();

    const row = { id: "r1", story: mention, notes: doc(""), slide: { deckId: "d1", slideId: "slide-a" } };

    render(<ScenarioPageView page={pageWith([row])} campaignId="c" play={p} />);

    fireEvent.click(screen.getByText("Вовк"));
    expect(p.showSlide).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Показати слайд" }));
    expect(p.showSlide).toHaveBeenCalledWith(row);
  });

  it("активний рядок має is-current", () => {
    const p = play({ lookup: { ...play().lookup, show: { deckId: "d1", deckTitle: "Ліс", slide: { id: "slide-a", imageUrl: "https://x/a.webp" }, nextImageUrl: null, audio: null, seq: 1 } } });

    const { container } = render(<ScenarioPageView page={pageWith([{ id: "r1", story: doc("Текст"), notes: doc(""), slide: { deckId: "d1", slideId: "slide-a" } }])} campaignId="c" play={p} />);

    expect(container.querySelector(".row.is-current")).toBeTruthy();
  });

  it("кнопки бою за статусом; завершений — неактивна", () => {
    const p = play();

    render(<ScenarioPageView page={pageWith([{ id: "r1", story: doc("А"), notes: doc(""), battleId: "b1" }, { id: "r2", story: doc("Б"), notes: doc(""), battleId: "b3" }])} campaignId="c" play={p} />);

    fireEvent.click(screen.getByRole("button", { name: "⚔ Почати бій «Засідка»" }));
    expect(p.runBattle).toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Бій завершено" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("висяче посилання — «недоступно», без кнопки", () => {
    render(<ScenarioPageView page={pageWith([{ id: "r1", story: doc("А"), notes: doc(""), slide: { deckId: "gone", slideId: "x" } }])} campaignId="c" play={play({ lookup: { ...play().lookup, decks: new Map([["gone", null]]) } })} />);

    expect(screen.getByText("Слайд недоступний")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Показати слайд" })).toBeNull();
  });
});
```

(`basePage` — наявна у файлі фабрика сторінки або нова: `{ id: "p", kind: "scene", arc: null, title: "Т", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 0, updatedAt: "" }`; імпорти `ScenarioPlay` з `@/lib/hooks/scenario`, типи з `@/types/scenario`. Якщо `ScenarioRichText` рендерить згадку як посилання з іншим текстом — підлаштувати селектор під фактичну розмітку.)

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run components/scenario/__tests__/scenario-page-view.test.tsx` → FAIL.

- [ ] **Step 3: `RowPlayControls`**

```tsx
"use client";

import Link from "next/link";
import { Play, Swords } from "lucide-react";

import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { battleAction, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioRow } from "@/types/scenario";

export function RowPlayControls({ campaignId, row, play }: { campaignId: string; row: ScenarioRow; play: ScenarioPlay }) {
  const slide = rowSlideState(row, play.lookup);

  const battle = rowBattleState(row, play.lookup);

  const action = battleAction(battle);

  if (slide.kind === "none" && battle.kind === "none") return null;

  return (
    <div className="sb-play sans">
      {slide.kind === "ready" && (
        <button type="button" className="toggle" aria-pressed={slide.active} disabled={play.pending} onClick={() => play.showSlide(row)}>
          <Play className="size-3" /> Показати слайд
        </button>
      )}
      {slide.kind === "missing" && <span className="sb-missing">Слайд недоступний</span>}
      {battle.kind === "missing" && <span className="sb-missing">Бій недоступний</span>}
      {battle.kind === "ready" && action !== "none" && (
        <button type="button" className="toggle" disabled={play.pending} onClick={() => play.runBattle(row)}>
          <Swords className="size-3" /> {action === "start" ? `⚔ Почати бій «${battle.battle.name}»` : battle.called ? "Покликати ще раз" : "⚔ Покликати в бій"}
        </button>
      )}
      {battle.kind === "ready" && battle.battle.status === "active" && (
        <Link className="toggle" href={`/campaigns/${campaignId}/battles/${battle.battle.id}`} target="_blank" rel="noopener">
          Перейти до бою ↗
        </Link>
      )}
      {battle.kind === "ready" && action === "none" && battle.battle.status === "completed" && (
        <button type="button" className="toggle" disabled>
          Бій завершено
        </button>
      )}
    </div>
  );
}
```

> `aria-label` кнопки старту = видимий текст «⚔ Почати бій «Засідка»» (тест шукає за ним).

- [ ] **Step 4: `ScenarioPageView`**

Додати prop `play?: ScenarioPlay`. Для кожного рядка:

```tsx
const slideState = play ? rowSlideState(r, play.lookup) : null;

const clickable = slideState?.kind === "ready";

<div
  key={r.id}
  className={cn("row", clickable && "is-slide", slideState?.kind === "ready" && slideState.active && "is-current")}
  onClick={clickable ? (e) => {
    // клік по посиланню, кнопці чи виділення тексту не перемикає слайд
    if ((e.target as HTMLElement).closest("a, button") || window.getSelection()?.toString()) return;

    play?.showSlide(r);
  } : undefined}
>
  <div className="story">…</div>
  <aside className="notes">
    …наявне…
    {play && <RowPlayControls campaignId={campaignId} row={r} play={play} />}
  </aside>
</div>
```

`RowPlayControls` має бути і в гілці `isDocEmpty(r.notes)` — переписати так, щоб `<aside className="notes">` завжди містив `RowPlayControls`, а `ScenarioRichText` — лише коли нотатки не порожні. Імпорт `cn` з `@/lib/utils`.

CSS (`scenario-book.css`):

```css
.row.is-slide { cursor: pointer; border-radius: 6px; transition: box-shadow 0.15s; }
.row.is-slide:hover { box-shadow: 0 0 0 1px var(--gold, #c9a227); }
.row.is-current { box-shadow: 0 0 0 2px var(--gold, #c9a227); }
.sb-play { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.sb-missing { font-size: 12px; opacity: 0.7; }
.sb-show-dock { position: sticky; bottom: 0; z-index: 20; }
```

(звірити з наявними змінними кольору в `scenario-book.css`; у режимі «Сховати нотатки» `.notes` ховається — `RowPlayControls` має лишатися видимим: якщо `hideNotes` ховає весь `aside`, перенести `RowPlayControls` у кінець `.story` замість `aside`.)

- [ ] **Step 5: `ScenarioShowDock` і сторінка**

```tsx
"use client";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { ShowControlPanel } from "@/components/show/stage/ShowControlPanel";
import { useNotify } from "@/lib/hooks/common";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { useShowAudioHost } from "@/lib/hooks/show";

export function ScenarioShowDock({ campaignId, play }: { campaignId: string; play: ScenarioPlay }) {
  const notify = useNotify();

  const host = useShowAudioHost({ campaignId, isDM: true, onFailure: notify });

  return (
    <AudioPlayerProvider host={host}>
      <div className="sb-show-dock">
        <div className="flex items-end gap-2">
          <AudioDock placement="strip" />
        </div>
        <ShowControlPanel campaignId={campaignId} show={play.lookup.show} control={play.control} />
      </div>
    </AudioPlayerProvider>
  );
}
```

У `[pageId]/page-client.tsx` в `ScenarioPageBody`:

```tsx
const play = useScenarioPlay(campaignId, page.content);
```

передати `play={play}` у `ScenarioPageView` і після нього (лише коли `!editBase`) — `<ScenarioShowDock campaignId={campaignId} play={play} />`. Кнопка в `actions` поруч із «Версії»: `<Link className="toggle" href={\`/campaigns/${campaignId}/show\`} target="_blank">Екран показу ↗</Link>`.

> Якщо `AudioDock placement="strip"` погано виглядає поза картою бою — використати `placement="corner"`; перевірити в браузері (Task 8).

- [ ] **Step 6: Run — PASS**

Run: `pnpm test:run components/scenario app/campaigns` → PASS.
Run: `pnpm lint` → 0 errors.

- [ ] **Step 7: Commit**

```bash
git add components/scenario app/campaigns
git commit -m "feat(scenario-play): play mode — click a row to show its slide, start/call battles, show dock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: «До бою!» на екрані показу

**Files:**
- Create: `components/show/stage/ShowBattleCall.tsx`
- Modify: `app/campaigns/[id]/show/page-client.tsx`
- Test: `components/show/__tests__/ShowBattleCall.test.tsx`

**Interfaces:**
- Consumes: `ShowState.battle`, `ShowBattle`.
- Produces: `ShowBattleCall({ campaignId, battle }: { campaignId: string; battle: ShowBattle })`.

- [ ] **Step 1: Failing test**

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShowBattleCall } from "@/components/show/stage/ShowBattleCall";

afterEach(cleanup);

describe("ShowBattleCall", () => {
  it("посилання на бій з назвою", () => {
    render(<ShowBattleCall campaignId="c1" battle={{ id: "b1", name: "Засідка" }} />);

    const link = screen.getByRole("link", { name: /До бою!/ });

    expect(link.getAttribute("href")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getByText("Засідка")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm test:run components/show/__tests__/ShowBattleCall.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

```tsx
import Link from "next/link";
import { Swords } from "lucide-react";

import type { ShowBattle } from "@/types/show";

export function ShowBattleCall({ campaignId, battle }: { campaignId: string; battle: ShowBattle }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <Link
        href={`/campaigns/${campaignId}/battles/${battle.id}`}
        className="pointer-events-auto flex flex-col items-center gap-1 rounded-xl border-2 border-hud-gold-strong bg-black/80 px-10 py-6 text-hud-bone shadow-2xl animate-pulse hover:animate-none"
      >
        <span className="flex items-center gap-3 text-3xl font-bold uppercase tracking-wide">
          <Swords className="size-8" />
          До бою!
        </span>
        <span className="text-sm text-hud-muted">{battle.name}</span>
      </Link>
    </div>
  );
}
```

У `show/page-client.tsx` всередині `<div className="relative min-h-[60dvh] flex-1">` після `ShowStage`: `{show?.battle && <ShowBattleCall campaignId={campaignId} battle={show.battle} />}`.

- [ ] **Step 4: Run — PASS**

Run: `pnpm test:run components/show` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/show app/campaigns/[id]/show
git commit -m "feat(show): big «До бою!» call on the show screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Повна перевірка і браузер

**Files:** — (лише фікси за результатами)

- [ ] **Step 1: Повні тести, lint, typecheck, build**

Run: `pnpm test:run` → усі PASS.
Run: `pnpm lint` → 0 errors.
Run: `pnpm exec tsc --noEmit` → 0 errors.
Run: `pnpm build` → успіх.

- [ ] **Step 2: Локальна prodcopy**

Run: `./scripts/db/prodcopy-db.sh` (якщо БД `prodcopy` застаріла), потім `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm exec prisma migrate deploy` і `DATABASE_URL=… pnpm dev` з worktree (інший порт, якщо 3000 зайнятий: `-p 3100`).

- [ ] **Step 3: Сценарій перевірки в браузері (DM + гравець у двох вікнах)**

1. DM: «Показ» → набір → «Сцена» = сцена зі сценарію; відкрити редактор набору ще раз і зберегти слайди — без 409.
2. DM: сценарій → «Редагувати» → у рядку «Слайд» (набори сцени зверху, «Інші набори» нижче) і «Бій» (підготовлений бій); «Готово».
3. Гравець: `/campaigns/<id>/show`.
4. DM: клік по рядку → у гравця слайд і трек слайда; рядок підсвічено; клік по @-згадці не перемикає.
5. DM: панель внизу — ‹ ›, перемикання треку в плеєрі, видно в гравця.
6. DM: «⚔ Почати бій» → у гравця «До бою!», музика показу зупинилась; у DM з'явилось «Перейти до бою ↗»; гравець переходить у бій.
7. DM: наступний слайд → «До бою!» зникає.
8. Видалити слайд, прив'язаний до рядка → рядок «Слайд недоступний», не клікабельний.
9. Мобільна ширина (375 px): сценарій з панеллю — без горизонтального скролу; показ із «До бою!».

Після перевірки видалити тестові бої/набори з prodcopy (див. memory «Test battles»).

- [ ] **Step 4: Commit fixes (якщо були)**

```bash
git add -A
git commit -m "fix(scenario-play): browser check fixes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
