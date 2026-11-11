# WFRP 5g-4: завершення шаблону Grim d100

Дата: 2026-11-10. Гілка `feat/wfrp` (не мерджити і не пушити, WFRP off main до кінця епіку, див. [[feedback-wfrp-no-main]]).
Контекст: [5g-0](2026-11-09-wfrp-5g0-design.md), [5g-1](2026-11-10-wfrp-5g1-design.md), [5g-2](2026-11-10-wfrp-5g2-design.md), [5g-3](2026-11-10-wfrp-5g3-design.md), [rule-systems.md](../../architecture/rule-systems.md) («Межі 5g-0…5g-3», «Звірити з книгою»), [content-api.md](../../architecture/content-api.md) («Мова контенту SRD», «Офіційні шаблони на prod»).

## Мета й рішення брейнстормінгу

Шаблон Grim d100 (4 види, 16 кар'єр, 50 талантів, 30 юнітів, 30 заклинань, 56 предметів, правила) стає готовим до prod: має uk-версію, іконки, оригінальні назви, wfrp-обізнаний AI-асистент і задокументовану prod-команду.

Успіх: клон шаблону з `contentLocale=uk` має повністю український контент, `en` — англійський; sync тримається мови кампанії; усі ~186 записів мають іконки в `icons.json`; AI-асистент у wfrp-кампанії бачить характеристики/Wounds/кар'єри/`systemStats`; шаблон після смоуку прибраний із БД `wfrp`.

Рішення користувача (2026-11-10):

| Питання | Рішення |
|---|---|
| Переклад | Узагальнити overlay SRD: один канонічний англійський шаблон + hash-словник uk, picker en/uk |
| Іконки | Усе (~186: юніти, заклинання, предмети, види, кар'єри, таланти) |
| Назва шаблону | Лишається `GRIM_TEMPLATE_NAME = "Grim d100"` |
| Charcoal Burner / Herald | Перейменувати на оригінальні: кар'єра **Ashburner**, рівень **Crier** |
| `races.profile` у CSV | Не додавати (посилання за id), задокументувати |

Поза 5g-4: merge/push і prod-виконання, перевірка книги 5e, архітектурне рев'ю (пункт 0 STATUS), нові механіки рушія, переклад компендіумів користувача.

## Що перевикористовується (reuse before writing)

- Локалізація: `lib/srd/i18n/{catalog,overlay}.ts`, `lib/server/templates/{localize-srd-bundle,srd-translations,prepare-source}.ts`, `sync/context.ts`, `list-templates.ts`, `TemplatePicker`, `lib/utils/campaigns/template-locales.ts`, CLI `scripts/srd/i18n/*` (extract/apply/status/normalize, `validate`, `batches`).
- Завантажувач і дані: `scripts/grim/{load-template,validate-data,coverage,forbidden-terms}.ts`, `data/templates/grim-d100/*`.
- Іконки: конвеєр `scripts/assets/tokens-5e/*` (`upload-tokens-5e`, `upload-identity-icons`), `build-icon-prompts.ts`, формат `icons.json` SRD.
- AI: `lib/ai/context/prompt.ts`, `lib/ai/tools/{party,battle,reference}.ts`, `lib/utils/rules/systems` (`systemOf`/реєстр).
- Імпорт: `lib/utils/content/import/fields/*`, `lib/constants/import-aliases.ts` (`exampleOf`).

Нового: реєстр локалізацій шаблонів, локалізація `bundle.rules` і `races.profile`, Grim-словник і CLI-параметр шаблону, `icons.json` Grim, wfrp-гілки в AI-проєкціях, runbook.

## Дизайн

### 1. Реєстр локалізацій шаблонів
- Новий реєстр `TEMPLATE_LOCALIZATIONS: Record<templateKey, { locales, kinds }>` (клієнтський, без словників) у `lib/utils/campaigns/template-locales.ts`; серверний `lib/server/templates/template-translations.ts` зіставляє `templateKey + locale` зі статично імпортованим словником (`srd-5.2/i18n/uk.json`, `grim-d100/i18n/uk.json`). Клієнт словників не отримує.
- `isOfficialSrdTemplate`/`isCanonical…`/`isLegacy…` узагальнюються до `isLocalizableTemplate(source)` і `localizationOf(source)`; SRD-імена-обгортки лишаються як тонкі псевдоніми, поведінка SRD без змін.
- `prepare-source.ts`, `sync/context.ts`, `list-templates.ts`, `TemplatePicker` беруть реєстр замість `SRD_TEMPLATE_NAME`. Правило однозначності канонічного джерела діє на кожен `templateKey` окремо (два кандидати для Grim → `…CANONICAL_UNAVAILABLE`).
- `GRIM_TEMPLATE_NAME` стає `templateKey` шаблону; завантажувач Grim публікує його як `visibility=official`, `locale=en`.

### 2. Локалізація bundle для Grim
- `localizeSrdBundle` отримує таблицю `careers` (назви, `tiers[].name`/`trappings`/`description`, текст рівнів) і толерує порожні `classes`/`backgrounds`/`spellGroups`.
- `races.profile` (`SpeciesProfile`): переклад лише текстових полів; id `featId`/`careerId`/`talents` не чіпаємо.
- **`bundle.rules`.** Окрема функція `localizeRules(rules, translations)` перекладає `rules.tables[*].rows[*].text` (≤200 символів); решта правил — числа/ключі, не чіпаємо. Sync порівнює правила по механіках за хешем, тож `loadSyncContext` локалізує правила тією ж накладкою; тест: клон `uk` одразу після створення дає порожній sync-diff для правил.
- **Списки заклинань (`lists`).** У Grim немає класів, тож `lists` — самодостатні рядки. Вони перекладаються лише через одну таблицю імен списків (`buildNameMap`) у спеллах і не ніде інде; валідатор після накладки перевіряє, що кожне `lists` резолвиться, а колізії назв після перекладу відхиляються до запису (як у SRD).
- `knownSpells`/`abilities` юнітів, профілі й tiers посилаються за id, `remapIds` без змін.

### 3. uk-словник Grim
- `data/templates/grim-d100/i18n/uk.json` (hash→переклад), глосарій `glossary/uk.json`. Ключ `sha1(клас \0 англ. текст)[0..10]` як у SRD; класи `n`/`d`; нові ключі для рядків профілів, кар'єр і `rules.tables`.
- CLI `pnpm srd:i18n <cmd> <locale> --template grim` (extract/apply/status/normalize) читає каталог Grim (`readGrimData`) замість `readSrdData`; `extractCatalog` генералізується до `TemplateData`. Валідація `apply` без змін (числа, кубики, Markdown).
- Глосарій узгоджується з уже перекладеним wfrp-UI (Wounds/Рани, Fate, Corruption…).
- Переклад виконують Sonnet-агенти пакетами; рядків ≈ 700–900 (оцінка по обсягу JSON ≈ 108 КБ). Валідація: покриття `status` = 100 % для Grim.
- Англійський лишається авторитетним; відсутній переклад = англійський рядок.

### 4. Перейменування
Кар'єра Charcoal Burner → **Ashburner**, рівень Herald → **Crier** у `careers.json` і `race-profiles.json` (`careerTable`). Ім'я не збігається з жодним іншим записом; `forbidden-terms` не чіпається. Тести/цифри каталогу без змін, оновлюється документація (`rule-systems.md`).

### 5. Іконки (~186)
- `data/templates/grim-d100/icons.json` (ім'я → URL у Storage), підмішування в `load-template.ts` перед `importContent` (поле `icon`/`avatar` юнітів, `icon` заклинань/предметів, `icon` видів/кар'єр/талантів — по полях, які вже має схема кожного ресурсу).
- Генерація й завантаження: нові команди `pnpm assets:grim-icons` на базі `tokens-5e`/`identity-icons` (промпти через `build-icon-prompts.ts`). Завантаження в prod-Storage — лише з явного дозволу користувача в окремому кроці.
- QA-прохід: сканувати зображення на вшитий текст (у SRD 103/223 мали); результат — список у STATUS, не блокує.
- Валідатор: кожен запис каталогу має іконку або явний виняток; `grimCoverage` попереджає про відсутні.

### 6. AI-контекст (мінімум)
- `prompt.ts`: після рядка ролі додається рядок про рульову систему кампанії (`homm`/`dnd5e`/`wfrp`, wfrp = d100, Wounds, SL, Fate/Fortune, Momentum), без зміни для d20.
- `get_party`/`read_character`/`get_battle_state`: описи й проєкції для wfrp показують характеристики, кар'єру, Wounds замість AC/ability scores; d20/homm без змін.
- `reference` (units): для wfrp додається `characteristics`, Traits (`abilitySummary`); артефакти — `systemStats`.
- Без нових інструментів `careers`/`feats` (YAGNI, `AI_TOOLS` не росте).

### 7. CSV
Колонки `characteristics`, `systemStats`, кар'єри вже у `IMPORT_SPECS` і `exampleOf`. Додається тест, що приклад/експорт wfrp-кампанії містить ці колонки й round-trip кар'єр та `systemStats` зберігає значення. `races.profile` не імпортується й не експортується: документується в «Межі 5g-4».

### 8. Prod-команда (лише runbook)
У `content-api.md` («Офіційні шаблони на prod») і `rule-systems.md`: репетиція на prodcopy, свіжий бекап, `pnpm constructor:grim-template --owner <id> --allow-remote`, перевірка клонування `en`/`uk`, окремий крок генерації/завантаження іконок, порядок відносно міграцій епіку (7 migration-ів із STATUS) і DROP `race_profiles` після деплою. Нічого не виконується на prod.

### 9. Хвости 5g-3 (одна задача)
M2: прев'ю імпорту показує відмову `systemStats` для d20-кампанії; M7: ключ `traitRangeBreathOnly` → `traitRangeOnlyBreathRanged` (uk/en, тест); `recipeValues` не дає `NaN` для `rangeFt` Breath/Ranged (дефолт із рецепта).

## Тестування й завершення
Вузькі тести: словникові й локалізаційні (`localize-srd-bundle`, `srd-overlay`, нові Grim-кейси, SRD-регресія), `scripts/grim/__tests__` (валідатор, coverage, іконки), AI-проєкції, import round-trip. Інтеграція на БД `wfrp` (порт 54322): клон `en` і `uk`, sync після клонування порожній (включно з правилами), no-op повторного запуску, `lists` резолвляться; шаблон прибрати після смоуку. Не запускати повний `test:run` і repo-wide lint (pre-deploy гейт епіку); eslint лише по змінених файлах. Бюджети `scope-size`/OpenAPI перевірити (uk-ns Grim — не в клієнтських scope).

Порядок задач (для плану): 1 реєстр+узагальнення SRD-коду; 2 локалізація careers/profile/rules/lists; 3 CLI `--template grim`; 4 перейменування + хвости; 5 AI-контекст; 6 іконки (механізм, генерація); 7 переклад (пакети агентів) і інтеграція; 8 CSV-тест, docs/runbook; фінал: Opus-рев'ю, `/simplify`, STATUS/пам'ять.

## Ризики
- Переклад великий: найдорожча частина; ділимо на пакети, `status` показує покриття.
- Узагальнення SRD-коду зачіпає прод-шлях SRD: обов'язкова регресія наявних тестів overlay.
- uk-ns і OpenAPI-бюджети впритул (STATUS): нові ключі лише в Grim-словнику, не в клієнтських scope.
- `lists`/посилання за іменами: валідатор після накладки.
