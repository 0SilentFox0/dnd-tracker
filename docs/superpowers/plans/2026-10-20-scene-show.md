# «Показ» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ готує набори слайдів (картинка + заголовок/підпис + необов'язковий трек) і показує їх гравцям синхронно на сторінці `/campaigns/[id]/show`; музика — той самий плеєр, що в бою.

**Architecture:** Нові таблиці `slide_decks` і `campaign_shows`; чиста функція `applyShowCommand` (поверх наявної `applyAudioCommand`) виконує команди показу; маршрути `decks` (CRUD, ДМ) і `show` (GET усім учасникам, POST ДМ) з блокуванням за `seq`; Pusher-канал `private-show-<campaignId>`. Плеєр бою узагальнюється до `AudioHost` і переїжджає в `lib/hooks/audio` + `components/audio`; бій і показ дають свій хост.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 / PostgreSQL (Supabase), Supabase Storage, Pusher, TanStack Query, Zod, Vitest (+ happy-dom для DOM-тестів).

**Spec:** `docs/superpowers/specs/2026-10-20-scene-show-design.md`

## Global Constraints

- Робоча папка — worktree `/Users/silentfox/Work/dnd-tracker-show`, гілка `feat/scene-show`. Основна папка `/Users/silentfox/Work/dnd-tracker` і інші worktree — НЕ чіпати.
- Пакетний менеджер `pnpm`; тести `pnpm test:run <file>`; lint `pnpm lint`; типи `pnpm exec tsc --noEmit`.
- Тексти UI й помилок — українською; ідентифікатори — англійською. Помилки API — `{ error }` з текстами в `lib/constants/api-errors.ts`.
- Коментарі мінімальні: лише неочевидне «чому», один рядок.
- Імпорти через `@/…`; `simple-import-sort`; порожній рядок навколо `const`/`if`/`return`/блоків (`padding-line-between-statements`); `react-hooks/exhaustive-deps` = error; без `console.log` у lib/components.
- Компоненти не імпортують `@/lib/api/*`; запити — у `lib/api/<domain>`, дані й логіка — у хуках `lib/hooks/<domain>` (barrel `index.ts`), ключі запитів — фабрики в `keys.ts` без `"use client"`.
- Діалоги — лише `ResponsiveDialog` (`components/ui/responsive-dialog`), підтвердження — `useConfirm()`/`useNotify()` з `@/lib/hooks/common`.
- Міграція лише додає; кожен `CREATE TABLE` має `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
- Ліміти: ≤ 100 слайдів у наборі, ≤ 100 наборів у кампанії, заголовок слайда ≤ 80, підпис ≤ 200, назва набору ≤ 80; файл ≤ 8 МБ; клієнт зменшує до ≤ 2560 px за довшою стороною і кодує у WebP (якщо не вміє — JPEG).
- Бакет `scene-slides` (публічний), шлях `<campaignId>/<32 hex>.<ext>`; `cacheControl` рік.
- Рядок `campaign_shows` ніколи не видаляється; `seq` і `audio.seq` лише зростають.
- Гравцям не віддається набір цілком — лише поточний слайд і `nextImageUrl`.
- Комміти закінчуються рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. ДМ завершив показ і запустив знову, поки гравець тримає сторінку відкритою — гравець бачить новий показ без перезавантаження (монотонні `seq`/`audio.seq`). Тест у Task 2.
2. ДМ видалив набір або слайд, що зараз на екрані — у гравців картинка не ламається (файл не видаляється, знімок лишається), `next` після видалення поточного слайда йде на перший слайд, а не падає. Тести в Task 2 і Task 4.
3. Та сама картинка (посилання з нашого Storage) в двох наборах — видалення одного набору не стирає файл іншого. Тест у Task 4.
4. Слайд прив'язаний до треку, який уже грає або стоїть на паузі — музика не перезапускається і пауза не знімається. Тест у Task 2.
5. Дві вкладки ДМ шлють команди одночасно — друга отримує 409 і перечитує стан, у гравців не з'являється «старий» слайд. Тести в Task 5 (409) і Task 6 (злиття за `seq`).

---

### Task 1: Дані — схема, міграція, типи, константи, Zod

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261021000000_scene_show/migration.sql`
- Create: `types/show.ts`
- Create: `lib/constants/show.ts`
- Modify: `lib/constants/api-errors.ts`
- Create: `lib/schemas/show.ts`
- Test: `lib/schemas/__tests__/show.test.ts`

**Interfaces:**
- Produces: Prisma-моделі `SlideDeck` (`prisma.slideDeck`), `CampaignShow` (`prisma.campaignShow`); типи `Slide`, `SlideDeck`, `SlideDeckSummary`, `ShowState`, `ShowCommand`, `ShowResponse`, `ShowSnapshot`, `ShowEvent`, `SlideUploadRequest`, `SlideUploadTicket`, `SaveDeckData`, `CreateDeckData`, `ActiveShowRef`, `ActiveSessions`; константи з `lib/constants/show.ts`; схеми `slideSchema`, `slidesSchema`, `createDeckSchema`, `saveDeckSchema`, `slideUploadRequestSchema`, `showCommandSchema`; функція `readSlides(json: unknown): Slide[]`; нові ключі `API_ERRORS`.

- [ ] **Step 0: Підготувати worktree**

```bash
cd /Users/silentfox/Work/dnd-tracker-show
cp ../dnd-tracker/.env.local .env.local
pnpm install --frozen-lockfile
pnpm exec prisma generate
```
Expected: встановлення без помилок.

- [ ] **Step 1: Prisma-моделі**

У `prisma/schema.prisma` в `model Campaign` додати два поля поруч із `tracks CampaignTrack[]`:

```prisma
  slideDecks      SlideDeck[]
  show            CampaignShow?
```

Після `model CampaignTrack { … }` додати:

```prisma
model SlideDeck {
  id         String   @id @default(cuid())
  campaignId String
  title      String
  sortOrder  Int      @default(0)
  slides     Json     @default("[]")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId, sortOrder])
  @@map("slide_decks")
}

model CampaignShow {
  campaignId   String   @id
  deckId       String?
  deckTitle    String?
  slide        Json?
  nextImageUrl String?
  audio        Json?
  seq          Int      @default(0)
  updatedAt    DateTime @updatedAt
  campaign     Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@map("campaign_shows")
}
```

`deckId` навмисно без FK: видалення набору не повинно ламати живий показ (`deckTitle` — знімок, щоб показати назву без читання набору).

- [ ] **Step 2: Міграція**

`prisma/migrations/20261021000000_scene_show/migration.sql`:

```sql
CREATE TABLE "slide_decks" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "slides" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "slide_decks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "slide_decks_campaignId_sortOrder_idx" ON "slide_decks"("campaignId", "sortOrder");

ALTER TABLE "slide_decks" ADD CONSTRAINT "slide_decks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slide_decks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "campaign_shows" (
    "campaignId" TEXT NOT NULL,
    "deckId" TEXT,
    "deckTitle" TEXT,
    "slide" JSONB,
    "nextImageUrl" TEXT,
    "audio" JSONB,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaign_shows_pkey" PRIMARY KEY ("campaignId")
);

ALTER TABLE "campaign_shows" ADD CONSTRAINT "campaign_shows_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_shows" ENABLE ROW LEVEL SECURITY;
```

Run:
```bash
pnpm exec prisma generate
pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "postgresql://postgres:postgres@localhost:54322/postgres" --script
```
Expected: diff порожній (`-- This is an empty migration.`). Якщо локальна БД не запущена — `pnpm db:local` перед цим. Якщо diff не порожній — виправити SQL під вивід diff.

Run: `pnpm test:run prisma/__tests__/migrations-rls.test.ts` → PASS.

- [ ] **Step 3: Типи `types/show.ts`**

```ts
import type { BattleAudioCommand, BattleAudioState } from "@/types/audio";

export interface Slide {
  id: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  trackId?: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  sortOrder: number;
  slides: Slide[];
  updatedAt: string;
}

export interface SlideDeckSummary {
  id: string;
  title: string;
  sortOrder: number;
  slideCount: number;
  coverUrl: string | null;
  updatedAt: string;
}

export interface CreateDeckData {
  title: string;
}

export interface SaveDeckData {
  title: string;
  slides: Slide[];
}

/** Те, що бачать усі учасники: лише поточний слайд і картинка наступного (без набору — спойлери). */
export interface ShowState {
  deckId: string | null;
  deckTitle: string | null;
  slide: Slide | null;
  nextImageUrl: string | null;
  audio: BattleAudioState | null;
  seq: number;
}

export type ShowCommand =
  | { action: "open"; deckId: string; slideId?: string }
  | { action: "next" }
  | { action: "prev" }
  | { action: "end" }
  | { action: "audio"; command: BattleAudioCommand };

export interface ShowResponse {
  show: ShowState | null;
}

export interface ShowSnapshot {
  show: ShowState | null;
  clockOffsetMs: number | null;
}

/** Pusher `show-state` */
export interface ShowEvent {
  campaignId: string;
  show: ShowState;
}

export interface SlideUploadRequest {
  size: number;
  contentType: string;
}

export interface SlideUploadTicket {
  bucket: string;
  path: string;
  token: string;
  contentType: string;
  publicUrl: string;
}

export interface ActiveShowRef {
  campaignId: string;
}
```

У `types/campaigns.ts` поруч з `ActiveBattleRef` додати:

```ts
export interface ActiveSessions {
  battles: ActiveBattleRef[];
  shows: { campaignId: string }[];
}
```

- [ ] **Step 4: Константи `lib/constants/show.ts`**

```ts
export const SCENE_SLIDES_BUCKET = "scene-slides";

export const MAX_SLIDE_MB = 8;

export const MAX_SLIDE_BYTES = MAX_SLIDE_MB * 1024 * 1024;

export const MAX_SLIDES_PER_DECK = 100;

export const MAX_DECKS_PER_CAMPAIGN = 100;

export const DECK_TITLE_MAX = 80;

export const SLIDE_TITLE_MAX = 80;

export const SLIDE_CAPTION_MAX = 200;

export const SLIDE_MAX_EDGE_PX = 2560;

export const SLIDE_CACHE_SECONDS = "31536000";

/** Що клієнт вантажить напряму (після зменшення). */
export const SLIDE_UPLOAD_FORMATS = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
} as const;

export type SlideUploadType = keyof typeof SLIDE_UPLOAD_FORMATS;

export const SLIDE_UPLOAD_TYPES = Object.keys(SLIDE_UPLOAD_FORMATS) as [SlideUploadType, ...SlideUploadType[]];

/** Бакет приймає й те, що дзеркалиться за посиланням (resolveImageForPersistence). */
export const SLIDE_BUCKET_TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif"];

export const SLIDE_FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export const SLIDE_CROSSFADE_MS = 600;
```

- [ ] **Step 5: Помилки**

У `lib/constants/api-errors.ts` додати імпорт `import { MAX_DECKS_PER_CAMPAIGN, MAX_SLIDE_MB } from "./show";` (поруч з імпортом `./music`) і ключі після `BATTLE_AUDIO_CONFLICT`:

```ts
  DECK_NOT_FOUND: "Набір слайдів не знайдено",
  DECK_LIMIT: `У кампанії вже ${MAX_DECKS_PER_CAMPAIGN} наборів — видаліть зайві`,
  SLIDE_NOT_FOUND: "Слайд не знайдено",
  SLIDE_FILE_INVALID: `Потрібна картинка WebP або JPEG до ${MAX_SLIDE_MB} МБ`,
  SHOW_DECK_EMPTY: "У наборі немає слайдів",
  SHOW_NOT_RUNNING: "Показ не запущено",
  SHOW_CONFLICT: "Стан показу змінився — повторіть",
```

- [ ] **Step 6: Написати тест схем (падає)**

`lib/schemas/__tests__/show.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { readSlides, saveDeckSchema, showCommandSchema, slideUploadRequestSchema } from "@/lib/schemas/show";

const slide = (id: string, extra: Record<string, unknown> = {}) => ({ id, imageUrl: "https://x.supabase.co/storage/v1/object/public/scene-slides/c1/a.webp", ...extra });

describe("show schemas", () => {
  it("набір: порожні заголовок/підпис стають undefined, пробіли обрізаються", () => {
    const parsed = saveDeckSchema.parse({ title: "  Таверна ", slides: [slide("slide-0001", { title: "  ", caption: " Минуло три дні " })] });

    expect(parsed).toEqual({ title: "Таверна", slides: [{ id: "slide-0001", imageUrl: slide("x").imageUrl, title: undefined, caption: "Минуло три дні" }] });
  });

  it("набір: дублікати id, 101 слайд, підпис 201 символ, не-http посилання — відхиляються", () => {
    expect(saveDeckSchema.safeParse({ title: "a", slides: [slide("slide-0001"), slide("slide-0001")] }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: "a", slides: Array.from({ length: 101 }, (_, i) => slide(`slide-${1000 + i}`)) }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: "a", slides: [slide("slide-0001", { caption: "x".repeat(201) })] }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: "a", slides: [{ id: "slide-0001", imageUrl: "javascript:alert(1)" }] }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: " ", slides: [] }).success).toBe(false);
  });

  it("квиток: лише webp/jpeg до 8 МБ", () => {
    expect(slideUploadRequestSchema.safeParse({ size: 1000, contentType: "image/webp" }).success).toBe(true);
    expect(slideUploadRequestSchema.safeParse({ size: 1000, contentType: "image/svg+xml" }).success).toBe(false);
    expect(slideUploadRequestSchema.safeParse({ size: 9 * 1024 * 1024, contentType: "image/jpeg" }).success).toBe(false);
  });

  it("команди показу", () => {
    expect(showCommandSchema.parse({ action: "open", deckId: "d1" })).toEqual({ action: "open", deckId: "d1" });
    expect(showCommandSchema.parse({ action: "audio", command: { action: "play", trackId: "t1" } })).toEqual({ action: "audio", command: { action: "play", trackId: "t1" } });
    expect(showCommandSchema.safeParse({ action: "audio", command: { action: "seek" } }).success).toBe(false);
    expect(showCommandSchema.safeParse({ action: "jump" }).success).toBe(false);
  });

  it("readSlides: битий JSON з БД — порожній масив", () => {
    expect(readSlides([slide("slide-0001")])).toHaveLength(1);
    expect(readSlides({ nope: true })).toEqual([]);
    expect(readSlides(null)).toEqual([]);
  });
});
```

Run: `pnpm test:run lib/schemas/__tests__/show.test.ts` → FAIL (модуля немає).

- [ ] **Step 7: Схеми `lib/schemas/show.ts`**

```ts
import { z } from "zod";

import { DECK_TITLE_MAX, MAX_SLIDE_BYTES, MAX_SLIDES_PER_DECK, SLIDE_CAPTION_MAX, SLIDE_TITLE_MAX, SLIDE_UPLOAD_TYPES } from "@/lib/constants/show";
import { battleAudioCommandSchema } from "@/lib/schemas/music";
import type { Slide } from "@/types/show";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const slideIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((v) => v.startsWith("https://") || v.startsWith("http://"), "Потрібне посилання http(s)");

export const slideSchema = z.object({
  id: slideIdSchema,
  imageUrl: imageUrlSchema,
  title: optionalText(SLIDE_TITLE_MAX),
  caption: optionalText(SLIDE_CAPTION_MAX),
  trackId: z.string().min(1).max(64).optional(),
});

export const slidesSchema = z
  .array(slideSchema)
  .max(MAX_SLIDES_PER_DECK)
  .refine((slides) => new Set(slides.map((s) => s.id)).size === slides.length, "Повторюваний id слайда");

const deckTitleSchema = z.string().trim().min(1).max(DECK_TITLE_MAX);

export const createDeckSchema = z.object({ title: deckTitleSchema });

export const saveDeckSchema = z.object({ title: deckTitleSchema, slides: slidesSchema });

export const slideUploadRequestSchema = z.object({
  size: z.number().int().positive().max(MAX_SLIDE_BYTES),
  contentType: z.enum(SLIDE_UPLOAD_TYPES),
});

export const showCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), deckId: z.string().min(1).max(64), slideId: slideIdSchema.optional() }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("prev") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("audio"), command: battleAudioCommandSchema }),
]);

export function readSlides(json: unknown): Slide[] {
  const parsed = slidesSchema.safeParse(json);

  return parsed.success ? parsed.data : [];
}
```

Run: `pnpm test:run lib/schemas/__tests__/show.test.ts` → PASS. Якщо тест «порожні стають undefined» падає через `toEqual` з ключем `title: undefined` — це нормально для `toEqual` (ігнорує undefined-ключі); інших розбіжностей бути не повинно.

- [ ] **Step 8: Типи й lint**

Run: `pnpm exec tsc --noEmit && pnpm lint` → без помилок.

- [ ] **Step 9: Commit**

```bash
git add prisma types lib/constants lib/schemas
git commit -m "feat(show): data model, migration, types and schemas for slide show

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Чиста логіка показу

**Files:**
- Create: `lib/utils/show/show-command.ts`
- Create: `lib/utils/show/merge-show.ts`
- Create: `lib/utils/show/deck-files.ts`
- Create: `lib/utils/show/deck-draft.ts`
- Create: `lib/utils/show/fit-image.ts`
- Test: `lib/utils/show/__tests__/show-command.test.ts`, `merge-show.test.ts`, `deck-files.test.ts`, `deck-draft.test.ts`, `fit-image.test.ts`

**Interfaces:**
- Consumes: `applyAudioCommand(prev, cmd, { now, library })`, `AudioLibraryEntry` з `lib/utils/audio/audio-command.ts`; типи з Task 1.
- Produces:
  - `interface ShowDeck { id: string; title: string; slides: Slide[] }`
  - `applyShowCommand(prev: ShowState | null, cmd: ShowCommand, ctx: { now: number; deck: ShowDeck | null; library: AudioLibraryEntry[] }): Result<ShowState>` — повертає **той самий об'єкт `prev`**, коли нічого не змінилося (край набору);
  - `refreshShowSlide(prev: ShowState, deck: ShowDeck): ShowState | null` — `null`, якщо оновлювати нічого;
  - `showNeedsLibrary(cmd: ShowCommand): boolean`;
  - `mergeShow(cached: ShowState | null, incoming: ShowState | null | undefined): ShowState | null`;
  - `removedSlideUrls(before: Slide[], after: Slide[], keep: Iterable<string>): string[]`;
  - `deckDraftReducer(state: DeckDraft, action: DeckDraftAction): DeckDraft`, `type DeckDraft = { title: string; slides: Slide[] }`, `type DeckDraftAction` (див. нижче);
  - `fitWithin(size: { width: number; height: number }, maxEdge: number): { width: number; height: number }`.

- [ ] **Step 1: Тест команд (падає)**

`lib/utils/show/__tests__/show-command.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { applyShowCommand, refreshShowSlide, type ShowDeck } from "../show-command";

import type { AudioLibraryEntry } from "@/lib/utils/audio/audio-command";
import type { BattleAudioState } from "@/types/audio";
import type { ShowState, Slide } from "@/types/show";

const img = (n: number) => `https://s.supabase.co/storage/v1/object/public/scene-slides/c1/${n}.webp`;

const s = (n: number, trackId?: string): Slide => ({ id: `slide-000${n}`, imageUrl: img(n), title: `Слайд ${n}`, ...(trackId && { trackId }) });

const deck: ShowDeck = { id: "d1", title: "Таверна", slides: [s(1), s(2, "t2"), s(3)] };

const library: AudioLibraryEntry[] = [
  { id: "t1", track: { title: "Бій", kind: "file", url: "https://a/1.mp3", youtubeId: null, durationSec: 100 } },
  { id: "t2", track: { title: "Таверна", kind: "file", url: "https://a/2.mp3", youtubeId: null, durationSec: 100 } },
];

const ctx = { now: 5_000, deck, library };

const audio = (over: Partial<BattleAudioState> = {}): BattleAudioState => ({ trackId: "t1", track: library[0].track, playing: true, offsetSec: 0, startedAt: 1_000, seq: 7, ...over });

const showing = (slideIdx: number, over: Partial<ShowState> = {}): ShowState => ({
  deckId: "d1",
  deckTitle: "Таверна",
  slide: deck.slides[slideIdx],
  nextImageUrl: deck.slides[slideIdx + 1]?.imageUrl ?? null,
  audio: null,
  seq: 4,
  ...over,
});

const ok = (r: ReturnType<typeof applyShowCommand>) => {
  if (!r.ok) throw new Error(r.message);

  return r.value;
};

describe("applyShowCommand", () => {
  it("open без slideId — перший слайд, наступна картинка, seq з 1", () => {
    expect(ok(applyShowCommand(null, { action: "open", deckId: "d1" }, ctx))).toEqual({ deckId: "d1", deckTitle: "Таверна", slide: s(1), nextImageUrl: img(2), audio: null, seq: 1 });
  });

  it("open конкретного слайда з треком — play цього треку", () => {
    const next = ok(applyShowCommand(showing(0), { action: "open", deckId: "d1", slideId: "slide-0002" }, ctx));

    expect(next.slide).toEqual(s(2, "t2"));
    expect(next.audio).toMatchObject({ trackId: "t2", playing: true, startedAt: 5_000, seq: 1 });
    expect(next.seq).toBe(5);
  });

  it("трек слайда вже грає або на паузі — аудіо без змін (той самий об'єкт)", () => {
    const playing = audio({ trackId: "t2", track: library[1].track });

    expect(ok(applyShowCommand(showing(0, { audio: playing }), { action: "next" }, ctx)).audio).toBe(playing);

    const paused = audio({ trackId: "t2", track: library[1].track, playing: false });

    expect(ok(applyShowCommand(showing(0, { audio: paused }), { action: "next" }, ctx)).audio).toBe(paused);
  });

  it("трек слайда видалено з бібліотеки — слайд відкривається, музика як була", () => {
    const current = audio();

    const next = ok(applyShowCommand(showing(0, { audio: current }), { action: "next" }, { ...ctx, library: [library[0]] }));

    expect(next.slide?.id).toBe("slide-0002");
    expect(next.audio).toBe(current);
  });

  it("слайд без треку — музика не чіпається", () => {
    const current = audio();

    expect(ok(applyShowCommand(showing(1, { audio: current }), { action: "next" }, ctx)).audio).toBe(current);
  });

  it("next/prev на краю — той самий стан без підвищення seq", () => {
    const last = showing(2);

    expect(ok(applyShowCommand(last, { action: "next" }, ctx))).toBe(last);

    const first = showing(0);

    expect(ok(applyShowCommand(first, { action: "prev" }, ctx))).toBe(first);
  });

  it("останній слайд — nextImageUrl null", () => {
    expect(ok(applyShowCommand(showing(1), { action: "next" }, ctx)).nextImageUrl).toBeNull();
  });

  it("поточний слайд видалено з набору — next/prev ідуть на перший", () => {
    const gone = showing(0, { slide: { id: "slide-gone", imageUrl: img(9) } });

    expect(ok(applyShowCommand(gone, { action: "next" }, ctx)).slide?.id).toBe("slide-0001");
    expect(ok(applyShowCommand(gone, { action: "prev" }, ctx)).slide?.id).toBe("slide-0001");
  });

  it("помилки: немає набору, порожній набір, невідомий слайд, next без показу", () => {
    expect(applyShowCommand(null, { action: "open", deckId: "d1" }, { ...ctx, deck: null })).toEqual({ ok: false, message: "Набір слайдів не знайдено" });
    expect(applyShowCommand(null, { action: "open", deckId: "d1" }, { ...ctx, deck: { ...deck, slides: [] } })).toEqual({ ok: false, message: "У наборі немає слайдів" });
    expect(applyShowCommand(null, { action: "open", deckId: "d1", slideId: "slide-nope" }, ctx)).toEqual({ ok: false, message: "Слайд не знайдено" });
    expect(applyShowCommand(null, { action: "next" }, ctx)).toEqual({ ok: false, message: "Показ не запущено" });
    expect(applyShowCommand(showing(0), { action: "next" }, { ...ctx, deck: null })).toEqual({ ok: false, message: "Набір слайдів не знайдено" });
  });

  it("end: очищає показ, зупиняє музику, seq і audio.seq ростуть; повторний open після end має більший seq", () => {
    const ended = ok(applyShowCommand(showing(1, { audio: audio() }), { action: "end" }, ctx));

    expect(ended).toEqual({ deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: { trackId: null, track: null, playing: false, offsetSec: 0, startedAt: 5_000, seq: 8 }, seq: 5 });

    const reopened = ok(applyShowCommand(ended, { action: "open", deckId: "d1", slideId: "slide-0002" }, ctx));

    expect(reopened.seq).toBe(6);
    expect(reopened.audio?.seq).toBe(9);
  });

  it("end без музики — audio лишається null", () => {
    expect(ok(applyShowCommand(showing(0), { action: "end" }, ctx)).audio).toBeNull();
  });

  it("audio: команда плеєра працює і без відкритого набору; помилка плеєра — помилка", () => {
    const next = ok(applyShowCommand(null, { action: "audio", command: { action: "play", trackId: "t1" } }, ctx));

    expect(next).toMatchObject({ deckId: null, slide: null, seq: 1, audio: { trackId: "t1", playing: true } });
    expect(applyShowCommand(null, { action: "audio", command: { action: "pause" } }, ctx)).toEqual({ ok: false, message: "Немає обраного треку" });
  });
});

describe("refreshShowSlide", () => {
  it("змінився підпис поточного слайда — новий знімок і seq+1", () => {
    const edited: ShowDeck = { ...deck, slides: [{ ...s(1), caption: "Новий" }, s(2, "t2"), s(3)] };

    expect(refreshShowSlide(showing(0), edited)).toEqual({ ...showing(0), slide: { ...s(1), caption: "Новий" }, seq: 5 });
  });

  it("змінився наступний слайд — новий nextImageUrl", () => {
    const edited: ShowDeck = { ...deck, slides: [s(1), s(3)] };

    expect(refreshShowSlide(showing(0), edited)?.nextImageUrl).toBe(img(3));
  });

  it("нічого не змінилося, інший набір або слайд видалено — null", () => {
    expect(refreshShowSlide(showing(0), deck)).toBeNull();
    expect(refreshShowSlide(showing(0), { ...deck, id: "d2" })).toBeNull();
    expect(refreshShowSlide(showing(0), { ...deck, slides: [s(2), s(3)] })).toBeNull();
  });
});
```

Run: `pnpm test:run lib/utils/show/__tests__/show-command.test.ts` → FAIL.

- [ ] **Step 2: `lib/utils/show/show-command.ts`**

```ts
import { API_ERRORS } from "@/lib/constants/api-errors";
import { applyAudioCommand, type AudioLibraryEntry, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioState } from "@/types/audio";
import type { Result } from "@/types/common";
import type { ShowCommand, ShowState, Slide } from "@/types/show";

export interface ShowDeck {
  id: string;
  title: string;
  slides: Slide[];
}

interface Ctx {
  now: number;
  deck: ShowDeck | null;
  library: AudioLibraryEntry[];
}

type Outcome = Result<ShowState>;

const fail = (message: string): Outcome => ({ ok: false, message });

const done = (value: ShowState): Outcome => ({ ok: true, value });

const EMPTY: ShowState = { deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, seq: 0 };

export const showNeedsLibrary = (cmd: ShowCommand): boolean => cmd.action === "open" || cmd.action === "next" || cmd.action === "prev" || (cmd.action === "audio" && commandNeedsLibrary(cmd.command));

function autoTrack(audio: BattleAudioState | null, trackId: string | undefined, ctx: Ctx): BattleAudioState | null {
  // той самий трек — навіть на паузі — не чіпаємо: паузу ДМ поставив свідомо
  if (!trackId || audio?.trackId === trackId) return audio;

  const played = applyAudioCommand(audio, { action: "play", trackId }, ctx);

  return played.ok ? played.value : audio;
}

function showSlide(prev: ShowState | null, deck: ShowDeck, index: number, ctx: Ctx): Outcome {
  const slide = deck.slides[index];

  return done({
    deckId: deck.id,
    deckTitle: deck.title,
    slide,
    nextImageUrl: deck.slides[index + 1]?.imageUrl ?? null,
    audio: autoTrack(prev?.audio ?? null, slide.trackId, ctx),
    seq: (prev?.seq ?? 0) + 1,
  });
}

function step(prev: ShowState | null, ctx: Ctx, dir: 1 | -1): Outcome {
  if (!prev?.deckId) return fail(API_ERRORS.SHOW_NOT_RUNNING);

  const { deck } = ctx;

  if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

  if (deck.slides.length === 0) return fail(API_ERRORS.SHOW_DECK_EMPTY);

  const at = deck.slides.findIndex((s) => s.id === prev.slide?.id);

  if (at === -1) return showSlide(prev, deck, 0, ctx);

  const target = Math.min(Math.max(at + dir, 0), deck.slides.length - 1);

  return target === at ? done(prev) : showSlide(prev, deck, target, ctx);
}

type Handlers = { [A in ShowCommand["action"]]: (prev: ShowState | null, cmd: Extract<ShowCommand, { action: A }>, ctx: Ctx) => Outcome };

const handlers: Handlers = {
  open: (prev, cmd, ctx) => {
    const { deck } = ctx;

    if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

    if (deck.slides.length === 0) return fail(API_ERRORS.SHOW_DECK_EMPTY);

    const index = cmd.slideId ? deck.slides.findIndex((s) => s.id === cmd.slideId) : 0;

    return index === -1 ? fail(API_ERRORS.SLIDE_NOT_FOUND) : showSlide(prev, deck, index, ctx);
  },
  next: (prev, _cmd, ctx) => step(prev, ctx, 1),
  prev: (prev, _cmd, ctx) => step(prev, ctx, -1),
  end: (prev, _cmd, ctx) => {
    const audio = prev?.audio ?? null;

    const stopped = audio?.trackId ? applyAudioCommand(audio, { action: "stop" }, ctx) : null;

    return done({ ...EMPTY, audio: stopped?.ok ? stopped.value : audio, seq: (prev?.seq ?? 0) + 1 });
  },
  audio: (prev, cmd, ctx) => {
    const played = applyAudioCommand(prev?.audio ?? null, cmd.command, ctx);

    return played.ok ? done({ ...(prev ?? EMPTY), audio: played.value, seq: (prev?.seq ?? 0) + 1 }) : played;
  },
};

export function applyShowCommand(prev: ShowState | null, cmd: ShowCommand, ctx: Ctx): Outcome {
  const run = handlers[cmd.action] as (p: ShowState | null, c: ShowCommand, x: Ctx) => Outcome;

  return run(prev, cmd, ctx);
}

const sameSlide = (a: Slide | null, b: Slide) => !!a && a.imageUrl === b.imageUrl && a.title === b.title && a.caption === b.caption && a.trackId === b.trackId;

/** Після збереження набору: знімок поточного слайда без перемикання і без автотреку. */
export function refreshShowSlide(prev: ShowState, deck: ShowDeck): ShowState | null {
  if (prev.deckId !== deck.id) return null;

  const at = deck.slides.findIndex((s) => s.id === prev.slide?.id);

  if (at === -1) return null;

  const slide = deck.slides[at];

  const nextImageUrl = deck.slides[at + 1]?.imageUrl ?? null;

  if (sameSlide(prev.slide, slide) && nextImageUrl === prev.nextImageUrl && deck.title === prev.deckTitle) return null;

  return { ...prev, deckTitle: deck.title, slide, nextImageUrl, seq: prev.seq + 1 };
}
```

Примітка: `applyAudioCommand` очікує `ctx` з `{ now, library }` — передаємо весь `ctx`, зайве поле `deck` TS дозволяє, бо це змінна, а не літерал. Якщо `tsc` скаржиться — передавати `{ now: ctx.now, library: ctx.library }`.

Run: `pnpm test:run lib/utils/show/__tests__/show-command.test.ts` → PASS.

- [ ] **Step 3: Тести решти утиліт (падають)**

`lib/utils/show/__tests__/merge-show.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { mergeShow } from "../merge-show";

import type { ShowState } from "@/types/show";

const st = (seq: number): ShowState => ({ deckId: "d1", deckTitle: "Т", slide: null, nextImageUrl: null, audio: null, seq });

describe("mergeShow", () => {
  it("бере новіший за seq, старіший і null ігнорує", () => {
    const cached = st(5);

    expect(mergeShow(cached, st(6))).toEqual(st(6));
    expect(mergeShow(cached, st(4))).toBe(cached);
    expect(mergeShow(cached, st(5))).toBe(cached);
    expect(mergeShow(cached, null)).toBe(cached);
    expect(mergeShow(null, st(1))).toEqual(st(1));
  });
});
```

`lib/utils/show/__tests__/deck-files.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { removedSlideUrls } from "../deck-files";

const s = (id: string, imageUrl: string) => ({ id, imageUrl });

describe("removedSlideUrls", () => {
  it("лише зниклі картинки, без дублікатів і без тих, що треба зберегти", () => {
    const before = [s("a", "u1"), s("b", "u2"), s("c", "u2"), s("d", "u3"), s("e", "u4")];

    const after = [s("a", "u1")];

    expect(removedSlideUrls(before, after, ["u3"]).sort()).toEqual(["u2", "u4"]);
  });

  it("картинка лишилася в іншому слайді — не видаляється", () => {
    expect(removedSlideUrls([s("a", "u1"), s("b", "u2")], [s("c", "u2")], [])).toEqual(["u1"]);
  });
});
```

`lib/utils/show/__tests__/deck-draft.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { deckDraftReducer, type DeckDraft } from "../deck-draft";

const s = (id: string) => ({ id, imageUrl: `https://x/${id}.webp` });

const draft: DeckDraft = { title: "Т", slides: [s("a"), s("b"), s("c")] };

describe("deckDraftReducer", () => {
  it("move: вліво/вправо з обмеженням краями", () => {
    expect(deckDraftReducer(draft, { type: "move", id: "b", dir: -1 }).slides.map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(deckDraftReducer(draft, { type: "move", id: "c", dir: 1 })).toBe(draft);
    expect(deckDraftReducer(draft, { type: "move", id: "a", dir: -1 })).toBe(draft);
  });

  it("add/remove/update/rename/reset", () => {
    expect(deckDraftReducer(draft, { type: "add", slides: [s("d")] }).slides).toHaveLength(4);
    expect(deckDraftReducer(draft, { type: "remove", id: "a" }).slides.map((x) => x.id)).toEqual(["b", "c"]);
    expect(deckDraftReducer(draft, { type: "update", id: "b", patch: { caption: "Ніч" } }).slides[1]).toEqual({ ...s("b"), caption: "Ніч" });
    expect(deckDraftReducer(draft, { type: "rename", title: "Нова" }).title).toBe("Нова");
    expect(deckDraftReducer(draft, { type: "reset", draft: { title: "X", slides: [] } })).toEqual({ title: "X", slides: [] });
  });

  it("update з trackId undefined прибирає прив'язку", () => {
    const withTrack = deckDraftReducer(draft, { type: "update", id: "a", patch: { trackId: "t1" } });

    expect(deckDraftReducer(withTrack, { type: "update", id: "a", patch: { trackId: undefined } }).slides[0]).toEqual(s("a"));
  });
});
```

`lib/utils/show/__tests__/fit-image.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { fitWithin } from "../fit-image";

describe("fitWithin", () => {
  it("зменшує за довшою стороною, менші не збільшує", () => {
    expect(fitWithin({ width: 5120, height: 2880 }, 2560)).toEqual({ width: 2560, height: 1440 });
    expect(fitWithin({ width: 1000, height: 4000 }, 2560)).toEqual({ width: 640, height: 2560 });
    expect(fitWithin({ width: 800, height: 600 }, 2560)).toEqual({ width: 800, height: 600 });
  });
});
```

Run: `pnpm test:run lib/utils/show` → FAIL.

- [ ] **Step 4: Реалізація утиліт**

`lib/utils/show/merge-show.ts`:

```ts
import type { ShowState } from "@/types/show";

export function mergeShow(cached: ShowState | null, incoming: ShowState | null | undefined): ShowState | null {
  if (!incoming) return cached;

  return !cached || incoming.seq > cached.seq ? incoming : cached;
}
```

`lib/utils/show/deck-files.ts`:

```ts
import type { Slide } from "@/types/show";

export function removedSlideUrls(before: Pick<Slide, "imageUrl">[], after: Pick<Slide, "imageUrl">[], keep: Iterable<string>): string[] {
  const kept = new Set([...after.map((s) => s.imageUrl), ...keep]);

  return [...new Set(before.map((s) => s.imageUrl))].filter((url) => !kept.has(url));
}
```

`lib/utils/show/deck-draft.ts`:

```ts
import type { Slide } from "@/types/show";

export interface DeckDraft {
  title: string;
  slides: Slide[];
}

export type SlidePatch = Partial<Pick<Slide, "title" | "caption" | "trackId">>;

export type DeckDraftAction =
  | { type: "reset"; draft: DeckDraft }
  | { type: "rename"; title: string }
  | { type: "add"; slides: Slide[] }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dir: -1 | 1 }
  | { type: "update"; id: string; patch: SlidePatch };

function patchSlide(slide: Slide, patch: SlidePatch): Slide {
  const next: Slide = { ...slide, ...patch };

  for (const key of Object.keys(patch) as (keyof SlidePatch)[]) if (next[key] === undefined || next[key] === "") delete next[key];

  return next;
}

export function deckDraftReducer(state: DeckDraft, action: DeckDraftAction): DeckDraft {
  switch (action.type) {
    case "reset":
      return action.draft;
    case "rename":
      return { ...state, title: action.title };
    case "add":
      return { ...state, slides: [...state.slides, ...action.slides] };
    case "remove":
      return { ...state, slides: state.slides.filter((s) => s.id !== action.id) };
    case "update":
      return { ...state, slides: state.slides.map((s) => (s.id === action.id ? patchSlide(s, action.patch) : s)) };
    case "move": {
      const at = state.slides.findIndex((s) => s.id === action.id);

      const to = at + action.dir;

      if (at === -1 || to < 0 || to >= state.slides.length) return state;

      const slides = [...state.slides];

      [slides[at], slides[to]] = [slides[to], slides[at]];

      return { ...state, slides };
    }
  }
}
```

`lib/utils/show/fit-image.ts`:

```ts
export function fitWithin(size: { width: number; height: number }, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(size.width, size.height));

  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}
```

Run: `pnpm test:run lib/utils/show` → PASS. Потім `pnpm lint` → без помилок.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/show
git commit -m "feat(show): pure show commands, merge, draft reducer and file diff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Узагальнити плеєр до `AudioHost`

Механічний рефакторинг без зміни поведінки бою. Усі наявні audio-тести мають пройти (лише з новими шляхами/іменами).

**Files:**
- Create dir: `lib/hooks/audio/` (+ `index.ts`, `host.ts`), `components/audio/`
- Move (`git mv`) з `lib/hooks/battle/` → `lib/hooks/audio/`: `useAudioElementSync.ts`, `useAudioPrefs.ts`, `useYoutubeSync.ts`, `useDriftSync.ts`, `usePlaylistView.ts`, `audio-snapshot.ts`, `useBattleAudioState.ts` → `useAudioState.ts`, `useBattleAudioControl.ts` → `useAudioControl.ts`, `useBattleAudio.ts` → `usePlayerAudio.ts`; їхні тести з `lib/hooks/battle/__tests__/` → `lib/hooks/audio/__tests__/` (`useBattleAudioState.test.tsx` → `useAudioState.test.tsx`, `useBattleAudioControl.test.tsx` → `useAudioControl.test.tsx`, решта з тими ж іменами).
- Move з `components/battle/audio/` → `components/audio/`: `AudioPlayerPanel.tsx`, `BattleAudioDock.tsx` → `AudioDock.tsx`, `DmAudioControls.tsx`, `DmPlaylist.tsx`, `NowPlayingLabel.tsx`, `UnlockSoundButton.tsx`, `YoutubePlayer.tsx`; тест `components/battle/audio/__tests__/BattleAudioDock.test.tsx` → `components/audio/__tests__/AudioDock.test.tsx`.
- Create: `components/audio/AudioPlayerProvider.tsx`, `lib/hooks/battle/useBattleAudioHost.ts`, `lib/api/with-clock.ts`
- Modify: `components/battle/audio/BattleAudioProvider.tsx`, `lib/hooks/battle/index.ts`, `lib/hooks/battle/usePusherBattleSync.ts`, `lib/api/battle-audio.ts`, `components/battle/scene/BattleScreen.tsx`, `components/battle/scene/MobileBattleLayout.tsx`, `components/battle/scene/__tests__/corner-stack.test.tsx`, `components/battle/scene/__tests__/mobile-map-tab.test.tsx`

**Interfaces:**
- Produces (у `lib/hooks/audio/index.ts`):

```ts
// host.ts
import type { QueryKey } from "@tanstack/react-query";
import type { BattleAudioCommand, BattleAudioSnapshot, BattleAudioState } from "@/types/audio";

/** Звідки плеєр бере стан і куди шле команди: бій або показ. */
export interface AudioHost {
  campaignId: string;
  isDM: boolean;
  queryKey: QueryKey;
  seed: BattleAudioState | null | undefined;
  fetch(): Promise<BattleAudioSnapshot>;
  send(cmd: BattleAudioCommand): Promise<BattleAudioSnapshot>;
  onFailure(message: string): void;
}
```

  - `writeAudioSnapshot(queryClient: QueryClient, queryKey: QueryKey, incoming: { audio: BattleAudioState | null | undefined; clockOffsetMs?: number | null }): void`
  - `useAudioState(args: { host: AudioHost; unlocked: boolean }): BattleAudioSnapshot`
  - `useAudioControl(host: AudioHost): AudioControl | null`, `interface AudioControl { send(cmd: BattleAudioCommand): void; pending: boolean }`
  - `AudioPlayerContext`, `usePlayerAudioValue(host: AudioHost): { value: PlayerAudioValue; audioRef }`, `usePlayerAudio(): PlayerAudioValue`, типи `PlayerAudioValue`, `PlayerAudioDm` (поля ті самі, що в `BattleAudioValue`/`BattleAudioDm`)
  - реекспорт `useAudioPrefs`, `AudioPrefs`, `usePlaylistView`, `PlaylistView`, `useYoutubeSync`, `useAudioElementSync`, `useDriftSync`
- `components/audio/AudioPlayerProvider.tsx`: `AudioPlayerProvider({ host, children })`; `components/audio/AudioDock.tsx`: `AudioDock` (ті самі пропси, що `BattleAudioDock`).
- `lib/hooks/battle/useBattleAudioHost.ts`: `useBattleAudioHost(): AudioHost`.
- `lib/api/with-clock.ts`: `withClock<T>(run: (onResponse: (r: Response) => void) => Promise<T>): Promise<{ body: T; clockOffsetMs: number | null }>`.

- [ ] **Step 1: Перенести файли**

```bash
mkdir -p lib/hooks/audio/__tests__ components/audio/__tests__
for f in useAudioElementSync useAudioPrefs useYoutubeSync useDriftSync usePlaylistView audio-snapshot; do git mv lib/hooks/battle/$f.ts lib/hooks/audio/$f.ts; done
git mv lib/hooks/battle/useBattleAudioState.ts lib/hooks/audio/useAudioState.ts
git mv lib/hooks/battle/useBattleAudioControl.ts lib/hooks/audio/useAudioControl.ts
git mv lib/hooks/battle/useBattleAudio.ts lib/hooks/audio/usePlayerAudio.ts
ls lib/hooks/battle/__tests__ | grep -Ei "audio|youtube|drift|playlist"
```
Кожен знайдений тест перенести `git mv` у `lib/hooks/audio/__tests__/` (перейменувати `useBattleAudioState.test.tsx` → `useAudioState.test.tsx`, `useBattleAudioControl.test.tsx` → `useAudioControl.test.tsx`).

```bash
for f in AudioPlayerPanel DmAudioControls DmPlaylist NowPlayingLabel UnlockSoundButton YoutubePlayer; do git mv components/battle/audio/$f.tsx components/audio/$f.tsx; done
git mv components/battle/audio/BattleAudioDock.tsx components/audio/AudioDock.tsx
git mv components/battle/audio/__tests__/BattleAudioDock.test.tsx components/audio/__tests__/AudioDock.test.tsx
```

- [ ] **Step 2: `lib/api/with-clock.ts` і `lib/api/battle-audio.ts`**

```ts
// lib/api/with-clock.ts
import { clockOffsetFromDate } from "@/lib/utils/audio/clock";

/** Зсув годинника сервера — з заголовка Date відповіді. */
export async function withClock<T>(run: (onResponse: (r: Response) => void) => Promise<T>): Promise<{ body: T; clockOffsetMs: number | null }> {
  const sentAt = Date.now();

  let date: string | null = null;

  const body = await run((r) => {
    date = r.headers.get("date");
  });

  return { body, clockOffsetMs: clockOffsetFromDate(date, sentAt, Date.now()) };
}
```

Перевірити тип повернення `clockOffsetFromDate` у `lib/utils/audio/clock.ts` і узгодити (`number | null`).

`lib/api/battle-audio.ts`:

```ts
import { campaignGet, campaignPost } from "./client";
import { withClock } from "./with-clock";

import type { BattleAudioCommand, BattleAudioResponse, BattleAudioSnapshot } from "@/types/audio";

const toSnapshot = ({ body, clockOffsetMs }: { body: BattleAudioResponse; clockOffsetMs: number | null }): BattleAudioSnapshot => ({ audio: body.audio, clockOffsetMs });

export async function getBattleAudio(campaignId: string, battleId: string): Promise<BattleAudioSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignGet<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, { cache: "no-store", onResponse })));
}

export async function sendBattleAudio(campaignId: string, battleId: string, cmd: BattleAudioCommand): Promise<BattleAudioSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignPost<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, cmd, { onResponse })));
}
```

- [ ] **Step 3: Хост і хуки**

`lib/hooks/audio/host.ts` — код з блоку Interfaces вище.

`lib/hooks/audio/audio-snapshot.ts`:

```ts
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot } from "@/types/audio";

export function writeAudioSnapshot(queryClient: QueryClient, queryKey: QueryKey, incoming: Parameters<typeof mergeAudioSnapshot>[1]): void {
  queryClient.setQueryData<BattleAudioSnapshot>(queryKey, (prev) => mergeAudioSnapshot(prev, incoming));
}
```

`lib/hooks/audio/useAudioState.ts` — та сама логіка, що була в `useBattleAudioState`, але з хоста:

```ts
"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";
import type { AudioHost } from "./host";

import { mergeAudio, mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot } from "@/types/audio";

/** unlocked = звук увімкнено: лише тоді GET (свіжий стан і годинник); до того — seed і Pusher. */
export function useAudioState({ host, unlocked }: { host: AudioHost; unlocked: boolean }): BattleAudioSnapshot {
  const { queryKey, seed, fetch } = host;

  const queryClient = useQueryClient();

  const { data } = useQuery<BattleAudioSnapshot>({
    queryKey,
    queryFn: async () => mergeAudioSnapshot(queryClient.getQueryData<BattleAudioSnapshot>(queryKey), await fetch()),
    enabled: unlocked,
    // seed і Pusher пишуть кеш через setQueryData і роблять його «свіжим», а годинник міряє лише GET після розблокування
    staleTime: 0,
    initialData: { audio: seed ?? null, clockOffsetMs: null },
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // seed несе стан на момент читання — лише злиття за seq, ніколи не присвоєння
  useEffect(() => {
    if (!seed) return;

    writeAudioSnapshot(queryClient, queryKey, { audio: seed });
  }, [queryClient, queryKey, seed]);

  // кеш читається синхронно: сповіщення спостерігача приходять пізніше за рендер
  const snapshot = queryClient.getQueryData<BattleAudioSnapshot>(queryKey) ?? data;

  const audio = mergeAudio(snapshot.audio, seed);

  return useMemo(() => (audio === snapshot.audio ? snapshot : { audio, clockOffsetMs: snapshot.clockOffsetMs }), [audio, snapshot]);
}
```

`queryKey` у залежностях ефекту: хости мемоізують ключ (див. Step 5 і Task 6), тож ефект не крутиться.

`lib/hooks/audio/useAudioControl.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";
import type { AudioHost } from "./host";

import { ApiError } from "@/lib/api/client";
import { useSingleFlight } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { BattleAudioCommand } from "@/types/audio";

export interface AudioControl {
  send(cmd: BattleAudioCommand): void;
  pending: boolean;
}

export function useAudioControl(host: AudioHost): AudioControl | null {
  const { queryKey, send, onFailure, isDM } = host;

  const queryClient = useQueryClient();

  const singleFlight = useSingleFlight();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: send,
    onSuccess: (fresh) => writeAudioSnapshot(queryClient, queryKey, fresh),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey });

      onFailure(errorMessage(error, "Не вдалося керувати музикою"));
    },
  });

  const control = useMemo(
    () => ({
      // помилку вже обробив onError
      send: (cmd: BattleAudioCommand) => void singleFlight(() => mutateAsync(cmd).catch(() => undefined)),
      pending: isPending,
    }),
    [singleFlight, mutateAsync, isPending],
  );

  return isDM ? control : null;
}
```

Примітка: `lib/hooks/audio` імпортує `ApiError` з `@/lib/api/client` — так само, як було в `useBattleAudioControl` (хуки можуть імпортувати `lib/api`).

`lib/hooks/audio/usePlayerAudio.ts` — вміст колишнього `useBattleAudio.ts` з такими змінами:
- `BattleAudioDm` → `PlayerAudioDm` (тип `control: AudioControl`), `BattleAudioValue` → `PlayerAudioValue`, `BattleAudioContext` → `AudioPlayerContext`, `useBattleAudioValue()` → `usePlayerAudioValue(host: AudioHost)`, `useBattleAudio()` → `usePlayerAudio()` (текст помилки: `"usePlayerAudio: немає AudioPlayerContext"`);
- замість `useBattleScene()`:

```ts
  const { campaignId, isDM, onFailure } = host;

  const [unlocked, setUnlocked] = useState(false);

  const { audio, clockOffsetMs } = useAudioState({ host, unlocked });

  const prefs = useAudioPrefs();

  const control = useAudioControl(host);

  const { data: tracks = NO_TRACKS, isLoading } = useTracks(campaignId, { enabled: isDM });

  const rename = useRenameTrack(campaignId, (e) => onFailure(errorMessage(e, "Не вдалося перейменувати трек")));
```

- решта (`useAudioElementSync`, `unlock`, `dm`, `value`) — без змін.

`lib/hooks/audio/index.ts`:

```ts
export { writeAudioSnapshot } from "./audio-snapshot";
export { type AudioHost } from "./host";
export { type AudioControl, useAudioControl } from "./useAudioControl";
export { useAudioElementSync } from "./useAudioElementSync";
export { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
export { useAudioState } from "./useAudioState";
export { useDriftSync } from "./useDriftSync";
export { AudioPlayerContext, type PlayerAudioDm, type PlayerAudioValue, usePlayerAudio, usePlayerAudioValue } from "./usePlayerAudio";
export { type PlaylistView, usePlaylistView } from "./usePlaylistView";
export { useYoutubeSync } from "./useYoutubeSync";
```

Перевірити реальні імена експортів у перенесених файлах (`useAudioElementSync`, `useDriftSync` тощо) і узгодити barrel. Відносні імпорти між перенесеними файлами (`./useDriftSync` тощо) лишаються робочими; імпорти з батл-домену (`./useBattleScene`, `@/lib/hooks/battles`) у перенесених файлах мають зникнути — `grep -n "battle" lib/hooks/audio/*.ts` після правок має показувати лише типи `BattleAudio*` з `@/types/audio`.

- [ ] **Step 4: Компоненти**

У всіх файлах `components/audio/*.tsx`: `import { … useBattleAudio … } from "@/lib/hooks/battle"` → `import { … usePlayerAudio … } from "@/lib/hooks/audio"`, виклики `useBattleAudio()` → `usePlayerAudio()`, тип `BattleAudioDm` → `PlayerAudioDm`, `usePlaylistView`/`PlaylistView`/`useYoutubeSync` — з `@/lib/hooks/audio`. В `AudioDock.tsx` перейменувати функцію `BattleAudioDock` → `AudioDock` (атрибут `data-battle-audio` не міняти — на ньому тримаються стилі/тести). В `AudioPlayerPanel.tsx` `aria-label="Музика бою"` → `aria-label="Музика"`.

`components/audio/AudioPlayerProvider.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { type AudioHost, AudioPlayerContext, usePlayerAudioValue } from "@/lib/hooks/audio";

export function AudioPlayerProvider({ host, children }: { host: AudioHost; children: ReactNode }) {
  const { value, audioRef } = usePlayerAudioValue(host);

  return (
    <AudioPlayerContext value={value}>
      <audio ref={audioRef} loop preload="none" hidden />
      {children}
    </AudioPlayerContext>
  );
}
```

- [ ] **Step 5: Хост бою**

`lib/hooks/battle/useBattleAudioHost.ts`:

```ts
"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import { getBattleAudio, sendBattleAudio } from "@/lib/api/battle-audio";
import type { AudioHost } from "@/lib/hooks/audio";
import { battleKeys } from "@/lib/hooks/battles/keys";
import type { BattleAudioCommand } from "@/types/audio";

export function useBattleAudioHost(): AudioHost {
  const { campaignId, battleId, battle, viewer: { isDM }, toast: { show } } = useBattleScene();

  const queryKey = useMemo(() => battleKeys.audio(campaignId, battleId), [campaignId, battleId]);

  return useMemo(
    () => ({
      campaignId,
      isDM,
      queryKey,
      seed: battle.audio,
      fetch: () => getBattleAudio(campaignId, battleId),
      send: (cmd: BattleAudioCommand) => sendBattleAudio(campaignId, battleId, cmd),
      onFailure: show,
    }),
    [campaignId, battleId, isDM, queryKey, battle.audio, show],
  );
}
```

Перевірити, як `battleKeys` імпортується всередині `lib/hooks/battle` у сусідніх файлах (`@/lib/hooks/battles` чи `@/lib/hooks/battles/keys`) — взяти той самий варіант, щоб не створити циклу (`import/no-cycle`).

`components/battle/audio/BattleAudioProvider.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { useBattleAudioHost } from "@/lib/hooks/battle";

export function BattleAudioProvider({ children }: { children: ReactNode }) {
  return <AudioPlayerProvider host={useBattleAudioHost()}>{children}</AudioPlayerProvider>;
}
```

`lib/hooks/battle/index.ts`: прибрати рядки з `useAudioPrefs`, `useBattleAudio`, `useBattleAudioControl`, `usePlaylistView`, `useYoutubeSync`; додати `export { useBattleAudioHost } from "./useBattleAudioHost";`.

`lib/hooks/battle/usePusherBattleSync.ts`: `import { writeAudioSnapshot } from "./audio-snapshot";` → `import { writeAudioSnapshot } from "@/lib/hooks/audio";`, виклик → `writeAudioSnapshot(queryClient, battleKeys.audio(campaignId, battleId), { audio });`.

`BattleScreen.tsx`, `MobileBattleLayout.tsx`: `BattleAudioDock` з `@/components/battle/audio/BattleAudioDock` → `AudioDock` з `@/components/audio/AudioDock` (JSX `<BattleAudioDock …/>` → `<AudioDock …/>`).

- [ ] **Step 6: Тести на нові шляхи**

- `lib/hooks/audio/__tests__/useAudioState.test.tsx`: імпорт `useAudioState` з `../useAudioState`; кожен виклик `useBattleAudioState({ campaignId: "c1", battleId: "b1", seed, unlocked })` замінити на `useAudioState({ host: host(seed), unlocked })`, де на початку файлу:

```ts
const host = (seed: BattleAudioState | null): AudioHost => ({ campaignId: "c1", isDM: false, queryKey: battleKeys.audio("c1", "b1"), seed, fetch: () => getBattleAudio("c1", "b1"), send: vi.fn(), onFailure: vi.fn() });
```

  (мок `@/lib/api/battle-audio` лишається). Важливо: створювати `host(seed)` поза `renderHook`-колбеком не обов'язково — але `queryKey` має бути стабільним; `battleKeys.audio` повертає новий масив щоразу, тож у тесті винести `const KEY = battleKeys.audio("c1", "b1")` і використовувати його в хості.
- `lib/hooks/audio/__tests__/useAudioControl.test.tsx`: аналогічно — хост з `send: (cmd) => sendBattleAudio("c1", "b1", cmd)`, `isDM: true/false` замість `enabled`, `onFailure` — той самий мок.
- Інші перенесені хук-тести — лише оновити шляхи імпорту (`../useYoutubeSync` тощо) і моки (`vi.mock("@/lib/hooks/battle/useYoutubeSync", …)` → `vi.mock("@/lib/hooks/audio/useYoutubeSync", …)`).
- `components/audio/__tests__/AudioDock.test.tsx`: `import { AudioDock } from "../AudioDock"`, `import { BattleAudioProvider } from "@/components/battle/audio/BattleAudioProvider"`, мок `useYoutubeSync` → шлях `@/lib/hooks/audio/useYoutubeSync`; JSX `BattleAudioDock` → `AudioDock`; запити за `"Музика бою"` → `"Музика"`.
- `corner-stack.test.tsx`: `BattleAudioDock` → `AudioDock` з `@/components/audio/AudioDock`.
- `mobile-map-tab.test.tsx`: `vi.mock("@/components/battle/audio/BattleAudioDock", () => ({ BattleAudioDock: … }))` → `vi.mock("@/components/audio/AudioDock", () => ({ AudioDock: … }))`.

```bash
grep -rn "BattleAudioDock\|useBattleAudio\b\|useBattleAudioValue\|BattleAudioContext\|useBattleAudioState\|useBattleAudioControl\|lib/hooks/battle/useYoutubeSync\|Музика бою" app components lib --include=*.ts --include=*.tsx
```
Expected: порожньо (крім, можливо, тексту плитки «Музика бою» на дашборді `app/campaigns/[id]/page.tsx` — його не чіпати).

- [ ] **Step 7: Перевірка**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run lib/hooks/audio components/audio components/battle lib/hooks/battle app/api/__tests__/battle-audio-api.test.ts`
Expected: усе PASS, 0 помилок lint (warnings, що були до змін, допустимі).

- [ ] **Step 8: Commit**

```bash
git add -A lib/hooks/audio lib/hooks/battle components/audio components/battle lib/api
git commit -m "refactor(audio): player driven by AudioHost, moved out of battle domain

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Сховище і API наборів

**Files:**
- Create: `lib/supabase/scene-slide-storage.ts`
- Create: `lib/server/show/deck-store.ts`
- Create: `app/api/campaigns/[id]/decks/route.ts`, `app/api/campaigns/[id]/decks/deck-handlers.ts`, `app/api/campaigns/[id]/decks/[deckId]/route.ts`, `app/api/campaigns/[id]/decks/upload-url/route.ts`
- Test: `app/api/__tests__/decks-api.test.ts`

**Interfaces:**
- Consumes: схеми/типи/константи (Task 1), `removedSlideUrls`, `refreshShowSlide`, `ShowDeck` (Task 2); `readShowState`, `writeShowState`, `publishShow` (визначаються в Task 5 у `lib/server/show/show-store.ts` — **у цьому таску створити цей файл одразу з повним кодом із Task 5 Step 1**, щоб не було циклічної залежності між тасками; Task 5 тоді лише додає маршрути).
- Produces:
  - `ensureSlidesBucket(admin): Promise<Result<void>>`, `createSlideUploadTicket(campaignId: string, contentType: SlideUploadType): Promise<Result<SlideUploadTicket>>`, `slideObjectPath(url: string): string | null`, `removeSlideFiles(campaignId: string, urls: string[]): Promise<void>`;
  - `toSlideDeck(row)`, `toDeckSummary(row)`, `listDecks(campaignId)`, `loadShowDeck(campaignId, deckId): Promise<ShowDeck | null>`, `persistSlideImages(campaignId, slides, previous): Promise<Result<Slide[]>>`, `urlsUsedElsewhere(campaignId, exceptDeckId): Promise<Set<string>>`;
  - маршрути: `GET/POST /api/campaigns/[id]/decks`, `GET/PUT/DELETE /api/campaigns/[id]/decks/[deckId]`, `POST /api/campaigns/[id]/decks/upload-url`.

- [ ] **Step 1: `lib/server/show/show-store.ts` і канал Pusher** — створити тут з повним кодом із Task 5 Step 1, а константи каналу (`showChannelName`, `SHOW_CHANNEL_PREFIX`, `SHOW_STATE_EVENT`) — з першого блоку Task 5 Step 2 у `lib/pusher/channels.ts`. Task 5 ці кроки пропускає, якщо вони вже зроблені.

- [ ] **Step 2: `lib/supabase/scene-slide-storage.ts`**

```ts
import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_SLIDE_BYTES, SCENE_SLIDES_BUCKET, SLIDE_BUCKET_TYPES, SLIDE_UPLOAD_FORMATS, type SlideUploadType } from "@/lib/constants/show";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { parsePublicStorageUrl } from "@/lib/utils/common/image-url";
import type { Result } from "@/types/common";
import type { SlideUploadTicket } from "@/types/show";

type Admin = ReturnType<typeof createAdminClient>;

const BUCKET_PREFIX = `${SCENE_SLIDES_BUCKET}/`;

/** Ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL. Викликати до дзеркалювання, щоб бакет не створився без лімітів. */
export function ensureSlidesBucket(supabase: Admin) {
  return ensureBucket(supabase, SCENE_SLIDES_BUCKET, { public: true, fileSizeLimit: MAX_SLIDE_BYTES, allowedMimeTypes: SLIDE_BUCKET_TYPES });
}

export async function createSlideUploadTicket(campaignId: string, contentType: SlideUploadType): Promise<Result<SlideUploadTicket>> {
  const supabase = createAdminClient();

  const ensured = await ensureSlidesBucket(supabase);

  if (!ensured.ok) return ensured;

  const bucket = supabase.storage.from(SCENE_SLIDES_BUCKET);

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${SLIDE_UPLOAD_FORMATS[contentType]}`;

  const { data, error } = await bucket.createSignedUploadUrl(path);

  if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

  return { ok: true, value: { bucket: SCENE_SLIDES_BUCKET, path: data.path, token: data.token, contentType, publicUrl: bucket.getPublicUrl(data.path).data.publicUrl } };
}

export function slideObjectPath(url: string): string | null {
  const key = parsePublicStorageUrl(url)?.key;

  if (!key?.startsWith(BUCKET_PREFIX)) return null;

  try {
    return decodeURIComponent(key.slice(BUCKET_PREFIX.length));
  } catch {
    return null;
  }
}

/** Лише об'єкти цієї кампанії в бакеті слайдів; помилки — у лог, не користувачу. */
export async function removeSlideFiles(campaignId: string, urls: string[]): Promise<void> {
  const paths = urls.map(slideObjectPath).filter((p): p is string => !!p && p.startsWith(`${campaignId}/`));

  if (paths.length === 0) return;

  try {
    const { error } = await createAdminClient().storage.from(SCENE_SLIDES_BUCKET).remove(paths);

    if (error) console.warn("[scene-slides] remove failed", paths, error.message);
  } catch (e) {
    console.warn("[scene-slides] remove failed", paths, e);
  }
}
```

Перевірити сигнатуру `parsePublicStorageUrl` (повертає `{ url, key }`?) у `lib/utils/common/image-url.ts` — `battle-music-storage.ts` використовує `.key` так само.

- [ ] **Step 3: `lib/server/show/deck-store.ts`**

```ts
import type { SlideDeck as DeckRow } from "@prisma/client";

import "server-only";
import { SCENE_SLIDES_BUCKET, SLIDE_CACHE_SECONDS } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { readSlides } from "@/lib/schemas/show";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHostedOnProjectStorage, resolveImageForPersistence } from "@/lib/supabase/image-storage";
import { ensureSlidesBucket } from "@/lib/supabase/scene-slide-storage";
import type { ShowDeck } from "@/lib/utils/show/show-command";
import type { Result } from "@/types/common";
import type { Slide, SlideDeck, SlideDeckSummary } from "@/types/show";

export const DECK_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export function toSlideDeck(row: DeckRow): SlideDeck {
  return { id: row.id, title: row.title, sortOrder: row.sortOrder, slides: readSlides(row.slides), updatedAt: row.updatedAt.toISOString() };
}

export function toDeckSummary(row: DeckRow): SlideDeckSummary {
  const slides = readSlides(row.slides);

  return { id: row.id, title: row.title, sortOrder: row.sortOrder, slideCount: slides.length, coverUrl: slides[0]?.imageUrl ?? null, updatedAt: row.updatedAt.toISOString() };
}

export async function listDecks(campaignId: string): Promise<SlideDeckSummary[]> {
  return (await prisma.slideDeck.findMany({ where: { campaignId }, orderBy: DECK_ORDER })).map(toDeckSummary);
}

export async function loadShowDeck(campaignId: string, deckId: string): Promise<ShowDeck | null> {
  const row = await prisma.slideDeck.findFirst({ where: { id: deckId, campaignId }, select: { id: true, title: true, slides: true } });

  return row ? { id: row.id, title: row.title, slides: readSlides(row.slides) } : null;
}

/** Картинки інших наборів кампанії: спільне посилання не можна стирати разом з одним набором. */
export async function urlsUsedElsewhere(campaignId: string, exceptDeckId: string): Promise<Set<string>> {
  const rows = await prisma.slideDeck.findMany({ where: { campaignId, id: { not: exceptDeckId } }, select: { slides: true } });

  return new Set(rows.flatMap((r) => readSlides(r.slides).map((s) => s.imageUrl)));
}

/** Зовнішні посилання дзеркалимо в бакет слайдів; наш Storage і вже збережені — як є. */
export async function persistSlideImages(campaignId: string, slides: Slide[], previous: Slide[]): Promise<Result<Slide[]>> {
  const known = new Set(previous.map((s) => s.imageUrl));

  const foreign = slides.filter((s) => !known.has(s.imageUrl) && !isHostedOnProjectStorage(s.imageUrl));

  if (foreign.length === 0) return { ok: true, value: slides };

  const ensured = await ensureSlidesBucket(createAdminClient());

  if (!ensured.ok) return ensured;

  const mirrored = new Map<string, string>();

  for (const slide of foreign) {
    if (mirrored.has(slide.imageUrl)) continue;

    const stored = await resolveImageForPersistence(slide.imageUrl, { bucket: SCENE_SLIDES_BUCKET, campaignId, cacheControl: SLIDE_CACHE_SECONDS });

    if (!stored.ok) return { ok: false, message: `Слайд ${slides.indexOf(slide) + 1}: ${stored.message}` };

    if (stored.value) mirrored.set(slide.imageUrl, stored.value);
  }

  return { ok: true, value: slides.map((s) => ({ ...s, imageUrl: mirrored.get(s.imageUrl) ?? s.imageUrl })) };
}
```

- [ ] **Step 4: Тест маршрутів наборів (падає)**

`app/api/__tests__/decks-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as storage from "@/lib/supabase/scene-slide-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ removeSlideFiles: vi.fn(async () => undefined), createSlideUploadTicket: vi.fn(), ensureSlidesBucket: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/supabase/image-storage", () => ({
  isHostedOnProjectStorage: (u: string) => u.includes(".supabase.co/"),
  resolveImageForPersistence: vi.fn(async () => ({ ok: true, value: "https://p.supabase.co/storage/v1/object/public/scene-slides/c1/mirrored.png" })),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    slideDeck: { findMany: vi.fn(async () => []), findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(async () => 0), aggregate: vi.fn(async () => ({ _max: { sortOrder: null } })), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    campaignShow: { findUnique: vi.fn(async () => null), updateMany: vi.fn(async () => ({ count: 1 })), createMany: vi.fn(async () => ({ count: 1 })) },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const url = (n: string) => `https://p.supabase.co/storage/v1/object/public/scene-slides/c1/${n}.webp`;

const row = (slides: unknown[], over: Record<string, unknown> = {}) => ({ id: "d1", campaignId: "c1", title: "Таверна", sortOrder: 0, slides, createdAt: new Date(0), updatedAt: new Date(0), ...over });

const slide = (id: string, n: string, extra: Record<string, unknown> = {}) => ({ id, imageUrl: url(n), ...extra });

const put = async (body: unknown) => {
  const { PUT } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

  return PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1", deckId: "d1" }) });
};

const runAfter = () => Promise.all(afterCallbacks.map((cb) => cb()));

describe("decks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.slideDeck.update).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => row(data.slides as unknown[], { title: data.title })) as never);
  });

  it("гравець — 403 на список, створення, збереження, квиток", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const decks = await import("@/app/api/campaigns/[id]/decks/route");

    const ticket = await import("@/app/api/campaigns/[id]/decks/upload-url/route");

    const p = { params: Promise.resolve({ id: "c1" }) };

    expect((await decks.GET(new Request("http://x"), p)).status).toBe(403);
    expect((await decks.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ title: "a" }) }), p)).status).toBe(403);
    expect((await ticket.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ size: 10, contentType: "image/webp" }) }), p)).status).toBe(403);
    expect((await put({ title: "a", slides: [] })).status).toBe(403);
  });

  it("POST: ліміт наборів — 400", async () => {
    vi.mocked(prisma.slideDeck.count).mockResolvedValueOnce(100);

    const { POST } = await import("@/app/api/campaigns/[id]/decks/route");

    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ title: "a" }) }), { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(400);
  });

  it("PUT: чужий набір — 404", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([], { campaignId: "c2" }) as never);

    expect((await put({ title: "a", slides: [] })).status).toBe(404);
  });

  it("PUT: зовнішнє посилання дзеркалиться; зниклі файли стираються після відповіді, крім поточного слайда показу і картинок інших наборів", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a"), slide("slide-0002", "b"), slide("slide-0003", "c"), slide("slide-0004", "d")]) as never);
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d9", deckTitle: "Інший", slide: slide("slide-0099", "b"), nextImageUrl: null, audio: null, seq: 3 } as never);
    vi.mocked(prisma.slideDeck.findMany).mockResolvedValue([{ slides: [slide("slide-0050", "c")] }] as never);

    const res = await put({ title: "Таверна", slides: [slide("slide-0001", "a"), { id: "slide-0005", imageUrl: "https://example.com/x.png" }] });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { slides: { imageUrl: string }[] };

    expect(body.slides[1].imageUrl).toBe("https://p.supabase.co/storage/v1/object/public/scene-slides/c1/mirrored.png");
    expect(storage.removeSlideFiles).not.toHaveBeenCalled();

    await runAfter();
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("d")]);
  });

  it("PUT поточного набору: змінений поточний слайд — новий знімок і Pusher", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a"), slide("slide-0002", "b")]) as never);
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0001", "a"), nextImageUrl: url("b"), audio: null, seq: 3 } as never);

    await put({ title: "Таверна", slides: [slide("slide-0001", "a", { caption: "Ніч" }), slide("slide-0002", "b")] });

    await runAfter();

    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 3 }, data: { seq: 4 } });
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", expect.objectContaining({ campaignId: "c1", show: expect.objectContaining({ seq: 4, slide: expect.objectContaining({ caption: "Ніч" }) }) }));
  });

  it("DELETE: видаляє набір і після відповіді — його файли, крім поточного слайда показу", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a"), slide("slide-0002", "b")]) as never);
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0001", "a"), nextImageUrl: url("b"), audio: null, seq: 3 } as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

    const res = await DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "c1", deckId: "d1" }) });

    expect(res.status).toBe(200);
    expect(prisma.slideDeck.delete).toHaveBeenCalledWith({ where: { id: "d1" } });

    await runAfter();
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("b")]);
  });

  it("квиток: svg — 400; webp — квиток зі сховища", async () => {
    vi.mocked(storage.createSlideUploadTicket).mockResolvedValue({ ok: true, value: { bucket: "scene-slides", path: "c1/x.webp", token: "t", contentType: "image/webp", publicUrl: url("x") } });

    const { POST } = await import("@/app/api/campaigns/[id]/decks/upload-url/route");

    const p = { params: Promise.resolve({ id: "c1" }) };

    expect((await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ size: 10, contentType: "image/svg+xml" }) }), p)).status).toBe(400);

    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ size: 10, contentType: "image/webp" }) }), p);

    expect(await res.json()).toMatchObject({ path: "c1/x.webp", publicUrl: url("x") });
  });
});
```

Run: `pnpm test:run app/api/__tests__/decks-api.test.ts` → FAIL. Перевірити `loadOwned` (`lib/utils/api/load-owned.ts`): тест очікує 404 для чужої кампанії; якщо `loadOwned` віддає 403 — змінити очікування на фактичний статус `loadOwned` для чужої кампанії і так само в Step 5.

- [ ] **Step 5: Обробники `app/api/campaigns/[id]/decks/deck-handlers.ts`**

```ts
import { after, NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_DECKS_PER_CAMPAIGN } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { createDeckSchema, readSlides, saveDeckSchema, slideUploadRequestSchema } from "@/lib/schemas/show";
import { listDecks, persistSlideImages, toSlideDeck, urlsUsedElsewhere } from "@/lib/server/show/deck-store";
import { publishShow, readShowState, writeShowState } from "@/lib/server/show/show-store";
import { createSlideUploadTicket, removeSlideFiles } from "@/lib/supabase/scene-slide-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { removedSlideUrls } from "@/lib/utils/show/deck-files";
import { refreshShowSlide } from "@/lib/utils/show/show-command";
import type { Slide } from "@/types/show";

const ownedDeck = (campaignId: string, deckId: string) => loadOwned(prisma.slideDeck.findUnique({ where: { id: deckId } }), campaignId, API_ERRORS.DECK_NOT_FOUND);

/** Після відповіді: стерти файли, що зникли, крім картинки на екрані і картинок інших наборів. */
function cleanupLater(campaignId: string, deckId: string, before: Slide[], after_: Slide[]) {
  after(async () => {
    const [show, elsewhere] = await Promise.all([readShowState(campaignId), urlsUsedElsewhere(campaignId, deckId)]);

    const keep = [...elsewhere, ...(show?.slide ? [show.slide.imageUrl] : [])];

    const urls = removedSlideUrls(before, after_, keep);

    if (urls.length > 0) await removeSlideFiles(campaignId, urls);
  });
}

export async function getDecksHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listDecks(campaignId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "list decks" });
  }
}

export async function createDeckHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createDeckSchema, req);

    if (body instanceof NextResponse) return body;

    if ((await prisma.slideDeck.count({ where: { campaignId } })) >= MAX_DECKS_PER_CAMPAIGN) return errorResponse(API_ERRORS.DECK_LIMIT, 400);

    const last = await prisma.slideDeck.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.slideDeck.create({ data: { campaignId, title: body.title, sortOrder: (last._max.sortOrder ?? -1) + 1 } });

    return NextResponse.json(toSlideDeck(row), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create deck" });
  }
}

export async function getDeckHandler(campaignId: string, deckId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    return NextResponse.json(toSlideDeck(deck), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "get deck" });
  }
}

export async function saveDeckHandler(req: Request, campaignId: string, deckId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(saveDeckSchema, req);

    if (body instanceof NextResponse) return body;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    const previous = readSlides(deck.slides);

    const slides = await persistSlideImages(campaignId, body.slides, previous);

    if (!slides.ok) return errorResponse(slides.message, 400);

    const saved = toSlideDeck(await prisma.slideDeck.update({ where: { id: deckId }, data: { title: body.title, slides: slides.value } }));

    cleanupLater(campaignId, deckId, previous, saved.slides);

    after(async () => {
      const show = await readShowState(campaignId);

      const next = show && refreshShowSlide(show, saved);

      // конфлікт з командою ДМ не страшний: наступне перемикання візьме свіжий набір
      if (next && (await writeShowState(campaignId, show, next))) await publishShow(campaignId, next);
    });

    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error, { action: "save deck" });
  }
}

export async function deleteDeckHandler(campaignId: string, deckId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    await prisma.slideDeck.delete({ where: { id: deckId } });

    cleanupLater(campaignId, deckId, readSlides(deck.slides), []);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete deck" });
  }
}

export async function issueSlideUploadHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(slideUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const ticket = await createSlideUploadTicket(campaignId, body.contentType);

    return ticket.ok ? NextResponse.json(ticket.value) : errorResponse(ticket.message, 500);
  } catch (error) {
    return handleApiError(error, { action: "issue slide upload" });
  }
}
```

Примітка до тесту «PUT поточного набору»: `publishShow` у Task 5 сам викликає `after()` для Pusher — у цьому обробнику він уже всередині `after`, тому `publishShow` має **повертати проміс тригера, не реєструючи ще один `after`** (див. Task 5 Step 1: `publishShow` = `safePusherTrigger(...)`, а реєстрацію `after(() => publishShow(...))` робить викликач у show-handler).

Маршрути:

```ts
// app/api/campaigns/[id]/decks/route.ts
import { createDeckHandler, getDecksHandler } from "./deck-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return getDecksHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createDeckHandler(req, (await params).id);
}
```

```ts
// app/api/campaigns/[id]/decks/[deckId]/route.ts
import { deleteDeckHandler, getDeckHandler, saveDeckHandler } from "../deck-handlers";

type Params = { params: Promise<{ id: string; deckId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return getDeckHandler(id, deckId);
}

export async function PUT(req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return saveDeckHandler(req, id, deckId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return deleteDeckHandler(id, deckId);
}
```

```ts
// app/api/campaigns/[id]/decks/upload-url/route.ts
import { issueSlideUploadHandler } from "../deck-handlers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return issueSlideUploadHandler(req, (await params).id);
}
```

Статичний сегмент `upload-url` має пріоритет над `[deckId]` у Next — конфлікту немає.

Run: `pnpm test:run app/api/__tests__/decks-api.test.ts` → PASS. Якщо `app/api/__tests__/dm-only-routes-api.test.ts` перелічує DM-маршрути — додати туди нові (`decks`, `decks/[deckId]`, `decks/upload-url`) за зразком наявних записів.

- [ ] **Step 6: Перевірка і commit**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run app/api/__tests__` → PASS.

```bash
git add lib/supabase/scene-slide-storage.ts lib/server/show app/api/campaigns/\[id\]/decks app/api/__tests__
git commit -m "feat(show): slide deck storage and DM deck API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: API показу, Pusher, активні покази

**Files:**
- Create (у Task 4 вже створено): `lib/server/show/show-store.ts`
- Create: `app/api/campaigns/[id]/show/route.ts`, `app/api/campaigns/[id]/show/show-handler.ts`
- Modify: `lib/pusher/channels.ts`, `app/api/pusher/auth/channel-access.ts`, `lib/utils/api/rate-limit.ts`, `app/api/campaigns/active-battles/route.ts`
- Test: `app/api/__tests__/show-api.test.ts`, доповнити `app/api/__tests__/pusher-auth-api.test.ts`

**Interfaces:**
- Consumes: `applyShowCommand`, `showNeedsLibrary` (Task 2), `loadShowDeck` (Task 4), `loadAudioLibrary` (`lib/server/audio/track-store.ts`).
- Produces:
  - `showChannelName(campaignId)`, `SHOW_CHANNEL_PREFIX = "private-show-"`, `SHOW_STATE_EVENT = "show-state"`;
  - `toShowState(row)`, `readShowState(campaignId): Promise<ShowState | null>`, `writeShowState(campaignId, prev: ShowState | null, next: ShowState): Promise<boolean>`, `publishShow(campaignId, show): Promise<void>`;
  - `readShow(campaignId): Promise<NextResponse>` (GET і серверна сторінка), `commandShow(req, campaignId)`;
  - `GET /api/campaigns/active-battles?withShows=1` → `ActiveSessions`.

- [ ] **Step 1: `lib/server/show/show-store.ts`**

```ts
import { Prisma } from "@prisma/client";

import "server-only";
import { prisma } from "@/lib/db";
import { SHOW_STATE_EVENT, showChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import type { BattleAudioState } from "@/types/audio";
import type { ShowEvent, ShowState, Slide } from "@/types/show";

const SHOW_SELECT = { deckId: true, deckTitle: true, slide: true, nextImageUrl: true, audio: true, seq: true } as const;

type ShowRow = Prisma.CampaignShowGetPayload<{ select: typeof SHOW_SELECT }>;

export function toShowState(row: ShowRow): ShowState {
  return {
    deckId: row.deckId,
    deckTitle: row.deckTitle,
    slide: (row.slide ?? null) as Slide | null,
    nextImageUrl: row.nextImageUrl,
    audio: (row.audio ?? null) as BattleAudioState | null,
    seq: row.seq,
  };
}

export async function readShowState(campaignId: string): Promise<ShowState | null> {
  const row = await prisma.campaignShow.findUnique({ where: { campaignId }, select: SHOW_SELECT });

  return row ? toShowState(row) : null;
}

const json = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/** Оптимістичне блокування за seq; рядок створюється лише першим записом і ніколи не видаляється. */
export async function writeShowState(campaignId: string, prev: ShowState | null, next: ShowState): Promise<boolean> {
  const data = { deckId: next.deckId, deckTitle: next.deckTitle, slide: json(next.slide), nextImageUrl: next.nextImageUrl, audio: json(next.audio), seq: next.seq };

  if (!prev) {
    const { count } = await prisma.campaignShow.createMany({ data: [{ campaignId, ...data }], skipDuplicates: true });

    return count === 1;
  }

  const { count } = await prisma.campaignShow.updateMany({ where: { campaignId, seq: prev.seq }, data });

  return count === 1;
}

/** Викликати з after(): Pusher не повинен затримувати відповідь. */
export function publishShow(campaignId: string, show: ShowState): Promise<void> {
  const event: ShowEvent = { campaignId, show };

  return safePusherTrigger(pusherServer, showChannelName(campaignId), SHOW_STATE_EVENT, event, { action: "show state" });
}
```

Перевірити сигнатуру `safePusherTrigger` у `lib/pusher/safe-trigger.ts` (повертає `Promise<void>`?) і узгодити тип повернення `publishShow`.

- [ ] **Step 2: Канали і ліміт**

`lib/pusher/channels.ts` додати:

```ts
export const showChannelName = (campaignId: string): string => `private-show-${campaignId}`;

export const SHOW_CHANNEL_PREFIX = "private-show-";

/** Повний стан показу: він малий, дельти не потрібні. */
export const SHOW_STATE_EVENT = "show-state";
```

`app/api/pusher/auth/channel-access.ts` — перед `return false;` додати:

```ts
  if (channelName.startsWith(SHOW_CHANNEL_PREFIX)) {
    const campaignId = channelName.slice(SHOW_CHANNEL_PREFIX.length);

    if (!campaignId) return false;

    const member = await prisma.campaignMember.findFirst({ where: { campaignId, userId }, select: { id: true } });

    return !!member;
  }
```

(імпорт `SHOW_CHANNEL_PREFIX` з `@/lib/pusher/channels`).

`lib/utils/api/rate-limit.ts` у `BATTLE_RATE_LIMITS` після `audio`:

```ts
  /** Показ слайдів (ДМ): гортання і музика. */
  show: { limit: 30, windowSeconds: 10 },
```

- [ ] **Step 3: Тест API показу (падає)**

`app/api/__tests__/show-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/utils/api/rate-limit", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })) }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaignShow: { findUnique: vi.fn(async () => null), updateMany: vi.fn(async () => ({ count: 1 })), createMany: vi.fn(async () => ({ count: 1 })) },
    slideDeck: { findFirst: vi.fn() },
    campaignTrack: { findMany: vi.fn(async () => []) },
  },
}));

const access = (isDM: boolean) => ({ userId: isDM ? "dm" : "p", isDM, campaign: { id: "c1", maxLevel: 20, members: [] } }) as never;

const url = (n: number) => `https://p.supabase.co/storage/v1/object/public/scene-slides/c1/${n}.webp`;

const deckRow = { id: "d1", title: "Таверна", slides: [{ id: "slide-0001", imageUrl: url(1) }, { id: "slide-0002", imageUrl: url(2) }, { id: "slide-0003", imageUrl: url(3) }] };

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/campaigns/[id]/show/route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1" }) });
};

describe("show API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.useFakeTimers({ now: 10_000, toFake: ["Date"] });
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access(true));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(false));
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(deckRow as never);
  });

  afterEach(() => vi.useRealTimers());

  it("гравець не може керувати — 403 без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await post({ action: "next" })).status).toBe(403);
    expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
  });

  it("перший open створює рядок; відповідь — стан без набору; Pusher після відповіді", async () => {
    const res = await post({ action: "open", deckId: "d1" });

    const show = { deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[0], nextImageUrl: url(2), audio: null, seq: 1 };

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ show });
    expect(prisma.campaignShow.createMany).toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();

    await Promise.all(afterCallbacks.map((cb) => cb()));
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", { campaignId: "c1", show });
  });

  it("гонка — 409, без Pusher", async () => {
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[0], nextImageUrl: url(2), audio: null, seq: 4 } as never);
    vi.mocked(prisma.campaignShow.updateMany).mockResolvedValueOnce({ count: 0 });

    const res = await post({ action: "next" });

    expect(res.status).toBe(409);
    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 4 } });
    expect(afterCallbacks).toHaveLength(0);
  });

  it("next на останньому слайді — 200 з тим самим станом, без запису і Pusher", async () => {
    const last = { deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[2], nextImageUrl: null, audio: null, seq: 4 };

    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(last as never);

    const res = await post({ action: "next" });

    expect(await res.json()).toEqual({ show: last });
    expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("помилки команд — 422; невідома дія — 400", async () => {
    expect((await post({ action: "next" })).status).toBe(422);
    expect((await post({ action: "jump" })).status).toBe(400);
  });

  it("GET для гравця: лише поточний слайд і наступна картинка, без кешу", async () => {
    const state = { deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[1], nextImageUrl: url(3), audio: null, seq: 2 };

    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(state as never);

    const { GET } = await import("@/app/api/campaigns/[id]/show/route");

    const res = await GET(new Request("http://x"), { params: Promise.resolve({ id: "c1" }) });

    expect(await res.json()).toEqual({ show: state });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(prisma.slideDeck.findFirst).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test:run app/api/__tests__/show-api.test.ts` → FAIL.

- [ ] **Step 4: `app/api/campaigns/[id]/show/show-handler.ts` і маршрут**

```ts
import { after, NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { showCommandSchema } from "@/lib/schemas/show";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { loadShowDeck } from "@/lib/server/show/deck-store";
import { publishShow, readShowState, writeShowState } from "@/lib/server/show/show-store";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { applyShowCommand, showNeedsLibrary } from "@/lib/utils/show/show-command";
import type { ShowCommand, ShowResponse, ShowState } from "@/types/show";

const deckIdFor = (cmd: ShowCommand, prev: ShowState | null) => (cmd.action === "open" ? cmd.deckId : cmd.action === "next" || cmd.action === "prev" ? prev?.deckId ?? null : null);

export async function readShow(campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const body: ShowResponse = { show: await readShowState(campaignId) };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "read show" });
  }
}

export async function commandShow(req: Request, campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const rate = await checkRateLimit({ userId: access.userId, scope: "show", battleId: campaignId, ...BATTLE_RATE_LIMITS.show });

    if (!rate.allowed) return rateLimitResponse(rate);

    const cmd = await parseBody(showCommandSchema, req);

    if (cmd instanceof NextResponse) return cmd;

    const prev = await readShowState(campaignId);

    const deckId = deckIdFor(cmd, prev);

    const [deck, library] = await Promise.all([deckId ? loadShowDeck(campaignId, deckId) : null, showNeedsLibrary(cmd) ? loadAudioLibrary(campaignId) : []]);

    const result = applyShowCommand(prev, cmd, { now: Date.now(), deck, library });

    if (!result.ok) return errorResponse(result.message, 422);

    const next = result.value;

    if (next === prev) return NextResponse.json({ show: prev } satisfies ShowResponse);

    if (!(await writeShowState(campaignId, prev, next))) return errorResponse(API_ERRORS.SHOW_CONFLICT, 409);

    after(() => publishShow(campaignId, next));

    return NextResponse.json({ show: next } satisfies ShowResponse);
  } catch (error) {
    return handleApiError(error, { action: "show command" });
  }
}
```

Перевірити, що `checkRateLimit` приймає довільний рядок `scope` і `battleId` (тип `RateLimitInput` у `lib/utils/api/rate-limit.ts`); якщо `scope` — union, додати `"show"`.

```ts
// app/api/campaigns/[id]/show/route.ts
import { commandShow, readShow } from "./show-handler";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return readShow((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return commandShow(req, (await params).id);
}
```

Run: `pnpm test:run app/api/__tests__/show-api.test.ts` → PASS.

- [ ] **Step 5: Pusher auth тест**

У `app/api/__tests__/pusher-auth-api.test.ts` за зразком наявних кейсів для `private-battle-*` додати: мок `prisma.campaignMember.findFirst`; кейс «учасник кампанії підписується на `private-show-c1` — 200», «не учасник — 403», «`private-show-` без id — 403». Run → PASS.

- [ ] **Step 6: Активні покази**

`app/api/campaigns/active-battles/route.ts`: `export async function GET(request: Request)`; після запиту боїв:

```ts
    if (new URL(request.url).searchParams.get("withShows") !== "1") return NextResponse.json(activeBattles);

    const shows = await prisma.campaignShow.findMany({
      where: { deckId: { not: null }, campaign: { members: { some: { userId } } } },
      select: { campaignId: true },
    });

    return NextResponse.json({ battles: activeBattles, shows } satisfies ActiveSessions);
```

(імпорт `type ActiveSessions` з `@/types/campaigns`). Якщо `app/api/__tests__/campaigns-api.test.ts` або інший тест викликає `GET()` без аргументу — передати `new Request("http://x/api/campaigns/active-battles")`, і додати кейс `?withShows=1` → `{ battles, shows }`.

- [ ] **Step 7: Перевірка і commit**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run app/api/__tests__` → PASS.

```bash
git add lib/server/show lib/pusher app/api lib/utils/api/rate-limit.ts
git commit -m "feat(show): live show API, Pusher channel and active shows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Клієнтський шар — `lib/api` і хуки показу

**Files:**
- Create: `lib/api/decks.ts`, `lib/api/show.ts`
- Modify: `lib/api/campaigns.ts`, `lib/hooks/campaigns/useActiveBattles.ts`, `lib/hooks/campaigns/useJoinBattle.ts`, `lib/hooks/campaigns/index.ts`
- Create: `lib/hooks/campaigns/useWatchShow.ts`, `lib/utils/campaigns/watch-show.ts`
- Create: `lib/hooks/show/keys.ts`, `show-snapshot.ts`, `useShowState.ts`, `useShowControl.ts`, `useShowAudioHost.ts`, `usePusherShowSync.ts`, `useDecks.ts`, `useDeckEditor.ts`, `useSlideUpload.ts`, `index.ts`
- Create: `lib/utils/show/resize-image.ts`
- Test: `lib/hooks/show/__tests__/show-snapshot.test.ts`, `lib/utils/campaigns/__tests__/watch-show.test.ts`

**Interfaces:**
- Consumes: маршрути Task 4–5; `withClock` (Task 3), `AudioHost`, `writeAudioSnapshot` (Task 3); `mergeShow`, `deckDraftReducer`, `fitWithin` (Task 2); `usePusherChannel` з `@/lib/hooks/battle`.
- Produces:
  - `lib/api/decks.ts`: `getDecks(campaignId): Promise<SlideDeckSummary[]>`, `getDeck(campaignId, deckId): Promise<SlideDeck>`, `createDeck(campaignId, data: CreateDeckData): Promise<SlideDeck>`, `saveDeck(campaignId, deckId, data: SaveDeckData): Promise<SlideDeck>`, `deleteDeck(campaignId, deckId): Promise<{ ok: true }>`, `uploadSlideImage(campaignId, blob: Blob): Promise<string>`;
  - `lib/api/show.ts`: `getShow(campaignId): Promise<ShowSnapshot>`, `sendShow(campaignId, cmd: ShowCommand): Promise<ShowSnapshot>`;
  - `lib/api/campaigns.ts`: `getActiveSessions(): Promise<ActiveSessions>` (замість `getActiveBattles`);
  - `showKeys` = `{ decks(c), deck(c, id), state(c), audio(c) }`;
  - `writeShowSnapshot(queryClient, campaignId, incoming: { show: ShowState | null | undefined; clockOffsetMs?: number | null }): void`;
  - `useShowState(campaignId): { show: ShowState | null }`;
  - `useShowControl(campaignId, onFailure): ShowControl`, `interface ShowControl { send(cmd: ShowCommand): Promise<boolean>; pending: boolean }`;
  - `useShowAudioHost(args: { campaignId: string; isDM: boolean; onFailure(message: string): void }): AudioHost`;
  - `usePusherShowSync(campaignId): void`;
  - `useDecks(campaignId)`, `useDeck(campaignId, deckId)`, `useDeckMutations(campaignId)` → `{ create(title): Promise<SlideDeck>, remove(deckId): Promise<void>, pending: boolean }`;
  - `useDeckEditor(campaignId, deck: SlideDeck)` → `{ draft, dispatch, dirty, save(): Promise<void>, saving, upload: { addFiles(files: File[]): Promise<void>, addUrl(url: string): void, progress: { done: number; total: number } | null } }`;
  - `useWatchShow(): { href: string | null }`;
  - `pickWatchShow(shows: { campaignId: string }[], pathname: string | null): { campaignId: string } | null`, `showHref(campaignId): string`.

- [ ] **Step 1: Тести (падають)**

`lib/hooks/show/__tests__/show-snapshot.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { showKeys } from "../keys";
import { writeShowSnapshot } from "../show-snapshot";

import type { BattleAudioState } from "@/types/audio";
import type { ShowState } from "@/types/show";

const audio = (seq: number): BattleAudioState => ({ trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

const st = (seq: number, audioSeq: number): ShowState => ({ deckId: "d1", deckTitle: "Т", slide: null, nextImageUrl: null, audio: audio(audioSeq), seq });

describe("writeShowSnapshot", () => {
  it("пише стан показу за seq і аудіо в кеш плеєра; старіша подія не відкочує", () => {
    const qc = new QueryClient();

    writeShowSnapshot(qc, "c1", { show: st(5, 3), clockOffsetMs: 12 });
    writeShowSnapshot(qc, "c1", { show: st(4, 2) });

    expect(qc.getQueryData(showKeys.state("c1"))).toEqual({ show: st(5, 3), clockOffsetMs: 12 });
    expect(qc.getQueryData(showKeys.audio("c1"))).toEqual({ audio: audio(3), clockOffsetMs: 12 });

    writeShowSnapshot(qc, "c1", { show: st(6, 4) });

    expect(qc.getQueryData(showKeys.state("c1"))).toEqual({ show: st(6, 4), clockOffsetMs: 12 });
  });
});
```

`lib/utils/campaigns/__tests__/watch-show.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pickWatchShow } from "../watch-show";

describe("pickWatchShow", () => {
  const shows = [{ campaignId: "a" }, { campaignId: "b" }];

  it("спершу поточна кампанія, інакше перша; на сторінці показу — нічого", () => {
    expect(pickWatchShow(shows, "/campaigns/b/dm/units")).toEqual({ campaignId: "b" });
    expect(pickWatchShow(shows, "/campaigns")).toEqual({ campaignId: "a" });
    expect(pickWatchShow(shows, "/campaigns/b/show")).toBeNull();
    expect(pickWatchShow([], "/campaigns/b")).toBeNull();
  });
});
```

Run: `pnpm test:run lib/hooks/show lib/utils/campaigns/__tests__/watch-show.test.ts` → FAIL.

- [ ] **Step 2: `lib/api`**

```ts
// lib/api/show.ts
import { campaignGet, campaignPost } from "./client";
import { withClock } from "./with-clock";

import type { ShowCommand, ShowResponse, ShowSnapshot } from "@/types/show";

const toSnapshot = ({ body, clockOffsetMs }: { body: ShowResponse; clockOffsetMs: number | null }): ShowSnapshot => ({ show: body.show, clockOffsetMs });

export async function getShow(campaignId: string): Promise<ShowSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignGet<ShowResponse>(campaignId, "/show", { cache: "no-store", onResponse })));
}

export async function sendShow(campaignId: string, cmd: ShowCommand): Promise<ShowSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignPost<ShowResponse>(campaignId, "/show", cmd, { onResponse })));
}
```

```ts
// lib/api/decks.ts
import { campaignDelete, campaignGet, campaignPost, campaignPut } from "./client";

import { SLIDE_CACHE_SECONDS } from "@/lib/constants/show";
import { createClient } from "@/lib/supabase/client";
import type { CreateDeckData, SaveDeckData, SlideDeck, SlideDeckSummary, SlideUploadRequest, SlideUploadTicket } from "@/types/show";

export const getDecks = (campaignId: string) => campaignGet<SlideDeckSummary[]>(campaignId, "/decks", { cache: "no-store" });

export const getDeck = (campaignId: string, deckId: string) => campaignGet<SlideDeck>(campaignId, `/decks/${deckId}`, { cache: "no-store" });

export const createDeck = (campaignId: string, data: CreateDeckData) => campaignPost<SlideDeck>(campaignId, "/decks", data);

export const saveDeck = (campaignId: string, deckId: string, data: SaveDeckData) => campaignPut<SlideDeck>(campaignId, `/decks/${deckId}`, data);

export const deleteDeck = (campaignId: string, deckId: string) => campaignDelete<{ ok: true }>(campaignId, `/decks/${deckId}`);

/** Файл іде з браузера прямо в Storage: тіло запиту до Vercel обмежене 4,5 МБ. */
export async function uploadSlideImage(campaignId: string, blob: Blob): Promise<string> {
  const request: SlideUploadRequest = { size: blob.size, contentType: blob.type };

  const ticket = await campaignPost<SlideUploadTicket>(campaignId, "/decks/upload-url", request);

  const { error } = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: ticket.contentType, cacheControl: SLIDE_CACHE_SECONDS });

  if (error) throw new Error(`Не вдалося завантажити картинку: ${error.message}`);

  return ticket.publicUrl;
}
```

`lib/api/campaigns.ts`: замінити `getActiveBattles` на

```ts
export async function getActiveSessions(): Promise<ActiveSessions> {
  return request<ActiveSessions>("/api/campaigns/active-battles?withShows=1");
}
```

(`grep -rn getActiveBattles` — інших споживачів, крім `useActiveBattles`, бути не повинно.)

- [ ] **Step 3: Активні сесії в хедері**

`lib/hooks/campaigns/useActiveBattles.ts` — `queryFn: getActiveSessions` (ключ `battleKeys.active()` лишається, щоб інвалідації з `useBattles`/`useBattleAction` працювали). Перевірити `grep -rn "battleKeys.active" lib` — якщо десь є `setQueryData` з масивом, адаптувати під `ActiveSessions`.

`useJoinBattle.ts`: `const { data } = useActiveBattles(); const target = pickJoinBattle(data?.battles ?? [], pathname);`

`lib/utils/campaigns/watch-show.ts`:

```ts
export const showHref = (campaignId: string) => `/campaigns/${campaignId}/show`;

export function pickWatchShow(shows: { campaignId: string }[], pathname: string | null): { campaignId: string } | null {
  const campaignId = pathname?.match(/^\/campaigns\/([^/]+)/)?.[1];

  const target = shows.find((s) => s.campaignId === campaignId) ?? shows[0] ?? null;

  return target && pathname?.startsWith(showHref(target.campaignId)) ? null : target;
}
```

`lib/hooks/campaigns/useWatchShow.ts`:

```ts
"use client";

import { usePathname } from "next/navigation";

import { useActiveBattles } from "./useActiveBattles";

import { pickWatchShow, showHref } from "@/lib/utils/campaigns/watch-show";

export function useWatchShow(): { href: string | null } {
  const pathname = usePathname();

  const { data } = useActiveBattles();

  const target = pickWatchShow(data?.shows ?? [], pathname);

  return { href: target ? showHref(target.campaignId) : null };
}
```

Експортувати з `lib/hooks/campaigns/index.ts`.

- [ ] **Step 4: Хуки показу**

`lib/hooks/show/keys.ts` (без `"use client"`):

```ts
export const showKeys = {
  decks: (campaignId: string) => ["show-decks", campaignId] as const,
  deck: (campaignId: string, deckId: string) => ["show-deck", campaignId, deckId] as const,
  state: (campaignId: string) => ["show-state", campaignId] as const,
  audio: (campaignId: string) => ["show-audio", campaignId] as const,
};
```

`lib/hooks/show/show-snapshot.ts`:

```ts
import type { QueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";

import { writeAudioSnapshot } from "@/lib/hooks/audio";
import { mergeShow } from "@/lib/utils/show/merge-show";
import type { ShowSnapshot, ShowState } from "@/types/show";

/** Один вхід для GET, відповіді на команду і Pusher: стан показу за seq, аудіо — у кеш плеєра. */
export function writeShowSnapshot(queryClient: QueryClient, campaignId: string, incoming: { show: ShowState | null | undefined; clockOffsetMs?: number | null }): void {
  queryClient.setQueryData<ShowSnapshot>(showKeys.state(campaignId), (prev) => {
    const show = mergeShow(prev?.show ?? null, incoming.show);

    const clockOffsetMs = incoming.clockOffsetMs ?? prev?.clockOffsetMs ?? null;

    return prev && show === prev.show && clockOffsetMs === prev.clockOffsetMs ? prev : { show, clockOffsetMs };
  });

  writeAudioSnapshot(queryClient, showKeys.audio(campaignId), { audio: incoming.show?.audio, clockOffsetMs: incoming.clockOffsetMs });
}
```

`lib/hooks/show/useShowState.ts`:

```ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { getShow } from "@/lib/api/show";
import type { ShowSnapshot, ShowState } from "@/types/show";

/** Сервер кладе стан у кеш через PrefetchedQuery; далі — Pusher і повторний GET після перепідписки. */
export function useShowState(campaignId: string): { show: ShowState | null } {
  const queryClient = useQueryClient();

  const { data } = useQuery<ShowSnapshot>({
    queryKey: showKeys.state(campaignId),
    queryFn: async () => {
      writeShowSnapshot(queryClient, campaignId, await getShow(campaignId));

      return queryClient.getQueryData<ShowSnapshot>(showKeys.state(campaignId)) ?? { show: null, clockOffsetMs: null };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return { show: data?.show ?? null };
}
```

`lib/hooks/show/useShowControl.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { ApiError } from "@/lib/api/client";
import { sendShow } from "@/lib/api/show";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { ShowCommand } from "@/types/show";

export interface ShowControl {
  send(cmd: ShowCommand): Promise<boolean>;
  pending: boolean;
}

export function useShowControl(campaignId: string, onFailure: (message: string) => void): ShowControl {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (cmd: ShowCommand) => sendShow(campaignId, cmd),
    onSuccess: (fresh) => writeShowSnapshot(queryClient, campaignId, fresh),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: showKeys.state(campaignId) });

      onFailure(errorMessage(error, "Не вдалося керувати показом"));
    },
  });

  return useMemo(
    () => ({
      send: (cmd: ShowCommand) =>
        mutateAsync(cmd).then(
          () => true,
          () => false,
        ),
      pending: isPending,
    }),
    [mutateAsync, isPending],
  );
}
```

`lib/hooks/show/useShowAudioHost.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";
import { useShowState } from "./useShowState";

import { getShow, sendShow } from "@/lib/api/show";
import type { AudioHost } from "@/lib/hooks/audio";
import type { BattleAudioCommand } from "@/types/audio";
import type { ShowSnapshot } from "@/types/show";

const toAudio = (s: ShowSnapshot) => ({ audio: s.show?.audio ?? null, clockOffsetMs: s.clockOffsetMs });

export function useShowAudioHost({ campaignId, isDM, onFailure }: { campaignId: string; isDM: boolean; onFailure(message: string): void }): AudioHost {
  const queryClient = useQueryClient();

  const { show } = useShowState(campaignId);

  const queryKey = useMemo(() => showKeys.audio(campaignId), [campaignId]);

  return useMemo(
    () => ({
      campaignId,
      isDM,
      queryKey,
      seed: show?.audio,
      fetch: async () => {
        const fresh = await getShow(campaignId);

        writeShowSnapshot(queryClient, campaignId, fresh);

        return toAudio(fresh);
      },
      send: async (cmd: BattleAudioCommand) => {
        const fresh = await sendShow(campaignId, { action: "audio", command: cmd });

        writeShowSnapshot(queryClient, campaignId, fresh);

        return toAudio(fresh);
      },
      onFailure,
    }),
    [campaignId, isDM, queryKey, show?.audio, queryClient, onFailure],
  );
}
```

`lib/hooks/show/usePusherShowSync.ts`:

```ts
"use client";

import { useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { usePusherChannel } from "@/lib/hooks/battle";
import { SHOW_STATE_EVENT, showChannelName } from "@/lib/pusher/channels";
import type { ShowEvent } from "@/types/show";

export function usePusherShowSync(campaignId: string): void {
  const queryClient = useQueryClient();

  usePusherChannel(
    showChannelName(campaignId),
    {
      [SHOW_STATE_EVENT]: (data) => {
        const show = (data as Partial<ShowEvent> | null)?.show;

        if (!show || typeof show.seq !== "number") return;

        writeShowSnapshot(queryClient, campaignId, { show });
      },
    },
    {
      // стан із HTML старший за підписку: події між ними загубилися б
      onSubscribed: () => void queryClient.invalidateQueries({ queryKey: showKeys.state(campaignId) }),
      onError: (error) => console.warn("[show-sync] show channel subscription failed", error),
    },
  );
}
```

Перевірити `usePusherChannel`: чи `handlers`/`callbacks` мають бути стабільними між рендерами (читає через ref чи в залежностях ефекту). Якщо в залежностях — обгорнути обидва об'єкти в `useMemo` з `[queryClient, campaignId]`.

`lib/hooks/show/useDecks.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";

import { createDeck, deleteDeck, getDeck, getDecks } from "@/lib/api/decks";
import type { SlideDeck, SlideDeckSummary } from "@/types/show";

export function useDecks(campaignId: string, options: { initial?: SlideDeckSummary[]; enabled?: boolean } = {}) {
  return useQuery<SlideDeckSummary[]>({
    queryKey: showKeys.decks(campaignId),
    queryFn: () => getDecks(campaignId),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    ...(options.initial && { initialData: options.initial }),
  });
}

export function useDeck(campaignId: string, deckId: string | null, options: { initial?: SlideDeck } = {}) {
  return useQuery<SlideDeck>({
    queryKey: showKeys.deck(campaignId, deckId ?? ""),
    queryFn: () => getDeck(campaignId, deckId as string),
    enabled: !!deckId,
    staleTime: 30_000,
    ...(options.initial && { initialData: options.initial }),
  });
}

export function useDeckMutations(campaignId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });

  const create = useMutation({ mutationFn: (title: string) => createDeck(campaignId, { title }), onSuccess: invalidate });

  const remove = useMutation({ mutationFn: (deckId: string) => deleteDeck(campaignId, deckId), onSuccess: invalidate });

  return {
    create: (title: string) => create.mutateAsync(title),
    remove: async (deckId: string) => {
      await remove.mutateAsync(deckId);
    },
    pending: create.isPending || remove.isPending,
  };
}
```

`lib/utils/show/resize-image.ts` (браузерний код; юніт-тест покриває лише `fitWithin`):

```ts
import { SLIDE_MAX_EDGE_PX } from "@/lib/constants/show";
import { fitWithin } from "@/lib/utils/show/fit-image";

const toBlob = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

/** ≤ 2560 px за довшою стороною, WebP (або JPEG, якщо браузер не кодує WebP). */
export async function resizeSlideImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = fitWithin({ width: bitmap.width, height: bitmap.height }, SLIDE_MAX_EDGE_PX);

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Браузер не вміє обробляти картинки");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp");

  // Safari старших версій мовчки віддає PNG замість WebP
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg");

  if (!jpeg) throw new Error("Не вдалося стиснути картинку");

  return jpeg;
}
```

`lib/hooks/show/useSlideUpload.ts`:

```ts
"use client";

import { useCallback, useState } from "react";

import { uploadSlideImage } from "@/lib/api/decks";
import { resizeSlideImage } from "@/lib/utils/show/resize-image";
import type { Slide } from "@/types/show";

const PARALLEL = 3;

const newSlideId = () => `slide-${crypto.randomUUID()}`;

/** Файли вантажаться по три паралельно; невдалі пропускаються, їхні помилки — у onError. */
export function useSlideUpload(campaignId: string, onError: (message: string) => void) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const upload = useCallback(
    async (files: File[]): Promise<Slide[]> => {
      const slides: (Slide | null)[] = new Array(files.length).fill(null);

      let next = 0;

      let done = 0;

      setProgress({ done, total: files.length });

      const worker = async () => {
        while (next < files.length) {
          const i = next++;

          try {
            slides[i] = { id: newSlideId(), imageUrl: await uploadSlideImage(campaignId, await resizeSlideImage(files[i])) };
          } catch (e) {
            onError(`${files[i].name}: ${e instanceof Error ? e.message : "помилка"}`);
          }

          done += 1;
          setProgress({ done, total: files.length });
        }
      };

      await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, worker));

      setProgress(null);

      return slides.filter((s): s is Slide => s !== null);
    },
    [campaignId, onError],
  );

  return { upload, progress, newSlideId };
}
```

`lib/hooks/show/useDeckEditor.ts`:

```ts
"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { useSlideUpload } from "./useSlideUpload";

import { saveDeck } from "@/lib/api/decks";
import { useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import { type DeckDraft, deckDraftReducer } from "@/lib/utils/show/deck-draft";
import type { SlideDeck } from "@/types/show";

const draftOf = (deck: SlideDeck): DeckDraft => ({ title: deck.title, slides: deck.slides });

export function useDeckEditor(campaignId: string, deck: SlideDeck) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const [saved, setSaved] = useState(() => draftOf(deck));

  const [draft, dispatch] = useReducer(deckDraftReducer, saved);

  const dirty = draft !== saved;

  const fail = useCallback((message: string) => void notify(message), [notify]);

  const { upload, progress, newSlideId } = useSlideUpload(campaignId, fail);

  const mutation = useMutation({
    mutationFn: (data: DeckDraft) => saveDeck(campaignId, deck.id, data),
    onSuccess: (fresh) => {
      const next = draftOf(fresh);

      setSaved(next);
      dispatch({ type: "reset", draft: next });
      queryClient.setQueryData(showKeys.deck(campaignId, deck.id), fresh);
      void queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
    },
    onError: (e) => fail(errorMessage(e, "Не вдалося зберегти набір")),
  });

  useEffect(() => {
    if (!dirty) return;

    const warn = (e: BeforeUnloadEvent) => e.preventDefault();

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addFiles = useCallback(async (files: File[]) => dispatch({ type: "add", slides: await upload(files) }), [upload]);

  const addUrl = useCallback((url: string) => dispatch({ type: "add", slides: [{ id: newSlideId(), imageUrl: url.trim() }] }), [newSlideId]);

  return {
    draft,
    dispatch,
    dirty,
    save: async () => {
      await mutation.mutateAsync(draft).catch(() => undefined);
    },
    saving: mutation.isPending,
    upload: { addFiles, addUrl, progress },
  };
}
```

Перевірити сигнатуру `useNotify()` у `lib/hooks/common` (повертає функцію чи об'єкт) і узгодити виклик `notify(message)`.

`lib/hooks/show/index.ts`:

```ts
export { showKeys } from "./keys";
export { writeShowSnapshot } from "./show-snapshot";
export { useDeckEditor } from "./useDeckEditor";
export { useDeck, useDeckMutations, useDecks } from "./useDecks";
export { usePusherShowSync } from "./usePusherShowSync";
export { useShowAudioHost } from "./useShowAudioHost";
export { type ShowControl, useShowControl } from "./useShowControl";
export { useShowState } from "./useShowState";
export { useSlideUpload } from "./useSlideUpload";
```

Run: `pnpm test:run lib/hooks/show lib/utils/campaigns lib/hooks/campaigns && pnpm exec tsc --noEmit && pnpm lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api lib/hooks/show lib/hooks/campaigns lib/utils/show lib/utils/campaigns types
git commit -m "feat(show): client API and hooks for decks, live show and header sessions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Редактор наборів (ДМ)

**Files:**
- Create: `app/campaigns/[id]/dm/show/page.tsx`, `app/campaigns/[id]/dm/show/page-client.tsx`
- Create: `app/campaigns/[id]/dm/show/[deckId]/page.tsx`, `app/campaigns/[id]/dm/show/[deckId]/page-client.tsx`
- Create: `components/show/editor/DeckCard.tsx`, `NewDeckDialog.tsx`, `SlideGrid.tsx`, `SlideDialog.tsx`, `TrackPicker.tsx`, `AddSlidesBar.tsx`
- Modify: `app/campaigns/[id]/page.tsx` (плитка ДМ)
- Test: `components/show/__tests__/SlideGrid.test.tsx`

**Interfaces:**
- Consumes: `useDecks`, `useDeck`, `useDeckMutations`, `useDeckEditor`, `useShowControl` (Task 6); `listDecks`, `toSlideDeck` (Task 4); `useTracks` (`@/lib/hooks/music`); `filterTracks`, `groupTracks` (`@/lib/utils/audio/playlist-groups`).
- Produces: сторінки `dm/show` і `dm/show/[deckId]`.

Перед написанням прочитати API: `components/hud/page/HudCard.tsx`, `HudPageHeader.tsx`, `components/hud/form/HudFormPage.tsx`, `HudForm.tsx`, `components/common/ActionBar.tsx`, `components/ui/responsive-dialog.tsx`, `components/common/states/*`, і подивитися готовий зразок `app/campaigns/[id]/dm/music/page-client.tsx` + `components/music/*`. Нижче — структура і поведінка; пропси HUD-компонентів узгоджувати з їхніми реальними сигнатурами.

- [ ] **Step 1: Тест сітки слайдів (падає)**

`components/show/__tests__/SlideGrid.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SlideGrid } from "../editor/SlideGrid";

afterEach(cleanup);

const slides = [
  { id: "slide-0001", imageUrl: "https://x.supabase.co/a.webp", title: "Таверна", trackId: "t1" },
  { id: "slide-0002", imageUrl: "https://x.supabase.co/b.webp" },
];

describe("SlideGrid", () => {
  it("номер, заголовок, значок треку; стрілки шлють move, крайні вимкнені", () => {
    const dispatch = vi.fn();

    render(<SlideGrid slides={slides} actions={{ dispatch, edit: vi.fn() }} />);

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("Таверна")).toBeTruthy();
    expect(screen.getAllByLabelText("Є трек")).toHaveLength(1);

    expect((screen.getAllByRole("button", { name: "Посунути вліво" })[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByRole("button", { name: "Посунути вправо" })[1] as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getAllByRole("button", { name: "Посунути вправо" })[0]);
    expect(dispatch).toHaveBeenCalledWith({ type: "move", id: "slide-0001", dir: 1 });

    fireEvent.click(screen.getAllByRole("button", { name: "Видалити слайд" })[1]);
    expect(dispatch).toHaveBeenCalledWith({ type: "remove", id: "slide-0002" });
  });

  it("клік по мініатюрі — редагування слайда", () => {
    const edit = vi.fn();

    render(<SlideGrid slides={slides} actions={{ dispatch: vi.fn(), edit }} />);

    fireEvent.click(screen.getByRole("button", { name: "Слайд 2" }));
    expect(edit).toHaveBeenCalledWith("slide-0002");
  });
});
```

Run → FAIL.

- [ ] **Step 2: `components/show/editor/SlideGrid.tsx`**

```tsx
"use client";

import type { Dispatch } from "react";
import { ChevronLeft, ChevronRight, Music, Trash2 } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { DeckDraftAction } from "@/lib/utils/show/deck-draft";
import type { Slide } from "@/types/show";

const ICON_BUTTON = "flex size-7 items-center justify-center rounded text-hud-muted hover:bg-white/10 hover:text-hud-bone disabled:opacity-30";

export function SlideGrid({ slides, actions }: { slides: Slide[]; actions: { dispatch: Dispatch<DeckDraftAction>; edit(id: string): void } }) {
  const { dispatch, edit } = actions;

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {slides.map((slide, i) => (
        <li key={slide.id} className="overflow-hidden rounded border border-hud-rule bg-black/40">
          <button type="button" aria-label={`Слайд ${i + 1}`} onClick={() => edit(slide.id)} className="relative block aspect-video w-full bg-black">
            <OptimizedImage src={slide.imageUrl} alt="" width={320} height={180} className="size-full object-contain" />
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs text-hud-bone">{i + 1}</span>
            {slide.trackId && (
              <span aria-label="Є трек" className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-hud-gold">
                <Music className="size-3.5" />
              </span>
            )}
          </button>
          <div className="flex items-center gap-1 px-1.5 py-1">
            <span className="min-w-0 flex-1 truncate text-xs text-hud-bone" title={slide.title}>
              {slide.title ?? ""}
            </span>
            <button type="button" aria-label="Посунути вліво" disabled={i === 0} onClick={() => dispatch({ type: "move", id: slide.id, dir: -1 })} className={ICON_BUTTON}>
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" aria-label="Посунути вправо" disabled={i === slides.length - 1} onClick={() => dispatch({ type: "move", id: slide.id, dir: 1 })} className={ICON_BUTTON}>
              <ChevronRight className="size-4" />
            </button>
            <button type="button" aria-label="Видалити слайд" onClick={() => dispatch({ type: "remove", id: slide.id })} className={ICON_BUTTON}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

Run: `pnpm test:run components/show` → PASS (якщо `OptimizedImage` у happy-dom падає через `next/image` — замокати `@/components/common/OptimizedImage` у тесті простим `<img>`).

- [ ] **Step 3: Діалог слайда і вибір треку**

`components/show/editor/TrackPicker.tsx` — список треків бібліотеки з пошуком і групами (`useTracks(campaignId)`, `filterTracks(tracks, { query, group: null, kind: null })`, `groupTracks(...)`), перший пункт «Без треку»; поточний вибір підсвічено (`aria-pressed`). Пропси: `{ campaignId: string; value: string | undefined; onChange(trackId: string | undefined): void }`. Перевірити точний тип `PlaylistFilter` у `lib/utils/audio/playlist-groups.ts`.

`components/show/editor/SlideDialog.tsx` — `ResponsiveDialog hud` з `title="Слайд N"`; тіло: велике прев'ю (`OptimizedImage`, `object-contain`, `aspect-video`), `Input` «Заголовок» (`maxLength={SLIDE_TITLE_MAX}`), `Textarea` «Підпис» (`maxLength={SLIDE_CAPTION_MAX}`, лічильник `N/200`), `TrackPicker`. Поля редагуються в локальному стані; `footer` — «Скасувати» і «Готово»; «Готово» шле `dispatch({ type: "update", id, patch: { title, caption, trackId } })` і закриває. Пропси: `{ campaignId: string; slide: { slide: Slide; index: number } | null; actions: { dispatch: Dispatch<DeckDraftAction>; close(): void } }`. Скинути локальний стан при зміні `slide.id` (патерн «стан з key»: рендерити внутрішній компонент з `key={slide.id}`).

`components/show/editor/AddSlidesBar.tsx` — кнопка «Додати картинки» (`<input type="file" multiple accept={SLIDE_FILE_ACCEPT} hidden>`, після вибору `upload.addFiles([...files])`, скинути `value`), поле «Посилання на картинку» + «Додати» (`upload.addUrl(url)`, валідація `URL.canParse` і http(s)), індикатор «Завантаження X з N» коли `progress`. Кнопки вимкнені, якщо в наборі вже `MAX_SLIDES_PER_DECK` слайдів (підказка «Максимум 100 слайдів»). Пропси: `{ upload: ReturnType<typeof useDeckEditor>["upload"]; count: number }`.

- [ ] **Step 4: Сторінка редагування набору**

`app/campaigns/[id]/dm/show/[deckId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { DeckEditorPageClient } from "./page-client";

import { prisma } from "@/lib/db";
import { toSlideDeck } from "@/lib/server/show/deck-store";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DeckEditorPage({ params }: { params: Promise<{ id: string; deckId: string }> }) {
  const { id, deckId } = await params;

  await requireCampaignDM(id);

  const row = await prisma.slideDeck.findFirst({ where: { id: deckId, campaignId: id } });

  if (!row) notFound();

  return <DeckEditorPageClient campaignId={id} deck={toSlideDeck(row)} />;
}
```

`page-client.tsx` (`"use client"`): `HudFormPage` з заголовком «Набір слайдів», посилання «← До наборів» (`/campaigns/[id]/dm/show`; при `dirty` — `useConfirm()` «Є незбережені зміни. Вийти без збереження?»); `HudForm` з полем назви (`dispatch({ type: "rename" })`), `AddSlidesBar`, `SlideGrid` (або `EmptyState` «Додайте картинки — файли або посилання»), `SlideDialog`; `ActionBar` з «Зберегти» (`disabled={!dirty || saving}`) і «Почати показ» (якщо `dirty` — спершу зберегти; далі `useShowControl(campaignId, notify).send({ action: "open", deckId })` і при `true` — `router.push(/campaigns/[id]/show)`). Хуки: `useDeckEditor(campaignId, deck)`, `useShowControl`. Компонент не імпортує `lib/api`.

- [ ] **Step 5: Список наборів і плитка**

`app/campaigns/[id]/dm/show/page.tsx`:

```tsx
import { DMShowPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { listDecks } from "@/lib/server/show/deck-store";

export default async function DMShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMShowPageClient campaignId={id} initialDecks={await listDecks(id)} />;
}
```

`page-client.tsx`: `HudPage` + `HudPageHeader` (`title="Показ сцен"`, підзаголовок `N наборів`, дії: «Новий набір» → `NewDeckDialog`, «Відкрити показ» → посилання `/campaigns/[id]/show`); список `useDecks(campaignId, { initial: initialDecks })` як `DeckCard` у сітці `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`; порожньо — `EmptyState`.

`components/show/editor/DeckCard.tsx` (`HudCard`): обкладинка (`OptimizedImage coverUrl`, `aspect-video`, або плейсхолдер `Images`), назва, `N слайдів` (`pluralUk` з `@/lib/utils/common/plural`: `["слайд", "слайди", "слайдів"]`), дії: «Редагувати» (посилання `dm/show/[deckId]`), «Почати показ» (вимкнено при 0 слайдів; `onStart(deck.id)`), «Видалити» (`useConfirm` «Видалити набір «…»? Картинки буде стерто.» → `onDelete`). Пропси: `{ deck: SlideDeckSummary; href: string; actions: { start(): void; remove(): void }; pending: boolean }`.

`components/show/editor/NewDeckDialog.tsx`: `ResponsiveDialog hud` з формою (поле «Назва», `maxLength={DECK_TITLE_MAX}`), footer-кнопка `type="submit" form="new-deck-form"`; після `create(title)` — `router.push` на редагування нового набору. Пропси: `{ open: boolean; onOpenChange(open: boolean): void; onCreate(title: string): Promise<void>; pending: boolean }`.

`app/campaigns/[id]/page.tsx`: імпорт `Images` з `lucide-react`; у `dmTiles` після рядка `music` додати:

```ts
    { path: "show", icon: Images, title: "Показ сцен", subtitle: "Набори слайдів із музикою для гравців" },
```

- [ ] **Step 6: Перевірка і commit**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run components/show` → PASS.

```bash
git add app/campaigns components/show
git commit -m "feat(show): DM deck list and slide editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Сторінка показу, пульт ДМ, вхід для гравців

**Files:**
- Create: `app/campaigns/[id]/show/page.tsx`, `app/campaigns/[id]/show/page-client.tsx`
- Create: `components/show/stage/ShowStage.tsx`, `SlideCaption.tsx`, `ShowControlPanel.tsx`, `FullscreenButton.tsx`, `ShowWaiting.tsx`
- Create: `lib/hooks/show/useSlideLayers.ts`, `lib/hooks/show/useShowKeys.ts`
- Create: `components/campaigns/WatchShowButton.tsx`
- Modify: `components/layout/Header.tsx`, `app/campaigns/[id]/page.tsx` (плитка гравця), `lib/hooks/show/index.ts`
- Test: `components/show/__tests__/ShowStage.test.tsx`, `lib/hooks/show/__tests__/useSlideLayers.test.tsx`

**Interfaces:**
- Consumes: `readShow` (Task 5), `showKeys`, `useShowState`, `useShowControl`, `useShowAudioHost`, `usePusherShowSync`, `useDecks`, `useDeck`, `useWatchShow` (Task 6); `AudioPlayerProvider`, `AudioDock` (Task 3).
- Produces:
  - `useSlideLayers(slide: Slide | null): { slide: Slide; leaving: boolean }[]` — новий слайд зверху, попередній лишається `SLIDE_CROSSFADE_MS` з `leaving: true`;
  - `useShowKeys(control: ShowControl | null): void` — стрілки ←/→ для ДМ, крім фокусу в полях вводу.

- [ ] **Step 1: Тест шарів (падає)**

`lib/hooks/show/__tests__/useSlideLayers.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSlideLayers } from "../useSlideLayers";

const a = { id: "slide-000a", imageUrl: "https://x/a.webp" };

const b = { id: "slide-000b", imageUrl: "https://x/b.webp" };

describe("useSlideLayers", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it("при зміні слайда старий лишається на час переходу, потім зникає", () => {
    const { result, rerender } = renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: a as typeof a | null } });

    expect(result.current).toEqual([{ slide: a, leaving: false }]);

    rerender({ slide: b });
    expect(result.current).toEqual([
      { slide: a, leaving: true },
      { slide: b, leaving: false },
    ]);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toEqual([{ slide: b, leaving: false }]);
  });

  it("той самий id з новим підписом — без переходу", () => {
    const { result, rerender } = renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: a as typeof a | null } });

    rerender({ slide: { ...a, imageUrl: a.imageUrl } });
    expect(result.current).toHaveLength(1);
  });

  it("кінець показу — порожньо після переходу", () => {
    const { result, rerender } = renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: a as typeof a | null } });

    rerender({ slide: null });
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toEqual([]);
  });
});
```

Run → FAIL.

- [ ] **Step 2: `lib/hooks/show/useSlideLayers.ts`**

```ts
"use client";

import { useEffect, useState } from "react";

import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import type { Slide } from "@/types/show";

type Layer = { slide: Slide; leaving: boolean };

export function useSlideLayers(slide: Slide | null): Layer[] {
  const [current, setCurrent] = useState(slide);

  const [leaving, setLeaving] = useState<Slide | null>(null);

  // зміна слайда під час рендеру: попередній стає «тим, що зникає»
  if (slide?.id !== current?.id || slide?.imageUrl !== current?.imageUrl) {
    setLeaving(current && current.imageUrl !== slide?.imageUrl ? current : null);
    setCurrent(slide);
  } else if (slide !== current) {
    setCurrent(slide);
  }

  useEffect(() => {
    if (!leaving) return;

    const timer = setTimeout(() => setLeaving(null), SLIDE_CROSSFADE_MS + 100);

    return () => clearTimeout(timer);
  }, [leaving]);

  return [...(leaving ? [{ slide: leaving, leaving: true }] : []), ...(current ? [{ slide: current, leaving: false }] : [])];
}
```

Run: `pnpm test:run lib/hooks/show/__tests__/useSlideLayers.test.tsx` → PASS.

`lib/hooks/show/useShowKeys.ts`:

```ts
"use client";

import { useEffect } from "react";

import type { ShowControl } from "./useShowControl";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useShowKeys(control: ShowControl | null): void {
  useEffect(() => {
    if (!control) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (e.altKey || e.ctrlKey || e.metaKey || (target && (TYPING.has(target.tagName) || target.isContentEditable))) return;

      if (e.key === "ArrowRight") void control.send({ action: "next" });

      if (e.key === "ArrowLeft") void control.send({ action: "prev" });
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [control]);
}
```

Додати обидва хуки в `lib/hooks/show/index.ts`.

- [ ] **Step 3: Тест сцени (падає)**

`components/show/__tests__/ShowStage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShowStage } from "../stage/ShowStage";

vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }));

afterEach(cleanup);

const show = (over = {}) => ({ deckId: "d1", deckTitle: "Таверна", slide: { id: "slide-0001", imageUrl: "https://x.supabase.co/a.webp", title: "Корчма «Гриф»", caption: "Минуло три дні" }, nextImageUrl: "https://x.supabase.co/b.webp", audio: null, seq: 1, ...over });

describe("ShowStage", () => {
  it("картинка, титр і попереднє завантаження наступної", () => {
    const { container } = render(<ShowStage show={show()} />);

    expect(screen.getByText("Корчма «Гриф»")).toBeTruthy();
    expect(screen.getByText("Минуло три дні")).toBeTruthy();
    expect(container.querySelector('[data-slide-preload] img')?.getAttribute("src")).toBe("https://x.supabase.co/b.webp");
  });

  it("показ не йде — очікування", () => {
    render(<ShowStage show={show({ deckId: null, slide: null, nextImageUrl: null })} />);

    expect(screen.getByText("ДМ ще не почав показ")).toBeTruthy();
  });
});
```

Run → FAIL.

- [ ] **Step 4: Компоненти сцени**

`components/show/stage/ShowStage.tsx`:

```tsx
"use client";

import Image from "next/image";

import { ShowWaiting } from "./ShowWaiting";
import { SlideCaption } from "./SlideCaption";

import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import { useSlideLayers } from "@/lib/hooks/show";
import { cn } from "@/lib/utils";
import { isSupabaseStorageUrl } from "@/lib/utils/common/image-url";
import type { ShowState } from "@/types/show";

const imageProps = (src: string) => ({ src, fill: true, sizes: "100vw", unoptimized: !isSupabaseStorageUrl(src) });

export function ShowStage({ show }: { show: ShowState | null }) {
  const layers = useSlideLayers(show?.slide ?? null);

  const current = show?.slide ?? null;

  return (
    <div className="relative size-full overflow-hidden bg-black">
      {layers.map(({ slide, leaving }) => (
        <div key={slide.id + slide.imageUrl} className={cn("absolute inset-0 animate-in fade-in", leaving && "opacity-0 transition-opacity")} style={{ animationDuration: `${SLIDE_CROSSFADE_MS}ms`, transitionDuration: `${SLIDE_CROSSFADE_MS}ms` }}>
          <Image {...imageProps(slide.imageUrl)} alt={slide.title ?? ""} className="object-contain" priority />
        </div>
      ))}
      {current && <SlideCaption key={current.id} slide={current} />}
      {!current && <ShowWaiting />}
      {show?.nextImageUrl && (
        <div data-slide-preload aria-hidden className="pointer-events-none absolute inset-0 opacity-0">
          <Image {...imageProps(show.nextImageUrl)} alt="" loading="eager" />
        </div>
      )}
    </div>
  );
}
```

Перевірити, що в проєкті є утиліти `animate-in fade-in` (tailwindcss-animate / tw-animate-css — `grep -rn "animate-in" components | head`). Якщо ні — замінити на власний `@keyframes` у `app/globals.css` (`.slide-in { animation: slide-fade-in var(--dur) ease-out both }`).

`components/show/stage/SlideCaption.tsx`:

```tsx
import type { Slide } from "@/types/show";

export function SlideCaption({ slide }: { slide: Slide }) {
  if (!slide.title && !slide.caption) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-6 pb-8 pt-16 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
      {slide.title && <h2 className="hud-sc text-2xl tracking-[.08em] text-hud-gold-bright md:text-4xl">{slide.title}</h2>}
      {slide.caption && <p className="mx-auto mt-2 max-w-3xl text-base text-hud-bone md:text-xl">{slide.caption}</p>}
    </div>
  );
}
```

`components/show/stage/ShowWaiting.tsx`: по центру іконка `Images` і текст «ДМ ще не почав показ» (`text-hud-muted`).

`components/show/stage/FullscreenButton.tsx`: `useState` `supported`, виставлений в `useEffect` з `document.fullscreenEnabled` (щоб не було розбіжності гідратації); якщо не підтримується — `null`. Клік: `document.fullscreenElement ? document.exitFullscreen() : target.current?.requestFullscreen()`. Пропси: `{ target: RefObject<HTMLElement | null> }`. Іконки `Maximize`/`Minimize`, `aria-label` «На весь екран»/«Вийти з повноекранного режиму», стан через подію `fullscreenchange`.

`components/show/stage/ShowControlPanel.tsx` (лише ДМ): пропси `{ campaignId: string; show: ShowState | null; control: ShowControl }`. Вміст:
- `<select aria-label="Набір">` з `useDecks(campaignId)` (опції — назви; вибір шле `{ action: "open", deckId }`), поточний `show.deckId`;
- кнопки «Попередній слайд» (`prev`), «Наступний слайд» (`next`), «Завершити показ» (`useConfirm` → `end`), усе `disabled={control.pending}`; «Завершити» вимкнено без `show?.deckId`;
- стрічка мініатюр поточного набору з `useDeck(campaignId, show?.deckId ?? null)`: горизонтальний скрол, `OptimizedImage` 96×54, номер, `aria-current` на поточному (`slide.id === show.slide?.id`), значок `Music` при `trackId`; клік → `{ action: "open", deckId, slideId }`; поточну мініатюру `scrollIntoView({ inline: "center", block: "nearest" })` при зміні.

- [ ] **Step 5: Сторінка `/campaigns/[id]/show`**

`app/campaigns/[id]/show/page.tsx`:

```tsx
import { ShowPageClient } from "./page-client";

import { readShow } from "@/app/api/campaigns/[id]/show/show-handler";
import { showKeys } from "@/lib/hooks/show/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { ShowResponse, ShowSnapshot } from "@/types/show";

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ isDM }, body] = await Promise.all([requireCampaignMember(id), readShow(id).then((res) => readOkJson<ShowResponse>(res))]);

  const seed: ShowSnapshot | undefined = body ? { show: body.show, clockOffsetMs: null } : undefined;

  const client = <ShowPageClient campaignId={id} isDM={isDM} />;

  return seed ? <PrefetchedQuery queryKey={showKeys.state(id)} data={seed}>{client}</PrefetchedQuery> : client;
}
```

Перевірити сигнатуру `readOkJson` (`lib/utils/api/read-json.ts`): що повертає при не-200 (null/undefined) — узгодити умову. Імпорт з `app/api/...` у сторінку — так само, як battle page імпортує `readBattleScene`; якщо ESLint забороняє імпорт з `app/api` у `app/campaigns`, перенести `readShow` у `lib/server/show/read-show.ts` і реекспортувати з `show-handler.ts`.

`app/campaigns/[id]/show/page-client.tsx`:

```tsx
"use client";

import { useRef } from "react";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { FullscreenButton } from "@/components/show/stage/FullscreenButton";
import { ShowControlPanel } from "@/components/show/stage/ShowControlPanel";
import { ShowStage } from "@/components/show/stage/ShowStage";
import { useNotify } from "@/lib/hooks/common";
import { usePusherShowSync, useShowAudioHost, useShowControl, useShowKeys, useShowState } from "@/lib/hooks/show";

export function ShowPageClient({ campaignId, isDM }: { campaignId: string; isDM: boolean }) {
  const notify = useNotify();

  const stageRef = useRef<HTMLDivElement>(null);

  usePusherShowSync(campaignId);

  const { show } = useShowState(campaignId);

  const control = useShowControl(campaignId, notify);

  useShowKeys(isDM ? control : null);

  const host = useShowAudioHost({ campaignId, isDM, onFailure: notify });

  return (
    <AudioPlayerProvider host={host}>
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
        <div ref={stageRef} className="relative min-h-[60dvh] flex-1">
          <ShowStage show={show} />
          <div className="absolute right-3 top-3 z-20">
            <FullscreenButton target={stageRef} />
          </div>
          <div className="absolute bottom-3 left-3 z-30">
            <AudioDock placement="corner" />
          </div>
        </div>
        {isDM && <ShowControlPanel campaignId={campaignId} show={show} control={control} />}
      </div>
    </AudioPlayerProvider>
  );
}
```

`useNotify()` має віддавати функцію `(message: string) => void` для `onFailure`; якщо сигнатура інша — обгорнути в `useCallback`, щоб хост не перебудовувався щорендеру. Висоту `4rem` звірити з висотою хедера в `components/layout/Header.tsx`. Перевірити, що `AudioDock placement="corner"` поводиться коректно поза `CornerStack` бою (за потреби обгорнути в контейнер з тими ж класами, що в `BattleScreen.tsx`).

Якщо в `app/globals.css` є фон секції через `data-screen-bg` — для показу фон не потрібен (сцена чорна на весь блок).

- [ ] **Step 6: Вхід для гравців**

`components/campaigns/WatchShowButton.tsx` — як `JoinBattleButton`, але `useWatchShow()`, іконка `Images`, текст «ПОКАЗ» / sr-only «Дивитися показ». У `components/layout/Header.tsx` поруч із `<JoinBattleButton />` додати `<WatchShowButton />`.

`app/campaigns/[id]/page.tsx`: у блоці `{!isDM && (…)}` додати поруч із «Мій персонаж»:

```tsx
          <HudTile href={`/campaigns/${id}/show`} icon={<Images className="size-5" />} title="Показ" subtitle="Слайди й музика від ДМ під час гри" />
```

(`!isDM && (<>…</>)` — обгорнути обидві плитки фрагментом).

- [ ] **Step 7: Перевірка і commit**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run components/show lib/hooks/show` → PASS.

```bash
git add app/campaigns components lib/hooks/show
git commit -m "feat(show): live show page with DM controls, crossfade and header entry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Повна перевірка, документація, браузер

**Files:**
- Modify: `CLAUDE.md` (коротко: «Показ» у Key cross-cutting або Architecture), `ARCHITECTURE.md` (якщо там є розділ про музику/бій — абзац українською про показ)

- [ ] **Step 1: Повний прогін**

Run:
```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:run
```
Expected: 0 помилок типів і lint, усі тести PASS. Якщо падає щось поза зміненими модулями — перевірити, чи падає воно і на `main` (`git stash`-вільний спосіб: запустити той самий тест у `../dnd-tracker`), і вказати це у звіті.

- [ ] **Step 2: Міграція локально**

```bash
pnpm db:local   # якщо Docker-БД не запущена
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm exec prisma migrate deploy
```
Expected: `20261021000000_scene_show` застосовано. (Prodcopy — копія прода для перевірок; prod не чіпати.)

- [ ] **Step 3: Документація**

У `CLAUDE.md` в «Key cross-cutting modules» додати пункт:

```markdown
- **Slide show («Показ»)** — `slide_decks` (DM decks, `slides JSONB`) + `campaign_shows` (one row per campaign, never deleted: `seq`/`audio.seq` only grow). Pure commands in `lib/utils/show/show-command.ts` (on top of `applyAudioCommand`), routes `app/api/campaigns/[id]/{decks,show}`, Pusher `private-show-<campaignId>` / `show-state`. The music player is host-agnostic (`AudioHost` in `lib/hooks/audio`, components in `components/audio`): battle and show each pass their own host.
```

- [ ] **Step 4: Перевірка в браузері (prodcopy)**

`DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm dev` у worktree. ДМ — у звичайному профілі Chrome, гравець — в іншому профілі/вікні інкогніто. Пройти:
1. Дашборд → «Показ сцен» → «Новий набір» → додати 3 файли (один > 2560 px) і 1 посилання → прив'язати трек до 2-го слайда, підписи → «Зберегти».
2. «Почати показ» → у гравця на `/campaigns/[id]/show` той самий слайд; «Увімкнути звук».
3. → до 2-го слайда: у всіх стартує трек; ← і знову → — трек не перезапускається; пауза ДМ → → на слайд із тим самим треком — пауза лишається.
4. ДМ змінює підпис поточного слайда в редакторі й зберігає — у гравця оновився титр.
5. «Завершити показ» → у гравця «ДМ ще не почав показ», музика стоп; «Почати показ» знову — у гравця без перезавантаження новий показ.
6. Кнопка «ПОКАЗ» у хедері гравця з'являється (до 2 хв) і веде на сторінку.
7. Бій із музикою: плеєр працює як раніше (play/next/pause у ДМ і гравця).
8. Телефонна ширина (iframe 390 px): сцена, титр, пульт знизу, док плеєра не перекриває пульт.

Залишені тестові набори видалити (кнопка «Видалити»).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md ARCHITECTURE.md
git commit -m "docs(show): document slide show and host-agnostic player

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Мердж у `main`, пуш і деплой — лише після окремого дозволу користувача.
