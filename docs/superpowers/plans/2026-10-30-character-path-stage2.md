# Шлях персонажа, етап 2: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Причини недоступності feat'ів/опцій з числами, покроковий майстер виборів, вибір підкласу без підняття рівня, «Шлях» із прев'ю підкласів.

**Architecture:** Чиста `requirementsOf` дає структуровані вимоги (одна на валідацію й картки). Чиста `wizardSteps` на `forEachChoiceOwner` дає кроки; `useChoiceWizard` зберігає наявним `save` на «Далі». Єдина серверна зміна: `classSubclasses` у `PUT /choices`.

**Tech Stack:** Next.js 16, React 19, TS strict, Zod, Prisma (без міграцій), next-intl, Vitest (happy-dom для UI).

**Spec:** `docs/superpowers/specs/2026-10-30-character-path-stage2-design.md` (виконавці читають обидва).

## Global Constraints

- Шар: компоненти не імпортують `@/lib/api/*`/`fetch`; логіка в `lib/hooks/<domain>`, імпорт із barrel `index.ts`; чиста логіка в `lib/utils/characters/...` з тестами в сусідніх `__tests__/`.
- i18n: тексти лише в `messages/{uk,en}/*.json` (обидві локалі, ключі збігаються); у коді кирилиці нема; чиста логіка повертає структури/ключі, переклад на межі UI.
- Нових колонок і міграцій нема; відповіді API лишаються `{ error, issues? }` з `API_ERRORS`.
- Коментарі мінімальні. `@/…` імпорти, `import/no-cycle` увімкнений.
- Тести: `pnpm test:related <файли>`; повний `pnpm test:run` один раз перед merge; `pnpm exec eslint --fix <змінені файли>`, repo-wide lint лише перед merge. Перед важким запуском: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- Worktree `../dnd-tracker-path`, гілка `feat/character-path-stage2`. Коміти з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Герой із 0/відсутнім балом здібності або без `scores`: `have` = 0, без NaN і падіння; картка недоступна з причиною.
2. Feat з кількома вимогами, частково виконаними (рівень є, Сили нема): показані обидві, виконана з ✓, невиконана з числами; `manualText` не блокує, а показує «перевіряє ДМ».
3. Вибір підкласу відкриває нові вибори: майстер після `save` додає кроки, не скидає номер кроку й не закривається; підклас, уже заданий, повторно (той самий) не дає помилки, інший дає `SUBCLASS_ALREADY_SET`.
4. Нема відкритих виборів: майстер показує «Усе обрано», а не порожній крок «Крок 0 з 0»; без `canEdit`/з чернеткою кнопка вибору не показується (сервер і так 403).
5. «Далі» після кроку з `abilityScore`: піднятий бал не рахується двічі (збережений уже входить у `hero.scores`, `saved` оновлюється після кожного успішного `save`); помилка збереження лишає на кроці, вибір не губиться, показано помилку.

---

### Task 1: `requirementsOf` і рефакторинг валідації

**Files:**
- Create: `lib/utils/characters/choices/requirements.ts`, `lib/utils/characters/choices/__tests__/requirements.test.ts`
- Modify: `lib/utils/characters/choices/validate.ts` (`featPrerequisiteMet`, `optionIssues`)

**Interfaces:**
- Produces:
```ts
export type Requirement = { met: boolean } & (
  | { kind: "level"; need: number; have: number }
  | { kind: "ability"; abilities: AbilityKey[]; need: number; have: number }
  | { kind: "option"; missing: string[] }
  | { kind: "manual"; text: string }
  | { kind: "text"; text: string }
);
export interface RequirementCtx { totalLevel: number; level: number; scores: Readonly<Record<AbilityKey, number>>; picked?: ReadonlySet<string> }
export function requirementsOf(source: FeatData | ChoiceOption, ctx: RequirementCtx): Requirement[];
export const isUnmet = (r: Requirement): boolean => !r.met;
```
- Feat (`"prerequisite" in source`): `level` проти `ctx.totalLevel`; `ability.have` = `Math.max(...abilities.map(a => ctx.scores[a] ?? 0))`; `manual` (по одному на рядок `manualText`) і `text` мають `met: true` (довідкові). Option: `minLevel` проти `ctx.level`; `requires` проти `ctx.picked` (`missing` = ще не обрані id).

- [ ] **Step 1: Тести** (`requirements.test.ts`): feat level 4 при totalLevel 3 → `[{kind:"level",need:4,have:3,met:false}]`; `scores:{abilities:["strength","dexterity"],min:13}` зі STR 10/DEX 14 → `met:true, have:14`; обидві вимоги, одна невиконана; відсутній бал → `have:0`; `manualText` і `text` → `met:true`; option `minLevel:5` при `level:3`; option `requires:["a","b"]` з `picked={a}` → `missing:["b"]`; порожня `prerequisite` → `[]`. Додати кейс «`featPrerequisiteMet` дає ті самі відповіді», що й раніше: наявні `validate.test.ts` лишаються без правок.
- [ ] **Step 2:** `pnpm test:run lib/utils/characters/choices/__tests__/requirements.test.ts` → FAIL (модуля нема).
- [ ] **Step 3: Реалізація.** `featPrerequisiteMet(feat, ctx)` = `requirementsOf(feat, { ...ctx, level: ctx.totalLevel }).every(r => r.met)` (сигнатура `ctx: { totalLevel; scores }` лишається). `optionIssues`: `minLevel`/`requires` через `requirementsOf(option, { totalLevel: ctx.totalLevel, level: ctx.level, scores: ctx.scores, picked })`; коди `CHOICE_MIN_LEVEL`/`CHOICE_REQUIRES` лишаються.
- [ ] **Step 4:** `pnpm test:related lib/utils/characters/choices/validate.ts lib/utils/characters/choices/requirements.ts` → PASS (включно з `validate.test.ts`, `plan.test.ts`).
- [ ] **Step 5:** eslint --fix змінених; коміт `feat(choices): requirementsOf gives structured prerequisite reasons`.

### Task 2: Підклас у `PUT /choices`

**Files:**
- Modify: `lib/schemas/choices.ts` (`ChoicesBodySchema`), `types/choices.ts` (`ChoicesBody`), `lib/utils/characters/choices/picks.ts` (`choicesBodyOf`, нова `withClassSubclasses`), `lib/server/characters/core/choices-handler.ts`
- Test: `lib/utils/characters/choices/__tests__/picks.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/choices/__tests__/` (наявний файл за зразком), `lib/schemas` тест, якщо є

**Interfaces:**
- Produces: `ChoicesBody.classSubclasses?: Record<string, string>`;
```ts
export const withClassSubclasses = (entries: CharacterClassEntry[], subclasses: Record<string, string>): { entries: CharacterClassEntry[]; conflict: string | null };
```
`conflict` = `classId` запису, у якого вже інший підклас. Однаковий підклас — не конфлікт.

- [ ] **Step 1: Тести.** `withClassSubclasses`: ставить підклас, якщо порожній; той самий повторно — без змін і без конфлікту; інший — `conflict`; клас, якого нема в `entries`, ігнорується. `choicesBodyOf` додає `classSubclasses` лише для записів із `subclassId`. Route: успіх (підклас записано, відповідь `classes[].subclassId`), `SUBCLASS_ALREADY_SET` 422, `SUBCLASS_NOT_FOUND` 422, `SUBCLASS_TOO_EARLY` 422 з `params.level`, без поля — як раніше (наявні тести).
- [ ] **Step 2:** запустити → FAIL.
- [ ] **Step 3: Реалізація.** Схема: `classSubclasses: z.record(z.string().min(1), z.string().min(1)).optional()`. У `saveCharacterChoices` після `withClassPicks`: застосувати `withClassSubclasses`; при `conflict` `throw new ContentError(API_ERRORS.SUBCLASS_ALREADY_SET, 422)`; далі `validateClassEntries(next, refs.classesById, MAX_CLASS_LEVEL)` (з `application.ts`; помилка `{error, params}` → `ContentError(error, 422, undefined, params)`; `maxLevel` = `access.campaign.maxLevel`, як у level-up). `refs.classesById` завантажується, бо classMode.
- [ ] **Step 4:** тести → PASS; перевірити, що `resolveCharacterChoices` не відхиляє збережені вибори `bySubclass` нового підкласу (додати кейс у route-тест: після встановлення підкласу `PUT` із picks для його вибору проходить).
- [ ] **Step 5:** eslint; коміт `feat(characters): choose a subclass through PUT /choices`.

### Task 3: `wizardSteps`, `withStepPicks`, винесений `summarize`

**Files:**
- Modify: `lib/utils/characters/choices/walk.ts` (експортувати тип `WalkRefs`)
- Create: `lib/utils/characters/choices/wizard.ts`, `lib/utils/characters/classes/summary.ts`, тести `__tests__/wizard.test.ts`, `__tests__/summary.test.ts`
- Modify: `lib/utils/characters/classes/progression.ts` (імпорт `summarize`), barrel `lib/utils/characters/classes/index.ts`

**Interfaces:**
- Produces:
```ts
export type StepSource = { owner: "race" | "background" | "backgroundFeat" | "class" | "feat"; name: string; level?: number };
export interface WizardStep { key: string; kind: "choice" | "subclass"; source: StepSource; path: string; choice?: Choice; classId?: string }
export function wizardSteps(state: ChoicesState, refs: WalkRefs, hero: { level: number; classMode: boolean }, keep?: ReadonlySet<string>): WizardStep[];
export function picksAtStep(state: ChoicesState, step: WizardStep): ChoicePick[];
export function withStepPicks(state: ChoicesState, step: WizardStep, list: ChoicePick[]): ChoicesState;
export function withStepSubclass(state: ChoicesState, step: WizardStep, subclassId: string): ChoicesState;
```
- `summarize(text?: string): string` — той самий код, що зараз у `progression.ts` (SUMMARY_MAX 120).
- `key` = `${path}.${choice.id}` для вибору, `subclass:${classId}` для підкласу. Крок вибору входить, якщо `isChoiceOpen(def, level, choiceOwner)` і `resolvedPickCount(...) < resolveChoiceCount(...)`, **або** `key ∈ keep` (щоб «Крок N з M» був стабільний після збереження). Крок підкласу: `cls.subclassLevel !== null`, `entry.level >= subclassLevel`, нема `subclassId`, `cls.subclasses.length > 0`, або `key ∈ keep`. Порядок: раса, передісторія (+ origin-feat), класи за порядком, окремі риси; підклас класу іде першим у своєму класі.

- [ ] **Step 1: Тести** (`wizard.test.ts`, фікстури з `fixtures.ts`): порядок кроків; тільки невичерпані вибори; повністю обраний вибір не входить, але входить при `keep`; підклас-крок лише коли рівень ≥ `subclassLevel` і підкласу нема; після `withStepSubclass` підкласові вибори з'являються як нові кроки; `withStepPicks` пише в `raceChoices` / `backgroundChoices` / `backgroundFeatPicks` / `classes[].choices` / `feats[i].picks` за `path`; порожній герой → `[]`. `summary.test.ts`: ≤120 символів без змін, довший обрізається по пробілу з «…», береться перший непорожній рядок.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація (`summarize` перенести без зміни поведінки; наявні тести `progression` лишаються зеленими). **Step 4:** `pnpm test:related lib/utils/characters/choices/wizard.ts lib/utils/characters/classes/summary.ts` → PASS.
- [ ] **Step 5:** eslint; коміт `feat(choices): wizard steps over the choice walk, shared summarize`.

### Task 4: Картки вибору: вимоги, групи, «i»

**Files:**
- Create: `components/choices/ChoiceCard.tsx`, `components/choices/RequirementList.tsx`, тести в `components/choices/__tests__/`
- Modify: `components/choices/ChoicePicker.tsx` (`OptionCards`, `FeatList`, прибрати `ChoiceDescription`/`LEAD_MAX`), `messages/{uk,en}/choices.json`

**Interfaces:**
- Consumes: `requirementsOf`, `isUnmet` (Task 1); `summarize` (Task 3).
- Produces:
```ts
<ChoiceCard role="checkbox" | "radio" checked disabled? title name={string} summary={string} description?={string} requirements?={Requirement[]} note?={string} onClick />
<RequirementList items={Requirement[]} names?={Record<string,string>} />
```
- `ChoiceCard`: `EntityIcon` (літера з `title`), `OptionButton variant="form"`, рядок суті (`summarize(description)`), кнопка «i» (`aria-label` `choices.picker.details`) → `ResponsiveDialog hud` із повним текстом; «i» не вибирає картку (`stopPropagation`). `RequirementList`: рядок на вимогу, виконані з ✓, невиконані з числами.
- Ключі `choices.requirement.{level,ability,option,manual}`: «з {need}-го рівня, зараз {have}», «{abilities}: потрібно {need}, зараз {have}», «спершу обери: {list}», «перевіряє ДМ: {text}»; `choices.picker.{available,unavailable,details}`; для здібностей `tg("abilities.<k>.label")`.
- `FeatList` і `OptionCards` ділять картки на «Можна обрати» і «Поки недоступні» (заголовок другої лише коли вона непорожня). Недоступна: `disabled` (вибрана раніше лишається клікабельною для зняття), причини з `requirementsOf` (для feat'а `{ totalLevel: ctx.totalLevel, level: ctx.totalLevel, scores: ctx.scores }`; для опції `{ level: ctx.level, picked: new Set(ids) }`). Уже взята не repeatable риса: причина `picker.featTaken` (існує).

- [ ] **Step 1: Тести** (happy-dom): feat із STR 13 і героєм STR 10 → у групі «Поки недоступні», текст «потрібно 13, зараз 10», картка disabled; виконана вимога з ✓; `manualText` не блокує; «i» відкриває діалог із повним `description`, а клік по «i» не змінює `checked`; довгий опис не з'являється в картці (лише `summarize`); опція з `requires`/`minLevel` у недоступних із причиною; існуючі тести `ChoicePicker` оновити під нову розмітку (групи, без «Докладніше»), логіку вибору/`featCounts` не міняти.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація; ключі в обох локалях. **Step 4:** `pnpm test:related components/choices` → PASS. **Step 5:** eslint; коміт `feat(choices): requirement reasons and icon+summary cards`.

### Task 5: Майстер: хук, компонент, `ChoicesDialog`

**Files:**
- Create: `components/choices/picker-context.ts` (виноситься з `ChoicesEditor`), `lib/hooks/characters/useChoiceWizard.ts` (+ export у `index.ts`), `components/choices/ChoiceWizard.tsx`, `components/choices/SubclassCard.tsx`, тести (`lib/hooks/characters/__tests__/`, `components/choices/__tests__/`)
- Modify: `components/choices/ChoicesEditor.tsx` (бере контекст із `picker-context.ts`, поведінка без змін), `components/character-profile/ChoicesDialog.tsx` (проп `startAt?: string`, рендер майстра замість `CharacterChoicesPanel`), `messages/{uk,en}/choices.json`

**Interfaces:**
- Consumes: `wizardSteps`, `picksAtStep`, `withStepPicks`, `withStepSubclass` (Task 3), `ChoiceCard`/`ChoicePicker` (Task 4), `classSubclasses` у `choicesBodyOf` (Task 2), `useChoiceRefs`, `useCharacterChoices`.
- Produces:
```ts
// чиста, з поточного `ChoicesEditor`: base-контекст (feats, spells, proficient, scores, scoreAfter, featCounts) і контекст кроку
export function pickerBase(data: ChoicesState, refs: ChoiceRefsView, hero: { level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean }, saved?: ChoicesState): Omit<PickerContext, "level" | "columns" | "maxSlotLevel">;
export function pickerContextFor(base: ReturnType<typeof pickerBase>, step: WizardStep, data: ChoicesState, refs: ChoiceRefsView, heroLevel: number): PickerContext;   // клас: level запису, columns, maxSlotLevelFor; решта: level героя

useChoiceWizard({ campaignId, characterId, initial: ChoicesState, hero, refs, startAt? }): {
  steps: WizardStep[]; index: number; step: WizardStep | undefined; state: { data: ChoicesState; set: (s: ChoicesState) => void };
  next: () => Promise<void>; back: () => void; isPending: boolean; error: string | null; issues: ChoiceIssue[]; done: boolean;
}
<SubclassCard cls={GameClassData} value?: string onChange={(id) => void} />   // картки підкласів: іконка-літера, назва, summarize, «i», «що дає за рівнями»
```
- `steps` = `wizardSteps(data, refs, hero, seen)` де `seen` накопичує всі `key`, які були показані; `startAt` — `pick.key` зі «Шляху» (id вибору, для підкласу `"subclass"`); `index` ставиться на крок, де `step.choice?.id === startAt` або (`startAt === "subclass"` і `step.kind === "subclass"`), інакше 0. `next`: `save(choicesBodyOf(prunePicks(data, refs).state))` (`save` повертає `boolean`); успіх → `saved` = збережений стан (щоб `scoreAfter` не рахував ASI двічі),  оновлений герой (`onSaved`) і `hero.scores` оновлюються, крок +1, нові кроки (підклас) додаються до `steps`; помилка → лишаємось, `error`/`issues`. Останній крок «Далі» = «Готово» і закриває. `done` = `steps.length === 0`.
- `ChoiceWizard`: «Крок N з M», `source` рядком «Звідки» (`choices.wizard.source.*`), «Що дає» за `kind` (`choices.wizard.gives.*`: `abilityScore`, `feat`, `skill`, `expertise`, `spell`, `option`, `subclass`), один `ChoicePicker` (або `SubclassCard`) із помилкою для `issues`, кнопки «Назад/Далі/Закрити», порожній стан «Усе обрано». Підписи списків рис: `choices.wizard.featSource.{background,race,asi,other}` («Риса передісторії: початкова», «Human Versatile: риса початкового рівня», «Збільшення характеристик, {class} {level}: риса або +2»).
- `ChoicesDialog`: герой (`useCharacter`) після `save` оновлюється через наявний кеш-інвалід `useCharacterChoices`; майстер читає `scores` з нього.

- [ ] **Step 1: Тести.** `pickerBase`/`pickerContextFor`: поведінка `ChoicesEditor` не змінилась (наявні тести `ChoicesEditor`/`CharacterChoicesPanel` PASS), `scoreAfter` = `scores` + дельта лише від незбережених піків. Хук: `startAt` ставить на потрібний крок; «Далі» викликає `save` один раз і переходить; помилка лишає на місці з `error`; після вибору підкласу з'являються нові кроки, номер поточного не скидається; `back` не зберігає. Компонент (happy-dom): «Крок 2 з 3»; порожній стан; підпис джерела; фіча з STR 13 розблоковується на наступному кроці після збереження ASI (мок `save` оновлює scores); `SubclassCard` обирає підклас і `onChange` отримує id; діалог відкривається на `startAt`.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація; `CharacterChoicesPanel`/`CharacterChoicesTab` не чіпати (DM-вкладка й форми). **Step 4:** `pnpm test:related components/choices components/character-profile/ChoicesDialog.tsx lib/hooks/characters` → PASS. **Step 5:** eslint; коміт `feat(choices): step-by-step choices wizard with subclass step`.

### Task 6: «Шлях»: старт із кроку, прев'ю підкласів, level-up

**Files:**
- Modify: `lib/utils/characters/classes/path.ts` (+ barrel), `components/character-profile/path/{CharacterPath,PathRowCard}.tsx`, `components/character-profile/SkillsTab.tsx`/`CharacterProfile.tsx` (місця, що відкривають `ChoicesDialog`), `components/character-profile/ClassLevelUpDialog.tsx`, `messages/{uk,en}/characterProfile.json`
- Test: `lib/utils/characters/classes/__tests__/path.test.ts`, `components/character-profile/path/__tests__/character-path.test.tsx`, `components/character-profile/__tests__/ClassLevelUpDialog.test.tsx`

**Interfaces:**
- Produces:
```ts
export interface SubclassPreview { id: string; name: string; gains: { level: number; names: string[] }[] }
export function subclassPreview(progression: ClassProgression): SubclassPreview[];
export const hasSubclassOnly = (row: ProgressionRow, chosen: string | null): boolean;   // є bySubclass-вміння, а підклас не обрано
```
`CharacterPathProps.actions?: { onPick: (pickKey?: string) => void }`; `PathRowCard.onPick?: (pickKey: string) => void`. `pickKey` = `ProgressionPick.key` (id вибору класу; `"subclass"` для підкласу); зіставлення з кроком робить `useChoiceWizard` (Task 5, `startAt`).

- [ ] **Step 1: Тести.** `subclassPreview`: за `bySubclass` — підклас → рівні → імена, пусті рівні пропущені, порядок за рівнем; `hasSubclassOnly`: true лише коли є вміння підкласів і жоден не обрано. «Шлях»: клік «Обрати» викликає `onPick("<pick.key>")`; без `actions` кнопки нема; рядок підкласу в майбутньому має `<details>` «Які бувають» з назвами й рівнями; чіп «Залежить від підкласу» лише в майбутніх рядках без обраного підкласу; обраний підклас — чіпа нема. `ClassLevelUpDialog`: крок підкласу рендерить `SubclassCard` (існуючі тести проходять після оновлення вибору підкласу).
- [ ] **Step 2:** FAIL. **Step 3:** реалізація; `SkillsTab`/`CharacterProfile` передають `pickKey` у `ChoicesDialog.startAt`; `PickLine` для `kind: "subclass"` зі статусом `open` — кнопка «Обрати підклас» (раніше був текст). **Step 4:** `pnpm test:related lib/utils/characters/classes components/character-profile` → PASS. **Step 5:** eslint; коміт `feat(character-path): subclass preview, wizard start from a pick, shared subclass card`.

### Task 7: Docs, what's-new, перевірка

**Files:**
- Modify: `lib/onboarding/whats-new.ts`, `messages/{uk,en}/whatsNew.json`, `docs/architecture/characters.md` (розділ «Шлях персонажа»), `docs/STATUS.md`
- Move: `docs/superpowers/{specs,plans}/2026-10-30-character-path-stage1*` → `docs/archive/superpowers/` (`git mv`, у merge-коміті етапу 2)

- [ ] **Step 1:** запис `{ id: "2026-10-30-character-path-choices", date: "2026-10-30", audience: "all" }` першим у `WHATS_NEW`; `whatsNew.2026-10-30-character-path-choices.{title,body}` в обох локалях (майстер виборів, причини недоступності, вибір підкласу). Тест на ключі (наявний) PASS.
- [ ] **Step 2:** `characters.md`: `requirementsOf`, `wizardSteps`, майстер зберігає на «Далі» (сервер валідує за збереженими балами), `classSubclasses` у `PUT /choices`; `STATUS.md`: етап 2 готовий, етапи 3–4 відкриті, відкладені дрібниці етапу 1 (`SpellPicksNudge` дубль, `openSpellPicks` без `caster`).
- [ ] **Step 3:** `pnpm exec tsc --noEmit` чистий; повний `pnpm test:run` один раз; repo-wide lint один раз (після `ps`-перевірки).
- [ ] **Step 4: Живий прохід (subagent Sonnet)**, кампанія TEST на `prodcopy` (`cmvsbkvht0001jm085zswmt85`, `pnpm exec next dev -p 3100` із worktree), зменшені скріншоти, перевірки через JS/текст: (a) герой зі Силою 10 бачить feat із «потрібно 13, зараз 10» у «Поки недоступні»; піднімає Силу в ASI-кроці, «Далі», feat розблоковано; (b) герой вище `subclassLevel` без підкласу проходить крок підкласу, нові вибори додаються; (c) «Шлях» відкриває майстер на потрібному кроці; «Які бувають» у майбутньому рівні; (d) мобільний через same-origin iframe 390px без горизонтального скролу; тестові дані прибрати.
- [ ] **Step 5:** `/simplify` по diff (1–2 агенти), підсумкове рев'ю одним Opus-агентом із Review Focus цього плану, коміт `docs: character path stage 2`.
