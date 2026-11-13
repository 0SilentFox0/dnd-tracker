# Ч16 — дизайн: шов створення режиму (2026-11-13, Opus)

Гілка `feat/e2-part16-mode-seam` від local main 85cb90883 (Ч11 злита), worktree `/Users/silentfox/Work/dnd-tracker-e2-ch16`, дев-порт 3200, БД `prodcopy_ch16`. Паралельно йде Ч12 (`../dnd-tracker-e2-ch12`), її смуга: `components/battle`, `lib/hooks/battle`, `lib/utils/battle/**`, `types/battle.ts`, `systems/*/ui/battle`. Ч16 туди не заходить.

Брифи: `common-ch16.md`, `task-ch16-{1,2,3}-brief.md`. Сесії строго послідовні в одній гілці: С1 → С2 → С3. Кожен коміт компілюється.

## Головна знахідка: каркас є, бракує запису, пресетів правил і UI

Звірка з кодом (`rg`, 2026-11-13):

| Пункт плану | Реальний стан | Рішення |
|---|---|---|
| 1. `moduleCatalog()` | **уже є** (`lib/utils/rules/systems/catalog.ts:125`, Ч1): `bases/addons/presets`, `requires`, `conflicts`, `toggle`, `nameKey`/`summaryKey`; тексти `gameTerms.module.<id>.{name,summary}` є в обох локалях (Ч2). Тесту «каталог = теки `systems/*`» немає | додати тест; додати чисті хелпери перемикання (`moduleToggles`, `withModule`, `moduleChange`) у `catalog.ts` |
| `validateComposition` | є (`compose.ts:59`), клієнтобезпечна; колізії секцій ловить окремо `validateSections` (`section-registry.ts:39`) | одна точка `systemIssues(system)` = обидві перевірки |
| 2. Патч правил приймає `system.modules` | `RulesetPatchSchema` будується з `CORE_SECTIONS.system.items = ['key']` → `strictObject` **відкидає** `modules` (заборона Ч1, задача 5). `mergeRules` уже вміє `modules` (тест D16 Ч10 викликає його напряму), але при зміні `key` стирає й `modules` з патча. `updateCampaignRules` (`lib/server/campaigns/rules.ts:69`) перевіряє лише `SYSTEM_LOCKED` | спецвипадок `system` у `rulesetPatchSchemaFor`; верхній `confirm`; нова серверна перевірка (422/409/409) перед `mergeRules` |
| «інвалідація кешу композиції» | серверні кеші (`composeSystem`/`systemUiOf`/`systemServerOf` за `key+modules`, `parseRulesCached` за сирим JSON, мемо правил на `Actor` у `kind-active.ts`) — функції від входу, застарілих записів не буває. Застаріває **клієнт**: списки модульних видів (D15 повертав `[]`), меню ДМ, серверні layout-гарди (`dmSectionLayout`) і `PrefetchedQuery` | інвалідація на клієнті: `setQueryData(rules)` + `invalidateQueries` усіх запитів кампанії, крім `rules`, + `router.refresh()` (відхилення В2) |
| `rules.get` повертає `modules` і каталог | вигляд = `Ruleset & { systemLocked }`; `system.modules` є лише коли збережений явно | `composition: { base, modules }` (розгорнутий набір) у вигляді; каталог — **ні** (відхилення В1) |
| 3. Створення без шаблону | без шаблону зберігається лише `{ defaultAttacks }` → `parseRules` вгадує систему (`classes.enabled ? dnd5e : homm`), фактично `homm`. `systems/homm/rules/rules-preset.ts` (`HOMM_RULES_PRESET`) **ніхто не читає**; у d20 пресета немає; у wfrp `WFRP_RULES` — розібраний `Ruleset` лише для тестів | згенерований корінь `RULES_PRESETS`, пресети d20/wfrp/homm, `initialRules(system)`, тест паритету з порожніми пакетами (відхилення В3) |
| 4. UI «Система» | `SystemSection.tsx` — лише селект ключа (частина стану форми, зберігається кнопкою «Зберегти»). Сторінка правил — лише ДМ (`requireCampaignDMOrDemo`; демо бачить JSON без форми) | перемикачі модулів = **окрема негайна дія** (не стан форми), вимкнені, поки форма «брудна» (відхилення В4) |
| 5. Маніфест `modules`, `template validate` звіряє `kinds` | `TemplateManifest` без `modules`; `validate.ts` звіряє лише `system.key`; `export.ts:259` **перезаписує** `system` на `{ key: manifest.system }` — загубив би `modules`; `skillTrees` — вид пакета без власника в meta | `modules?` у маніфесті й схемі; три перевірки у `validate`; `export` зберігає `modules`; `skillTrees` ↔ `skills` через таблицю `PACK_KIND_CONTENT` |
| 6. whats-new + help | `dm-rule-systems` має 9 розділів (`lib/onboarding/help/dm.ts:112`) | новий запис і розділ «Модулі правил» (s9) |
| OpenAPI | будується з `CONTENT_OPERATIONS` (`rules.update.body = RulesetPatchSchema`) — `modules`/`confirm` з'являться самі | лише `errors: [409, 422]` і опис |
| AI-інструмент правил | `update_rules`/`get_rules` (`lib/ai/tools/content.ts:102-120`) → аліас `rules.update` → `updateCampaignRules`; прев'ю асистента (`content-operation-preview.ts:117`) робить `mergeRules` без перевірок | гейти діють автоматично; оновити описи; прев'ю відкидає `confirm` і показує 422 |
| Вхідні хвости: читачі `systemUiOf` без `modules` | `PlayerDraftForm` — **закрито в Ч11** (`23ce20b13`, `statColumnsOf(def).has('archetype')`). Решта без `modules`: `SheetRollDialog` (`RollDialogBody`), `ResourcesDialog` (`ResourceFields`, `resourceDefaults`), `PartyRestActions` (`DowntimePeriodPanel`), `RaceEditForm` (`RaceProfileEditor`), `SpellFormBody` (`SpellMagicFields`), `ArtifactForm` (`ArtifactStatsEditor`), `UnitFormFields` (`UnitStatsFields`), сторінки чернеток (`DraftForm`) — **усе слоти бази**, які задає ключ. Модульні слоти (`rulesSections`, `rulesItems`, `forms.fields`, `sheet.*`, `dmPages`) уже читаються з `modules` (`SkillsTab`, `InventoryTab`, `CombatTab`, `ProfileEditor`, `NewCharacterForm`, `SystemFormFields`, `RulesForm`, `SystemDmPage`) | **нічого не міняти** (правило Ч11: слот бази — за ключем). Боєві `DmQuickActionsPanel`, `use-system-battle-ui` — Ч12 |

Реальний обсяг ≈ 55–65 файлів, три сесії Sonnet.

## Рішення

### Р1. Чисті хелпери композиції (С1, `catalog.ts` + `section-registry.ts`, клієнтобезпечні)

```ts
// lib/utils/rules/systems/catalog.ts
export interface ModuleToggle {
    id: string;
    active: boolean;
    available: boolean;              // можна перемкнути зараз
    reason?: { code: 'missingRequires' | 'conflict' | 'requiredBy'; module: string };
    toggle: 'free' | 'setup';
}
export function moduleToggles(system: SystemSelection, metas?: Metas): ModuleToggle[];
export function withModule(system: SystemSelection, id: string, on: boolean, metas?: Metas): SystemSelection; // { key, modules: sortedUnique } — завжди явний повний набір
export function moduleChange(current: SystemSelection, next: SystemSelection, metas?: Metas):
    { changed: boolean; added: string[]; removed: string[]; setup: string[] }; // setup = (added ∪ removed) з toggle 'setup'
```

- `moduleToggles` перелічує addon-и, сумісні з базою композиції (у `requires` немає іншої бази), за id. Вимкнений модуль `available`, якщо всі `requires` (крім бази) активні й жоден `conflicts` не активний; увімкнений — якщо жоден активний модуль його не `requires`. `reason` — перша причина.
- `systemIssues(system): CompositionIssue[]` (`lib/utils/rules/section-registry.ts`): `validateComposition`, а якщо порожньо — `validateSections(composition(system))`. Одна функція для сервера, створення й `template validate`.
- Тест «каталог = теки»: `moduleCatalog()` (`bases ∪ addons ∪ presets` за `module`) = теки `systems/*`, що мають `meta.ts` (`fs.readdirSync`).

### Р2. Патч правил (С1)

- **Схема.** `rulesetPatchSchemaFor`: секція `system` будується не з `items`, а явно:
  `system: z.strictObject({ key: <як зараз>, modules: z.array(z.string().regex(/^[a-z0-9]+$/)).max(32).describe(<список id addon-ів із moduleCatalog()>).optional() }).optional()`.
  Невідомий id проходить схему й ловиться `systemIssues` як `unknownModule` → **422** (одна форма відповіді для всіх помилок набору). Верхнє поле `confirm: z.literal(true).optional()`.
- **Тип.** `RulesetPatch.system?: { key?: string; modules?: string[] }`, `RulesetPatch.confirm?: true`.
- **`mergeRules`.** Ігнорує `confirm`. Зміна `key` скидає `modules`, **крім** випадку, коли патч сам дає `modules` (тоді беруться вони). Те саме у `writeOverRaw` (`opts.keyChanged && !patchHasModules → delete system.modules`).
- **Нормалізація.** Сервер сортує й дедуплікує `modules` перед злиттям (spec 4.2: зберігається відсортованим). `[]` — валідний явний набір («голий» base навіть для ключа `homm`).

### Р3. Серверні гейти (С1, новий `lib/server/campaigns/modules.ts`, `server-only`)

```ts
export const compositionApiIssues = (issues: CompositionIssue[]) =>
    issues.map((i) => ({ code: 'custom', path: ['system', 'modules'], message: `rules.validation.composition.${i.code}`, params: { module: i.module ?? '', detail: i.detail ?? '' } }));
export function assertValidSystem(system: SystemSelection): void;          // systemIssues → ContentError(SYSTEM_MODULES_INVALID, 422, issues)
export async function assertModuleChange(db: Pick<Prisma.TransactionClient, 'battleScene' | 'character'>, campaignId: string,
    current: SystemSelection, next: SystemSelection, confirm: boolean): Promise<void>;
```

Порядок у `updateCampaignRules` (усередині `withCampaignContentWrite`, лічильники — через `tx`):

1. `assertCan` (ДМ; гравець → **403**, як зараз).
2. Схема патча → **400** `INVALID_RULES` (як зараз, `operationRoute`).
3. Кастомні стани → 409 `RULES_CUSTOM_CONDITION_IN_USE` (як зараз).
4. Зміна `key` при персонажах/юнітах → 409 `SYSTEM_LOCKED` (як зараз).
5. Якщо патч має `system.modules` (або міняє `key`): `next = { key: patch.system.key ?? current.key, modules: sortedUnique(patch.system.modules) }` (без `modules` у патчі при зміні ключа — `{ key }`), `assertValidSystem(next)` → **422** `SYSTEM_MODULES_INVALID`, `issues[]` за шляхом `['system','modules']`.
6. `moduleChange(current.system, next)`: `changed === false` → далі без перевірок (ідемпотентний патч).
7. `tx.battleScene.count({ where: { campaignId, status: BattleStatus.ACTIVE } }) > 0` → **409** `SYSTEM_MODULES_IN_BATTLE`. Підготовлений (`prepared`) бій не блокує: його учасники перераховуються на старті.
8. `setup.length > 0 && tx.character.count({ where: { campaignId } }) > 0 && confirm !== true` → **409** `SYSTEM_MODULE_CONFIRM`, `issues: setup.map((id) => ({ path: ['system','modules'], message: 'rules.validation.moduleNeedsConfirm', params: { module: id } }))`. Діє і на вмикання, і на вимикання.
9. `mergeRules(current, patchWithoutConfirm, raw)` → запис.
10. Відповідь — вигляд (Р4).

**Тексти помилок** (`lib/constants/api-errors.ts` → `messages/{uk,en}/errors.json`, вставити одразу після рядка `"systemActionUnknown"`):

| Константа | Ключ | Статус | uk | en |
|---|---|---|---|---|
| `SYSTEM_MODULES_INVALID` | `errors.systemModulesInvalid` | 422 | Недопустимий набір модулів правил | Invalid set of rule modules |
| `SYSTEM_MODULES_IN_BATTLE` | `errors.systemModulesInBattle` | 409 | Модулі правил не можна змінити під час активного бою | Rule modules cannot be changed during an active battle |
| `SYSTEM_MODULE_CONFIRM` | `errors.systemModuleConfirm` | 409 | Модуль змінює розрахунок наявних героїв: підтвердіть зміну | This module changes how existing heroes are calculated: confirm the change |

**Тексти issues** (`messages/{uk,en}/rules.json`, у наявний об'єкт `validation`): `composition.{unknownKey,unknownModule,wrongBase,missingRequires,conflict,duplicateClaim,cycle,sectionCollision}` з параметрами `{module}`, `{detail}` (ICU) і `moduleNeedsConfirm` з `{module}`. Наявні `unknownModule`/`invalidComposition` лишаються (їх читає `RulesetSchema.superRefine`).

**Відповідь 422** (форма — `errorResponse` через `ContentError`): `{ "error": "<текст>", "errorKey": "errors.systemModulesInvalid", "issues": [{ "code": "custom", "path": ["system","modules"], "message": "<текст>", "params": { "module": "morale", "detail": "d20" } }] }`.

### Р4. Вигляд правил (С1)

`CampaignRulesView = Ruleset & { systemLocked?: boolean; composition: Composition }` — `readCampaignRules` і `updateCampaignRules` додають `composition(rules.system)`. Каталог у відповідь **не** кладемо (В1): клієнт викликає `moduleCatalog()` з meta (той самий код), API/AI бачать id addon-ів в описі JSON-схеми `system.modules` (`content_schema(kind: "rules")`, OpenAPI) і склад у `composition`.

### Р5. AI, асистент, OpenAPI (С1)

- `lib/ai/tools/content.ts`: `get_rules` — опис згадує `composition` (активна база й модулі); `update_rules` — «зміна модулів: `system.modules` — повний список id; модуль із `toggle: setup` у кампанії з персонажами вимагає `confirm: true`; під час активного бою — 409».
- `content-operation-preview.ts` (`rules.update`): прибрати `confirm` з тіла перед `mergeRules`; якщо в тілі `system.modules` — `assertValidSystem` (422 в прев'ю, а не «успішне» прев'ю невалідного набору). Перевірки бою/підтвердження — лише у виконанні.
- `lib/server/content/operations.ts` (`rules.update`): `errors: [409, 422]`, у `description` — речення про `system.modules`, `confirm`, 409/422.
- Тести OpenAPI/tool-schema, що фіксують опис або знімок схеми `RulesetPatch`, оновити Edit-ом (знайти: `rg -l "rules.update|RulesetPatch" lib/server/content/__tests__ lib/ai`).

### Р6. Створення без шаблону (С2)

- **Пресети правил.** Новий згенерований корінь `lib/utils/rules/systems/rules-presets.ts`: `RULES_PRESETS: Readonly<Record<string, RulesPreset>>` (ключ — id модуля з meta), шар `systems/${id}/rules/rules-preset.ts`, експорт `${UPPER}_RULES_PRESET`; рядок у `ROOT_SPECS` (`scripts/shared/systems-index.ts`, взірець — `import-specs` Ч11) і в `SYSTEM_ROOTS` ESLint. `RulesPreset = Readonly<Record<string, Readonly<Record<string, unknown>>>>` (сирий частковий JSON правил, лише дані).
  - `systems/d20/rules/rules-preset.ts` — новий `D20_RULES_PRESET`;
  - `systems/wfrp/rules/rules-preset.ts` — додати `WFRP_RULES_PRESET` (простий об'єкт); `WFRP_RULES` (тести) не міняти;
  - `systems/homm/rules/rules-preset.ts` — `HOMM_RULES_PRESET` (доповнити).
  Значення пресетів добирає тест паритету (нижче), а не вигадує виконавець.
- **Контракт пресета** (`lib/__tests__/system-contract.test.ts` або новий `rules-presets-contract.test.ts`): кожен шлях `секція.пункт` пресета є в `rulePaths(ALL_SECTIONS)`; пресет **бази** не задає секцій/пунктів, якими володіє addon (`owner` секції або пункту — addon), пресет `kind: 'preset'` — лише секції addon-ів свого набору. Причина: інакше `dnd5e` + `morale` отримав би `morale.enabled: false` з пресета бази.
- **`initialRules(system, extra?)`** (`lib/utils/rules/initial-rules.ts`, чиста): `meta = metaOf(system.key)` → сирий JSON `{ ...RULES_PRESETS[base], ...(meta.kind === 'preset' ? RULES_PRESETS[meta.module] : {}), ...extra, system: { key, modules: composition(system).modules } }` (глибоке злиття по секціях). **`modules` пишеться завжди явно** — навіть `[]` для `dnd5e` (див. ризик 2).
- **Тест паритету** (`lib/utils/rules/__tests__/initial-rules.test.ts`): `parseRules(initialRules({ key }))` = `parseRules(data/templates/<порожній пакет>/rules.json)` по всіх шляхах секцій композиції, крім `defaultAttacks` (локалізовані назви), `advancement`, `tables`: `dnd5e` ↔ `srd-5.2-empty`, `wfrp` ↔ `grim-d100-empty`, `homm` ↔ `heroes-homm`. Розбіжність = виправити пресет. Ще кейс: `initialRules({ key: 'dnd5e', modules: ['morale'] })` → `sectionsOfSystem` має `morale`, а `morale.enabled` — типове значення секції.
- **Схема** (`lib/schemas/campaigns.ts`): `system: z.strictObject({ key: z.string().min(1), modules: z.array(z.string().regex(/^[a-z0-9]+$/)).max(32).optional() }).optional()` + `superRefine`: `system` разом із `templateId` → issue `path: ['system']`, `message: 'validation.systemWithTemplate'` (ключ у `messages/*/validation.json`, обидві локалі) → 400.
- **Сервер** (`create-campaign.ts`): `createCampaignForUser` при `data.system`: `assertValidSystem(data.system)` (422, ті самі `issues`), далі `campaignData` без бандла пише `rules: initialRules(data.system, { defaultAttacks })`. Без `system` і без шаблону — **як зараз** (`{ defaultAttacks }`, вгадування до Ч13). Маршрут `app/api/campaigns/route.ts` віддає `ContentError` через наявний `handleApiError` (перевірити, що статус і `issues` зберігаються; інакше — явне відображення).
- **Клієнт**: `lib/api/campaigns.ts` `createCampaign({ …, system?: { key: string; modules?: string[] } })`; `useCreateCampaign` — без змін коду (тип). UI створення (`NewCampaignForm`) **не міняється**: екран-майстер — поза E2.

### Р7. UI «Система» (С3)

- Новий хук `lib/hooks/campaigns/useCampaignModules.ts` (`"use client"`, експорт з бареля):
  ```ts
  export function useCampaignModules(campaignId: string): {
      toggles: ModuleToggle[];          // moduleToggles(rules.system) з даних сервера, не з форми
      toggle: (id: string, on: boolean) => Promise<void>;
      isPending: boolean;
  }
  ```
  `toggle`: `next = withModule(server.system, id, on)`; якщо модуль `setup` і `systemLocked` — `useConfirm()` із текстом наслідків **до** запиту, тоді `confirm: true`; якщо сервер усе одно відповів 409 з `errorKey === API_ERRORS.SYSTEM_MODULE_CONFIRM` (гонка: персонаж з'явився) — підтвердження й один повтор. Інші помилки — `useNotify()` з `error.message`. Успіх: `setQueryData(campaignKeys.rules(id), view)`, `invalidateQueries` з предикатом «ключ містить `campaignId` і це не `campaignKeys.rules`» (`refetchType: 'active'`), `router.refresh()`.
- `SystemSection.tsx` отримує `modules: ReturnType<typeof useCampaignModules>` і `dirty: boolean` (або сам викликає хук — на розсуд, але без `fetch`/`lib/api` у компоненті). Під селектом ключа — список addon-ів: `Switch` + назва `gameTerms.module.<id>.name`, підпис `…summary`, позначка «змінює героїв» для `setup`. Пункт вимкнений, коли `!available` (підказка з `reason`: «потрібен {module}», «конфліктує з {module}», «потрібен для {module}» — назви модулів через `gameTerms`), коли форма брудна (підказка «Збережіть або скасуйте зміни правил»), під час запиту. База без сумісних addon-ів (wfrp) — список не рендериться.
- Після перемикання `RulesForm` сам перебудовує вкладки: вони рахуються з `form.data.system`, а `data` = сервер + локальні зміни секцій.
- Гравці: сторінка правил — лише ДМ (гард сторінки), демо бачить JSON без форми, сервер дає 403 на патч. Окремого read-only режиму в `SystemSection` не робимо.
- Тексти — `messages/{uk,en}/rules.json`, новий об'єкт `system.modules` (`title`, `hint`, `setupBadge`, `requires`, `conflicts`, `requiredBy`, `dirtyHint`, `confirmTitle`, `confirmBody`, `confirmAction`). У `confirmBody` — що дані не видаляються, а вимкнення скасовується повторним увімкненням; що вузли дерева, вивчені понад поточний рівень, лишаються (M2 Ч10).

### Р8. Маніфест пакета й `template validate` (С2)

- `TemplateManifest.modules?: readonly string[]`; `TemplateManifestSchema`: `modules: z.array(z.string()).optional()`.
- `scripts/templates/lib/validate.ts`:
  1. `systemIssues({ key: manifest.system, modules: manifest.modules })` → помилка `manifest: modules …`;
  2. `rules.json`: `system.key` = `manifest.system` (є) **і** `system.modules` = `manifest.modules` (обидва відсутні або рівні як відсортовані множини);
  3. кожен `kind` з `manifest.kinds` і з `include[].kinds` активний: `contentKindsOf(system).has(PACK_KIND_CONTENT[kind] ?? kind)`, де `PACK_KIND_CONTENT = { skillTrees: 'skills' }` (`lib/utils/templates/manifest.ts`, хвіст Ч11 «форма `skillTrees`»).
- `scripts/templates/lib/export.ts:259`: `system: { key: manifest.system, ...(manifest.modules && { modules: [...manifest.modules] }) }`; маніфест експорту кампанії з явним `modules` — переносить їх (`export-command.ts`/`pack.ts`, де збирається маніфест; перевірити `rg -n "kinds:" scripts/templates/lib`).
- Тести (`scripts/templates/__tests__/validate.test.ts`): `heroes-homm` без `skilltrees` у `modules` при `kinds: ['skillTrees', …]` → помилка; `srd-5.2` з `modules: ['morale']` і таким самим `rules.json` → без помилок; розбіжність маніфесту й `rules.json` → помилка; `modules: ['zzz']` → помилка. Наявні 5 пакетів — 0 помилок (D14).

### Р9. Онбординг (С3)

- `lib/onboarding/whats-new.ts`: `{ id: '2026-11-13-rule-modules', date: '2026-11-13', audience: 'dm', href: '/help/dm-rule-systems' }` — **першим елементом** масиву (Ч12 вставляє свій запис в інше місце). Ключі `whatsNew.2026-11-13-rule-modules.{title,body}` в обох `messages/*/whatsNew.json` — вставити одразу після першої `{` файлу.
- Help: `lib/onboarding/help/dm.ts` — 10-й елемент `sections` у `dm-rule-systems` (`{ blocks: [{ kind: 'p' }, { kind: 'p' }] }`); `messages/{uk,en}/help.json` → `dm-rule-systems.sections.s9.{heading,b0,b1}`: що таке модулі (база + доповнення, пресети HoMM/D&D 5e), як вмикати в «Системі», обмеження (не під час бою, підтвердження для «Масштабування героя» й «Дерев навичок», дані не зникають). Оновити `summary` статті (згадати модулі).
- Дату `2026-11-13` контролер міняє на дату злиття, якщо вона інша (id + ключі в обох JSON).

### Р10. Тест D16 і тест-кейси плану (С1)

Новий `lib/server/campaigns/__tests__/rules-modules.test.ts` (стан у моку prisma: `campaign.rules` пишеться й читається, лічильники `battleScene`/`character` налаштовуються; прогрів `beforeAll(… await import('@/lib/server/systems/registry') …, 30_000)`):

- **Сценарій плану:** `{ system: { key: 'dnd5e' }, morale: { enabled: true, cap: 4 } }` → PATCH `{ system: { modules: ['morale'] } }` → 200; збережено `system.modules = ['morale']`; `sectionsOfSystem(view.system)` має `morale`; `systemServerOf(view).battle` має `morale-check` (дія бою доступна); `view.composition = { base: 'd20', modules: ['morale'] }`. Активний бій (count 1) + PATCH `{ system: { modules: [] } }` → 409 `errors.systemModulesInBattle`, JSON не змінився. Без бою → 200; `morale` зникла з `sectionsOfSystem`, сирий JSON містить `morale: { enabled: true, cap: 4 }` побайтово. PATCH іншої секції (`outOfCombat`) при вимкненому модулі → `morale` у JSON на місці. Повторне ввімкнення → розібране `morale` ≡ кроку 1.
- **D16 для кожного addon-а** (`moduleCatalog().addons`, параметризовано): `homm` з повним набором → вимкнути `id` (з `confirm: true`, персонажі є) → увімкнути → сирий JSON ≡ початковому, крім `system.modules` (який тепер явний і ≡ набору пресета).
- **422:** `{ key: 'wfrp' }` + `modules: ['morale']` → 422 `errors.systemModulesInvalid`, `issues[].path = ['system','modules']`, коди `wrongBase`/`missingRequires`; `modules: ['zzz']` → 422 `composition.unknownModule`. Конфлікт і подвійний `claims` (`unitstacks` + фікстурний addon з тим самим `claims: ['combat.hitModel.damage']`) — у юніт-тесті `moduleChange`/`systemIssues` на фікстурних `metas` (реальних конфліктних модулів немає; сервер викликає ту саму функцію).
- **Підтвердження:** `homm`, персонажі є, вимкнути `heroscaling` без `confirm` → 409 `errors.systemModuleConfirm`, `issues[0].params.module = 'heroscaling'`; з `confirm: true` → 200; без персонажів → 200 без `confirm`; `morale` (free) → без `confirm`.
- **Гравець:** PATCH `system.modules` → 403. **Ключ + модулі:** зміна `key` без персонажів із `modules` у патчі → зберігаються модулі з патча; без них — `modules` скинуто.
- Юніт (`catalog.test.ts`): `moduleToggles` на фікстурах (`requires` вимикає, `conflicts` вимикає, `requiredBy` блокує вимкнення, інша база — не в списку); `withModule` сортує; `moduleChange.setup`.

## Відхилення від плану

- **В1. Каталог не входить у відповідь `rules.get`.** Причина: `rules.get` — один із найчастіших запитів (5 хв stale, читається на кожній сторінці кампанії), egress — жорстке обмеження. Каталог — статичні дані meta, клієнт отримує їх тією ж функцією `moduleCatalog()`. Для API/AI: id addon-ів в описі JSON-схеми `system.modules`, розгорнутий склад — у `composition`.
- **В2. «Інвалідація кешу композиції» — клієнтська.** Серверні кеші композиції ключуються входом (`key + modules`, сирий JSON) і не застарівають; реально застарівають запити TanStack (списки модульних видів після D15, меню ДМ) і серверні layout-гарди → `invalidateQueries` + `router.refresh()`. Інші відкриті вкладки/учасники побачать зміну через `REFERENCE_STALE_MS` (5 хв) або перезавантаження: Pusher-події для правил немає й не додаємо (поза боєм наслідки лише візуальні).
- **В3. Пресети правил бази.** План згадує лише `rules-preset` пресета; без пресета бази кампанія `dnd5e` без шаблону отримала б типові значення HoMM (класи вимкнені, без рятунків від смерті). Тому пресет мають d20 і wfrp теж, а значення доводить тест паритету з порожніми пакетами.
- **В4. Перемикачі — окрема негайна дія, а не поле форми.** Причина: 409 бою й підтвердження `setup` — це діалог на конкретну дію, а не помилка «Зберегти» разом з десятком секцій; після зміни потрібна інвалідація всієї кампанії. Поки форма має незбережені зміни, перемикачі вимкнені (немає змішаних патчів).
- **В5. `confirm` — верхнє поле патча** (`RulesetPatch.confirm`), а не пункт секції `system`: інакше він потрапив би в збережений JSON через `writeOverRaw`.
- **В6. UI створення кампанії не міняється.** Шов — API + хук (`createCampaign({ system })`), як і в плані («екран-майстер — поза E2»); live-run створює кампанію через `fetch` з консолі.
- **В7. Вхідні хвости читачів `systemUiOf` закрито без змін коду**: усі залишки читають слоти бази (див. таблицю); `PlayerDraftForm` закрито в Ч11.

## Пастки

- **П1 — 400 замість 422.** `mergeRules` проганяє `RulesetSchema.superRefine` з `validateComposition`: якщо не перевірити набір **до** злиття, невалідний набір дасть 400 `INVALID_RULES`, а не 422. Тест 422 це ловить.
- **П2 — ключ стирає модулі.** `mergeRules` і `writeOverRaw` при зміні `key` видаляють `modules` — також ті, що прийшли в тому ж патчі (Р2).
- **П3 — `confirm` у JSON.** Будь-яке поле патча, яке пройшло в `mergeRules`, `writeOverRaw` пише в сирий JSON. `confirm` відкидати до злиття і в сервері, і в прев'ю асистента.
- **П4 — `[]` ≠ відсутність.** `modules: []` — явний «голий» набір; відсутній `modules` — набір пресета. `withModule` завжди повертає явний масив; не «нормалізувати» `[]` в `undefined`.
- **П5 — стан хука vs стан форми.** Перемикачі рахуються з `query.data.system` (сервер), не з `form.data.system` (форма може мати незбережений ключ іншої бази).
- **П6 — цикл імпортів пресетів.** `rules-presets.ts` і `initial-rules.ts` не імпортуються з `schema.ts`/`section-registry.ts`/`defaults.ts` (`wfrp/rules/rules-preset.ts` сам імпортує `RulesetSchema` → цикл). Імпортери `initial-rules` — лише `lib/server/campaigns/**` і тести.
- **П7 — запис поза транзакцією.** `updateCampaignRules` пише `prisma.campaign.update` (не `tx`) — наявна поведінка; нові лічильники (`battleScene`, `character`) брати через `tx`. Переводити запис на `tx` — лише якщо тести не мокають `prisma.campaign.update` (інакше — у звіт).
- **П8 — тести з `DEFAULT_RULES`.** `DEFAULT_RULES.system = { key: 'homm' }` (усі модулі). Тест «голого» `dnd5e` задає `{ system: { key: 'dnd5e' } }` явно.

## Порядок комітів

**С1 — сервер (`task-ch16-1-brief.md`):**
1. `feat(ch16): module toggle helpers and one composition check` — Р1 + тести.
2. `feat(ch16): rules patch accepts system.modules with composition, battle and confirm gates` — Р2, Р3, Р4, тексти помилок/issues, тести Р10.
3. `feat(ch16): assistant and OpenAPI describe rule modules` — Р5.

**С2 — створення й пакети (`task-ch16-2-brief.md`):**
1. `feat(ch16): rules presets of bases and presets from a generated root` — корінь, генератор, ESLint, пресети d20/wfrp/homm, контракт, `systems:index`.
2. `feat(ch16): initial rules of a composition` — `initialRules` + тест паритету.
3. `feat(ch16): create a campaign without a template from a system selection` — схема, сервер, клієнтський тип, тести.
4. `feat(ch16): pack manifests carry modules; template validate checks kinds against the composition` — Р8.

**С3 — UI й онбординг (`task-ch16-3-brief.md`):**
1. `feat(ch16): rule module switches in the System section` — хук, `SystemSection`, `RulesForm`, тексти, тести.
2. `docs(ch16): what's new and help for rule modules` — Р9.

## Після С3 — контролер (один раз)

- `tsc`, повний `test:run` (під локом важких процесів), eslint по зачеплених теках окремими запусками, контрактні (`system-contract`, `systems-index`, `system-literals`, `system-imports`, `client-entry-imports`, `lib/onboarding/__tests__/registry.test.ts`), `pnpm systems:index` ідемпотентний.
- `pnpm template validate` ×5 = 0 помилок (без БД).
- Sweep `srd-5.2+morale` (і решта профілів) на `prodcopy_ch16` за «так» власника: `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy_ch16 pnpm battle-sweep --out .superpowers/sdd/e2/part16`.
- Live-run (Sonnet-субагент, порт 3200, ДМ, desktop і 375 px, JS/текстові перевірки): створити кампанію `fetch('/api/campaigns', { method: 'POST', body: JSON.stringify({ name, system: { key: 'dnd5e', modules: ['morale'] } }) })` → правила: вкладка «Мораль» є, перемикач «Мораль» увімкнений; вимкнути → вкладка зникла; увімкнути → налаштування ті самі; `homm` з персонажем: вимкнення «Масштабування героя» питає підтвердження; під час активного бою — повідомлення 409; «Дерева навичок» вимкнено → меню ДМ без «Навичок/Дерев» без перезавантаження сторінки. Тестові кампанії видалити.
- `/simplify` (1 агент), Opus-ревʼю, docs: `rule-systems.md` (шов: патч, гейти, `initialRules`, `RULES_PRESETS`, `composition` у вигляді), `content-api.md`/`ai.md` (опис `update_rules`), `onboarding.md` не міняється, `STATUS.md`, розділ «Ч16» плану з відхиленнями.

## Доповнення до Ч13 (runbook)

- Бекфіл `modules` **пропускає рядки, де `system.modules` уже є** (явний вибір: створення Ч16, перемикачі Ч16, репетиції на prodcopy). Інакше розібрані дефолти (`morale.enabled = true`) дописали б мораль новій `dnd5e`-кампанії, створеній через `initialRules`.
- Деплой Ч16 — не раніше за Ч13 (як і Ч3–Ч11). Після нього користувач сам пише `modules`: поріг відкату коду — Ч1 (D3), як і після бекфілу.

## Ризики

1. **Гонка старту бою з перемиканням.** Гейт 409 читає `battleScene.count` усередині блокування рядка кампанії, а старт бою цей лок не бере: бій, стартований у ту ж мить, отримає новий набір. Наслідок — бій із новими правилами з першого ходу, даних не псує. Прийнятно, зафіксувати в `rule-systems.md`.
2. **Ч13 і явні `modules`.** Без пункту runbook вище бекфіл зіпсує нові кампанії (див. доповнення).
3. **Паритет пресетів зачіпає поведінку створення.** Порожні пакети — еталон; якщо паритет вимагає значення секції, якою володіє addon (наприклад `actions.retaliation` у `srd-5.2-empty`), — пресет бази його не задає, а тест виключає цей шлях (зафіксувати в звіті), бо модуль у голому `dnd5e` неактивний.
4. **Сплячі вузли дерева (M2 Ч10).** Після повторного вмикання `skilltrees` персонаж може мати вузли понад рівень. Нормалізацію не робимо; текст підтвердження про це каже. Хвіст → Ч17.
5. **Злиття з Ч12 у `messages/*`.** Ч16 пише в `errors.json` (після `systemActionUnknown`), `rules.json` (`validation`, `system.modules`), `validation.json`, `whatsNew.json` (на початку), `help.json` (`dm-rule-systems.s9`), `whats-new.ts` (перший елемент). Ч12 попереджено обрати інші місця вставки; конфлікт, якщо буде, — текстовий, розв'язується при merge.
6. **Опис схеми з id addon-ів** будується з `moduleCatalog()` під час завантаження модуля: id модулів не є токенами систем (ratchet `tokens` = ключі баз), тож літерали не ростуть; перевірити `system-literals` у контролерському прогоні.

## Питання власнику

1. **В1** — каталог не в `rules.get` (egress), клієнт бере `moduleCatalog()`, API/AI — опис схеми + `composition`. Прийняти?
2. **В3** — пресети правил і для баз d20/wfrp (паритет із порожніми пакетами), а не лише для `homm`. Прийняти?
3. **В4** — перемикачі модулів зберігаються одразу (окремо від кнопки «Зберегти»), вимкнені при незбережених змінах форми. Прийняти?
4. **В6** — UI створення кампанії без змін (лише API/хук). Прийняти?
5. Підготовлений (не активний) бій не блокує зміну модулів. Прийняти?
