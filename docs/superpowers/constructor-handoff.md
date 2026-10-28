# Конструктор кампаній — хендоф для нового контексту

Скопіюй блок нижче як перше повідомлення в новій сесії Claude Code, відкритій у `/Users/silentfox/Work/dnd-tracker-constructor`.

---

```
Продовжуємо епік «Конструктор кампаній» (D&D-трекер → конструктор: правила, механіки і контент налаштовуються з UI/API, шаблони кампаній). Спілкуємося українською.

Робоче середовище (обов'язково):
- Worktree /Users/silentfox/Work/dnd-tracker-constructor, гілка feat/constructor. Основну папку /Users/silentfox/Work/dnd-tracker не чіпати (там паралельно працюють інші сесії).
- БД тільки локальна: postgresql://postgres:postgres@localhost:54322/constructor (Docker-контейнер dnd-tracker-db-1; якщо зупинений — `docker start dnd-tracker-db-1`). Prisma CLI не читає .env.local сам: `set -a; source .env.local; set +a` перед `pnpm exec prisma migrate deploy` (не migrate dev). Prod і prodcopy не чіпати.
- НЕ зливати feat/constructor у main і нічого не розгортати на prod, доки не готові етапи 1–4 і 6 (Warhammer — пост-MVP). main (origin/main) підтягувати В гілку перед кожною новою частиною (після злиття — `prisma migrate deploy` на constructor, якщо прийшли міграції).
- Бекап prod від 2026-10-21 01:30: ~/dnd-tracker-backups/prod_20261021_013001. Перед роботою з prod наприкінці епіку — свіжий бекап.

Що прочитати спершу:
1. docs/superpowers/specs/2026-10-20-campaign-constructor-design.md — загальний спек епіку (етапи 1–6; етап 4 «механіки 5e»: модель класів, 15 станів 5e, слоти за класом, шаблон 5e SRD; розділ A про правила і MECHANIC_REGISTRY, «Обсяг 1b» — що з механік відкладено на етап 4).
2. docs/STATUS.md (рядок «Конструктор кампаній») і CLAUDE.md.
3. docs/architecture/: abilities.md (здібності, collectModifiers/runAbilities), battle.md (рушій бою, runBattleMutation, snapshot), balance.md (computeFairScaling), content-api.md (реєстр контенту, сервіс з assertCan, REST/OpenAPI/MCP, оновлення з джерела).
4. Код механік: lib/utils/rules/* (RulesetSchema, MECHANIC_REGISTRY, formulas), lib/constants/hero-scaling.ts, hero-archetypes.ts, lib/utils/spells/spell-slots.ts, умови/стани в lib/utils/battle (grep conditions/status effects), типи персонажа в types/.

Стан:
- Етап 1 готовий: правила кампанії (campaigns.rules, заморожуються в бою), хардкод назв → дані, шаблони (офіційні HOMM5 cmvhyai5g0001eyfadqth6y7b і «Порожня» cmvhyai9h0005eyfaiz33jh8g; робоча кампанія HOMM5 cmuylhk0c0001ia06lg5eommv), банер шаблону.
- Етап 2 готовий: фабрика CRUD (lib/server/content, CONTENT_RESOURCES), токени зі scopes ai/content:read/content:write, публічний /api/openapi.json, MCP-інструменти content_* + правила + дерева скілів.
- Етап 3 готовий: «оновлення з джерела» (спек docs/superpowers/specs/2026-10-21-constructor-stage3-source-sync-design.md) — campaign_source_syncs (baseline/ignored), lib/server/templates/sync/*, GET/POST /api/campaigns/[id]/source-sync, MCP source_diff/source_apply, діалог SourceSyncDialog (кнопки в налаштуваннях кампанії і банері шаблону). Живий скрипт scripts/constructor/source-sync-check.ts <templateId> <userId>. Останній прогін: усі тести, lint 0 errors, build, браузер (десктоп + 500px) — зелені.
- Етап 4 «механіки 5e» розбито на 4a–4f (спек docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md: 4a стани/рятівні/смерть/концентрація, 4b дії 5e, 4c класи й рівні, 4d поза боєм, 4e монстри й баланс 5e, 4f шаблон SRD). **4a готовий** (план docs/superpowers/plans/2026-10-22-constructor-4a-conditions-saves.md): реєстр станів 5e, `rollSave`, `applyDamageConsequences`, кидки смерті в циклі пропуску ходу, концентрація (прапорець у колонці `Spell.concentration`, ліниве згасання зон), роут `conditions` + `ConditionsDialog`; опис — docs/architecture/battle.md і abilities.md. Warhammer — пост-MVP. Злиття в main і prod — після етапів 1–4 і 6.

Відкладене (за потреби, не блокує наступні частини етапу 4):
- Етап 3: «Змінено: …» показує назви колонок без перекладу; L==S≠B не оновлює baseline (наступна зміна джерела — конфлікт); сторінки MCP source_diff можуть зсуватися при паралельних записах; бандл джерела не кешується.
- Етап 2: content_get може обрізатися на дуже великих записах; назва раси в get/save_skill_tree не перевіряється; listFields не типізовані; адаптер «операція → MCP-інструмент»; пагінація content_list у БД; повні схеми відповідей в OpenAPI.
- Етап 1: форма нової кампанії показує «Макс. рівень 20» незалежно від шаблону; шаблони зберігають rules розгорнутими замість {}; сервер дозволяє бої/персонажів у шаблоні; меню ДМ визначає шаблон через повний GET кампанії; «мораль ±N» у лозі при вимкненій моралі; напіванглійські назви ефектів критів. «Ельфійське око» ельфам НЕ додавати без явного рішення користувача.
- Етап 4a (відкладене): подвоєння кубиків крита для 5e (потрібна опція в `rules`, 4b/4e); відплата (retaliation) ігнорує крит зблизька; маркер концентрації — тип `buff`, тож очищення (cleanse) може його зняти; убитий під час умирання лишає ефект `unconscious`; немає підказки на клієнті для руху наляканого; тест розміру OpenAPI близький до ліміту 110000; у групі 5e редактора правил немає компонентних тестів. Після живого прогону (ef99bb38): картка героя при смерті не показує чипи ефектів; тост «впав, повернути до життя з 1 HP?» для героя з кидками смерті; мобільний вигляд 500px діалогу станів не перевірено (вікно Chrome не звужувалось).
- Розбіжність з main (не наша): balance/stats.ts рахує СК юніта як 8+майстерність без тіру.
- Після всього епіку — окремий епік «доменні модулі» (запис у STATUS; до злиття конструктора не починати).
- Prod наприкінці епіку: свіжий бекап → злиття → деплой → `pnpm constructor:backfill --all --allow-remote` → `pnpm constructor:official-templates <prodHommId> --allow-remote` → PLATFORM_ADMIN_USER_IDS у Vercel; після деплою стрільби з main — перезасіяти юнітів бібліотеки на prod (Демониця отримує chainShot).

Наступний крок — етап 4b «дії 5e» (Ривок, Відхід, Ухилення, Допомога, Сховатися, Підготувати дію; атаки при відході; Схоплення і Штовхання; вставання з положення «повалений»). Розділ 4b спеку ще схематичний → superpowers:brainstorming з користувачем для уточнення розділу 4b (перед цим — пошук наявного за правилом «reuse before writing»: lib/utils/battle/conditions, saves, damage/consequences.ts, turn, grid, attack) → доповнити спек → план у docs/superpowers/plans/ → виконання. Нульова зміна поведінки HOMM5 за замовчуванням (усі наявні тести рушія мають проходити без змін).

Як працюємо (налаштування користувача):
- Виконання — superpowers:subagent-driven-development: виконавці на sonnet, БЕЗ рев'ю після кожної задачі, одне фінальне рев'ю всієї частини на opus → одна хвиля виправлень → коротке повторне рев'ю → /simplify (4 агенти) → живий прогін. Повний набір тестів — наприкінці частини.
- Робоча тека SDD — .superpowers/sdd/<plan>/ (gitignored, ніколи не комітити). У коміти субагентів — трейлер `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Перевірка: pnpm test:run, pnpm lint (0 errors), pnpm build, battle-sweep на constructor (`set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv`; відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»; нестабільний тест lib/hooks/battle/__tests__/battle-fx.test.tsx), браузер — `pnpm dev -p 3001` у worktree; тестові токени (можна вставити в api_tokens SHA-256 хешем, скрипти через tsx не можуть імпортувати server-only модулі), кампанії і записи після перевірки видаляти.
- Наприкінці частини оновлювати docs/architecture/*.md, docs/STATUS.md, цей хендоф і пам'ять (project-constructor.md, feedback-constructor-no-merge.md у ~/.claude/projects/-Users-silentfox-Work-dnd-tracker/memory/).

Почни з: прочитай спек етапу 4 (розділ 4b) і STATUS, підтягни origin/main у feat/constructor (якщо є нове), потім brainstorming 4b.
```
