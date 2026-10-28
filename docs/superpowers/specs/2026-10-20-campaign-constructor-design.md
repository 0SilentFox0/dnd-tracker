# Конструктор кампаній — етап 1: правила кампанії + шаблони (дизайн)

## Context

Мета — перетворити трекер на повністю кастомізовний конструктор: ДМ обирає шаблон під час створення кампанії (HOMM5, згодом D&D 5e, Warhammer, «порожня») і налаштовує все через UI або відкрите API (AI-агент). Зміни діють лише в межах його кампанії. Зараз платформа тільки для автора; згодом стане публічною за підпискою (тоді буде інша інфраструктура).

Що показала розвідка:
- Контент уже ізольований за `campaignId`, кеш теж окремий для кожної кампанії.
- Шаблонів немає. Нова кампанія порожня, каталог HOMM5 записаний у TS (`data/library/`) і заливається скриптом `pnpm seed-library`.
- Хардкоду за назвами небагато: ініціатива Файдаен/Айвен, «Ельфійське око», `SPELL_FX`, кольори шкіл і іконки груп, псевдоніми гілок, рівень скіла з назви, імунітети з тексту, назви атак за замовчуванням.
- Основний хардкод — «словник механік»: мораль, таблиця критів, формули DC/to-hit, слоти, архетипи й масштабування героїв, типи шкоди, стати. Числа й комбінації здібностей уже зберігаються як дані, а види механік існують тільки в коді.
- API закрите (тільки cookie), але Zod-схеми спільні.

Рішення з брейншторму: механіки = каталог у коді, а ДМ вмикає їх і налаштовує. Шаблон = копія (fork) з `sourceId` під майбутнє «оновити з шаблону». Офіційні шаблони веде адмін платформи, особисті — ДМ. Пізніше токени + OpenAPI + MCP. Етап 1 = HOMM5 як шаблон + порожній шаблон.

### Дорожня карта (кожен етап — окремий спек, план і реалізація)
1. **Фундамент (цей план):** `campaigns.rules` + реєстр механік, прибраний хардкод за назвами, шаблони (бандл, клонер, експорт та імпорт), офіційні шаблони HOMM5 і «Порожня», вибір шаблону під час створення кампанії.
2. Відкрите API: персональні токени (scope кампанії), OpenAPI зі спільних Zod-схем, MCP `/api/mcp`.
3. «Оновити з шаблону»: різниця за `sourceId`/`sourceHash`, вибіркове прийняття змін.
4. Механіки 5e: модель класів, 15 станів 5e, слоти за класом, шаблон 5e SRD.
5. Шаблон Warhammer.
6. Вбудований AI-асистент на MCP-інструментах (замінює «стадію 2» сценарію).

## Робоче середовище (обов'язково)
- Окремий worktree: `git worktree add ../dnd-tracker-constructor -b feat/constructor`. Основну папку не чіпаємо.
- Окрема БД: `./scripts/db/prodcopy-db.sh constructor` → `postgresql://postgres:postgres@localhost:54322/constructor`. `.env.local` worktree вказує `DATABASE_URL`/`DIRECT_URL` саме на неї. Prod і `prodcopy` не чіпаємо.

## Дизайн

### A. Правила кампанії
- Prisma: `Campaign.rules Json @default("{}")` (expand-only, без бекфілу). `BattleScene.rules Json?` — копія правил кампанії, яку записує старт бою (`start`-мутація, поряд із `start-fair-scaling.ts`). Для боїв зі статусом `prepared` і старих активних боїв, де `rules = null`, діють поточні правила кампанії.
- Де читаються правила:
  - **рушій бою** — тільки зафіксована копія `battle.rules`;
  - **усе поза боєм** — живі правила кампанії: лист персонажа (HP, слоти), налаштування бою і `useFairBalance`, редактори.
- Доступ: `GET /api/campaigns/[id]/rules` — будь-який учасник (`requireCampaignAccess`), бо гравцям правила потрібні для UI; `PATCH` — тільки ДМ. `readBattleScene` віддає `rules` у складі `BattleScene`, щоб клієнт бою не робив окремий запит.
- `lib/utils/rules/`:
  - `schema.ts` — `RulesetSchema`, де кожна механіка має значення за замовчуванням, рівні поточній поведінці. `parseRules(json): Ruleset` — порожній `{}` означає «як зараз».
  - `registry.ts` — `MECHANIC_REGISTRY` (`satisfies Record<MechanicKey, MechanicDef>`, за зразком `MAP_MODE_REGISTRY` у `lib/utils/battle/modes`): `{ key, label, description, paramsSchema, defaults, canDisable }`.
- Механіки першої хвилі (з наявного коду):
  - `morale` — вкл./викл., кубик, формула порогу, макс. значення, назва. Зараз у `lib/utils/battle/morale/check.ts` та `effective-morale.ts`.
  - `criticals` — поріг кріту, таблиці nat-20 і nat-1 як дані, вкл./викл. Зараз у `lib/constants/critical-effects.ts`, `attack/roll.ts`, `attack/critical.ts`.
  - `attackFormula` / `saveDC` — база DC 8, prof + mod. Зараз у `attack/bonus.ts:18`, `spell/power.ts:21`, `balance/stats.ts:120`.
  - `spellSlots` — прогресія слотів героя. Зараз у `lib/utils/spells/spell-slots.ts`, `DEFAULT_SPELL_SLOT_PROGRESSION`.
  - `heroScaling` — кубики за рівнем, HP-формула, архетипи. Зараз у `lib/constants/hero-scaling.ts`, `hero-archetypes.ts`.
  - `initiative` — кубик або формула. Зараз у `lib/utils/battle/turn/initiative.ts`, `HERO_INITIATIVE`.
- Довідники в `rules`: типи шкоди (`lib/constants/damage.ts`), стати (`ABILITY_SCORES`), атаки за замовчуванням.
- Рушій:
  - `loadBattle` (`lib/utils/battle/store`) дає правила кампанії, а для активного бою — `battle.rules`.
  - Чиста логіка отримує `rules` параметром або через контекст бою і не імпортує константи напряму.
  - Якщо механіку вимкнено, її хуки не викликаються, а UI ховає пов'язані поля.
  - `balance` (`computeFairScaling`) читає ті самі правила: формули атаки та DC і мораль.
- API: `GET/PATCH /api/campaigns/[id]/rules` (`parseBody(RulesetPatchSchema)`, доступ — див. вище), `lib/api/rules.ts`, хук `lib/hooks/campaigns/useCampaignRules`.
- UI: `app/campaigns/[id]/dm/rules` — `HudFormPage` + `HudTab` на кожну механіку, перемикач і параметри.

### B. Хардкод за назвами → дані
Скрипт `scripts/constructor/backfill-content-fields.ts <campaignId|--all>` один раз розставляє нові поля за назвами в наявних кампаніях.

| Зараз | Стане |
|---|---|
| `turn/initiative.ts:12-26` (Файдаен/Айвен — за ім'ям учасника або расою «Фајдаен») | Здібність `modifyStat initiative +999` у раси, юніта чи героя, яких знайде бекфіл; `if` видаляємо |
| `attack/bonus.ts:43` («Ельфійське око») | Здібність раси Ельф: passive + `attackKind: ranged` + flag `advantage` |
| `fx/spells.ts` `SPELL_FX` (~45 назв), `fx/aura.ts:49`, `SpellBattlePreview.tsx` | `Spell.fx Json?` `{archetype, element, aura}` + вибір у редакторі заклинання; каталог архетипів лишається в коді; загальні правила `spellRules` на випадок порожнього поля |
| `constants/spells.ts:36-41`, `spells/spell-icons.ts` | `SpellGroup.color`, `SpellGroup.icon` + нова сторінка `dm/spell-groups` (список + `ResponsiveDialog hud`: назва, колір, іконка) |
| `constants/main-skills.ts`, `constants/dpr-by-main-skill.ts` | `MainSkill.role` (attack/ranged/defense/magic/leadership/race/ultimate/personal): список ролей у коді, призначення в даних |
| `participant/parse.ts:5-9` `inferLevelFromSkillName` (запасний варіант у `abilities/build/resolve.ts:18`, коли в рядку дерева немає `levelNode`) | Бекфіл проставляє `levelNode` у деревах скілів, де його немає; запасний варіант за назвою видаляємо |
| `constants/immunities.ts` → `races/race-effects.ts` (регулярні вирази по тексту `passiveAbility` раси) | Прапорці `conditionImmunity`/`spellImmunity` в `abilities` раси + бекфіл |
| `participant/extract-attacks.ts:20-21` | `rules.defaultAttacks` |

Захист від регресу: vitest, що бере назви рас, юнітів, заклинань і гілок із `data/library` (тест працює без БД), шукає їх як рядкові літерали в `lib/utils/**`, `lib/constants/**` і `components/battle/**` і падає, якщо знаходить.

### C. Шаблони
- Prisma:
  - `Campaign.kind String @default("campaign")` (`campaign|template`), `visibility String @default("private")` (`private|official`), `createdFromId String?`.
  - Таблиці контенту (spell_groups, spells, units, races, main_skills, skills, skill_trees, artifact_sets, artifacts, campaign_tracks): `sourceId String?`, `sourceHash String?`.
  - Константи `lib/constants/campaigns.ts`.
- Адміни платформи: env `PLATFORM_ADMIN_USER_IDS`, хелпер `isPlatformAdmin` у `lib/utils/api/api-auth.ts`. Тільки вони можуть ставити `official`.
- Шаблони не потрапляють у `GET /api/campaigns` і в кеш `campaign-list`. Для них є окремий список `GET /api/templates`: офіційні + мої.
- `lib/server/templates/`:
  - `bundle-schema.ts` — `BundleSchema` (Zod, `formatVersion: 1`):
    - `settings`: `maxLevel`, `xpMultiplier`, `allowPlayerEdit`, `friendlyFire`;
    - `rules`;
    - масиви сутностей у вигляді рядків таблиці без `campaignId`, `createdAt`, `updatedAt`, `sourceId`, `sourceHash`. `id` = id джерела.
  - `export-campaign.ts` — `exportCampaign(campaignId): Bundle`.
  - `remap-ids.ts`:
    - будує `idMap` (id джерела → новий id, який генерується в коді заздалегідь, тож `createMany` не мусить повертати id);
    - рекурсивно обходить **кожне** значення рядка — FK-колонки і будь-який JSON — і замінює рядок, що точно дорівнює ключу `idMap`. Реєстр JSON-шляхів не потрібен: cuid унікальні, тому заміна за точним збігом охоплює й поля, про які ми не знаємо або які з'являться пізніше. Серед них зараз: `Unit.knownSpells`/`attacks`, `Race.availableSkills`/`disabledSkills`, `SkillTree.skills`, `Skill.spellEnhancementData`, `Artifact.bonuses`/`modifiers`, `ArtifactSet.setBonus`, `Spell.spellEffects`/`raceModifiers`, `abilities` усіх власників.
    - `SkillTree.race` — це назва раси, а не id, тому копіюється як є.
  - `import-bundle.ts` — `importBundle(bundle, targetCampaignId, tx)`:
    - `remapIds`, потім `createMany` по таблицях у порядку FK: групи → юніти → раси → заклинання → гілки → скіли → дерева → сети → артефакти → треки;
    - ставить `sourceId` = id джерела і `sourceHash` = хеш вмісту (`lib/utils/battle/store/stable-json`).
  - `assert-no-leak.ts` — той самий обхід. Якщо в імпортованих рядках лишився хоч один id з `idMap`, кидає помилку, і транзакцію відкочено. Під час імпорту файлу JSON від користувача додатково перевіряє, що кожен рядок, схожий на cuid, або є в `idMap`, або не є id контенту іншої кампанії в БД.
  - Клонування = `importBundle(exportCampaign(templateId), newId)`.
- Шаблон не можна приєднати за invite-кодом: `join` відмовляє, якщо `kind = template`. Відкривати й редагувати шаблон може тільки власник (DM-учасник). Кампанію з офіційного шаблону створює будь-хто: сервер клонує контент без членства в шаблоні.
- Склад шаблону: налаштування кампанії, правила, увесь контент бібліотек і музика. **Без** персонажів, боїв, сценарію і слайдів. Ассети Storage спільні за URL (незмінні); у спек іде правило «не видаляти ассети, на які посилається шаблон».
- Роути (тонкі, логіка в `lib/server/templates`):
  - `POST /api/campaigns` з необов'язковим `templateId` (створення + клонування в одній транзакції з розширеним timeout);
  - `GET /api/campaigns/[id]/export` (DM);
  - `POST /api/campaigns/import` (бандл → нова кампанія);
  - `POST /api/campaigns/[id]/save-as-template` (DM);
  - `PATCH /api/templates/[id]` (назва, опис; `visibility` тільки для адміна);
  - `GET /api/templates`.

  Відповідно: `lib/api/templates.ts`, хуки `lib/hooks/campaigns` (`useTemplates`, `useCreateCampaign` з `templateId`), `invalidateReference` для всіх видів після імпорту.
- UI:
  - Майстер створення кампанії отримує крок «Шаблон»: картки `HudTile` — офіційні (HOMM5, Порожня), мої, «Імпорт JSON».
  - У налаштуваннях кампанії ДМ: «Зберегти як шаблон», «Експорт JSON».
  - Розділ «Шаблони» в списку кампаній; шаблон відкривається тими самими DM-редакторами.
- Офіційні шаблони — скрипт `scripts/constructor/create-official-templates.ts <homm5CampaignId>`:
  - «HOMM5» = `exportCampaign` реальної HOMM-кампанії → `importBundle` у нову кампанію з `kind = template` і `visibility = official`. Береться жива кампанія, а не `data/library`, бо на prod контент після сидів правився вручну.
  - «Порожня» = шаблон без контенту з `rules = {}`. Механіки за замовчуванням — HOMM-подібні (мораль увімкнена), ДМ вимикає їх сам.
  - Порядок запуску: спершу на `constructor`, а після деплою — на prod (після бекапу), разом із бекфілом із розділу B.

## Порядок реалізації всередині етапу 1
Три частини, кожна закінчується зеленими тестами і `battle-sweep` на `constructor`, а потім комітиться у `feat/constructor`. Злиття в `main` — одне, наприкінці етапу.
1. **1a — B (хардкод → дані).** Найменший ризик, і його результат потрібен шаблонам: інакше склонований контент працює тільки завдяки назвам у коді.
2. **1b — A (правила).** Механіки переходять у реєстр по одній, після кожної — повний прогін тестів.
3. **1c — C (шаблони).** Бандл уже включає `rules` і нові поля з 1a.

## Перевірка
- `pnpm test:run`: усі наявні тести рушія проходять **без змін** на правилах за замовчуванням (критерій еквівалентності).
- Нові тести:
  - `lib/utils/rules/__tests__`: парсинг і значення за замовчуванням, модулі з вимкненою механікою або іншими параметрами (мораль вимкнено, крит 19+, DC 10);
  - `lib/server/templates/__tests__`: цикл «експорт → імпорт → експорт», рівний з точністю до id; `assert-no-leak` ловить пропущене посилання;
  - тест на літерали назв контенту.
- `pnpm lint`, `pnpm build`.
- На БД `constructor`:
  1. Створити кампанію з шаблону HOMM5 через API. `battle-sweep` шукає в кампанії героїв за іменами (`scripts/sim/battle-sweep.ts:396`), а шаблон героїв не містить. Тому тестовий скрипт `scripts/constructor/copy-test-heroes.ts <from> <to>` копіює героїв із вихідної кампанії і переставляє їхні посилання на скіли, заклинання й артефакти через `sourceId` клону. Далі `DATABASE_URL=…/constructor pnpm battle-sweep --campaign <id>` має пройти без помилок.
  2. У цій кампанії вимкнути мораль і поставити кріт-поріг 19 → `battle-sweep` без помилок; у логах немає перевірок моралі, криту на 19 трапляються.
  3. Наявна кампанія (з prod-копії) після бекфілу → `battle-sweep` без регресу.
- Браузер (`pnpm dev` у worktree): створити кампанію з HOMM5 і з «Порожньої», змінити правила, провести бій (десктоп + мобільний), «Зберегти як шаблон», «Експорт/Імпорт JSON».

## Обмеження й правила
- **Нульова зміна поведінки за замовчуванням.** `rules = {}` і порожні нові поля дають рівно ту саму поведінку, що до етапу 1. Будь-яка відмінність у наявних тестах — це баг, а не «оновлення снапшоту».
- **Міграції тільки розширюють схему (expand-only):** нові колонки nullable або з default; нічого не видаляємо й не перейменовуємо. Старі константи (`SPELL_FX`, `MAGIC_MAIN_SKILL_IDS`, `immunities.ts`) видаляємо з коду лише тоді, коли бекфіл пройшов на `constructor`; на prod бекфіл запускається одразу після деплою міграції.
- **Ассети Storage** (іконки, аватари юнітів, треки), на які посилається шаблон, не видаляються: копії кампаній посилаються на ті самі URL.
- **Ізоляція.** Імпорт бандла ніколи не пише в кампанію, відмінну від цільової. `assert-no-leak` обов'язковий у кожному шляху імпорту.
- **Розмір транзакції.** Клон HOMM5 — це сотні рядків, тому `createMany` по таблицях і `$transaction` з timeout ~60 с. На Vercel (pgbouncer, `connection_limit=1`) — інтерактивна транзакція в одному з'єднанні.
- **Кеш.** Після імпорту, зміни правил і збереження шаблону викликається `invalidateReference` для всіх видів цільової кампанії та `invalidateCampaignLists` для власника.

## Поза етапом 1
Токени, OpenAPI і MCP (етап 2); «оновити з шаблону» (етап 3); класи, стани 5e і шаблон 5e SRD (етап 4); Warhammer (етап 5); вбудований AI (етап 6); нові види тригерів чи ефектів у `abilities`; квоти, білінг, публічний маркетплейс шаблонів; копіювання персонажів, боїв, сценарію й слайдів у шаблон.

## Ризики
- **Розкидані константи механік.** Мораль, крити й формули читаються в багатьох місцях: рушій, `balance`, `view`, UI. Пом'якшення: спершу інвентаризація використань кожної константи, потім заміна по одній механіці з прогоном усіх тестів.
- **Пропущене посилання під час клонування.** Пом'якшення: заміна за точним збігом id в усіх значеннях (без реєстру шляхів), `assert-no-leak` і тест циклу «експорт → імпорт → експорт» на повному шаблоні HOMM5.
- **Бекфіл за назвами на prod.** Пом'якшення: `--dry-run` зі звітом; спершу `constructor`, потім prod після бекапу (`scripts/db/backup-database.sh`).
