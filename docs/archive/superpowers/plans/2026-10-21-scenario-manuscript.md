# Сценарій «Рукопис» — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сторінка сценарію в стилі «Рукопис»: центровані заголовки розділів з іконкою, бічний зміст з підсвіченням поточного розділу, згортання зіграних розділів, однорядкова шапка з меню «⋯».

**Architecture:** Чисті функції (`sectionIcon`, `sectionDone`) у `lib/utils/scenario`; стан згортання й поточного розділу — хуки в `lib/hooks/scenario`; UI — нові `ScenarioToc`, `ScenarioLayout`, `SectionIcon` у `components/scenario`, переробка `ScenarioBar` / `ScenarioPageView` / `SectionHeaderEditor`; вигляд — `scenario-book.css`. Поле `section.icon` живе в JSON `content`, міграції немає.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Zod, lucide-react, Radix dropdown (`components/ui/dropdown-menu`), vitest + happy-dom + Testing Library.

**Spec:** `docs/archive/superpowers/specs/2026-10-21-scenario-manuscript-design.md`

## Global Constraints

- Мова UI й коментарів — українська; ідентифікатори — англійські. Коментарі мінімальні (лише неочевидне «чому», один рядок).
- Компоненти не імпортують `@/lib/api/*`; логіка — у хуках/утилітах, компонент викликає й рендерить.
- Пропсів ≤ ~7; споріднені колбеки й значення групуються в об'єкти.
- Діалоги лише через `ResponsiveDialog` (`components/ui/responsive-dialog`), ніколи Radix `Dialog`/`vaul` напряму.
- ESLint: `simple-import-sort`, порожній рядок навколо `const`/`let`/`if`/`return`/блоків, `react-hooks/exhaustive-deps` = error, `no-console` (лише info/warn/error).
- Імпорти через `@/…`, з барелів доменних папок (`@/lib/hooks/scenario`).
- Міграції БД немає: `icon` — необов'язкове поле JSON `content`.
- Тести — у сусідніх `__tests__/`; DOM-тести з `// @vitest-environment happy-dom`.
- Під час роботи: `pnpm test:related <files>` / `pnpm test:changed`; повний `pnpm test:run` — один раз у кінці.
- Перед кожним комітом: `pnpm exec tsc --noEmit -p .` і `pnpm exec eslint --fix <змінені файли>`.
- Коміти закінчуються рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Сторінка героя (`kind: "hero"`): «зіграний» означає `revealedAt` або відкриття за прогресом (`isChapterOpen`) — згортання і ✓ у змісті мають використовувати те саме правило, що й кнопка «Відкрито гравцеві». Тест у Task 1 (`sectionDone`) і Task 3.
2. Розділ щойно позначено «Зіграно» — він не має згорнутися під курсором ДМ. Тест у Task 3.
3. Перехід зі змісту на згорнутий розділ — розділ розгортається до прокрутки. Тест у Task 4.
4. Стара сторінка без `icon` і з невідомим ключем `icon` у JSON — автоматична іконка, не падіння; схема відхиляє невідомий ключ при збереженні. Тести у Task 1.
5. Сторінка без розділів / розділ без рядків — зміст порожній без помилок, поточний розділ `null`. Тести у Task 4.

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `lib/constants/scenario.ts` | + `SECTION_ICON_KEYS`, `SECTION_ICON_LABELS` |
| `types/scenario.ts` | + `SectionIconKey`, `ScenarioSection.icon?` |
| `lib/schemas/scenario.ts` | `sectionSchema.icon` |
| `lib/utils/scenario/section-icon.ts` (new) | `sectionIcon(section)` — ключ іконки |
| `lib/utils/scenario/reveal.ts` | + `sectionDone(section, isHero, played?)` |
| `lib/hooks/scenario/useSectionCollapse.ts` (new) | прапор «зіграні розгорнуті» (localStorage) + множина розгорнутих вручну |
| `lib/hooks/scenario/useActiveSection.ts` (new) | поточний розділ під липкою шапкою |
| `components/scenario/SectionIcon.tsx` (new) | ключ → іконка lucide |
| `components/scenario/ScenarioToc.tsx` (new) | список розділів: колонка або висувна панель |
| `components/scenario/ScenarioLayout.tsx` (new) | сітка «зміст + вміст» |
| `components/scenario/ScenarioBar.tsx` | однорядкова смуга, «☰ Розділи», меню «⋯» |
| `components/scenario/ScenarioPageView.tsx` | новий заголовок розділу, згортання |
| `components/scenario/editor/SectionHeaderEditor.tsx` | вибір іконки |
| `components/scenario/editor/ScenarioEditor.tsx` | зміст у режимі редагування |
| `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx` | зв'язування: дії смуги, меню, згортання, зміст |
| `components/scenario/scenario-book.css` | стиль «Рукопис», сітка, зміст, смуга |

---

### Task 1: Модель іконки та «зіграності» розділу

**Files:**
- Modify: `lib/constants/scenario.ts`
- Modify: `types/scenario.ts:44-51`
- Modify: `lib/schemas/scenario.ts:37-44`
- Create: `lib/utils/scenario/section-icon.ts`
- Modify: `lib/utils/scenario/reveal.ts`
- Test: `lib/utils/scenario/__tests__/section-icon.test.ts`, `lib/utils/scenario/__tests__/section-done.test.ts`, `lib/schemas/__tests__/scenario-section-icon.test.ts`

**Interfaces:**
- Produces:
  - `SECTION_ICON_KEYS = ["scene","battle","secret","choice","journey","dialogue","rest","prep"] as const`
  - `SECTION_ICON_LABELS: Record<SectionIconKey, string>`
  - `type SectionIconKey = (typeof SECTION_ICON_KEYS)[number]`
  - `ScenarioSection.icon?: SectionIconKey`
  - `sectionIcon(section: ScenarioSection): SectionIconKey`
  - `sectionDone(section: ScenarioSection, isHero: boolean, played?: PlayedLookup): { done: boolean; byPlay: boolean }`

- [ ] **Step 1: Write the failing tests**

`lib/utils/scenario/__tests__/section-icon.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { RichDoc, RichNode, ScenarioSection } from "@/types/scenario";

const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content });

const text = (t: string): RichNode => ({ type: "paragraph", content: [{ type: "text", text: t }] });

const callout = (kind: string): RichNode => ({ type: "callout", attrs: { kind, tag: kind }, content: [text("x")] });

const section = (over: Partial<ScenarioSection> = {}, rows: Partial<ScenarioSection["rows"][number]>[] = [{}]): ScenarioSection => ({
  id: "s", title: "2.1 Мертва лицарка", played: false,
  rows: rows.map((r, i) => ({ id: `r${i}`, story: doc(text("a")), notes: doc(), ...r })),
  ...over,
});

describe("sectionIcon", () => {
  it("за замовчуванням — сцена", () => {
    expect(sectionIcon(section())).toBe("scene");
  });

  it("прив'язаний бій у будь-якому рядку — бій", () => {
    expect(sectionIcon(section({}, [{}, { battleId: "b1" }]))).toBe("battle");
  });

  it("виноска «Тіньова лінія» чи «Таємне» в розповіді — таємниця", () => {
    expect(sectionIcon(section({}, [{ story: doc(callout("shadow")) }]))).toBe("secret");
    expect(sectionIcon(section({}, [{ story: doc(callout("confide")) }]))).toBe("secret");
  });

  it("позначка secret і виноски в нотатках не роблять розділ таємницею", () => {
    const secretMark: RichNode = { type: "paragraph", content: [{ type: "text", text: "s", marks: [{ type: "secret" }] }] };

    expect(sectionIcon(section({}, [{ story: doc(secretMark), notes: doc(callout("confide")) }]))).toBe("scene");
  });

  it("виноска «Вибір гравців» у розповіді — вибір, навіть вкладена в список", () => {
    const nested: RichNode = { type: "bulletList", content: [{ type: "listItem", content: [callout("choice")] }] };

    expect(sectionIcon(section({}, [{ story: doc(nested) }]))).toBe("choice");
  });

  it("назва «Підготовка» — підготовка", () => {
    expect(sectionIcon(section({ title: "підготовка до сесії" }))).toBe("prep");
  });

  it("пріоритет: бій > таємниця > вибір > підготовка", () => {
    expect(sectionIcon(section({ title: "Підготовка" }, [{ battleId: "b", story: doc(callout("shadow"), callout("choice")) }]))).toBe("battle");
    expect(sectionIcon(section({ title: "Підготовка" }, [{ story: doc(callout("choice"), callout("shadow")) }]))).toBe("secret");
  });

  it("ручний вибір ДМ перекриває все; невідомий ключ ігнорується", () => {
    expect(sectionIcon(section({ icon: "rest" }, [{ battleId: "b" }]))).toBe("rest");
    expect(sectionIcon(section({ icon: "bogus" as never }, [{ battleId: "b" }]))).toBe("battle");
  });

  it("розділ без рядків — сцена", () => {
    expect(sectionIcon(section({}, []))).toBe("scene");
  });
});
```

`lib/utils/scenario/__tests__/section-done.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { sectionDone } from "@/lib/utils/scenario/reveal";
import type { ScenarioSection } from "@/types/scenario";

const s = (over: Partial<ScenarioSection> = {}): ScenarioSection => ({ id: "s1", title: "1.0", played: false, revealedAt: null, rows: [], ...over });

describe("sectionDone", () => {
  it("сцена: done = played", () => {
    expect(sectionDone(s({ played: true }), false)).toEqual({ done: true, byPlay: false });
    expect(sectionDone(s(), false)).toEqual({ done: false, byPlay: false });
  });

  it("герой: revealedAt відкриває главу", () => {
    expect(sectionDone(s({ revealedAt: "2026-10-21" }), true)).toEqual({ done: true, byPlay: false });
  });

  it("герой: глава відкрита зіграним розділом іншої сторінки", () => {
    const section = s({ reveal: { mode: "afterSection", pageId: "p", sectionId: "x" } });

    expect(sectionDone(section, true, (pageId, sectionId) => pageId === "p" && sectionId === "x")).toEqual({ done: true, byPlay: true });
    expect(sectionDone(section, true)).toEqual({ done: false, byPlay: false });
  });

  it("герой: played ігнорується", () => {
    expect(sectionDone(s({ played: true }), true).done).toBe(false);
  });
});
```

`lib/schemas/__tests__/scenario-section-icon.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { scenarioContentSchema } from "@/lib/schemas/scenario";

const content = (icon?: unknown) => ({
  legend: [],
  sections: [{ id: "s1", title: "1.0", played: false, rows: [], ...(icon === undefined ? {} : { icon }) }],
});

describe("sectionSchema.icon", () => {
  it("приймає відомий ключ і відсутність поля", () => {
    expect(scenarioContentSchema.safeParse(content("battle")).success).toBe(true);
    expect(scenarioContentSchema.safeParse(content()).success).toBe(true);
  });

  it("відхиляє невідомий ключ", () => {
    expect(scenarioContentSchema.safeParse(content("bogus")).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/scenario/__tests__/section-icon.test.ts lib/utils/scenario/__tests__/section-done.test.ts lib/schemas/__tests__/scenario-section-icon.test.ts`
Expected: FAIL — `sectionIcon`/`sectionDone` не існують, схема приймає `"bogus"`.

- [ ] **Step 3: Implement**

`lib/constants/scenario.ts` — додати в кінець:

```ts
export const SECTION_ICON_KEYS = ["scene", "battle", "secret", "choice", "journey", "dialogue", "rest", "prep"] as const;
export const SECTION_ICON_LABELS: Record<(typeof SECTION_ICON_KEYS)[number], string> = {
  scene: "Сцена", battle: "Бій", secret: "Таємниця", choice: "Вибір", journey: "Подорож", dialogue: "Діалог", rest: "Відпочинок", prep: "Підготовка",
};
```

`types/scenario.ts` — додати `SECTION_ICON_KEYS` в імпорт з `@/lib/constants/scenario`, тип і поле:

```ts
export type SectionIconKey = (typeof SECTION_ICON_KEYS)[number];
```

```ts
export interface ScenarioSection {
  id: string;
  title: string;
  played: boolean;
  icon?: SectionIconKey;
  reveal?: RevealRule;
  revealedAt?: string | null;
  rows: ScenarioRow[];
}
```

`lib/schemas/scenario.ts` — у `sectionSchema` після `played` (імпорт `SECTION_ICON_KEYS` з `@/lib/constants/scenario` поруч з наявними):

```ts
  icon: z.enum(SECTION_ICON_KEYS).optional(),
```

`lib/utils/scenario/section-icon.ts`:

```ts
import { SECTION_ICON_KEYS } from "@/lib/constants/scenario";
import type { RichNode, ScenarioSection, SectionIconKey } from "@/types/scenario";

function hasCallout(nodes: RichNode[] | undefined, kinds: readonly string[]): boolean {
  return (nodes ?? []).some((n) => (n.type === "callout" && kinds.includes(String(n.attrs?.kind))) || hasCallout(n.content, kinds));
}

const storyHas = (section: ScenarioSection, kinds: readonly string[]) => section.rows.some((r) => hasCallout(r.story.content, kinds));

export function sectionIcon(section: ScenarioSection): SectionIconKey {
  if (section.icon && (SECTION_ICON_KEYS as readonly string[]).includes(section.icon)) return section.icon;

  if (section.rows.some((r) => r.battleId)) return "battle";

  if (storyHas(section, ["shadow", "confide"])) return "secret";

  if (storyHas(section, ["choice"])) return "choice";

  if (/^підготов/i.test(section.title.trim())) return "prep";

  return "scene";
}
```

`lib/utils/scenario/reveal.ts` — додати (тип `ScenarioSection` уже імпортовано; якщо ні — додати в імпорт з `@/types/scenario`):

```ts
/** Зіграний розділ сцени або відкрита глава героя — те саме правило для кнопки, змісту і згортання. */
export function sectionDone(section: ScenarioSection, isHero: boolean, played?: PlayedLookup): { done: boolean; byPlay: boolean } {
  if (!isHero) return { done: section.played, byPlay: false };

  const byPlay = !section.revealedAt && !!played && isChapterOpen(section, played);

  return { done: !!section.revealedAt || byPlay, byPlay };
}
```

У `components/scenario/ScenarioPageView.tsx` замінити локальне обчислення:

```ts
          const byPlay = isHero && !s.revealedAt && !!progress?.played && isChapterOpen(s, progress.played);

          const done = isHero ? !!s.revealedAt || byPlay : s.played;
```

на

```ts
          const { done, byPlay } = sectionDone(s, isHero, progress?.played);
```

і в імпорті `@/lib/utils/scenario/reveal` замінити `isChapterOpen` на `sectionDone`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/scenario lib/schemas components/scenario`
Expected: PASS (включно з наявними `scenario-page-view` тестами).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm exec tsc --noEmit -p .
pnpm exec eslint --fix lib/constants/scenario.ts types/scenario.ts lib/schemas/scenario.ts lib/utils/scenario components/scenario/ScenarioPageView.tsx lib/schemas/__tests__
git add -A lib/constants/scenario.ts types/scenario.ts lib/schemas lib/utils/scenario components/scenario/ScenarioPageView.tsx
git commit -m "feat(scenario): section icon key and shared played/revealed rule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Заголовок розділу «Рукопис» з іконкою

**Files:**
- Create: `components/scenario/SectionIcon.tsx`
- Modify: `components/scenario/ScenarioPageView.tsx`
- Modify: `components/scenario/scenario-book.css`
- Test: `components/scenario/__tests__/scenario-page-view.test.tsx`

**Interfaces:**
- Consumes: `sectionIcon`, `SectionIconKey`, `SECTION_ICON_LABELS` (Task 1)
- Produces: `SectionIcon({ name, className? }: { name: SectionIconKey; className?: string })` — рендерить іконку lucide з `data-section-icon={name}` і `aria-label` з `SECTION_ICON_LABELS`. `SECTION_ICON_COMPONENTS: Record<SectionIconKey, LucideIcon>`.

- [ ] **Step 1: Write the failing test** — додати в `describe("ScenarioPageView")` у `components/scenario/__tests__/scenario-page-view.test.tsx`:

```tsx
  it("заголовок розділу з іконкою за типом і ручною іконкою", () => {
    const pg = page("scene");

    pg.content.sections.push({ id: "s11", title: "1.1 Бій", played: false, rows: [{ id: "r2", story: p("x"), notes: p(""), battleId: "b1" }] });
    pg.content.sections.push({ id: "s12", title: "1.2 Привал", played: false, icon: "rest", rows: [] });

    const { container } = render(<ScenarioPageView page={pg} campaignId="c" />);

    expect(container.querySelector("#sec-s10 [data-section-icon]")?.getAttribute("data-section-icon")).toBe("scene");
    expect(container.querySelector("#sec-s11 [data-section-icon]")?.getAttribute("data-section-icon")).toBe("battle");
    expect(container.querySelector("#sec-s12 [data-section-icon]")?.getAttribute("data-section-icon")).toBe("rest");
    expect(container.querySelector("#sec-s10 h2")?.textContent).toBe("1.0 Собор");
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:run components/scenario/__tests__/scenario-page-view.test.tsx`
Expected: FAIL — немає `[data-section-icon]`.

- [ ] **Step 3: Implement**

`components/scenario/SectionIcon.tsx`:

```tsx
import { BookOpen, Compass, KeyRound, type LucideIcon, MessagesSquare, ScrollText, Split, Swords, Tent } from "lucide-react";

import { SECTION_ICON_LABELS } from "@/lib/constants/scenario";
import type { SectionIconKey } from "@/types/scenario";

export const SECTION_ICON_COMPONENTS: Record<SectionIconKey, LucideIcon> = {
  scene: ScrollText, battle: Swords, secret: KeyRound, choice: Split, journey: Compass, dialogue: MessagesSquare, rest: Tent, prep: BookOpen,
};

export function SectionIcon({ name, className }: { name: SectionIconKey; className?: string }) {
  const Icon = SECTION_ICON_COMPONENTS[name];

  return <Icon data-section-icon={name} aria-label={SECTION_ICON_LABELS[name]} role="img" className={className} />;
}
```

`components/scenario/ScenarioPageView.tsx` — замінити блок `<h2>…</h2>` на:

```tsx
              <div className="sb-sec-head">
                <div className="sb-sec-orn" aria-hidden={false}>
                  <SectionIcon name={sectionIcon(s)} className="sb-sec-icon" />
                </div>
                <h2>{s.title}</h2>
                {progress && (
                  <button type="button" className="toggle played" aria-pressed={done} disabled={progress.pending} onClick={() => (isHero ? progress.onRevealed(s.id, !s.revealedAt) : progress.onPlayed(s.id, !done))}>
                    {isHero ? (byPlay ? "✓ Відкрито (після розділу)" : done ? "✓ Відкрито гравцеві" : "Відкрити гравцеві") : done ? "✓ Зіграно" : "Зіграно"}
                  </button>
                )}
              </div>
```

Імпорти: `import { SectionIcon } from "./SectionIcon";`, `import { sectionIcon } from "@/lib/utils/scenario/section-icon";`.

`components/scenario/scenario-book.css` — замінити правила `section > h2`, `section > h2 .played`, `section.is-played > h2` на:

```css
.scenario-book .sb-sec-head { position: relative; text-align: center; margin: 0 0 10px; }
.scenario-book .sb-sec-orn { display: flex; align-items: center; gap: 14px; color: var(--gold); }
.scenario-book .sb-sec-orn::before, .scenario-book .sb-sec-orn::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--rule)); }
.scenario-book .sb-sec-orn::after { background: linear-gradient(90deg, var(--rule), transparent); }
.scenario-book .sb-sec-icon { width: 22px; height: 22px; stroke-width: 1.5; flex: none; }
.scenario-book .sb-sec-head h2 { font-size: 30px; font-weight: 500; margin: 6px 0 0; }
.scenario-book .sb-sec-head .played { position: absolute; right: 0; top: 0; font-family: var(--font-scenario-sans), sans-serif; font-size: 14px; font-weight: 700; background: var(--page); }
.scenario-book section.is-played .sb-sec-head h2 { color: var(--ink-soft); }
@media (max-width: 640px) { .scenario-book .sb-sec-head .played { position: static; margin-top: 8px; } }
```

- [ ] **Step 4: Run tests**

Run: `pnpm test:run components/scenario`
Expected: PASS. Якщо наявний тест шукав `section#sec-s10 h2` з текстом кнопки — тепер `h2` містить лише назву; оновити очікування на `toBe("1.0 Собор")` там, де було `toContain`.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix components/scenario
git add components/scenario
git commit -m "feat(scenario): centred section heading with type icon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Згортання зіграних розділів

**Files:**
- Create: `lib/hooks/scenario/useSectionCollapse.ts`
- Modify: `lib/hooks/scenario/index.ts`
- Modify: `components/scenario/ScenarioPageView.tsx`
- Modify: `components/scenario/scenario-book.css`
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`
- Test: `lib/hooks/scenario/__tests__/useSectionCollapse.test.tsx`, `components/scenario/__tests__/scenario-page-view.test.tsx`

**Interfaces:**
- Consumes: `sectionDone` (Task 1), `createStorageFlag`/`useStorageValue` з `@/lib/hooks/common/storage-value`
- Produces:
  - `type SectionCollapse = { showPlayed: boolean; setShowPlayed: (v: boolean) => void; isExpanded: (id: string) => boolean; expand: (id: string) => void }`
  - `useSectionCollapse(): SectionCollapse` — `isExpanded(id)` = `showPlayed || expanded.has(id)`
  - `ScenarioPageView` новий проп `collapse?: SectionCollapse` (без нього нічого не згортається — інші місця використання не змінюються)

- [ ] **Step 1: Write the failing tests**

`lib/hooks/scenario/__tests__/useSectionCollapse.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useSectionCollapse } from "@/lib/hooks/scenario";

afterEach(() => localStorage.clear());

describe("useSectionCollapse", () => {
  it("розгортає окремий розділ; перемикач розгортає всі й запам'ятовується", () => {
    const { result } = renderHook(() => useSectionCollapse());

    expect(result.current.isExpanded("a")).toBe(false);
    act(() => result.current.expand("a"));
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(false);

    act(() => result.current.setShowPlayed(true));
    expect(result.current.isExpanded("b")).toBe(true);

    const again = renderHook(() => useSectionCollapse());

    expect(again.result.current.showPlayed).toBe(true);
  });
});
```

У `components/scenario/__tests__/scenario-page-view.test.tsx` додати:

```tsx
  const collapse = (over: Partial<SectionCollapse> = {}): SectionCollapse => ({ showPlayed: false, setShowPlayed: vi.fn(), isExpanded: () => false, expand: vi.fn(), ...over });

  it("зіграний розділ згорнутий у рядок; клік розгортає; незіграний не згортається", () => {
    const pg = page("scene");

    pg.content.sections[0].played = true;
    pg.content.sections.push({ id: "s11", title: "1.1 Далі", played: false, rows: [{ id: "r2", story: p("Наступне"), notes: p("") }] });

    const c = collapse();

    const { container } = render(<ScenarioPageView page={pg} campaignId="c" collapse={c} />);

    expect(container.querySelector("#sec-s10 .sb-rows")?.hasAttribute("hidden")).toBe(true);
    expect(container.querySelector("#sec-s11 .sb-rows")?.hasAttribute("hidden")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /1\.0 Собор/ }));
    expect(c.expand).toHaveBeenCalledWith("s10");
  });

  it("розгорнутий через collapse зіграний розділ показує рядки", () => {
    const pg = page("scene");

    pg.content.sections[0].played = true;

    const { container } = render(<ScenarioPageView page={pg} campaignId="c" collapse={collapse({ isExpanded: () => true })} />);

    expect(container.querySelector("#sec-s10 .sb-rows")?.hasAttribute("hidden")).toBe(false);
    expect(container.querySelector("#sec-s10 .sb-sec-collapsed")).toBeNull();
  });

  it("герой: глава з revealedAt згортається", () => {
    const pg = page("hero");

    pg.content.sections[0].revealedAt = "2026-10-21";

    const { container } = render(<ScenarioPageView page={pg} campaignId="c" collapse={collapse()} />);

    expect(container.querySelector("#sec-s10 .sb-rows")?.hasAttribute("hidden")).toBe(true);
  });

  it("без collapse зігране не згортається", () => {
    const pg = page("scene");

    pg.content.sections[0].played = true;

    const { container } = render(<ScenarioPageView page={pg} campaignId="c" />);

    expect(container.querySelector("#sec-s10 .sb-rows")?.hasAttribute("hidden")).toBe(false);
  });
```

(імпорт `import type { ScenarioPlay, SectionCollapse } from "@/lib/hooks/scenario";` замість наявного імпорту `ScenarioPlay`.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/hooks/scenario/__tests__/useSectionCollapse.test.tsx components/scenario/__tests__/scenario-page-view.test.tsx`
Expected: FAIL — хука немає, пропа `collapse` немає.

- [ ] **Step 3: Implement**

`lib/hooks/scenario/useSectionCollapse.ts`:

```ts
"use client";

import { useCallback, useState } from "react";

import { createStorageFlag, useStorageValue } from "@/lib/hooks/common/storage-value";

const showPlayedFlag = createStorageFlag("scenario-show-played", false);

export interface SectionCollapse {
  showPlayed: boolean;
  setShowPlayed: (value: boolean) => void;
  isExpanded: (id: string) => boolean;
  expand: (id: string) => void;
}

/** Розгорнуті вручну розділи живуть до перезавантаження; перемикач «зіграні розгорнуті» — у браузері. */
export function useSectionCollapse(): SectionCollapse {
  const showPlayed = useStorageValue(showPlayedFlag, false);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const expand = useCallback((id: string) => setExpanded((cur) => (cur.has(id) ? cur : new Set(cur).add(id))), []);

  const isExpanded = useCallback((id: string) => showPlayed || expanded.has(id), [showPlayed, expanded]);

  return { showPlayed, setShowPlayed: showPlayedFlag.set, isExpanded, expand };
}
```

`lib/hooks/scenario/index.ts` — додати рядок (за алфавітом):

```ts
export { type SectionCollapse, useSectionCollapse } from "./useSectionCollapse";
```

`components/scenario/ScenarioPageView.tsx`:
- сигнатура: `export function ScenarioPageView({ page, campaignId, progress, play, collapse }: { page: ScenarioPage; campaignId: string; progress?: Progress; play?: ScenarioPlay; collapse?: SectionCollapse })`
- у циклі розділів після `const { done, byPlay } = …`:

```tsx
          const collapsed = !!collapse && done && !collapse.isExpanded(s.id);
```

- `className` секції: `cn(done && "is-played", collapsed && "is-collapsed")`
- рядки розділу завжди рендеряться, загорнуті в `<div className="sb-rows" hidden={collapsed}>…</div>`, а `sb-sec-head` теж лишається в DOM — так друк показує все (CSS нижче);
- коли `collapsed`, перед `sb-sec-head` рендерити:

```tsx
              <div className="sb-sec-collapsed">
                <button type="button" className="sb-sec-expand" aria-expanded={false} onClick={() => collapse?.expand(s.id)}>
                  <span aria-hidden>✓</span>
                  <SectionIcon name={sectionIcon(s)} className="sb-sec-icon" />
                  <span>{s.title}</span>
                  <span aria-hidden>▸</span>
                </button>
                {playedButton}
              </div>
```

Щоб не дублювати кнопку «Зіграно», винести її в змінну `playedButton` перед `return` секції (той самий JSX, що в Task 2).

`components/scenario/scenario-book.css`:

```css
.scenario-book .sb-sec-collapsed { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--rule); }
.scenario-book .sb-sec-expand { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: none; border: 0; padding: 0; font: inherit; font-size: 20px; color: var(--ink-soft); cursor: pointer; text-align: left; }
.scenario-book .sb-sec-expand:hover { color: var(--ink); }
.scenario-book .sb-sec-expand .sb-sec-icon { width: 18px; height: 18px; color: var(--gold); }
.scenario-book .sb-sec-collapsed .played { position: static; font-family: var(--font-scenario-sans), sans-serif; font-size: 14px; font-weight: 700; }
.scenario-book section.is-collapsed { margin-top: 20px; }
.scenario-book section.is-collapsed .sb-sec-head { display: none; }
@media print {
  .scenario-book .sb-sec-collapsed { display: none; }
  .scenario-book section.is-collapsed .sb-sec-head { display: block; }
  .scenario-book .sb-rows[hidden] { display: block !important; }
}
```

`app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`:
- `import { …, useSectionCollapse } from "@/lib/hooks/scenario";`
- у `ScenarioPageBody`: `const collapse = useSectionCollapse();`
- у `progress` для `ScenarioPageView` щойно позначене лишається розгорнутим:

```tsx
          progress={{
            onPlayed: (id, v) => {
              collapse.expand(id);
              void progress.setPlayed(id, v).catch(() => {});
            },
            onRevealed: (id, v) => {
              collapse.expand(id);
              void progress.setRevealed(id, v).catch(() => {});
            },
            pending: progress.isPending,
            played: playedLookup(playedPages),
          }}
          collapse={collapse}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/hooks/scenario components/scenario`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/hooks/scenario components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git add lib/hooks/scenario components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git commit -m "feat(scenario): collapse played sections, keep just-marked ones open

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Бічний зміст з поточним розділом

**Files:**
- Create: `lib/hooks/scenario/useActiveSection.ts`
- Modify: `lib/hooks/scenario/index.ts`
- Create: `components/scenario/ScenarioToc.tsx`
- Create: `components/scenario/ScenarioLayout.tsx`
- Modify: `components/scenario/index.ts`
- Modify: `components/scenario/scenario-book.css`
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`
- Test: `lib/hooks/scenario/__tests__/useActiveSection.test.tsx`, `components/scenario/__tests__/scenario-toc.test.tsx`

**Interfaces:**
- Consumes: `sectionIcon` (Task 1), `sectionDone` (Task 1), `SectionIcon` (Task 2), `SectionCollapse` (Task 3)
- Produces:
  - `pickActiveSection(tops: { id: string; top: number }[], line: number): string | null` — останній розділ, чий верх ≤ `line`; якщо жоден — перший; порожній список — `null`
  - `useActiveSection(ids: string[]): string | null`
  - `type TocItem = { id: string; title: string; icon: SectionIconKey; done: boolean }`
  - `tocItems(sections: ScenarioSection[], isHero: boolean, played?: PlayedLookup): TocItem[]` (в `components/scenario/ScenarioToc.tsx`, експортується)
  - `ScenarioToc({ items, inline, drawer, onPick }: { items: TocItem[]; inline: boolean; drawer: { open: boolean; onOpenChange: (v: boolean) => void }; onPick?: (id: string) => void })`
  - `ScenarioLayout({ toc, children }: { toc: ReactNode; children: ReactNode })`

- [ ] **Step 1: Write the failing tests**

`lib/hooks/scenario/__tests__/useActiveSection.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { pickActiveSection } from "@/lib/hooks/scenario/useActiveSection";

describe("pickActiveSection", () => {
  it("останній розділ, що пройшов лінію під шапкою", () => {
    expect(pickActiveSection([{ id: "a", top: -400 }, { id: "b", top: 100 }, { id: "c", top: 900 }], 150)).toBe("b");
  });

  it("на початку сторінки — перший", () => {
    expect(pickActiveSection([{ id: "a", top: 300 }, { id: "b", top: 900 }], 150)).toBe("a");
  });

  it("порожньо — null", () => {
    expect(pickActiveSection([], 150)).toBeNull();
  });
});
```

`components/scenario/__tests__/scenario-toc.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioToc, tocItems } from "@/components/scenario/ScenarioToc";
import type { ScenarioSection } from "@/types/scenario";

afterEach(cleanup);

const sections: ScenarioSection[] = [
  { id: "s1", title: "Підготовка", played: true, rows: [] },
  { id: "s2", title: "2.0 Два листи", played: false, rows: [] },
];

const drawer = { open: false, onOpenChange: vi.fn() };

describe("ScenarioToc", () => {
  it("tocItems: іконка, ✓ за правилом sectionDone", () => {
    expect(tocItems(sections, false)).toEqual([
      { id: "s1", title: "Підготовка", icon: "prep", done: true },
      { id: "s2", title: "2.0 Два листи", icon: "scene", done: false },
    ]);
  });

  it("inline: список з ✓ і поточним розділом; клік викликає onPick", () => {
    const onPick = vi.fn();

    const { container } = render(<ScenarioToc items={tocItems(sections, false)} inline drawer={drawer} onPick={onPick} />);

    expect(container.querySelector('[data-toc="s1"]')?.getAttribute("data-done")).toBe("true");
    fireEvent.click(screen.getByRole("link", { name: /2\.0 Два листи/ }));
    expect(onPick).toHaveBeenCalledWith("s2");
  });

  it("порожній список не падає", () => {
    const { container } = render(<ScenarioToc items={[]} inline drawer={drawer} />);

    expect(container.querySelector("nav")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/hooks/scenario/__tests__/useActiveSection.test.tsx components/scenario/__tests__/scenario-toc.test.tsx`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Implement**

`lib/hooks/scenario/useActiveSection.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

export function pickActiveSection(tops: { id: string; top: number }[], line: number): string | null {
  if (!tops.length) return null;

  let active = tops[0].id;

  for (const t of tops) if (t.top <= line) active = t.id;

  return active;
}

const stickyLine = () => {
  const style = getComputedStyle(document.querySelector(".scenario-book") ?? document.documentElement);

  const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;

  return px("--app-header-h") + px("--sb-bar-h") + px("--sb-toolbar-h") + 24;
};

/** Поточний розділ — останній, чий верх пройшов лінію під липкою шапкою. */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  const key = ids.join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];

    let frame = 0;

    const update = () => {
      frame = 0;

      const tops = list.flatMap((id) => {
        const el = document.getElementById(`sec-${id}`);

        return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
      });

      setActive(pickActiveSection(tops, stickyLine()));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  return active;
}
```

`lib/hooks/scenario/index.ts` — додати:

```ts
export { useActiveSection } from "./useActiveSection";
```

`components/scenario/ScenarioToc.tsx`:

```tsx
"use client";

import { SectionIcon } from "./SectionIcon";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useActiveSection } from "@/lib/hooks/scenario";
import { cn } from "@/lib/utils";
import { type PlayedLookup, sectionDone } from "@/lib/utils/scenario/reveal";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioSection, SectionIconKey } from "@/types/scenario";

export interface TocItem {
  id: string;
  title: string;
  icon: SectionIconKey;
  done: boolean;
}

export function tocItems(sections: ScenarioSection[], isHero: boolean, played?: PlayedLookup): TocItem[] {
  return sections.map((s) => ({ id: s.id, title: s.title, icon: sectionIcon(s), done: sectionDone(s, isHero, played).done }));
}

type Props = { items: TocItem[]; inline: boolean; drawer: { open: boolean; onOpenChange: (open: boolean) => void }; onPick?: (id: string) => void };

function TocList({ items, onPick }: { items: TocItem[]; onPick: (id: string) => void }) {
  const active = useActiveSection(items.map((i) => i.id));

  return (
    <nav aria-label="Розділи" className="sb-toc-list">
      {items.map((i) => (
        <a key={i.id} href={`#sec-${i.id}`} data-toc={i.id} data-done={i.done || undefined} aria-current={active === i.id ? "location" : undefined} className={cn(active === i.id && "is-active")} onClick={() => onPick(i.id)}>
          <SectionIcon name={i.icon} className="sb-toc-icon" />
          <span className="sb-toc-title">{i.title}</span>
          {i.done && <span className="sb-toc-done" aria-label="зіграно">✓</span>}
        </a>
      ))}
    </nav>
  );
}

export function ScenarioToc({ items, inline, drawer, onPick }: Props) {
  const pick = (id: string) => {
    onPick?.(id);
    drawer.onOpenChange(false);
  };

  if (inline) return <aside className="sb-toc"><TocList items={items} onPick={pick} /></aside>;

  return (
    <ResponsiveDialog hud open={drawer.open} onOpenChange={drawer.onOpenChange} title="Розділи" size="sm">
      <div className="scenario-book sb-toc-drawer"><TocList items={items} onPick={pick} /></div>
    </ResponsiveDialog>
  );
}
```

Примітка: `data-done={i.done || undefined}` рендериться як `data-done="true"`. `size="sm"` є в `SIZE_CLASS` (`components/ui/responsive-dialog.tsx`).

`components/scenario/ScenarioLayout.tsx`:

```tsx
import type { ReactNode } from "react";

export function ScenarioLayout({ toc, children }: { toc: ReactNode; children: ReactNode }) {
  return (
    <div className="sb-layout">
      {toc}
      <div className="sb-content">{children}</div>
    </div>
  );
}
```

`components/scenario/index.ts` — додати `export { ScenarioLayout } from "./ScenarioLayout";` і `export { ScenarioToc, type TocItem, tocItems } from "./ScenarioToc";`.

`components/scenario/scenario-book.css`:

```css
.scenario-book .sb-layout { display: flex; justify-content: center; gap: 32px; max-width: 1460px; margin: 0 auto; }
.scenario-book .sb-content { flex: 1 1 auto; min-width: 0; max-width: 1180px; }
.scenario-book .sb-toc { flex: 0 0 220px; position: sticky; top: calc(var(--app-header-h, 89px) + var(--sb-bar-h, 49px) + var(--sb-toolbar-h, 0px) + 16px); align-self: flex-start; max-height: calc(100vh - var(--app-header-h, 89px) - var(--sb-bar-h, 49px) - var(--sb-toolbar-h, 0px) - 32px); overflow-y: auto; padding: 56px 0 24px 16px; }
.scenario-book .sb-toc-list { display: flex; flex-direction: column; gap: 2px; font-family: var(--font-scenario-sans), system-ui, sans-serif; font-size: 14px; }
.scenario-book .sb-toc-list a { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; color: var(--ink-soft); text-decoration: none; border-left: 2px solid transparent; }
.scenario-book .sb-toc-list a:hover { color: var(--ink); background: var(--margin); }
.scenario-book .sb-toc-list a.is-active { color: var(--blood); border-left-color: var(--blood); background: var(--tint-blood); }
.scenario-book .sb-toc-list a[data-done] .sb-toc-title { color: var(--ink-soft); opacity: 0.75; }
.scenario-book .sb-toc-icon { width: 16px; height: 16px; flex: none; color: var(--gold); }
.scenario-book .sb-toc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scenario-book .sb-toc-done { color: var(--gold); font-weight: 700; }
.sb-toc-drawer { background: transparent; font-size: 16px; }
@media print { .scenario-book .sb-toc { display: none; } }
```

`page-client.tsx`:
- імпорти: `ScenarioLayout, ScenarioToc, tocItems` з `@/components/scenario`; `useMediaQuery` з `@/lib/hooks/common`.
- стан: `const [tocOpen, setTocOpen] = useState(false);`, `const wide = useMediaQuery("(min-width: 1200px)");`, `const tocInline = wide && !(aiEnabled && aiOpen);`
- обгорнути режим читання:

```tsx
        <ScenarioLayout
          toc={<ScenarioToc items={tocItems(page.content.sections, page.kind === "hero", playedLookup(playedPages))} inline={tocInline} drawer={{ open: tocOpen, onOpenChange: setTocOpen }} onPick={collapse.expand} />}
        >
          <ScenarioPageView … />
        </ScenarioLayout>
```

(`collapse.expand` викликається в `onClick` до переходу за якорем; React перерендерить розділ розгорнутим до завершення плавної прокрутки — Review Focus 3. Тест додати в `scenario-toc.test.tsx` уже покриває виклик `onPick`; інтеграційний — Step 4.)

Тимчасово кнопка відкриття висувної панелі — у Task 5 (смуга). До того `tocOpen` ніхто не змінює — це нормально між задачами.

- [ ] **Step 4: Integration test** — у `components/scenario/__tests__/scenario-toc.test.tsx` додати:

```tsx
  it("клік по пункту в панелі закриває панель", () => {
    const onOpenChange = vi.fn();

    render(<ScenarioToc items={tocItems(sections, false)} inline={false} drawer={{ open: true, onOpenChange }} onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole("link", { name: /Підготовка/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
```

Run: `pnpm test:run lib/hooks/scenario components/scenario`
Expected: PASS. (Якщо `ResponsiveDialog` у happy-dom потребує `ConfirmProvider`/`matchMedia` — дивись, як це зроблено в `components/ui/__tests__/`, і повтори той самий мок.)

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix lib/hooks/scenario components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git add lib/hooks/scenario components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git commit -m "feat(scenario): side table of contents with active section

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Однорядкова смуга з меню «⋯»

**Files:**
- Modify: `components/scenario/ScenarioBar.tsx`
- Modify: `components/scenario/scenario-book.css` (блок `.sb-bar*`, медіа-запит 860px)
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`
- Test: `components/scenario/__tests__/scenario-bar.test.tsx` (new)

**Interfaces:**
- Consumes: `ActionsMenu`, `ActionsMenuItem` з `@/components/common/ActionsMenu`; `SectionCollapse` (Task 3)
- Produces: `ScenarioBar({ title, notes, toc, actions, menu }: { title: string; notes: { hidden: boolean; toggle: () => void }; toc?: { onOpen: () => void }; actions?: ReactNode; menu: ActionsMenuItem[] })` — `toc` задано лише коли зміст не вбудований (тоді показується «☰ Розділи»).

- [ ] **Step 1: Write the failing test** — `components/scenario/__tests__/scenario-bar.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { History } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioBar } from "@/components/scenario";

afterEach(cleanup);

describe("ScenarioBar", () => {
  it("назва, перемикач нотаток, дії, «☰ Розділи» лише коли передано toc", () => {
    const toggle = vi.fn();

    const onOpen = vi.fn();

    const { rerender } = render(<ScenarioBar title="Викрадення" notes={{ hidden: false, toggle }} actions={<button type="button">Редагувати</button>} menu={[{ label: "Версії", icon: History, onSelect: vi.fn() }]} />);

    expect(screen.getByText("Викрадення")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Розділи/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Сховати нотатки" }));
    expect(toggle).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ще" })).toBeTruthy();

    rerender(<ScenarioBar title="Викрадення" notes={{ hidden: true, toggle }} toc={{ onOpen }} menu={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Розділи/ }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Показати нотатки" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run components/scenario/__tests__/scenario-bar.test.tsx`
Expected: FAIL — старі пропси.

- [ ] **Step 3: Implement**

`components/scenario/ScenarioBar.tsx`:

```tsx
"use client";

import { type ReactNode, useRef } from "react";
import { List } from "lucide-react";

import { ActionsMenu, type ActionsMenuItem } from "@/components/common/ActionsMenu";
import { useCssVarHeight } from "@/lib/hooks/common";

type Props = { title: string; notes: { hidden: boolean; toggle: () => void }; toc?: { onOpen: () => void }; actions?: ReactNode; menu: ActionsMenuItem[] };

export function ScenarioBar({ title, notes, toc, actions, menu }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useCssVarHeight(ref, "--sb-bar-h");

  useCssVarHeight(ref, "--app-header-h", "header");

  return (
    <div ref={ref} className="sb-bar">
      <div className="sb-bar-in">
        {toc && (
          <button type="button" className="toggle sb-bar-toc" onClick={toc.onOpen}>
            <List className="size-4" /> Розділи
          </button>
        )}
        <strong>{title}</strong>
        <div className="sb-bar-btns">
          <button type="button" className="toggle" aria-pressed={notes.hidden} onClick={notes.toggle}>
            {notes.hidden ? "Показати нотатки" : "Сховати нотатки"}
          </button>
          {actions}
          {menu.length > 0 && <ActionsMenu actions={menu} label="Ще" triggerClassName="toggle sb-bar-more" />}
        </div>
      </div>
    </div>
  );
}
```

CSS — замінити правила `.sb-bar-in`, `.sb-bar nav*`, `.sb-bar-btns` і відповідні рядки в `@media (max-width: 860px)`:

```css
.scenario-book .sb-bar-in { max-width: 1460px; margin: 0 auto; padding: 8px 24px; display: flex; gap: 12px; align-items: center; font-family: var(--font-scenario-sans), system-ui, sans-serif; font-size: 15px; }
.scenario-book .sb-bar strong { font-size: 17px; margin-right: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-scenario-serif), serif; }
.scenario-book .sb-bar-btns { display: flex; gap: 8px; align-items: center; flex: none; }
.scenario-book .sb-bar-toc { display: inline-flex; align-items: center; gap: 6px; flex: none; }
.scenario-book .sb-bar-more { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.scenario-book .sb-bar .toggle.is-primary { border-color: var(--blood); color: var(--blood); font-weight: 700; }
```

у `@media (max-width: 860px)` замінити рядки про `.sb-bar nav*` / `.sb-bar-btns` на:

```css
  .scenario-book .sb-bar-in { gap: 8px; padding: 6px 16px; font-size: 14px; }
  .scenario-book .sb-bar-btns { overflow-x: auto; flex: 0 1 auto; min-width: 0; }
  .scenario-book .sb-bar-btns > * { flex: none; white-space: nowrap; }
  .scenario-book .sb-bar-btns .toggle { padding: 2px 8px; font-size: 13px; }
```

`page-client.tsx`:
- прибрати `Версії` і `До змісту` з `actions`; кнопку «Редагувати» позначити `className="toggle is-primary"`.
- імпорти іконок: `import { BookOpen, ChevronsUpDown, History, Moon, Sun } from "lucide-react";` і `type ActionsMenuItem` з `@/components/common/ActionsMenu`.
- меню:

```tsx
  const menu: ActionsMenuItem[] = [
    { label: theme === "dark" ? "Світла тема" : "Темна тема", icon: theme === "dark" ? Sun : Moon, onSelect: () => setTheme((t) => (t === "dark" ? "light" : "dark")) },
    ...(editBase ? [] : [{ label: "Версії", icon: History, onSelect: () => setVersionsOpen(true) }]),
    { label: collapse.showPlayed ? "Згорнути зіграні" : "Розгорнути зіграні", icon: ChevronsUpDown, onSelect: () => collapse.setShowPlayed(!collapse.showPlayed) },
    { label: "До змісту", icon: BookOpen, href: `/campaigns/${campaignId}/dm/scenario`, separatorBefore: true },
  ];
```

- виклик смуги:

```tsx
      <ScenarioBar
        title={page.title}
        notes={{ hidden: hideNotes, toggle: () => setHideNotes((v) => !v) }}
        toc={tocInline ? undefined : { onOpen: () => setTocOpen(true) }}
        actions={actions}
        menu={menu}
      />
```

- [ ] **Step 4: Run tests**

Run: `pnpm test:run components/scenario "app/campaigns/[id]/dm/scenario"`
Expected: PASS. Якщо інші тести рендерили `ScenarioBar` зі старими пропсами — оновити їх на нову форму (`rg -l "ScenarioBar" components app --glob '*test*'`).

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git add components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git commit -m "feat(scenario): one-row bar with sections button and more menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Редактор — вибір іконки й зміст

**Files:**
- Modify: `components/scenario/editor/SectionHeaderEditor.tsx`
- Modify: `components/scenario/editor/ScenarioEditor.tsx`
- Modify: `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx`
- Modify: `components/scenario/scenario-book.css`
- Test: `components/scenario/editor/__tests__/section-header-editor.test.tsx` (new)

**Interfaces:**
- Consumes: `SECTION_ICON_KEYS`, `SECTION_ICON_LABELS`, `sectionIcon` (Task 1); `SectionIcon` (Task 2); `ScenarioLayout`, `ScenarioToc`, `tocItems` (Task 4)
- Produces:
  - `SectionHeaderEditor` `actions` отримує `onIcon: (icon: SectionIconKey | undefined) => void`
  - `ScenarioEditor` новий проп `toc: { inline: boolean; drawer: { open: boolean; onOpenChange: (v: boolean) => void } }`

- [ ] **Step 1: Write the failing test** — `components/scenario/editor/__tests__/section-header-editor.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionHeaderEditor } from "@/components/scenario/editor/SectionHeaderEditor";
import type { ScenarioSection } from "@/types/scenario";

afterEach(cleanup);

const section: ScenarioSection = { id: "s1", title: "2.3 Орлине Гніздо", played: false, rows: [{ id: "r", story: { type: "doc", content: [] }, notes: { type: "doc", content: [] }, battleId: "b" }] };

const open = () => {
  const trigger = screen.getByRole("button", { name: /Іконка розділу/ });

  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.keyDown(trigger, { key: "Enter" });
};

describe("SectionHeaderEditor", () => {
  it("показує автоматичну іконку і дозволяє обрати іншу або повернути авто", () => {
    const onIcon = vi.fn();

    const actions = { onTitle: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(), onIcon };

    const { container, rerender } = render(<SectionHeaderEditor section={section} actions={actions} />);

    expect(container.querySelector("[data-section-icon]")?.getAttribute("data-section-icon")).toBe("battle");
    open();
    fireEvent.click(screen.getByRole("menuitem", { name: /Відпочинок/ }));
    expect(onIcon).toHaveBeenCalledWith("rest");

    rerender(<SectionHeaderEditor section={{ ...section, icon: "rest" }} actions={actions} />);
    open();
    fireEvent.click(screen.getByRole("menuitem", { name: /Автоматично/ }));
    expect(onIcon).toHaveBeenLastCalledWith(undefined);
  });
});
```

(Radix DropdownMenu у happy-dom відкривається через `pointerDown`/`Enter`; якщо ні — подивись, як відкривають меню в наявних тестах: `rg -l "menuitem" components --glob '*test*'`, і повтори.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run components/scenario/editor/__tests__/section-header-editor.test.tsx`
Expected: FAIL — немає кнопки «Іконка розділу».

- [ ] **Step 3: Implement**

`components/scenario/editor/SectionHeaderEditor.tsx`:

```tsx
"use client";

import { OrderButtons } from "./OrderButtons";

import { SectionIcon } from "@/components/scenario/SectionIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SECTION_ICON_KEYS, SECTION_ICON_LABELS } from "@/lib/constants/scenario";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioSection, SectionIconKey } from "@/types/scenario";

type Actions = { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; onIcon: (icon: SectionIconKey | undefined) => void };

export function SectionHeaderEditor({ section, actions }: { section: ScenarioSection; actions: Actions }) {
  return (
    <h2 className="sb-sec-edit">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="toggle sb-icon-pick" aria-label={`Іконка розділу: ${section.icon ? SECTION_ICON_LABELS[section.icon] : "автоматично"}`}>
            <SectionIcon name={sectionIcon(section)} className="sb-sec-icon" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => actions.onIcon(undefined)}>Автоматично</DropdownMenuItem>
          <DropdownMenuSeparator />
          {SECTION_ICON_KEYS.map((key) => (
            <DropdownMenuItem key={key} onSelect={() => actions.onIcon(key)}>
              <SectionIcon name={key} className="size-4" /> {SECTION_ICON_LABELS[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <input aria-label="Назва розділу" value={section.title} maxLength={200} onChange={(e) => actions.onTitle(e.target.value)} style={{ font: "inherit", background: "transparent", color: "inherit", border: 0, flex: 1, minWidth: 0 }} />
      <OrderButtons
        labels={{ up: `Розділ вгору: ${section.title}`, down: `Розділ вниз: ${section.title}`, remove: `Видалити розділ: ${section.title}` }}
        onMove={actions.onMove}
        onRemove={actions.onRemove}
      />
    </h2>
  );
}
```

`components/scenario/editor/ScenarioEditor.tsx`:
- проп `toc` у сигнатурі (тип з Interfaces);
- у `actions` для `SectionHeaderEditor` додати `onIcon: (icon) => draft.setContent((c) => updateSection(c, s.id, { icon }))`. `updateSection(c, sectionId, patch: Partial<Omit<ScenarioSection, "id" | "rows">>)` (`lib/utils/scenario/structure.ts:36`) приймає `icon`; `icon: undefined` лишає ключ зі значенням `undefined`, який JSON-серіалізація при збереженні прибирає.
- обгорнути `<header className="title">…</header><main>…</main>` у

```tsx
      <ScenarioLayout toc={<ScenarioToc items={tocItems(draft.content.sections, isHero)} inline={toc.inline} drawer={toc.drawer} />}>
        …
      </ScenarioLayout>
```

(імпорт `ScenarioLayout`, `ScenarioToc`, `tocItems` з `@/components/scenario`. Перевір `import/no-cycle`: `components/scenario/index.ts` не імпортує `editor`, тож циклу немає.)

`page-client.tsx` — передати редактору `toc={{ inline: tocInline, drawer: { open: tocOpen, onOpenChange: setTocOpen } }}`.

CSS:

```css
.scenario-book .sb-sec-edit { display: flex; gap: 12px; align-items: center; font-size: 30px; font-weight: 500; margin: 0 0 6px; padding-bottom: 10px; border-bottom: 1px solid var(--rule); }
.scenario-book .sb-icon-pick { width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--gold); flex: none; }
```

Перевір, що в `ScenarioEditor` старий `section > h2` більше не стилізується правилом, прибраним у Task 2 (заголовок редактора тепер `.sb-sec-edit`).

- [ ] **Step 4: Run tests**

Run: `pnpm test:run components/scenario`
Expected: PASS (включно з наявними тестами редактора).

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git add components/scenario "app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx"
git commit -m "feat(scenario): section icon picker and TOC in the editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Атмосфера «Рукопис», документація, перевірка

**Files:**
- Modify: `components/scenario/scenario-book.css`
- Modify: `docs/architecture/README.md` або профільний файл про сценарій (знайди: `rg -ln "Сценарій|scenario" docs/architecture`), `docs/STATUS.md`
- Move (наприкінці гілки, при злитті): спека й план → `docs/archive/superpowers/`

**Interfaces:** без нових.

- [ ] **Step 1: CSS атмосфери** — додати/змінити в `scenario-book.css`:

```css
.scenario-book { background-image: radial-gradient(color-mix(in srgb, var(--ink) 4%, transparent) 1px, transparent 1px); background-size: 3px 3px; }
.scenario-book .read > p:first-child::first-letter { float: left; font-size: 3.1em; line-height: 0.85; margin: 0.06em 0.08em 0 0; color: var(--blood); font-style: normal; font-weight: 500; }
.scenario-book .notes { border: 1px solid var(--rule); }
.scenario-book .row { grid-template-columns: minmax(0, 1fr) 320px; }
.scenario-book section + section::before { content: "· ❖ ·"; display: block; text-align: center; color: var(--rule); letter-spacing: 0.5em; margin: -28px 0 28px; font-size: 14px; }
.scenario-book section.is-collapsed + section::before, .scenario-book section + section.is-collapsed::before { content: none; }
@media print { .scenario-book { background-image: none; } }
```

Видалити старе правило `.scenario-book .row { … grid-template-columns: minmax(0, 1fr) 300px; … }` лише в частині колонок (решта властивостей лишається) — щоб не було двох конфліктних `grid-template-columns`.

- [ ] **Step 2: Повний прогін і лінт**

Run: `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit -p .`
Expected: усе зелене.

- [ ] **Step 3: Перевірка в браузері на prodcopy** (`pnpm dev`, сторінка `/campaigns/cmuylhk0c0001ia06lg5eommv/dm/scenario/cmvh1wuqk0003eyx2wtz2vvzv`):
- десктоп ≥ 1200 px: зміст ліворуч, підсвічується під час прокрутки, ✓ біля зіграних; клік на згорнутий розділ розгортає і прокручує;
- «Зіграно» на розділі — розділ лишається розгорнутим; після перезавантаження — згорнутий; «⋯ → Розгорнути зіграні» — усе розгорнуто, переживає перезавантаження;
- ширина 390 px: «☰ Розділи» відкриває нижню панель, клік закриває її й прокручує;
- світла й темна тема; AI-панель відкрита — зміст ховається під «☰ Розділи»;
- режим редагування: зміст, вибір іконки змінює її в заголовку й у змісті після автозбереження;
- друк (попередній перегляд): без змісту, без зерна, зіграні розділи надруковані повністю.

- [ ] **Step 4: Документація** — у профільному файлі `docs/architecture` (сценарій) коротко: `section.icon` (JSON, без міграції), правила `sectionIcon`, `sectionDone` як єдине правило «зіграності», згорнуті розділи ховаються атрибутом `hidden` (друк показує все), ключ localStorage `scenario-show-played`. У `docs/STATUS.md` — рядок про завершення.

- [ ] **Step 5: Commit**

```bash
git add components/scenario/scenario-book.css docs
git commit -m "feat(scenario): manuscript atmosphere; docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
