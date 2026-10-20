# Сценарій кампанії (етап 1) — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новий пункт меню DM «Сценарій»: індекс сторінок, сторінка сцени в режимах «Гра» та «Редагування» (Tiptap), версії, пошук, @-посилання, глави біографій у вкладці «Історія» гравця, імпорт наявних артефактів.

**Architecture:** Сторінка сценарію — рядок `scenario_pages` з `content JSONB`. Структура (розділи → рядки) — наш JSON з id, текст кожної колонки рядка — документ Tiptap (ProseMirror JSON) з allowlist вузлів. Перегляд рендерить JSON нашим React-рендером без Tiptap; Tiptap вантажиться лише в режимі редагування (`next/dynamic`). Секрети й нотатки для гравця вирізаються на сервері.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6 / Postgres, Zod 4, TanStack Query, Tiptap 3 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-mention`, `@tiptap/suggestion`, `@tiptap/extension-table`), `node-html-parser` (dev, імпорт), Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-20-scenario-editor-design.md`

## Global Constraints

- Робоча тека — worktree `/Users/silentfox/Work/dnd-tracker-scenario`, гілка `feat/scenario-editor`. Перед Task 1 (одноразово): `cp /Users/silentfox/Work/dnd-tracker/.env.local . && pnpm install --frozen-lockfile` (`.env.local` не комітити; postinstall робить `prisma generate`).
- `.env.local` дивиться на спільну локальну БД `localhost:54322/prodcopy` (не бекап). Ніколи не запускати `prisma migrate dev`/`migrate reset` — лише `pnpm migrate:deploy`.
- Заголовок маркера (`callout.attrs.tag`) завжди видимий гравцеві в главах біографії; секретним може бути лише текст усередині.
- Пакетний менеджер `pnpm`; після зміни `package.json` комітити `pnpm-lock.yaml`.
- Міграція expand-only; кожен `CREATE TABLE` супроводжується `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`).
- Розмір `content` у PUT — до 512 KB (`SCENARIO_MAX_CONTENT_BYTES = 512 * 1024`), більший → 413.
- Знімок версії — не частіше ніж раз на 10 хв на сторінку і завжди перед відкатом; зберігати останні 50.
- Автозбереження — debounce 1.5 с з `expectedVersion`; 409 → повідомлення й перезавантаження; при помилці локальні зміни не губляться.
- Гравець бачить лише колонку `story` відкритих глав без фрагментів з маркою `secret`; колонку `notes` — тільки DM. Вирізання — тільки на сервері.
- Помилки API — `{ error }` з українськими текстами в `lib/constants/api-errors.ts`.
- Компоненти не імпортують `@/lib/api/*` (ESLint); запити — в `lib/api/scenario.ts`, логіка — в `lib/hooks/scenario/`.
- Діалоги — лише `ResponsiveDialog`; підтвердження — `useConfirm()`, повідомлення — `useNotify()`/`useOptionalNotify()`.
- Коментарі мінімальні (лише неочевидні «чому»); тексти UI українською; ідентифікатори англійською.
- `padding-line-between-statements` і `simple-import-sort` — `pnpm lint --fix` після кожної задачі.
- Відступи від специфікації, погоджені на рівні плану: фон «Сценарію» — дефолтна таверна (аркуш книги непрозорий), запис у `DM_SECTIONS` не додаємо; @-посилання у «Грі» — посилання-чип без спливаючої картки (HoverCard у `components/ui` немає).

## Review Focus

1. Секретна марка на атомі (`mention`, `token`) або в клітинці таблиці — гравець не отримує цей текст (тест у Task 1 `stripSecrets`).
2. Дві вкладки редагують одну сторінку — друга отримує 409, нічого не перезаписується мовчки, локальна чернетка лишається (тести Task 3 і Task 5).
3. Невідомий тип вузла Tiptap або дубльовані id розділів у `content` — 400, у БД не потрапляє (тест Task 1 схеми + Task 3 route).
4. Користувач друкує, поки попереднє збереження ще летить — друге збереження йде після першого з новою версією, жоден символ не губиться (тест Task 5 `useScenarioDraft`).
5. Глава прив'язана до видаленої сторінки/розділу — лишається закритою, без падіння; `characterId` чужої кампанії при створенні — 400 (тести Task 1 `openChapters`, Task 3 create).

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `types/scenario.ts` | Доменні типи (RichDoc, контент, summary, DTO) |
| `lib/constants/scenario.ts` | Переліки, підписи, ліміти, дефолтна легенда |
| `lib/schemas/scenario.ts` | Zod: allowlist вузлів, контент, тіла запитів |
| `lib/utils/scenario/doc.ts` | Текст документа, `stripSecrets`, `isDocEmpty` |
| `lib/utils/scenario/structure.ts` | Чисті операції над розділами/рядками, `newId` |
| `lib/utils/scenario/search-text.ts` | `buildSearchText`, `findSnippet` |
| `lib/utils/scenario/reveal.ts` | `revealTargets`, `isChapterOpen`, `openChapters` |
| `lib/utils/scenario/index-groups.ts` | Групування індексу (арки, герої, нотатки) |
| `lib/utils/scenario/mention-href.ts` | URL сутності за типом |
| `lib/server/scenario/page-store.ts` | Читання/мапінг рядків, знімки версій |
| `lib/server/scenario/player-story.ts` | Відкриті глави для профілю персонажа |
| `app/api/campaigns/[id]/scenario/**` | Тонкі route.ts + `*-handlers.ts` |
| `lib/api/scenario.ts` | Клієнтські обгортки |
| `lib/hooks/scenario/*` | Query/mutation хуки, автозбереження |
| `components/scenario/*` | Книга, рендер, індекс, сторінка, тулбар |
| `components/scenario/editor/*` | Tiptap-розширення, редактор, тулбар, діалоги |
| `components/character-profile/StoryChapters.tsx` | Глави у «Історії» |
| `scripts/import/scenario/*` | Парсер HTML артефактів + скрипт імпорту |

---

### Task 1: Доменні типи, константи, схеми, чиста логіка

**Files:**
- Create: `types/scenario.ts`, `lib/constants/scenario.ts`, `lib/schemas/scenario.ts`, `lib/utils/scenario/doc.ts`, `lib/utils/scenario/structure.ts`, `lib/utils/scenario/search-text.ts`, `lib/utils/scenario/reveal.ts`, `lib/utils/scenario/index-groups.ts`, `lib/utils/scenario/mention-href.ts`
- Test: `lib/utils/scenario/__tests__/doc.test.ts`, `structure.test.ts`, `search-text.test.ts`, `reveal.test.ts`, `index-groups.test.ts`, `lib/schemas/__tests__/scenario.test.ts`

**Interfaces:**
- Produces: усі типи з `types/scenario.ts`; `stripSecrets(doc)`, `docText(doc)`, `isDocEmpty(doc)`, `EMPTY_DOC`; `emptyContent()`, `newSection(title)`, `newRow()`, `addSection`, `updateSection`, `removeSection`, `moveSection`, `addRow`, `updateRow`, `removeRow`, `moveRow`; `buildSearchText(title, content)`, `findSnippet(searchText, q)`; `revealTargets(sections)`, `isChapterOpen(section, played)`, `openChapters(content, played)`, `playedLookup(rows)`; `groupIndex(pages)`; `mentionHref(campaignId, type, id)`; схеми `scenarioContentSchema`, `createScenarioPageSchema`, `updateScenarioMetaSchema`, `saveScenarioContentSchema`, `scenarioSectionPatchSchema`, `restoreScenarioVersionSchema`.

- [ ] **Step 1: Типи**

`types/scenario.ts`:

```ts
import type { CALLOUT_KINDS, LEGEND_KINDS, MARK_TYPES, MENTION_TYPES, NODE_TYPES, PAGE_KINDS, PAGE_STATUSES } from "@/lib/constants/scenario";

export type ScenarioPageKind = (typeof PAGE_KINDS)[number];
export type ScenarioPageStatus = (typeof PAGE_STATUSES)[number];
export type CalloutKind = (typeof CALLOUT_KINDS)[number];
export type LegendKind = (typeof LEGEND_KINDS)[number];
export type MentionType = (typeof MENTION_TYPES)[number];
export type RichNodeType = (typeof NODE_TYPES)[number];
export type RichMarkType = (typeof MARK_TYPES)[number];

export interface RichMark {
  type: RichMarkType;
  attrs?: Record<string, unknown>;
}

export interface RichNode {
  type: RichNodeType;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
}

export interface RichDoc {
  type: "doc";
  content: RichNode[];
}

export interface ScenarioRow {
  id: string;
  story: RichDoc;
  notes: RichDoc;
}

export type RevealRule = { mode: "manual" } | { mode: "afterSection"; pageId: string; sectionId: string };

export interface ScenarioSection {
  id: string;
  title: string;
  played: boolean;
  reveal?: RevealRule;
  revealedAt?: string | null;
  rows: ScenarioRow[];
}

export interface LegendEntry {
  kind: LegendKind;
  label: string;
}

export interface ScenarioContent {
  legend: LegendEntry[];
  sections: ScenarioSection[];
}

export interface ScenarioPageSummary {
  id: string;
  kind: ScenarioPageKind;
  arc: string | null;
  title: string;
  subtitle: string | null;
  status: ScenarioPageStatus;
  sortOrder: number;
  characterId: string | null;
  version: number;
  updatedAt: string;
}

export interface ScenarioPage extends ScenarioPageSummary {
  content: ScenarioContent;
}

export interface ScenarioVersionSummary {
  id: string;
  createdAt: string;
  createdBy: string;
}

export interface ScenarioSearchHit {
  pageId: string;
  pageTitle: string;
  sectionId: string | null;
  snippet: string;
}

export interface MentionOption {
  type: MentionType;
  id: string;
  label: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  rows: RichDoc[];
}

export interface CreateScenarioPageData {
  kind: ScenarioPageKind;
  title: string;
  arc?: string | null;
  subtitle?: string | null;
  characterId?: string | null;
}

export interface UpdateScenarioMetaData extends Partial<CreateScenarioPageData> {
  status?: ScenarioPageStatus;
  sortOrder?: number;
}

export interface SaveScenarioContentData {
  expectedVersion: number;
  content: ScenarioContent;
}

export interface ScenarioSectionPatch {
  played?: boolean;
  revealed?: boolean;
}

export interface ScenarioIndexGroups {
  arcs: { arc: string; pages: (ScenarioPageSummary & { number: number })[] }[];
  heroes: ScenarioPageSummary[];
  notes: ScenarioPageSummary[];
}
```

- [ ] **Step 2: Константи**

`lib/constants/scenario.ts`:

```ts
// types/scenario.ts derives its unions from these arrays, so this file must not import from it (import/no-cycle)
export const PAGE_KINDS = ["scene", "hero", "note"] as const;
export const PAGE_STATUSES = ["draft", "ready", "personal"] as const;
export const CALLOUT_KINDS = ["choice", "shadow", "check", "event", "artifact", "token", "hero", "goal", "confide"] as const;
export const LEGEND_KINDS = ["read", "choice", "token", "artifact", "shadow", "check", "notes"] as const;
export const MENTION_TYPES = ["unit", "artifact", "character", "spell", "battle"] as const;
export const NODE_TYPES = [
  "doc", "paragraph", "text", "heading", "hardBreak", "bulletList", "orderedList", "listItem",
  "readAloud", "say", "callout", "token", "mention", "table", "tableRow", "tableCell", "tableHeader",
] as const;
export const MARK_TYPES = ["bold", "italic", "secret"] as const;

export const SCENARIO_MAX_CONTENT_BYTES = 512 * 1024;
export const SCENARIO_VERSION_INTERVAL_MS = 10 * 60 * 1000;
export const SCENARIO_MAX_VERSIONS = 50;
export const SCENARIO_AUTOSAVE_MS = 1500;
export const SCENARIO_SEARCH_LIMIT = 20;
export const SCENARIO_MENTION_LIMIT = 5;
export const UNARCHED_LABEL = "Без арки";

export const PAGE_KIND_LABELS: Record<(typeof PAGE_KINDS)[number], string> = { scene: "Сцена", hero: "Герой", note: "Нотатка" };
export const PAGE_STATUS_LABELS: Record<(typeof PAGE_STATUSES)[number], string> = { draft: "У роботі", ready: "Готова", personal: "Особиста" };
export const CALLOUT_LABELS: Record<(typeof CALLOUT_KINDS)[number], string> = {
  choice: "Вибір гравців", shadow: "Тіньова лінія", check: "Перевірка", event: "Подія", artifact: "Артефакт",
  token: "Жетон", hero: "На що звертати увагу", goal: "Ціль", confide: "Таємне",
};
export const LEGEND_LABELS: Record<(typeof LEGEND_KINDS)[number], string> = {
  read: "Читати вголос і події", choice: "Вибір гравців", token: "Жетон", artifact: "Міні-квест і артефакт",
  shadow: "Тіньова лінія", check: "Перевірка уважності", notes: "Нотатки майстра",
};
export const MENTION_LABELS: Record<(typeof MENTION_TYPES)[number], string> = { unit: "Юніт", artifact: "Артефакт", character: "Персонаж", spell: "Заклинання", battle: "Бій" };

export const DEFAULT_SCENE_LEGEND: { kind: (typeof LEGEND_KINDS)[number]; label: string }[] = LEGEND_KINDS.map((kind) => ({ kind, label: LEGEND_LABELS[kind] }));
```

Додай у `lib/constants/api-errors.ts` (перед `} as const;`):

```ts
  SCENARIO_NOT_FOUND: "Сторінку сценарію не знайдено",
  SCENARIO_SECTION_NOT_FOUND: "Розділ не знайдено",
  SCENARIO_VERSION_NOT_FOUND: "Версію не знайдено",
  SCENARIO_CONFLICT: "Сторінку змінено в іншій вкладці — перезавантажте її",
  SCENARIO_TOO_LARGE: "Сторінка завелика (понад 512 КБ) — розділіть її на кілька",
  SCENARIO_CHARACTER_INVALID: "Персонажа не знайдено в цій кампанії",
```

- [ ] **Step 3: Падаючі тести схем**

`lib/schemas/__tests__/scenario.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createScenarioPageSchema, saveScenarioContentSchema, scenarioContentSchema, scenarioSectionPatchSchema } from "@/lib/schemas/scenario";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "secret" }] }] }] });

const content = (ids: string[]) => ({ legend: [{ kind: "read", label: "Вголос" }], sections: ids.map((id) => ({ id, title: id, played: false, rows: [{ id: `${id}-r`, story: doc("a"), notes: doc("b") }] })) });

describe("scenario schemas", () => {
  it("приймає валідний контент", () => {
    expect(scenarioContentSchema.safeParse(content(["s1", "s2"])).success).toBe(true);
  });

  it("відкидає невідомий тип вузла", () => {
    const bad = content(["s1"]);

    bad.sections[0].rows[0].story = { type: "doc", content: [{ type: "iframe" }] } as never;
    expect(scenarioContentSchema.safeParse(bad).success).toBe(false);
  });

  it("відкидає невідому марку", () => {
    const bad = content(["s1"]);

    bad.sections[0].rows[0].story = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link" }] }] }] } as never;
    expect(scenarioContentSchema.safeParse(bad).success).toBe(false);
  });

  it("відкидає дубльовані id розділів і рядків", () => {
    expect(scenarioContentSchema.safeParse(content(["s1", "s1"])).success).toBe(false);
  });

  it("save вимагає expectedVersion", () => {
    expect(saveScenarioContentSchema.safeParse({ content: content(["s1"]) }).success).toBe(false);
  });

  it("section patch вимагає хоча б одне поле", () => {
    expect(scenarioSectionPatchSchema.safeParse({}).success).toBe(false);
    expect(scenarioSectionPatchSchema.safeParse({ played: true }).success).toBe(true);
  });

  it("create обрізає назву і відкидає порожню", () => {
    expect(createScenarioPageSchema.parse({ kind: "scene", title: "  Монастир  " }).title).toBe("Монастир");
    expect(createScenarioPageSchema.safeParse({ kind: "scene", title: "   " }).success).toBe(false);
  });
});
```

Run: `pnpm test:run lib/schemas/__tests__/scenario.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Схеми**

`lib/schemas/scenario.ts`:

```ts
import { z } from "zod";

import { CALLOUT_KINDS, LEGEND_KINDS, MARK_TYPES, NODE_TYPES, PAGE_KINDS, PAGE_STATUSES } from "@/lib/constants/scenario";
import type { RichNode, ScenarioContent } from "@/types/scenario";

const attrsSchema = z.record(z.string(), z.unknown());

const markSchema = z.object({ type: z.enum(MARK_TYPES), attrs: attrsSchema.optional() });

export const richNodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.enum(NODE_TYPES),
    attrs: attrsSchema.optional(),
    content: z.array(richNodeSchema).optional(),
    marks: z.array(markSchema).optional(),
    text: z.string().optional(),
  }),
);

const docSchema = z.object({ type: z.literal("doc"), content: z.array(richNodeSchema) });

const idSchema = z.string().min(1).max(40);

const revealSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual") }),
  z.object({ mode: z.literal("afterSection"), pageId: z.string().min(1), sectionId: z.string().min(1) }),
]);

const sectionSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  played: z.boolean(),
  reveal: revealSchema.optional(),
  revealedAt: z.string().nullable().optional(),
  rows: z.array(z.object({ id: idSchema, story: docSchema, notes: docSchema })).max(200),
});

const unique = (ids: string[]) => new Set(ids).size === ids.length;

export const scenarioContentSchema: z.ZodType<ScenarioContent> = z
  .object({
    legend: z.array(z.object({ kind: z.enum(LEGEND_KINDS), label: z.string().max(80) })).max(12),
    sections: z.array(sectionSchema).max(200),
  })
  .refine((c) => unique(c.sections.map((s) => s.id)) && unique(c.sections.flatMap((s) => s.rows.map((r) => r.id))), { message: "Дубльовані id розділів або рядків" });

const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const createScenarioPageSchema = z.object({
  kind: z.enum(PAGE_KINDS),
  title: z.string().trim().min(1).max(200),
  arc: optionalText(120),
  subtitle: optionalText(500),
  characterId: z.string().min(1).nullish(),
});

export const updateScenarioMetaSchema = createScenarioPageSchema.partial().extend({
  status: z.enum(PAGE_STATUSES).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const saveScenarioContentSchema = z.object({ expectedVersion: z.number().int().min(0), content: scenarioContentSchema });

export const scenarioSectionPatchSchema = z
  .object({ played: z.boolean().optional(), revealed: z.boolean().optional() })
  .refine((b) => b.played !== undefined || b.revealed !== undefined, { message: "Порожня зміна" });

export const restoreScenarioVersionSchema = z.object({ versionId: z.string().min(1) });

export const CALLOUT_KIND_SCHEMA = z.enum(CALLOUT_KINDS);
```

Run: `pnpm test:run lib/schemas/__tests__/scenario.test.ts` — Expected: PASS.

- [ ] **Step 5: Падаючі тести doc/structure/search/reveal/index**

`lib/utils/scenario/__tests__/doc.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { docText, isDocEmpty, stripSecrets } from "@/lib/utils/scenario/doc";
import type { RichDoc } from "@/types/scenario";

const secret = [{ type: "secret" as const }];

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Відкрите " }, { type: "text", text: "приховане", marks: secret }] },
    { type: "paragraph", content: [{ type: "text", text: "увесь секрет", marks: secret }] },
    { type: "paragraph", content: [{ type: "mention", attrs: { type: "unit", id: "u1", label: "Біара" }, marks: secret }, { type: "token", attrs: { color: "green" }, marks: secret }] },
    { type: "table", content: [{ type: "tableRow", content: [
      { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1.0" }] }] },
      { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "таємна клітинка", marks: secret }] }] },
    ] }] },
    { type: "callout", attrs: { kind: "event", tag: "Тавро" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Пече" }] }] },
  ],
};

describe("stripSecrets", () => {
  it("прибирає секретний текст, атоми й клітинки; порожні блоки зникають", () => {
    const text = docText(stripSecrets(doc));

    expect(text).toContain("Відкрите");
    expect(text).not.toContain("приховане");
    expect(text).not.toContain("увесь секрет");
    expect(text).not.toContain("Біара");
    expect(text).not.toContain("таємна клітинка");
    expect(text).toContain("1.0");
    expect(text).toContain("Тавро");
    expect(stripSecrets(doc).content).toHaveLength(3);
  });

  it("не мутує вхід", () => {
    const before = JSON.stringify(doc);

    stripSecrets(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe("docText / isDocEmpty", () => {
  it("лейбл згадки входить у текст, жетон — ні", () => {
    expect(docText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "mention", attrs: { label: "Годрик" } }] }] })).toBe("Годрик");
  });

  it("порожній документ і документ з порожнім абзацом — порожні; з жетоном — ні", () => {
    expect(isDocEmpty({ type: "doc", content: [] })).toBe(true);
    expect(isDocEmpty({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(isDocEmpty({ type: "doc", content: [{ type: "paragraph", content: [{ type: "token", attrs: { color: "red" } }] }] })).toBe(false);
  });
});
```

`lib/utils/scenario/__tests__/structure.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { addRow, addSection, emptyContent, moveRow, moveSection, removeRow, removeSection, updateRow, updateSection } from "@/lib/utils/scenario/structure";

describe("structure", () => {
  it("addSection додає розділ з одним порожнім рядком і унікальними id", () => {
    const c = addSection(addSection(emptyContent(), "A"), "B");

    expect(c.sections.map((s) => s.title)).toEqual(["A", "B"]);
    expect(c.sections[0].rows).toHaveLength(1);
    expect(new Set([c.sections[0].id, c.sections[1].id]).size).toBe(2);
  });

  it("move/remove/update розділів не мутують вхід", () => {
    const c = addSection(addSection(emptyContent(), "A"), "B");

    const [a, b] = c.sections;

    expect(moveSection(c, b.id, -1).sections.map((s) => s.title)).toEqual(["B", "A"]);
    expect(moveSection(c, a.id, -1)).toBe(c);
    expect(removeSection(c, a.id).sections.map((s) => s.title)).toEqual(["B"]);
    expect(updateSection(c, a.id, { title: "A2" }).sections[0].title).toBe("A2");
    expect(c.sections[0].title).toBe("A");
  });

  it("рядки: add/update/move/remove", () => {
    const base = addSection(emptyContent(), "A");

    const sid = base.sections[0].id;

    const c = addRow(base, sid);

    const [r1, r2] = c.sections[0].rows;

    expect(moveRow(c, sid, r2.id, -1).sections[0].rows[0].id).toBe(r2.id);
    expect(removeRow(c, sid, r1.id).sections[0].rows.map((r) => r.id)).toEqual([r2.id]);

    const story = { type: "doc" as const, content: [{ type: "paragraph" as const }] };

    expect(updateRow(c, sid, r1.id, { story }).sections[0].rows[0].story).toBe(story);
  });
});
```

`lib/utils/scenario/__tests__/search-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildSearchText, findSnippet } from "@/lib/utils/scenario/search-text";

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const content = {
  legend: [],
  sections: [
    { id: "s10", title: "Собор", played: false, rows: [{ id: "r1", story: p("Дзвони обриваються"), notes: p("Біара знає\nпро тавро") }] },
    { id: "s11", title: "Монастир", played: false, rows: [{ id: "r2", story: p("Беатріс біля брами"), notes: p("") }] },
  ],
};

describe("search text", () => {
  it("рядок на розділ з префіксом id; переноси всередині — пробіли", () => {
    const text = buildSearchText("Монастир Світла", content);

    expect(text.split("\n")).toEqual(["Монастир Світла", "§s10\tСобор Дзвони обриваються Біара знає про тавро", "§s11\tМонастир Беатріс біля брами"]);
  });

  it("findSnippet знаходить розділ без урахування регістру", () => {
    const hit = findSnippet(buildSearchText("Монастир Світла", content), "БЕАТРІС");

    expect(hit).toMatchObject({ sectionId: "s11" });
    expect(hit?.snippet).toContain("Беатріс");
  });

  it("збіг у назві сторінки — sectionId null; немає збігу — null", () => {
    expect(findSnippet(buildSearchText("Монастир Світла", content), "світла")?.sectionId).toBeNull();
    expect(findSnippet(buildSearchText("Монастир Світла", content), "дракон")).toBeNull();
  });
});
```

`lib/utils/scenario/__tests__/reveal.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isChapterOpen, openChapters, playedLookup, revealTargets } from "@/lib/utils/scenario/reveal";
import type { ScenarioContent } from "@/types/scenario";

const p = (text: string, secret = false) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text, ...(secret && { marks: [{ type: "secret" as const }] }) }] }] });

const hero: ScenarioContent = {
  legend: [],
  sections: [
    { id: "h1", title: "Історія", played: false, reveal: { mode: "manual" }, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r1", story: p("Відкрито"), notes: p("нотатка DM") }] },
    { id: "h2", title: "Після собору", played: false, reveal: { mode: "afterSection", pageId: "scene1", sectionId: "s10" }, rows: [{ id: "r2", story: p("Друга глава"), notes: p("") }] },
    { id: "h3", title: "Таємниця", played: false, reveal: { mode: "manual" }, rows: [{ id: "r3", story: p("Закрито"), notes: p("") }] },
    { id: "h4", title: "Видалене", played: false, reveal: { mode: "afterSection", pageId: "gone", sectionId: "x" }, rows: [{ id: "r4", story: p("Ніколи"), notes: p("") }] },
    { id: "h5", title: "Лише секрет", played: false, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r5", story: p("тсс", true), notes: p("") }] },
  ],
};

describe("reveal", () => {
  const played = playedLookup([{ id: "scene1", played: ["s10"] }]);

  it("revealTargets — лише afterSection", () => {
    expect(revealTargets(hero.sections)).toEqual([{ pageId: "scene1", sectionId: "s10" }, { pageId: "gone", sectionId: "x" }]);
  });

  it("isChapterOpen: revealedAt або зіграний цільовий розділ; видалена ціль — закрито", () => {
    expect(hero.sections.map((s) => isChapterOpen(s, played))).toEqual([true, true, false, false, true]);
  });

  it("openChapters: лише story, без секретів і порожніх рядків", () => {
    const chapters = openChapters(hero, played);

    expect(chapters.map((c) => c.id)).toEqual(["h1", "h2", "h5"]);
    expect(JSON.stringify(chapters)).not.toContain("нотатка DM");
    expect(chapters[2].rows).toEqual([]);
  });
});
```

`lib/utils/scenario/__tests__/index-groups.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { groupIndex } from "@/lib/utils/scenario/index-groups";
import type { ScenarioPageSummary } from "@/types/scenario";

const page = (over: Partial<ScenarioPageSummary>): ScenarioPageSummary => ({ id: "x", kind: "scene", arc: null, title: "x", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 0, updatedAt: "", ...over });

describe("groupIndex", () => {
  it("сцени за арками в порядку першої появи, номер наскрізний за sortOrder", () => {
    const groups = groupIndex([
      page({ id: "b", arc: "Особисті", sortOrder: 2 }),
      page({ id: "a", arc: "Арка перша", sortOrder: 1 }),
      page({ id: "c", arc: "Арка перша", sortOrder: 0 }),
      page({ id: "h", kind: "hero", sortOrder: 0 }),
      page({ id: "n", kind: "note", sortOrder: 0 }),
      page({ id: "z", arc: null, sortOrder: 3 }),
    ]);

    expect(groups.arcs.map((g) => [g.arc, g.pages.map((p) => `${p.id}${p.number}`)])).toEqual([
      ["Арка перша", ["c1", "a2"]],
      ["Особисті", ["b3"]],
      ["Без арки", ["z4"]],
    ]);
    expect(groups.heroes.map((p) => p.id)).toEqual(["h"]);
    expect(groups.notes.map((p) => p.id)).toEqual(["n"]);
  });
});
```

Run: `pnpm test:run lib/utils/scenario` — Expected: FAIL (modules not found).

- [ ] **Step 6: Реалізація utils**

`lib/utils/scenario/doc.ts`:

```ts
import type { RichDoc, RichNode } from "@/types/scenario";

export const EMPTY_DOC: RichDoc = { type: "doc", content: [] };

const LINE_BLOCKS = new Set(["paragraph", "heading", "say", "listItem", "tableCell", "tableHeader"]);

const isSecret = (node: RichNode) => node.marks?.some((m) => m.type === "secret") ?? false;

function nodeText(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";

  if (node.type === "mention") return String(node.attrs?.label ?? "");

  if (node.type === "hardBreak") return "\n";

  const inner = (node.content ?? []).map(nodeText).join("");

  if (node.type === "callout") return `${String(node.attrs?.tag ?? "")}\n${inner}`;

  return LINE_BLOCKS.has(node.type) ? `${inner}\n` : inner;
}

export function docText(doc: RichDoc): string {
  return doc.content.map(nodeText).join("").replace(/\n{2,}/g, "\n").trim();
}

export function isDocEmpty(doc: RichDoc): boolean {
  const hasAtom = (n: RichNode): boolean => n.type === "token" || n.type === "mention" || (n.content ?? []).some(hasAtom);

  return docText(doc) === "" && !doc.content.some(hasAtom);
}

function strip(node: RichNode): RichNode | null {
  if (isSecret(node)) return null;

  if (!node.content) return node;

  const content = node.content.map(strip).filter((n): n is RichNode => n !== null);

  // a block that had text and lost all of it was wholly secret — drop it rather than leave an empty shell
  if (node.content.length > 0 && content.length === 0) return null;

  return { ...node, content };
}

export function stripSecrets(doc: RichDoc): RichDoc {
  return { type: "doc", content: doc.content.map(strip).filter((n): n is RichNode => n !== null) };
}
```

`lib/utils/scenario/structure.ts`:

```ts
import { EMPTY_DOC } from "./doc";

import type { ScenarioContent, ScenarioRow, ScenarioSection } from "@/types/scenario";

export const newId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 10);

export const emptyContent = (): ScenarioContent => ({ legend: [], sections: [] });

export const newRow = (): ScenarioRow => ({ id: newId(), story: EMPTY_DOC, notes: EMPTY_DOC });

export const newSection = (title: string): ScenarioSection => ({ id: newId(), title, played: false, rows: [newRow()] });

const move = <T extends { id: string }>(list: T[], id: string, dir: -1 | 1): T[] | null => {
  const from = list.findIndex((x) => x.id === id);

  const to = from + dir;

  if (from < 0 || to < 0 || to >= list.length) return null;

  const next = [...list];

  [next[from], next[to]] = [next[to], next[from]];

  return next;
};

const mapSection = (c: ScenarioContent, sectionId: string, fn: (s: ScenarioSection) => ScenarioSection): ScenarioContent => ({
  ...c,
  sections: c.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
});

export const addSection = (c: ScenarioContent, title: string): ScenarioContent => ({ ...c, sections: [...c.sections, newSection(title)] });

export const updateSection = (c: ScenarioContent, sectionId: string, patch: Partial<Omit<ScenarioSection, "id" | "rows">>): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, ...patch }));

export const removeSection = (c: ScenarioContent, sectionId: string): ScenarioContent => ({ ...c, sections: c.sections.filter((s) => s.id !== sectionId) });

export function moveSection(c: ScenarioContent, sectionId: string, dir: -1 | 1): ScenarioContent {
  const sections = move(c.sections, sectionId, dir);

  return sections ? { ...c, sections } : c;
}

export const addRow = (c: ScenarioContent, sectionId: string): ScenarioContent => mapSection(c, sectionId, (s) => ({ ...s, rows: [...s.rows, newRow()] }));

export const updateRow = (c: ScenarioContent, sectionId: string, rowId: string, patch: Partial<Omit<ScenarioRow, "id">>): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));

export const removeRow = (c: ScenarioContent, sectionId: string, rowId: string): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.filter((r) => r.id !== rowId) }));

export function moveRow(c: ScenarioContent, sectionId: string, rowId: string, dir: -1 | 1): ScenarioContent {
  const section = c.sections.find((s) => s.id === sectionId);

  const rows = section && move(section.rows, rowId, dir);

  return rows ? mapSection(c, sectionId, (s) => ({ ...s, rows })) : c;
}
```

`lib/utils/scenario/search-text.ts`:

```ts
import { docText } from "./doc";

import type { ScenarioContent } from "@/types/scenario";

const SECTION_PREFIX = "§";

const SNIPPET_RADIUS = 60;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function buildSearchText(title: string, content: ScenarioContent): string {
  const lines = content.sections.map((s) => {
    const body = s.rows.map((r) => `${docText(r.story)} ${docText(r.notes)}`).join(" ");

    return `${SECTION_PREFIX}${s.id}\t${oneLine(`${s.title} ${body}`)}`;
  });

  return [oneLine(title), ...lines].join("\n");
}

export function findSnippet(searchText: string, query: string): { sectionId: string | null; snippet: string } | null {
  const needle = query.trim().toLocaleLowerCase("uk");

  if (!needle) return null;

  for (const line of searchText.split("\n")) {
    const tab = line.startsWith(SECTION_PREFIX) ? line.indexOf("\t") : -1;

    const text = tab >= 0 ? line.slice(tab + 1) : line;

    const at = text.toLocaleLowerCase("uk").indexOf(needle);

    if (at < 0) continue;

    const start = Math.max(0, at - SNIPPET_RADIUS);

    const end = Math.min(text.length, at + needle.length + SNIPPET_RADIUS);

    return { sectionId: tab >= 0 ? line.slice(1, tab) : null, snippet: `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}` };
  }

  return null;
}
```

`lib/utils/scenario/reveal.ts`:

```ts
import { isDocEmpty, stripSecrets } from "./doc";

import type { ScenarioContent, ScenarioSection, StoryChapter } from "@/types/scenario";

export type PlayedLookup = (pageId: string, sectionId: string) => boolean;

export function revealTargets(sections: ScenarioSection[]): { pageId: string; sectionId: string }[] {
  return sections.flatMap((s) => (s.reveal?.mode === "afterSection" ? [{ pageId: s.reveal.pageId, sectionId: s.reveal.sectionId }] : []));
}

export function playedLookup(pages: { id: string; played: string[] }[]): PlayedLookup {
  const byPage = new Map(pages.map((p) => [p.id, new Set(p.played)]));

  return (pageId, sectionId) => byPage.get(pageId)?.has(sectionId) ?? false;
}

export function isChapterOpen(section: ScenarioSection, played: PlayedLookup): boolean {
  if (section.revealedAt) return true;

  return section.reveal?.mode === "afterSection" && played(section.reveal.pageId, section.reveal.sectionId);
}

export function openChapters(content: ScenarioContent, played: PlayedLookup): StoryChapter[] {
  return content.sections
    .filter((s) => isChapterOpen(s, played))
    .map((s) => ({ id: s.id, title: s.title, rows: s.rows.map((r) => stripSecrets(r.story)).filter((d) => !isDocEmpty(d)) }));
}
```

`lib/utils/scenario/index-groups.ts`:

```ts
import { UNARCHED_LABEL } from "@/lib/constants/scenario";
import type { ScenarioIndexGroups, ScenarioPageSummary } from "@/types/scenario";

const bySort = (a: ScenarioPageSummary, b: ScenarioPageSummary) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "uk");

export function groupIndex(pages: ScenarioPageSummary[]): ScenarioIndexGroups {
  const scenes = pages.filter((p) => p.kind === "scene").sort(bySort);

  const arcs = new Map<string, ScenarioIndexGroups["arcs"][number]>();

  scenes.forEach((page, i) => {
    const arc = page.arc?.trim() || UNARCHED_LABEL;

    if (!arcs.has(arc)) arcs.set(arc, { arc, pages: [] });

    arcs.get(arc)?.pages.push({ ...page, number: i + 1 });
  });

  return {
    arcs: [...arcs.values()],
    heroes: pages.filter((p) => p.kind === "hero").sort(bySort),
    notes: pages.filter((p) => p.kind === "note").sort(bySort),
  };
}
```

`lib/utils/scenario/mention-href.ts`:

```ts
import type { MentionType } from "@/types/scenario";

export function mentionHref(campaignId: string, type: MentionType, id: string): string {
  if (type === "battle") return `/campaigns/${campaignId}/battles/${id}`;

  const section = { unit: "units", artifact: "artifacts", character: "characters", spell: "spells" }[type];

  return `/campaigns/${campaignId}/dm/${section}/${id}`;
}
```

- [ ] **Step 7: Тести зелені, lint**

Run: `pnpm test:run lib/utils/scenario lib/schemas/__tests__/scenario.test.ts && pnpm lint --fix && pnpm exec tsc --noEmit -p .`
Expected: PASS, без помилок lint/tsc.

- [ ] **Step 8: Commit**

```bash
git add types/scenario.ts lib/constants/scenario.ts lib/constants/api-errors.ts lib/schemas/scenario.ts lib/schemas/__tests__/scenario.test.ts lib/utils/scenario
git commit -m "feat(scenario): domain types, schemas and pure content utils"
```

---

### Task 2: Prisma-модель, міграція, серверне сховище

**Files:**
- Modify: `prisma/schema.prisma` (нові моделі + зворотні зв'язки в `Campaign`, `Character`)
- Create: `prisma/migrations/20261021000000_scenario_pages/migration.sql`
- Create: `lib/server/scenario/page-store.ts`
- Test: `lib/server/scenario/__tests__/page-store.test.ts`

**Interfaces:**
- Consumes: `scenarioContentSchema`, `emptyContent`, константи версій (Task 1).
- Produces: `SUMMARY_SELECT`, `OWNED_SELECT`, `toSummary(row)` (явний pick 10 полів), `toPage(row)`, `readContent(json): ScenarioContent`, `listPages(campaignId): Promise<ScenarioPageSummary[]>`, `getPage(campaignId, pageId): Promise<ScenarioPage | null>`, `snapshotIfDue(pageId: string, userId: string, options?: { force?: boolean; now?: Date }): Promise<boolean>` (сам читає `content`, лише коли знімок потрібен), `pruneVersions(pageId): Promise<void>`; Prisma-делегати `prisma.scenarioPage`, `prisma.scenarioPageVersion`.

- [ ] **Step 1: Схема Prisma**

У `prisma/schema.prisma` додай моделі:

```prisma
model ScenarioPage {
  id          String                @id @default(cuid())
  campaignId  String
  kind        String
  arc         String?
  title       String
  subtitle    String?
  status      String                @default("draft")
  sortOrder   Int                   @default(0)
  characterId String?
  content     Json                  @default("{\"legend\":[],\"sections\":[]}")
  searchText  String                @default("")
  version     Int                   @default(0)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  campaign    Campaign              @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  character   Character?            @relation(fields: [characterId], references: [id], onDelete: SetNull)
  versions    ScenarioPageVersion[]

  @@index([campaignId, sortOrder])
  @@index([characterId])
  @@map("scenario_pages")
}

model ScenarioPageVersion {
  id        String       @id @default(cuid())
  pageId    String
  content   Json
  createdAt DateTime     @default(now())
  createdBy String
  page      ScenarioPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@index([pageId, createdAt])
  @@map("scenario_page_versions")
}
```

У `model Campaign` додай рядок `scenarioPages ScenarioPage[]`, у `model Character` — `scenarioPages ScenarioPage[]` (поруч з іншими зв'язками, в алфавітному порядку полів-зв'язків).

- [ ] **Step 2: Міграція**

Міграцію пишемо руками (`migrate dev` на спільній prodcopy може запропонувати reset). Створи `prisma/migrations/20261021000000_scenario_pages/migration.sql`:

```sql
CREATE TABLE "scenario_pages" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "arc" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "characterId" TEXT,
    "content" JSONB NOT NULL DEFAULT '{"legend":[],"sections":[]}',
    "searchText" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scenario_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scenario_page_versions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "scenario_page_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scenario_pages_campaignId_sortOrder_idx" ON "scenario_pages"("campaignId", "sortOrder");

CREATE INDEX "scenario_pages_characterId_idx" ON "scenario_pages"("characterId");

CREATE INDEX "scenario_page_versions_pageId_createdAt_idx" ON "scenario_page_versions"("pageId", "createdAt");

ALTER TABLE "scenario_pages" ADD CONSTRAINT "scenario_pages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scenario_pages" ADD CONSTRAINT "scenario_pages_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scenario_page_versions" ADD CONSTRAINT "scenario_page_versions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "scenario_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scenario_pages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "scenario_page_versions" ENABLE ROW LEVEL SECURITY;
```

Run: `pnpm exec prisma generate && pnpm db:local && pnpm test:run prisma/__tests__/migrations-rls.test.ts`
Expected: `migrate deploy` застосовує `20261021000000_scenario_pages`, RLS-тест PASS. Звір SQL зі схемою: `node --env-file=.env.local node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` має вивести порожній diff (RLS у diff не входить — це нормально).

- [ ] **Step 3: Падаючий тест сховища**

`lib/server/scenario/__tests__/page-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { pruneVersions, readContent, snapshotIfDue, toSummary } from "@/lib/server/scenario/page-store";

vi.mock("@/lib/db", () => ({
  prisma: {
    scenarioPage: { findUnique: vi.fn(async () => ({ content: { legend: [], sections: [] } })) },
    scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

const now = new Date("2026-10-21T12:00:00Z");

describe("page-store", () => {
  beforeEach(() => vi.clearAllMocks());

  it("readContent: битий JSON → порожній контент", () => {
    expect(readContent({ sections: "nope" })).toEqual({ legend: [], sections: [] });
    expect(readContent({ legend: [], sections: [] })).toEqual({ legend: [], sections: [] });
  });

  it("toSummary серіалізує дату і не пропускає content/searchText", () => {
    const summary = toSummary({ id: "p", kind: "scene", arc: null, title: "t", subtitle: null, status: "ready", sortOrder: 1, characterId: null, version: 3, updatedAt: now, content: {}, searchText: "x" } as never);

    expect(summary.updatedAt).toBe("2026-10-21T12:00:00.000Z");
    expect(summary).not.toHaveProperty("content");
    expect(summary).not.toHaveProperty("searchText");
  });

  it("знімок, якщо останній старший за 10 хв; ні — якщо свіжий", async () => {
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValueOnce({ createdAt: new Date("2026-10-21T11:40:00Z") } as never);
    expect(await snapshotIfDue("p", "dm", { now })).toBe(true);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalledWith({ data: { pageId: "p", content: { legend: [], sections: [] }, createdBy: "dm" } });

    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValueOnce({ createdAt: new Date("2026-10-21T11:55:00Z") } as never);
    expect(await snapshotIfDue("p", "dm", { now })).toBe(false);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalledTimes(1);
    expect(prisma.scenarioPage.findUnique).toHaveBeenCalledTimes(1);
  });

  it("force пише знімок завжди", async () => {
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValueOnce({ createdAt: now } as never);
    expect(await snapshotIfDue("p", "dm", { now, force: true })).toBe(true);
  });

  it("pruneVersions лишає 50 найновіших", async () => {
    vi.mocked(prisma.scenarioPageVersion.findMany).mockResolvedValueOnce([{ id: "old1" }, { id: "old2" }] as never);
    await pruneVersions("p");
    expect(prisma.scenarioPageVersion.findMany).toHaveBeenCalledWith({ where: { pageId: "p" }, orderBy: { createdAt: "desc" }, skip: 50, select: { id: true } });
    expect(prisma.scenarioPageVersion.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1", "old2"] } } });
  });
});
```

Run: `pnpm test:run lib/server/scenario` — Expected: FAIL.

- [ ] **Step 4: Реалізація**

`lib/server/scenario/page-store.ts`:

```ts
import type { Prisma } from "@prisma/client";

import "server-only";
import { SCENARIO_MAX_VERSIONS, SCENARIO_VERSION_INTERVAL_MS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { emptyContent } from "@/lib/utils/scenario/structure";
import type { ScenarioContent, ScenarioPage, ScenarioPageKind, ScenarioPageStatus, ScenarioPageSummary } from "@/types/scenario";

export const SUMMARY_SELECT = { id: true, kind: true, arc: true, title: true, subtitle: true, status: true, sortOrder: true, characterId: true, version: true, updatedAt: true } as const;

type SummaryRow = Prisma.ScenarioPageGetPayload<{ select: typeof SUMMARY_SELECT }>;

export function readContent(json: unknown): ScenarioContent {
  const parsed = scenarioContentSchema.safeParse(json);

  return parsed.success ? parsed.data : emptyContent();
}

// explicit pick: rows may carry content/searchText, which must not leak into summaries (egress)
export function toSummary(row: SummaryRow): ScenarioPageSummary {
  const { id, kind, arc, title, subtitle, status, sortOrder, characterId, version, updatedAt } = row;

  return { id, kind: kind as ScenarioPageKind, arc, title, subtitle, status: status as ScenarioPageStatus, sortOrder, characterId, version, updatedAt: updatedAt.toISOString() };
}

export function toPage(row: SummaryRow & { content: unknown }): ScenarioPage {
  return { ...toSummary(row), content: readContent(row.content) };
}

export const OWNED_SELECT = { id: true, campaignId: true, version: true, title: true } as const;

export async function listPages(campaignId: string): Promise<ScenarioPageSummary[]> {
  const rows = await prisma.scenarioPage.findMany({ where: { campaignId }, select: SUMMARY_SELECT, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });

  return rows.map(toSummary);
}

export async function getPage(campaignId: string, pageId: string): Promise<ScenarioPage | null> {
  const row = await prisma.scenarioPage.findFirst({ where: { id: pageId, campaignId }, select: { ...SUMMARY_SELECT, content: true } });

  return row ? toPage(row) : null;
}

// reads the current content only when a snapshot is actually due — autosave runs every 1.5 s
export async function snapshotIfDue(pageId: string, userId: string, options: { force?: boolean; now?: Date } = {}): Promise<boolean> {
  const now = options.now ?? new Date();

  if (!options.force) {
    const last = await prisma.scenarioPageVersion.findFirst({ where: { pageId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });

    if (last && now.getTime() - last.createdAt.getTime() < SCENARIO_VERSION_INTERVAL_MS) return false;
  }

  const page = await prisma.scenarioPage.findUnique({ where: { id: pageId }, select: { content: true } });

  if (!page) return false;

  await prisma.scenarioPageVersion.create({ data: { pageId, content: page.content as Prisma.InputJsonValue, createdBy: userId } });

  return true;
}

export async function pruneVersions(pageId: string): Promise<void> {
  const stale = await prisma.scenarioPageVersion.findMany({ where: { pageId }, orderBy: { createdAt: "desc" }, skip: SCENARIO_MAX_VERSIONS, select: { id: true } });

  if (stale.length) await prisma.scenarioPageVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
}
```

Run: `pnpm test:run lib/server/scenario && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261021000000_scenario_pages lib/server/scenario
git commit -m "feat(scenario): scenario_pages + versions tables and server store"
```

---

### Task 3: API сторінок (список, створення, читання, збереження, метадані, видалення)

**Files:**
- Create: `app/api/campaigns/[id]/scenario/route.ts`, `app/api/campaigns/[id]/scenario/scenario-handlers.ts`
- Create: `app/api/campaigns/[id]/scenario/[pageId]/route.ts`, `app/api/campaigns/[id]/scenario/[pageId]/page-handlers.ts`
- Test: `app/api/__tests__/scenario-pages-api.test.ts`

**Interfaces:**
- Consumes: Task 1 схеми/утиліти, Task 2 `page-store`.
- Produces HTTP:
  - `GET /scenario` → `ScenarioPageSummary[]`; `POST /scenario` (`CreateScenarioPageData`) → 201 `ScenarioPageSummary`
  - `GET /scenario/[pageId]` → `ScenarioPage`
  - `PUT /scenario/[pageId]` (`SaveScenarioContentData`) → `{ version: number }`; 409 `SCENARIO_CONFLICT`; 413 `SCENARIO_TOO_LARGE`
  - `PATCH /scenario/[pageId]` (`UpdateScenarioMetaData`) → `ScenarioPageSummary`
  - `DELETE /scenario/[pageId]` → `{ ok: true }`
- Усі — лише DM (`requireDM`).

- [ ] **Step 1: Падаючі route-тести**

`app/api/__tests__/scenario-pages-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    scenarioPage: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), aggregate: vi.fn(), updateMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(async () => []), deleteMany: vi.fn() },
    character: { findFirst: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const updatedAt = new Date("2026-10-21T00:00:00Z");

const content = { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони" }] }] }, notes: { type: "doc", content: [] } }] }] };

const row = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "camp1", kind: "scene", arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 2, updatedAt, content, ...over });

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

const listRoute = () => import("@/app/api/campaigns/[id]/scenario/route");

const pageRoute = () => import("@/app/api/campaigns/[id]/scenario/[pageId]/route");

describe("scenario pages API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.scenarioPage.aggregate).mockResolvedValue({ _max: { sortOrder: 4 } } as never);
    vi.mocked(prisma.scenarioPage.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => row({ ...data, id: "new", version: 0 })) as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValue(null);
  });

  it("не DM — 403 на список", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const { GET } = await listRoute();

    expect((await GET(req("GET"), params())).status).toBe(403);
  });

  it("POST сцени: sortOrder у кінець, дефолтна легенда, один розділ, searchText", async () => {
    const { POST } = await listRoute();

    const res = await POST(req("POST", { kind: "scene", title: " Погоня " }), params());

    expect(res.status).toBe(201);

    const data = vi.mocked(prisma.scenarioPage.create).mock.calls[0][0].data as Record<string, unknown> & { content: { legend: unknown[]; sections: unknown[] } };

    expect(data).toMatchObject({ campaignId: "camp1", kind: "scene", title: "Погоня", sortOrder: 5 });
    expect(data.content.legend).toHaveLength(7);
    expect(data.content.sections).toHaveLength(1);
    expect(data.searchText).toContain("Погоня");
  });

  it("POST героя з персонажем іншої кампанії — 400", async () => {
    vi.mocked(prisma.character.findFirst).mockResolvedValue(null);

    const { POST } = await listRoute();

    expect((await POST(req("POST", { kind: "hero", title: "Годрик", characterId: "foreign" }), params())).status).toBe(400);
    expect(prisma.scenarioPage.create).not.toHaveBeenCalled();
  });

  it("GET сторінки іншої кампанії — 403", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row({ campaignId: "camp2" }) as never);

    const { GET } = await pageRoute();

    expect((await GET(req("GET"), params({ pageId: "p1" }))).status).toBe(403);
  });

  it("PUT з правильною версією: знімок, version+1, searchText перераховано", async () => {
    const { PUT } = await pageRoute();

    const res = await PUT(req("PUT", { expectedVersion: 2, content }), params({ pageId: "p1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 3 });
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalled();
    expect(prisma.scenarioPage.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", version: 2 },
      data: expect.objectContaining({ content, version: { increment: 1 }, searchText: expect.stringContaining("Дзвони") }),
    });
  });

  it("PUT зі старою версією — 409 без запису", async () => {
    const { PUT } = await pageRoute();

    expect((await PUT(req("PUT", { expectedVersion: 1, content }), params({ pageId: "p1" }))).status).toBe(409);
    expect(prisma.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  it("PUT програв гонку (updateMany count 0) — 409", async () => {
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 0 } as never);

    const { PUT } = await pageRoute();

    expect((await PUT(req("PUT", { expectedVersion: 2, content }), params({ pageId: "p1" }))).status).toBe(409);
  });

  it("PUT з невідомим вузлом — 400", async () => {
    const { PUT } = await pageRoute();

    const bad = { ...content, sections: [{ ...content.sections[0], rows: [{ id: "r1", story: { type: "doc", content: [{ type: "script" }] }, notes: { type: "doc", content: [] } }] }] };

    expect((await PUT(req("PUT", { expectedVersion: 2, content: bad }), params({ pageId: "p1" }))).status).toBe(400);
  });

  it("PUT понад 512 KB — 413", async () => {
    const { PUT } = await pageRoute();

    const huge = { ...content, sections: [{ ...content.sections[0], rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "я".repeat(300_000) }] }] }, notes: { type: "doc", content: [] } }] }] };

    expect((await PUT(req("PUT", { expectedVersion: 2, content: huge }), params({ pageId: "p1" }))).status).toBe(413);
  });

  it("PATCH назви перераховує searchText і не чіпає version", async () => {
    vi.mocked(prisma.scenarioPage.update).mockResolvedValue(row({ title: "Новий" }) as never);

    const { PATCH } = await pageRoute();

    const res = await PATCH(req("PATCH", { title: "Новий", status: "ready" }), params({ pageId: "p1" }));

    expect(res.status).toBe(200);

    const data = vi.mocked(prisma.scenarioPage.update).mock.calls[0][0].data as Record<string, unknown>;

    expect(data).toMatchObject({ title: "Новий", status: "ready" });
    expect(String(data.searchText).split("\n")[0]).toBe("Новий");
    expect(data).not.toHaveProperty("version");
  });

  it("DELETE — ok", async () => {
    const { DELETE } = await pageRoute();

    expect(await (await DELETE(req("DELETE"), params({ pageId: "p1" }))).json()).toEqual({ ok: true });
    expect(prisma.scenarioPage.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
```

Run: `pnpm test:run app/api/__tests__/scenario-pages-api.test.ts` — Expected: FAIL.

- [ ] **Step 2: Хендлери списку**

`app/api/campaigns/[id]/scenario/scenario-handlers.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { DEFAULT_SCENE_LEGEND } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { createScenarioPageSchema } from "@/lib/schemas/scenario";
import { listPages, SUMMARY_SELECT, toSummary } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildSearchText } from "@/lib/utils/scenario/search-text";
import { newSection } from "@/lib/utils/scenario/structure";
import type { ScenarioContent } from "@/types/scenario";

export async function characterInCampaign(campaignId: string, characterId: string | null | undefined): Promise<boolean> {
  if (!characterId) return true;

  return !!(await prisma.character.findFirst({ where: { id: characterId, campaignId }, select: { id: true } }));
}

export async function listScenarioHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listPages(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "list scenario pages" });
  }
}

export async function createScenarioHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createScenarioPageSchema, req);

    if (body instanceof NextResponse) return body;

    if (!(await characterInCampaign(campaignId, body.characterId))) return errorResponse(API_ERRORS.SCENARIO_CHARACTER_INVALID, 400);

    const content: ScenarioContent = { legend: body.kind === "scene" ? DEFAULT_SCENE_LEGEND : [], sections: [newSection(body.kind === "hero" ? "Історія" : "Розділ 1")] };

    const last = await prisma.scenarioPage.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.scenarioPage.create({
      data: {
        campaignId,
        kind: body.kind,
        title: body.title,
        arc: body.arc ?? null,
        subtitle: body.subtitle ?? null,
        characterId: body.characterId ?? null,
        status: "draft",
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        content: content as unknown as Prisma.InputJsonValue,
        searchText: buildSearchText(body.title, content),
      },
      select: SUMMARY_SELECT,
    });

    return NextResponse.json(toSummary(row), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create scenario page" });
  }
}
```

`app/api/campaigns/[id]/scenario/route.ts`:

```ts
import { createScenarioHandler, listScenarioHandler } from "./scenario-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return listScenarioHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createScenarioHandler(req, (await params).id);
}
```

- [ ] **Step 3: Хендлери сторінки**

`app/api/campaigns/[id]/scenario/[pageId]/page-handlers.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { characterInCampaign } from "../scenario-handlers";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_CONTENT_BYTES } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { saveScenarioContentSchema, updateScenarioMetaSchema } from "@/lib/schemas/scenario";
import { OWNED_SELECT, pruneVersions, readContent, snapshotIfDue, SUMMARY_SELECT, toPage, toSummary } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildSearchText } from "@/lib/utils/scenario/search-text";

export const ownedPage = (campaignId: string, pageId: string) => loadOwned(prisma.scenarioPage.findUnique({ where: { id: pageId }, select: OWNED_SELECT }), campaignId, API_ERRORS.SCENARIO_NOT_FOUND);

export const ownedPageWithContent = (campaignId: string, pageId: string) =>
  loadOwned(prisma.scenarioPage.findUnique({ where: { id: pageId }, select: { ...SUMMARY_SELECT, campaignId: true, content: true } }), campaignId, API_ERRORS.SCENARIO_NOT_FOUND);

export async function getScenarioPageHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await ownedPageWithContent(campaignId, pageId);

    return page instanceof NextResponse ? page : NextResponse.json(toPage(page));
  } catch (error) {
    return handleApiError(error, { action: "get scenario page" });
  }
}

export async function saveScenarioContentHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(saveScenarioContentSchema, req);

    if (body instanceof NextResponse) return body;

    if (Buffer.byteLength(JSON.stringify(body.content)) > SCENARIO_MAX_CONTENT_BYTES) return errorResponse(API_ERRORS.SCENARIO_TOO_LARGE, 413);

    const page = await ownedPage(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    if (page.version !== body.expectedVersion) return errorResponse(API_ERRORS.SCENARIO_CONFLICT, 409);

    if (await snapshotIfDue(pageId, access.userId)) await pruneVersions(pageId);

    const { count } = await prisma.scenarioPage.updateMany({
      where: { id: pageId, version: body.expectedVersion },
      data: { content: body.content as unknown as Prisma.InputJsonValue, searchText: buildSearchText(page.title, body.content), version: { increment: 1 } },
    });

    if (count === 0) return errorResponse(API_ERRORS.SCENARIO_CONFLICT, 409);

    return NextResponse.json({ version: body.expectedVersion + 1 });
  } catch (error) {
    return handleApiError(error, { action: "save scenario page" });
  }
}

export async function updateScenarioMetaHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(updateScenarioMetaSchema, req);

    if (body instanceof NextResponse) return body;

    const page = await ownedPage(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    if (!(await characterInCampaign(campaignId, body.characterId))) return errorResponse(API_ERRORS.SCENARIO_CHARACTER_INVALID, 400);

    const titleChanged = body.title !== undefined && body.title !== page.title;

    const current = titleChanged ? await prisma.scenarioPage.findUnique({ where: { id: pageId }, select: { content: true } }) : null;

    const searchText = titleChanged && body.title ? buildSearchText(body.title, readContent(current?.content)) : undefined;

    const row = await prisma.scenarioPage.update({ where: { id: pageId }, data: { ...body, ...(searchText !== undefined && { searchText }) }, select: SUMMARY_SELECT });

    return NextResponse.json(toSummary(row));
  } catch (error) {
    return handleApiError(error, { action: "update scenario page" });
  }
}

export async function deleteScenarioPageHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await ownedPage(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    await prisma.scenarioPage.delete({ where: { id: pageId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete scenario page" });
  }
}
```

`app/api/campaigns/[id]/scenario/[pageId]/route.ts`:

```ts
import { deleteScenarioPageHandler, getScenarioPageHandler, saveScenarioContentHandler, updateScenarioMetaHandler } from "./page-handlers";

type Params = { params: Promise<{ id: string; pageId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return getScenarioPageHandler(id, pageId);
}

export async function PUT(req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return saveScenarioContentHandler(req, id, pageId);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return updateScenarioMetaHandler(req, id, pageId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return deleteScenarioPageHandler(id, pageId);
}
```

- [ ] **Step 4: Зелені тести + dm-only guard**

Якщо `app/api/__tests__/dm-only-routes-api.test.ts` перелічує DM-only маршрути явним списком — додай туди `scenario` за наявним зразком.
Run: `pnpm test:run app/api/__tests__/scenario-pages-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts && pnpm lint --fix && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/\[id\]/scenario app/api/__tests__/scenario-pages-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts
git commit -m "feat(scenario): pages API with optimistic version lock and snapshots"
```

---

### Task 4: API версій, розділів, пошуку, @-посилань

**Files:**
- Create: `app/api/campaigns/[id]/scenario/[pageId]/versions/route.ts`, `.../versions/versions-handlers.ts`
- Create: `app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route.ts`, `.../section-handler.ts`
- Create: `app/api/campaigns/[id]/scenario/search/route.ts`, `.../search/search-handler.ts`
- Create: `app/api/campaigns/[id]/scenario/mentions/route.ts`, `.../mentions/mentions-handler.ts`
- Test: `app/api/__tests__/scenario-aux-api.test.ts`

**Interfaces:**
- Consumes: `ownedPage` (лише `id, campaignId, version, title`) і `ownedPageWithContent` з `[pageId]/page-handlers.ts`, `page-store`, `findSnippet`, `buildSearchText`.
- Produces HTTP:
  - `GET /scenario/[pageId]/versions` → `ScenarioVersionSummary[]`; `POST` `{ versionId }` → `ScenarioPage` (відкат, знімок поточного перед ним)
  - `PATCH /scenario/[pageId]/sections/[sectionId]` `{ played?, revealed? }` → `{ version: number; section: ScenarioSection }`; 404 розділ; 409 гонка
  - `GET /scenario/search?q=` → `ScenarioSearchHit[]` (q < 2 символів → `[]`)
  - `GET /scenario/mentions?q=` → `MentionOption[]` (до 5 на тип)

- [ ] **Step 1: Падаючі тести**

`app/api/__tests__/scenario-aux-api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    scenarioPage: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    scenarioPageVersion: { findFirst: vi.fn(), findMany: vi.fn(async () => []), create: vi.fn(), deleteMany: vi.fn() },
    unit: { findMany: vi.fn(async () => [{ id: "u1", name: "Біс" }]) },
    artifact: { findMany: vi.fn(async () => []) },
    character: { findMany: vi.fn(async () => [{ id: "c1", name: "Біара" }]) },
    spell: { findMany: vi.fn(async () => []) },
    battleScene: { findMany: vi.fn(async () => []) },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const content = { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [] }] };

const row = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "camp1", kind: "scene", arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 4, updatedAt: new Date(), content, ...over });

const req = (method: string, body?: unknown, url = "http://x") => new Request(url, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

describe("scenario aux API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("section PATCH played → version+1, розділ у відповіді, searchText не чіпає", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route");

    const res = await PATCH(req("PATCH", { played: true }), params({ pageId: "p1", sectionId: "s1" }));

    expect(await res.json()).toEqual({ version: 5, section: { ...content.sections[0], played: true } });

    const call = vi.mocked(prisma.scenarioPage.updateMany).mock.calls[0][0];

    expect(call.where).toEqual({ id: "p1", version: 4 });
    expect(call.data).not.toHaveProperty("searchText");
  });

  it("section PATCH revealed ставить і знімає revealedAt", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route");

    const on = await (await PATCH(req("PATCH", { revealed: true }), params({ pageId: "p1", sectionId: "s1" }))).json();

    expect(typeof on.section.revealedAt).toBe("string");

    const off = await (await PATCH(req("PATCH", { revealed: false }), params({ pageId: "p1", sectionId: "s1" }))).json();

    expect(off.section.revealedAt).toBeNull();
  });

  it("section PATCH невідомий розділ — 404; гонка — 409", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route");

    expect((await PATCH(req("PATCH", { played: true }), params({ pageId: "p1", sectionId: "nope" }))).status).toBe(404);

    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 0 } as never);
    expect((await PATCH(req("PATCH", { played: true }), params({ pageId: "p1", sectionId: "s1" }))).status).toBe(409);
  });

  it("відкат: примусовий знімок поточного, контент з версії, version+1", async () => {
    const old = { legend: [], sections: [] };

    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValue({ id: "v1", pageId: "p1", content: old } as never);
    vi.mocked(prisma.scenarioPage.update).mockResolvedValue(row({ content: old, version: 5 }) as never);

    const { POST } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/versions/route");

    const res = await POST(req("POST", { versionId: "v1" }), params({ pageId: "p1" }));

    expect(res.status).toBe(200);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalledWith({ data: { pageId: "p1", content, createdBy: "dm" } });
    expect(vi.mocked(prisma.scenarioPage.update).mock.calls[0][0].data).toMatchObject({ content: old, version: { increment: 1 } });
  });

  it("відкат версії іншої сторінки — 404", async () => {
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValue(null);

    const { POST } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/versions/route");

    expect((await POST(req("POST", { versionId: "foreign" }), params({ pageId: "p1" }))).status).toBe(404);
  });

  it("пошук: короткий запит — []; інакше хіти з розділом", async () => {
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([{ id: "p1", title: "Монастир", searchText: "Монастир\n§s1\tСобор Дзвони обриваються" }] as never);

    const { GET } = await import("@/app/api/campaigns/[id]/scenario/search/route");

    expect(await (await GET(req("GET", undefined, "http://x?q=д"), params())).json()).toEqual([]);

    const hits = await (await GET(req("GET", undefined, "http://x?q=дзвони"), params())).json();

    expect(hits).toEqual([{ pageId: "p1", pageTitle: "Монастир", sectionId: "s1", snippet: "Собор Дзвони обриваються" }]);
    expect(vi.mocked(prisma.scenarioPage.findMany).mock.calls[0][0]?.where).toEqual({ campaignId: "camp1", searchText: { contains: "дзвони", mode: "insensitive" } });
  });

  it("mentions: збирає типи, фільтр за кампанією", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/scenario/mentions/route");

    const options = await (await GET(req("GET", undefined, "http://x?q=бі"), params())).json();

    expect(options).toEqual([{ type: "unit", id: "u1", label: "Біс" }, { type: "character", id: "c1", label: "Біара" }]);
    expect(vi.mocked(prisma.unit.findMany).mock.calls[0][0]?.where).toEqual({ campaignId: "camp1", name: { contains: "бі", mode: "insensitive" } });
  });
});
```

Run: `pnpm test:run app/api/__tests__/scenario-aux-api.test.ts` — Expected: FAIL.

- [ ] **Step 2: Розділи**

`.../sections/[sectionId]/section-handler.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { ownedPageWithContent } from "../../page-handlers";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { scenarioSectionPatchSchema } from "@/lib/schemas/scenario";
import { readContent } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { updateSection } from "@/lib/utils/scenario/structure";

export async function patchScenarioSectionHandler(req: Request, campaignId: string, pageId: string, sectionId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(scenarioSectionPatchSchema, req);

    if (body instanceof NextResponse) return body;

    const page = await ownedPageWithContent(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    const content = readContent(page.content);

    if (!content.sections.some((s) => s.id === sectionId)) return errorResponse(API_ERRORS.SCENARIO_SECTION_NOT_FOUND, 404);

    const next = updateSection(content, sectionId, {
      ...(body.played !== undefined && { played: body.played }),
      ...(body.revealed !== undefined && { revealedAt: body.revealed ? new Date().toISOString() : null }),
    });

    const { count } = await prisma.scenarioPage.updateMany({ where: { id: pageId, version: page.version }, data: { content: next as unknown as Prisma.InputJsonValue, version: { increment: 1 } } });

    if (count === 0) return errorResponse(API_ERRORS.SCENARIO_CONFLICT, 409);

    return NextResponse.json({ version: page.version + 1, section: next.sections.find((s) => s.id === sectionId) });
  } catch (error) {
    return handleApiError(error, { action: "patch scenario section" });
  }
}
```

`.../sections/[sectionId]/route.ts`:

```ts
import { patchScenarioSectionHandler } from "./section-handler";

type Params = { params: Promise<{ id: string; pageId: string; sectionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, pageId, sectionId } = await params;

  return patchScenarioSectionHandler(req, id, pageId, sectionId);
}
```

- [ ] **Step 3: Версії**

`.../versions/versions-handlers.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { ownedPage } from "../page-handlers";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_VERSIONS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { restoreScenarioVersionSchema } from "@/lib/schemas/scenario";
import { pruneVersions, readContent, snapshotIfDue, SUMMARY_SELECT, toPage } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildSearchText } from "@/lib/utils/scenario/search-text";

export async function listVersionsHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await ownedPage(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    const rows = await prisma.scenarioPageVersion.findMany({ where: { pageId }, orderBy: { createdAt: "desc" }, take: SCENARIO_MAX_VERSIONS, select: { id: true, createdAt: true, createdBy: true } });

    return NextResponse.json(rows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })));
  } catch (error) {
    return handleApiError(error, { action: "list scenario versions" });
  }
}

export async function restoreVersionHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(restoreScenarioVersionSchema, req);

    if (body instanceof NextResponse) return body;

    const page = await ownedPage(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    const version = await prisma.scenarioPageVersion.findFirst({ where: { id: body.versionId, pageId } });

    if (!version) return errorResponse(API_ERRORS.SCENARIO_VERSION_NOT_FOUND, 404);

    await snapshotIfDue(pageId, access.userId, { force: true });
    await pruneVersions(pageId);

    const row = await prisma.scenarioPage.update({
      where: { id: pageId },
      data: { content: version.content as Prisma.InputJsonValue, searchText: buildSearchText(page.title, readContent(version.content)), version: { increment: 1 } },
      select: { ...SUMMARY_SELECT, content: true },
    });

    return NextResponse.json(toPage(row));
  } catch (error) {
    return handleApiError(error, { action: "restore scenario version" });
  }
}
```

`.../versions/route.ts`:

```ts
import { listVersionsHandler, restoreVersionHandler } from "./versions-handlers";

type Params = { params: Promise<{ id: string; pageId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return listVersionsHandler(id, pageId);
}

export async function POST(req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return restoreVersionHandler(req, id, pageId);
}
```

- [ ] **Step 4: Пошук і згадки**

`.../search/search-handler.ts`:

```ts
import { NextResponse } from "next/server";

import { SCENARIO_SEARCH_LIMIT } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { findSnippet } from "@/lib/utils/scenario/search-text";
import type { ScenarioSearchHit } from "@/types/scenario";

export async function searchScenarioHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);

    if (q.length < 2) return NextResponse.json([]);

    const rows = await prisma.scenarioPage.findMany({
      where: { campaignId, searchText: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, searchText: true },
      orderBy: { sortOrder: "asc" },
      take: SCENARIO_SEARCH_LIMIT,
    });

    const hits: ScenarioSearchHit[] = rows.flatMap((r) => {
      const hit = findSnippet(r.searchText, q);

      return hit ? [{ pageId: r.id, pageTitle: r.title, ...hit }] : [];
    });

    return NextResponse.json(hits);
  } catch (error) {
    return handleApiError(error, { action: "search scenario" });
  }
}
```

`.../search/route.ts`:

```ts
import { searchScenarioHandler } from "./search-handler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return searchScenarioHandler(req, (await params).id);
}
```

`.../mentions/mentions-handler.ts`:

```ts
import { NextResponse } from "next/server";

import { SCENARIO_MENTION_LIMIT } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { MentionOption, MentionType } from "@/types/scenario";

export async function searchMentionsHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);

    const args = { where: { campaignId, name: { contains: q, mode: "insensitive" as const } }, select: { id: true, name: true }, orderBy: { name: "asc" as const }, take: SCENARIO_MENTION_LIMIT };

    const [unit, artifact, character, spell, battle] = await Promise.all([
      prisma.unit.findMany(args),
      prisma.artifact.findMany(args),
      prisma.character.findMany(args),
      prisma.spell.findMany(args),
      prisma.battleScene.findMany(args),
    ]);

    const groups: [MentionType, { id: string; name: string }[]][] = [["unit", unit], ["artifact", artifact], ["character", character], ["spell", spell], ["battle", battle]];

    const options: MentionOption[] = groups.flatMap(([type, rows]) => rows.map((r) => ({ type, id: r.id, label: r.name })));

    return NextResponse.json(options);
  } catch (error) {
    return handleApiError(error, { action: "search scenario mentions" });
  }
}
```

(У тесті `findMany` перевіряється по `where`; `orderBy`/`take` — додаткові поля, тест дивиться лише `where`.)

`.../mentions/route.ts`:

```ts
import { searchMentionsHandler } from "./mentions-handler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return searchMentionsHandler(req, (await params).id);
}
```

- [ ] **Step 5: Зелені тести**

Run: `pnpm test:run app/api/__tests__/scenario-aux-api.test.ts app/api/__tests__/scenario-pages-api.test.ts && pnpm lint --fix && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/campaigns/\[id\]/scenario app/api/__tests__/scenario-aux-api.test.ts
git commit -m "feat(scenario): versions, section progress, search and mention APIs"
```

---

### Task 5: Клієнтський API і хуки (включно з автозбереженням)

**Files:**
- Create: `lib/api/scenario.ts`
- Create: `lib/hooks/scenario/keys.ts`, `index.ts`, `useScenarioPages.ts`, `useScenarioPageActions.ts`, `useScenarioPage.ts`, `useScenarioDraft.ts`, `useSectionProgress.ts`, `useScenarioVersions.ts`, `useScenarioSearch.ts`, `useMentionSearch.ts`
- Test: `lib/hooks/scenario/__tests__/useScenarioDraft.test.tsx`, `lib/hooks/scenario/__tests__/useSectionProgress.test.tsx`

**Interfaces:**
- Consumes: HTTP з Task 3–4.
- Produces:
  - `scenarioKeys.{list(c), page(c,p), versions(c,p), search(c,q)}`
  - `useScenarioPages(campaignId, initial?) → UseQueryResult<ScenarioPageSummary[]>`
  - `useScenarioPageActions(campaignId) → { create(data): Promise<ScenarioPageSummary>; updateMeta(id, data): Promise<ScenarioPageSummary>; remove(id): Promise<void>; move(id, dir, pages): Promise<void>; isPending: boolean }`
  - `useScenarioPage(campaignId, pageId, initial?) → UseQueryResult<ScenarioPage>`
  - `useScenarioDraft(campaignId, page) → { content; setContent(fn: (c) => ScenarioContent); state: DraftState; flush(): Promise<void>; reload(): Promise<void> }`, `type DraftState = "saved" | "dirty" | "saving" | "error" | "conflict"`
  - `useSectionProgress(campaignId, pageId) → { setPlayed(sectionId, played); setRevealed(sectionId, revealed); isPending }`
  - `useScenarioVersions(campaignId, pageId, enabled) → { versions; isLoading; restore(versionId): Promise<void>; isRestoring }`
  - `useScenarioSearch(campaignId, query) → { hits: ScenarioSearchHit[]; isFetching }` (debounce 300 мс, від 2 символів)
  - `useMentionSearch(campaignId) → (query: string) => Promise<MentionOption[]>`

- [ ] **Step 1: `lib/api/scenario.ts`**

```ts
import { campaignGet, campaignPatch, campaignPost, campaignPut, createCampaignCrudApi } from "./client";

import type {
  CreateScenarioPageData, MentionOption, SaveScenarioContentData, ScenarioPage, ScenarioPageSummary, ScenarioSearchHit,
  ScenarioSection, ScenarioSectionPatch, ScenarioVersionSummary, UpdateScenarioMetaData,
} from "@/types/scenario";

const pagesApi = createCampaignCrudApi<ScenarioPageSummary, CreateScenarioPageData, UpdateScenarioMetaData, { ok: true }>("/scenario", { listCache: "no-store" });

export const getScenarioPages = pagesApi.list;
export const createScenarioPage = pagesApi.create;
export const updateScenarioMeta = pagesApi.update;
export const deleteScenarioPage = pagesApi.remove;

export const getScenarioPage = (campaignId: string, pageId: string) => campaignGet<ScenarioPage>(campaignId, `/scenario/${pageId}`, { cache: "no-store" });

export const saveScenarioContent = (campaignId: string, pageId: string, data: SaveScenarioContentData) => campaignPut<{ version: number }>(campaignId, `/scenario/${pageId}`, data);

export const patchScenarioSection = (campaignId: string, pageId: string, sectionId: string, data: ScenarioSectionPatch) =>
  campaignPatch<{ version: number; section: ScenarioSection }>(campaignId, `/scenario/${pageId}/sections/${sectionId}`, data);

export const getScenarioVersions = (campaignId: string, pageId: string) => campaignGet<ScenarioVersionSummary[]>(campaignId, `/scenario/${pageId}/versions`, { cache: "no-store" });

export const restoreScenarioVersion = (campaignId: string, pageId: string, versionId: string) => campaignPost<ScenarioPage>(campaignId, `/scenario/${pageId}/versions`, { versionId });

export const searchScenario = (campaignId: string, q: string) => campaignGet<ScenarioSearchHit[]>(campaignId, `/scenario/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });

export const searchMentions = (campaignId: string, q: string) => campaignGet<MentionOption[]>(campaignId, `/scenario/mentions?q=${encodeURIComponent(q)}`);
```

(Перевір, що `campaignGet`/`campaignPatch`/`campaignPost` експортуються з `lib/api/client.ts` — `campaignPatch` визначено поруч з `campaignPut`.)

- [ ] **Step 2: Ключі, прості хуки**

`lib/hooks/scenario/keys.ts`:

```ts
export const scenarioKeys = {
  list: (campaignId: string) => ["scenario-pages", campaignId] as const,
  page: (campaignId: string, pageId: string) => ["scenario-page", campaignId, pageId] as const,
  versions: (campaignId: string, pageId: string) => ["scenario-versions", campaignId, pageId] as const,
  search: (campaignId: string, q: string) => ["scenario-search", campaignId, q] as const,
};
```

`useScenarioPages.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioPages } from "@/lib/api/scenario";
import type { ScenarioPageSummary } from "@/types/scenario";

export function useScenarioPages(campaignId: string, initial?: ScenarioPageSummary[]) {
  return useQuery<ScenarioPageSummary[]>({
    queryKey: scenarioKeys.list(campaignId),
    queryFn: () => getScenarioPages(campaignId),
    staleTime: 60_000,
    ...(initial && { initialData: initial }),
  });
}
```

`useScenarioPage.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioPage } from "@/lib/api/scenario";
import type { ScenarioPage } from "@/types/scenario";

export function useScenarioPage(campaignId: string, pageId: string | null, initial?: ScenarioPage) {
  return useQuery<ScenarioPage>({
    queryKey: scenarioKeys.page(campaignId, pageId ?? ""),
    queryFn: () => getScenarioPage(campaignId, pageId as string),
    enabled: !!pageId,
    staleTime: 60_000,
    ...(initial && { initialData: initial }),
  });
}
```

`useScenarioPageActions.ts`:

```ts
"use client";

import { useCallback } from "react";

import { scenarioKeys } from "./keys";

import { createScenarioPage, deleteScenarioPage, updateScenarioMeta } from "@/lib/api/scenario";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CreateScenarioPageData, ScenarioPageSummary, UpdateScenarioMetaData } from "@/types/scenario";

export function useScenarioPageActions(campaignId: string) {
  const invalidateKeys = [scenarioKeys.list(campaignId)];

  const create = useCrudMutation({ mutationFn: (data: CreateScenarioPageData) => createScenarioPage(campaignId, data), invalidateKeys, errorText: "Не вдалося створити сторінку" });

  const update = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScenarioMetaData }) => updateScenarioMeta(campaignId, id, data),
    invalidateKeys: (_d, { id }) => [scenarioKeys.list(campaignId), scenarioKeys.page(campaignId, id)],
    errorText: "Не вдалося зберегти властивості",
  });

  const remove = useCrudMutation({ mutationFn: (id: string) => deleteScenarioPage(campaignId, id), invalidateKeys, errorText: "Не вдалося видалити сторінку" });

  const move = useCallback(
    async (id: string, dir: -1 | 1, siblings: ScenarioPageSummary[]) => {
      const at = siblings.findIndex((p) => p.id === id);

      const other = siblings[at + dir];

      if (at < 0 || !other) return;

      const current = siblings[at];

      await update.mutateAsync({ id: current.id, data: { sortOrder: other.sortOrder } });
      await update.mutateAsync({ id: other.id, data: { sortOrder: current.sortOrder === other.sortOrder ? current.sortOrder + dir * -1 : current.sortOrder } });
    },
    [update],
  );

  return {
    create: create.mutateAsync,
    updateMeta: (id: string, data: UpdateScenarioMetaData) => update.mutateAsync({ id, data }),
    remove: async (id: string) => void (await remove.mutateAsync(id)),
    move,
    isPending: create.isPending || update.isPending || remove.isPending,
  };
}
```

`useScenarioVersions.ts`:

```ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioVersions, restoreScenarioVersion } from "@/lib/api/scenario";
import { useCrudMutation } from "@/lib/hooks/common";

export function useScenarioVersions(campaignId: string, pageId: string, enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: scenarioKeys.versions(campaignId, pageId), queryFn: () => getScenarioVersions(campaignId, pageId), enabled });

  const restore = useCrudMutation({
    mutationFn: (versionId: string) => restoreScenarioVersion(campaignId, pageId, versionId),
    invalidateKeys: [scenarioKeys.versions(campaignId, pageId), scenarioKeys.list(campaignId)],
    errorText: "Не вдалося відновити версію",
    onSuccess: (page) => queryClient.setQueryData(scenarioKeys.page(campaignId, pageId), page),
  });

  return { versions: query.data ?? [], isLoading: query.isLoading, restore: async (id: string) => void (await restore.mutateAsync(id)), isRestoring: restore.isPending };
}
```

`useScenarioSearch.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { searchScenario } from "@/lib/api/scenario";

export function useScenarioSearch(campaignId: string, query: string) {
  const [debounced, setDebounced] = useState(query.trim());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);

    return () => clearTimeout(t);
  }, [query]);

  const result = useQuery({ queryKey: scenarioKeys.search(campaignId, debounced), queryFn: () => searchScenario(campaignId, debounced), enabled: debounced.length >= 2, staleTime: 30_000 });

  return { hits: debounced.length >= 2 ? (result.data ?? []) : [], isFetching: result.isFetching };
}
```

`useMentionSearch.ts`:

```ts
"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { searchMentions } from "@/lib/api/scenario";
import type { MentionOption } from "@/types/scenario";

export function useMentionSearch(campaignId: string): (query: string) => Promise<MentionOption[]> {
  const queryClient = useQueryClient();

  return useCallback(
    (query: string) => queryClient.fetchQuery({ queryKey: ["scenario-mentions", campaignId, query.trim()], queryFn: () => searchMentions(campaignId, query.trim()), staleTime: 60_000 }).catch(() => []),
    [campaignId, queryClient],
  );
}
```

- [ ] **Step 3: Падаючі тести `useScenarioDraft` і `useSectionProgress`**

`lib/hooks/scenario/__tests__/useScenarioDraft.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/scenario";
import { useScenarioDraft } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

vi.mock("@/lib/api/scenario", () => ({ saveScenarioContent: vi.fn(), getScenarioPage: vi.fn() }));

const page: ScenarioPage = { id: "p1", kind: "scene", arc: null, title: "t", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "", content: { legend: [], sections: [] } };

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

const rename = (title: string) => (c: ScenarioPage["content"]) => ({ ...c, legend: [{ kind: "read" as const, label: title }] });

describe("useScenarioDraft", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("debounce 1.5 с і один PUT з expectedVersion", async () => {
    vi.mocked(api.saveScenarioContent).mockResolvedValue({ version: 2 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    act(() => result.current.setContent(rename("ab")));
    expect(result.current.state).toBe("dirty");

    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(1);
    expect(api.saveScenarioContent).toHaveBeenCalledWith("c", "p1", { expectedVersion: 1, content: rename("ab")(page.content) });
    expect(result.current.state).toBe("saved");
  });

  it("правка під час збереження йде другим PUT з новою версією", async () => {
    let resolveFirst: (v: { version: number }) => void = () => {};

    vi.mocked(api.saveScenarioContent).mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValueOnce({ version: 3 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    act(() => result.current.setContent(rename("ab")));
    await act(async () => resolveFirst({ version: 2 }));
    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.saveScenarioContent).mock.calls[1][2]).toEqual({ expectedVersion: 2, content: rename("ab")(page.content) });
    expect(result.current.content.legend[0].label).toBe("ab");
  });

  it("409 → conflict, локальні зміни лишаються, далі PUT не шлються до reload", async () => {
    vi.mocked(api.saveScenarioContent).mockRejectedValue(new ApiError("conflict", 409, "/x"));

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));

    expect(result.current.state).toBe("conflict");
    expect(result.current.content.legend[0].label).toBe("a");

    act(() => result.current.setContent(rename("ab")));
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    await act(async () => result.current.flush());

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(1);
    expect(result.current.content.legend[0].label).toBe("ab");
  });

  it("flush чекає PUT, що вже летить, і дозберігає хвіст", async () => {
    let resolveFirst: (v: { version: number }) => void = () => {};

    vi.mocked(api.saveScenarioContent).mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValueOnce({ version: 3 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    act(() => result.current.setContent(rename("ab")));

    let done = false;

    const flushing = act(async () => {
      await result.current.flush();
      done = true;
    });

    expect(done).toBe(false);
    resolveFirst({ version: 2 });
    await flushing;

    expect(api.saveScenarioContent).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe("saved");
  });

  it("мережева помилка → error, flush повторює", async () => {
    vi.mocked(api.saveScenarioContent).mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce({ version: 2 });

    const { result } = renderHook(() => useScenarioDraft("c", page), { wrapper });

    act(() => result.current.setContent(rename("a")));
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(result.current.state).toBe("error");

    await act(async () => result.current.flush());
    expect(result.current.state).toBe("saved");
  });
});
```

`lib/hooks/scenario/__tests__/useSectionProgress.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/scenario";
import { scenarioKeys, useSectionProgress } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

vi.mock("@/lib/api/scenario", () => ({ patchScenarioSection: vi.fn() }));

const section = { id: "s1", title: "Собор", played: false, rows: [] };

const page: ScenarioPage = { id: "p1", kind: "scene", arc: null, title: "t", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "", content: { legend: [], sections: [section] } };

describe("useSectionProgress", () => {
  it("кладе розділ і версію з відповіді в кеш сторінки", async () => {
    const client = new QueryClient();

    client.setQueryData(scenarioKeys.page("c", "p1"), page);
    vi.mocked(api.patchScenarioSection).mockResolvedValue({ version: 2, section: { ...section, played: true } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useSectionProgress("c", "p1"), { wrapper });

    await act(async () => result.current.setPlayed("s1", true));

    const cached = client.getQueryData<ScenarioPage>(scenarioKeys.page("c", "p1"));

    expect(cached?.version).toBe(2);
    expect(cached?.content.sections[0].played).toBe(true);
  });
});
```

Run: `pnpm test:run lib/hooks/scenario` — Expected: FAIL.

- [ ] **Step 4: `useScenarioDraft` і `useSectionProgress`**

`useScenarioDraft.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { ApiError } from "@/lib/api/client";
import { getScenarioPage, saveScenarioContent } from "@/lib/api/scenario";
import { SCENARIO_AUTOSAVE_MS } from "@/lib/constants/scenario";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { ScenarioContent, ScenarioPage } from "@/types/scenario";

export type DraftState = "saved" | "dirty" | "saving" | "error" | "conflict";

type DraftRef = { content: ScenarioContent; version: number; dirty: boolean; conflict: boolean; inFlight: Promise<void> | null; timer: ReturnType<typeof setTimeout> | null };

export function useScenarioDraft(campaignId: string, page: ScenarioPage) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const [content, setLocal] = useState(page.content);

  const [state, setState] = useState<DraftState>("saved");

  const ref = useRef<DraftRef>({ content: page.content, version: page.version, dirty: false, conflict: false, inFlight: null, timer: null });

  const save = useCallback(async () => {
    const r = ref.current;

    r.dirty = false;
    setState("saving");

    const sent = r.content;

    try {
      const { version } = await saveScenarioContent(campaignId, page.id, { expectedVersion: r.version, content: sent });

      r.version = version;
      queryClient.setQueryData<ScenarioPage>(scenarioKeys.page(campaignId, page.id), (old) => old && { ...old, content: sent, version });
      setState(r.dirty ? "dirty" : "saved");
    } catch (error) {
      r.dirty = true;

      if (error instanceof ApiError && error.status === 409) {
        // stop saving until reload: every further PUT would 409 and pop another dialog
        r.conflict = true;
        setState("conflict");
        notify("Сторінку змінено в іншій вкладці. Ваші правки лишились тут — перезавантажте сторінку, щоб побачити нову версію.");
      } else {
        setState("error");
      }
    }
  }, [campaignId, page.id, queryClient, notify]);

  // resolves only when everything typed so far is saved (or failed) — callers await it before leaving edit mode
  const flush = useCallback(async (): Promise<void> => {
    const r = ref.current;

    if (r.timer) clearTimeout(r.timer);

    r.timer = null;

    while (r.inFlight) await r.inFlight;

    if (!r.dirty || r.conflict) return;

    r.inFlight = save().finally(() => {
      r.inFlight = null;
    });
    await r.inFlight;
  }, [save]);

  const setContent = useCallback(
    (fn: (c: ScenarioContent) => ScenarioContent) => {
      const r = ref.current;

      r.content = fn(r.content);
      r.dirty = true;
      setLocal(r.content);

      if (r.conflict) return;

      setState("dirty");

      if (r.timer) clearTimeout(r.timer);

      r.timer = setTimeout(() => void flush(), SCENARIO_AUTOSAVE_MS);
    },
    [flush],
  );

  const reload = useCallback(async () => {
    const fresh = await getScenarioPage(campaignId, page.id);

    queryClient.setQueryData(scenarioKeys.page(campaignId, page.id), fresh);
    ref.current = { ...ref.current, content: fresh.content, version: fresh.version, dirty: false, conflict: false };
    setLocal(fresh.content);
    setState("saved");
  }, [campaignId, page.id, queryClient]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (ref.current.dirty || ref.current.inFlight) e.preventDefault();
    };

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
      void flush();
    };
  }, [flush]);

  return { content, setContent, state, flush, reload };
}
```

Тест 2: правка під час польоту першого PUT ставить таймер; він спрацьовує після 1.5 с, `flush` чекає завершення першого PUT і шле другий з новою версією.

`useSectionProgress.ts`:

```ts
"use client";

import { useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { patchScenarioSection } from "@/lib/api/scenario";
import { useCrudMutation } from "@/lib/hooks/common";
import type { ScenarioPage, ScenarioSectionPatch } from "@/types/scenario";

export function useSectionProgress(campaignId: string, pageId: string) {
  const queryClient = useQueryClient();

  const key = scenarioKeys.page(campaignId, pageId);

  const mutation = useCrudMutation({
    mutationFn: ({ sectionId, patch }: { sectionId: string; patch: ScenarioSectionPatch }) => patchScenarioSection(campaignId, pageId, sectionId, patch),
    errorText: "Не вдалося оновити розділ — перезавантажте сторінку",
    onSuccess: ({ version, section }) =>
      queryClient.setQueryData<ScenarioPage>(key, (old) => old && { ...old, version, content: { ...old.content, sections: old.content.sections.map((s) => (s.id === section.id ? section : s)) } }),
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    setPlayed: (sectionId: string, played: boolean) => mutation.mutateAsync({ sectionId, patch: { played } }).then(() => undefined),
    setRevealed: (sectionId: string, revealed: boolean) => mutation.mutateAsync({ sectionId, patch: { revealed } }).then(() => undefined),
    isPending: mutation.isPending,
  };
}
```

`index.ts`:

```ts
export { scenarioKeys } from "./keys";
export { useMentionSearch } from "./useMentionSearch";
export { type DraftState, useScenarioDraft } from "./useScenarioDraft";
export { useScenarioPage } from "./useScenarioPage";
export { useScenarioPageActions } from "./useScenarioPageActions";
export { useScenarioPages } from "./useScenarioPages";
export { useScenarioSearch } from "./useScenarioSearch";
export { useScenarioVersions } from "./useScenarioVersions";
export { useSectionProgress } from "./useSectionProgress";
```

- [ ] **Step 5: Зелені тести**

Run: `pnpm test:run lib/hooks/scenario && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS. (Якщо `useCrudMutation` у `mutateAsync` кидає помилку після показу `errorText` — це очікувано; виклики в компонентах обгортати `void`/`.catch(() => {})`.)

- [ ] **Step 6: Commit**

```bash
git add lib/api/scenario.ts lib/hooks/scenario
git commit -m "feat(scenario): client API and hooks with debounced autosave"
```

---

### Task 6: Книга й рендер (вигляд як в артефакті)

**Files:**
- Modify: `vitest-setup.ts` (мок `Alegreya`)
- Create: `components/scenario/fonts.ts`, `components/scenario/scenario-book.css`, `components/scenario/ScenarioBook.tsx`, `components/scenario/ScenarioRichText.tsx`, `components/scenario/ScenarioLegend.tsx`, `components/scenario/index.ts`
- Test: `components/scenario/__tests__/scenario-rich-text.test.tsx`

**Interfaces:**
- Consumes: `RichDoc`, `mentionHref`, `MENTION_LABELS`.
- Produces:
  - `ScenarioBook({ children, hideNotes?, theme?: "light" | "dark" | null, variant?: "page" | "inline" })` — обгортка `.scenario-book` з токенами й шрифтами
  - `ScenarioRichText({ doc, campaignId, linkMentions? })` — JSON → React (атрибути з allowlist, без `dangerouslySetInnerHTML`)
  - `ScenarioLegend({ legend })`

- [ ] **Step 1: Падаючий тест рендеру**

`components/scenario/__tests__/scenario-rich-text.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioRichText } from "@/components/scenario";
import type { RichDoc } from "@/types/scenario";

afterEach(cleanup);

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Прорив" }] },
    { type: "readAloud", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони обриваються" }] }] },
    { type: "say", content: [{ type: "text", text: "«Я повернуся»" }] },
    { type: "callout", attrs: { kind: "choice", tag: "Вибір Годрика", onclick: "alert(1)" }, content: [{ type: "paragraph", content: [{ type: "token", attrs: { color: "green" } }, { type: "text", text: "Іде", marks: [{ type: "bold" }] }, { type: "text", text: " таємно", marks: [{ type: "secret" }] }] }] },
    { type: "paragraph", content: [{ type: "mention", attrs: { type: "unit", id: "u1", label: "Біс" } }, { type: "text", text: "<script>x</script>" }] },
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1.0" }] }] }] }] },
  ],
};

describe("ScenarioRichText", () => {
  it("класи як в артефакті", () => {
    const { container } = render(<ScenarioRichText doc={doc} campaignId="c" linkMentions />);

    expect(container.querySelector("h3")?.textContent).toBe("Прорив");
    expect(container.querySelector(".read p")?.textContent).toBe("Дзвони обриваються");
    expect(container.querySelector("p.say")?.textContent).toBe("«Я повернуся»");
    expect(container.querySelector(".mark.choice .tag")?.textContent).toBe("Вибір Годрика");
    expect(container.querySelector(".mark.choice .g")).not.toBeNull();
    expect(container.querySelector(".mark.choice strong")?.textContent).toBe("Іде");
    expect(container.querySelector(".secret")?.textContent).toBe(" таємно");
    expect(container.querySelector("table td")?.textContent).toBe("1.0");
  });

  it("згадка — посилання на сутність; текст екрановано; сторонні attrs ігноруються", () => {
    const { container } = render(<ScenarioRichText doc={doc} campaignId="c" linkMentions />);

    expect(screen.getByRole("link", { name: /Біс/ }).getAttribute("href")).toBe("/campaigns/c/dm/units/u1");
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onclick");
  });

  it("без linkMentions згадка — простий текст", () => {
    render(<ScenarioRichText doc={doc} campaignId="c" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Біс")).toBeTruthy();
  });
});
```

Run: `pnpm test:run components/scenario` — Expected: FAIL.

- [ ] **Step 2: Шрифти й CSS**

Спершу розшир глобальний мок у `vitest-setup.ts` (інакше всі тести, що імпортують `StoryTab`/книгу, падають з «No Alegreya export»):

```ts
vi.mock("next/font/google", () => ({
  Alegreya: () => ({ variable: "" }),
  Alegreya_SC: () => ({ variable: "" }),
  Alegreya_Sans: () => ({ variable: "" }),
  EB_Garamond: () => ({ variable: "" }),
}));
```

`components/scenario/fonts.ts`:

```ts
import { Alegreya, Alegreya_Sans } from "next/font/google";

const serif = Alegreya({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-scenario-serif", display: "swap", preload: false });

const sans = Alegreya_Sans({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-scenario-sans", display: "swap", preload: false });

export const scenarioFontClassName = `${serif.variable} ${sans.variable}`;
```

`components/scenario/scenario-book.css` — перенесення стилів артефакту під `.scenario-book` (значення кольорів, розмірів і відступів скопійовані з артефакту «Монастир Світла» і біографії Годрика):

```css
.scenario-book {
  --page: #e6e1d7; --ink: #2b241f; --ink-soft: #5e5248; --margin: #d9d2c4; --rule: #bfb4a2;
  --blood: #7c2020; --verdigris: #2f6656; --rust: #a0442a; --gold: #8c6b1f; --night: #3b3f5c; --shade: #5b3a78;
  --tint-blood: #7c202012; --tint-verd: #2f665614; --tint-gold: #8c6b1f16; --tint-night: #3b3f5c14; --tint-shade: #5b3a7816; --tint-rust: #a0442a12;
  background: var(--page); color: var(--ink);
  font-family: var(--font-scenario-serif), Georgia, "Times New Roman", serif; font-size: 19px; line-height: 1.62;
}
.scenario-book[data-theme="dark"] {
  --page: #1f1c19; --ink: #e5ddcf; --ink-soft: #ada192; --margin: #27231f; --rule: #4a433b;
  --blood: #d4706a; --verdigris: #79b8a4; --rust: #e08a6a; --gold: #d3b060; --night: #a9aed8; --shade: #b79bd6;
  --tint-blood: #d4706a1a; --tint-verd: #79b8a41a; --tint-gold: #d3b0601a; --tint-night: #a9aed81a; --tint-shade: #b79bd61a; --tint-rust: #e08a6a1a;
}
@media (prefers-color-scheme: dark) {
  .scenario-book:not([data-theme]) {
    --page: #1f1c19; --ink: #e5ddcf; --ink-soft: #ada192; --margin: #27231f; --rule: #4a433b;
    --blood: #d4706a; --verdigris: #79b8a4; --rust: #e08a6a; --gold: #d3b060; --night: #a9aed8; --shade: #b79bd6;
    --tint-blood: #d4706a1a; --tint-verd: #79b8a41a; --tint-gold: #d3b0601a; --tint-night: #a9aed81a; --tint-shade: #b79bd61a; --tint-rust: #e08a6a1a;
  }
}
.scenario-book a { color: inherit; }
.scenario-book :focus-visible { outline: 2px solid var(--blood); outline-offset: 3px; }
.scenario-book .sans { font-family: var(--font-scenario-sans), system-ui, sans-serif; }

.scenario-book .sb-bar { position: sticky; top: 0; z-index: 5; background: var(--page); border-bottom: 1px solid var(--rule); }
.scenario-book .sb-bar-in { max-width: 1180px; margin: 0 auto; padding: 10px 24px; display: flex; gap: 18px; align-items: center; flex-wrap: wrap; font-family: var(--font-scenario-sans), system-ui, sans-serif; font-size: 15px; }
.scenario-book .sb-bar strong { font-size: 17px; margin-right: auto; font-family: var(--font-scenario-serif), serif; }
.scenario-book .sb-bar nav { display: flex; gap: 14px; flex-wrap: wrap; }
.scenario-book .sb-bar nav a { text-decoration: none; color: var(--ink-soft); }
.scenario-book .sb-bar nav a:hover { color: var(--blood); }
.scenario-book .toggle { font: inherit; background: none; border: 1px solid var(--rule); color: var(--ink); border-radius: 4px; padding: 4px 10px; cursor: pointer; }
.scenario-book .toggle[aria-pressed="true"] { border-color: var(--blood); color: var(--blood); }

.scenario-book header.title { max-width: 1180px; margin: 0 auto; padding: 56px 24px 28px; }
.scenario-book header.title h1 { font-size: clamp(40px, 6vw, 64px); line-height: 1.02; font-weight: 500; margin: 0 0 10px; letter-spacing: -0.01em; }
.scenario-book header.title p { margin: 0; color: var(--ink-soft); font-style: italic; max-width: 46ch; }
.scenario-book .legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 22px; font-family: var(--font-scenario-sans), sans-serif; font-size: 15px; color: var(--ink-soft); }
.scenario-book .legend span { display: inline-flex; align-items: center; gap: 7px; }
.scenario-book .legend i { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }

.scenario-book main { max-width: 1180px; margin: 0 auto; padding: 0 24px 120px; }
.scenario-book section { margin-top: 56px; scroll-margin-top: 72px; }
.scenario-book section > h2 { font-size: 30px; font-weight: 500; margin: 0 0 6px; padding-bottom: 10px; border-bottom: 2px solid var(--ink); display: flex; gap: 12px; align-items: baseline; }
.scenario-book section > h2 .played { margin-left: auto; font-family: var(--font-scenario-sans), sans-serif; font-size: 14px; font-weight: 700; }
.scenario-book section.is-played > h2 { color: var(--ink-soft); }
.scenario-book h3 { font-size: 21px; font-weight: 700; margin: 0 0 8px; }
.scenario-book .row { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; padding: 22px 0; border-bottom: 1px solid var(--rule); }
.scenario-book .row:last-child { border-bottom: none; }
.scenario-book .story { max-width: 68ch; }
.scenario-book .story p { margin: 0 0 14px; }
.scenario-book .notes { background: var(--margin); border-radius: 3px; padding: 14px 16px; font-family: var(--font-scenario-sans), system-ui, sans-serif; font-size: 15.5px; line-height: 1.5; color: var(--ink-soft); align-self: start; }
.scenario-book .notes p { margin: 0 0 10px; }
.scenario-book .notes p:last-child { margin-bottom: 0; }
.scenario-book .notes strong { color: var(--ink); font-weight: 700; }
.scenario-book .notes:empty { display: none; }
.scenario-book.hide-notes .row { grid-template-columns: minmax(0, 1fr); }
.scenario-book.hide-notes .notes { display: none; }

.scenario-book .read { font-size: 21px; line-height: 1.6; font-style: italic; margin: 6px 0 18px; padding-left: 20px; border-left: 3px solid var(--blood); }
.scenario-book .read p { margin: 0 0 10px; }
.scenario-book .say { font-style: italic; font-size: 21px; }

.scenario-book .mark { margin: 14px 0; padding: 12px 16px; border-left: 4px solid; border-radius: 0 3px 3px 0; }
.scenario-book .mark .tag { display: block; font-family: var(--font-scenario-sans), sans-serif; font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.scenario-book .mark p { margin: 0 0 8px; }
.scenario-book .mark p:last-child { margin: 0; }
.scenario-book .mark ul, .scenario-book .mark ol { margin: 6px 0 0; padding-left: 20px; }
.scenario-book .mark li { margin: 0 0 6px; }
.scenario-book .choice { border-color: var(--night); background: var(--tint-night); } .scenario-book .choice .tag { color: var(--night); }
.scenario-book .shadow { border-color: var(--shade); background: var(--tint-shade); } .scenario-book .shadow .tag { color: var(--shade); }
.scenario-book .check { border-color: var(--ink-soft); background: var(--margin); } .scenario-book .check .tag { color: var(--ink); }
.scenario-book .event { border-color: var(--blood); background: var(--tint-blood); } .scenario-book .event .tag { color: var(--blood); }
.scenario-book .artifact { border-color: var(--gold); background: var(--tint-gold); } .scenario-book .artifact .tag { color: var(--gold); }
.scenario-book .token { border-color: var(--verdigris); background: var(--tint-verd); } .scenario-book .token .tag { color: var(--verdigris); }
.scenario-book .hero { border-color: var(--rust); background: var(--tint-rust); } .scenario-book .hero .tag { color: var(--rust); }
.scenario-book .goal { border-color: var(--verdigris); background: var(--tint-verd); } .scenario-book .goal .tag { color: var(--verdigris); }
.scenario-book .confide { border-left: 6px double var(--blood); background: var(--tint-blood); } .scenario-book .confide .tag { color: var(--blood); }
.scenario-book .g, .scenario-book .r { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
.scenario-book .g { background: var(--verdigris); } .scenario-book .r { background: var(--rust); }
.scenario-book .secret { color: var(--blood) !important; }
.scenario-book .mention { font-family: var(--font-scenario-sans), sans-serif; font-weight: 700; color: var(--night); text-decoration: none; border-bottom: 1px dotted var(--night); }
.scenario-book table { border-collapse: collapse; width: 100%; font-size: 15px; }
.scenario-book td, .scenario-book th { padding: 5px 0; vertical-align: top; border-top: 1px solid var(--rule); text-align: left; }
.scenario-book td:first-child { padding-right: 10px; color: var(--ink); }
.scenario-book td p, .scenario-book th p { margin: 0; }

.scenario-book--inline { background: transparent; font-size: 16px; }
.scenario-book--inline .read, .scenario-book--inline .say { font-size: 17px; }

@media (max-width: 860px) {
  .scenario-book { font-size: 18px; }
  .scenario-book .row { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .scenario-book .read, .scenario-book .say { font-size: 19.5px; }
  .scenario-book .sb-bar nav { width: 100%; overflow-x: auto; flex-wrap: nowrap; }
  .scenario-book .sb-bar-in, .scenario-book header.title, .scenario-book main { padding-left: 16px; padding-right: 16px; }
}
@media print { .scenario-book .sb-bar { display: none; } .scenario-book .row { break-inside: avoid; } }
```

- [ ] **Step 3: Компоненти**

`components/scenario/ScenarioBook.tsx`:

```tsx
import type { ReactNode } from "react";

import "./scenario-book.css";
import { scenarioFontClassName } from "./fonts";

import { cn } from "@/lib/utils";

export function ScenarioBook({ children, hideNotes = false, theme = null, variant = "page" }: { children: ReactNode; hideNotes?: boolean; theme?: "light" | "dark" | null; variant?: "page" | "inline" }) {
  return (
    <div className={cn("scenario-book", scenarioFontClassName, hideNotes && "hide-notes", variant === "inline" && "scenario-book--inline")} data-theme={theme ?? undefined}>
      {children}
    </div>
  );
}
```

(Перевір шлях `cn`: `grep -rn "export function cn" lib` — використовуй той, що вже імпортують компоненти.)

`components/scenario/ScenarioRichText.tsx`:

```tsx
import { Fragment, type ReactNode } from "react";
import Link from "next/link";

import { CALLOUT_KINDS, MENTION_TYPES } from "@/lib/constants/scenario";
import { mentionHref } from "@/lib/utils/scenario/mention-href";
import type { CalloutKind, MentionType, RichDoc, RichNode } from "@/types/scenario";

type Ctx = { campaignId: string; linkMentions: boolean };

const str = (v: unknown) => (typeof v === "string" ? v : "");

const calloutKind = (v: unknown): CalloutKind => (CALLOUT_KINDS.includes(v as CalloutKind) ? (v as CalloutKind) : "event");

function withMarks(node: RichNode, inner: ReactNode): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>((acc, mark) => {
    if (mark.type === "bold") return <strong>{acc}</strong>;

    if (mark.type === "italic") return <em>{acc}</em>;

    return <span className="secret">{acc}</span>;
  }, inner);
}

function Mention({ node, ctx }: { node: RichNode; ctx: Ctx }) {
  const type = node.attrs?.type as MentionType;

  const label = str(node.attrs?.label);

  const id = str(node.attrs?.id);

  if (ctx.linkMentions && id && MENTION_TYPES.includes(type)) {
    return (
      <Link className="mention" href={mentionHref(ctx.campaignId, type, id)}>
        {label}
      </Link>
    );
  }

  return <span className="mention">{label}</span>;
}

function children(node: RichNode, ctx: Ctx) {
  return (node.content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child, ctx)}</Fragment>);
}

function renderNode(node: RichNode, ctx: Ctx): ReactNode {
  switch (node.type) {
    case "text":
      return withMarks(node, node.text ?? "");
    case "hardBreak":
      return <br />;
    case "token":
      return withMarks(node, <span className={node.attrs?.color === "red" ? "r" : "g"} />);
    case "mention":
      return withMarks(node, <Mention node={node} ctx={ctx} />);
    case "paragraph":
      return <p>{children(node, ctx)}</p>;
    case "heading":
      return <h3>{children(node, ctx)}</h3>;
    case "say":
      return <p className="say">{children(node, ctx)}</p>;
    case "readAloud":
      return <div className="read">{children(node, ctx)}</div>;
    case "callout": {
      const kind = calloutKind(node.attrs?.kind);

      const tag = str(node.attrs?.tag);

      return (
        <div className={`mark ${kind}`}>
          {tag && <span className="tag">{tag}</span>}
          {children(node, ctx)}
        </div>
      );
    }

    case "bulletList":
      return <ul>{children(node, ctx)}</ul>;
    case "orderedList":
      return <ol>{children(node, ctx)}</ol>;
    case "listItem":
      return <li>{children(node, ctx)}</li>;
    case "table":
      return (
        <table>
          <tbody>{children(node, ctx)}</tbody>
        </table>
      );
    case "tableRow":
      return <tr>{children(node, ctx)}</tr>;
    case "tableCell":
      return <td>{children(node, ctx)}</td>;
    case "tableHeader":
      return <th>{children(node, ctx)}</th>;
    default:
      return children(node, ctx);
  }
}

export function ScenarioRichText({ doc, campaignId, linkMentions = false }: { doc: RichDoc; campaignId: string; linkMentions?: boolean }) {
  return <>{children({ type: "doc", content: doc.content }, { campaignId, linkMentions })}</>;
}
```

`components/scenario/ScenarioLegend.tsx`:

```tsx
import type { CSSProperties } from "react";

import type { LegendEntry, LegendKind } from "@/types/scenario";

const SWATCH: Record<LegendKind, CSSProperties> = {
  read: { background: "var(--blood)" },
  choice: { background: "var(--night)" },
  token: { background: "var(--verdigris)" },
  artifact: { background: "var(--gold)" },
  shadow: { background: "var(--shade)" },
  check: { background: "var(--ink-soft)" },
  notes: { background: "var(--margin)", outline: "1px solid var(--rule)" },
};

export function ScenarioLegend({ legend }: { legend: LegendEntry[] }) {
  if (!legend.length) return null;

  return (
    <div className="legend" aria-label="Позначки">
      {legend.map((l, i) => (
        <span key={i}>
          <i style={SWATCH[l.kind]} />
          {l.label}
        </span>
      ))}
    </div>
  );
}
```

`components/scenario/index.ts`:

```ts
export { ScenarioBook } from "./ScenarioBook";
export { ScenarioLegend } from "./ScenarioLegend";
export { ScenarioRichText } from "./ScenarioRichText";
```

Run: `pnpm test:run components/scenario && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/scenario
git commit -m "feat(scenario): book styles and JSON renderer matching the artifact look"
```

---

### Task 7: Глави біографії у профілі персонажа

**Files:**
- Create: `lib/server/scenario/player-story.ts`, `components/character-profile/StoryChapters.tsx`
- Modify: `types/characters.ts:235` (`story` + `chapters: StoryChapter[]`), `lib/utils/characters/sheet/build-sheet.ts` (`SheetInput.chapters`, `story.chapters`), `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts` (`buildSheetFor` завантажує глави), `components/character-profile/StoryTab.tsx`, `components/character-profile/index.ts` (якщо експортує вкладки), фікстури листа (`grep -rln "biography:" components lib app` — додати `chapters: []`)
- Test: `lib/server/scenario/__tests__/player-story.test.ts`, доповнити `components/character-profile/__tests__/story-tab.test.tsx`

**Interfaces:**
- Consumes: `openChapters`, `playedLookup`, `revealTargets` (Task 1), `readContent` (Task 2), `ScenarioBook`, `ScenarioRichText` (Task 6).
- Produces: `loadStoryChapters(characterId: string, campaignId: string): Promise<StoryChapter[]>`; `CharacterSheet["story"]["chapters"]`; `StoryChapters({ chapters, campaignId })`.

- [ ] **Step 1: Падаючий тест серверу**

`lib/server/scenario/__tests__/player-story.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { loadStoryChapters } from "@/lib/server/scenario/player-story";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findMany: vi.fn() }, $queryRaw: vi.fn() } }));

const p = (text: string, secret = false) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, ...(secret && { marks: [{ type: "secret" }] }) }] }] });

const heroContent = {
  legend: [],
  sections: [
    { id: "h1", title: "Історія", played: false, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Відкрито " }, { type: "text", text: "СЕКРЕТ", marks: [{ type: "secret" }] }] }] }, notes: p("НОТАТКА") }] },
    { id: "h2", title: "Після собору", played: false, reveal: { mode: "afterSection", pageId: "scene1", sectionId: "s10" }, rows: [{ id: "r2", story: p("Друга"), notes: p("") }] },
    { id: "h3", title: "Закрита", played: false, reveal: { mode: "manual" }, rows: [{ id: "r3", story: p("Ні"), notes: p("") }] },
  ],
};

describe("loadStoryChapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("без hero-сторінок — [] і без зайвих запитів", async () => {
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([]);
    expect(await loadStoryChapters("ch", "camp")).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("відкриті глави без нотаток і секретів; зіграність читається лише як id", async () => {
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([{ id: "hero1", content: heroContent }] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "scene1", played: ["s10"] }] as never);

    const chapters = await loadStoryChapters("ch", "camp");

    expect(chapters.map((c) => c.id)).toEqual(["h1", "h2"]);

    const json = JSON.stringify(chapters);

    expect(json).not.toContain("СЕКРЕТ");
    expect(json).not.toContain("НОТАТКА");
    expect(json).toContain("Відкрито");
    expect(vi.mocked(prisma.scenarioPage.findMany).mock.calls[0][0]?.where).toEqual({ campaignId: "camp", characterId: "ch", kind: "hero" });
  });
});
```

Run: `pnpm test:run lib/server/scenario/__tests__/player-story.test.ts` — Expected: FAIL.

- [ ] **Step 2: Реалізація серверу**

`lib/server/scenario/player-story.ts`:

```ts
import "server-only";
import { prisma } from "@/lib/db";
import { readContent } from "@/lib/server/scenario/page-store";
import { openChapters, playedLookup, revealTargets } from "@/lib/utils/scenario/reveal";
import type { StoryChapter } from "@/types/scenario";

export async function loadStoryChapters(characterId: string, campaignId: string): Promise<StoryChapter[]> {
  const pages = await prisma.scenarioPage.findMany({ where: { campaignId, characterId, kind: "hero" }, select: { id: true, content: true }, orderBy: { sortOrder: "asc" } });

  if (!pages.length) return [];

  const contents = pages.map((p) => readContent(p.content));

  const ids = [...new Set(contents.flatMap((c) => revealTargets(c.sections).map((t) => t.pageId)))];

  // only played section ids leave the DB — scene pages are large and the sheet is read often
  const played = ids.length
    ? await prisma.$queryRaw<{ id: string; played: string[] }[]>`
        SELECT id, COALESCE(jsonb_path_query_array(content, '$.sections[*] ? (@.played == true).id'), '[]'::jsonb) AS played
        FROM scenario_pages WHERE "campaignId" = ${campaignId} AND id = ANY(${ids}::text[])`
    : [];

  const lookup = playedLookup(played);

  return contents.flatMap((c) => openChapters(c, lookup));
}
```

- [ ] **Step 3: Лист персонажа**

- `types/characters.ts`: змінити рядок `story` на
  `story: { biography: string | null; goals: CharacterGoal[]; tokens: CharacterToken[]; chapters: StoryChapter[] };` і додати `import type { StoryChapter } from "@/types/scenario";`.
- `lib/utils/characters/sheet/build-sheet.ts`: у `SheetInput` додати `chapters?: StoryChapter[];` (необов'язкове — наявні тести будують `SheetInput` без нього), у `story: { … }` додати `chapters: input.chapters ?? [],`.
- `sheet-handler.ts` (`buildSheetFor`): додати `chapters: await loadStoryChapters(character.id, character.campaignId),` в об'єкт для `buildCharacterSheet` (імпорт з `@/lib/server/scenario/player-story`).
- Усі фікстури, де будується `story` (`grep -rn "biography:" components lib app --include=*.ts --include=*.tsx`), — додати `chapters: []`. Тести, що мокають `prisma` для `buildSheetFor` (`app/api/__tests__/character-sheet-api.test.ts`, `character-sheet-queries.test.ts`), — додати `vi.mock("@/lib/server/scenario/player-story", () => ({ loadStoryChapters: vi.fn(async () => []) }))`.

Run: `pnpm exec tsc --noEmit -p . && pnpm test:run app/api/__tests__/character-sheet-api.test.ts app/api/__tests__/character-sheet-queries.test.ts lib/server/scenario` — Expected: PASS.

- [ ] **Step 4: UI глав — падаючий тест**

Додай у `components/character-profile/__tests__/story-tab.test.tsx` (мок шрифтів уже глобальний — Task 6):

```tsx
it("показує відкриті глави під біографією", () => {
  const sheet = withSheet({ story: { ...sheetFixture.story, chapters: [{ id: "h1", title: "Після собору", rows: [{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Застібка єдинорога" }] }] }] }] } });

  inProfile(sheet);
  expect(screen.getByText("Після собору")).toBeTruthy();
  expect(screen.getByText("Застібка єдинорога")).toBeTruthy();
});

it("без глав — блок не рендериться", () => {
  inProfile(sheetFixture);
  expect(screen.queryByText("Глави історії")).toBeNull();
});
```

(`sheetFixture` — об'єкт `CharacterSheet`; `withSheet(over)` з того ж файлу повертає копію з перевизначеннями — звір його сигнатуру в `__tests__/sheet-fixture.ts`. У `sheetFixture.story` додай `chapters: []`.)

Run: `pnpm test:run components/character-profile/__tests__/story-tab.test.tsx` — Expected: FAIL.

- [ ] **Step 5: Компонент**

`components/character-profile/StoryChapters.tsx`:

```tsx
"use client";

import { HudSection } from "@/components/hud/form";
import { ScenarioBook } from "@/components/scenario/ScenarioBook";
import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import type { StoryChapter } from "@/types/scenario";

export function StoryChapters({ chapters, campaignId }: { chapters: StoryChapter[]; campaignId: string }) {
  if (!chapters.length) return null;

  return (
    <HudSection title="ГЛАВИ ІСТОРІЇ">
      <ScenarioBook variant="inline" theme="dark">
        {chapters.map((c) => (
          <section key={c.id} className="!mt-6 first:!mt-0">
            <h3>{c.title}</h3>
            <div className="story">
              {c.rows.map((doc, i) => (
                <ScenarioRichText key={i} doc={doc} campaignId={campaignId} />
              ))}
            </div>
          </section>
        ))}
      </ScenarioBook>
    </HudSection>
  );
}
```

У `StoryTab.tsx`: `const { sheet, campaignId } = useProfile();` і під `HudSection` біографії додай `<StoryChapters chapters={sheet.story.chapters} campaignId={campaignId} />`. У тестовому рядку «ГЛАВИ ІСТОРІЇ» `HudSection` може рендерити заголовок як є — у тесті шукай текст `Глави історії` без урахування регістру (`screen.queryByText(/глави історії/i)`), виправ обидва тести відповідно.

Run: `pnpm test:run components/character-profile && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/server/scenario/player-story.ts lib/server/scenario/__tests__/player-story.test.ts types/characters.ts lib/utils/characters/sheet/build-sheet.ts app/api/campaigns/\[id\]/characters components/character-profile app/api/__tests__
git commit -m "feat(scenario): revealed biography chapters in the character story tab"
```

---

### Task 8: Індекс «Сценарій», меню й плитка

**Files:**
- Create: `app/campaigns/[id]/dm/scenario/page.tsx`, `app/campaigns/[id]/dm/scenario/page-client.tsx`
- Create: `components/scenario/ScenarioIndex.tsx`, `components/scenario/ScenarioSearch.tsx`, `components/scenario/CreateScenarioPageDialog.tsx`
- Modify: `components/scenario/index.ts`, `components/layout/Header.tsx` (пункт після «Музика»), `app/campaigns/[id]/page.tsx` (`dmTiles` + іконка `ScrollText`)
- Test: `components/scenario/__tests__/scenario-index.test.tsx`

**Interfaces:**
- Consumes: `useScenarioPages`, `useScenarioPageActions`, `useScenarioSearch`, `groupIndex`, `listPages`, `useCharacters(campaignId, { compact: true })` з `@/lib/hooks/characters`.
- Produces: маршрут `/campaigns/[id]/dm/scenario`; `ScenarioIndex({ campaignId, pages, onMove })`, `ScenarioSearch({ campaignId })`, `CreateScenarioPageDialog({ open, onOpenChange, characters, pending, onSubmit })`.

- [ ] **Step 1: Падаючий тест індексу**

`components/scenario/__tests__/scenario-index.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioIndex } from "@/components/scenario";
import type { ScenarioPageSummary } from "@/types/scenario";

afterEach(cleanup);

const page = (over: Partial<ScenarioPageSummary>): ScenarioPageSummary => ({ id: "x", kind: "scene", arc: "Арка перша", title: "x", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 0, updatedAt: "", ...over });

describe("ScenarioIndex", () => {
  it("арки, номери, статуси, герої; стрілки викликають onMove", () => {
    const onMove = vi.fn();

    render(
      <ScenarioIndex
        campaignId="c"
        pages={[page({ id: "a", title: "Монастир Світла", status: "ready", sortOrder: 0 }), page({ id: "b", title: "Викрадення", sortOrder: 1 }), page({ id: "h", kind: "hero", title: "Годрик", status: "ready" })]}
        onMove={onMove}
      />,
    );

    expect(screen.getByText("Арка перша")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Монастир Світла" }).getAttribute("href")).toBe("/campaigns/c/dm/scenario/a");
    expect(screen.getAllByText("Готова")).toHaveLength(2);
    expect(screen.getByText("Годрик")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Вниз: Монастир Світла" }));
    expect(onMove).toHaveBeenCalledWith("a", 1, expect.any(Array));
  });
});
```

Run: `pnpm test:run components/scenario/__tests__/scenario-index.test.tsx` — Expected: FAIL.

- [ ] **Step 2: `ScenarioIndex`**

`components/scenario/ScenarioIndex.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import { PAGE_STATUS_LABELS } from "@/lib/constants/scenario";
import { groupIndex } from "@/lib/utils/scenario/index-groups";
import type { ScenarioPageSummary } from "@/types/scenario";

type Move = (id: string, dir: -1 | 1, siblings: ScenarioPageSummary[]) => void;

function IndexRow({ campaignId, page, num, siblings, onMove }: { campaignId: string; page: ScenarioPageSummary; num: string; siblings: ScenarioPageSummary[]; onMove: Move }) {
  return (
    <li className="sb-index-row">
      <span className="num">{num}</span>
      <span className="t">
        <Link href={`/campaigns/${campaignId}/dm/scenario/${page.id}`}>{page.title}</Link>
        {page.subtitle && <span className="d">{page.subtitle}</span>}
      </span>
      <span className={page.status === "ready" ? "st ok" : "st"}>{PAGE_STATUS_LABELS[page.status]}</span>
      <span className="mv">
        <button type="button" aria-label={`Вгору: ${page.title}`} onClick={() => onMove(page.id, -1, siblings)}>
          <ChevronUp className="size-4" />
        </button>
        <button type="button" aria-label={`Вниз: ${page.title}`} onClick={() => onMove(page.id, 1, siblings)}>
          <ChevronDown className="size-4" />
        </button>
      </span>
    </li>
  );
}

export function ScenarioIndex({ campaignId, pages, onMove }: { campaignId: string; pages: ScenarioPageSummary[]; onMove: Move }) {
  const groups = groupIndex(pages);

  const flat = (list: ScenarioPageSummary[], numbered: boolean, numbers?: number[]) =>
    list.map((p, i) => <IndexRow key={p.id} campaignId={campaignId} page={p} num={numbered && numbers ? String(numbers[i]) : "·"} siblings={list} onMove={onMove} />);

  return (
    <>
      {groups.arcs.length > 0 && <h2>Сцени</h2>}
      {groups.arcs.map((g) => (
        <div key={g.arc}>
          <p className="arc">{g.arc}</p>
          <ol>{flat(g.pages, true, g.pages.map((p) => p.number))}</ol>
        </div>
      ))}
      {groups.heroes.length > 0 && (
        <>
          <h2>Герої</h2>
          <ol>{flat(groups.heroes, false)}</ol>
        </>
      )}
      {groups.notes.length > 0 && (
        <>
          <h2>Нотатки</h2>
          <ol>{flat(groups.notes, false)}</ol>
        </>
      )}
    </>
  );
}
```

Допиши в `scenario-book.css` стилі індексу з артефакту:

```css
.scenario-book .sb-index { max-width: 980px; margin: 0 auto; padding: 56px 24px 96px; }
.scenario-book .sb-index h1 { font-size: clamp(40px, 6vw, 60px); font-weight: 500; line-height: 1.05; margin: 0 0 10px; }
.scenario-book .sb-index .lead { color: var(--ink-soft); font-style: italic; margin: 0 0 24px; max-width: 52ch; }
.scenario-book .sb-index h2 { font-size: 26px; font-weight: 500; margin: 44px 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--ink); }
.scenario-book .sb-index ol { list-style: none; margin: 0; padding: 0; }
.scenario-book .sb-index-row { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto auto; gap: 16px; align-items: baseline; padding: 14px 0; border-bottom: 1px solid var(--rule); }
.scenario-book .sb-index-row .num { font-size: 30px; color: var(--blood); font-weight: 500; line-height: 1; }
.scenario-book .sb-index-row .t { font-size: 21px; }
.scenario-book .sb-index-row .t a { color: inherit; text-decoration-color: var(--blood); text-underline-offset: 4px; }
.scenario-book .sb-index-row .t a:hover { color: var(--blood); }
.scenario-book .sb-index-row .d { display: block; font-family: var(--font-scenario-sans), sans-serif; font-size: 15.5px; color: var(--ink-soft); margin-top: 2px; }
.scenario-book .sb-index-row .st { font-family: var(--font-scenario-sans), sans-serif; font-size: 14px; white-space: nowrap; color: var(--ink-soft); }
.scenario-book .sb-index-row .st.ok { color: var(--gold); font-weight: 700; }
.scenario-book .sb-index-row .mv { display: inline-flex; gap: 2px; color: var(--ink-soft); }
.scenario-book .sb-index-row .mv button { background: none; border: 0; padding: 4px; cursor: pointer; color: inherit; }
.scenario-book .sb-index .arc { font-family: var(--font-scenario-sans), sans-serif; font-size: 14px; color: var(--ink-soft); margin: 22px 0 4px; }
.scenario-book .sb-index .sb-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-family: var(--font-scenario-sans), sans-serif; }
.scenario-book .sb-index .sb-tools input { font: inherit; background: var(--page); color: var(--ink); border: 1px solid var(--rule); border-radius: 4px; padding: 6px 10px; min-width: 0; flex: 1 1 220px; }
.scenario-book .sb-hits { margin: 10px 0 0; padding: 0; list-style: none; font-family: var(--font-scenario-sans), sans-serif; font-size: 15px; }
.scenario-book .sb-hits li { padding: 6px 0; border-bottom: 1px solid var(--rule); }
.scenario-book .sb-hits a { color: var(--ink); text-decoration: none; }
.scenario-book .sb-hits small { display: block; color: var(--ink-soft); }
@media (max-width: 640px) {
  .scenario-book .sb-index-row { grid-template-columns: 40px minmax(0, 1fr) auto; }
  .scenario-book .sb-index-row .st { grid-column: 2; }
  .scenario-book .sb-index { padding-left: 16px; padding-right: 16px; }
}
```

- [ ] **Step 3: Пошук і діалог створення**

`components/scenario/ScenarioSearch.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { useScenarioSearch } from "@/lib/hooks/scenario";

export function ScenarioSearch({ campaignId }: { campaignId: string }) {
  const [query, setQuery] = useState("");

  const { hits, isFetching } = useScenarioSearch(campaignId, query);

  return (
    <div>
      <input type="search" aria-label="Пошук по сценарію" placeholder="Пошук по сценарію…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim().length >= 2 && (
        <ul className="sb-hits">
          {hits.map((h) => (
            <li key={`${h.pageId}-${h.sectionId}`}>
              <Link href={`/campaigns/${campaignId}/dm/scenario/${h.pageId}${h.sectionId ? `#sec-${h.sectionId}` : ""}`}>
                {h.pageTitle}
                <small>{h.snippet}</small>
              </Link>
            </li>
          ))}
          {!isFetching && hits.length === 0 && <li>Нічого не знайдено</li>}
        </ul>
      )}
    </div>
  );
}
```

`components/scenario/CreateScenarioPageDialog.tsx` — `ResponsiveDialog hud` з формою (поля: тип `select` сцена/герой/нотатка, назва, арка (для сцени), персонаж (для героя, зі списку `useCharacters`)). Перед реалізацією подивись API `ResponsiveDialog` у `components/ui/responsive-dialog.tsx` і будь-який наявний діалог створення з формою (наприклад `components/music/AddYoutubeTrackDialog.tsx`) і повтори його структуру (title, footer з кнопкою `form="scenario-create-form"`):

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { PAGE_KIND_LABELS, PAGE_KINDS } from "@/lib/constants/scenario";
import type { CreateScenarioPageData, ScenarioPageKind } from "@/types/scenario";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (data: CreateScenarioPageData) => void;
};

export function CreateScenarioPageDialog({ open, onOpenChange, characters, pending, onSubmit }: Props) {
  const [kind, setKind] = useState<ScenarioPageKind>("scene");

  const [title, setTitle] = useState("");

  const [arc, setArc] = useState("");

  const [characterId, setCharacterId] = useState("");

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Нова сторінка"
      footer={
        <Button type="submit" form="scenario-create-form" disabled={pending || !title.trim()}>
          Створити
        </Button>
      }
    >
      <form
        id="scenario-create-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ kind, title: title.trim(), arc: kind === "scene" ? arc.trim() || null : null, characterId: kind === "hero" ? characterId || null : null });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="scenario-kind">Тип</Label>
          <select id="scenario-kind" className="h-10 w-full rounded-md border bg-transparent px-3" value={kind} onChange={(e) => setKind(e.target.value as ScenarioPageKind)}>
            {PAGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {PAGE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scenario-title">Назва</Label>
          <Input id="scenario-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        {kind === "scene" && (
          <div className="space-y-1.5">
            <Label htmlFor="scenario-arc">Арка</Label>
            <Input id="scenario-arc" value={arc} onChange={(e) => setArc(e.target.value)} placeholder="Арка перша: Ізабель і Годрик" maxLength={120} />
          </div>
        )}
        {kind === "hero" && (
          <div className="space-y-1.5">
            <Label htmlFor="scenario-character">Персонаж</Label>
            <select id="scenario-character" className="h-10 w-full rounded-md border bg-transparent px-3" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">— без прив'язки —</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
```

(Якщо в `components/ui` є `select-field.tsx` з HUD-стилем — використовуй його замість нативного `select`, зберігши ті самі значення.)

Додай експорти в `components/scenario/index.ts`: `CreateScenarioPageDialog`, `ScenarioIndex`, `ScenarioSearch`.

- [ ] **Step 4: Сторінка індексу**

`app/campaigns/[id]/dm/scenario/page.tsx`:

```tsx
import { ScenarioIndexPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { listPages } from "@/lib/server/scenario/page-store";

export default async function DMScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  return <ScenarioIndexPageClient campaignId={id} campaignName={campaign.name} initialPages={await listPages(id)} />;
}
```

`app/campaigns/[id]/dm/scenario/page-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { CreateScenarioPageDialog, ScenarioBook, ScenarioIndex, ScenarioSearch } from "@/components/scenario";
import { Button } from "@/components/ui/button";
import { useCharacters } from "@/lib/hooks/characters";
import { useScenarioPageActions, useScenarioPages } from "@/lib/hooks/scenario";
import type { ScenarioPageSummary } from "@/types/scenario";

export function ScenarioIndexPageClient({ campaignId, campaignName, initialPages }: { campaignId: string; campaignName: string; initialPages: ScenarioPageSummary[] }) {
  const router = useRouter();

  const { data: pages = initialPages } = useScenarioPages(campaignId, initialPages);

  const actions = useScenarioPageActions(campaignId);

  const { data: roster = [] } = useCharacters(campaignId, { compact: true });

  const characters = roster.map((c) => ({ id: c.id, name: c.name }));

  const [creating, setCreating] = useState(false);

  return (
    <ScenarioBook>
      <div className="sb-index">
        <h1>{campaignName}</h1>
        <p className="lead">Книга майстра: сцени для ведення, кожна на окремій сторінці.</p>
        <div className="sb-tools">
          <ScenarioSearch campaignId={campaignId} />
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="size-4" />
            Нова сторінка
          </Button>
        </div>
        {pages.length === 0 ? <EmptyState title="Сценарій порожній" description="Створіть першу сцену або імпортуйте наявні." /> : <ScenarioIndex campaignId={campaignId} pages={pages} onMove={(id, dir, siblings) => void actions.move(id, dir, siblings).catch(() => {})} />}
      </div>
      <CreateScenarioPageDialog
        open={creating}
        onOpenChange={setCreating}
        characters={characters}
        pending={actions.isPending}
        onSubmit={(data) =>
          void actions
            .create(data)
            .then((page) => {
              setCreating(false);
              router.push(`/campaigns/${campaignId}/dm/scenario/${page.id}`);
            })
            .catch(() => {})
        }
      />
    </ScenarioBook>
  );
}
```

(`useCharacters(campaignId, { compact: true })` повертає `CharacterListItem[]`; `EmptyState` приймає `{ title, description?, action?, icon? }`.)

- [ ] **Step 5: Меню й плитка**

`components/layout/Header.tsx` — після пункту «Музика»:

```tsx
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/scenario`}>
                        Сценарій
                      </Link>
                    </DropdownMenuItem>
```

`app/campaigns/[id]/page.tsx` — першим елементом `dmTiles` (сценарій — головний інструмент DM) і `ScrollText` в імпорті з `lucide-react`:

```ts
    { path: "scenario", icon: ScrollText, title: "Сценарій", subtitle: "Сцени, нотатки майстра й біографії героїв" },
```

- [ ] **Step 6: Зелені тести й commit**

Run: `pnpm test:run components/scenario && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

```bash
git add app/campaigns/\[id\]/dm/scenario components/scenario components/layout/Header.tsx app/campaigns/\[id\]/page.tsx
git commit -m "feat(scenario): DM scenario index with search, create and menu entry"
```

---

### Task 9: Сторінка сцени в режимі «Гра»

**Files:**
- Create: `app/campaigns/[id]/dm/scenario/[pageId]/page.tsx`, `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`
- Create: `components/scenario/ScenarioPageView.tsx`, `components/scenario/ScenarioBar.tsx`
- Modify: `components/scenario/index.ts`
- Test: `components/scenario/__tests__/scenario-page-view.test.tsx`

**Interfaces:**
- Consumes: `useScenarioPage`, `useSectionProgress`, `getPage`, `ScenarioBook`, `ScenarioRichText`, `ScenarioLegend`.
- Produces:
  - `ScenarioBar({ title, sections, hideNotes, onToggleNotes, theme, onToggleTheme, actions?: ReactNode })`
  - `ScenarioPageView({ page, campaignId, progress?: { onPlayed(sectionId, played); onRevealed(sectionId, revealed); pending } })`
  - Маршрут `/campaigns/[id]/dm/scenario/[pageId]`; `page-client.tsx` тримає `mode: "play" | "edit"` (редактор підключається в Task 11 через `next/dynamic`).

- [ ] **Step 1: Падаючий тест**

`components/scenario/__tests__/scenario-page-view.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioPageView } from "@/components/scenario";
import type { ScenarioPage } from "@/types/scenario";

afterEach(cleanup);

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const page = (kind: ScenarioPage["kind"]): ScenarioPage => ({
  id: "p1", kind, arc: null, title: "Монастир Світла", subtitle: "Сцена перша", status: "ready", sortOrder: 0, characterId: null, version: 1, updatedAt: "",
  content: { legend: [{ kind: "read", label: "Читати вголос" }], sections: [{ id: "s10", title: "1.0 Собор", played: false, revealedAt: null, rows: [{ id: "r1", story: p("Дзвони"), notes: p("Шрам не пояснюй") }] }] },
});

describe("ScenarioPageView", () => {
  it("заголовок, легенда, розділ з якорем, story і notes", () => {
    const { container } = render(<ScenarioPageView page={page("scene")} campaignId="c" />);

    expect(screen.getByRole("heading", { level: 1, name: "Монастир Світла" })).toBeTruthy();
    expect(screen.getByText("Читати вголос")).toBeTruthy();
    expect(container.querySelector("section#sec-s10 h2")?.textContent).toContain("1.0 Собор");
    expect(container.querySelector(".row .story")?.textContent).toBe("Дзвони");
    expect(container.querySelector(".row aside.notes")?.textContent).toBe("Шрам не пояснюй");
  });

  it("кнопка «Зіграно» на сцені; «Відкрити гравцеві» на героєві", () => {
    const onPlayed = vi.fn();

    const onRevealed = vi.fn();

    const { rerender } = render(<ScenarioPageView page={page("scene")} campaignId="c" progress={{ onPlayed, onRevealed, pending: false }} />);

    fireEvent.click(screen.getByRole("button", { name: /Зіграно/ }));
    expect(onPlayed).toHaveBeenCalledWith("s10", true);

    rerender(<ScenarioPageView page={page("hero")} campaignId="c" progress={{ onPlayed, onRevealed, pending: false }} />);
    fireEvent.click(screen.getByRole("button", { name: /Відкрити гравцеві/ }));
    expect(onRevealed).toHaveBeenCalledWith("s10", true);
  });
});
```

Run: `pnpm test:run components/scenario/__tests__/scenario-page-view.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Компоненти**

`components/scenario/ScenarioBar.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

export function ScenarioBar({ title, sections, hideNotes, onToggleNotes, theme, onToggleTheme, actions }: {
  title: string;
  sections: { id: string; title: string }[];
  hideNotes: boolean;
  onToggleNotes: () => void;
  theme: "light" | "dark" | null;
  onToggleTheme: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="sb-bar">
      <div className="sb-bar-in">
        <strong>{title}</strong>
        <nav aria-label="Розділи">
          {sections.map((s) => (
            <a key={s.id} href={`#sec-${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
        <button type="button" className="toggle" aria-pressed={hideNotes} onClick={onToggleNotes}>
          {hideNotes ? "Показати нотатки" : "Сховати нотатки"}
        </button>
        <button type="button" className="toggle" onClick={onToggleTheme}>
          {theme === "dark" ? "Світла" : "Темна"}
        </button>
        {actions}
      </div>
    </div>
  );
}
```

`components/scenario/ScenarioPageView.tsx`:

```tsx
"use client";

import { ScenarioLegend } from "./ScenarioLegend";
import { ScenarioRichText } from "./ScenarioRichText";

import { isDocEmpty } from "@/lib/utils/scenario/doc";
import type { ScenarioPage } from "@/types/scenario";

type Progress = { onPlayed: (sectionId: string, played: boolean) => void; onRevealed: (sectionId: string, revealed: boolean) => void; pending: boolean };

export function ScenarioPageView({ page, campaignId, progress }: { page: ScenarioPage; campaignId: string; progress?: Progress }) {
  const isHero = page.kind === "hero";

  return (
    <>
      <header className="title">
        <h1>{page.title}</h1>
        {page.subtitle && <p>{page.subtitle}</p>}
        <ScenarioLegend legend={page.content.legend} />
      </header>
      <main>
        {page.content.sections.map((s) => {
          const done = isHero ? !!s.revealedAt : s.played;

          return (
            <section key={s.id} id={`sec-${s.id}`} className={done ? "is-played" : undefined}>
              <h2>
                {s.title}
                {progress && (
                  <button type="button" className="toggle played" aria-pressed={done} disabled={progress.pending} onClick={() => (isHero ? progress.onRevealed(s.id, !done) : progress.onPlayed(s.id, !done))}>
                    {isHero ? (done ? "✓ Відкрито гравцеві" : "Відкрити гравцеві") : done ? "✓ Зіграно" : "Зіграно"}
                  </button>
                )}
              </h2>
              {s.rows.map((r) => (
                <div key={r.id} className="row">
                  <div className="story">
                    <ScenarioRichText doc={r.story} campaignId={campaignId} linkMentions />
                  </div>
                  {isDocEmpty(r.notes) ? (
                    <aside className="notes" />
                  ) : (
                    <aside className="notes">
                      <ScenarioRichText doc={r.notes} campaignId={campaignId} linkMentions />
                    </aside>
                  )}
                </div>
              ))}
            </section>
          );
        })}
      </main>
    </>
  );
}
```

(Для глави героя з `reveal.mode === "afterSection"` кнопка «Відкрити гравцеві» — це ручне відкриття поверх правила; підпис стану «✓ Відкрито гравцеві» показує лише ручне відкриття. Підказка про правило з'являється в редакторі, Task 11.)

Експорти в `components/scenario/index.ts`: `ScenarioBar`, `ScenarioPageView`.

- [ ] **Step 3: Маршрут**

`app/campaigns/[id]/dm/scenario/[pageId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { ScenarioPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { getPage } from "@/lib/server/scenario/page-store";

export default async function DMScenarioPageRoute({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;

  await requireCampaignDM(id);

  const page = await getPage(id, pageId);

  if (!page) notFound();

  return <ScenarioPageClient campaignId={id} initialPage={page} />;
}
```

`app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { ScenarioBar, ScenarioBook, ScenarioPageView } from "@/components/scenario";
import { useScenarioPage, useSectionProgress } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

export function ScenarioPageClient({ campaignId, initialPage }: { campaignId: string; initialPage: ScenarioPage }) {
  const { data: page = initialPage } = useScenarioPage(campaignId, initialPage.id, initialPage);

  const progress = useSectionProgress(campaignId, page.id);

  const [hideNotes, setHideNotes] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  return (
    <ScenarioBook hideNotes={hideNotes} theme={theme}>
      <ScenarioBar
        title={page.title}
        sections={page.content.sections}
        hideNotes={hideNotes}
        onToggleNotes={() => setHideNotes((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        actions={
          <Link className="toggle" href={`/campaigns/${campaignId}/dm/scenario`}>
            До змісту
          </Link>
        }
      />
      <ScenarioPageView
        page={page}
        campaignId={campaignId}
        progress={{ onPlayed: (id, v) => void progress.setPlayed(id, v).catch(() => {}), onRevealed: (id, v) => void progress.setRevealed(id, v).catch(() => {}), pending: progress.isPending }}
      />
    </ScenarioBook>
  );
}
```

- [ ] **Step 4: Зелені тести й commit**

Run: `pnpm test:run components/scenario && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

```bash
git add app/campaigns/\[id\]/dm/scenario components/scenario
git commit -m "feat(scenario): play mode with anchors, hide notes and progress toggles"
```

---

### Task 10: Tiptap — розширення, редактор комірки, тулбар, @-підказки

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `components/scenario/editor/extensions.ts`, `components/scenario/editor/MentionList.tsx`, `components/scenario/editor/mention-suggestion.ts`, `components/scenario/editor/RichTextEditor.tsx`, `components/scenario/editor/ScenarioToolbar.tsx`
- Test: `components/scenario/editor/__tests__/extensions.test.ts`

**Interfaces:**
- Consumes: `CALLOUT_KINDS`, `CALLOUT_LABELS`, `scenarioContentSchema` (для тесту), `MentionOption`.
- Produces:
  - `buildExtensions(searchMentions: (q: string) => Promise<MentionOption[]>): Extensions`
  - `RichTextEditor({ doc, onChange(doc: RichDoc), onReady(editor: Editor | null), searchMentions, label })`
  - `ScenarioToolbar({ editor: Editor | null })`

- [ ] **Step 1: Залежності**

Run: `pnpm add @tiptap/react @tiptap/pm @tiptap/core @tiptap/starter-kit @tiptap/extension-mention @tiptap/suggestion @tiptap/extension-table`
Expected: усі `3.x` однієї версії в `package.json`.

- [ ] **Step 2: Падаючий тест розширень (round-trip через схему)**

`components/scenario/editor/__tests__/extensions.test.ts`:

```ts
// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { buildExtensions } from "@/components/scenario/editor/extensions";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import type { RichDoc } from "@/types/scenario";

let editor: Editor | null = null;

afterEach(() => editor?.destroy());

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "readAloud", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони" }] }] },
    { type: "say", content: [{ type: "text", text: "«Я повернуся»" }] },
    { type: "callout", attrs: { kind: "choice", tag: "Вибір" }, content: [{ type: "paragraph", content: [{ type: "token", attrs: { color: "red" } }, { type: "text", text: "таємне", marks: [{ type: "secret" }] }] }] },
    { type: "paragraph", content: [{ type: "mention", attrs: { type: "unit", id: "u1", label: "Біс" } }] },
  ],
};

describe("scenario tiptap extensions", () => {
  it("документ проходить через редактор без втрат і лишається валідним для схеми", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(async () => []), content: doc });

    const json = editor.getJSON() as RichDoc;

    expect(json.content[0].type).toBe("readAloud");
    expect(json.content[1].type).toBe("say");
    expect(json.content[2]).toMatchObject({ type: "callout", attrs: { kind: "choice", tag: "Вибір" } });
    expect(json.content[2].content?.[0].content?.[1].marks).toEqual([{ type: "secret" }]);
    expect(json.content[3].content?.[0]).toMatchObject({ type: "mention", attrs: { type: "unit", id: "u1", label: "Біс" } });

    const parsed = scenarioContentSchema.safeParse({ legend: [], sections: [{ id: "s", title: "s", played: false, rows: [{ id: "r", story: json, notes: { type: "doc", content: [] } }] }] });

    expect(parsed.success).toBe(true);
  });

  it("команди тулбара створюють дозволені вузли", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(async () => []), content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] } });
    editor.chain().selectAll().toggleWrap("callout", { kind: "event", tag: "Подія" }).run();
    editor.chain().focus("end").insertContent({ type: "token", attrs: { color: "green" } }).run();
    editor.chain().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();

    const parsed = scenarioContentSchema.safeParse({ legend: [], sections: [{ id: "s", title: "s", played: false, rows: [{ id: "r", story: editor.getJSON(), notes: { type: "doc", content: [] } }] }] });

    expect(parsed.success).toBe(true);
  });
});
```

Run: `pnpm test:run components/scenario/editor` — Expected: FAIL.

- [ ] **Step 3: Розширення**

`components/scenario/editor/extensions.ts`:

```ts
import { type Extensions, Mark, mergeAttributes, Node } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

import { mentionSuggestion } from "./mention-suggestion";

import type { MentionOption } from "@/types/scenario";

const Secret = Mark.create({
  name: "secret",
  parseHTML: () => [{ tag: "span.secret" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { class: "secret" }), 0],
});

const ReadAloud = Node.create({
  name: "readAloud",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML: () => [{ tag: "div.read" }],
  renderHTML: () => ["div", { class: "read" }, 0],
});

const Say = Node.create({
  name: "say",
  group: "block",
  content: "inline*",
  parseHTML: () => [{ tag: "p.say" }],
  renderHTML: () => ["p", { class: "say" }, 0],
});

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "(paragraph|bulletList|orderedList)+",
  defining: true,
  addAttributes: () => ({ kind: { default: "event" }, tag: { default: "" } }),
  parseHTML: () => [{ tag: "div.mark" }],
  renderHTML: ({ node }) => ["div", { class: `mark ${node.attrs.kind}` }, ["span", { class: "tag", contenteditable: "false" }, node.attrs.tag || " "], ["div", 0]],
});

const Token = Node.create({
  name: "token",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ color: { default: "green" } }),
  parseHTML: () => [{ tag: "span.g", getAttrs: () => ({ color: "green" }) }, { tag: "span.r", getAttrs: () => ({ color: "red" }) }],
  renderHTML: ({ node }) => ["span", { class: node.attrs.color === "red" ? "r" : "g" }],
});

const ScenarioMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-mention-type"), renderHTML: (attrs: { type?: string | null }) => (attrs.type ? { "data-mention-type": attrs.type } : {}) },
    };
  },
});

export function buildExtensions(searchMentions: (q: string) => Promise<MentionOption[]>): Extensions {
  return [
    StarterKit.configure({ heading: { levels: [3] }, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, underline: false, link: false }),
    TableKit.configure({ table: { resizable: false } }),
    Secret,
    ReadAloud,
    Say,
    Callout,
    Token,
    // default renderHTML keeps data-type/data-id/data-label, so cut/paste inside the editor preserves mentions
    ScenarioMention.configure({ HTMLAttributes: { class: "mention" }, suggestion: mentionSuggestion(searchMentions) }),
  ];
}
```

Якщо `getJSON()` для `mention` повертає додатковий атрибут `mentionSuggestionChar` — він проходить `attrsSchema` (`record<string, unknown>`), тест на `toMatchObject` це допускає. У редакторі згадка виглядає як `@Лейбл` (дефолтний рендер Mention), у «Грі» — як посилання без `@`.

- [ ] **Step 4: @-підказки**

`components/scenario/editor/MentionList.tsx`:

```tsx
"use client";

import { type Ref, useImperativeHandle, useState } from "react";
import type { MentionNodeAttrs } from "@tiptap/extension-mention";

import { MENTION_LABELS } from "@/lib/constants/scenario";
import type { MentionOption } from "@/types/scenario";

export type MentionListHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

export function MentionList({ items, command, ref }: { items: MentionOption[]; command: (attrs: MentionNodeAttrs) => void; ref?: Ref<MentionListHandle> }) {
  const [active, setActive] = useState(0);

  // a new result list can be shorter than the old index — clamp instead of resetting state in an effect
  const index = active < items.length ? active : 0;

  const pick = (item: MentionOption) => command({ id: item.id, label: item.label, type: item.type } as MentionNodeAttrs);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;

      if (event.key === "ArrowDown") return setActive((index + 1) % items.length), true;

      if (event.key === "ArrowUp") return setActive((index - 1 + items.length) % items.length), true;

      if (event.key === "Enter") return pick(items[index]), true;

      return false;
    },
  }));

  return (
    <div className="hud-surface max-h-72 w-72 overflow-y-auto rounded-md border border-[#3a2f20] bg-[#14110d] p-1 text-sm shadow-xl" role="listbox">
      {items.length === 0 && <div className="px-2 py-1.5 text-hud-muted">Нічого не знайдено</div>}
      {items.map((item, i) => (
        <button
          key={`${item.type}-${item.id}`}
          type="button"
          role="option"
          aria-selected={i === index}
          className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left ${i === index ? "bg-white/10" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(item)}
        >
          <span className="truncate">{item.label}</span>
          <span className="shrink-0 text-xs text-hud-muted">{MENTION_LABELS[item.type]}</span>
        </button>
      ))}
    </div>
  );
}
```

`components/scenario/editor/mention-suggestion.ts`:

```ts
import type { MentionNodeAttrs, MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

import { MentionList, type MentionListHandle } from "./MentionList";

import type { MentionOption } from "@/types/scenario";

type Props = SuggestionProps<MentionOption, MentionNodeAttrs>;

// typed as Mention's own option so `command` matches MentionNodeAttrs (our extra `type` attr rides along)
export function mentionSuggestion(search: (q: string) => Promise<MentionOption[]>): MentionOptions["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => search(query),
    render: () => {
      let renderer: ReactRenderer<MentionListHandle, Props> | null = null;

      const place = (props: Props) => {
        const rect = props.clientRect?.();

        const el = renderer?.element as HTMLElement | undefined;

        if (!rect || !el) return;

        Object.assign(el.style, { position: "fixed", left: `${Math.min(rect.left, window.innerWidth - 300)}px`, top: `${rect.bottom + 6}px`, zIndex: "60" });
      };

      const close = () => {
        renderer?.element.remove();
        renderer?.destroy();
        renderer = null;
      };

      return {
        onStart: (props) => {
          renderer = new ReactRenderer(MentionList, { props, editor: props.editor });
          document.body.appendChild(renderer.element);
          place(props);
        },
        onUpdate: (props) => {
          renderer?.updateProps(props);
          place(props);
        },
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === "Escape") {
            close();

            return true;
          }

          return renderer?.ref?.onKeyDown(event) ?? false;
        },
        onExit: close,
      };
    },
  };
}
```

Після `pnpm add` звір з встановленими типами: `node_modules/@tiptap/extension-mention/dist/index.d.ts` (`MentionOptions["suggestion"]`, `MentionNodeAttrs`) і `node_modules/@tiptap/react/dist/index.d.ts` (`ReactRenderer`). Якщо `ReactRenderer` не передає `ref` функціональному компоненту без `forwardRef` (React 19 ref-as-prop), обгорни `MentionList` у `forwardRef` — інакше ↑/↓/Enter у підказці не працюватимуть. Перевір вручну в браузері (Task 13).

- [ ] **Step 5: Редактор комірки й тулбар**

`components/scenario/editor/RichTextEditor.tsx`:

```tsx
"use client";

import { useEffect, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";

import { buildExtensions } from "./extensions";

import type { MentionOption, RichDoc } from "@/types/scenario";

export function RichTextEditor({ doc, onChange, onReady, searchMentions, label }: {
  doc: RichDoc;
  onChange: (doc: RichDoc) => void;
  onReady: (editor: Editor | null) => void;
  searchMentions: (q: string) => Promise<MentionOption[]>;
  label: string;
}) {
  const extensions = useMemo(() => buildExtensions(searchMentions), [searchMentions]);

  const editor = useEditor({
    extensions,
    content: doc,
    immediatelyRender: false,
    autofocus: "end",
    editorProps: { attributes: { "aria-label": label, class: "sb-editor" } },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichDoc),
  });

  useEffect(() => {
    if (!editor) return;

    onReady(editor);

    // the toolbar must not keep a destroyed instance while the next cell mounts
    return () => onReady(null);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}
```

`components/scenario/editor/ScenarioToolbar.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { AtSign, Bold, Heading3, Italic, List, Megaphone, MessageSquareQuote, Redo2, Table, Undo2, VenetianMask } from "lucide-react";

import { CALLOUT_KINDS, CALLOUT_LABELS } from "@/lib/constants/scenario";
import type { CalloutKind } from "@/types/scenario";

function Tool({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="toggle" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function ScenarioToolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        secret: e.isActive("secret"),
        h3: e.isActive("heading", { level: 3 }),
        list: e.isActive("bulletList"),
        read: e.isActive("readAloud"),
        say: e.isActive("say"),
        callout: e.isActive("callout"),
        calloutKind: (e.getAttributes("callout").kind as CalloutKind | undefined) ?? "event",
        calloutTag: String(e.getAttributes("callout").tag ?? ""),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      },
  });

  const run = (fn: (e: Editor) => void) => editor && fn(editor);

  const off = !editor || !state;

  return (
    <div className="sb-toolbar" role="toolbar" aria-label="Форматування">
      <Tool label="Жирний" active={state?.bold} disabled={off} onClick={() => run((e) => e.chain().focus().toggleBold().run())}><Bold className="size-4" /></Tool>
      <Tool label="Курсив" active={state?.italic} disabled={off} onClick={() => run((e) => e.chain().focus().toggleItalic().run())}><Italic className="size-4" /></Tool>
      <Tool label="Підзаголовок" active={state?.h3} disabled={off} onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}><Heading3 className="size-4" /></Tool>
      <Tool label="Список" active={state?.list} disabled={off} onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}><List className="size-4" /></Tool>
      <Tool label="Читати вголос" active={state?.read} disabled={off} onClick={() => run((e) => e.chain().focus().toggleWrap("readAloud").run())}><Megaphone className="size-4" /></Tool>
      <Tool label="Репліка" active={state?.say} disabled={off} onClick={() => run((e) => (e.isActive("say") ? e.chain().focus().setParagraph().run() : e.chain().focus().setNode("say").run()))}><MessageSquareQuote className="size-4" /></Tool>
      <select
        aria-label="Маркер"
        disabled={off}
        value={state?.callout ? state.calloutKind : ""}
        onChange={(ev) =>
          run((e) => {
            const kind = ev.target.value as CalloutKind | "";

            if (!kind) return void e.chain().focus().lift("callout").run();

            if (e.isActive("callout")) return void e.chain().focus().updateAttributes("callout", { kind }).run();

            e.chain().focus().toggleWrap("callout", { kind, tag: CALLOUT_LABELS[kind] }).run();
          })
        }
      >
        <option value="">Маркер…</option>
        {CALLOUT_KINDS.map((k) => (
          <option key={k} value={k}>
            {CALLOUT_LABELS[k]}
          </option>
        ))}
      </select>
      {state?.callout && (
        <input aria-label="Заголовок маркера" value={state.calloutTag} maxLength={120} onChange={(ev) => run((e) => e.chain().updateAttributes("callout", { tag: ev.target.value }).run())} />
      )}
      <Tool label="Зелений жетон" disabled={off} onClick={() => run((e) => e.chain().focus().insertContent({ type: "token", attrs: { color: "green" } }).run())}><span className="g" /></Tool>
      <Tool label="Червоний жетон" disabled={off} onClick={() => run((e) => e.chain().focus().insertContent({ type: "token", attrs: { color: "red" } }).run())}><span className="r" /></Tool>
      <Tool label="Секрет (не бачить гравець)" active={state?.secret} disabled={off} onClick={() => run((e) => e.chain().focus().toggleMark("secret").run())}><VenetianMask className="size-4" /></Tool>
      <Tool label="Таблиця" disabled={off} onClick={() => run((e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: false }).run())}><Table className="size-4" /></Tool>
      <Tool label="Посилання на сутність (@)" disabled={off} onClick={() => run((e) => e.chain().focus().insertContent("@").run())}><AtSign className="size-4" /></Tool>
      <Tool label="Скасувати" disabled={off || !state?.canUndo} onClick={() => run((e) => e.chain().focus().undo().run())}><Undo2 className="size-4" /></Tool>
      <Tool label="Повторити" disabled={off || !state?.canRedo} onClick={() => run((e) => e.chain().focus().redo().run())}><Redo2 className="size-4" /></Tool>
    </div>
  );
}
```

Допиши стилі тулбара/редактора в `scenario-book.css`:

```css
.scenario-book .sb-toolbar { position: sticky; top: 49px; z-index: 4; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 24px; background: var(--page); border-bottom: 1px solid var(--rule); font-family: var(--font-scenario-sans), sans-serif; font-size: 14px; }
.scenario-book .sb-toolbar .toggle { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; }
.scenario-book .sb-toolbar select, .scenario-book .sb-toolbar input { font: inherit; background: var(--page); color: var(--ink); border: 1px solid var(--rule); border-radius: 4px; padding: 6px 8px; min-height: 36px; }
.scenario-book .sb-editor { outline: none; min-height: 3em; }
.scenario-book .sb-editor .mark .tag { user-select: none; }
.scenario-book .sb-cell { cursor: text; border-radius: 3px; outline: 1px dashed transparent; outline-offset: 6px; }
.scenario-book .sb-cell:hover { outline-color: var(--rule); }
.scenario-book .sb-cell.is-active { outline: 2px solid var(--night); }
.scenario-book .sb-empty { color: var(--ink-soft); font-style: italic; font-size: 15px; }
@media (max-width: 860px) { .scenario-book .sb-toolbar { padding: 8px 16px; top: 0; overflow-x: auto; flex-wrap: nowrap; } }
```

- [ ] **Step 6: Зелені тести й commit**

Run: `pnpm test:run components/scenario/editor && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

```bash
git add package.json pnpm-lock.yaml components/scenario
git commit -m "feat(scenario): tiptap extensions, cell editor, toolbar and @-mentions"
```

---

### Task 11: Режим «Редагування» — структура, автозбереження, властивості, версії

**Files:**
- Create: `components/scenario/editor/ScenarioEditor.tsx`, `components/scenario/editor/SectionHeaderEditor.tsx`, `components/scenario/editor/RevealSettings.tsx`, `components/scenario/editor/SaveStatus.tsx`, `components/scenario/editor/PagePropertiesDialog.tsx`, `components/scenario/editor/VersionsDialog.tsx`, `components/scenario/editor/index.ts`
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx` (перемикач режимів, `next/dynamic`)
- Test: `components/scenario/editor/__tests__/scenario-editor.test.tsx`

**Interfaces:**
- Consumes: `useScenarioDraft`, `useMentionSearch`, `useScenarioPages`, `useScenarioPage`, `useScenarioPageActions`, `useScenarioVersions`, `useConfirm`; структурні функції з Task 1; `RichTextEditor`, `ScenarioToolbar` (Task 10); `ScenarioRichText` (Task 6).
- Produces: `ScenarioEditor({ campaignId, page, onExit, toolbarActions? })` — default export для `next/dynamic` у `components/scenario/editor/index.ts`; «Готово» спершу чекає `draft.flush()`, потім `onExit()`; `PagePropertiesDialog`, `VersionsDialog`.

- [ ] **Step 1: Падаючий тест редактора структури**

`components/scenario/editor/__tests__/scenario-editor.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const draft = vi.hoisted(() => ({ setContent: vi.fn(), flush: vi.fn(async () => {}), reload: vi.fn() }));

vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioDraft: (_c: string, page: { content: unknown }) => ({ content: page.content, state: "saved", ...draft }),
  useMentionSearch: () => async () => [],
  useScenarioPages: () => ({ data: [] }),
  useScenarioPage: () => ({ data: undefined }),
  useScenarioPageActions: () => ({ updateMeta: vi.fn(), isPending: false }),
  useScenarioVersions: () => ({ versions: [], isLoading: false, restore: vi.fn(), isRestoring: false }),
}));
vi.mock("@/components/scenario/editor/RichTextEditor", () => ({ RichTextEditor: ({ label }: { label: string }) => <div data-testid="tiptap">{label}</div> }));

import ScenarioEditor from "@/components/scenario/editor";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { ScenarioContent, ScenarioPage } from "@/types/scenario";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const page = (kind: ScenarioPage["kind"] = "scene"): ScenarioPage => ({
  id: "p1", kind, arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "",
  content: { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: p("Дзвони"), notes: p("") }] }] },
});

const apply = () => {
  const fn = draft.setContent.mock.calls.at(-1)?.[0] as (c: ScenarioContent) => ScenarioContent;

  return fn(page().content);
};

describe("ScenarioEditor", () => {
  it("комірка відкриває Tiptap лише по кліку; одночасно один редактор", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} />);

    expect(screen.queryByTestId("tiptap")).toBeNull();
    fireEvent.click(screen.getByText("Дзвони"));
    expect(screen.getAllByTestId("tiptap")).toHaveLength(1);
  });

  it("назва розділу, новий рядок, новий розділ — через setContent", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Назва розділу"), { target: { value: "1.0 Собор" } });
    expect(apply().sections[0].title).toBe("1.0 Собор");

    fireEvent.click(screen.getByRole("button", { name: "Додати рядок" }));
    expect(apply().sections[0].rows).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Додати розділ" }));
    expect(apply().sections).toHaveLength(2);
  });

  it("видалення розділу питає підтвердження", async () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити розділ: Собор" }));
    expect(await screen.findByText(/Видалити розділ «Собор»/)).toBeTruthy();
    expect(draft.setContent).not.toHaveBeenCalled();
  });

  it("на героєві є налаштування відкриття глави", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page("hero")} onExit={vi.fn()} />);
    expect(screen.getByLabelText("Коли відкрити гравцеві")).toBeTruthy();
  });
});
```

Run: `pnpm test:run components/scenario/editor/__tests__/scenario-editor.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Статус збереження, налаштування відкриття, заголовок розділу**

`components/scenario/editor/SaveStatus.tsx`:

```tsx
"use client";

import type { DraftState } from "@/lib/hooks/scenario";

const TEXT: Record<DraftState, string> = { saved: "Збережено", dirty: "Є зміни…", saving: "Збереження…", error: "Не збережено", conflict: "Конфлікт версій" };

export function SaveStatus({ state, onRetry, onReload }: { state: DraftState; onRetry: () => void; onReload: () => void }) {
  return (
    <span className="sans" role="status" aria-live="polite" style={{ color: state === "error" || state === "conflict" ? "var(--blood)" : "var(--ink-soft)" }}>
      {TEXT[state]}
      {state === "error" && (
        <button type="button" className="toggle" style={{ marginLeft: 8 }} onClick={onRetry}>
          Повторити
        </button>
      )}
      {state === "conflict" && (
        <button type="button" className="toggle" style={{ marginLeft: 8 }} onClick={onReload}>
          Перезавантажити
        </button>
      )}
    </span>
  );
}
```

`components/scenario/editor/RevealSettings.tsx`:

```tsx
"use client";

import { useScenarioPage, useScenarioPages } from "@/lib/hooks/scenario";
import type { RevealRule } from "@/types/scenario";

export function RevealSettings({ campaignId, rule, revealed, onChange, onToggleRevealed }: { campaignId: string; rule: RevealRule | undefined; revealed: boolean; onChange: (rule: RevealRule) => void; onToggleRevealed: () => void }) {
  const { data: pages = [] } = useScenarioPages(campaignId);

  const target = rule?.mode === "afterSection" ? rule : null;

  const { data: targetPage } = useScenarioPage(campaignId, target?.pageId ?? null);

  const scenes = pages.filter((p) => p.kind === "scene");

  return (
    <div className="sans" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14, margin: "8px 0" }}>
      <select aria-label="Коли відкрити гравцеві" value={target ? "afterSection" : "manual"} onChange={(e) => onChange(e.target.value === "manual" ? { mode: "manual" } : { mode: "afterSection", pageId: scenes[0]?.id ?? "", sectionId: "" })}>
        <option value="manual">Вручну</option>
        <option value="afterSection" disabled={!scenes.length}>
          Після зіграного розділу
        </option>
      </select>
      {target && (
        <>
          <select aria-label="Сцена" value={target.pageId} onChange={(e) => onChange({ mode: "afterSection", pageId: e.target.value, sectionId: "" })}>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select aria-label="Розділ сцени" value={target.sectionId} onChange={(e) => onChange({ ...target, sectionId: e.target.value })}>
            <option value="">— оберіть розділ —</option>
            {targetPage?.content.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="button" className="toggle" aria-pressed={revealed} onClick={onToggleRevealed}>
        {revealed ? "✓ Відкрито гравцеві" : "Відкрити гравцеві зараз"}
      </button>
    </div>
  );
}
```

Правило `afterSection` з порожнім `sectionId` не відкриває главу (`playedLookup` не знайде `""`), тож напівзаповнений вибір безпечний; схема Task 1 вимагає `sectionId.min(1)` — тому при `sectionId === ""` зберігаємо `{ mode: "manual" }` замість правила. Зроби це в `ScenarioEditor` при `onChange` (Step 3).

`components/scenario/editor/SectionHeaderEditor.tsx`:

```tsx
"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import type { ScenarioSection } from "@/types/scenario";

export function SectionHeaderEditor({ section, actions }: { section: ScenarioSection; actions: { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void } }) {
  return (
    <h2>
      <input aria-label="Назва розділу" value={section.title} maxLength={200} onChange={(e) => actions.onTitle(e.target.value)} style={{ font: "inherit", background: "transparent", color: "inherit", border: 0, flex: 1, minWidth: 0 }} />
      <button type="button" className="toggle" aria-label={`Розділ вгору: ${section.title}`} onClick={() => actions.onMove(-1)}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className="toggle" aria-label={`Розділ вниз: ${section.title}`} onClick={() => actions.onMove(1)}>
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className="toggle" aria-label={`Видалити розділ: ${section.title}`} onClick={actions.onRemove}>
        <Trash2 className="size-4" />
      </button>
    </h2>
  );
}
```

- [ ] **Step 3: `ScenarioEditor`**

`components/scenario/editor/ScenarioEditor.tsx`:

```tsx
"use client";

import { type ReactNode, useCallback, useState } from "react";
import type { Editor } from "@tiptap/core";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { RevealSettings } from "./RevealSettings";
import { RichTextEditor } from "./RichTextEditor";
import { SaveStatus } from "./SaveStatus";
import { ScenarioToolbar } from "./ScenarioToolbar";
import { SectionHeaderEditor } from "./SectionHeaderEditor";

import { ScenarioLegend } from "@/components/scenario/ScenarioLegend";
import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { useConfirm } from "@/lib/hooks/common";
import { useMentionSearch, useScenarioDraft } from "@/lib/hooks/scenario";
import { isDocEmpty } from "@/lib/utils/scenario/doc";
import { addRow, addSection, moveRow, moveSection, removeRow, removeSection, updateRow, updateSection } from "@/lib/utils/scenario/structure";
import type { RevealRule, RichDoc, ScenarioPage } from "@/types/scenario";

type Cell = { rowId: string; column: "story" | "notes" } | null;

export function ScenarioEditor({ campaignId, page, onExit, toolbarActions }: { campaignId: string; page: ScenarioPage; onExit: () => void; toolbarActions?: ReactNode }) {
  const draft = useScenarioDraft(campaignId, page);

  const searchMentions = useMentionSearch(campaignId);

  const confirm = useConfirm();

  const [active, setActive] = useState<Cell>(null);

  const [editor, setEditor] = useState<Editor | null>(null);

  const isHero = page.kind === "hero";

  const onReady = useCallback((e: Editor | null) => setEditor(e), []);

  const removeWithConfirm = async (title: string, apply: () => void) => {
    if (await confirm({ title: `Видалити ${title}?`, description: "Зміну можна відкотити через «Версії».", confirmLabel: "Видалити" })) apply();
  };

  const setReveal = (sectionId: string, rule: RevealRule) =>
    draft.setContent((c) => updateSection(c, sectionId, { reveal: rule.mode === "afterSection" && !rule.sectionId ? { mode: "manual" } : rule }));

  const cell = (sectionId: string, rowId: string, column: "story" | "notes", doc: RichDoc) => {
    const isActive = active?.rowId === rowId && active.column === column;

    if (isActive) {
      return (
        <div className="sb-cell is-active">
          <RichTextEditor key={`${rowId}-${column}`} doc={doc} label={column === "story" ? "Сюжет" : "Нотатки майстра"} searchMentions={searchMentions} onReady={onReady} onChange={(next) => draft.setContent((c) => updateRow(c, sectionId, rowId, { [column]: next }))} />
        </div>
      );
    }

    return (
      <div className="sb-cell" role="button" tabIndex={0} onClick={() => setActive({ rowId, column })} onKeyDown={(e) => e.key === "Enter" && setActive({ rowId, column })}>
        {isDocEmpty(doc) ? <p className="sb-empty">{column === "story" ? "Сюжет — натисніть, щоб писати" : "Нотатки майстра"}</p> : <ScenarioRichText doc={doc} campaignId={campaignId} />}
      </div>
    );
  };

  return (
    <>
      <div className="sb-toolbar-wrap">
        <ScenarioToolbar editor={active ? editor : null} />
        <div className="sb-toolbar" style={{ borderTop: 0 }}>
          <SaveStatus state={draft.state} onRetry={() => void draft.flush()} onReload={() => void draft.reload()} />
          <button
            type="button"
            className="toggle"
            onClick={async () => {
              await draft.flush();
              onExit();
            }}
          >
            Готово
          </button>
          {toolbarActions}
        </div>
      </div>
      <header className="title">
        <h1>{page.title}</h1>
        {page.subtitle && <p>{page.subtitle}</p>}
        <ScenarioLegend legend={draft.content.legend} />
      </header>
      <main>
        {draft.content.sections.map((s) => (
          <section key={s.id} id={`sec-${s.id}`}>
            <SectionHeaderEditor
              section={s}
              actions={{
                onTitle: (title) => draft.setContent((c) => updateSection(c, s.id, { title })),
                onMove: (dir) => draft.setContent((c) => moveSection(c, s.id, dir)),
                onRemove: () => void removeWithConfirm(`розділ «${s.title}»`, () => draft.setContent((c) => removeSection(c, s.id))),
              }}
            />
            {isHero && (
              <RevealSettings
                campaignId={campaignId}
                rule={s.reveal}
                revealed={!!s.revealedAt}
                onChange={(rule) => setReveal(s.id, rule)}
                onToggleRevealed={() => draft.setContent((c) => updateSection(c, s.id, { revealedAt: s.revealedAt ? null : new Date().toISOString() }))}
              />
            )}
            {s.rows.map((r) => (
              <div key={r.id} className="row">
                <div className="story">{cell(s.id, r.id, "story", r.story)}</div>
                <aside className="notes" style={{ display: "block" }}>
                  {cell(s.id, r.id, "notes", r.notes)}
                  <div className="sans" style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
                    <button type="button" className="toggle" aria-label="Рядок вгору" onClick={() => draft.setContent((c) => moveRow(c, s.id, r.id, -1))}><ArrowUp className="size-4" /></button>
                    <button type="button" className="toggle" aria-label="Рядок вниз" onClick={() => draft.setContent((c) => moveRow(c, s.id, r.id, 1))}><ArrowDown className="size-4" /></button>
                    <button type="button" className="toggle" aria-label="Видалити рядок" onClick={() => void removeWithConfirm("рядок", () => draft.setContent((c) => removeRow(c, s.id, r.id)))}><Trash2 className="size-4" /></button>
                  </div>
                </aside>
              </div>
            ))}
            <button type="button" className="toggle sans" style={{ marginTop: 12 }} onClick={() => draft.setContent((c) => addRow(c, s.id))}>
              Додати рядок
            </button>
          </section>
        ))}
        <button type="button" className="toggle sans" style={{ marginTop: 40 }} onClick={() => draft.setContent((c) => addSection(c, isHero ? "Нова глава" : "Новий розділ"))}>
          Додати розділ
        </button>
      </main>
    </>
  );
}
```

Тест передбачає підпис кнопки підтвердження з текстом «Видалити розділ «Собор»» — `confirm({ title: "Видалити розділ «Собор»?" … })` дає саме його. Звір ключі опцій `confirm` з `lib/hooks/common/confirm-context.ts` (`title`, `description`, `confirmLabel`) і використай наявні.

Стиль обгортки тулбара (додати в CSS):

```css
.scenario-book .sb-toolbar-wrap { position: sticky; top: 0; z-index: 6; }
.scenario-book .sb-toolbar-wrap .sb-toolbar { position: static; }
```

- [ ] **Step 4: Властивості сторінки й версії**

Легенда — частина `content`, тому властивості редагуються лише в режимі «Редагування»: діалог живе всередині `ScenarioEditor`, метадані йдуть через `updateMeta`, легенда — через `draft.setContent`. Діалог монтується тільки відкритим (тест редактора не мокає `useCharacters`).

`components/scenario/editor/PagePropertiesDialog.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { LEGEND_KINDS, LEGEND_LABELS, PAGE_STATUS_LABELS, PAGE_STATUSES } from "@/lib/constants/scenario";
import { useRouter } from "next/navigation";

import { useCharacters } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { useScenarioPageActions } from "@/lib/hooks/scenario";
import type { LegendEntry, LegendKind, ScenarioPage, ScenarioPageStatus } from "@/types/scenario";

const SELECT = "h-10 w-full rounded-md border bg-transparent px-3";

export function PagePropertiesDialog({ campaignId, page, legend, onLegend, onClose }: { campaignId: string; page: ScenarioPage; legend: LegendEntry[]; onLegend: (legend: LegendEntry[]) => void; onClose: () => void }) {
  const actions = useScenarioPageActions(campaignId);

  const { data: roster = [] } = useCharacters(campaignId, { compact: true });

  const [form, setForm] = useState({ title: page.title, subtitle: page.subtitle ?? "", arc: page.arc ?? "", status: page.status, characterId: page.characterId ?? "" });

  const [items, setItems] = useState<LegendEntry[]>(legend);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const router = useRouter();

  const confirm = useConfirm();

  const removePage = async () => {
    if (!(await confirm({ title: `Видалити сторінку «${page.title}»?`, description: "Сторінку і всі її версії буде видалено назавжди.", confirmLabel: "Видалити" }))) return;

    await actions
      .remove(page.id)
      .then(() => router.push(`/campaigns/${campaignId}/dm/scenario`))
      .catch(() => {});
  };

  const submit = async () => {
    await actions
      .updateMeta(page.id, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        status: form.status,
        ...(page.kind === "scene" && { arc: form.arc.trim() || null }),
        ...(page.kind === "hero" && { characterId: form.characterId || null }),
      })
      .then(() => {
        onLegend(items.filter((i) => i.label.trim()));
        onClose();
      })
      .catch(() => {});
  };

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(o) => !o && onClose()}
      title="Властивості сторінки"
      footer={
        <>
          <Button type="button" variant="destructive" disabled={actions.isPending} onClick={() => void removePage()}>
            Видалити сторінку
          </Button>
          <Button type="submit" form="scenario-props-form" disabled={actions.isPending || !form.title.trim()}>
            Зберегти
          </Button>
        </>
      }
    >
      <form
        id="scenario-props-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="sp-title">Назва</Label>
          <Input id="sp-title" value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-subtitle">Підзаголовок</Label>
          <Input id="sp-subtitle" value={form.subtitle} maxLength={500} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        {page.kind === "scene" && (
          <div className="space-y-1.5">
            <Label htmlFor="sp-arc">Арка</Label>
            <Input id="sp-arc" value={form.arc} maxLength={120} onChange={(e) => set("arc", e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="sp-status">Статус</Label>
          <select id="sp-status" className={SELECT} value={form.status} onChange={(e) => set("status", e.target.value as ScenarioPageStatus)}>
            {PAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAGE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {page.kind === "hero" && (
          <div className="space-y-1.5">
            <Label htmlFor="sp-character">Персонаж</Label>
            <select id="sp-character" className={SELECT} value={form.characterId} onChange={(e) => set("characterId", e.target.value)}>
              <option value="">— без прив'язки —</option>
              {roster.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Легенда</Label>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <select aria-label="Колір позначки" className={`${SELECT} w-40`} value={item.kind} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, kind: e.target.value as LegendKind } : x)))}>
                {LEGEND_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LEGEND_LABELS[k]}
                  </option>
                ))}
              </select>
              <Input aria-label="Підпис позначки" value={item.label} maxLength={80} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Button type="button" variant="outline" onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                Прибрати
              </Button>
            </div>
          ))}
          {items.length < 12 && (
            <Button type="button" variant="outline" onClick={() => setItems((l) => [...l, { kind: "read", label: LEGEND_LABELS.read }])}>
              Додати позначку
            </Button>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
```

Підключення в `ScenarioEditor` (доповни код зі Step 3):
- стан `const [propsOpen, setPropsOpen] = useState(false);`
- у другому рядку тулбара після `SaveStatus` додай `<button type="button" className="toggle" onClick={() => setPropsOpen(true)}>Властивості</button>` перед `{toolbarActions}`;
- в кінці фрагмента: `{propsOpen && <PagePropertiesDialog campaignId={campaignId} page={page} legend={draft.content.legend} onLegend={(legend) => draft.setContent((c) => ({ ...c, legend }))} onClose={() => setPropsOpen(false)} />}`;
- заголовок `h1`/підзаголовок у редакторі беруться з кешу сторінки, щоб нова назва з'явилась одразу: `const { data: live = page } = useScenarioPage(campaignId, page.id);` і рендер `live.title` / `live.subtitle` (тест мокає `useScenarioPage` → `data: undefined`, тож береться `page`).

`components/scenario/editor/VersionsDialog.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useConfirm } from "@/lib/hooks/common";
import { useScenarioVersions } from "@/lib/hooks/scenario";

const fmt = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" });

export function VersionsDialog({ campaignId, pageId, open, onOpenChange, onRestored }: { campaignId: string; pageId: string; open: boolean; onOpenChange: (o: boolean) => void; onRestored: () => void }) {
  const { versions, isLoading, restore, isRestoring } = useScenarioVersions(campaignId, pageId, open);

  const confirm = useConfirm();

  const pick = async (id: string, at: string) => {
    if (!(await confirm({ title: `Відновити версію від ${fmt.format(new Date(at))}?`, description: "Поточний стан збережеться як окрема версія.", confirmLabel: "Відновити" }))) return;

    await restore(id).catch(() => {});
    onRestored();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title="Версії сторінки">
      {isLoading && <p className="text-sm text-hud-muted">Завантаження…</p>}
      {!isLoading && versions.length === 0 && <p className="text-sm text-hud-muted">Версій ще немає — вони з'являються не частіше ніж раз на 10 хвилин редагування.</p>}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3">
            <span>{fmt.format(new Date(v.createdAt))}</span>
            <Button size="sm" variant="outline" disabled={isRestoring} onClick={() => void pick(v.id, v.createdAt)}>
              Відновити
            </Button>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  );
}
```

`components/scenario/editor/index.ts`:

```ts
import { ScenarioEditor } from "./ScenarioEditor";

export { PagePropertiesDialog } from "./PagePropertiesDialog";
export { VersionsDialog } from "./VersionsDialog";
export default ScenarioEditor;
```

- [ ] **Step 5: Перемикач режимів на сторінці**

Редактор отримує знімок сторінки на момент входу в режим (`editBase`), а не живий кеш: інакше кожне автозбереження оновлювало б проп. Вихід у «Гру» розмонтовує редактор, і cleanup `useScenarioDraft` викликає `flush`.

Заміни `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { LoadingState } from "@/components/common/states";
import { ScenarioBar, ScenarioBook, ScenarioPageView } from "@/components/scenario";
import { VersionsDialog } from "@/components/scenario/editor/VersionsDialog";
import { useScenarioPage, useSectionProgress } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

const ScenarioEditor = dynamic(() => import("@/components/scenario/editor"), { ssr: false, loading: () => <LoadingState /> });

export function ScenarioPageClient({ campaignId, initialPage }: { campaignId: string; initialPage: ScenarioPage }) {
  const { data: page = initialPage } = useScenarioPage(campaignId, initialPage.id, initialPage);

  const progress = useSectionProgress(campaignId, page.id);

  const [hideNotes, setHideNotes] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  const [editBase, setEditBase] = useState<ScenarioPage | null>(null);

  const [versionsOpen, setVersionsOpen] = useState(false);

  // edit mode leaves through the editor's own «Готово», which awaits the last save first
  const actions = (
    <>
      {!editBase && (
        <>
          <button type="button" className="toggle" onClick={() => setEditBase(page)}>
            Редагувати
          </button>
          <button type="button" className="toggle" onClick={() => setVersionsOpen(true)}>
            Версії
          </button>
        </>
      )}
      <Link className="toggle" href={`/campaigns/${campaignId}/dm/scenario`}>
        До змісту
      </Link>
    </>
  );

  return (
    <ScenarioBook hideNotes={hideNotes && !editBase} theme={theme}>
      <ScenarioBar
        title={page.title}
        sections={page.content.sections}
        hideNotes={hideNotes}
        onToggleNotes={() => setHideNotes((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        actions={actions}
      />
      {editBase ? (
        <ScenarioEditor campaignId={campaignId} page={editBase} onExit={() => setEditBase(null)} />
      ) : (
        <ScenarioPageView
          page={page}
          campaignId={campaignId}
          progress={{ onPlayed: (id, v) => void progress.setPlayed(id, v).catch(() => {}), onRevealed: (id, v) => void progress.setRevealed(id, v).catch(() => {}), pending: progress.isPending }}
        />
      )}
      {versionsOpen && !editBase && <VersionsDialog campaignId={campaignId} pageId={page.id} open onOpenChange={setVersionsOpen} onRestored={() => {}} />}
    </ScenarioBook>
  );
}
```

«Версії» доступні лише в «Грі», тож відкат не перетинається з автозбереженням; «Гра» показує відновлений вміст із кешу (`useScenarioVersions.restore` кладе його туди). Вхід у редагування бере свіжу `page` з кешу, тож версія для `expectedVersion` актуальна. У режимі редагування `ScenarioBar` лишається зверху, тулбар редактора липне під ним; якщо вони перекриваються, зміни `top` у `.sb-toolbar-wrap` на висоту `.sb-bar` (49px).

Run: `pnpm test:run components/scenario && pnpm lint --fix && pnpm exec tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/scenario app/campaigns/\[id\]/dm/scenario
git commit -m "feat(scenario): edit mode with structure editor, autosave status, properties and versions"
```

---

### Task 12: Імпорт артефактів

**Files:**
- Modify: `package.json` (`node-html-parser` у devDependencies; скрипт `"import-scenario": "tsx --tsconfig tsconfig.scripts.json scripts/import/scenario/import-scenario.ts"`), `pnpm-lock.yaml`, `.gitignore` (`.scenario-import/`)
- Create: `scripts/import/scenario/parse-artifact.ts`, `scripts/import/scenario/import-scenario.ts`
- Test: `scripts/import/scenario/__tests__/parse-artifact.test.ts`

**Interfaces:**
- Consumes: `scenarioContentSchema`, `buildSearchText`, `newId` (Task 1).
- Produces: `parseArtifactHtml(html: string, kind: ScenarioPageKind): { title: string; subtitle: string | null; content: ScenarioContent }`; CLI `pnpm import-scenario <manifest.json> <campaignId> [--dry-run] [--force]` (наявні сторінки пропускає; `--force` перезаписує, спершу зберігши версію).

Підготовка (робить контролер, не імплементер): HTML артефактів вивантажено в `.scenario-import/` (поза git) разом з `manifest.json`:

```json
[
  { "file": "scene-1.html", "kind": "scene", "arc": "Арка перша: Ізабель і Годрик", "status": "ready", "sortOrder": 0 },
  { "file": "hero-godric.html", "kind": "hero", "status": "ready", "sortOrder": 101, "characterName": "Годрик" }
]
```

- [ ] **Step 1: Залежність**

Run: `pnpm add -D node-html-parser` і додай скрипт `import-scenario` у `package.json`, `.scenario-import/` у `.gitignore`.

- [ ] **Step 2: Падаючий тест парсера**

`scripts/import/scenario/__tests__/parse-artifact.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseArtifactHtml } from "@/scripts/import/scenario/parse-artifact";
import { scenarioContentSchema } from "@/lib/schemas/scenario";

const scene = `<!DOCTYPE html><html><body>
<header class="title"><h1>Монастир Світла</h1><p>Сцена перша</p>
<div class="legend"><span><i style="background:var(--blood)"></i>Читати вголос і події</span><span><i style="background:#5B3A78"></i>Тіньова лінія Аграїла</span></div></header>
<main>
<section id="s10"><h2>1.0 Собор Ельрата</h2>
<div class="row"><div class="story">
<div class="mark shadow"><span class="tag">Тіньова лінія: пролог</span><p>Короткий пролог.</p></div>
<div class="read"><p>Дах старої дзвіниці.</p></div>
<p class="say">«Наречену взяти живою»</p>
<h3>Прорив</h3>
<div class="mark token"><span class="tag">Жетон</span><ul><li><span class="g"></span>Іде <b>одразу</b>.</li></ul></div>
</div>
<aside class="notes"><p class="secret"><b class="secret">Записка:</b> дитячий сміх.</p><table><tr><td>1.0</td><td>Лишитися</td></tr></table></aside>
</div>
<div class="row"><div class="story"><p>Друга частина.</p></div><aside class="notes"></aside></div>
</section>
</main></body></html>`;

const hero = `<html><body><header class="title"><h1>Лорд Годрик</h1><p>Паладин.</p><p class="quote">«Світло не обирають»</p></header>
<main class="wrap"><section><h2>Історія</h2><p>Ти паладин.</p></section>
<section><h2>На що звертати увагу</h2><div class="key"><b>Обов'язок</b>Віра абсолютна.</div><div class="goal"><b>Ціль</b>Захистити.</div><div class="secretbox"><b class="t">Тавро</b><p>Пече.</p></div></section>
<section><h2>Люди</h2><table class="people"><tr><td>Ніколас</td><td>Учень.</td></tr></table><ul class="prio"><li>Обов'язок.</li></ul></section></main></body></html>`;

const types = (nodes: { type: string }[] | undefined) => (nodes ?? []).map((n) => n.type);

describe("parseArtifactHtml", () => {
  it("сцена: заголовок, легенда, розділи й рядки з колонками", () => {
    const { title, subtitle, content } = parseArtifactHtml(scene, "scene");

    expect(title).toBe("Монастир Світла");
    expect(subtitle).toBe("Сцена перша");
    expect(content.legend).toEqual([{ kind: "read", label: "Читати вголос і події" }, { kind: "shadow", label: "Тіньова лінія Аграїла" }]);
    expect(content.sections).toHaveLength(1);
    expect(content.sections[0].title).toBe("1.0 Собор Ельрата");
    expect(content.sections[0].rows).toHaveLength(2);

    const story = content.sections[0].rows[0].story.content;

    expect(types(story)).toEqual(["callout", "readAloud", "say", "heading", "callout"]);
    expect(story[0].attrs).toEqual({ kind: "shadow", tag: "Тіньова лінія: пролог" });
    expect(types(story[4].content)).toEqual(["bulletList"]);

    const li = story[4].content?.[0].content?.[0].content?.[0].content ?? [];

    expect(li[0]).toEqual({ type: "token", attrs: { color: "green" } });
    expect(li.find((n) => n.text === "одразу")?.marks).toEqual([{ type: "bold" }]);

    const notes = content.sections[0].rows[0].notes.content;

    expect(notes[0].content?.[0].marks).toEqual(expect.arrayContaining([{ type: "secret" }, { type: "bold" }]));
    expect(notes[0].content?.[1].marks).toEqual([{ type: "secret" }]);
    expect(types(notes)).toEqual(["paragraph", "table"]);
    expect(content.sections[0].rows[1].notes.content).toEqual([]);
  });

  it("герой: розділ = глава з одним рядком, маркери key/goal/secretbox, цитата як репліка", () => {
    const { title, subtitle, content } = parseArtifactHtml(hero, "hero");

    expect(title).toBe("Лорд Годрик");
    expect(subtitle).toBe("Паладин.");
    expect(content.sections.map((s) => s.title)).toEqual(["Історія", "На що звертати увагу", "Люди"]);
    expect(content.sections.every((s) => s.rows.length === 1 && s.reveal?.mode === "manual" && !s.revealedAt)).toBe(true);
    expect(types(content.sections[0].rows[0].story.content)).toEqual(["say", "paragraph"]);

    const callouts = content.sections[1].rows[0].story.content;

    expect(callouts.map((c) => c.attrs)).toEqual([{ kind: "hero", tag: "Обов'язок" }, { kind: "goal", tag: "Ціль" }, { kind: "confide", tag: "Тавро" }]);
    expect(types(content.sections[2].rows[0].story.content)).toEqual(["table", "bulletList"]);
  });

  it("результат проходить схему", () => {
    expect(scenarioContentSchema.safeParse(parseArtifactHtml(scene, "scene").content).success).toBe(true);
    expect(scenarioContentSchema.safeParse(parseArtifactHtml(hero, "hero").content).success).toBe(true);
  });
});
```

Run: `pnpm test:run scripts/import/scenario` — Expected: FAIL.

- [ ] **Step 3: Парсер**

`scripts/import/scenario/parse-artifact.ts` (лише `querySelector`/`querySelectorAll` з простими селекторами та обхід `childNodes` — `:scope` і `:not` у `node-html-parser` не гарантовані):

```ts
import { type HTMLElement, type Node as HtmlNode, NodeType, parse } from "node-html-parser";

import { CALLOUT_KINDS } from "@/lib/constants/scenario";
import { newId } from "@/lib/utils/scenario/structure";
import type { CalloutKind, LegendEntry, LegendKind, RichDoc, RichMark, RichNode, ScenarioContent, ScenarioPageKind, ScenarioSection } from "@/types/scenario";

const LEGEND_BY_SWATCH: [string, LegendKind][] = [["--blood", "read"], ["--night", "choice"], ["--verdigris", "token"], ["--gold", "artifact"], ["#5b3a78", "shadow"], ["--ink-soft", "check"], ["--margin", "notes"]];

const HERO_BOXES: [string, CalloutKind][] = [["key", "hero"], ["goal", "goal"], ["secretbox", "confide"]];

const clean = (s: string) => s.replace(/\s+/g, " ");

const isEl = (n: HtmlNode): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;

const tagOf = (el: HTMLElement) => el.tagName.toLowerCase();

const has = (el: HTMLElement, cls: string) => el.classList.contains(cls);

const kids = (el: HTMLElement, tag?: string) => el.childNodes.filter(isEl).filter((c) => !tag || tagOf(c) === tag);

function inline(node: HtmlNode, marks: RichMark[]): RichNode[] {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = clean(node.text);

    return text ? [{ type: "text", text, ...(marks.length > 0 && { marks }) }] : [];
  }

  if (!isEl(node)) return [];

  const tag = tagOf(node);

  if (tag === "br") return [{ type: "hardBreak" }];

  if (tag === "span" && (has(node, "g") || has(node, "r"))) return [{ type: "token", attrs: { color: has(node, "g") ? "green" : "red" } }];

  return node.childNodes.flatMap((c) => inline(c, withMarks(node, marks)));
}

function withMarks(el: HTMLElement, marks: RichMark[]): RichMark[] {
  const next = [...marks];

  const add = (type: RichMark["type"]) => {
    if (!next.some((m) => m.type === type)) next.push({ type });
  };

  if (has(el, "secret")) add("secret");

  if (["b", "strong"].includes(tagOf(el))) add("bold");

  if (["i", "em"].includes(tagOf(el))) add("italic");

  return next;
}

function trimInline(nodes: RichNode[]): RichNode[] {
  const out = nodes.map((n) => ({ ...n }));

  const first = out[0];

  const last = out.at(-1);

  if (first?.type === "text") first.text = first.text?.trimStart();

  if (last?.type === "text") last.text = last.text?.trimEnd();

  return out.filter((n) => n.type !== "text" || n.text);
}

const inlineOf = (nodes: HtmlNode[], marks: RichMark[]) => trimInline(nodes.flatMap((c) => inline(c, marks)));

// the element's own class (p.secret) applies to all of its text
function paragraph(el: HTMLElement): RichNode {
  const content = inlineOf(el.childNodes, has(el, "secret") ? [{ type: "secret" }] : []);

  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

const list = (el: HTMLElement): RichNode => ({ type: tagOf(el) === "ol" ? "orderedList" : "bulletList", content: kids(el, "li").map((li) => ({ type: "listItem", content: [paragraph(li)] })) });

const table = (el: HTMLElement): RichNode => ({
  type: "table",
  content: el.querySelectorAll("tr").map((tr) => ({ type: "tableRow", content: kids(tr).filter((c) => ["td", "th"].includes(tagOf(c))).map((td) => ({ type: "tableCell", content: [paragraph(td)] })) })),
});

function calloutBody(el: HTMLElement, skip: HTMLElement | null): RichNode[] {
  const out: RichNode[] = [];

  let loose: HtmlNode[] = [];

  const flushLoose = () => {
    const content = inlineOf(loose, []);

    if (content.length) out.push({ type: "paragraph", content });

    loose = [];
  };

  for (const child of el.childNodes) {
    if (child === skip) continue;

    if (isEl(child) && ["p", "ul", "ol"].includes(tagOf(child))) {
      flushLoose();
      out.push(tagOf(child) === "p" ? paragraph(child) : list(child));
    } else {
      loose.push(child);
    }
  }

  flushLoose();

  return out.length ? out : [{ type: "paragraph" }];
}

const callout = (el: HTMLElement, kind: CalloutKind, title: HTMLElement | null): RichNode => ({ type: "callout", attrs: { kind, tag: clean(title?.text ?? "").trim() }, content: calloutBody(el, title) });

function block(el: HTMLElement): RichNode[] {
  const tag = tagOf(el);

  if (tag === "h3") return [{ type: "heading", attrs: { level: 3 }, content: inlineOf(el.childNodes, []) }];

  if (tag === "p" && (has(el, "say") || has(el, "quote"))) return [{ type: "say", content: paragraph(el).content ?? [] }];

  if (tag === "p") return [paragraph(el)];

  if (tag === "ul" || tag === "ol") return [list(el)];

  if (tag === "table") return [table(el)];

  if (has(el, "read")) return [{ type: "readAloud", content: kids(el, "p").map(paragraph) }];

  if (has(el, "mark")) return [callout(el, CALLOUT_KINDS.find((k) => has(el, k)) ?? "event", kids(el).find((c) => has(c, "tag")) ?? null)];

  const box = HERO_BOXES.find(([cls]) => has(el, cls));

  if (box) return [callout(el, box[1], kids(el, "b")[0] ?? null)];

  if (has(el, "jumps") || has(el, "priv")) return [];

  const text = clean(el.text).trim();

  return text ? [{ type: "paragraph", content: [{ type: "text", text }] }] : [];
}

const docOf = (blocks: HTMLElement[]): RichDoc => ({ type: "doc", content: blocks.flatMap(block) });

function legendOf(root: HTMLElement): LegendEntry[] {
  return root.querySelectorAll(".legend span").flatMap((span) => {
    const style = (span.querySelector("i")?.getAttribute("style") ?? "").toLowerCase();

    const kind = LEGEND_BY_SWATCH.find(([needle]) => style.includes(needle))?.[1];

    return kind ? [{ kind, label: clean(span.text).trim() }] : [];
  });
}

function sectionOf(sec: HTMLElement, kind: ScenarioPageKind, quote: HTMLElement | null): ScenarioSection {
  const title = clean(kids(sec, "h2")[0]?.text ?? "").trim();

  const rows = kids(sec).filter((c) => has(c, "row"));

  if (rows.length) {
    return {
      id: newId(),
      title,
      played: false,
      rows: rows.map((row) => {
        const story = kids(row).find((c) => has(c, "story"));

        const notes = kids(row).find((c) => has(c, "notes"));

        return { id: newId(), story: docOf(story ? kids(story) : []), notes: docOf(notes ? kids(notes) : []) };
      }),
    };
  }

  const story = docOf(kids(sec).filter((c) => tagOf(c) !== "h2"));

  if (quote) story.content.unshift(block(quote)[0]);

  return { id: newId(), title, played: false, ...(kind === "hero" && { reveal: { mode: "manual" as const } }), rows: [{ id: newId(), story, notes: { type: "doc", content: [] } }] };
}

export function parseArtifactHtml(html: string, kind: ScenarioPageKind): { title: string; subtitle: string | null; content: ScenarioContent } {
  const root = parse(html);

  const header = root.querySelector("header.title");

  const headerParagraphs = header ? kids(header, "p") : [];

  const quote = headerParagraphs.find((p) => has(p, "quote")) ?? null;

  const title = clean(header?.querySelector("h1")?.text ?? root.querySelector("title")?.text ?? "Без назви").trim();

  const subtitle = clean(headerParagraphs.find((p) => !has(p, "quote"))?.text ?? "").trim() || null;

  const main = root.querySelector("main");

  const sections = (main ? kids(main, "section") : []).map((sec, i) => sectionOf(sec, kind, i === 0 ? quote : null));

  return { title, subtitle, content: { legend: legendOf(root), sections } };
}
```

Run: `pnpm test:run scripts/import/scenario` — Expected: PASS.

- [ ] **Step 4: Скрипт імпорту**

`scripts/import/scenario/import-scenario.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

import { parseArtifactHtml } from "./parse-artifact";

import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { buildSearchText } from "@/lib/utils/scenario/search-text";
import type { ScenarioPageKind, ScenarioPageStatus } from "@/types/scenario";

type Entry = { file: string; kind: ScenarioPageKind; arc?: string; status: ScenarioPageStatus; sortOrder: number; characterName?: string };

async function main() {
  const [manifestPath, campaignId] = process.argv.slice(2);

  const dryRun = process.argv.includes("--dry-run");

  const force = process.argv.includes("--force");

  if (!manifestPath || !campaignId) throw new Error("Usage: pnpm import-scenario <manifest.json> <campaignId> [--dry-run] [--force]");

  const entries = JSON.parse(readFileSync(manifestPath, "utf8")) as Entry[];

  const prisma = new PrismaClient();

  const characters = await prisma.character.findMany({ where: { campaignId }, select: { id: true, name: true } });

  for (const entry of entries) {
    const parsed = parseArtifactHtml(readFileSync(path.join(path.dirname(manifestPath), entry.file), "utf8"), entry.kind);

    const content = scenarioContentSchema.parse(parsed.content);

    const characterId = entry.characterName ? (characters.find((c) => c.name.includes(entry.characterName as string))?.id ?? null) : null;

    if (entry.characterName && !characterId) console.warn(`! персонажа «${entry.characterName}» не знайдено — «${parsed.title}» без прив'язки`);

    const data = {
      campaignId, kind: entry.kind, arc: entry.arc ?? null, title: parsed.title, subtitle: parsed.subtitle, status: entry.status, sortOrder: entry.sortOrder, characterId,
      content: content as unknown as Prisma.InputJsonValue, searchText: buildSearchText(parsed.title, content),
    };

    const existing = await prisma.scenarioPage.findFirst({ where: { campaignId, title: parsed.title }, select: { id: true } });

    // re-import would wipe DM edits and played/revealed flags — existing pages are skipped unless --force
    if (existing && !force) {
      console.info(`skip ${entry.kind} «${parsed.title}»: вже є (перезапис — --force)`);
      continue;
    }

    console.info(`${existing ? "update" : "create"} ${entry.kind} «${parsed.title}»: ${content.sections.length} розділів, ${content.sections.reduce((n, s) => n + s.rows.length, 0)} рядків`);

    if (dryRun) continue;

    if (existing) {
      const current = await prisma.scenarioPage.findUnique({ where: { id: existing.id }, select: { content: true } });

      await prisma.scenarioPageVersion.create({ data: { pageId: existing.id, content: current?.content ?? {}, createdBy: "import" } });
      await prisma.scenarioPage.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } });
    } else {
      await prisma.scenarioPage.create({ data });
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

(Скрипти в `scripts/` створюють власний `PrismaClient` — звір з наявними `scripts/import/*.ts` і повтори їх підхід до клієнта.)

- [ ] **Step 5: Прогін на локальній БД**

Run: `pnpm import-scenario .scenario-import/manifest.json <local campaignId> --dry-run`, потім без `--dry-run` (з `--env-file=.env.local`, якщо скрипти не читають його самі).
Expected: для кожного файла рядок `create …` з ненульовою кількістю розділів; сторінка відкривається в `/campaigns/<id>/dm/scenario`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore scripts/import/scenario
git commit -m "feat(scenario): artifact HTML importer"
```

---

### Task 13: Фінальна перевірка

**Files:** без нових; виправлення за результатами.

- [ ] **Step 1: Повний прогін**

Run: `pnpm lint && pnpm test:run && pnpm build`
Expected: усе зелене. `pnpm build` підтверджує, що Tiptap не потрапив у серверний бандл сторінки (редактор — `next/dynamic` з `ssr: false`).

- [ ] **Step 2: Браузер на копії проду**

```bash
./scripts/db/prodcopy-db.sh
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm exec prisma migrate deploy
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm import-scenario .scenario-import/manifest.json cmuylhk0c0001ia06lg5eommv
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm dev
```

Чек-лист (DM, desktop):
- меню «Сценарій» і плитка на огляді кампанії ведуть на індекс; арки, номери, статуси, герої як в артефакті;
- пошук «Беатріс» знаходить розділ 1.1 і веде на якір;
- сторінка «Монастир Світла»: легенда, навігація, «Сховати нотатки», темна/світла тема;
- «Зіграно» на 1.0 → стан зберігається після перезавантаження;
- «Редагувати»: клік по комірці відкриває Tiptap, тулбар (жирний, читати вголос, маркер «Вибір», жетон, секрет, таблиця), `@Біс` — підказка й посилання у «Грі»; статус «Збережено» після паузи;
- друга вкладка редагує ту саму сторінку → у першій «Конфлікт версій», правки на місці;
- «Версії» → відновлення попередньої;
- hero-сторінка Годрика: глава з правилом «Після зіграного розділу 1.0» → у профілі гравця (вхід гравцем) у «Історії» з'являється глава; секретний фрагмент і нотатки не видно (перевір і у відповіді `GET …/sheet` у DevTools).

Mobile (375 px): індекс, «Гра» (рядки в одну колонку), тулбар прокручується горизонтально, без горизонтального скролу сторінки.

- [ ] **Step 3: Імпорт на прод (лише після злиття в main і деплою, з окремого підтвердження користувача)**

Міграцію застосовує Vercel-білд з `main`. Потім:

```bash
pnpm import-scenario .scenario-import/manifest.json cmuylhk0c0001ia06lg5eommv --dry-run  # з DATABASE_URL прод-пулера з .env.production-db.local
pnpm import-scenario .scenario-import/manifest.json cmuylhk0c0001ia06lg5eommv
```

Запуск: `node --env-file=.env.production-db.local node_modules/.bin/tsx --tsconfig tsconfig.scripts.json scripts/import/scenario/import-scenario.ts …` (як інші прод-сіди). Глави біографій імпортуються закритими — відкриває DM.

- [ ] **Step 4: Прибирання**

Видали тестові сторінки, створені під час перевірки на prodcopy (не імпортовані). Запиши результати перевірки в коміт або звіт, якщо щось лишилося відкритим.

- [ ] **Step 5: Commit виправлень (якщо були)**

```bash
git add -A
git commit -m "fix(scenario): issues found in end-to-end check"
```
