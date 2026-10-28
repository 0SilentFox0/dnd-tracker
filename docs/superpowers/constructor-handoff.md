# Конструктор кампаній — хендоф для нового контексту

Скопіюй блок нижче як перше повідомлення в новій сесії Claude Code, відкритій у `/Users/silentfox/Work/dnd-tracker-constructor`.

---

```
Продовжуємо епік «Конструктор кампаній» (D&D-трекер → конструктор: правила, механіки і контент налаштовуються з UI/API, шаблони кампаній). Спілкуємося українською.

Робоче середовище (обов'язково):
- Worktree /Users/silentfox/Work/dnd-tracker-constructor, гілка feat/constructor. Основну папку /Users/silentfox/Work/dnd-tracker не чіпати (там паралельно працюють інші сесії).
- БД тільки локальна: postgresql://postgres:postgres@localhost:54322/constructor (Docker-контейнер dnd-tracker-db-1 з compose основної папки; .env.local worktree уже вказує на неї). Prod і prodcopy не чіпати. Міграції: `pnpm exec prisma migrate deploy` (не migrate dev).
- НЕ зливати feat/constructor у main і нічого не розгортати на prod, доки не готовий увесь епік (етапи 1–6). main підтягувати В гілку перед кожною новою частиною (git merge main), розв'язуючи конфлікти на користь даних замість хардкоду за назвами.
- Бекап prod від 2026-10-21 01:30 (перевірений): ~/dnd-tracker-backups/prod_20261021_013001. Перед будь-якою роботою з prod наприкінці епіку — свіжий бекап.

Що прочитати спершу:
1. docs/superpowers/specs/2026-10-20-campaign-constructor-design.md — дизайн і дорожня карта 6 етапів.
2. docs/STATUS.md (рядок «Конструктор кампаній») і CLAUDE.md (правила репо: «Reuse before writing», шари, тести через test:changed/test:related, /simplify у кінці гілки).
3. Плани виконаних частин: docs/superpowers/plans/2026-10-21-constructor-1{a,b,c}-*.md (для контексту, не виконувати).

Стан: етап 1 готовий і перевірений (тести 5053/5053, build, battle-sweep, браузер на localhost:3001):
- 1a: хардкод за назвами → дані (spells.fx, spell_groups.color/icon, main_skills.role, здібності замість name-check), бекфіл scripts/constructor/backfill-content-fields.ts.
- 1b: campaigns.rules + MECHANIC_REGISTRY (мораль, крити, формули DC/майстерності, сила героїв, ініціатива, базові атаки), фіксація в battle_scenes.rules, сторінка dm/rules. Клієнт імпортує лише zod-free `@/lib/utils/rules`, сервер — `@/lib/utils/rules/schema`.
- 1c: шаблони (Campaign.kind/visibility/createdFromId, sourceId/sourceHash), бандл export/import у lib/server/templates, сервіс lib/server/campaigns/create-campaign.ts, роути шаблонів/експорту/імпорту, UI вибору шаблону. На БД constructor: офіційні шаблони HOMM5 (cmvhyai5g0001eyfadqth6y7b) і «Порожня» (cmvhyai9h0005eyfaiz33jh8g); робоча кампанія HOMM5 cmuylhk0c0001ia06lg5eommv.

Відкриті хвости етапу 1 (дрібні, зробити першим комітом наступної частини або при нагоді):
- Немає банера «Це шаблон: зміни потрапляють у нові кампанії…» на сторінці шаблону (app/campaigns/[id]/page.tsx) — був у плані 1c.
- Форма нової кампанії показує «Макс. рівень 20», навіть коли обраний шаблон має інше значення (кампанія все одно отримує значення шаблону).
- Шаблони зберігають rules розгорнутими до значень за замовчуванням замість `{}`.
- Сервер дозволяє створювати бої/персонажів усередині шаблону (UI їх ховає).
- Меню ДМ визначає «шаблон» через повний GET /api/campaigns/[id] (з учасниками) — можна полегшити.
- Коли мораль вимкнена, у лозі лишаються повідомлення «мораль ±N» від здібностей (без ефекту); лист героя показує сирий base morale вище межі.
- Частина назв ефектів у каталозі критів напівангломовні («Advantage на наступну атаку», «Mark для ворога»).
- Рішення користувача про баланс: «Ельфійське око» ельфам НЕ додано (старий код ніколи не спрацьовував на кириличних расах); додати — лише за явним рішенням.

Наступний крок — ЕТАП 2 «Відкрите API» (за спеком):
1. Перший крок — фабрика CRUD-роутів (спільні get/patch/delete/delete-all/групи поверх parseBody/loadOwned/requireDM для races, spells, spells/groups, main-skills, units, artifact-sets, artifacts, skills тощо). Домовленість із сесією main: у main ці роути не рефакторять, фабрику робить ця сесія.
2. Далі: персональні токени (scope кампанії, тільки контент; Bearer поруч із cookie-сесією), OpenAPI зі спільних Zod-схем (Zod 4 z.toJSONSchema), MCP-ендпоінт /api/mcp для AI-агента.
3. Етап 2 — архітектурний: superpowers:brainstorming → спек (docs/superpowers/specs/…) → затвердження користувачем → superpowers:writing-plans → виконання.

Як працюємо (налаштування користувача):
- Виконання планів — superpowers:subagent-driven-development: виконавці на sonnet (дрібні механічні — haiku), БЕЗ рев'ю після кожної задачі, одне фінальне рев'ю всієї частини на opus → одна хвиля виправлень → коротке повторне рев'ю. Повний набір тестів — один раз наприкінці; /simplify — у кінці частини.
- Робоча тека SDD — .superpowers/sdd/<plan>/ (gitignored, ніколи не комітити звідти файли). Субагентів, що завершили роботу, відключати (TaskStop).
- Перевірка: pnpm test:run, pnpm lint (0 errors), pnpm build, battle-sweep на constructor (`DATABASE_URL=… pnpm battle-sweep [--campaign <id>]`; відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»), браузер — dev на порту 3001 (`pnpm dev -p 3001` у worktree), тестові кампанії/бої після перевірки видаляти.
- Пам'ять: project-constructor.md і feedback-constructor-no-merge.md у ~/.claude/projects/-Users-silentfox-Work-dnd-tracker/memory/.

Почни з: прочитай спек і STATUS, підтягни main у feat/constructor (якщо є нове), закрий банер шаблону з хвостів, потім запусти brainstorming етапу 2.
```
