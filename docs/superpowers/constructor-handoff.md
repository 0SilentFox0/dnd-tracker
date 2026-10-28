# Конструктор кампаній — хендоф для нового контексту

Скопіюй блок нижче як перше повідомлення в новій сесії Claude Code, відкритій у `/Users/silentfox/Work/dnd-tracker-constructor`.

---

```
Продовжуємо епік «Конструктор кампаній» (D&D-трекер → конструктор: правила, механіки і контент налаштовуються з UI/API, шаблони кампаній). Спілкуємося українською.

Робоче середовище (обов'язково):
- Worktree /Users/silentfox/Work/dnd-tracker-constructor, гілка feat/constructor. Основну папку /Users/silentfox/Work/dnd-tracker не чіпати (там паралельно працюють інші сесії).
- БД тільки локальна: postgresql://postgres:postgres@localhost:54322/constructor (Docker-контейнер dnd-tracker-db-1; якщо зупинений — `docker start dnd-tracker-db-1`). Prisma CLI не читає .env.local сам: `set -a; source .env.local; set +a` перед `pnpm exec prisma migrate deploy` (не migrate dev). Prod і prodcopy не чіпати.
- НЕ зливати feat/constructor у main і нічого не розгортати на prod, доки не готовий увесь епік (етапи 1–6). main (origin/main) підтягувати В гілку перед кожною новою частиною.
- Бекап prod від 2026-10-21 01:30: ~/dnd-tracker-backups/prod_20261021_013001. Перед роботою з prod наприкінці епіку — свіжий бекап.

Що прочитати спершу:
1. docs/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md — затверджений спек етапу 2 (2a фабрика → 2b токени → 2c OpenAPI → 2d MCP).
2. docs/STATUS.md (рядок «Конструктор кампаній») і CLAUDE.md.
3. docs/architecture/ai.md — токени api_tokens і /api/mcp AI-асистента (етап 2 їх розширює, а не створює нові).
4. Для контексту: docs/superpowers/plans/2026-10-21-constructor-2a-content-factory.md і 2026-10-21-constructor-2b-tokens.md (виконані) і загальний спек docs/superpowers/specs/2026-10-20-campaign-constructor-design.md.

Стан:
- Етап 1 готовий (правила кампанії, шаблони HOMM5 cmvhyai5g0001eyfadqth6y7b і «Порожня» cmvhyai9h0005eyfaiz33jh8g, робоча кампанія HOMM5 cmuylhk0c0001ia06lg5eommv). Банер шаблону зроблено.
- main з AI-асистентом злитий у гілку (1b56568c).
- 2a ГОТОВА (до e9ec183e): реєстр ресурсів lib/server/content (define-resource, errors, service, resources/*, CONTENT_RESOURCES), lib/utils/api/content-routes.ts (collectionRoutes/itemRoutes/runContent).
- 2b ГОТОВА (до ae151fab): права токенів ai/content:read/content:write (lib/constants/ai.ts: API_TOKEN_SCOPES, CONTENT_SCOPES, hasScope); resolveActor/authenticateToken з Bearer (lib/utils/api/actor.ts, lib/utils/api/bearer.ts), пресети NEED.read/write/writeAll у content-routes; масове видалення лише з сесії; CSRF пропускає Bearer; правила — lib/server/campaigns/rules.ts; /api/mcp поки вимагає ai; на шаблонах сторінка «API» лише з правами на контент; перевірка id у knownSpells/availableSkills/disabledSkills (лише нові id). 5356 тестів, build, battle-sweep, curl і браузер — зелені.

Перенесені в наступні частини пункти (обов'язково врахувати в планах):
- 2c: OpenAPI з Zod (.meta({id}) для спільних схем, $ref замість 55 КБ схеми здібностей), schemas.query у ресурсах (spells ?ids, skills ?mainSkillId), відповіді запису через toItem (однакова форма з GET), нестандартні операції в CONTENT_OPERATIONS (дерева скілів, правила, export, duplicate, import юнітів, delete-by-level, порядок треків).
- 2c/2d: роути abilities/* (каталог здібностей) поки не приймають токен — вирішити, чи дати їм content:read.
- 2d: /api/mcp зараз відхиляє токени без ai (403) — замінити на фільтр інструментів за scopes; перевірка доступу всередині сервісу (не лише в HTTP-шарі), типізований сервіс, MCP-інструменти content_* з фільтром за scopes, ліміт 24 000 символів на результат.
- Дрібне з етапу 1 (при нагоді): форма нової кампанії показує «Макс. рівень 20» незалежно від шаблону; шаблони зберігають rules розгорнутими замість {}; сервер дозволяє бої/персонажів у шаблоні; меню ДМ визначає шаблон через повний GET кампанії; повідомлення «мораль ±N» у лозі при вимкненій моралі; напіванглійські назви ефектів критів. «Ельфійське око» ельфам НЕ додавати без явного рішення користувача.
- Розбіжність з main (не наша): balance/stats.ts рахує СК юніта як 8+майстерність без тіру.

Наступний крок — частина 2c (OpenAPI). Спек уже затверджений → одразу superpowers:writing-plans для 2c (план у docs/superpowers/plans/2026-10-2x-constructor-2c-*.md), показати план користувачу, після «так» — виконання.

Як працюємо (налаштування користувача):
- Виконання — superpowers:subagent-driven-development: виконавці на sonnet, БЕЗ рев'ю після кожної задачі, одне фінальне рев'ю всієї частини на opus → одна хвиля виправлень → коротке повторне рев'ю. Повний набір тестів — один раз наприкінці; /simplify — у кінці частини.
- Робоча тека SDD — .superpowers/sdd/<plan>/ (gitignored, ніколи не комітити). Субагентів, що завершили роботу, зупиняти (TaskStop). У коміти субагентів — трейлер `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Перевірка: pnpm test:run, pnpm lint (0 errors), pnpm build, battle-sweep на constructor (`set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv`; відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»; нестабільний тест lib/hooks/battle/__tests__/battle-fx.test.tsx), браузер — `pnpm dev -p 3001` у worktree; тестові кампанії/записи після перевірки видаляти.
- Пам'ять: project-constructor.md і feedback-constructor-no-merge.md у ~/.claude/projects/-Users-silentfox-Work-dnd-tracker/memory/.

Почни з: прочитай спек етапу 2 і STATUS, підтягни origin/main у feat/constructor (якщо є нове), потім пиши план 2c.
```
