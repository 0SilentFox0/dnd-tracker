# Шлях персонажа, етап 3: мультиклас і єдина вкладка

Етапи 1–2: `2026-10-30-character-path-stage2-design.md` (змерджено). Етап 4 (передісторія) — окремий спек.

## Мета й рішення

Вкладка героя «Шлях» має працювати однаково добре для героя з кількома класами 5e і для героя HoMM-дерева. Рішення користувача: **одна вкладка, два режими** (режим визначає наявність `sheet.classProgression`, як і зараз); змішаного героя (класи + HoMM-гілки) немає.

Проблеми зараз:
- кілька класів = кілька однакових секцій без спільного підсумку (загальний рівень, розклад за класами, відкриті вибори);
- вимоги мультикласу перевіряє лише сервер (`class-level-up.ts`), у `ClassLevelUpDialog` недоступний клас вибирається, а відмова приходить після відправки;
- вкладка героя без класів зветься «Навички» й виглядає як окремий продукт.

## Reuse (що не пишемо заново)

| Потрібно | Беремо |
|---|---|
| Причини недоступності | зразок `requirementsOf` (`lib/utils/characters/choices/requirements.ts`): `{ met, need, have }` |
| Вимоги мультикласу | `SRD_MULTICLASS`, `MULTICLASS_MIN_SCORE` (`lib/utils/characters/classes/multiclass.ts`); `multiclassBlockedBy` лишається для сервера |
| Рядок класу, підсумок | `pathSummary`, `splitPathRows`, `chosenSubclassId` (`classes/path.ts`) |
| Додавання класу | `ClassLevelUpDialog` + `useClassLevelUpForm` (`NEW_CLASS`, `available`) |
| HoMM-режим | `ProgressionPanel` і `PointsHeader` без змін логіки |
| Картки, пілюлі | `HudPill`, `PathRowCard`, `CharacterPath` |

Нове лише там, де нічого такого нема: `multiclassReasons`, шапка 5e-шляху, згортання секцій класів.

## Дизайн

### 1. Чисте ядро: `multiclassReasons`

`lib/utils/characters/classes/multiclass.ts`:

```ts
export interface MulticlassReason { className: string; abilities: AbilityKey[]; need: number; have: number }
export function multiclassReasons(current, next, scores): MulticlassReason[]
```

Для кожного класу з `[...current, next]` і кожної невиконаної групи вимог — запис (`have` — найкраща зі здібностей групи, `need` = `MULTICLASS_MIN_SCORE`). Порожній масив = клас доступний. `multiclassBlockedBy` стає `multiclassReasons(...)[0]?.className ?? null`, тож сервер і UI рахують однаково; наявні тести без правок. Класи без запису (свої, HoMM) ніколи не блокують.

### 2. Додавання класу з причинами

`useClassLevelUpForm`: опційний `startNew: true` (початковий `choice = NEW_CLASS`); `available` стає `{ cls, reasons }[]`, `reasons` рахуються з `character.hero.scores`, без `hero` порожні. Блокує лише сервер, UI підказує: недоступний клас лишається у списку, `disabled`, підпис «Wizard: Інтелект 13, зараз 10». Зараз `available` читають лише діалог і тести, `newClass`-логіка не змінюється.

`ClassLevelUpDialog`: опції `SelectField` з `disabled` + причиною; текст причини під селектом для вибраного (на випадок, коли disabled-опцію вибрано програмно).

### 3. Шлях 5e: шапка й секції

`components/character-profile/path/ClassesHeader.tsx` (нова, презентаційна):
- «Рівень 5 · Fighter 3 / Wizard 2», пілюля «N виборів» (сума `pathSummary.open`), кнопка «+ Новий клас»;
- кнопка лише коли передано `onAddClass` і `level < maxLevel`; `onAddClass` є тільки в режимі `manage` (level-up — DM-дія, `operations/level-up.ts`), у перегляді гравця кнопки нема.

`SkillsTab`: секції класів — `<details>` з заголовком «Fighter · 3 рів. · підклас Champion»; відкрита за замовчуванням, якщо класів ≤ 2 або в класі є відкриті вибори; інакше згорнута. Повний `CharacterPath` усередині без змін. Один клас = нинішній вигляд плюс шапка.

`SkillsTab` отримує опційний `classLevelUp` (форма пропсів як у `LevelUpAction`), `ProfileEditor` передає той самий об'єкт, що й у `LevelUpAction` (дані записів класів і здібностей уже є там, нових запитів нема); кнопка відкриває `ClassLevelUpDialog` з `startNew`.

### 4. Шлях HoMM і назва вкладки

- Вкладка «Шлях» для обох режимів (`CharacterProfile`: прибрати розгалуження `hasPath ? path : skills`); ключ `skills` лишається для заголовка внутрішніх блоків.
- HoMM-режим: `ProgressionPanel` як є, його `PointsHeader` лишається шапкою; візуально шапки однакові (спільний клас-рядок у `components/character-profile/path/header.ts`, обидві шапки його використовують).
- Тіло блоків під «Шляхом» (`FeatsBlock`, `RacePassive`, `ChargesList`, особиста навичка) без змін.

## Поза межами

Змішаний герой; передісторія як майстер (етап 4); самостійний level-up гравцем; справжні іконки feature; зміна правил мультикласу (SRD-таблиця лишається, 13 в обох); міграції й нові API; відкладені дрібниці етапу 1 (`SpellPicksNudge` дублює діалог, `openSpellPicks` без перевірки `caster`) — не чіпаємо.

## Тести

- `multiclassReasons`: клас без вимог, одна група, дві групи (Monk, Paladin) з однією невиконаною, невиконана вимога вже наявного класу, `have` — найкраща зі здібностей групи, порожній результат; `multiclassBlockedBy` повертає те саме, що й раніше (наявні тести).
- `useClassLevelUpForm`: `startNew`, `available` з причинами, без `hero` без причин.
- `ClassLevelUpDialog` (happy-dom): disabled-опція з причиною, доступний клас підтверджується.
- `ClassesHeader`: розклад за класами, відкриті вибори, кнопка лише з `onAddClass` і нижче максимуму.
- `SkillsTab`: згортання секцій за правилом (≤ 2 класів, відкриті вибори), назва вкладки «Шлях» без класів; `manage` показує кнопку, перегляд — ні.
- Ключі `uk`/`en` збігаються; запис `2026-10-30-character-path-multiclass` у `lib/onboarding/whats-new.ts` і `messages/{uk,en}/whatsNew.json`.

## Перевірка в браузері

Subagent на Sonnet, кампанія TEST на локальній `prodcopy`: герой із двома класами (шапка, секції, згортання); DM додає клас: недоступний із причиною, доступний проходить; гравець не бачить кнопки; HoMM-герой бачить «Шлях» з деревом; десктоп і 390px (same-origin iframe); перевірки через JS/текст, тестові дані видалити.

## Ризики

- `available` змінює форму: перевірити всі споживачі (`rg "available" ClassLevelUpDialog useClassLevelUpForm` + тести).
- Згортання секцій не повинно ховати відкриті вибори: правило «є відкриті вибори → відкрита».
- Перейменування вкладки HoMM («Навички» → «Шлях»): може збити тих, хто звик; відображено в whats-new.
