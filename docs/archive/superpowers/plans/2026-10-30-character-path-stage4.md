# Шлях персонажа, етап 4 (передісторія) — план

Спек: `docs/superpowers/specs/2026-10-30-character-path-stage4-design.md`. Worktree `../dnd-tracker-path4`, гілка `feat/character-path-stage4`. Виконання: SDD/executing-plans на Sonnet; без per-task рев'ю, один фінальний Opus-рев'ю. Тести під час роботи — `pnpm test:related <files>`, eslint лише по змінених файлах.

## T1. Чисте ядро — `lib/utils/characters/choices/wizard.ts`

- `WizardStep.kind` → `"choice" | "subclass" | "background"`; `StepSource.owner` вже містить `"background"`.
- `wizardSteps(state, refs, hero, keep?)`: на початок `steps` додати `{ key: "background", kind: "background", source: { owner: "background", name: <поточна назва або ""> }, path: "backgroundId" }`, якщо `keep?.has("background") && hero.classMode && Object.keys(refs.backgroundsById ?? {}).length > 0`.
- `export const withStepBackground = (state: ChoicesState, id: string | null): ChoicesState` → `{ ...state, ...mergeBackground(state, { backgroundId: id }) }` (імпорт з `@/lib/utils/backgrounds/selection`, без циклів).
- `useChoiceWizard`: початкові кроки рахувати з `keep = new Set(startAt ? [startAt] : [])`; додати в результат `setBackground(id)` (або лишити `set(withStepBackground(...))` у компоненті — як простіше).

Тест-кейси (`__tests__/wizard.test.ts`): крок є лише з `keep`; немає без `classMode`/без `backgroundsById`; стоїть першим; після `withStepBackground` з іншим id `backgroundChoices`/`backgroundFeatPicks` порожні, з тим самим id — збережені; `null` очищає; кроки виборів нової передісторії з'являються у `wizardSteps` після заміни.

## T2. Дані листа — `types/choices.ts`, `lib/server/characters/core/sheet-handler.ts`

- `SheetChoices.background`: `{ id, name, equipmentText, picks, description: string | null, skills: DndSkill[], tools: string[], originFeat: { id, name } | null, open: number }`.
- Збирається там, де зараз заповнюється `choices.background` (шукати `choiceSelections` у `lib/utils/characters/choices/selections.ts`): `background` (`BackgroundData`) вже завантажено `loadBackground`, `originFeat` — з `featsById[background.originFeatId]`; `open` = кількість відкритих виборів лише власників `background`/`backgroundFeat` (`visitPicks` + `pendingCount`, фільтр за `owner`; не лізти в загальний `pending`).
- Чистий хелпер `backgroundOpenCount(state, refs, hero)` поруч із `pending.ts`, щоб тестувати без сервера.

Тест-кейси: `selections`/sheet тест (`build-sheet-choices.test.ts`) — нові поля; `backgroundOpenCount` 0 / N / тільки origin feat.

## T3. Майстер — `components/choices/`

- `BackgroundPicker.tsx` (`{ backgrounds: BackgroundData[]; feats: Record<string, FeatData>; value: string | null; locked?: never; onChange(id | null) }`): сітка `ChoiceCard role="radio"` за зразком `SubclassCard`; `summary` — перші 80 символів опису (є `summarize` у `utils/characters/classes`), `description()` — навички (`dndSkills.*` через `useTranslations("gameTerms")` як у `ChoicesEditor`), інструменти, origin feat, спорядження. Картка «Без передісторії» не потрібна.
- `ChoiceWizard.tsx`: гілка `step.kind === "background"` → `BackgroundPicker` + попередження `t("wizard.background.resetWarning")`, коли `wizard.saved.backgroundId` є і `data.backgroundId !== saved.backgroundId`; `sourceKey`/`gives` для `kind: "background"` (`wizard.gives.background`, `wizard.source.background` уже існує).
- i18n `messages/{uk,en}/choices.json`: `wizard.gives.background`, `wizard.background.{title,resetWarning,noSkills}`; перевірити, що тест ключів проходить.

Тест-кейси (happy-dom): вибір картки → `set` з новим id; попередження видно лише при заміні; крок без вибору не блокує «Далі».

## T4. «Шлях» — `components/character-profile/path/BackgroundSection.tsx`

- Props `{ background?: SheetChoices["background"]; canEdit: boolean; hasBackgrounds: boolean; onOpen(pickKey?: string): void }`. Стани: нема + `canEdit && hasBackgrounds` → compact-рядок «Передісторію не обрано» + кнопка «Обрати» (`onOpen("background")`); обрана → назва (`hud-sc`), згорнутий опис (`<details>`), навички, інструменти, origin feat, спорядження з `equipmentNote`, `HudPill tone="accent"` з `open`, кнопки «Змінити» (`onOpen("background")`) і, коли `open > 0`, «Обрати» вибір (`onOpen("backgroundChoices.<id>")`: першого відкритого — брати з `pending`-ключа, якщо хелпер є; інакше `onOpen()` без ключа). Нема й нема що показувати → `null`.
- `hasBackgrounds`: `Object.keys(useChoiceRefs(...).backgroundsById)` дорого завантажувати на кожне відкриття вкладки; замість цього `SkillsTab` показує кнопку «Обрати» лише `canEdit`, а порожній список передісторій обробляє майстер (`allChosen`-екран). Тому проп `hasBackgrounds` НЕ вводимо.
- `path/index.ts` — експорт; `SkillsTab` — `<BackgroundSection>` над `ClassesHeader` (у `classMode`), з `FeatsBlock` прибрати блок `choices.background` разом з ключами `characterProfile.feats.background`/`equipmentNote`, якщо більше не використовуються.
- i18n `messages/{uk,en}/characterProfile.json`: `path.background.{title,none,pick,change,open,tools,skills,originFeat,equipment}`.

Тест-кейси (happy-dom): три стани; кнопки лише при `canEdit`; клік «Змінити» викликає `onOpen("background")`.

## T5. Документація й whats-new

- `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json`: `whatsNew.characterPathBackground` (за зразком запису етапу 3).
- `docs/architecture/characters.md` («Шлях персонажа», етап 4), `docs/STATUS.md` (рядок «Шлях персонажа (етап 4)»), `docs/architecture/battle.md` — одне речення в «5e: риси й вибори» про крок `background`.
- Довідка/hint: окремої довідки не додаємо (екран не новий).

## T6. Завершення (контролер, не субагент-реалізатор)

1. `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` → один повний `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:run`.
2. Один Opus-рев'ю diff (замість окремого `/simplify`, diff невеликий).
3. Живий прогін Sonnet-субагентом: кампанія TEST на prodcopy, десктоп + 390px, DM і гравець-власник (якщо є другий логін): «Обрати» → «Змінити» (попередження) → вибори передісторії → origin feat; тестові дані прибрати. Dev у worktree (є свій `node_modules`).
4. `git mv` спек і план у `docs/archive/superpowers/{specs,plans}/` у merge-коміті; перед merge/commit/push — `git branch --show-current`; merge у main у тимчасовому worktree, якщо основну папку перемкнула інша сесія. Не пушити без слова користувача.
