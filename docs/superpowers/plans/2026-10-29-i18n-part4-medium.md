# i18n частина 4: середні домени — план

> **Для виконавців:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Задача 1 — першою, задача 15 — останньою; доменні задачі — хвилями, не більше трьох одночасно (CPU). Одна задача ≈ одна сесія Sonnet (100–150k контексту). Кроки — чекбокси.

**Goal:** campaigns, characters, character-profile, spells, abilities, units, rules, skill-tree — на `next-intl` (`uk` слово в слово, повний `en`), каталоги під храповиком, хвости частини 3 закриті.

**Architecture:** 13 нових ns (`campaigns`, `dashboard`, `characters`, `characterProfile`, `inventory`, `rest`, `spells`, `spellEditor`, `units`, `abilities`, `abilityRegistry`, `rules`, `skillTree` — див. таблицю spec), усі в `app/campaigns/layout.tsx` через `CAMPAIGN_NAMESPACES`; спільні підписи — у `common`. Реєстри-підписи, які читають імпорт/бій/аркуш, лишаються; UI рендерить ключі за id. Серверні тексти, що кешуються/рахуються (лінії аркуша, зведення довідника, причини прогресії), — ключ + `params`, переклад на клієнті через `translateIssue`.

**Tech Stack:** next-intl 4, Zod 4, Vitest 4, ESLint 9.

**Spec:** `docs/superpowers/specs/2026-10-29-i18n-part4-design.md` (рішення 1–10 — джерело правди). Правила: `docs/architecture/i18n.md`; зразок виконання — `docs/archive/superpowers/plans/2026-10-28-i18n-part3-crud.md`.

## Global Constraints

- Лише worktree `/Users/silentfox/Work/dnd-tracker-i18n4`, гілка `feat/i18n-part4`; основну папку не чіпати; на prod нічого не запускати; не пушити. Перед кожним git-кроком `git branch --show-current`. `node_modules` уже встановлено; задача 1 робить `pnpm exec prisma generate`.
- Ключі англійські, camelCase, dot-нотація; масивів у JSON немає. `uk` = поточний текст слово в слово; `en` — повний переклад, ті самі ICU-плейсхолдери; плюралі `uk` `one/few/many/other`, `en` `one/other`.
- Структура ключів ns: `page.*`, `card.*`, `form.*`, `create.*`, `list.*` (тексти `useLibraryList`/confirm), `validation.*` (Zod), реєстрові піддерева за id (`goals.<kind>`), далі — за компонентом.
- **Спільні файли редагує лише задача 1** (і задача 15 для свого скоупу): `lib/i18n/config.ts`, `lib/i18n/scopes.ts`, `global.d.ts`, `app/campaigns/layout.tsx`, `i18n-migrated.json`, `lib/i18n/test/*`, `messages/*/{common,errors}.json`, `lib/constants/api-errors.ts`, `lib/i18n/__tests__/label-keys.test.ts`, мігровані файли ч.1–3 (`components/{common,layout,ui,hud,choices,…}`). Доменна задача правит лише свої файли зі списку + **один** ns (`messages/{uk,en}/<ns>.json`) + свій `lib/i18n/__tests__/label-keys-<ns>.test.ts`. Потрібне щось у спільному файлі — записати у звіт задачі, контролер вирішує (нових ключів у `common` після задачі 1 не додавати — доменне кладеться в свій ns).
- Читати чужий ns за повним ключем можна (`useTranslations()` + `"spells.castTimes.action"`), правити — ні. Залежності: 9 після 8, 12 після 11.
- Серверні `page.tsx`: `getTranslator(await getRequestLocale(), "<ns>")`. Клієнт: `useTranslations("<ns>")`; динамічні ключі — `useTranslator("<ns>")`; кілька ns — кореневий `useTranslations()`.
- Тексти, які сервер віддає ключем (spec, рішення 4): показ — `translateIssue(t, { message, params })` з кореневим `t`.
- Тести перевіряють ключі (мок `t("a")` → `"<ns>.a"`, з параметрами — ключ + JSON). Під час роботи — `pnpm test:related <файли>` / `pnpm test:run <файл>`; повні `pnpm test:run`/`pnpm lint` — лише контролер.
- Перевірка задачі: `pnpm exec eslint <свої шляхи>` чисто; `pnpm exec tsc --noEmit 2>&1 | grep -E "<свої шляхи>"` порожньо; `rg -n "\p{Cyrillic}" <свої шляхи> -g '!**/__tests__/**'` → лише коментарі й задокументовані `eslint-disable`; `pnpm test:run lib/i18n` (паритет, свій `label-keys-<ns>`).
- Інвентаризація: `python3 /private/tmp/claude-501/-Users-silentfox-Work-dnd-tracker/c7ed5f4e-0f67-4dae-9e87-295638148bbf/scratchpad/cyr.py <dir…>` (з кореня worktree) — кириличні символи поза коментарями в немігрованих файлах; `pnpm i18n:extract <dir>` — чернетка JSON.
- `eslint-disable-next-line no-restricted-syntax -- <причина>` — лише для даних-конвенцій (spec, рішення 3). Повідомлення розробника (`throw new Error` про відсутній контекст) — англійською.
- Мінімум коментарів; ідентифікатори англійські. Коміт — `git add <свої шляхи>` (не `-A`), закінчувати `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Reuse

| Існує | Як використовується |
|---|---|
| `useTranslator`, `translateIssue`, `getTranslator`, `getRequestLocale` (`lib/i18n`) | динамічні ключі; ключ-або-як-є для серверних текстів і Zod-issue; серверні сторінки |
| `common.actions/form/confirm/search/states/deleteAll/dndSkills/creatureTypes/monster/abbreviations` | кнопки, форми, пошук, стани — не дублювати |
| ns ч.3: `classes.casters`, `feats.types`, `skills.mainSkills.roles`, `choices.*`, `artifacts.rarity/slots` | підписи переліків у аркуші, чернетці, довіднику |
| `makeT`, `renderWithIntl`, `parity.test.ts`, `api-errors-coverage.test.ts`, `label-keys.test.ts` | тести на ключі, `en`-рендер, паритет, нові `API_ERRORS`, реєстри |
| `useLibraryList`, `useCrudMutation`, `useConfirm`, `useNotify` (`lib/hooks/common`) | приймають перекладені `texts` |
| `apiErrorJson`/`ContentError`/`errorResponse` | нові `API_ERRORS` перекладаються на межі без змін ядра |
| `useFormatter` (next-intl) | дати |

**Нове:** 13 ns, `CAMPAIGN_NAMESPACES` (`lib/i18n/scopes.ts`), `expectLabelKeys` (`lib/i18n/test/label-keys.ts`), `scope-size.test.ts`, `NameOnlyCreateDialog`, ключі `common.{abilities,stats,spellLevels,ungrouped,damageTypes,monster.senses,monster.sizes,weaponTraits.traits,dmSections,tabs}`, 8 `API_ERRORS`, `timeZone` у request-config.

## Порядок і паралельність

| Хвиля | Задачі | Умова |
|---|---|---|
| A | **1** Каркас | — |
| B | **2** campaigns ‖ **8** spells ‖ **11** abilities | після 1 |
| C | **3** dashboard ‖ **9** spellEditor ‖ **12** abilityRegistry | 9 після 8, 12 після 11 |
| D | **4** characters ‖ **5** characterProfile ‖ **14** skillTree | після 1 |
| E | **6** inventory ‖ **7** rest ‖ **10** units | після 1 |
| F | **13** rules | після 1 |
| G | **15** Замикання | після всіх |
| H | Після задач (контролер) | усе |

Хвилі B–F між собою незалежні (крім 9→8, 12→11) — контролер може переставляти за завантаженням, тримаючи ≤ 3 одночасно. Файли задач не перетинаються (межі нижче — за каталогами/файлами).

---

### Task 1: Каркас (≈ 35 файлів, спільні)

**Files:**
- Modify: `lib/i18n/config.ts` (`NAMESPACES` += 13), `global.d.ts` (13 імпортів типів), `app/campaigns/layout.tsx` (→ `CAMPAIGN_NAMESPACES`), `lib/i18n/request.ts` (`timeZone: "Europe/Kyiv"`), `lib/i18n/test/mock-t.ts` (`rich`, `markup`), `lib/i18n/__tests__/label-keys.test.ts` (на хелпер), `i18n-migrated.json`, `messages/{uk,en}/{common,errors}.json`, `lib/constants/api-errors.ts`, частина-3 ns `messages/{uk,en}/{races,feats,backgrounds,artifacts,skills,classes}.json` (лише прибрати дублі вкладок) і їхні споживачі (`components/{races,feats,backgrounds,artifacts,artifact-sets,skills,classes}/**` — лише ключі вкладок), `components/ui/confirm-dialog.tsx`, `lib/hooks/common/useLibraryList.ts` (споживачі `common.confirm.{cancel,delete}`), `components/common/DeleteAllButton.tsx` + тест, 6 викликачів `DeleteAllButton` (`app/campaigns/[id]/dm/{characters,units,skills,spells,battles}/page-client.tsx`, `components/artifacts/DeleteAllArtifactsButton.tsx` — лише проп), `components/feats/CreateFeatDialog.tsx`, `components/backgrounds/CreateBackgroundDialog.tsx`, `components/classes/CreateClassDialog.tsx` (якщо вкладається), `components/common/{MonsterStatblock,WeaponTraitsField,AbilityScoresGrid,AbbreviationsInfoDialog}.tsx`, `components/layout/{Header,Breadcrumbs}.tsx`, `components/choices/ChoicePicker.tsx` (`spellLevelName` → `common.spellLevels`), `lib/constants/campaigns.ts` (`DM_SECTIONS` без `label/title/subtitle`; `DM_SECTION_LABELS` → видалити або ключі)
- Create: `lib/i18n/scopes.ts`, `lib/i18n/test/label-keys.ts`, `lib/i18n/__tests__/scope-size.test.ts`, `components/common/NameOnlyCreateDialog.tsx` (+ тест), `messages/{uk,en}/{campaigns,dashboard,characters,characterProfile,inventory,rest,spells,spellEditor,units,abilities,abilityRegistry,rules,skillTree}.json` (`{}`)

**Сигнатури:**
```ts
// lib/i18n/scopes.ts
export const CAMPAIGN_NAMESPACES = ["common","validation","onboarding", /* ч.3 */ …, /* ч.4 */ …] as const satisfies readonly Namespace[];
// lib/i18n/test/label-keys.ts
export function expectLabelKeys(ns: Namespace, prefix: string, values: readonly string[]): void; // реєструє it() для кожної мови
// components/common/NameOnlyCreateDialog.tsx
export function NameOnlyCreateDialog(props: { open: boolean; onOpenChange(open: boolean): void; formId: string; texts: { title: string; description: string; name: string; namePlaceholder: string; submit: string }; onSubmit(name: string): void }): JSX.Element;
// components/common/DeleteAllButton.tsx — `nouns: [s,s,s]` → `noun: string`; common.deleteAll.title = «Видалити всі {noun}?»
```

**Зміст `common` (`uk` слово в слово з констант, `en` повний):** `abilities.<key>.{label,short}` (з `ABILITY_SCORES`/скорочень `lib/constants/abilities.ts`), `stats.<key>` (решта `ABILITY_SCORES`: hitPoints, speed, armorClass, initiative, spellSaveDC, spellAttackBonus, spellSlots, moral), `spellLevels.{0..9}` (`spellLevelName(n)`), `ungrouped.<key>` (`UNGROUPED_LABELS`), `damageTypes.<type>` (`DAMAGE_ELEMENT_LABELS`), `monster.senses.<v>`/`monster.sizes.<v>`, `weaponTraits.traits.<t>`, `dmSections.<path>` (`DM_SECTIONS[].label`), `tabs.{basic,abilities,choices}`. Видалити `confirm.{cancel,delete}` (споживачі → `actions.*`).

**`errors.json` + `API_ERRORS`:** `ITEM_PARAMETER_REQUIRED` («Оберіть параметр предмета»), `ITEM_PARAMETER_INVALID` («Недозволений параметр предмета»), `ITEM_SPELL_REQUIRED` («Оберіть заклинання предмета»), `ITEM_SPELL_INVALID` («Недозволене заклинання предмета»), `CHARACTER_TOKEN_INVALID` («Некоректний жетон»), `CHARACTER_GOALS_INVALID` («Некоректні цілі»), `CHARACTER_NOTES_INVALID` («Некоректні нотатки»), `CHARACTER_CONTROLLER_INVALID` (повний текст з `lib/server/characters/operations/create.ts:24`). Код серверу переводять задачі 4–6.

**`dashboard.sections.<path>.{title,subtitle}`** — задача 1 переносить тексти `DM_SECTIONS` (щоб константу можна було очистити одразу), решту `dashboard.*` наповнює задача 3.

**`i18n-migrated.json` (+=; кожен glob окремим рядком, `*` замість `[id]`):**
```
components/{campaigns,characters,character-profile,spells,units,abilities,rules,skill-tree}/**
app/campaigns/page.tsx, app/campaigns/new/**, app/campaigns/*/page.tsx, app/campaigns/*/info/**, app/campaigns/*/character/**
app/campaigns/*/dm/{characters,npc-heroes,spells,spell-groups,units,rules,skill-trees}/**, app/campaigns/*/dm/print/spells/**
lib/hooks/{abilities,campaigns,characters,spells,units}/**, lib/hooks/skills/** (замість 8 поштучних рядків ч.3)
lib/utils/{campaigns,rules,skills,spells,units}/**
lib/utils/characters/{sheet,classes,choices,resources}/**, lib/utils/characters/hero-hp.ts
lib/utils/abilities/editor.ts, lib/utils/abilities/class-columns.ts, lib/utils/abilities/schema/**
lib/schemas/{spells,units,out-of-combat,list-spells-query}.ts
lib/server/characters/operations/**
lib/constants/{campaigns,campaign-dashboard,source-sync}.ts
```
(`lib/utils/characters/classes/columns.ts`, `choices/columns.ts` уже є — дубль glob-а не шкодить, але прибрати поштучні рядки, якщо покриті.) Перевірка: `pnpm exec eslint "app/campaigns/[id]/dm/units/page-client.tsx"` дає помилки храповика.

- [x] **Step 1:** `pnpm exec prisma generate`. `rg` у `app/` поза `app/campaigns` на імпорти компонентів скоупу (очікується порожньо; інакше — у звіт). Порожні ns, `NAMESPACES`, `global.d.ts`, `scopes.ts`, layout.
- [x] **Step 2: Failing tests** — `scope-size.test.ts` (gzip `JSON.stringify(await loadMessages(locale, CAMPAIGN_NAMESPACES))` < 100 KB, лог розміру); `label-keys.test.ts` на `expectLabelKeys` + нові записи `common.abilities` (`ABILITY_KEYS`), `common.spellLevels` (0..9), `common.ungrouped`, `common.damageTypes`, `common.monster.senses/sizes`, `common.weaponTraits.traits` (`WEAPON_TRAITS`), `common.dmSections` (`DM_SECTIONS.map(s => s.path)`) → FAIL → наповнити → PASS.
- [x] **Step 3:** `makeT.rich/markup` + тест у `test-helpers.test.tsx`; `DeleteAllButton` `noun` + 6 викликачів (`t("deleteAll.noun")` у мігрованих; літерал у немігрованих: «персонажі», «юніти», «заклинання», «битви» — їх перекладуть задачі 4, 10, 8; `battles` — ч.6); `NameOnlyCreateDialog` + переведення feat/background (/class) діалогів, їхні тести зелені.
- [x] **Step 4:** дублі вкладок → `common.tabs.*` (JSON ч.3 + споживачі), `common.confirm.{cancel,delete}` → `actions.*`; `MonsterStatblock`/`WeaponTraitsField`/`AbilityScoresGrid`/`AbbreviationsInfoDialog`/`Header`/`Breadcrumbs`/`ChoicePicker` → ключі `common.*`; `lib/constants/campaigns.ts` без підписів.
- [x] **Step 5:** `API_ERRORS` + `errors.json`; `timeZone` у `request.ts` (перевірити, що `LocaleScope`-провайдер його успадковує — тест `locale-providers`). `pnpm test:run lib/i18n lib/constants/__tests__/api-errors-coverage.test.ts components/common components/layout` PASS; `pnpm test:related` на змінених компонентах ч.1–3.
- [x] **Step 6:** `i18n-migrated.json`; `pnpm exec tsc --noEmit` чисто (порожні ns ще ніхто не читає). Записати розмір зі `scope-size` у звіт.
- [x] **Step 7: Commit** `feat(i18n): part 4 scaffold — namespaces, shared labels, ratchet globs, tails of part 3`.

### Task 2: campaigns (≈ 20 файлів)

**Files:** `components/campaigns/{NewCampaignForm,WatchShowButton}.tsx`, `components/campaigns/{join,settings,members,templates}/**` + `__tests__`; `app/campaigns/page.tsx`, `app/campaigns/new/**`; `lib/hooks/campaigns/**` крім `useRulesForm` (13) і `useInfoReferenceFilters` (3); `lib/constants/source-sync.ts`, `lib/utils/campaigns/source-sync.ts` + тести; `messages/{uk,en}/campaigns.json`; `lib/i18n/__tests__/label-keys-campaigns.test.ts`.

**Рішення:**
- `source-sync.ts`: підписи категорій/станів диффу → id; `SourceSyncDialog` рендерить `campaigns.sourceSync.<group>.<id>`; назви механік правил у диффі — `rules.mechanics.<key>.label` (ключі задача 13; до того — `t.has`-fallback через `translateIssue`). Дата «остання синхронізація» → `useFormatter().dateTime`.
- `CampaignSettingsDialog`: статуси (`CampaignStatus`) → `campaigns.status.<v>`; ролі учасників → `campaigns.roles.<role>`.
- Плюралі у списку кампаній/учасників → ICU.

- [ ] **Step 1:** extract → тести на ключі (9 `__tests__` каталогу) → FAIL. `label-keys-campaigns`: статуси, ролі, id груп `source-sync`.
- [ ] **Step 2:** реалізація + `en`. **Step 3:** `renderWithIntl` `en` — `NewCampaignForm` (ns `common`,`campaigns`). **Step 4:** перевірки. **Step 5: Commit** `feat(i18n): campaigns list, settings and templates on next-intl`.

### Task 3: dashboard + довідник (≈ 18 файлів)

**Files:** `components/campaigns/{dashboard,info}/**` + `__tests__`; `app/campaigns/[id]/page.tsx`, `app/campaigns/[id]/info/**`; `lib/constants/campaign-dashboard.ts`; `lib/utils/campaigns/info-reference.ts` + тест; `lib/cache/info-reference.ts` (лише тип результату); `lib/hooks/campaigns/useInfoReferenceFilters.ts`; `messages/{uk,en}/dashboard.json`; `label-keys-dashboard.test.ts`.

**Рішення:**
- `campaign-dashboard.ts`: `DASHBOARD_GROUP_TITLE` → `dashboard.groups.<key>`; секції — без `title/subtitle/keywords`, компонент бере `dashboard.sections.<key>.{title,subtitle,keywords}` (keywords — рядок через кому, `split(",")` у хуку пошуку; `uk` — з поточних масивів).
- `info-reference.ts`: `summary: string[]` → `summary: Array<{ key: string; params?: ErrorParams }>`; ключі `dashboard.reference.summary.{hitDie,savingThrows,armor,weapons,…}`. ICU не перекладає ключі в параметрах, тому `params` несе id (`savingThrows: "strength,dexterity"`), а картка будує текст сама (`ClassReferenceCard`: `t("reference.summary.savingThrows", { list: ids.map(k => tc(\`abilities.${k}.label\`)).join(", ") })`). Кеш `unstable_cache` лишається мовно-нейтральним. `abilitySummary` (реєстр, ч.6) — показ як є.
- `ReferenceSearchBar` фільтри/чипи → ключі; плюралі → ICU.

- [ ] **Step 1:** extract → тести на ключі; тест `info-reference`: зведення класу — ключі + id-параметри → FAIL. **Step 2:** реалізація + `en`. **Step 3:** `renderWithIntl` `en` — `DashboardGroups` або `ClassReferenceCard`. **Step 4:** перевірки. **Step 5: Commit** `feat(i18n): campaign dashboard and reference on next-intl`.

### Task 4: characters (≈ 30 файлів)

**Files:** `components/characters/**` крім `rest/` (7) і `artifacts/` (6) + `__tests__`; `app/campaigns/[id]/dm/{characters,npc-heroes}/**`, `app/campaigns/[id]/character/{new,edit,draft}/**`, `app/campaigns/[id]/character/page.tsx`; `lib/hooks/characters/{useCharacterForm,useDmCharacterEditor,useDmCharactersPage,usePlayerDraftForm,useReviewCharacter}.ts` + тести; `lib/server/characters/operations/create.ts` (`API_ERRORS.CHARACTER_CONTROLLER_INVALID`); `messages/{uk,en}/characters.json`; `label-keys-characters.test.ts`.

**Рішення:**
- `CLASS_CASTER_LABELS` (`CharacterClassesField`) → `classes.casters.*`; `DND_SKILL_META[].label` (`CharacterSkillsSection`) → `common.dndSkills.*`; характеристики → `common.abilities.*`; `XP_DIFFICULTY_LABELS` (`DmCharacterCard`) → `characters.xpDifficulty.<v>`; архетипи героя (`hero-archetypes.ts`, показ у `CharacterBasicInfo`/чернетці) → `characters.archetypes.<id>.{name,…}` (константа лишається для генератора/рушія).
- `DeleteAllButton noun` у `dm/characters` → `t("list.deleteAllNoun")`.
- Генератор (`lib/utils/characters/generate/**`) — не чіпати; підписи кнопок «Згенерувати» — ключі.

- [ ] **Step 1:** extract → тести на ключі (8 + 5 хуків) → FAIL; `label-keys-characters`: `XP_DIFFICULTIES`, id архетипів. **Step 2:** реалізація + `en`. **Step 3:** `renderWithIntl` `en` — `NewCharacterForm`. **Step 4:** перевірки. **Step 5: Commit** `feat(i18n): character editor, player drafts and review on next-intl`.

### Task 5: characterProfile (≈ 34 файли)

**Files:** `components/character-profile/*.tsx` (верхній рівень: усі, крім `TransferArtifactDialog`) + `__tests__` відповідні; `lib/hooks/characters/{useCharacterChoices,useCharacterGoals,useCharacterNotes,useCharacterTokens,useClassLevelUp}.ts` + тести; `lib/server/characters/operations/{goals,notes,tokens-create}.ts` (`API_ERRORS.CHARACTER_*_INVALID`); `lib/utils/characters/{sheet,classes,choices}/**` (крім уже мігрованих `columns.ts`), `lib/utils/characters/hero-hp.ts` + тести; `lib/server/characters/core/sheet-handler.ts` лише якщо тип ліній змінюється; `messages/{uk,en}/characterProfile.json`; `label-keys-characterProfile.test.ts`.

**Рішення:**
- `SheetLine.label` (`sheet/lines.ts`, `classes/armor-class.ts`) → ключ `characterProfile.sheet.lines.<id>` + `params` (`{ dice }`, `{ cap }`); `label` з джерел-контенту (назви вмінь/предметів) лишається текстом — показ `translateIssue(t, { message: line.label, params: line.params })`. `describeFeatPicks` (`choices/describe.ts`), `selections.ts`, `class-choices.ts` → ключі + `params` (`{ name }`); `progression.ts` («Підклас») → `classes.progression.subclass` ключем.
- `GOAL_KIND_LABEL` → `characterProfile.goals.<kind>`; `FEAT_TYPE_LABELS` (`FeatsBlock`) → `feats.types.*`; `DND_SKILL_META` (`CombatTab`, `SkillsTab`) → `common.dndSkills.*`; `TokenList` дата → `useFormatter`.
- `CharacterProfile`/`ProfileContext` — `throw new Error(...)` англійською.

- [ ] **Step 1:** extract → тести на ключі (≈ 14 тестів верхнього рівня + utils `sheet`/`choices`) → FAIL; тест: `buildSheet` віддає `label` = ключ + `params`, `translateIssue` з реальним `uk`-JSON → «Спритність (межа 2)» слово в слово. **Step 2:** реалізація + `en`. **Step 3:** `renderWithIntl` `en` — `ProfileHero` або `GoalList`. **Step 4:** перевірки. **Step 5: Commit** `feat(i18n): character profile on next-intl`.

### Task 6: inventory (≈ 20 файлів)

**Files:** `components/character-profile/{inventory,stash}/**`, `components/character-profile/TransferArtifactDialog.tsx`, `components/characters/artifacts/**` + `__tests__`; `lib/hooks/characters/{useInventory,useEquipArtifact,useGrantArtifactForm}.ts` + тести; `lib/server/characters/operations/stash-update.ts` (мапа помилок → `API_ERRORS.ITEM_*`); `messages/{uk,en}/inventory.json`; `label-keys-inventory.test.ts`.

**Рішення:** `COIN_LABEL` → `inventory.coins.<c>`; `stash/describe-log.ts` (опис записів логу інвентаря з даних) → ключі + `params`; дати `InventoryLogPanel` → `useFormatter`; рідкість/слоти — `artifacts.rarity/slots`.

- [ ] **Step 1–5** як у задачі 2; `en`-тест — `MoneyDialog` (ns `common`,`inventory`). **Commit** `feat(i18n): inventory and stash on next-intl`.

### Task 7: rest (≈ 18 файлів)

**Files:** `components/character-profile/rest/**`, `components/characters/rest/**` + `__tests__`; `lib/hooks/characters/{useArcaneRecovery,useOutOfCombat}.ts` + тести; `lib/utils/characters/resources/**` (`describe-log.ts`, `sheet-roll.ts`, `battle.ts`) + тести; `lib/schemas/out-of-combat.ts` (`rest.validation.{xpZero,emptyPatch}`); `messages/{uk,en}/rest.json`.

**Рішення:** `describeCharacterLog` → `{ key, params }` (`rest.log.<kind>`; `MODE_NOTE` → `rest.log.mode.<m>`; емодзі лишаються в ключі); `d.label` з БД — як є. `sheet-roll.ts` пише `label` у `character_log.data` (дані) — текст мови автора через параметр, не ключ (як «Новий вибір» ч.3). Дата/час `CharacterLogTab` → `useFormatter`; «Система» → ключ.

- [ ] **Step 1–5** як у задачі 2; тест `describeCharacterLog` на ключі; `en`-тест — `RestDialog`. **Commit** `feat(i18n): rest, resources and character log on next-intl`.

### Task 8: spells (≈ 22 файли)

**Files:** `components/spells/**` крім `form/` (7) + `__tests__`; `app/campaigns/[id]/dm/{spells/page.tsx,spells/page-client.tsx,spell-groups/**}`, `app/campaigns/[id]/dm/print/spells/**`; `lib/hooks/spells/useSpellGroupActions.ts` + тести; `lib/utils/spells/{group-by-school,group-by-level}.ts`; `lib/constants/spells.ts` (лише `eslint-disable` на конвенції `spellLevelName`/`levelFromName`); `lib/schemas/{spells,list-spells-query}.ts` (`.describe` → англійською); `messages/{uk,en}/spells.json`; `label-keys-spells.test.ts`.

**Рішення:** `SPELL_COST_LABELS`, `SPELL_TARGETING_LABELS`, `TEMPLATE_SHAPE_LABELS`, `SPELL_SAVE_ON_SUCCESS_LABELS` лишаються (бій/лог) → UI `spells.{costs,targeting,shapes,saveOnSuccess}.<v>`; рівні — `common.spellLevels.*`; `ROMAN_NUMERALS` — нейтральні. `CreateSpellGroupDialog` → `NameOnlyCreateDialog`, якщо має лише назву. `DeleteAllButton noun` → ключ.

- [ ] **Step 1–5** як у задачі 2; `en`-тест — `SpellCard`. **Commit** `feat(i18n): spells list, book and groups on next-intl`.

### Task 9: spellEditor (≈ 16 файлів; після 8)

**Files:** `components/spells/form/**` + `__tests__`; `app/campaigns/[id]/dm/spells/{new,[spellId]}/**`; `lib/hooks/spells/useUpdateSpellAppearance.ts` (+ інші хуки форми в `lib/hooks/spells`, крім `useSpellGroupActions`); `lib/utils/spells/model/**` + тести; `messages/{uk,en}/spellEditor.json`.

**Рішення:** модульні масиви полів (`SpellFormPowerFields`, `SpellFormEffects`) → `labelKey`; переліки — ключі `spells.*` (ns задачі 8, читати повним ключем). `model/schema.ts` (клієнтська Zod) → ключі `spellEditor.validation.*`; показ issue — `translateIssue(useTranslator(), issue)`; вбудовані Zod-повідомлення клієнта поки з `client-locale` (задача 15). `model/labels.ts`, `summary.ts`, `execution.ts`: якщо читає бій/сервер — константа лишається, UI — ключі; інакше → ключі.

- [ ] **Step 1–5** як у задачі 2; тест `model/schema`: issue — ключ; `en`-тест — `SpellFormBasicFields`. **Commit** `feat(i18n): spell editor on next-intl`.

### Task 10: units (≈ 24 файли)

**Files:** `components/units/**` + `__tests__`; `app/campaigns/[id]/dm/units/**`; `lib/hooks/units/**` + тести; `lib/utils/units/**` (`unit-parsing.ts`, `monster.ts`) + тести; `lib/schemas/units.ts` (+ тести схеми); `messages/{uk,en}/units.json`; `label-keys-units.test.ts`.

**Рішення:** `units.ts` Zod: `refine`/`addIssue` → `units.validation.*` (`avatarUrl`, `challengeRating`, `rechargePerBattle`, …), 14 `.describe` → англійською. Сенси/розміри — `common.monster.*`; типи шкоди (`UnitAttack`, `UnitImmunities`) — `common.damageTypes.*`; характеристики — `common.abilities.*`. `unit-parsing.ts` (помилки розбору статблоку, бачить DM) → ключі + `params`. `DeleteAllButton noun` → ключ. Сортування `localeCompare(…, "uk")` — без змін.

- [ ] **Step 1–5** як у задачі 2; `en`-тест — `UnitCard`. **Commit** `feat(i18n): units editor on next-intl`.

### Task 11: abilities (≈ 22 файли)

**Files:** `components/abilities/**` + `__tests__` (8); `lib/hooks/abilities/**`; `lib/utils/abilities/{editor,class-columns}.ts`, `lib/utils/abilities/schema/**` + тести; `messages/{uk,en}/abilities.json`.

**Рішення:**
- `save-label.ts`: `ABILITY_LABELS`/`ABILITY_*_ERRORS` → ключі `abilities.save.*`; `abilitySaveError(err, fallback)` — `fallback` уже перекладений; `withAbilityErrors` віддає ключі.
- `columnRefIssues` → `{ path, message: "abilities.validation.columnRef…", params }`; споживачі (`lib/schemas/classes.ts`) пересилають `params` (як ч.3).
- `schema/ability.ts` issues (`Пасивка допускає лише …`, `${stat} не діє через зону аури`) → `abilities.validation.*` + `params`; показ у редакторі — `translateIssue`.
- Підписи з реєстру в цій задачі **не** чіпати (задача 12): компоненти поки показують `def.label`.

- [ ] **Step 1–5** як у задачі 2; тест `schema/ability`: issue — ключ + `params`; `en`-тест — `LimitsSection`. **Commit** `feat(i18n): ability editor chrome on next-intl`.

### Task 12: abilityRegistry (≈ 14 файлів; після 11)

**Files:** `components/abilities/{EffectCard,AbilityChips,AbilityTemplatePicker,ConditionEditor}.tsx`, `components/abilities/{fields,sections,effect-renderers}/**` (лише заміна `def.label`/`field.label`/`option.label` на ключі) + тести; `lib/utils/abilities/templates.ts` (`build()` бере назву з параметра); `messages/{uk,en}/abilityRegistry.json`; `label-keys-abilityRegistry.test.ts`. Файли `lib/utils/abilities/registry/**` — **не змінювати** (лише читати id).

**Рішення (spec, рішення 5):**
```ts
// ключі за id; рендер: tr(`effects.${kind}.label`), tr(fieldKey(owner, field.name)), tr(`options.${group}.${value}`)
abilityRegistry.effects.<kind>.label · .flags.<flag> · .triggers.<event>.label · .conditions.<key>
abilityRegistry.fields.<name> | abilityRegistry.effects.<kind>.fields.<name>   // другий — коли підпис поля різний між ефектами
abilityRegistry.options.<group>.<value> · .stats.<key> · .targets.<t> · .damageFilters.<k> · .templates.<id>.{label,hint,defaultName}
```
`fieldKey`/`group` — маленький чистий хелпер у `components/abilities/fields/` (не в реєстрі). Тест підписів обходить `EFFECT_REGISTRY`, `FLAG_REGISTRY`, `TRIGGER_REGISTRY`, `CONDITION_REGISTRY`, `ABILITY_TEMPLATES`, `STAT_LABELS`, `TARGET_LABELS`, `DAMAGE_FILTER_LABELS` + `fields`/`options` кожного визначення. `AbilityChips`/`AbilitySummary` показують `describe`/`summary` як є (ч.6).

- [ ] **Step 1:** згенерувати `uk`-JSON скриптом з реєстру (одноразово, у scratchpad, не комітити) — тексти слово в слово; `label-keys-abilityRegistry` → PASS лише з повним `uk`/`en`. **Step 2:** компоненти на ключі; тести редактора на ключі. **Step 3:** `renderWithIntl` `en` — `EffectCard` для `modifyStat` і `flag`. **Step 4:** перевірки. **Step 5: Commit** `feat(i18n): ability registry labels in editor on next-intl`.

### Task 13: rules (≈ 24 файли)

**Files:** `components/rules/**` + `__tests__`; `app/campaigns/[id]/dm/rules/**`; `lib/hooks/campaigns/useRulesForm.ts` (+ `useCampaignRules`, якщо має тексти); `lib/utils/rules/**` (`registry.ts`, `schema.ts`, `defaults.ts`) + тести; `lib/constants/hero-scaling.ts` (лише `breakdown`, якщо його показує UI правил); `messages/{uk,en}/rules.json`; `label-keys-rules.test.ts`.

**Рішення:** `MECHANIC_REGISTRY` `label/description` → `rules.mechanics.<key>.{label,description}`; читає ще `lib/server/templates/sync/**` — перевірити: якщо підпис іде у відповідь синхронізації — віддавати ключ механіки (показ у `SourceSyncDialog`, задача 2), інакше лишити поле в реєстрі. `defaults.ts`: назви базових атак — дані (стають назвами атак героя) → лишити з `eslint-disable … -- default attack names stored in campaign rules`. `CriticalsSection`: обгортка — ключі; назви/описи `CRITICAL_*_EFFECTS` — як є (ч.6). `schema.ts` Zod → `rules.validation.*`.

- [ ] **Step 1–5** як у задачі 2; `en`-тест — `RulesForm` (секція морали). **Commit** `feat(i18n): campaign rules on next-intl`.

### Task 14: skillTree (≈ 28 файлів)

**Files:** `components/skill-tree/**` + `__tests__`; `app/campaigns/[id]/dm/skill-trees/**`; `lib/hooks/skills/{useSkillTreeEditor,useSkillTreeTransfer,useProgressionActions,useLevelUpCelebration,useCharacterProgression}.ts` + тести; `lib/utils/skills/**` (`progression/{rules,labels,validate,placement,types,edit,tree-json}.ts`, `tree-transfer.ts`) + тести; `messages/{uk,en}/skillTree.json`; `label-keys-skillTree.test.ts`.

**Рішення:** причини блокування (`rules.ts`: `noPoints`, `alreadyLearned`, …) — уже коди: сервер віддає ключ `skillTree.reasons.<code>`, клієнт `translateIssue`; споживачі `lib/server/characters/**`, `lib/server/skills/**` лише передають рядок — перевірити, що не склеюють текст. `validate.ts`/`tree-transfer.ts` (помилки імпорту дерева, клієнт) → ключі + `params`. Рівні гілки (`labels.ts`: Базовий/Експерт…) → `skillTree.tiers.<t>` (константа лишається, якщо читає бій/AI). `ungrouped.branch` → `common.ungrouped.branch`.

- [ ] **Step 1–5** як у задачі 2; тест: `rules.ts` віддає ключ, `translateIssue` з реальним `uk` — текст слово в слово; `en`-тест — `ProgressionPanel`. **Commit** `feat(i18n): skill tree editor and progression on next-intl`.

### Task 15: Замикання (≈ 6 файлів; після всіх)

**Files:** `lib/zod/client-locale.ts`, `instrumentation-client.ts` (якщо перемикається), `lib/constants/*` (видалення констант без споживачів), `lib/i18n/__tests__/zod-config-split.test.ts`.

- [ ] **Step 1:** `rg -l "safeParse|\.issues" components app lib/hooks -g '!**/__tests__/**'` поза globs храповика → якщо порожньо, `client-locale.ts` на `zodErrorMap` (ключі `validation.*`), тест `zod-config-split` оновити; інакше — нічого, список файлів у звіт.
- [ ] **Step 2:** для кожної label-константи рішення 1 (`GOAL_KIND_LABEL`, `COIN_LABEL`, `XP_DIFFICULTY_LABELS`, `UNGROUPED_LABELS`, `MONSTER_*_LABELS`, `WEAPON_TRAIT_LABELS`, `DAMAGE_ELEMENT_LABELS`, `FEAT_TYPE_LABELS`, `MAIN_SKILL_ROLE_LABELS`, `CLASS_CASTER_LABELS`, `DND_SKILL_META[].label`, `SPELL_*_LABELS`) — `rg` споживачів; без споживачів — видалити (з тестами), інакше — лишити й записати, хто читає.
- [ ] **Step 3:** `pnpm test:related` на змінених; **Commit** `chore(i18n): part 4 closing — client zod map, unused label constants`.

---

## Review Focus (фінальне Opus-рев'ю)

1. З `NEXT_LOCALE=en` жоден компонент скоупу не показує сирий ключ — аркуш гравця й DM (`dm/characters/[id]`), дерево в аркуші, книга заклинань у бою, юніти в підготовці бою, довідник; `Header`/`Breadcrumbs` (root-chrome) показують `common.dmSections`.
2. `uk`-тексти не змінились (крім ICU-плюралей і «Видалити всі {noun}?»); плюралі 1/2/5/11/21; дати — `Europe/Kyiv`, без розбіжностей гідрації.
3. Серверні/кешовані тексти (лінії аркуша, зведення довідника, причини прогресії, лог інвентаря/героя) — ключ + `params`, переклад на клієнті; кеш мовно-нейтральний; рядки з БД показуються як є; у БД ключі не пишуться (`character_log.data.label`, назви груп заклинань, базові атаки).
4. Константи рішення 1 не змінені там, де їх читають імпорт (`enumLabels`), бій/лог, AI, `describe` реєстру; `spellLevelName`/`levelFromName` працюють як раніше.
5. `abilityRegistry`: кожен id реєстру має ключ (тест); редактор не читає `def.label`/`field.label`; реєстрові файли без змін.
6. Нові `API_ERRORS` — в обох мовах; `stash-update`/операції персонажа віддають ключі.
7. Розмір: `scope-size` зелений, фактичні цифри записані; рішення «один layout» досі в силі.
8. Хвости ч.3 закриті (STATUS): `ABILITY_*`, споживачі підписів, `spellLevelName`, `rich`, `noun`, дублі ключів, `NameOnlyCreateDialog`.

## Після задач (контролер)

- [ ] `git branch --show-current` (= `feat/i18n-part4`); один раз повні `pnpm test:run`, `pnpm lint` (у фоні, `timeout 600000`), `pnpm exec tsc --noEmit`; `rg -n "\p{Cyrillic}"` по globs скоупу без `__tests__` → лише коментарі й задокументовані маркери.
- [ ] `parity`, `label-keys*`, `scope-size`, `api-errors-coverage` — зелені; розміри ns (`wc -c`, gzip сумарно для `CAMPAIGN_NAMESPACES`) — у «Хід виконання».
- [ ] `/simplify` на diff гілки (1–2 агенти, Sonnet).
- [ ] Одне Opus-рев'ю всього diff за Review Focus → одна fix wave (Sonnet) → обмежене re-review.
- [ ] `docs/architecture/i18n.md`: список ns і `CAMPAIGN_NAMESPACES`/`scope-size` (правило розщеплення), ключ+`params` для серверних/кешованих текстів через `translateIssue`, `common.{abilities,stats,spellLevels,…,dmSections,tabs}`, `abilityRegistry` за id, `timeZone`, `expectLabelKeys`; стан клієнтського Zod. `docs/STATUS.md` — рядок «Мультимовність»: ч.4 на гілці, закриті хвости ч.3, відкладене (описи реєстру, крит-ефекти → ч.6; `actionResult`, `acquaintances`? → ч.5; генератор — контент); прибрати застаріле «spec/план частини 2 ще не в архіві».
- [ ] Merge у `main` — **лише після окремого «пушай» користувача**: тимчасовий worktree від `origin/main`, `git merge --no-ff feat/i18n-part4`, у merge-коміті `git mv` spec і план у `docs/archive/superpowers/{specs,plans}/`; перед push — `git merge-base --is-ancestor origin/main HEAD` (і що гілка ч.4 — предок HEAD); worktree прибрати.

## Хід виконання

_(заповнює контролер: коміти задач, розмір ns, рішення задач 12/13 про ключі полів і `templates/sync`)_

- Task 1 (каркас): done. scope-size: uk 38,9 KB raw / 16,0 KB gzip, en 37,9 / 12,6. Відхилення: додано `common.dmMenu.<path>` (назви пунктів меню Header відрізняються від крихт: «NPC Юніти»), `dashboard.sections.<path>.{title,subtitle}` — лише для 16 плиток (без keywords/info/acquaintances/player — це задача 3), `STAT_SCORES` у `lib/constants/abilities.ts`, `APP_TIME_ZONE` у `lib/i18n/config.ts` (передається і в клієнтські провайдери). Храповик навмисно червоніє на `lib/constants/{campaign-dashboard,source-sync}.ts` і всьому скоупі до задач 2–14.
