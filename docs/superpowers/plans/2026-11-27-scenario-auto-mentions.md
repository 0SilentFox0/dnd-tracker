# Scenario auto-mentions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Library entity names typed in the DM scenario editor become mention chips automatically (live, undoable) and via a «Тегнути збіги» button for whole pages.

**Architecture:** One DM-only endpoint returns all mentionable names; a TanStack Query hook builds a pure `AutoMentionIndex`; a pure matcher (`lib/utils/scenario/auto-mentions.ts`) drives both a TipTap plugin (live) and a doc/content walker (button) built on the generalised `wrap-mentions.ts`.

**Tech Stack:** Next.js 16 route handlers, Prisma, TanStack Query, TipTap 3 / ProseMirror (`prosemirror-history` via `@tiptap/pm/history`), Vitest (+happy-dom), next-intl.

**Spec:** `docs/superpowers/specs/2026-11-27-scenario-auto-mentions-design.md`

## Global Constraints

- Work in worktree `/Users/silentfox/Work/dnd-tracker-automention`, branch `feat/scenario-auto-mentions`.
- Sources: `unit`, `artifact`, `character` (with `ACTIVE_CHARACTER`), `acquaintance` only.
- Min name length 3 letters; names shared by >1 entity (case-insensitive, any type) are never auto-tagged.
- Ending rule per word: exact word + `\p{L}{0,3}`; if the word has ≥4 letters and ends in one of `а я о е є й ь`, that one letter may be dropped before the ending. First letter of the phrase case-insensitive, rest exact. Word separator `[\s ]+`.
- Boundaries: before — not `\p{L}\p{N}_@`; after — not `\p{L}\p{N}_`.
- Never tag inside an existing mention or text with `code`/`link` marks.
- Layering: components never import `@/lib/api/*`; query keys via `scenarioKeys`; `route.ts` thin; errors via `handleApiError`. No Cyrillic in code (ESLint) — tests may contain Cyrillic strings only if existing tests do (they do: `extensions.test.ts`). English-only comments, minimal.
- Imports via `@/…`. Hook exported from `lib/hooks/scenario/index.ts` barrel.
- Per repo rules: agents write tests and run only the touched test files (`pnpm test:run <file>`); no full suite per task. Lint touched files: `pnpm exec eslint --fix <files>`.

## Review Focus

1. A name typed right after `@` (suggestion in progress) must not be auto-converted → Task 3 test «@Зехір + space stays text».
2. Undo after live conversion must restore plain text and keep the typed space → Task 3 test.
3. Index still loading (getter returns null) — typing must work normally → Task 3 test.
4. Button on a page where text already contains a chip for the same name — no double chip → Task 1 test «existing mention untouched».
5. Text spanning bold/secret marks inside a name ("**Зе**хір") — chip keeps only common marks, no crash → Task 1 test.

---

### Task 1: Pure matcher + generalised wrapper

**Files:**
- Modify: `lib/utils/scenario/wrap-mentions.ts`
- Create: `lib/utils/scenario/auto-mentions.ts`
- Test: `lib/utils/scenario/__tests__/auto-mentions.test.ts` (existing `wrap-mentions.test.ts` must stay green unchanged)

**Interfaces — Produces:**
```ts
// wrap-mentions.ts (new export; wrapMentions keeps its signature and becomes a thin wrapper)
export type ResolveMatch = (match: string) => MentionTarget & { label?: string } | null;
export function wrapDoc(doc: RichDoc, re: RegExp, resolve: ResolveMatch): { doc: RichDoc; count: number };

// auto-mentions.ts
export const AUTO_MENTION_TYPES = ['unit', 'artifact', 'character', 'acquaintance'] as const satisfies readonly MentionType[];
export interface AutoMentionIndex { re: RegExp; tailRe: RegExp; entries: AutoEntry[] }
type AutoEntry = { option: MentionOption; nameLen: number; full: RegExp };
export function buildAutoMentionIndex(options: MentionOption[]): AutoMentionIndex | null; // null when nothing taggable
export function resolveAutoMention(index: AutoMentionIndex, text: string): MentionOption | null;
export function findAutoMentionAtEnd(index: AutoMentionIndex, textBefore: string): { from: number; text: string; option: MentionOption } | null;
export function autoTagDoc(doc: RichDoc, index: AutoMentionIndex): { doc: RichDoc; count: number };
export function autoTagContent(content: ScenarioContent, index: AutoMentionIndex): { content: ScenarioContent; count: number };
```

Decisions:
- `wrapRun`/`wrapNodes` take `resolve` instead of `(accept, target)`; a match whose `resolve` returns null is skipped (left as text, not counted). `wrapMentions(doc, forms, target)` = `wrapDoc(doc, buildFormsPattern(forms), m => caseAccept(forms)(m) ? target : null)`.
- In `wrapNodes`, a `text` node whose marks include `code` or `link` flushes the run and is pushed as-is (not matched).
- Chip label = matched text (as `wrapMentions` does today).
- Pattern per name: split on whitespace; word → `escapeRe(stem) + optional dropped vowel handled as `(?:<vowel>|)` … simplest: `escapeRe(word) + '\\p{L}{0,3}'`, or when the drop rule applies `escapeRe(word.slice(0,-1)) + '\\p{L}{0,3}'` (covers exact form since the vowel is a letter). First char → `[Xx]` class (`[${upper}${lower}]`, escaped). Join words with `[\\s\\u00a0]+`.
- `re` = `new RegExp('(?<![\\p{L}\\p{N}_@])(?:' + alts sortedByNameLengthDesc + ')(?![\\p{L}\\p{N}_])', 'gu')`; `tailRe` = same with `$` before the closing (no `g`). `full` per entry = `^(?:pattern)$` with flag `u`.
- `resolveAutoMention`: entries whose `full` tests the text; keep those with max `nameLen`; distinct ids === 1 → that option, else null.
- `findAutoMentionAtEnd`: `tailRe.exec(textBefore)` → resolve → `{ from: m.index, text: m[0], option }`.
- Ambiguity: group by `name.trim().toLowerCase()`; groups with >1 option dropped. Names with `Array.from(name.trim()).length < 3` dropped. Options whose type is not in `AUTO_MENTION_TYPES` dropped.
- `autoTagContent` maps `sections[].rows[].story|notes` via `autoTagDoc`, summing counts; returns the same object when count is 0.

- [ ] **Step 1: Write failing tests** — cases (index built from `[{unit u1 'Грифон'}, {character c1 'Зехір'}, {acquaintance a1 'Ізабелла'}, {unit u2 'Королівський грифон'}, {unit u3 'Привид'}, {acquaintance a2 'Привид'}, {artifact r1 'Лук'}, {acquaintance a3 'Лука'}, {unit u4 'Ед'}, {spell s1 'Щит'}]`):
  - `autoTagDoc` on paragraph «Зехіра, Зехіру і Зехіром» → 3 chips id c1, labels = forms; «Зехірович» → 0.
  - «зехір» tagged; «ЗЕХІР» not.
  - «Ізабелли» / «Ізабеллою» → a1.
  - «Королівського грифона» → one chip u2 (not u1); «грифон» alone → u1.
  - «Привид» → not tagged (ambiguous); «Ед» → not tagged (short); «Щит» → not tagged (spell excluded).
  - «Лука» → a3; «Лук» → r1.
  - «@Зехір» → not tagged.
  - existing `mention` node with label «Зехір» + text « і Зехір» → only the text one becomes a chip (count 1).
  - text with `link` mark «Зехір» → untouched.
  - «Зе» (bold) + «хір» → one chip, no bold mark on it; «Зехір» all `secret` → chip keeps `secret`.
  - `findAutoMentionAtEnd(index, 'Бачу Зехіра')` → `{ from: 5, text: 'Зехіра', option c1 }`; `'Зехіра бачу'` → null.
  - `autoTagContent` over 2 sections × story/notes sums counts; count 0 returns same reference.
  - `buildAutoMentionIndex([])` → null.
- [ ] **Step 2:** `pnpm test:run lib/utils/scenario/__tests__/auto-mentions.test.ts` → FAIL.
- [ ] **Step 3:** Implement (refactor `wrap-mentions.ts` first, then `auto-mentions.ts`).
- [ ] **Step 4:** `pnpm test:run lib/utils/scenario/__tests__/auto-mentions.test.ts lib/utils/scenario/__tests__/wrap-mentions.test.ts lib/utils/scenario/__tests__/mentions.test.ts` → PASS; `pnpm test:related lib/utils/scenario/wrap-mentions.ts` → PASS.
- [ ] **Step 5:** eslint --fix touched files; commit `feat(scenario): auto-mention matcher`.

### Task 2: Name index endpoint + hook

**Files:**
- Modify: `lib/server/scenario/mentions.ts` (add `listScenarioMentionNames`)
- Create: `app/api/campaigns/[id]/scenario/mention-names/route.ts`, `.../mention-names/mention-names-handler.ts`, `.../mention-names/__tests__/mention-names-handler.test.ts`
- Modify: `lib/api/scenario.ts` (`getMentionNames`), `lib/hooks/scenario/keys.ts` (`mentionNames: (campaignId) => ['scenario-mention-names', campaignId] as const`), `lib/hooks/scenario/index.ts`
- Create: `lib/hooks/scenario/useAutoMentionIndex.ts`

**Interfaces — Consumes:** `buildAutoMentionIndex`, `AutoMentionIndex` (Task 1). **Produces:**
```ts
export async function listScenarioMentionNames(campaignId: string): Promise<MentionOption[]>; // unit, artifact, character(ACTIVE_CHARACTER), acquaintance; select id,name; no take
export async function mentionNamesHandler(campaignId: string): Promise<Response>; // requireDM → NextResponse.json(options); catch → handleApiError(error, { action: 'list scenario mention names' })
export const getMentionNames = (campaignId: string) => campaignGet<MentionOption[]>(campaignId, '/scenario/mention-names');
export function useAutoMentionIndex(campaignId: string): AutoMentionIndex | null;
// useQuery({ queryKey: scenarioKeys.mentionNames(campaignId), queryFn, staleTime: 10*60_000, refetchOnWindowFocus: false, select: buildAutoMentionIndex }); return data ?? null
```

- [ ] **Step 1:** Handler test (mock `@/lib/utils/api/api-auth` `requireDM` and `@/lib/server/scenario/mentions`, pattern of `search-handler.test.ts`): DM → 200 + JSON array; `requireDM` returns `NextResponse.json({error:'x'},{status:403})` → 403 and list fn not called.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement all files. **Step 4:** run → PASS.
- [ ] **Step 5:** eslint --fix; commit `feat(scenario): mention name index endpoint`.

### Task 3: Live auto-mention TipTap extension

**Files:**
- Create: `components/scenario/editor/rich-text/auto-mention.ts`
- Modify: `components/scenario/editor/rich-text/extensions.ts` (`buildExtensions(searchMentions, getAutoIndex?: () => AutoMentionIndex | null)`; add `AutoMention.configure({ getIndex })` only when provided), `RichTextEditor.tsx` (new optional prop `autoMentionIndex: AutoMentionIndex | null`; keep it in a ref updated each render, pass `() => ref.current` so extensions are not rebuilt), `rows/ScenarioCell.tsx` (forward prop)
- Test: `components/scenario/editor/rich-text/__tests__/auto-mention.test.ts` (`// @vitest-environment happy-dom`, real `Editor` like `extensions.test.ts`)

**Interfaces — Consumes:** `findAutoMentionAtEnd`, `AutoMentionIndex` (Task 1). **Produces:** `export const AutoMention: Extension<{ getIndex: () => AutoMentionIndex | null }>`; `export function convertMentionBeforeCursor(view: EditorView, getIndex): boolean`.

Decisions (non-obvious code):
```ts
const BOUNDARY = /^[\s.,;:!?)»"'…]$/u;
export function convertMentionBeforeCursor(view, getIndex): boolean {
  const index = getIndex();
  const { state } = view;
  const { $from, empty } = state.selection;
  if (!index || !empty || !$from.parent.isTextblock) return false;
  const start = $from.start();
  const textBefore = state.doc.textBetween(start, $from.pos, '\n', '￼');
  const hit = findAutoMentionAtEnd(index, textBefore);
  if (!hit) return false;
  const from = start + hit.from; const to = $from.pos;
  const blocked = ['code', 'link'].map((n) => state.schema.marks[n]).filter(Boolean);
  if (blocked.some((m) => state.doc.rangeHasMark(from, to, m))) return false;
  const nodeMarks: Mark[][] = [];
  state.doc.nodesBetween(from, to, (n) => { if (n.isText) nodeMarks.push([...n.marks]); });
  const common = nodeMarks.reduce((acc, ms) => acc.filter((m) => ms.some((x) => x.eq(m))));
  const node = state.schema.nodes.mention.create({ id: hit.option.id, label: hit.text, type: hit.option.type }, null, common);
  view.dispatch(closeHistory(state.tr.replaceWith(from, to, node)));
  return true;
}
// plugin props:
handleTextInput(view, from, to, text) { if (BOUNDARY.test(text)) convertMentionBeforeCursor(view, getIndex); return false; } // default insertion proceeds with updated state
handleKeyDown(view, e) { if (e.key === 'Enter' && !e.shiftKey) convertMentionBeforeCursor(view, getIndex); return false; }
```
- Must not fire while the `@` suggestion is active: the `@` lookbehind already prevents «@Зехір»; additionally skip when the suggestion plugin state is active (`view.state` plugin key of the Mention suggestion — check `@tiptap/suggestion` exported key / mention extension's `suggestion.pluginKey`; if not trivially reachable, the lookbehind alone is acceptable).
- Because `handleTextInput` returns false after dispatching, verify ProseMirror then inserts the typed char at the (mapped) cursor; if `from/to` arguments are stale, instead insert the char ourselves in a second dispatch (`view.dispatch(view.state.tr.insertText(text))`) and return true. The test decides.
- `closeHistory` from `@tiptap/pm/history`. Undo event boundary: the conversion is its own history event; the space typed after it belongs to the next one. Expected: after `undo()` once the chip is gone and text is `Зехір ` or `Зехір` — pin whichever ProseMirror yields, but the chip must be gone and the name text back.

- [ ] **Step 1:** Tests (helper `typeText(editor, s)` calling `view.someProp('handleTextInput', f => f(view, from, to, ch))` per char and falling back to `insertText` when not handled; Enter via `view.someProp('handleKeyDown', f => f(view, new KeyboardEvent('keydown', {key:'Enter'})))`):
  - type «Бачу Зехір » → doc contains mention c1 label «Зехір» and trailing space text.
  - then `editor.commands.undo()` → no mention, text contains «Зехір».
  - «Зехіра,» → mention label «Зехіра» followed by «,».
  - getIndex → null: «Зехір » stays text.
  - «Привид » (ambiguous) stays text; «@Зехір » stays text.
  - «Зехір» + Enter → mention, then new paragraph.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run this file + `extensions.test.ts` + `mention-suggestion.test.ts` → PASS.
- [ ] **Step 5:** eslint --fix; commit `feat(scenario): live auto-mentions in editor`.

### Task 4: Toolbar button, wiring, i18n, whats-new, docs

**Files:**
- Modify: `components/scenario/editor/ScenarioEditor.tsx` (call `useAutoMentionIndex(campaignId)`; pass to `ScenarioCell`; add button + toasts), `messages/uk/scenario.json`, `messages/en/scenario.json` (`editor.autoTag`, `editor.autoTagDone` with ICU plural `{count}`, `editor.autoTagNone`), `lib/onboarding/whats-new.ts` (`{ id: '2026-11-27-scenario-auto-mentions', date: '2026-11-27', audience: 'dm' }` at top), `messages/{uk,en}/whatsNew.json` (match existing key shape for an entry — copy the structure of `2026-11-26-map-art`), `docs/architecture/` file covering the scenario editor (find via `grep -l "mention" docs/architecture/*.md`), `docs/STATUS.md`
- Test: extend `components/scenario/editor/__tests__/scenario-editor.test.tsx`

Decisions:
- Button in the second toolbar row before «Властивості»: `<HudButton type="button" className="toggle" disabled={!autoIndex} onClick={tagAll}>{t('autoTag')}</HudButton>`.
- `tagAll`: compute `autoTagContent(draft.content, autoIndex)` once; if count > 0 `draft.setContent(() => result.content)`; push toast `t('autoTagDone', { count })` or `t('autoTagNone')`. Toasts: `useToasts()` + `<ToastHost>` from `components/common/shell/ToastHost.tsx` (check its props; mirror `NotificationsHost.tsx`).
- uk texts: «Тегнути збіги», «Додано згадок: {count}», «Збігів не знайдено». en: «Tag matches», «Added {count, plural, one {# mention} other {# mentions}}», «No matches found».

- [ ] **Step 1:** Test in `scenario-editor.test.tsx` (follow its existing mocks; mock `useAutoMentionIndex` to return an index built from `[{character c1 'Zehir'}]` and a page whose row story is «Meet Zehir»): click «autoTag» button → draft content row story contains a mention c1; with index null the button is disabled.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run `scenario-editor.test.tsx` + i18n key tests (`pnpm test:related messages/uk/scenario.json` or the i18n tests under `lib/__tests__` that check both locales match) → PASS. Also `pnpm exec tsc --noEmit -p .` once.
- [ ] **Step 5:** eslint --fix; commit `feat(scenario): tag-matches button`.

### Task 5 (controller): gates + live run

- [ ] Full `pnpm test:run` once; `pnpm cycles`; `pnpm lint:dirs --changed main`.
- [ ] `/simplify` on the branch diff (1 agent).
- [ ] Live run (Sonnet subagent, `next build && next start`): HOMM5 campaign scenario as DM — type a hero name + space → chip; Ctrl+Z → text; «Тегнути збіги» on an existing page → chips + toast; save; reload shows chips.
- [ ] Merge to main (ask the owner before push).
