# Шлях персонажа, етап 4 — передісторія як крок майстра й секція «Шляху»

Гілка `feat/character-path-stage4` (worktree `../dnd-tracker-path4`). Етапи 1–3 — у `docs/archive/superpowers/specs/2026-10-30-character-path-stage{2,3}-design.md`.

## Мета

Передісторія героя (background) — повноцінний видимий елемент «Шляху» поряд із расою й класами, а її вибір і зміна — частина майстра виборів (`ChoicesDialog`). Без міграцій і нових API.

## Рішення користувача (2026-10-30)

- Передісторія живе секцією «Передісторія» на вкладці «Шлях» над класами.
- Змінити передісторію після створення можна з майстра (хто має `canEdit`), з попередженням, що її вибори й ASI буде скинуто.

## Що вже є (не чіпаємо)

- `forEachChoiceOwner` (`lib/utils/characters/choices/walk.ts`) віддає власників `background` і `backgroundFeat`; `wizardSteps` вже видає кроки їхніх виборів.
- `PUT …/choices` приймає `backgroundId`/`backgroundChoices`/`backgroundFeatPicks`; `mergeBackground` скидає picks при заміні, `planChoices` рахує ASI, навички/інструменти зливаються при читанні.
- `ChoicesEditor` (профіль-редактор, чернетка) має `<select>` передісторії — лишається як є.
- `sheet.choices.background = { id, name, equipmentText, picks }` лише у `classMode`/коли є вибори раси (`sheet-handler.ts`).

## Reuse

| Потреба | Використовуємо |
|---|---|
| крок у майстрі за зразком підкласу | `WizardStep.kind` + `keep`-механізм `wizardSteps`, `ChoiceWizard`, `useChoiceWizard` |
| картки вибору | `ChoiceCard` (`components/choices/`), патерн `SubclassCard` |
| заміна передісторії | `mergeBackground` (`lib/utils/backgrounds/selection.ts`) |
| секція на «Шляху» | `ClassSection`/`HudSection`-стиль, `FeatsBlock`-дані, `RacePassive`-патерн |
| відкриття майстра з кроку | `openChoices(pickKey)` у `SkillsTab` + `startAt` |
| список передісторій | `refs.backgroundsById` з `useChoiceRefs` |

Нове потрібне, бо: окремого кроку «обрати передісторію» немає (вибір лише в `ChoicesEditor`), а на «Шляху» вона показана одним рядком у `FeatsBlock`.

## Дизайн

### 1. Чисте ядро (`lib/utils/characters/choices/wizard.ts`)

- `WizardStep.kind`: `"choice" | "subclass" | "background"`. Крок передісторії: `key: "background"`, `source: { owner: "background", name }`, `path: "backgroundId"`.
- `wizardSteps` додає крок `background`, коли `refs.backgroundsById` непорожній і (`state.backgroundId` порожній **або** `keep` містить `"background"`). Для `classMode: false` кроку немає.
- `withStepBackground(state, step, id)` → `{ ...state, ...mergeBackground(state, { backgroundId: id }) }`.
- Порядок: крок `background` — перший (до виборів раси), далі як зараз; `useChoiceWizard` вже зберігає порядок `seen`, тож після вибору з'являються кроки виборів нової передісторії й origin feat.

### 2. Майстер

- `ChoiceWizard`: для `step.kind === "background"` рендерить `BackgroundPicker` (нова обгортка над `ChoiceCard`, radio-картки: назва, короткий опис, навички/інструменти/origin feat у `description`).
- Якщо `saved.backgroundId` уже є і вибір відрізняється, під пікером — попередження (`choices.wizard.background.resetWarning`): вибори й ASI цієї передісторії скинуто.
- Кнопка «Далі» неактивна без вибору, лише якщо крок відкритий через порожню передісторію; при зміні існуючої можна лишити як є.
- `useChoiceWizard`: handler `setBackground(id)` через `withStepBackground`; решта (збереження `PUT …/choices`, помилки, `issues`) без змін.

### 3. «Шлях»

- `components/character-profile/path/BackgroundSection.tsx`: назва, згорнутий опис, навички, інструменти, origin feat, спорядження (`equipmentText` + `equipmentNote`), бейдж «N відкритих виборів» (`pending` зі `sheet.choices` тут не годиться — рахуємо з `sheet.choices.background.open`, див. §4).
- Кнопки (лише `sheet.choices.canEdit`): «Обрати» (порожньо) / «Змінити» → `openChoices("background")`; відкриті вибори → `openChoices(<pickKey>)`.
- `SkillsTab`: `BackgroundSection` над `ClassesHeader`; з `FeatsBlock` прибирається блок `choices.background`.
- Порожня передісторія й відсутні передісторії в кампанії → секція не рендериться; для `canEdit` і непорожнього `backgroundsById` — compact-рядок «Передісторію не обрано» + «Обрати».

### 4. Дані відповіді (без схеми БД)

`SheetChoices.background` розширюється: `description`, `skills: DndSkill[]`, `tools: string[]`, `originFeat: { id, name } | null`, `open: number` (кількість відкритих виборів передісторії + origin feat). Заповнює `sheet-handler.ts` (вже має `loadBackground` і `featsById`); `open` рахується через `visitPicks`/`pendingCount`, обмежений власниками `background`/`backgroundFeat`.

## Поза межами

- Вибір передісторії в чернетці створення (є в `ChoicesEditor`) — не змінюємо.
- Ручні спорядження/гроші при виборі передісторії не змінюються (чинне правило, `battle.md`).
- Окремі іконки передісторій — останній етап епіку.
- Відкладені дрібниці етапу 3 (ClassSection `<details>` тощо) — окремо.

## Тести

- `wizard.test.ts`: крок `background` є, коли порожньо; немає, коли обрано без `keep`; є з `keep`; немає без `backgroundsById` і поза `classMode`; `withStepBackground` скидає picks при заміні, зберігає при тому самому id.
- `ChoiceWizard`/`BackgroundPicker` (happy-dom): вибір картки викликає `setBackground`, попередження при заміні.
- `BackgroundSection` (happy-dom): три стани (немає / обрано / є відкриті вибори), кнопки лише при `canEdit`.
- `sheet-handler`: нові поля `description/skills/tools/originFeat/open`.
- i18n: ключі `uk`/`en` (`characterProfile.path.background.*`, `choices.wizard.background.*`, `choices.wizard.source.background` вже є), `whatsNew.characterPathBackground` у `messages/*/whatsNew.json` + запис у `lib/onboarding/whats-new.ts`.

## Документація й завершення

`docs/architecture/characters.md` («Шлях персонажа», етап 4), `docs/STATUS.md`, whats-new. Живий прогін: кампанія TEST на prodcopy, десктоп + 390px, DM і гравець-власник (якщо є другий логін): обрати → змінити (попередження) → вибори передісторії → origin feat. Тестові дані прибрати.
