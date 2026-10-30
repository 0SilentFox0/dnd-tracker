# AI-іконки вмінь і ідентичностей SRD-шаблону

Гілка `feat/identity-icons` (worktree `../dnd-tracker-icons`). Дата: 2026-10-31.

## Мета

Засідити 263 готові AI-іконки (1:1 PNG, 768 px, `~/Downloads/fantasy-tokens`) у офіційний шаблон «SRD 5.2» (en і uk) і показати їх у застосунку: вміння класів і підкласів, раси, класи, підкласи, передісторії.

## Рішення (узгоджено з користувачем)

Іконки сідаються **лише для сутностей, що є в SRD-шаблоні**. Іконки поза SRD (3 раси, 9 передісторій, 39 підкласів) лишаються в `~/Downloads/fantasy-tokens`, у Storage не завантажуються, сутності для них не створюються (це окремий епік: ігрові механіки + тексти en/uk).

Охоплення: 9 рас, 12 класів, 12 підкласів, 4 передісторії, 186 вмінь (146 класових + 52 підкласових − 12 заглушок `*-subclass-3`).

## Reuse

| Що | Звідки | Як |
|---|---|---|
| WebP-конвертація | `scripts/assets/tokens-5e/convert.ts` (`toWebp`) | як є |
| Завантаження, хеш у імені, `staticAssetUploadOptions`, `ensureBucket` | `upload-tokens-5e.ts` | розширюю вхідні дані, цикл той самий |
| Файл мапінгу | `icons-file.ts` + `data/templates/srd-5.2/icons.json` | нові категорії поряд зі `spells/units/artifacts` |
| Підмішування при сиді | `withIcons` + `ICON_COLUMN` (`scripts/srd/lib/load-template.ts`) | нові види `races`, `classes`, `backgrounds` (колонка `icon`) |
| Бакети | `ASSET_BUCKET` (`attach-lib.ts`): `race-icons`, `class-icons` | нові: `background-icons`, `feature-icons` |
| Тест цілісності | `icons-integrity.test.ts` | додаю нові види |
| UI | `OptimizedImage`, `ChoiceCard`, `SubclassCard`, `BackgroundPicker` | вже приймають `icon` |

Нове там, де reuse неможливий: поле `icon` у схемі вміння та вкладені іконки в JSON класу (нижче).

## Модель даних (міграція не потрібна)

- `Race.icon`, `GameClass.icon`, `Background.icon` вже є (`String?`).
- Іконка підкласу: `GameClass.subclasses[].icon` (JSON; тип `Subclass.icon` вже є, `subclassSchema` приймає).
- Іконка вміння: у `AbilitySchema` (`lib/utils/abilities/schema/ability.ts`) **немає** `icon`. Додаю опційне `icon: z.string().max(2000)` з тим самим правилом, що `classIconSchema` (без `data:`), і `icon?: string | null` у тип. Це JSON усередині `classes.features[].abilities[]` і `subclasses[].features[].abilities[]`. Міграції немає, DDL немає, RLS не потрібен.
- Рушій читає здібності через `collectModifiers`/`runAbilities`; нове поле він ігнорує (перевірити, що `sourceHash` та інші хеші здібностей не ламаються: див. ризики).

## Мапінг `record_id` → сутність шаблону (детермінований)

- `feature:<клас>/<id>` → `classes.json[srd-2024_<клас>].features[].abilities[id]`.
- `feature:<клас>/<підклас>/<id>` → `…subclasses[id=<підклас>].features[].abilities[id]`. Перевірено: усі 186 рядків CSV збігаються з шаблоном, зайвих немає.
- `race:<x>` → `srd-2024_<x>`; `class:<x>` → `srd-2024_<x>`; `background:<x>` → `srd-2024_<x>`.
- `subclass:<клас>-<id підкласу>` збігається для 9 з 12. Три SRD-підкласи названі інакше, ніж у наборі іконок, тому явна таблиця аліасів у коді (з тестом):
  - `sorcerer/draconic-sorcery` → `subclass:sorcerer-draconic-bloodline`
  - `warlock/fiend-patron` → `subclass:warlock-the-fiend`
  - `wizard/evoker` → `subclass:wizard-school-of-evocation`
- Тест покриття: кожна сутність SRD з цього списку має іконку; кожен ключ в `icons.json` посилається на наявну сутність. Вміння-заглушки `*-subclass-3` явно виключені.

## Формат `icons.json`

Додаю категорії `features`, `races`, `classes`, `subclasses`, `backgrounds`. Ключі:
- `races`/`classes`/`backgrounds`: slug шаблону (`srd-2024_…`);
- `subclasses`: `<slug класу>/<id підкласу>`;
- `features`: `<slug класу>/<id>` або `<slug класу>/<id підкласу>/<id вміння>`.

`IconsFile`/`TokenKind` розширюються; `readIcons` лишається сумісним зі старими файлами (відсутня категорія = `{}`).

## Конвертація і сид

- `upload-tokens-5e.ts` (або сусідній `upload-identity-icons.ts`, якщо діф ускладнить скрипт: вирішити в плані) читає `input/features.csv`, `input/identity.csv` і PNG з `output-features`/`output-identity`. Мапінг вище, лише SRD-сутності.
- Розміри: вміння 256 px, раси/класи/підкласи/передісторії 256 px (як токени заклять), WebP q80.
- Бакети: `race-icons`, `class-icons`, `background-icons`, `feature-icons`; підкласи йдуть у `class-icons` під префіксом `<templateId>/subclasses/`.
- `--dry-run` конвертує без запису; `assertSeedTarget` і `--allow-remote` як зараз. Проти prod нічого не запускається; прод чекає кроку «офіційні шаблони на проді».
- `constructor:srd-template`: `withIcons` для `races/classes/backgrounds` ставить колонку; для `classes` додатково вбудовує `icon` у `subclasses[]` і `features[].abilities[]` (окрема чиста функція `withClassIcons`, з тестами).

## en / uk

- Оверлей `data/templates/srd-5.2/i18n/uk.json` підміняє лише тексти за хешем. Побудова укр. шаблону не торкається `icon`.
- Іконки зберігаються в `icons.json` за slug (не за локаллю), а `withIcons` викликається в `constructor:srd-template` після читання даних для будь-якої локалі, тож обидві версії посилаються на ті самі URL.
- Тест: дані шаблону зі `readSrdData(undefined, "uk")` і `"en"` після `withIcons`/`withClassIcons` дають однакові URL для всіх сутностей.
- Нових користувацьких рядків немає (іконки без підписів; `alt=""`), тож `messages/*` і ratchet не змінюються. Записи `whatsNew` не додаю: нова функція для користувача, але це візуальне доповнення довідника; рішення за користувачем у рев'ю спеки.

## UI

Перевіряю й за потреби дописую показ `icon` з fallback на наявну поведінку (літера/без картинки):
- Раса, клас, підклас, передісторія: `ChoiceCard`/`SubclassCard`/`BackgroundPicker` уже мають `icon`; перевірити create-character і `components/classes/*`.
- Вміння класів і підкласів: `ClassProgressionMap`/`ProgressionRowView` і `ClassFeaturesEditor`/`SubclassesEditor`: показ `ability.icon` (через `OptimizedImage`, `next/image`, `fallback`) і поле URL/завантаження в редакторі, як у `classIconSchema`.
- Шарування: компоненти не імпортують `lib/api` і не роблять `fetch`; дані приходять з існуючих хуків.
- Egress: лише WebP, `next/image`, кешовані заголовки `staticAssetUploadOptions`.

## QA вхідних іконок (перед сидом)

У вибірці з 36 іконок бачив вшитий текст на 4 (`Weapon Mastery`, `Jack of All Trades`, `Fast Hands`, `Entertainer`) і дрібні підписи/водяні знаки в кутках (`Sailor.`, `Servanin`, `A.priest`). Перед сидом:
1. Переглянути всі 224 SRD-іконки контактними аркушами (по ~60), скласти список із текстом/підписом.
2. Список віддати користувачеві; перегенерація: `python3 generate… --redo "<Name>"` / `generate_identity.py --redo "<Name>"` (Draw Things на порту 7860). Я генерацію не запускаю без вашого слова.
3. Підписи в кутках можна прибрати обрізкою (`fit: cover` із невеликим зумом): вирішити після огляду, чи лишається такий варіант у `convert`.

## Тести

- `scripts/assets/tokens-5e/__tests__`: розбір CSV, мапінг включно з аліасами підкласів, `readIcons` зі старим файлом.
- `scripts/srd/__tests__/icons-integrity.test.ts`: нові види, бакет, `.webp`, покриття, без осиротілих ключів.
- `load-template.test.ts`: `withIcons` для `races/classes/backgrounds`; `withClassIcons` (підкласи, вміння, заглушки без іконки).
- Паритет en/uk (див. вище).
- Схема вміння: `icon` валідний, `data:` відхиляється, відсутній не ламає існуючі фікстури/снапшоти.
- UI: компонентні тести на наявну і відсутню іконку (`happy-dom`).
- `pnpm test:related` під час роботи; повний `pnpm test:run` один раз перед мержем; eslint лише по змінених файлах.

## Ризики

- Хеші/снапшоти здібностей (`sourceHash`, `snapshotHash` для учасників бою): додане поле не повинно потрапляти в обчислення рушія. Перевірити в плані; якщо хеш рахується по всьому JSON вміння, `icon` виключається з нього.
- Імпорт через `importContent`: переконатися, що `classes` проходять валідацію з новим `icon` у вкладених здібностях (інакше рядок піде в помилку).
- Три підкласи з аліасами: якщо набір SRD зміниться, тест покриття впаде, а не промовчить.

## Поза межами

Нові сутності (раси/передісторії/підкласи поза SRD), їх переклади, запуск проти prod/Supabase, перегенерація зображень без команди користувача.

## Завершення гілки

`/simplify` по діфу, оновити `docs/architecture/` (повʼязаний файл) і `docs/STATUS.md`, на злитті перенести спеку й план у `docs/archive/superpowers/`.
