# Стан проєкту

Одне місце для відповіді на питання «що зараз у роботі». Оновлюється в кінці кожної гілки, в тому ж коміті, що й злиття.

_Оновлено: 2026-10-22._

## У роботі

| Що | Гілка / worktree | Стан |
|---|---|---|
| Конструктор кампаній (епік, етапи 1–6) | `feat/constructor`, `../dnd-tracker-constructor`, локальна БД `constructor` | Етап 1 (1a хардкод→дані, 1b правила, 1c шаблони) готовий і перевірений; **етап 2 (відкрите API) готовий**: 2a фабрика CRUD, 2b токени, 2c OpenAPI, 2d MCP (`lib/server/content`, `CONTENT_RESOURCES`, `lib/utils/api/content-routes.ts`; спек `docs/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md`); 2b: scopes `ai`/`content:read`/`content:write` на `api_tokens`, `resolveActor` з Bearer, перевірка id у `knownSpells`/`availableSkills`/`disabledSkills`, UI прав на `/dm/ai` (на шаблоні — сторінка «API»); 2c: публічний `/api/openapi.json` з `CONTENT_RESOURCES` + `CONTENT_OPERATIONS` (`lib/server/content/openapi.ts`, `json-schema.ts`, `operations.ts`), відповіді запису через `toItem`, abilities з `content:read`, панель «REST API» на `/dm/ai`; 2d: права в сервісі (`assertCan`), MCP-інструменти `content_*` + правила + дерева скілів за правами токена (`lib/ai/tools/content.ts`), опис — `docs/architecture/content-api.md`; **етап 3a (оновлення з джерела: ядро + REST/OpenAPI/MCP) готовий** — `campaign_source_syncs` (baseline/ignored), `lib/server/templates/sync/`, `GET/POST /source-sync`, MCP `source_diff`/`source_apply` (спек `docs/superpowers/specs/2026-10-21-constructor-stage3-source-sync-design.md`, план 3a у `docs/superpowers/plans/`); **3b UI готовий** (діалог `SourceSyncDialog`, кнопки в налаштуваннях і банері шаблону; браузер десктоп + 500px). **Етап 3 завершено**; **етап 4 «механіки 5e» розбито на 4a–4f** (спек `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md`): **4a готовий** (стани 5e, рятівні кидки, кидки смерті, концентрація, ДМ накладає/знімає стани; план `docs/superpowers/plans/2026-10-22-constructor-4a-conditions-saves.md`; опис — `docs/architecture/battle.md`, `abilities.md`); **4b «дії 5e в бою» готовий** (Ривок, Відхід, Ухилення, Допомога, Сховатися, Підготувати, Встати, Схоплення/Штовхання/Вирватися, атаки при відході, `rollCheck`; спек — розділ 4b того ж файлу, план `docs/superpowers/plans/2026-10-22-constructor-4b-actions.md`; опис — `docs/architecture/battle.md` «5e: базові дії»); **4c-1 «класи й рівні» готовий** (ресурс `classes`, `Character.classes`, HP/рятівні/слоти/пакт за класами, вміння класу, кола 0–9, level-up з класом, UI; спек — розділ 4c-1 того ж файлу, план `docs/superpowers/plans/2026-10-22-constructor-4c1-classes.md`; опис — `docs/architecture/battle.md` «5e: класи й рівні», `content-api.md`, `abilities.md`); **4c-2 «атаки й заклинання 5e» готовий** (`abilities.damageModel: "5e"`, властивості зброї `traits`, шкода 5e, досяжність/дальність 80/320, Додаткова атака `attacksPerAction`, друга рука бонусною дією з клітинки «Щит», `rules.criticals.doubleDice`, кубики заклинань 5e — грань/кантрипи/`upcastDice`/`upcastTargets`, вибір слота `slotKey` з пактом, атака заклинанням; спек — розділ 4c-2 того ж файлу, план `docs/superpowers/plans/2026-10-22-constructor-4c2-attacks-spells.md`; опис — `docs/architecture/battle.md` «5e: атаки й заклинання»); далі 4d поза боєм, 4e монстри/баланс, 4f шаблон SRD; Warhammer — пост-MVP. **Злиття в `main` і prod — після етапів 1–4 і 6**; хендоф: `docs/superpowers/constructor-handoff.md` |
| Лендінг + вхід email/паролем | `feat/landing` | Код, тести й документація готові (`docs/architecture/landing-auth.md`); не злито в `main`. Перед продом: власний SMTP і Redirect URLs у Supabase Auth, `SITE_INDEXING=1` у Vercel — лише після публічного запуску |
| Механіка стрільби | `feat/ranged-combat`, `../dnd-tracker-shooting` | Авто-перешкода, ланцюговий постріл, розщеплення ближніх, FX сплешу; після деплою перезасіяти юнітів бібліотеки на проді — Демониця отримує `chainShot` |
| Підсумок героя + чернетки гравця | `feat/stash-and-player-drafts`, `../dnd-tracker-stash`, локальна БД `stash` | Код і документація готові (`docs/architecture/characters.md`), лишається браузерна перевірка й злиття. Міграція (`stash`, `inventory_log`, `status`) піде на прод при деплої; Upstash на проді не налаштований — ліміт AI для гравців працює в пам'яті інстанса |

## Домовленості

- `api_tokens` і `/api/mcp` уже є (AI-асистент, у `main`) — етап 2 «Конструктора» розширює їх (scopes, OpenAPI), а не створює заново.
- **Фабрика CRUD-роутів** (races, spells, main-skills, units, artifact-sets…) — перший крок етапу 2 «Конструктора»; її робить сесія «Конструктора» до токенів, OpenAPI та MCP. У `main` ці роути не рефакторимо (домовленість від 2026-10-21).
- Під час 1b/1c нова логіка CRUD-роутів живе в `lib/schemas`, `lib/server/…`, `lib/utils/api`, а не в тілі `route.ts`.
- `main` підтягується у `feat/constructor` після фінального рев'ю кожної частини; зворотного злиття до кінця епіку немає.
- Паралельно — не більше 2–3 активних worktree; злиті worktree й гілки видаляються одразу.
- **Після епіку «Конструктор»** — наступний епік: розділити код на доменні модулі (`modules/<домен>/{core,server,api,hooks,ui,types}` + `shared/`, імпорт лише через публічний `index.ts`, межі через ESLint, тести по модулях), щоб звузити контекст розробки й обсяг тестів. Почати з карти залежностей між доменами і спеку; до злиття конструктора не починати (масове перенесення файлів конфліктує з `feat/constructor`).
- Перехід до публічного продукту (конкуренти, чого бракує, пріоритети) — відкладено, бэклог у [product/product-readiness-2026-10-21.md](product/product-readiness-2026-10-21.md).

## Відкриті хвости

- Візард атаки показує цілі поза досяжністю на мапі (сервер відхиляє з тостом) — є запропонований фікс, не зроблено.
- Видалити тестовий бій на prod «ТЕСТ Лабіринт» (`cmvguwoiq0001js07uchzx3fb`).
- Баланс: перекіс на L10 (і L3 через низький AC юнітів T1); варіант виправлення — REF-константи за тіром.
- Браузерні перевірки, яких ще не було: бойові фікси 2026-10-20 (заклинання з мапи, YT-прев'ю), DM-флоу резерву, довідник очима гравця (заклинання), накладання палітр лабіринту.
- Мораль: якщо власник ходу впав із неперевіреною мораллю, ДМ завершує хід вручну. Одноцільові заклинання з мапи не можуть цілити союзників поза мапою.
- Онбординг: вичитати тексти (`lib/onboarding/{hints,whats-new}.ts`, `lib/onboarding/help/*`); браузерна перевірка на телефоні й очима гравця. Локальна БД `onboarding` можна видалити.
- Локальні БД `scenarioplay` і тестовий бій «ТЕСТ Лабіринт браузер» у `prodcopy` можна видалити.

## Нещодавно завершено

Онбординг (чеклісти «Перші кроки» ДМ і гравця з прогресом із фактів БД, підказки на екранах, «Що нового» в хедері, довідка `/help`; `docs/architecture/onboarding.md`), AI-асистент ДМ (власні ключі Claude/OpenAI/Gemini, співавтор сценарію з пропозиціями правок, живий чат зі сценою, постійні інструкції кампанії, MCP `/api/mcp`, генерація зображень для «Показу»; `docs/architecture/ai.md`), сценарій і його відтворення, «Показ» (слайди + музика), режими мапи й лабіринт, бойова мапа (погода, музика), 2D-ефекти заклинань і кубики. Їхні специфікації та плани — в `docs/archive/superpowers/`.
