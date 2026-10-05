# Прокачка: таблиця гілок замість кола, єдині правила, редактор дерева DM

- **Дата:** 2026-10-06
- **Пункт роадмапу:** 7 (межі «B»: UI + єдині правила з серверною перевіркою; модель даних — без змін, крім `seenLevel`)
- **Гілка:** `feat/skill-progression`
- **Макети:** `.superpowers/brainstorm/23678-1791239462/content/` (локально, не в git): `player-table.html`
  (обрано варіант **B** — два яруси), `dm-table.html`, `level-up-fx.html`. Іконки в макетах — game-icons.net
  (CC BY 3.0), у застосунку — іконки скілів/гілок із БД.

## 1. Мета

Прокачка, яку зручно читати й робити з телефона: гравець бачить вивчене таблицею гілок (як панель навичок
Heroes V), при вільному очку одразу отримує впорядковані пропозиції з повним описом; DM редагує дерево раси
таблицею. Правила «що можна вчити» — одна чиста функція, яку виконують і клієнт, і сервер.

**Критерії успіху**

- Коло Heroes 5 (`components/skill-tree/*`) видалене; на 390 px прокачка без горизонтального скролу (у гравця),
  зони дотику ≥ 44 px.
- Сервер відхиляє будь-яке вивчення, що порушує правила; клієнт не може записати `skillTreeProgress` напряму.
- Профіль персонажа робить один запит прокачки замість чотирьох (без усієї бібліотеки скілів і всіх дерев).
- Бій застосовує рівні гілок за `levelSkillIds` і расові вузли; `pnpm simulate-battle` — 34/34 + новий крок.
- При вході власника в профіль після підняття рівня — повноекранна анімація нового рівня (один раз).

## 2. Поточний стан (для довідки)

- Одне дерево на расу: `SkillTree.skills` (JSON усього об'єкта `SkillTree`). Гілка (`MainSkill` у JSON) має 3 рівні
  (`levelSkillIds.basic|advanced|expert`) і слоти `levels.basic.circle3` (3 зовнішні), `circle2` (2 середні),
  `circle1` (1 внутрішній). `levels.advanced/expert.*` ніколи не рендерились. Псевдогілка `racial` (3 рівні),
  `ultimateSkill`.
- Прогрес: `Character.skillTreeProgress = { [treeId]: { unlockedSkills: string[] } }`. Id вузлів:
  `${branchId}_${level}_level`, `racial_${level}_racial`, id скіла бібліотеки для слотів і ультимейта.
- Вивчення — загальний PATCH персонажа (403 без `allowPlayerEdit`), сервер правил не перевіряє. Два суперечливі
  набори правил у `components/skill-tree/utils/hooks.ts` і `SkillCircleGroup.tsx`. Бій визначає рівень `_level`
  за назвою скіла (`inferLevelFromSkillName`), `_racial` ігнорує. Таблиця `CharacterSkills` ніде не пишеться.
- Набір гілок раси задається в трьох місцях: `Race.availableSkills`, `MainSkill.isEnableInSkillTree` (інвертований:
  `true` = сховати) і JSON дерева.

## 3. Рушій прогресії — `lib/utils/skills/progression/`

Чисті функції з тестами; формат JSON дерева й прогресу не змінюється (збережений прогрес лишається валідним).

### 3.1 Вузли

```ts
type BranchLevel = "basic" | "advanced" | "expert";
type Circle = "outer" | "middle" | "inner";

type ProgressionNode =
  | { kind: "branchLevel"; nodeId: string; branchId: string; level: BranchLevel; skillId: string | null }
  | { kind: "racial"; nodeId: string; level: BranchLevel; skillId: string | null }
  | { kind: "slot"; nodeId: string; branchId: string; circle: Circle; index: number; skillId: string }
  | { kind: "ultimate"; nodeId: string; skillId: string };

interface TreeNodes {
  treeId: string;
  branches: { id: string; name: string; color: string; icon: string | null; spellGroupId: string | null }[];
  nodes: Map<string, ProgressionNode>;
}
```

`normalizeTree(tree)`:

- гілки — `tree.mainSkills` без `racial`/`ultimate`, у порядку JSON (це і є порядок гілок);
- `branchLevel` створюється для кожного з 3 рівнів кожної гілки завжди (id `${branchId}_${level}_level`);
  `skillId` = `levelSkillIds[level] ?? null`;
- `racial` — 3 рівні з `levelSkillIds` псевдогілки `racial` (id `racial_${level}_racial`);
- `slot` — лише з `levels.basic.circle3/2/1` (outer/middle/inner), плейсхолдери (`id` порожній або
  `placeholder_*`) пропускаються; `nodeId = skillId`;
- `ultimate` — з `tree.ultimateSkill`, якщо `id` не порожній і не плейсхолдер.

`branchLevel` і `racial` існують завжди (по 3) і вчаться й без призначеного скіла — так працює й зараз
(`MainSkillLevel.tsx`, `RacialSkill.tsx`); такий вивчений вузол рахується в очки, але нічого не дає в бою.
`slot` і `ultimate` існують лише з призначеним скілом.

**Id дерева.** Канонічний ключ прогресу й `TreeNodes.treeId` — **id рядка `skill_trees`**. `normalizeTree(row)`
приймає рядок (а не лише JSON). Зараз прогрес ключується id з JSON (`skills.id`), який збігається з id рядка лише
для дерев, створених із мок-id; тому читання бере `progress[row.id] ?? progress[json.id]`, а будь-який запис
(`learn`/`unlearn`) пише під `row.id` і видаляє ключ `json.id`. `PATCH …/skill-trees` завжди перезаписує `skills.id`
на id рядка.

**Дублікати.** Якщо в наявному дереві той самий скіл стоїть у двох слотах, `normalizeTree` бере перше входження
(порядок гілок, далі outer → middle → inner), `validateTree` повертає `duplicateSkill`.

### 3.2 Правила — `canLearn(tree, unlocked, characterLevel, nodeId)`

Повертає `{ ok: true } | { ok: false; reason: LearnBlockReason }`; для кожного `reason` є український текст
(`LEARN_BLOCK_TEXT`). `unlocked` фільтрується до вузлів поточного дерева (сироти, §3.4, не враховуються).

1. `noPoints` — `unlocked.length >= characterLevel`.
2. `alreadyLearned`.
3. `notInTree` — вузла немає в `normalizeTree` (у т.ч. порожній слот дерева).
4. `branchOrder` — рівні гілки строго basic → advanced → expert (так само для `racial`).
5. `outerLimit` — зовнішній слот: вивчених зовнішніх у гілці < вивчених рівнів гілки.
6. `needOuter` — середній: ≥ 1 вивчений зовнішній у гілці.
7. `needMiddleAndExpert` — внутрішній: ≥ 1 середній у гілці і всі 3 рівні гілки.
8. `racialLevel` — расовий рівень: рівень персонажа ≥ 5 / 10 / 15 (basic / advanced / expert).
9. `needInner` — ультимейт: ≥ 3 вивчених внутрішніх у всьому дереві.

Перевірки 1–3 ідуть першими (у цьому порядку), далі — специфічна для типу вузла.

`canUnlearn(tree, unlocked, nodeId)` (лише для DM): забороняє зняти вузол, після зняття якого інший вивчений вузол
перестав би задовольняти `canLearn` (правила 4–9 без перевірки очок). Наприклад: Основи при вивченому Просунутому;
останній зовнішній, коли в гілці є середній; рівень гілки, коли зовнішніх стало б більше за рівні.
`reason`: `hasDependents`, `notLearned`.

### 3.3 Похідні для UI

`progressionView(tree, unlocked, characterLevel)`:

```ts
interface ProgressionView {
  points: { spent: number; total: number; free: number };
  racial: { levels: NodeState[] };                 // 3 вузли
  branches: BranchRow[];                            // лише гілки з хоча б одним вивченим вузлом, у порядку дерева
  untouchedBranchCount: number;                     // для рядка «Нова гілка — одна з N»
  ultimate: NodeState | null;                       // null, якщо в дереві немає ультимейта
  orphans: string[];                                // вивчені id, яких немає в дереві
}
interface BranchRow { branchId: string; level: BranchLevel | null; outer: NodeState[]; middle: NodeState[]; inner: NodeState[] }
interface NodeState { nodeId: string | null; state: "learned" | "available" | "locked"; reason?: LearnBlockReason }
```

`outer`/`middle`/`inner` завжди мають 3/2/1 елементи; порожній слот дерева — `{ nodeId: null, state: "locked",
reason: "notInTree" }`.

`rankOffers(tree, unlocked, characterLevel)` → вузли, для яких `canLearn` = ok, у порядку:

1. расові рівні й ультимейт;
2. наступний рівень уже вкачаних гілок — спершу гілки з вищим поточним рівнем, за рівності — порядок дерева;
3. доступні слоти вкачаних гілок — гілки в тому самому порядку, що в п. 2; всередині гілки outer → middle → inner,
   за індексом;
4. Основи ще не вкачаних гілок — у порядку дерева.

«Вкачана гілка» — гілка з вивченим хоча б Основами.

### 3.4 Резолвер для бою, балансу й заклинань

`resolveLearned(tree, progress)` → `LearnedNode[]`:
`{ nodeId, kind, skillId: string | null, branchId: string | null, level: BranchLevel | null, circle: Circle | null }`.
Бере `progress[row.id] ?? progress[json.id]`, лише вузли поточного дерева. **Сироти** (id, яких більше немає в
дереві — DM прибрав гілку або замінив скіл у слоті) не рахуються в очки, не діють у бою й не дають заклинань.
Прогрес під іншими ключами (зокрема старий формат «ключ = mainSkillId», який пише `simulate-battle`) ігнорується.
Продова БД порожня — міграція даних не потрібна; локальні персонажі з таким прогресом втрачають скіли, поки DM не
вивчить їх заново (або сід не перезапуститься).

`personalSkillId` персонажа не є вузлом дерева і додається до скілів бою **поза** резолвером, як зараз.

**Рівень і «лінія» скіла в бою.** Зараз `pickHighestPerLine` (`lib/utils/abilities/build/resolve.ts`, використовують
`collect.ts`, `spell-enhancers.ts`, `legacy/convert-snapshot.ts`) відрізняє скіли-рівні гілки від решти за словом
рівня в назві. Замість цього `AbilitySource.line` отримує явне поле `levelNode: boolean`:

- вузол `branchLevel` → `line = { mainSkillId: branchId, level, levelNode: true }` — групується за гілкою, діє лише
  найвищий рівень;
- `slot` → `line = { mainSkillId: branchId, level: "basic", levelNode: false }` (як зараз: `progress.level` ніхто не
  пише, тож слоти фактично мають `basic`) — групується за власним id;
- `racial`/`ultimate`/`personalSkillId` → `line` без змін щодо поточної поведінки (немає `mainSkillId` → без лінії).

`pickHighestPerLine` групує за `line.levelNode`; якщо поле `undefined` (старі знімки бою) — фолбек на
`inferLevelFromSkillName` (функція лишається лише для цього фолбеку в `parse.ts`). Клієнтська копія в
`lib/hooks/characters/useDamageCalculator-helpers.ts` видаляється — калькулятор бере рівні з резолвера.

### 3.5 Валідація дерева — `validateTree(tree, ctx)`

`ctx = { campaignMainSkillIds, campaignSkillIds }`. Помилки (масив `{ code, nodeRef }`):

- `duplicateSkill` — той самий скіл бібліотеки у двох місцях дерева (слоти, рівні, расові, ультимейт), бо id слота
  = id скіла;
- `unknownBranch` — id гілки не є main skill цієї кампанії (псевдогілки `racial` і `ultimate` — виняток);
- `unknownSkill` — скіл не з цієї кампанії;
- `duplicateBranch`.

Використовується і в редакторі DM (підсвітка, блок «Зберегти»), і в `PATCH …/skill-trees/[treeId]`.

### 3.6 Що видаляється

`components/skill-tree/utils/hooks.ts` (обидва набори правил), правила в `SkillCircleGroup`, дублікати типу прогресу
(лишається один, `SkillTreeProgress` з `lib/schemas/prisma-json`), `lib/types/skill-tree.ts` і
`lib/types/main-skills.ts` (зливаються у `types/`), `CentralSkill`/`centralSkills` (поле лишається в JSON, у типі
optional і ігнорується), `CharacterSkillProgress`, `prerequisites`/`addPrerequisites`, `getLevelStatus`,
`isMainSkillFullyUnlocked`. Назви рівнів «Основи / Просунутий / Експерт» — одна константа в `lib/constants`.

## 4. API

### 4.1 Читання — `GET /api/campaigns/[id]/characters/[cid]/progression`

Доступ: власник персонажа або DM. Сервер:

1. персонаж: `level, race, skillTreeProgress, seenLevel, controlledBy` (один `findFirst` за
   `id + campaignId`; власник — `controlledBy === userId` сесії);
2. дерево раси (`findFirst { campaignId, race }`) → `normalizeTree`;
3. скіли лише з цього дерева: `select { id, name, icon, abilities, basicInfo }` + гілки
   (`MainSkill select { id, name, color, icon }`), паралельно.

Відповідь:

```ts
interface CharacterProgressionDto {
  treeId: string | null;                 // id рядка skill_trees; null — для раси немає дерева
  tree: SkillTreeJson | null;            // JSON дерева без name/description у слотах (вони в `skills`)
  level: number;
  seenLevel: number | null;
  unlocked: string[];                    // progress[treeId] ?? progress[json.id]
  skills: Record<string, { name: string; icon: string | null; summary: string; description: string }>;
  branches: Record<string, { name: string; color: string; icon: string | null }>;
}
```

`summary` — `abilitySummary` (через `describeAbility`) на сервері; `description` — текстовий опис скіла.
Ключ кешу: `["character-progression", campaignId, characterId]`, `staleTime` як у `["character"]`.

### 4.2 Дії

Усі — `POST`, тонкий `route.ts` (Zod + сесія) + сусідній `*-handler.ts`:

| Маршрут | Хто | Тіло | Перевірка |
|---|---|---|---|
| `…/progression/learn` | власник або DM | `{ nodeId }` | `canLearn` |
| `…/progression/unlearn` | DM | `{ nodeId }` | `canUnlearn` |
| `…/progression/reset` | DM | — | — |
| `…/progression/seen-level` | лише власник | — | ставить `seenLevel = level` |

- `learn` не залежить від `campaign.allowPlayerEdit`.
- Запис: `updateMany({ where: { id, level: <прочитаний>, skillTreeProgress: { equals: <прочитаний> } }, data: { skillTreeProgress } })`;
  `count === 0` → **409** (паралельна зміна саме прогресу чи рівня; інші правки персонажа — PATCH профілю, HP — 409 не
  викликають, тому `updatedAt` для захисту не використовується).
  Порушення правил → **422** `{ reason }`; немає дерева/персонажа → 404; чужий → 403.
- `reset` пише `{}`; `unlearn`/`learn` змінюють лише `progress[treeId]`, інші ключі не чіпають.
- Відповідь `learn/unlearn/reset`: `{ unlocked: string[] }`. `seen-level`: `{ seenLevel }`.

### 4.3 Зміни в існуючих маршрутах

- `PATCH …/characters/[cid]`: `skillTreeProgress` прибирається зі схеми (`update-character-schema.ts`) і з
  `build-character-update-data.ts`, **крім** скидання прогресу при зниженні рівня (лишається).
- `POST …/characters`: новий персонаж завжди з `skillTreeProgress = {}` (поле зі схеми прибирається).
- `PATCH …/skill-trees/[treeId]`: Zod-схема дерева + `validateTree` (400 з помилками); пошук існуючого за
  `{ id, campaignId }`; якщо дерева з таким id у кампанії немає — створюється з новим `cuid`, а не з переданим id
  (виправлення колізії з іншою кампанією). Відповідь містить фінальний id.
- `GET …/skill-trees` — без змін (для редактора DM).
- Бій (`start-build-context`, add-participant, damage-preview): прибрати `include: CharacterSkills`.

### 4.4 Клієнт

- `lib/api/character-progression.ts`: `getCharacterProgression`, `learnNode`, `unlearnNode`, `resetProgression`,
  `markLevelSeen`.
- `lib/hooks/skills/` (через барел): `useCharacterProgression` (запит + `useMemo` над `normalizeTree`,
  `progressionView`, `rankOffers`), `useLearnNode`, `useUnlearnNode`, `useResetProgression`, `useMarkLevelSeen`.
- Мутації патчать кеш `character-progression` через `setQueryData` (`unlocked`) без рефетчу, а також
  `["character", campaignId, characterId]` через `setQueryData` (`skillTreeProgress`), щоб профіль не тримав
  старий стан. Навпаки: успішний PATCH персонажа й `level-up` інвалідують `["character-progression", campaignId,
  characterId]` (рівень впливає на очки й расові вузли). Інвалідуються з рефетчем активних: `["character-damage-preview",
  campaignId, characterId]` (рахується на сервері з прогресу); `["battle-balance"]` — `refetchType: "none"`.
  409 → `invalidateQueries` прогресу + `useNotify` «Прогрес змінився — оновлено». 422 → `useNotify` з текстом причини.
- Споживачі прогресу на сторінці профілю (спелбук, артефакти, калькулятор шкоди, `useLearnedSpellIds`) беруть
  вивчене з `useCharacterProgression` (резолвер над його кешем), а не з `formData.skillTreeProgress` у
  `useCharacterView`; `formData` більше не містить `skillTreeProgress`. Так вивчення рівня школи магії одразу
  оновлює спелбук і цифри шкоди на тому ж екрані.

## 5. UI гравця — `components/skill-tree/progression/`

Шрифти Alegreya і класи металів переносяться з `components/battle/hud` у спільний `components/hud`
(`fonts.ts`, `hud.css` з `.metal-*`, `.hud-sc`); бій імпортує звідти. `vi.mock` шрифтів у тестах — на новий шлях.

Панель — темна HUD-картка; замінює `CharacterSkillTreeView` у `CharacterViewSingleCard`, `AbilitiesAccordion` і
`DmCharacterEditFormAccordion`. Решта профілю не змінюється (пункт 8).

Компоненти (дані з `useCharacterProgression` у `ProgressionPanel`, далі пропсами; ≤ 7 пропсів):

- `ProgressionPanel` — заголовок «Прокачка · рівень N», ромби очок «1 вільне очко · 7 / 8»; `QueryState`; без
  дерева — `EmptyState` «Майстер ще не налаштував дерево для раси {race}».
- `RacialRow` — 3 слоти; закритий за рівнем показує «рівень 5+ / 10+ / 15+».
- `BranchRow` — макет **B**: іконка гілки в металевій рамці за рівнем (Основи — бронза, Просунутий — срібло,
  Експерт — золото) + підпис рівня; зверху 3 зовнішні (46 px), під ними 2 середні + внутрішній (40 px). Зона
  дотику кожного слота ≥ 44 px.
- `NewBranchRow` — «?» «Нова гілка — одна з N доступних»; лише коли `free > 0` і є не вкачані гілки.
- `UltimateRow` — коли ультимейт доступний або вивчений.
- `OfferList` — картки з `rankOffers`: іконка, назва, мітка («Підвищення гілки» / «Скіл · зовнішнє коло» /
  «Расове · Основи» / «Ультимейт»), `summary`. Перші 3 + «Ще N варіантів ▾». Секція є лише при `free > 0`.
- `NodeSheet` (`ResponsiveDialog`) — одна шторка для всіх тапів: іконка, назва, мітка, `summary`, повний опис.
  - вивчений → лише опис; DM — ще «Розвчити» (якщо `canUnlearn`);
  - доступний (картка або золотий «?») → кнопка «Вивчити» у `footer` (шторка і є підтвердженням);
  - закритий «?» → текст причини;
  - `branchLevel`/`racial` без призначеного скіла → назва рівня («Напад · Просунутий», «Расове · Основи») і «Майстер
    ще не призначив скіл цьому рівню» (вивчити все одно можна — відкриває слоти/наступний рівень).

Поведінка:

- Тап по золотому «?» фільтрує `OfferList` до цієї гілки й кола (чип «Напад · середнє ✕») і прокручує до списку.
  Для слота з `nodeId` — фільтр до цього вузла.
- «Вивчити» → `useLearnNode`; кнопка в стані завантаження; після успіху шторка закривається.
- Іконки — `OptimizedImage` з фіксованими `sizes`; без іконки скіла — іконка гілки, без неї — перша літера.
- Бейдж «Є вільне очко» у шапці сторінки персонажа (`character-view-client`), якір до панелі.
- DM у тій самій панелі (`canManage`): бачить усе, «Розвчити», «Скинути дерево» (`useConfirm`), «Застарілі вузли: N ·
  Прибрати» (якщо є сироти; прибирає їх через `unlearn` кожного — для сиріт `canUnlearn` завжди ok).
  Обмеження очок діють і для DM.

## 6. Анімація нового рівня — `components/skill-tree/progression/LevelUpOverlay.tsx`

- Нова колонка `characters."seenLevel" INTEGER NULL` (expand-only міграція; таблиця існує, RLS уже ввімкнено).
  `NULL` = «бачив поточний рівень».
- Показ: профіль відкриває **власник** (не DM), `seenLevel !== null && level > seenLevel`. Будь-яке підвищення
  рівня ставить `seenLevel = старий рівень`, якщо він `NULL` (щоб анімація спрацювала і для наявних персонажів після
  першого підняття); інакше не чіпає. Рівень росте у двох місцях — `level-up/route.ts` і PATCH персонажа
  (`build-character-update-data.ts`: досвід або пряме `level`); обидва викликають одну чисту функцію
  `seenLevelOnLevelChange(oldLevel, newLevel, seenLevel)` з `lib/utils/characters`. Зниження рівня не чіпає
  `seenLevel` (анімації не буде, бо `level > seenLevel` хибне).
- Повноекранний оверлей (портал, HUD-поверхня): «НОВИЙ РІВЕНЬ», ім'я → старий рівень (залізо) відлітає вгору →
  новий рівень золотом зі спалахом, променями, іскрами → «N вільне очко / вільні очки» → кнопка «До прокачки»
  (закриває й прокручує до панелі); тап будь-де закриває. Кілька пропущених рівнів — одразу старий → новий.
  `prefers-reduced-motion` — одразу кінцевий кадр. CSS-анімації, без нових залежностей.
- При показі (не при закритті) — `useMarkLevelSeen`, щоб повторне відкриття не повторювало анімацію.

## 7. UI DM — редактор дерева

Сторінка `app/campaigns/[id]/dm/skill-trees`: сервер вантажить дерева, раси, main skills; мок-фолбек прибирається.
Дерева для раси немає → порожня таблиця; стартовий набір гілок — з `race.availableSkills` (один раз, у пам'яті до
першого «Зберегти»).

`SkillTreeEditor` (стан і логіка в `useSkillTreeEditor`, компонент лише рендерить):

- Шапка: вибір раси, «Незбережені зміни», «Скасувати», «Зберегти».
- Таблиця (макет `dm-table.html`): рядок «Раса» (3 рівні), рядки гілок — 3 рівні + зовнішнє ×3 + середнє ×2 +
  внутрішнє; внизу «+ Додати гілку» і ультимейт. На телефоні назви в клітинках ховаються, колонка «Гілка» sticky,
  горизонтальний скрол.
- Клік по клітинці → `SlotPicker` (десктоп — панель праворуч; телефон — `ResponsiveDialog`): скіли бібліотеки гілки
  (`mainSkillId`) з пошуком і `summary`; для расового рядка — скіли без `mainSkillId` (зв'язку скіл ↔ раса в схемі
  немає; `getSkillRaces` завжди повертає `[]` — видаляється разом із `useSkillTreeFilters`); для ультимейта — усі; перемикач «усі скіли»
  знімає фільтр. «Поставити» / «Прибрати». Скіл, що вже є в дереві, — «вже в {гілка} · {слот}», недоступний.
- Біля назви гілки — ↑ ↓ і «Прибрати гілку» (`useConfirm`: «Вивчені вузли цієї гілки в персонажів перестануть діяти»).
- «+ Додати гілку» → шторка: main skills кампанії, яких ще немає в дереві, або «Створити нову» (назва, колір,
  іконка) → `POST …/main-skills` → гілка додається рядком.
- `validateTree` перед «Зберегти»; помилки підсвічують клітинки, «Зберегти» неактивна.
- Стан редактора заповнюється із запиту **один раз на `treeId`**; рефетч не перезаписує незбережені правки.
- Збереження → `PATCH …/skill-trees/[treeId]`; інвалідовується `["skill-trees"]` і всі
  `["character-progression", campaignId]`.

Дерево — єдине джерело списку й порядку гілок: чекбокси гілок у формі раси (`RaceFormFields`) і чекбокс
`isEnableInSkillTree` у `MainSkillEditForm` прибираються з UI; колонки лишаються до контракт-міграції.

Видаляється: `components/skill-tree/{core,elements,ui,utils}`, `useSkillTreePage*`, `useSkillTreeAssignment`,
`useSkillTreeClear`, `useSkillTreeEnrichment`, `useSkillTreeFilters` (якщо не потрібен `SlotPicker`), «режим гравця»
DM-сторінки, генератор мок-дерев (окрім створення порожнього дерева), стилі кола в `app/globals.css`,
`skill-tree-positions.ts` (сторінка друку переходить на `normalizeTree`).

## 8. Бій, баланс, заклинання

Усі переходять на `resolveLearned`:

- `lib/utils/battle/participant/extract-skills.ts`: дерева потрібних рас — один `findMany` (старт бою вже так
  робить у `start-build-context.ts`; додати для add-participant, damage-preview і фолбеку `findFirst` у
  `from-character-learned-spells.ts`); рівні гілок — зі `skillId` вузла (`levelSkillIds`), з `line.levelNode`
  (§3.4); `_racial` дають свої скіли; `personalSkillId` — поза резолвером.
- `include: { characterSkills }` прибирається з `start-battle-handler.ts`, `lib/utils/prisma/includes.ts` і типу
  `CharacterFromPrisma`.
- Баланс: `lib/utils/battle/balance/{stats,dpr}.ts`, `balance-get/post`.
- Заклинання з дерева: `lib/utils/spells/spell-learning.ts`, `from-character-learned-spells.ts`,
  `useLearnedSpellIds` — рівень гілки та її `spellGroupId` із резолвера.
- Клієнтські калькулятори (`useDamageCalculator-skills`, `CharacterDamageCalculator`, артефакти, спелбук,
  `useCharacterView`): резолвер замість власного пошуку дерева; де можливо — дані з кешу `character-progression`.
- Форми персонажа (`edit-client`, `character-form`, `dm/characters/new`) більше не несуть `skillTreeProgress`.
- Скрипти `simulate-battle`, `seed-mock-battle-data`, `setup-battle-test-3v5` **створюють дерево раси** зі скілами
  в слотах/рівнях (через спільний хелпер `buildTreeJson` у `progression/`) і пишуть прогрес під id рядка дерева;
  `setup-battle-test-3v5` більше не пише `CharacterSkills`. Без цього `simulate-battle` втратить усі скіли
  персонажів (зараз ключ прогресу — mainSkillId, дерев у локальній БД немає).

До списку контракт-міграції додаються: таблиця `CharacterSkills`, `Race.availableSkills`,
`MainSkill.isEnableInSkillTree`.

## 9. Тести й перевірка

TDD: тест першим для кожної чистої функції й маршруту.

- `progression/__tests__`: `canLearn` (кожне правило з межами: зовнішніх = рівням гілки, внутрішній без Експерта,
  расове на рівні 4/5, ультимейт при 2/3 внутрішніх, `noPoints`, сироти, плейсхолдери); `canUnlearn`; `rankOffers`
  (приклад: Просунутий Напад + Основи Захисту → расове → Напад→Експерт → Захист→Просунутий → скіли Нападу → скіли
  Захисту → Основи нових); `progressionView`; `normalizeTree` (старий JSON із порожніми advanced/expert);
  `validateTree`; `resolveLearned` (ключ рядка й фолбек на JSON id, `levelNode`, сироти); `pickHighestPerLine`
  (рівні гілки без слова рівня в назві не стакаються; старий знімок без `levelNode` — фолбек на назву);
  `seenLevelOnLevelChange`.
- Маршрути (`app/api/__tests__`): `learn` (власник без `allowPlayerEdit` → 200, чужий → 403, правило → 422,
  паралельно змінений прогрес → 409, PATCH профілю між читанням і `learn` → не 409), `unlearn`/`reset` лише DM, `seen-level` лише власник, `GET progression` (лише скіли
  дерева), PATCH персонажа без `skillTreeProgress` і з `seenLevel` при підвищенні через досвід, PATCH дерева
  (дублікати → 400, колізія id, `skills.id` = id рядка), `level-up` ставить `seenLevel`. Профіль: після `learn`
  рівня школи магії спелбук показує нове заклинання без перезавантаження. `extract-skills`: рівень гілки через `levelSkillIds` для скіла, назва якого не містить рівня;
  расовий вузол.
- Хуки/UI (happy-dom, `afterEach(cleanup)`, мок `components/hud/fonts`): `useLearnNode` (патч кешу, 409);
  `ProgressionPanel` (рядки B, шторка вивченого без «Вивчити», золотий «?» фільтрує, причина закритого, «Ще N»);
  `useSkillTreeEditor` (рефетч не перезаписує правки — **змінений знімок сервера + `waitFor`**, перевірка мутантом
  без захисту; додати/прибрати/порядок гілок; дубль блокує «Зберегти»); `LevelUpOverlay` (власник при
  `level > seenLevel`; не DM; не при `NULL`; викликає `seen-level`; reduced-motion).
- Наприкінці: `pnpm lint`, `pnpm test:run`, `pnpm build`; `pnpm simulate-battle` на локальній БД — 34/34 + новий крок
  (персонаж із вивченим рівнем гілки через `levelSkillIds` і расовим вузлом отримує їхні модифікатори); браузер
  390 px (DM-логін, SIM-кампанія): редактор дерева, панель прокачки в DM-режимі, анімація (через `seenLevel` у
  локальній БД). Вигляд гравця — тестами.

## 10. Поза межами

- Зміна формату JSON дерева/прогресу, таблиця прогресу — контракт-міграція.
- Мобільний профіль загалом — пункт 8.
- Сповіщення в реальному часі про новий рівень (Pusher) — ні; бейдж і анімація при вході.
- Ліміт кількості гілок — ні.
