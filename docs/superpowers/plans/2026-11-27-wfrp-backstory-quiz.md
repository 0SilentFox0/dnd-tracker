# WFRP backstory quiz — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** an optional «Story» step in the WFRP creation wizard (player and DM) where each backstory question is answered by hand or by a d100 roll on a table; answers compose into the hero's biography and goals.

**Architecture:** pure rules in `systems/wfrp/rules/creation/story/` (question ids, roll tables of i18n keys, colour dictionary, `composeStory`), species appearance as an optional field of the race profile, a `useStoryQuiz` hook plugged into `useWfrpDraftForm` as `form.story`, a `StoryStep` component, and an `IdentityStep` hookup. No server changes except the profile schema; no migrations.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, zod, next-intl, vitest (+happy-dom for UI).

**Spec:** `docs/superpowers/specs/2026-11-27-wfrp-backstory-quiz-design.md` (read it first; decisions there are final).

**Worktree / branch:** `/Users/silentfox/Work/dnd-tracker-quiz`, `feat/wfrp-backstory-quiz` (off origin/main 2ddbd82c4, which already has the DM wizard fix). If `node_modules` is missing: symlink the main checkout's and run `pnpm exec prisma generate`.

## Global Constraints

- Read root `CLAUDE.md`: layering (components never call `fetch`/`@/lib/api`), hooks barrel `systems/wfrp/hooks/index.ts`, `@/` alias only, no Cyrillic in code (ESLint), English-only minimal comments.
- All UI text = keys in **both** `messages/uk/wfrpCreation.json` and `messages/en/wfrpCreation.json`, under the `story` subtree.
- Table texts are original dark-fantasy writing: **no book names or quotes** (no Reikland, Altdorf, Sigmar, Ranald, Empire…); gods described generically.
- Background limit stays 4000 chars (`wfrp-draft-schema.ts`).
- Agents do NOT run the full suite. Per task: `pnpm test:run <task test files>` and `pnpm exec eslint --fix <touched files>`. One full `pnpm test:run` + `tsc` at the end (Task 6). Never run two vitest processes at once.
- Commit per task: `feat(wfrp): …` with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Don't merge/push.

## Review Focus

1. Player edits the biography by hand, goes back to Story, changes an answer, returns → the manual biography must NOT be overwritten (only the «Replace with quiz story» button does it). Test in Task 5.
2. Species without `appearance` (old campaigns, «Grim d100 (empty)», custom races) → appearance block hidden, nothing crashes, compose skips it. Test in Tasks 3 and 4.
3. Going back to Story and re-rolling an ambition must update the quiz-originated goal, not add a duplicate, and must never remove a goal the user typed by hand. Test in Task 5.
4. Very long hand-written answers → composed text over 4000 → truncated, warning shown, submit still succeeds (server would 400 otherwise). Test in Tasks 2 and 5.
5. DM variant of the wizard (`dm` prop) gets the Story step too and the edit-draft mode (`characterId`, identity only) does not. Test in Task 4.

---

### Task 1: Story questions, roll tables, colours, texts

**Files:**
- Create: `systems/wfrp/rules/creation/story/types.ts`, `story/tables.ts`, `story/colours.ts`, `story/index.ts`
- Modify: `messages/uk/wfrpCreation.json`, `messages/en/wfrpCreation.json` (add `story.tables.*`, `story.colours.*`, `story.questions.*` labels, `story.blocks.*` titles)
- Test: `systems/wfrp/rules/creation/story/__tests__/tables.test.ts`

**Interfaces (produces):**
```ts
export const STORY_QUESTIONS = ['origin','family','childhood','turningPoint','leftHome','friends','loyalty','hatred','bestMemory','worstMemory','faith','demeanor','secret','ambitionShort','ambitionLong'] as const;
export const APPEARANCE_QUESTIONS = ['age','height','eyes','hair'] as const;
export type StoryQuestionId = (typeof STORY_QUESTIONS)[number] | (typeof APPEARANCE_QUESTIONS)[number];
export type StoryAnswers = Partial<Record<StoryQuestionId, string>>;
export const STORY_BLOCKS: { id: 'origin'|'turn'|'people'|'memory'|'self'|'appearance'; questions: StoryQuestionId[] }[];
export const STORY_TABLES: Record<(typeof STORY_QUESTIONS)[number], { max: number; key: string }[]>; // 10 rows, max 10..100, key 'story.tables.<q>.<n>' (relative to wfrpCreation)
export function rollStory(q: (typeof STORY_QUESTIONS)[number], rng: Rng): { roll: number; key: string }; // uses rollTable
export const APPEARANCE_COLOURS: readonly string[]; // ~25 keys: 'ice-blue','grey','hazel','black','auburn','ash-blond',... ; text 'story.colours.<key>'
export type AppearanceColour = (typeof APPEARANCE_COLOURS)[number];
```
Blocks: origin = origin/family/childhood; turn = turningPoint/leftHome; people = friends/loyalty/hatred; memory = bestMemory/worstMemory/faith; self = demeanor/secret/ambitionShort/ambitionLong; appearance = age/height/eyes/hair.

- [ ] **Step 1: failing test** — every `STORY_TABLES[q]` has 10 rows, `max` strictly ascending ending at 100; every table key, every `story.colours.<c>`, `story.questions.<q>` and `story.blocks.<b>` exists in BOTH `messages/uk/wfrpCreation.json` and `messages/en/wfrpCreation.json` (load JSON, walk dotted path); `rollStory('origin', fixedRng(37))` → row with max 40; texts contain none of `/Reikland|Altdorf|Sigmar|Ranald|Empire|Імпері|Рейкл/i`.
- [ ] **Step 2:** run `pnpm test:run systems/wfrp/rules/creation/story` → FAIL.
- [ ] **Step 3:** implement types/tables/colours (fixed rng: look at existing tests using `Rng` in `systems/wfrp/rules/tables/__tests__`). Write the 150 table rows uk+en (each row a short clause that reads well after the sentence template of Task 2, e.g. origin: «невеликого рибальського села на болотах» / «a small fishing village in the marshes»), question labels, block titles, colours.
- [ ] **Step 4:** test PASS; eslint.
- [ ] **Step 5:** commit.

### Task 2: composeStory

**Files:** Create `systems/wfrp/rules/creation/story/compose.ts`; Test `story/__tests__/compose.test.ts`

**Interfaces:**
- Consumes: `StoryAnswers`, `STORY_BLOCKS`, `GoalKind` (`@/lib/constants/characters`).
- Produces:
```ts
export const BACKGROUND_LIMIT = 4000;
export const GOAL_QUESTIONS = { ambitionLong: 'main', ambitionShort: 'personal', secret: 'secret' } as const;
export function composeStory(
  answers: StoryAnswers,
  phrase: (id: StoryQuestionId, answer: string) => string
): { background: string; goals: { text: string; kind: GoalKind }[]; truncated: boolean };
```
Rules: trim answers, skip empty; `GOAL_QUESTIONS` go to `goals` (text = trimmed answer) and never into `background`; appearance block = first paragraph; each other block = one paragraph of its phrased sentences joined by a space; paragraphs joined by `\n\n`; cut to `BACKGROUND_LIMIT` at the last whitespace before it, `truncated: true`.

- [ ] Step 1: tests — all empty → `{ background: '', goals: [], truncated: false }`; block order (appearance first, then origin…); ambitions/secret → goals with kinds main/personal/secret and absent from text; phrase is called with trimmed answer; 5000-char answer → length ≤ 4000, truncated true, ends on a word boundary.
- [ ] Step 2: FAIL → Step 3: implement → Step 4: PASS, eslint → Step 5: commit.

### Task 3: Species appearance (schema, roll, editor, template data)

**Files:**
- Modify: `systems/wfrp/rules/creation/profile.ts` (type), `systems/wfrp/rules/creation/schema.ts` (`SpeciesProfileSchema`), `systems/wfrp/ui/creation/SpeciesProfileEditor.tsx` (new «Appearance» section), `data/templates/grim-d100/race-profiles.json` (5 races), `scripts/templates/grim-d100/validate.ts` only if it whitelists profile fields, messages uk/en (`story.appearance.*` editor labels).
- Create: `systems/wfrp/rules/creation/story/appearance.ts`
- Test: `systems/wfrp/rules/creation/__tests__/profile.test.ts` (extend), `story/__tests__/appearance.test.ts`, `systems/wfrp/ui/creation/__tests__/SpeciesProfileEditor.test.tsx` (extend)

**Interfaces:**
```ts
// profile.ts
appearance?: { age: { base: number; dice: number }; heightCm: { base: number; dice: number }; eyes: AppearanceColour[]; hair: AppearanceColour[] };
// schema: base int 0..400, dice int 0..6, eyes/hair z.array(z.enum(APPEARANCE_COLOURS)).min(1).max(12), whole object optional
// appearance.ts
export function rollAppearance(a: NonNullable<SpeciesProfile['appearance']>, field: 'age'|'height'|'eyes'|'hair', rng: Rng): { roll: number; value: string };
// age/height: value = String(base + sum of `dice` d10) (rollDie from '@/lib/utils/common/dice'); eyes/hair: value = colour key (index = floor((d100-1) * len / 100))
```
Height: the book rolls inches («4'9\"+2d10\"»). Store `heightCm.base` in cm (inches × 2.54, rounded) and `heightCm.dice` = number of d10; `rollAppearance('height')` = `base + Math.round(sum(d10) * 2.54)`. Age = `base + sum(d10)`. Template values: read each species' Age/Height/Eye/Hair lines in the WFRP5 PDF (`~/Downloads/WFRP5_Core_Rulebook_06_10_26.pdf`, species pages ~27–35; extract text with pypdf in a scratch venv) — human → `lowlander`, dwarf → `delver`, halfling → `hearthkin`, high elf → `veyl`, wood elf → `thornkin`; colours = closest keys from `APPEARANCE_COLOURS`.

- [ ] Step 1: tests — profile without `appearance` parses unchanged; valid appearance parses; unknown colour / dice 7 rejected (parseProfile falls back → assert via `SpeciesProfileSchema.safeParse(...).success === false`); `rollAppearance` with fixed rng: age within `[base+dice, base+10*dice]`, eyes ∈ list; editor test: section renders, editing base updates the saved profile payload.
- [ ] Step 2: FAIL → Step 3: implement + template data → Step 4: PASS (also run `pnpm test:run systems/wfrp/__tests__/scripts/templates scripts/templates/__tests__` because the pack is validated there), eslint → Step 5: commit.

### Task 4: useStoryQuiz + Story step in the wizard

**Files:**
- Create: `systems/wfrp/hooks/useStoryQuiz.ts`, `systems/wfrp/ui/creation/StoryStep.tsx`
- Modify: `systems/wfrp/hooks/draft-form-helpers.ts` (`WfrpDraftStepId` + `'story'`, `FULL_STEPS` insert before `identity`, `STEP_ERRORS.story = () => false`), `systems/wfrp/hooks/useWfrpDraftForm.ts` (`valid.story = true`, expose `story`), `systems/wfrp/hooks/index.ts` (export), `systems/wfrp/ui/creation/WfrpDraftForm.tsx` (`STEP_ORDER` + render), messages uk/en (`wizard.steps.story`, `story.roll`, `story.rollAll`, `story.skip`, `story.hint`, `story.placeholder`)
- Test: `systems/wfrp/hooks/__tests__/useStoryQuiz.test.tsx`, `systems/wfrp/ui/creation/__tests__/StoryStep.test.tsx`, extend `__tests__/WfrpDraftForm.test.tsx`

**Interfaces:**
```ts
export function useStoryQuiz(opts: { rng: Rng; appearance?: SpeciesProfile['appearance'] }): {
  answers: StoryAnswers;
  set: (id: StoryQuestionId, text: string) => void;
  roll: (id: StoryQuestionId) => void;       // table key → translated text via useTranslations('wfrpCreation'); appearance → number or translated colour
  rollAll: () => void;                        // only empty questions
  blocks: typeof STORY_BLOCKS;                // appearance block dropped when no appearance
  compose: () => ReturnType<typeof composeStory>; // phrase = (id, a) => t(`story.sentences.${id}`, { answer: a })
};
// useWfrpDraftForm return gains: story: ReturnType<typeof useStoryQuiz>
```
Use the wizard's existing `rng` and `reveal` (`form.shown(key, value)`) so a roll animates like career/stats rolls; reveal key `story-<id>`. StoryStep: `HudSection` per block, per question `FormField` + `Textarea` (1–3 rows) + 🎲 button (`aria-label` = `story.roll` + question label); «Roll all» at top; hint text that the step is optional. Add `story.sentences.<q>` keys (uk/en) here, one per question incl. appearance (`age`: «Мені {answer} років.»).

- [ ] Step 1: tests — hook: `roll('origin')` with fixed rng sets the expected translated row; `rollAll` keeps filled answers; no appearance → `blocks` lacks `appearance`. StoryStep: 🎲 fills its field; «Roll all» doesn't touch a typed field. WfrpDraftForm: step order species→career→stats→talents→story→identity; Next on story works with all fields empty; DM variant (`dm` prop) shows the story step; `characterId` mode shows only identity.
- [ ] Step 2: FAIL → Step 3: implement → Step 4: `pnpm test:run systems/wfrp/hooks systems/wfrp/ui/creation` PASS, eslint → Step 5: commit.

### Task 5: Biography and goals hookup, what's new, budgets

**Files:**
- Modify: `systems/wfrp/hooks/useWfrpDraftForm.ts` (on entering `identity`: apply compose), `systems/wfrp/ui/creation/IdentityStep.tsx` («Replace with quiz story» button + truncation warning), `systems/wfrp/meta.ts` (`whatsNew` entry `{ id: '2026-11-27-wfrp-backstory-quiz', date: '2026-11-27', audience: 'all' }`), `messages/{uk,en}/whatsNew.json` (`whatsNew.2026-11-27-wfrp-backstory-quiz.*` — copy the shape of the `2026-11-20-wfrp-creation` entry), messages uk/en (`story.replace`, `story.truncated`), `lib/i18n/test/route-budgets.ts` (`[id]/character/new`, `[id]/character/draft`, `[id]/dm/characters/new` → measured + 0.5 if the budget test fails)
- Test: extend `systems/wfrp/hooks/__tests__/useWfrpDraftForm.test.tsx` and `ui/creation/__tests__/IdentityStep.test.tsx`

**Behaviour (decisions):**
- Hook keeps `bgTouched` (set by any `identity.set({ background })` from the textarea) and `quizGoals: string[]` (texts it added last time).
- Entering `identity` from `story`: `c = story.compose()`; if `!bgTouched` → `background = c.background`; goals: remove entries whose text ∈ previous `quizGoals`, then append `c.goals` not already present by text; `quizGoals = c.goals.map(g => g.text)`. User-typed goals are never removed.
- `IdentityStep`: if `bgTouched` and composed background non-empty and differs → show button `story.replace` that sets background to it (and clears `bgTouched`). If `c.truncated` → muted warning `story.truncated`.

- [ ] Step 1: tests — empty quiz leaves background/goals untouched; quiz answers fill an untouched background; manual edit then back→change answer→forward keeps manual text and shows the replace button, which replaces it; re-rolled ambition replaces the old quiz goal (no duplicate) and a hand-typed goal survives; truncated warning visible for a 5000-char answer and submit body background ≤ 4000.
- [ ] Step 2: FAIL → Step 3: implement → Step 4: `pnpm test:run systems/wfrp lib/i18n/__tests__/route lib/onboarding` PASS, eslint → Step 5: commit.

### Task 6: Closing (controller, not an implementer)

- [ ] `pnpm exec tsc --noEmit -p .` (NODE_OPTIONS=--max-old-space-size=8192, ~4 min), `pnpm cycles`, one full `pnpm test:run`.
- [ ] Final review (Opus) of the branch diff + fixes; `/simplify` with 1 agent.
- [ ] Docs: `docs/architecture/characters.md` (wizard steps + story), `docs/STATUS.md`; `git mv` spec+plan to `docs/archive/superpowers/` in the merge commit.
- [ ] Owner «так»: merge to main + push (deploy), then live check on www.critnest.com (player + DM wizard with quiz; hero saved with biography and goals), then publish the grim-d100 template so the 5 races get `appearance` (existing campaigns: race profiles only change via template propagation — ask owner).
