# Конструктор: передзлиттєве ревю, хвости S10 і HOMM-шлюз

Дата: 2026-10-27. Гілка `feat/constructor` (526 комітів попереду `main`, база `9a9224f8`). Мета — довести гілку до стану, придатного для злиття, і довести, що HOMM5-кампанія на проді працюватиме після злиття. Злиття, бекап prod і деплой — поза цим спеком, окремим запитом.

## Рішення користувача

- Усі знахідки ревю виправляються без окремого погодження; Low — теж, якщо безпечно. Low, що змінює контракт/протокол, іде в backlog з причиною.
- Робота ділиться на три частини, кожна — окрема сесія з handoff і готовим промптом для наступної.
- Економія токенів: Opus — ревю й фінальне ревю, Sonnet — імплементація, браузер, прогони.

## Частина 1 — ревю диффу проти `main`

- Обсяг: production-код диффу `main...HEAD` (ts/tsx без `__tests__`, `data/`, `scripts/`, docs) — ~41k рядків, 1150 файлів.
- Три паралельні Opus-агенти за зонами: (A) `lib/utils` + `lib/constants`; (B) `lib/server` + `app/api` + `lib/ai` + `lib/schemas`; (C) `lib/hooks` + `components` + `app/campaigns` + `lib/api` + `types`.
- Осі: оптимізація (зайві запити/обчислення/перерендери/egress), декомпозиція великих файлів і функцій, дублікати (усередині гілки й з наявним кодом `main`), винесення магічних значень у `lib/constants`, винесення логіки з компонентів у хуки, порушення шарів із CLAUDE.md.
- Не перевідкривати закриті S1–S10 findings (`docs/superpowers/plans/2026-10-27-constructor-refactor-s10-findings.md`), не дублювати 4 хвости нижче.
- Результат: реєстр `docs/superpowers/plans/2026-10-27-constructor-premerge-findings.md` — ID, severity (High/Medium/Low), файл:рядок, суть, конкретна дія; згруповано в задачі для плану.

## Частина 2 — виправлення

План (`writing-plans`) із задач реєстру + 4 хвости; суміжні дрібні задачі об'єднуються. Виконання — SDD, імплементатори Sonnet, під час роботи `pnpm test:changed`; наприкінці full suite, tsc, lint, build, одне фінальне Opus-ревю, `/simplify` одним агентом.

### Хвіст 1 — AI entrypoint hardening

- Інвентар entrypoints chat, context, policy, credentials, MCP: де тіло читається без byte-ліміту до Zod, де немає rate budget; зафіксувати чинні контракти й наявні механізми (зокрема виправлений MCP byte bypass).
- Відтворити ризики тестами (велике тіло, стрім без Content-Length, серія запитів).
- Byte-ліміт — спільний хелпер у `lib/utils/api` (розширення `parseBody` параметром `maxBytes`, читання стріму з обривом); rate — наявний лімітер (Upstash з in-memory fallback). Budgets обґрунтувати розмірами реальних payload.
- Лише підтверджені дефекти, RED→GREEN. Не змінювати тексти помилок, авторизацію, provider consent і guards платних операцій.

### Хвіст 2 — повторний parsing (F04)

- Карта шарів parsing у `lib/utils/api/content-routes.ts`, `operation-service.ts`, межі assistant/content; вимір вартості.
- Прибирати повтор лише за доказу тотожності validation; stored-state guards (зокрема stored class columns) зберегти. Інакше — висновок у реєстрі з причиною.

### Хвіст 3 — accessibility

- Shared confirm/notify діалоги (`useConfirm`/`useNotify` поверх `ResponsiveDialog`) з попередженням про відсутній description: доступний опис (description або `aria-describedby`).
- Тест без попередження в stderr; перевірка semantics, клавіатури/фокусу й ширини 390px у браузері.

### Хвіст 4 — аварійне завершення assistant-check

- Fault injection: SIGKILL worker і браузера в `scripts/constructor/assistant-check`.
- Cleanup лише за точними owned fixture ID (маніфест) і PID власних процесів; fail-closed; чужі процеси й дані не чіпаються.

## Частина 3 — HOMM-шлюз (на фінальному HEAD)

Пункти 1–4 обов'язкового шлюзу зі спеку `2026-10-20-campaign-constructor-design.md`:

1. `./scripts/db/prodcopy-db.sh` (prod лише читається); перевірка адреси цільової БД.
2. Скрипт паритету: worktree на `main` рахує еталон до міграцій — учасник бою, лист, прев'ю атак для кожного героя, юніта, заклинання й артефакта HOMM5, з фіксованим seed кидків; потім міграції + backfill гілки на тій самій копії, той самий розрахунок кодом гілки, JSON-diff. Критерій — порожній diff; результати й diff зберегти.
3. `battle-sweep` на `prodcopy` кодом гілки; відомі збої відокремити від регресій.
4. Живий прогін під ДМ і гравцем (Sonnet-агент у браузері): лист, бій, схованка, передача артефакта, level-up; результат кожного сценарію.

Регресія блокує merge: виправлення + повтор шлюзу. Звіт — `docs/superpowers/plans/2026-10-27-homm-gate-report.md`.

## Критерії готовності

- Реєстр закрито: кожна знахідка має commit або обґрунтоване відкладення.
- 4 хвости закрито з доказами або явним висновком.
- Full suite, tsc, lint (0 errors), build пройшли на фінальному HEAD.
- HOMM-шлюз: порожній diff паритету, battle-sweep без регресій, усі живі сценарії пройдено.
- Оновлено `docs/STATUS.md`, `constructor-handoff.md` і зачеплені `docs/architecture/*.md`.
