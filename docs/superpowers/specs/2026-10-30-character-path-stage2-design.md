# Шлях персонажа, етап 2: умови доступу і простий вибір

Гілка `feat/character-path-stage2` (worktree `../dnd-tracker-path`), від `main` після злиття етапу 1. Етап 2 з чотирьох; етап 1: `2026-10-30-character-path-stage1-design.md`.

## Навіщо

«Хочеш це → потрібно ось це». Новачок бачить, чому feat чи підклас недоступні, з числами («Сила: потрібно 13, зараз 10»). Вибір простий: іконка, назва, один рядок суті, повний текст за кліком. Діалог виборів не стіна тексту, а по одній справі за раз.

Аудиторія: гравець і DM однаково; права редагування лишаються `sheet.choices.canEdit`.

Критерій успіху: новачок без підказок пояснює, чому риса X закрита і що зробити, щоб її відкрити, і проходить усі відкриті вибори героя за один майстер без читання довгих текстів.

## Що вже є (повторно використовуємо)

| Що | Де |
|---|---|
| Передумови feat'а | `FeatData.prerequisite`, `featPrerequisiteMet` (`lib/utils/characters/choices/validate.ts`) |
| Передумови опцій | `ChoiceOption.minLevel`/`requires`, `optionIssues` |
| Обхід виборів героя | `forEachChoiceOwner` (дає власника: раса, передісторія, класи, риси) і `visitPicks` у `walk.ts`; `classChoiceDefs`, `isChoiceOpen`, `countFeats` |
| Редактор і пікер | `ChoicesEditor` (проп `only`), `ChoicePicker`, `OptionButton`, `PickerContext.featCounts/scoreAfter` |
| Збереження | `useCharacterChoices.save`, `choicesBodyOf`, `prunePicks`; сервер `saveCharacterChoices` (`lib/server/characters/core/choices-handler.ts`) |
| Стрічка рівнів | `buildClassProgression`, `splitPathRows`, `rowItems`, `PathRowCard`, `CharacterPath` |
| Рівень | `ClassLevelUpDialog`, `useClassLevelUpForm.needsSubclass` |
| UI | `ResponsiveDialog`, `EntityIcon`, `HudPill`; `summarize` з `progression.ts` для рядка суті (зараз приватний: виноситься в `lib/utils/characters/classes/summary.ts` й імпортується обома) |

Нове потрібне, бо: валідація знає лише «так/ні» (`CHOICE_*`, `FEAT_PREREQUISITE`), картки в пікері показують загальне «не виконано», а діалог виборів вивалює всі секції разом.

## Дизайн

### 1. Модель причин (`lib/utils/characters/choices/requirements.ts`)

```ts
type Requirement = { met: boolean } & (
  | { kind: "level"; need: number; have: number }
  | { kind: "ability"; abilities: AbilityKey[]; need: number; have: number }
  | { kind: "option"; missing: string[] }
  | { kind: "manual"; text: string }
  | { kind: "text"; text: string }
);
requirementsOf(source: FeatData | ChoiceOption, ctx): Requirement[]
```

- `featPrerequisiteMet` = `requirementsOf(...).every(met)` (зараховуються `level` і `ability`; `manual`/`text` довідкові). Правило не змінюється: рівень ≥ level І будь-яка зі `scores.abilities` ≥ min.
- `optionIssues` бере `minLevel`/`requires` звідти ж.
- `ability.have` береться з `scoreAfter`, коли він є: підняв Силу в цьому ж майстрі, і картка одразу відкривається.
- Переклад на межі UI: `choices.requirement.{level,ability,option,manual}` у `messages/{uk,en}/choices.json`. Чиста функція повертає структуру, не текст.

### 2. Майстер виборів

- `wizardSteps(state, refs, hero)` (чиста, `lib/utils/characters/choices/wizard.ts`) будується на `forEachChoiceOwner` (власник дає «Звідки») і повертає лише відкриті вибори, по одному на крок: `{ key, source, kind, choice, summaryKey }`. Власного обходу не пише.
- Крок = «Звідки» (Раса: …, Передісторія: …, Клас: … N-й рівень) + «Що дає» (одне речення за `kind`, ключ у `choices.json`) + один `ChoicePicker`.
- Підклас: окремий крок, коли рівень ≥ `subclassLevel`, а підкласу нема; пишеться через розширений `PUT /choices` (розділ 6).
- Хук `useChoiceWizard` (`lib/hooks/characters/`): поточний крок, «Назад/Далі», збереження на будь-якому кроці через наявний `useCharacterChoices.save`. Запису нового нема.
- `ChoicesDialog` показує майстер; «Крок N з M». Скасування крок не губить: `prunePicks` як зараз.
- Іменований старт: `ChoicesDialog` приймає `startAt?: string` (ключ вибору), `onPick` у «Шляху» передає `pick.key`.

### 3. Картка вибору

`OptionButton`: іконка (літера через `EntityIcon`), назва, один рядок суті (`summarize`), «i» відкриває повний опис у `ResponsiveDialog`. `ChoiceDescription` із «Докладніше» прибирається з кроку.

Недоступні: дві групи, «Можна обрати» і «Поки недоступні». У другій картки сірі, під назвою кожна невиконана вимога окремим рядком; виконані позначені ✓. Те саме для опцій із `requires`/`minLevel`. Feat, уже взятий деінде й не repeatable, лишається заблокованим із причиною «вже взято: <джерело>» (існуючий `featCounts`).

### 4. Підписи списків рис

Кожен крок із `kind: "feat"` має підпис походження й призначення: «Риса передісторії (Soldier): початкова риса», «Human Versatile: риса початкового рівня», «Збільшення характеристик, Fighter 4: риса або +2». Підписи ключами в `choices.json` за `source`.

### 5. «Шлях»

- `onPick(pick.key)`: майстер відкривається на цьому кроці. Без `canEdit` лише текст.
- Підклас у майбутньому рівні: рядок «відкривається на N-му рівні» плюс «Які бувають» (`<details>`): назва підкласу й що він дає за рівнями. `subclassPreview(progression)` у `lib/utils/characters/classes/path.ts` з наявних `bySubclass`.
- Майбутній рядок із `bySubclass` без обраного підкласу: чіп «Залежить від підкласу».
- `ClassLevelUpDialog`: крок підкласу використовує ту саму картку підкласу.
- Лічильник «доступно N з M рис» у стрічці **не** додаємо: треба тягнути каталог рис у `sheet` (egress).

### 6. Серверна зміна: підклас у `PUT /choices`

`ChoicesBody` зараз має лише `classChoices`; підклас пишуть тільки level-up (піднімає рівень) і редактор класів. Додаємо необов'язкове `classSubclasses?: Record<classId, subclassId>` (`lib/schemas/choices.ts`, `types/choices.ts`). У `saveCharacterChoices` після `withClassPicks` застосовується до `before.classes`:

- підклас уже заданий і відрізняється: `SUBCLASS_ALREADY_SET` (422, наявний код);
- підкласу нема в класі: `SUBCLASS_NOT_FOUND` (наявний у `application.ts`);
- рівень запису < `subclassLevel`: помилка (нове `SUBCLASS_TOO_EARLY` у `api-errors.ts` і `messages`);
- нічого не змінюється, коли поля нема. Міграцій нема. Лог `CHOICES_EDIT` уже пише `before/after`.

План має підтвердити, що `resolveCharacterChoices` перераховує вибори підкласу (відкриваються `bySubclass`-вибори) після зміни `classes`.

## Поза межами

Мультиклас і HoMM-дерево (етап 3); передісторія як майстер (етап 4); справжні іконки feature (`ProgressionItem.icon?` пізніше); нові колонки, міграції, API; зміна правил передумов; вимоги «потрібен слот N-го рівня» і «потрібен підклас X» для feat'ів (у `FeatData` цих даних нема).

## Тести

- `requirementsOf`: рівень, найкраща зі здібностей, `scoreAfter`, `requires`, `manual`; `featPrerequisiteMet` дає ті самі відповіді, що й до змін (наявні тести без правок).
- `wizardSteps`: порядок (раса, передісторія, класи), лише відкриті, підклас-крок лише коли рівень досягнуто, `startAt`.
- `PUT /choices` з `classSubclasses`: успіх, `SUBCLASS_ALREADY_SET`, `SUBCLASS_NOT_FOUND`, `SUBCLASS_TOO_EARLY`, без поля поведінка не змінилась.
- `useChoiceWizard` і `ChoicesDialog` (happy-dom): крок N з M, «Назад/Далі», збереження з будь-якого кроку, старт на заданому кроці.
- Картка: дві групи, причина з числами, ✓ на виконаному, розблокування після підняття здібності в тому ж майстрі, «i» відкриває повний текст.
- `subclassPreview` і «Шлях»: «Які бувають», чіп «Залежить від підкласу», `onPick` отримує ключ.
- Ключі uk/en збігаються; `whatsNew` запис `2026-10-30-character-path-choices` у `lib/onboarding/whats-new.ts` і `messages/{uk,en}/whatsNew.json`.

## Перевірка в браузері

Subagent на Sonnet, кампанія TEST на локальній `prodcopy`: герой із низькою Силою бачить причину «Сила 13, зараз 10» і розблоковує її в майстрі; герой без підкласу проходить крок підкласу; десктоп і телефон (same-origin iframe 390px); перевірки через JS/текст; тестові дані видалити.

## Ризики

- Після вибору підкласу з'являються нові відкриті вибори: майстер після `save` перезавантажує стан і додає кроки, а не закриває діалог.
- `ChoicesEditor` лишається для level-up (`only`) і DM-форм: майстер лише в `ChoicesDialog`; спільна логіка в `wizardSteps`, щоб не розійшлися.
- Кроки залежать від стану (вибір підкласу відкриває нові вибори): `wizardSteps` перераховується після кожної зміни, поточний крок утримується за `key`.

## Етапи

1. Етап 1 (змерджено в `main` 2a4612eb8).
2. Цей спек.
3. Мультиклас і HoMM-дерево.
4. Передісторія.
