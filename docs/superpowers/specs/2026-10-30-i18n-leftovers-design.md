# i18n: останні 10 файлів з `eslint-disable no-restricted-syntax`

Продовження частин 1–7 (main 1512efe17). Мета: або прибрати кирилицю + disable, або лишити з причиною. Ніякої міграції схеми.

## Висновки інвентаризації (відрізняються від початкового припущення)

- **Рівні заклинань** (`spells.ts`) НЕ зберігаються в БД: `spellLevelName(level, t)` будує підпис при показі, `spellLevelFromName` лише розбирає його назад для сортування. Виправлення — тримати число рівня поруч з підписом, не парсити. Дані не змінюються; розбір «Перше коло»/«First circle» стає непотрібним (старі збережені назви груп — це `SpellGroup.name`, їх ніхто не парсить на рівень).
- **Групи музики** обчислюються з назви треку («Раса - Битва N»); у БД лежать лише назви треків. Кирилиця тут — конвенція назв HoMM-бібліотеки (`Битва`). `OTHER_TRACK_GROUP`/`BATTLE_TRACK_GROUP` — внутрішні id фільтра, а не збережене.
- **`ActiveEffect`** вже має `label?: LogLine`, `effectTitle` показує `label ?? name`; кондиції вже пишуть `label`. Лишилось: `name` (рядок) і `description` (рядок) пишуться uk-текстом.

## Рішення

1. **Збережені ефекти.** `CriticalEffect` втрачає `name`/`description` (UI та лог уже читають `battleTerms.crits.<source>.<success|fail>.<id>.{name,description}` через `critNameRef`/`dynamicTextRef`). `applyCriticalEffect` пише `name` = нейтральний id (`crit.<source>.<kind>.<id>`), `label` = `critNameRef`, `description` = TextRef на ключ опису. Те саме для `CONDITION_5E_REGISTRY`: `label`/`description` рядки зникають, `name` = ключ стану (`blinded`), `label`/опис — ключі `battleCommon.conditions.<key>.*`. Старі збережені ефекти з uk-рядками читаються як є (`LogLine = string | TextRef`). Кастомні стани (`def.name`) — контент, без змін. `snapshotHash` від мови не залежить. **Compat-перевірка (T1 крок 0):** усі споживачі `ActiveEffect.name/description` у main (ефект-саммарі, AI-дайджест, схеми, порівняння за назвою) мусять терпіти нейтральний `name` і TextRef в `description`; якщо ні — два коміти (спочатку читачі обох форм, потім запис нового), позначити в STATUS «деплоїти окремо».
2. **Групи.** `spells.ts`: групування по числовому рівню (`Map<number,…>`), підпис — `spellLevelName(level, t)` при рендері; `spellLevelFromName`, ordinals/suffixes видаляються разом з disable. Музика: `OTHER_TRACK_GROUP`/`BATTLE_TRACK_GROUP` → нейтральні id (`"\u0000other"`, `"\u0000battle"`), ключове слово «Битва» (і рядки, що з нього будуються в `battle-titles.ts`) переїжджає в `lib/constants/track-title-conventions.ts` (додати в `i18n-exempt.json` з причиною «конвенція назв треків HoMM у БД»). Дані в БД не змінюються.
3. **`LEGACY_THREAD_TITLE`.** Одноразовий `scripts/db/rename-legacy-ai-threads.ts` (dry-run за замовчуванням, `--apply`, шаблон `backfill-default-attacks.ts`): заголовок «Новий тред» → `null` (UI показує `thread.untitled`). Константа і підтримка видаляються окремим комітом лише після того, як користувач підтвердить запуск на проді; до того лишається з причиною «видалити після scripts/db/rename-legacy-ai-threads.ts --apply на проді». Скрипт на проді — тільки з явного дозволу.
4. **`ungrouped.ts`.** `UNGROUPED_LABELS` прибирається: `groupUnitsByRace` повертає `label: ""` для групи без раси (як ключ `UNGROUPED_KEY`), підпис дає UI через `groupDisplayName(key, t("ungrouped.race"))`; інші поля `UNGROUPED_LABELS` перевірити grep-ом (UI вже читає `gameTerms.ungrouped.*`).
5. **Імпорт.** Кирилична таблиця типів шкоди/слів/«к»-кубів із `unit-parsing.ts` → `lib/constants/import-aliases.ts` (вже exempt); колонки `types/import.ts` (рядкові літерали «Навички/Здібності») — туди ж. Поведінка парсингу незмінна; тести на uk/en аліаси.
6. **`LocaleSwitcher`.** Рідні назви мов → `lib/i18n/native-language-names.ts` + запис у `i18n-exempt.json` («рідні назви мов, навмисно не перекладаються»). Поведінка та тест правила (`eslint/__tests__/cyrillic-rule.test.ts`) без змін.

## Обмеження

- Відкат прод-коду лише на частину 7+. Нові формати пишуться лише там, де main (ч.7) їх читає (див. рішення 1, compat-перевірка).
- Нові ключі економно: `scope-size` (root < 20 KB, campaign+battle uk < 100 KB, зараз 94,6). Нові ключі потрібні лише для описів станів/критів, якщо їх ще немає в `battleTerms`/`battleCommon` (перевірити — очікується, що є).
- Без `prodcopy-db.sh`; прод-скрипти — лише з дозволу.

## Готово, коли

`git grep -n "eslint-disable.*no-restricted-syntax" -- '*.ts' '*.tsx' ':!*__tests__*'` лишає тільки обґрунтоване (очікувано: `ai.ts` до запуску скрипта); паритет/scope-size/untranslated зелені; повні `test:run`, `tsc`, `lint`; `i18n.md`, `STATUS.md`, `battle.md` оновлені; браузерна перевірка (бій з критами/станами uk/en, плейлист, форма заклинань, тред AI); Opus-рев'ю `git diff origin/main...HEAD`.
