# Шари контенту, Part 6: прибирання після Part 5

**Дата:** 2026-11-04 · **Гілка:** `chore/layers-part6`

## 1. Інвентар

**Живе, не чіпаємо** (читають HOMM5, Heroes, клони неопублікованих джерел і SRD-uk): `sync/{context,classify,apply,diff,state,selection}.ts` з `fallbackBaseline`, шлях бандла в `prepare-source.ts`, `exportCampaign`, `importBundle`, `layerOf`-розгалуження в `sync/service.ts`/`apply.ts`, `bypassLayer`, `exportLocalLayer`, `remapIds`. Підстава: `grep` викликів поза `legacy-migration/`.

**Мертве:** `lib/server/templates/legacy-migration/` (12 файлів, ~1270 рядків, 7 тестів), `scripts/constructor/legacy-layers.ts`, скрипт `constructor:legacy-layers` у `package.json`, запис `.migration-backup/` у `.gitignore`. Імпортує їх лише CLI-скрипт; прод має 0 придатних кампаній; `referrers-parity.test.ts` змушує реєструвати кожну нову Prisma-модель у `REFERRERS`.

**Ціна рішення:** якщо опублікують Heroes або шар навчиться локалізації SRD, з'являться клони для міграції; інструмент тоді відновлюється з git (останній коміт з ним — `692852992`).

## 2. Обсяг

1. Видалити мертве з §1.
2. Після видалення пошукати експорти поза `legacy-migration/`, що лишились без споживачів (зокрема `lib/constants/notifications`, `remap-ids`, `sync/__tests__/helpers`, `fake-sync-db`), і прибрати лише ті, що стали справді невикористаними (перевірка `grep`, не здогад).
3. Документи: `content-api.md` (прибрати розділ «Міграція legacy-клонів», залишити 2–3 рядки історії з посиланням на коміт; виправити «до Part 5» у «Sync поверх шарів»), `STATUS.md` (рядок Part 5 → закрито, Part 6 зроблено), архівувати спеку й план Part 5 у `docs/archive/superpowers/`, пам'ять.

**Поза обсягом:** будь-які зміни поведінки sync/бандла/клонування; БД і прод (міграцій немає, прод не чіпаємо).

## 3. План (лаконічно)

| # | Крок | Перевірка |
|---|---|---|
| 1 | `git rm` каталог, скрипт; правка `package.json`, `.gitignore` | `pnpm exec tsc --noEmit` без нових помилок |
| 2 | Пошук осиротілих експортів (§2.2), видалення знайденого разом з тестами | `pnpm test:related` по зачеплених файлах |
| 3 | Документація, архів, пам'ять | `grep -r legacy-migration` поза `docs/archive` порожній |
| 4 | `/simplify` не потрібен (чисті видалення); один Opus-рев'ю diff | — |
| 5 | Повний `pnpm test:run` і `eslint` по змінених файлах — один раз | зелено |

Реалізація — один Sonnet-імплементатор (кроки 1–3 механічні), без per-task рев'ю. Merge і push — після «так».
