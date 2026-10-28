# Конструктор кампаній — хендоф для нового контексту

Скопіюй блок нижче як перше повідомлення в новій сесії Claude Code, відкритій у `/Users/silentfox/Work/dnd-tracker-constructor`.

---

```
Продовжуємо епік «Конструктор кампаній» (D&D-трекер → конструктор: правила, механіки і контент налаштовуються з UI/API, шаблони кампаній). Спілкуємося українською.

Робоче середовище (обов'язково):
- Worktree /Users/silentfox/Work/dnd-tracker-constructor, гілка feat/constructor. Основну папку /Users/silentfox/Work/dnd-tracker не чіпати (там паралельно працюють інші сесії).
- БД тільки локальна: postgresql://postgres:postgres@localhost:54322/constructor (Docker-контейнер dnd-tracker-db-1; якщо зупинений — `docker start dnd-tracker-db-1`). Prisma CLI не читає .env.local сам: `set -a; source .env.local; set +a` перед `pnpm exec prisma migrate deploy` (не migrate dev). Prod і prodcopy не чіпати.
- НЕ зливати feat/constructor у main і нічого не розгортати на prod, доки не готовий увесь епік (етапи 1–6). main (origin/main) підтягувати В гілку перед кожною новою частиною (після злиття — `prisma migrate deploy` на constructor, якщо прийшли міграції).
- Бекап prod від 2026-10-21 01:30: ~/dnd-tracker-backups/prod_20261021_013001. Перед роботою з prod наприкінці епіку — свіжий бекап.

Що прочитати спершу:
1. docs/superpowers/specs/2026-10-20-campaign-constructor-design.md — загальний спек епіку (етапи 1–6; етап 3 «оновити з шаблону», sourceId/sourceHash у бандлі).
2. docs/STATUS.md (рядок «Конструктор кампаній») і CLAUDE.md.
3. docs/architecture/content-api.md — підсумок етапу 2 (реєстр ресурсів і операцій, сервіс з assertCan, REST-фабрика, токени, OpenAPI, MCP).
4. Для контексту шаблонів: lib/server/templates/* (export/import бандла, fork шаблону), архівні плани 1c у docs/superpowers/plans/.

Стан:
- Етап 1 готовий: правила кампанії (campaigns.rules, заморожуються в бою), хардкод назв → дані, шаблони (офіційні HOMM5 cmvhyai5g0001eyfadqth6y7b і «Порожня» cmvhyai9h0005eyfaiz33jh8g; робоча кампанія HOMM5 cmuylhk0c0001ia06lg5eommv), банер шаблону.
- Етап 2 готовий (до ddf1a615): 2a фабрика CRUD (lib/server/content, CONTENT_RESOURCES, lib/utils/api/content-routes.ts); 2b токени зі scopes ai/content:read/content:write, resolveActor з Bearer; 2c публічний /api/openapi.json з CONTENT_RESOURCES + CONTENT_OPERATIONS; 2d права в сервісі (assertCan, Actor.scopes), 11 MCP-інструментів content_* + правила + дерева скілів за правами токена, /api/mcp буферизує POST (інакше revalidateTag з інструментів губився). Останній прогін: 5503 тести, lint 0 errors, build, battle-sweep, живий MCP і браузер — зелені.

Відкладене (за потреби, не блокує етап 3):
- Етап 2: content_get може обрізатися на дуже великих записах; назва раси в get/save_skill_tree не перевіряється; listFields не типізовані; адаптер «операція → MCP-інструмент» з CONTENT_OPERATIONS; пагінація content_list у БД; повні схеми відповідей в OpenAPI; дієслова колекції/запису як дані (дублюються в openapi.ts); зайвий reload сету артефактів після update.
- Етап 1: форма нової кампанії показує «Макс. рівень 20» незалежно від шаблону; шаблони зберігають rules розгорнутими замість {}; сервер дозволяє бої/персонажів у шаблоні; меню ДМ визначає шаблон через повний GET кампанії; «мораль ±N» у лозі при вимкненій моралі; напіванглійські назви ефектів критів. Етап 3 не повинен довіряти sourceId від користувача. «Ельфійське око» ельфам НЕ додавати без явного рішення користувача.
- Розбіжність з main (не наша): balance/stats.ts рахує СК юніта як 8+майстерність без тіру.
- Після всього епіку — окремий епік «доменні модулі» (запис у STATUS; до злиття конструктора не починати).

Наступний крок — етап 3 «оновити з шаблону». Спеку ще немає → superpowers:brainstorming з користувачем (перед цим — пошук наявного в lib/server/templates, lib/utils, lib/hooks за правилом «reuse before writing») → спек у docs/superpowers/specs/ → плани частин → виконання.

Як працюємо (налаштування користувача):
- Виконання — superpowers:subagent-driven-development: виконавці на sonnet, БЕЗ рев'ю після кожної задачі, одне фінальне рев'ю всієї частини на opus → одна хвиля виправлень → коротке повторне рев'ю → /simplify (4 агенти) → живий прогін. Повний набір тестів — наприкінці частини.
- Робоча тека SDD — .superpowers/sdd/<plan>/ (gitignored, ніколи не комітити). У коміти субагентів — трейлер `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Перевірка: pnpm test:run, pnpm lint (0 errors), pnpm build, battle-sweep на constructor (`set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv`; відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»; нестабільний тест lib/hooks/battle/__tests__/battle-fx.test.tsx), браузер — `pnpm dev -p 3001` у worktree; тестові токени (можна вставити в api_tokens SHA-256 хешем, скрипти через tsx не можуть імпортувати server-only модулі), кампанії і записи після перевірки видаляти.
- Наприкінці частини оновлювати docs/architecture/*.md, docs/STATUS.md, цей хендоф і пам'ять (project-constructor.md, feedback-constructor-no-merge.md у ~/.claude/projects/-Users-silentfox-Work-dnd-tracker/memory/).

Почни з: прочитай загальний спек конструктора (етап 3) і STATUS, підтягни origin/main у feat/constructor (якщо є нове), потім brainstorming етапу 3.
```
