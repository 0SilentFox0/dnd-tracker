# E4 S.6 — Contract: DROP 9 колонок статблоку d20

**Статус: підготовлено, НЕ застосовано.** Нічого тут не лежить у `prisma/migrations` і не змінює `prisma/schema.prisma`. План: `docs/superpowers/plans/2026-11-14-e4-plan.md` (S.6, RS). Рекомендація плану лишається: не дропати в E4 (колонки мають дефолти, виграш малий).

Колонки (`D20_CHARACTERISTICS_COLUMNS`): `strength dexterity constitution intelligence wisdom charisma armorClass initiative speed`; таблиці `characters`, `units`, `units_base` (модель `UnitBase`, генерується).

Файли: `migration.sql` (DROP 9×3, чернетка), `schema.patch` (`git apply --check` проходить: -27 рядків у `Character`, `Unit`, `UnitBase`).

## Передумови (всі, у цьому порядку)

1. Деплой S-B (читання з `characteristics`, dual-write) стабільний ≥1 деплой.
2. **Деплой «stop writing columns»** (окремий, до DROP): прибрати запис колонок у місцях зі списку «Запис» нижче; після нього відкат на код, що пише колонки, колонок уже не оновлює (вони застаріють).
3. Окремий all-system аудит на проді після кроку 2: **кожен рядок** усіх трьох таблиць має числові 9 ключів у `characteristics`; зафіксувати baseline-хеші шаблонів і порівняти їх після DROP, включно з non-d20 кампаніями та WFRP. Нинішній `--report --expect-zero` не є цим аудитом: він відбирає d20-рядки й порівнює JSON з колонками, що вже не є очікуваною умовою після stop-writing.
4. Grep читачів колонок у `lib/ systems/ scripts/ app/` = 0 (таблиця нижче; `statblock-guard` + `statblock-write-guard` зелені без винятків).
5. `active-battles-report --expect-idle`; бекап `scripts/db/backup-database.sh` (DIRECT_URL 5432).
6. Окреме «так» власника. Коміт міграції посилається на коміт, що прибрав читачів/запис (db-deploy.md).

## Кроки S.6 (окремий деплой)

1. Застосувати `schema.patch` до `prisma/schema.prisma` (`git apply docs/superpowers/plans/e4-s6-drop-columns/schema.patch`), потім перегенерувати `UnitBase`: `pnpm exec tsx scripts/db/gen-base-models.ts` (ідемпотентно; `UnitBase` між маркерами має збігтися з патчем, перевірити `git diff`), далі `pnpm exec prisma generate`.
2. `migration.sql` -> `prisma/migrations/<ts>_drop_d20_statblock_columns/migration.sql` (прецедент `20261201000000_drop_race_profiles`); `prisma migrate dev --create-only` проти локальної БД для звірки: з auto-міграції видалити 12 FK-дрейфових `ADD CONSTRAINT` (content-base-fk-drift).
3. Правки коду нижче, `pnpm exec tsc --noEmit` (див. «Типи»), `pnpm test:run`, sweep на prodcopy.
4. Деплой з `main`; після міграції — `template sync --dry-run` по кампаніях = 0 дифів.

**Rollback:** після DROP значення колонок є лише в `characteristics`; Vercel-відкат схему не повертає, відкат коду на dual-write без колонок ламає запис. Єдине повернення колонок — відновлення з бекапу (дані, записані після бекапу, втрачаються) або ручний `ADD COLUMN` + бекфіл з `characteristics`.

## Де змінюється код

- **Бандл / хеш:** `t.columns` у `lib/server/templates/bundle.ts` бере поля з DMMF (`SCALAR_ENUMS`) — 9 колонок зникнуть самі після `prisma generate`; окремого списку немає. `lib/utils/content/row-hash.ts` (`FOLDED_COLUMNS`) і так докладає ключі з `characteristics` у хеш, лишити. **Ризик:** раніше хеш рядка включав колонки (в т.ч. дефолти); після DROP ключ, відсутній у `characteristics`, випаде з хешу, і хеш зміниться відносно збережених baseline. Перевірити повноту треба для всіх рядків трьох таблиць, не лише d20. Додатково в WFRP scalar-default поля нині можуть входити у content hash без відповідних вкладених WFRP-ключів; потрібна перевірка збереження їх hash-представлення до/після DROP. Після міграції порівняти зафіксований baseline й template sync dry-run = 0.
- **Читання / fallback:** `systems/d20/rules/characteristics/codec.ts` (`readD20Columns`: прибрати `row[column]` з `find`, лишити `stored[column]` -> `D20_COLUMN_DEFAULTS`); `lib/utils/rules/systems/column-view.ts` — `withStoredColumns`/`flattenStoredColumns`/`withColumnView` лишаються (читають `characteristics`), але фраза «else the column» у коментарі/доках застаріла; `D20_COLUMN_DEFAULTS` лишається.
- **Запис (dual-write):** `splitColumnView` (повертає `columns`) і `scripts/shared/d20-row-data.ts` (`d20RowData`) — прибрати колонки з вихідних `data`, лишити лише `characteristics`; `draftFields` (`app/api/campaigns/[id]/characters/draft/draft-data.ts`); решта у таблиці.
- **Select-и колонок:** прибрати `<col>: true` (лишити `characteristics: true` + overlay) — таблиця.
- **Гарди:** `lib/__tests__/statblock-guard.test.ts`, `statblock-write-guard.test.ts` — переписати на «жодна з 9 назв як поле Prisma-рядка» або видалити після DROP (типи Prisma самі це гарантують); оновити `lib/utils/content/__tests__/row-hash-statblock.test.ts`, `column-view-dual-write.test.ts`, `units-column-view.test.ts`, `systems/d20/__tests__/rules/characteristics/codec.test.ts`.
- **Типи:** `withColumnView/withStoredColumns` повертають `T` (Prisma-рядок), і код далі читає `character.strength` (`from-character.ts`, `from-unit.ts`, `balance/*`, `apply-transforms.ts` тощо). Після DROP ці типи зламаються. До DROP (у кроці «stop writing») ввести тип-розширення `T & D20Columns` у поверненні overlay-функцій. Остаточний список місць дає `prisma generate` на копії зі `schema.patch` + `tsc --noEmit`.

Звітність `--report --expect-zero` лишається корисною для dual-write d20 перевірки до stop-writing, але не може закривати передумову 3: після stop-writing legacy-колонки навмисно застарівають, а перевірка не охоплює всі system rows та WFRP hash-поведінку.

## Класифікація знахідок (grep по `lib/ systems/ scripts/ app/ prisma/`, без `__tests__`)

| Клас | Файли | Дія в S.6 |
|---|---|---|
| Запис (dual-write) | `lib/server/characters/operations/create.ts`, `lib/server/characters/operations/patch.ts`, `lib/server/characters/core/build-character-update-data.ts`, `lib/utils/characters/level-up/apply-level-gain.ts`, `systems/d20/server/operations/level-up.ts`, `app/api/campaigns/[id]/characters/draft/create-draft.ts` + `draft-data.ts` (`draftFields`), `.../[characterId]/draft/update-draft.ts`, `lib/server/content/resources/units.ts`, `lib/utils/units/unit-create-data.ts` (`unitCreateData`/`toUnitCreateData`), `lib/utils/units/import-units.ts`, `lib/server/compendium-import/adapters/shared.ts`, `scripts/shared/d20-row-data.ts`, `lib/utils/rules/systems/column-view.ts` (`splitColumnView`) | прибрати запис колонок (крок «stop writing») |
| Запис (скрипти/seed/sim) | `scripts/db/sync-unit-initiative.ts`, `scripts/seed/{seed-example-demo,seed-homm5-characters,seed-library-lib,seed-mock-battle-data}.ts`, `scripts/sim/{balance-library,simulate-battle}.ts`, `scripts/sim/battle-sweep/seed-template-heroes.ts` (усі через `d20RowData`) | після зміни `d20RowData` дані самі підуть лише в `characteristics`; перевірити `tsc` |
| Fallback-читання (кодек) | `systems/d20/rules/characteristics/codec.ts`, `lib/utils/rules/systems/column-view.ts`, `scripts/db/lib/backfill-d20-characteristics-{plan,db}.ts` (читає колонки для бекфілу/`--report`) | прибрати читання колонки; бекфіл-скрипт після DROP не запускається (видалити/архівувати разом із S.6) |
| Prisma `select: { <col>: true }` | `app/campaigns/[id]/character/draft/page.tsx`, `lib/ai/context/focus.ts`, `lib/ai/tools/party.ts`, `lib/server/campaigns/dashboard.ts`, `lib/server/characters/operations/list.ts`, `systems/wfrp/server/downtime-handler.ts` (`constitution`), `scripts/db/sync-unit-initiative.ts` | замінити на `characteristics: true` + `withStoredColumns` (де ще нема) |
| Читання overlay-рядка (тип Prisma) | `lib/server/battles/participant/from-character.ts`, `lib/utils/battle/participant/from-unit.ts`, `lib/utils/battle/balance/{stats,unit-library}.ts`, `lib/utils/battle/transform/apply-transforms.ts`, `lib/server/battles/balance/*` | значення вже з overlay; потрібне лише типове розширення (див. «Типи») |
| Не пов'язані | `lib/server/battles/store/load-battle.ts` (`initiative` участі бою), `lib/utils/rules/registry.ts`, `scripts/seed/seed-example-demo.ts` (`savingThrows` JSON), `lib/server/compendium-import/adapters/{race-traits,content}.ts` (`row.speed` рядка імпорту), `wfrp` `characteristics.base/move` (`units.json` фікстури), `abilities.*` ключі | нічого |
| Лише тести/фікстури | `statblock-guard`, `statblock-write-guard`, `row-hash-statblock`, `column-view*`, `codec.test`, `d20-row-data.test` | оновити/видалити (розділ «Гарди») |

Не знайдено: `orderBy`/`where` по цих колонках; сирого SQL/`$queryRaw` з їхніми назвами; шаблонів, що експортують колонки окремим списком (`t.columns` береться з DMMF). Класифікація зроблена `grep` (git grep на цій машині не підтримує `\b`), тож перед DROP підтвердити `tsc` на копії зі `schema.patch`.
