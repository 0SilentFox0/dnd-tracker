# Передісторії персонажа — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Tasks1–6 завершено; фінальний checkpoint нижче.

**Goal:** Додати налаштовувані передісторії кампанії до наявної системи виборів персонажа та SRD-шаблону.

**Architecture:** Окремий ресурс backgrounds через defineResource; спільні Choice/Picks, planChoices і choiceSelections. Біографія зберігається; інструменти обліковуються як володіння, стартове спорядження й гроші — опис для ручної видачі ДМ.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Prisma 6/PostgreSQL, Vitest, pnpm.

**Spec:** `docs/archive/superpowers/specs/2026-10-24-constructor-backgrounds-design.md`, погоджено користувачем 2026-10-24 після явного питання про ручну видачу спорядження.

## Global Constraints

- Тільки /Users/silentfox/Work/dnd-tracker-constructor і feat/constructor; основний dnd-tracker не чіпати.
- Перед виконанням завершити checkpoint і коміт 4f-5b; успішний production build не підтверджений. Потім підтягнути origin/main у feat/constructor, зберігши сторонні HOMM-gate та SRD CSV зміни.
- БД тільки postgresql://postgres:postgres@localhost:54322/constructor, контейнер dnd-tracker-db-1. Перед записами перевіряти DATABASE_URL/DIRECT_URL; Prisma після завантаження .env.local, тільки migrate deploy.
- Без prod/prodcopy, push, злиття в main та deploy; не починати 4f-6 або етап 6.
- Character.background — біографія; без автоматичного вибору для старих героїв. Новий вибір необов'язковий і доступний у чинному режимі класів.
- Одна система Choice/Picks; без нового інвентарю, рушія бонусів чи заклинань. Спорядження та гроші не видаються автоматично.
- SDD-артефакти зберігати; коміти тільки з явним переліком файлів. Готові перевірки 4f-5b не повторювати для документації.

## Review Focus

- Зміна A → B має відкочувати ASI через визначення A, а додавати через B; тест у Task2.
- Старий вільний origin + нова передісторія мають дати явний конфлікт без втрати даних; Task3.
- Зняття передісторії не забирає ручні володіння чи незалежну расову рису; Task3.
- Редагування/видалення контенту не має залишати неправильний ASI або dangling refs; Task1/4.
- Старий bundle без backgrounds та повторний SRD-імпорт мають лишатися працездатними; Task4/6.

## Карта файлів і контрактів

Нові доменні файли: `types/backgrounds.ts`, `lib/schemas/backgrounds.ts`, `lib/utils/backgrounds/row.ts`, `lib/server/backgrounds/usage.ts`, `lib/server/content/resources/backgrounds.ts`. Патерни — відповідні feats-файли, без копіювання спільної інфраструктури.

`BackgroundData`: `{ id, name, icon, description, choices: Choice[], skillProficiencies: DndSkill[], toolProficiencies: string[], originFeatId: string | null, equipmentText: string | null }`.

`BackgroundSelection`: `{ backgroundId: string | null, backgroundChoices: Picks, backgroundFeatPicks: Picks }`. Додати до ChoicesState та схем персонажа; DB JSON має defaults `{}`, backgroundId nullable. Для PUT/PATCH усі три поля необов'язкові: undefined зберігає попереднє, null для backgroundId явно знімає разом із пов'язаними picks. Зміна id очищує старі picks, якщо клієнт не передав нові.

`ChoiceRefs` отримує `backgroundsById: Readonly<Record<string, BackgroundData>>`, щоб old/new стани розв'язувалися незалежно. `SelectionInput` отримує `background: BackgroundData | null` та два picks-поля. `ChoiceSelections` отримує `tools: string[]`; наявні skills/feats/groups/spells/spellGrants використовуються без паралельних результатів.

`Choice.maxPerAbility?: number` — додатне ціле, лише abilityScore; попередні вибори без поля незмінні. Для SRD: points=3, count=3, maxPerAbility=2, max=20, abilities — трійка з pinned джерела.

---

### Task 1: Модель та ресурс backgrounds

**Files:** створити доменні файли з карти; змінити `prisma/schema.prisma`, додати міграцію `20261106000000_backgrounds/migration.sql` (перевірити вільність назви перед створенням); `lib/schemas/index.ts`, `lib/server/content/resources/index.ts`, `lib/cache/reference-data.ts`, `lib/cache/tags.ts`, `lib/constants/api-errors.ts`.
**Tests:** нові `lib/schemas/__tests__/backgrounds.test.ts`, `lib/server/content/__tests__/backgrounds-resource.test.ts`, `prisma/__tests__/migration-backgrounds.test.ts`.
**Interfaces:** продукує BackgroundData/BackgroundSelection, createBackgroundSchema/updateBackgroundSchema, toBackgroundData(row), backgroundsResource. `backgroundInUse(campaignId: string, id: string): Promise<boolean>` включає персонажів і чернетки.

- [x] RED: схеми приймають порожні опційні поля, відхиляють невідомі навички, scale/lineage у background і feat іншого типу/кампанії. Ресурс перевіряє DM/member/token права за патерном feats; delete used →409.
- [x] Запустити три нові файли через `pnpm test:run <files>`; зафіксувати очікуваний FAIL.
- [x] Додати таблицю, поля персонажа, RLS, індекси кампанії та backgroundId. Захист використаного запису застосувати до зміни ASI-правил (id/kind/level/count/points/abilities/max/maxPerAbility), а не косметичних label/description. FEAT_IN_USE розширити посиланнями з backgrounds.
- [x] Реалізувати реєстрацію/кеш/CRUD і загальні помилки; references перевіряти на сервері, включно з origin type. Тестувати відсутність старих персонажних змін при defaults.
- [x] GREEN: цільові тести; Prisma validate/generate з локальним env. Міграцію застосовувати лише до перевіреного constructor через migrate deploy.
- [x] Коміт `feat(constructor): add backgrounds content model` з явним переліком файлів.

### Task 2: Передісторія у спільному плануванні виборів

**Files:** `types/choices.ts`, `lib/schemas/choices.ts`, `lib/utils/characters/choices/{walk,plan,ability,validate,count,read,prune,pending,describe}.ts`, `lib/server/characters/choices/{load-refs,resolve-choices,draft-initial}.ts`.
**Tests:** існуючі `lib/utils/characters/choices/__tests__/{plan,validate,ability,pending}.test.ts`, `lib/schemas/__tests__/choices-owners.test.ts`.
**Interfaces:** споживає Task1; продовжує planChoices(PlanInput): PlanResult і visitPicks(state, refs, opts), зберігаючи старі контракти результату. Нові поля стану обов'язкові всередині домену, але read/default старих payload дає null/{}.

- [x] RED: `['strength','strength','dexterity']` та `['strength','dexterity','constitution']` валідні для дозволеної трійки; три strength →422, четвертий point →422, charisma поза трійкою →422, результат понад20 →422. Без maxPerAbility старий ASI не змінюється.
- [x] RED: A(+2 STR/+1 DEX) → B(+1 DEX/+2 WIS) дає delta STR−2/WIS+2; повтор B дає порожню delta; зняття B віднімає тільки B. Часткові picks дозволені та враховуються в pending.
- [x] Запустити цільові suites й підтвердити FAIL; додати background-owner у чинний прохід, maxPerAbility у schema/read/validate, refs обох backgroundId. Не створювати другий ASI-калькулятор.
- [x] GREEN: ті самі suites; окремо перевірити, що відсутній/чужий backgroundId відхиляється до зміни характеристик.
- [x] Коміт `feat(constructor): resolve background choices through shared planner`.

### Task 3: Сервер персонажа, риси й похідні володіння

**Files:** `lib/utils/characters/choices/selections.ts`, `lib/server/characters/choices/resolve-choices.ts`; `app/api/campaigns/[id]/characters/create-character-schema.ts`, `[characterId]/update-character-schema.ts`, `[characterId]/choices/choices-handler.ts`, `draft/draft-schema.ts`, `draft/draft-choices.ts`, `[characterId]/draft/update-draft.ts`; `lib/utils/characters/sheet/build-sheet.ts`, `lib/utils/battle/participant/from-character.ts`, `types/characters.ts`, `lib/utils/characters/character-form.ts`. Оновити наявних викликачів цих контрактів, не обходити їх окремим записом.
**Tests:** `app/api/__tests__/character-patch-choices.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/choices/__tests__/choices.test.ts`, `lib/utils/characters/choices/__tests__/selections.test.ts`, `lib/utils/characters/__tests__/build-sheet-choices.test.ts`, create/draft choices suites.
**Interfaces:** choiceSelections(SelectionInput): ChoiceSelections з Task2/карти; originFeatId розв'язується з refs без додавання копії в Character.feats.

- [x] RED: legacy origin + background →422 без зміни DB; запит із явним зняттям origin приймається. Human Versatile і DM/class feats зберігаються; дубль неповторюваної риси від різних джерел →422.
- [x] RED: Magic Initiate з background дає вкладені picks/грант/існуючий pool; key містить backgroundId і featId, не залежить від назви. Зміна назви зберігає key; інша передісторія його не позичає.
- [x] RED: undefined лишає стан, null очищує тільки background/picks; зняття зберігає ручні skills/tools. Права власника/allowPlayerEdit, чужий герой, draft lock, активний бій409 — як у чинних routes.
- [x] Запустити названі suites, підтвердити FAIL. Додати стан до спільної транзакції через tx, журнал і наявні invalidation; очистити picks при зміні id. Навички/інструменти об'єднувати при читанні, не матеріалізувати в ручні поля.
- [x] GREEN: цільові API/domain suites; біографія та інвентар лишаються побайтово незмінними у відповідних assertions.
- [x] Коміт `feat(constructor): apply background benefits to characters`.

### Task 4: Перенесення контенту й посилань

**Files:** `lib/server/templates/{bundle,import-bundle,remap-ids}.ts`, `lib/server/templates/sync/`, `lib/utils/content/import/fields/backgrounds.ts` (новий), чинний реєстр import fields; `lib/server/content/json-schema.ts` за потреби наявного OpenAPI adapter.
**Tests:** новий `lib/server/templates/__tests__/bundle-backgrounds.test.ts`; існуючі import-export/remap-ids/import-bundle/sync tests.
**Interfaces:** backgrounds — стандартний kind у bundle/import/export/sync; originFeatId — nestedRef на feats, dependency feats → backgrounds. Старий bundle без масиву backgrounds означає порожній набір, не помилку.

- [x] RED: CSV name→feat id та експорт id→name; bundle clone remaps originFeatId; жодного id джерельної кампанії. Зламаний/чужий ref не створює напіввалідного запису.
- [x] RED: повторний імпорт, baseline source-sync та видалення залежностей; спроба видалити origin feat використаної/невикористаної передісторії дає409 до видалення посилання. Source-sync також дотримується ASI guard із Task1.
- [x] Запустити focused suites, підтвердити FAIL. Підключити ресурс до існуючих registry/remap/dependency потоків; не створювати альтернативного bundle-формату.
- [x] GREEN: focused suites плюс чинні OpenAPI/schema-budget тести без безпідставного підняття ліміту.
- [x] Коміт `feat(constructor): include backgrounds in content transfers`.

### Task 5: UI бібліотеки та виборів персонажа

**Files:** нові `lib/api/backgrounds.ts`, `lib/hooks/backgrounds/{keys,useBackgrounds,useBackgroundForm,index}.ts`, `components/backgrounds/{BackgroundCard,BackgroundForm,CreateBackgroundDialog}.tsx`, `app/campaigns/[id]/dm/backgrounds/{page,page-client}.tsx`, `[backgroundId]/page.tsx` за патерном feats. Змінити кампанійні tiles/breadcrumbs/background mapping, `components/choices/{ChoiceListEditor,ChoicePicker,CharacterChoicesTab,CharacterChoicesPanel}.tsx`, `components/characters/player-draft/PlayerDraftForm.tsx`, чинний renderer листа для SheetChoices.
**Tests:** новий `components/backgrounds/__tests__/BackgroundForm.test.tsx`; чинні ChoicePicker/CharacterChoicesTab/CharacterChoicesPanel та sheet-choices suites.
**Interfaces:** запити/keys за патерном feats; форма записує Task1 API, персонаж — Task3 state. SSR prefetch/Query keys за чинними правилами проєкту.

- [x] RED: DM задає трійку/points/maxPerAbility й origin feat; character picker відображає +2/+1 та вкладений Magic Initiate, конфлікт старої origin та pending. Інструменти/спорядження видно; біографія має окрему назву.
- [x] Запустити component suites, підтвердити FAIL; реалізувати наявними Hud/ResponsiveDialog/ChoiceListEditor/ChoicePicker. Не додавати кнопку автоматичної видачі або нову механіку інструментів.
- [x] GREEN: component suites; приховати бібліотечну плитку/вибір при вимкнених класах, прямий URL має зрозумілий чинний доступ/стан. Зміна вибору попереджає про заміну бонусів.
- [x] Коміт `feat(constructor): add backgrounds authoring and character UI`.

### Task 6: SRD та завершення блоку

**Files:** нові `scripts/srd/convert/backgrounds.ts`, `scripts/srd/__tests__/backgrounds.test.ts`; `scripts/srd/lib/{types,open5e,build-data}.ts`, `scripts/srd/build.ts`, наявний importer SRD template; згенеровані backgrounds.json/manifest; `docs/architecture/{battle,content-api}.md`, `docs/STATUS.md`, handoff і цей план.
**Interfaces:** `convertBackgrounds` за чинним converter-контрактом після перевірки pinned структури; результат BackgroundData-подібний template record з локальними refs. Порядок feats → backgrounds.

- [x] RED: чотири записи, точні поля звірено з pinned локальним джерелом; усі origin refs існують, ASI має3/2/20, спорядження зберігається текстом. Синтетичний fixture достатній для механіки; не вигадувати назви/правила.
- [x] GREEN: converter/integrity suites; `pnpm srd:build`. Після перевірки обох DB URL імпортувати локальний шаблон двічі; другий прогін creates0/errors0, клон має refs своєї кампанії.
- [x] У тимчасовій constructor кампанії перевірити створення/чернетку/зміну/зняття, біографію, вкладений грант у бою, conflict/409, старого героя без background. Браузер1440/390: вибори й лист без горизонтального overflow. Очистити лише власні fixtures/processes, DB лишити працювати.
- [x] Перед повними перевірками повідомити користувача; один фінальний full test run, TypeScript і production build з підтвердженим exit0; ESLint — аудит та усунення errors (повний lint після форматування не повторювався; точні результати нижче). Зберегти докази в `.superpowers/sdd/2026-10-24-constructor-backgrounds/`. При новій зміні після перевірки запускати лише обґрунтовано потрібне.
- [x] Scoped review, одна хвиля виправлень, короткий rereview та simplify/еквівалент; перевірити всі критерії погодженого дизайну. Оновити документацію, checklist, handoff і checkpoint; закомітити тільки файли блоку, без push/merge/deploy.

## Стан планування / handoff

Актуальний аудит2026-10-24: реалізація присутня, старий абзац нижче — історія планування. Перевірено збережений full suite1194/7694 без повторного запуску; новий production build exit0 (`closure-build-escalated.log`). Три lint formatting errors виправлено, focused lint exit0; full lint після форматування не повторювали. Власні тимчасові DB fixtures очищено, SRD-шаблон збережено. Pending live PUT/PATCH із connection_limit=1 не підтверджено; за поточною забороною повторних тестів не запускали. Блок ще не закрито, feature-коміту немає; Task18/4f-6 не починати. Деталі: backgrounds progress.md, секція Closure audit.

Дизайн погоджено, план написаний і перевірений на покриття вимог; виконання Tasks1–6 не починали. Перед реалізацією лишається review цього плану й закриття старого checkpoint 4f-5b. 4f-6 Tasks18–21 актуалізуються лише як майбутній план, не виконуються. Етап6 AI також не починати.


Checkpoint збереження у Git — 2026-10-24: за прямою інструкцією користувача поточну реалізацію збережено окремим локальним snapshot-комітом `c9577fec`, точні наявні fixture bytes — `8fd1de4a`. Це НЕ закриття backgrounds і не новий live прогін: pending single-connection checkpoint лишається відкритим. Стан і попередні докази — у backgrounds progress ledger; Task20 не перезапускав цю перевірку.


## Backgrounds закрито — 2026-10-25

Завершено останній pending single-connection live checkpoint у feat/constructor. Новий ізольований Next/auth harness задавав `connection_limit=1` для DATABASE_URL і DIRECT_URL після перевірки localhost:54322/constructor; production auth/Pusher вимкнено. `single-connection-closure/evidence.json` у backgrounds SDD:11 HTTP запитів, PUT select/repeat, invalid ASI422 без зміни стану, PATCH swap/repeat/remove/select, PUT remove. Перевірено повернення попередніх ASI, відсутність повторного нарахування, незмінні biography/inventory/manual skills/tools/classes. Усі очікувані200/422 підтверджені; зависання transaction refs не відтворилося. Код продукту не змінювався.

Перший запуск перевірки після нічної паузи отримав500 на початковому GET через прострочений JWT локального harness; жоден PUT/PATCH тоді не виконувався. Сесію перевипущено перезапуском власного harness, після чого checkpoint пройдено. Це збій тестового оточення, не новий дефект backgrounds.

`single-connection-closure/cleanup-result.json`: власні кампанія/користувач видалені після перевірки точного імені, email/displayName, єдиного DM та відсутності інших memberships; відсутність записів перевірено після видалення. Наявний SRD template із4 backgrounds збережено. Власний Next/auth harness зупинено, shared DB лишено працювати.

Успадковані докази backgrounds, без повторних запусків: full-tests-final1194 файли/7694 тести (exit0), final-tsc-after-review exit0, tx-refs-green4 файли/19 тестів, closure-build-escalated успішний production build, browser1440/390 та попередні live сценарії, подвійний SRD import (повтор created0/errors0), review RED→GREEN і scoped фінальний огляд. Повний lint після виключення scratch мав3 formatting errors/176 warnings; саме3 errors виправлено, focused lint exit0. Новий full lint exit0 не заявляється.

Реалізацію вже збережено в `c9577fec`, точні fixture bytes у `8fd1de4a`; документацію попереднього аудиту — `cf3ef1bd`. Шість запланованих feature-комітів замінено цими погодженими snapshot-групами, без переписування історії. Поточне закриття — окремий локальний documentation commit. Старі pending/«не починали» абзаци вище є історією; цей checkpoint їх замінює. 4f-6 також завершено окремим Task21, його докази не підміняють цей live checkpoint.

Спорядження/золото видаються вручну; іншого рушія Choices/Picks не додано. Міграції не змінювалися. Етап6 AI не починався; prod/prodcopy/push/merge/deploy не виконувалися.
