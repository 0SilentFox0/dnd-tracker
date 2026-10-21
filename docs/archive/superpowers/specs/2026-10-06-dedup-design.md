# Прибирання дублювання, контрактна міграція, юніти й хвости пунктів 5–7

- **Дата:** 2026-10-06
- **Пункт роадмапу:** 9
- **Гілки:** `feat/dedup` (код + expand-міграція юнітів, реліз 1) → `feat/dedup-contract` (лише SQL-контракт, реліз 2)

## 1. Мета

Одна реалізація кожної речі, менше коду, нуль мертвих гілок. Поведінка для гравців не змінюється, крім рішень,
погоджених у §4 і §7 (level-up, відсіч, баланс, мораль раси, крит `max_damage`, кубики `"d6"`, юніти) та виправлень
хвостів (§5).

**Критерії успіху**

- Кожен пункт §3–§8 виконано; `git diff --stat main` — чисте скорочення рядків.
- Нуль читачів і писачів legacy-колонок із §6 після релізу 1; після релізу 2 колонок немає, `abilities` NOT NULL.
- Бойові числа (атака, шкода, AC, HP) для фікстур до і після дедупу однакові, крім змін із §4 — фіксуються тестами
  перед переносом.
- `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm simulate-battle` (усі перевірки
  зелені; нова кількість перевірок фіксується в плані) — на змердженому результаті кожної гілки.
- Браузерна перевірка з §9 пройдена.

## 2. Два релізи

`CLAUDE.md`: міграції лише expand, `migrate deploy` іде до `next build`, Vercel-відкат схему не повертає. Prisma за
замовчуванням вибирає всі колонки моделі, тому видалення колонок разом із кодом зламало б старий деплой на час білду.

- **Реліз 1 (`feat/dedup`).** Увесь код. Поля, що видаляються, прибрано з `schema.prisma` разом із relation-полями
  (`Campaign.racialAbilities`, `Campaign.unitGroups`, `Unit.unitGroup`); Prisma їх не читає й не пише. Усі такі колонки
  в БД nullable або мають default (перевірено за init-міграцією). `abilities` лишається `Json?`, `NULL` читається як `[]`.
  Єдина міграція — expand для юнітів (§7.1), створюється через `prisma migrate dev --create-only` і редагується вручну
  до самих expand-операцій: після видалення полів зі схеми `migrate dev` пропонуватиме `DROP` для всього з §6.5 —
  так буде до релізу 2, ці `DROP` у міграції релізу 1 не потрапляють.
- **Передумови мерджу релізу 1** (SQL на dev і prod, результати — у звіт гілки):
  1. `pnpm convert-abilities --apply`; далі жоден рядок `skills`/`races`/`artifacts`/`artifact_sets`/`units` не має
     `abilities IS NULL` при непорожніх legacy-колонках (на локальній БД зараз є такі скіли й «Дварф»-раси).
  2. Жоден `battle_participants.snapshot` і `battle_snapshots.state` не потребує `upgradeLegacyParticipant`
     (немає `resolvedAbilities` або є `activeSkills`/`racialAbilities`/`passiveAbilities`/`skillUsageCounts`); інакше —
     одноразовий backfill перед мерджем.
  3. `skills.basicInfo`/`spellData`/`mainSkillData` збігаються з пласкими колонками (інакше спершу backfill пласких).
- **Реліз 2 (`feat/dedup-contract`, гілка від `feat/dedup`).** Одна міграція `20261012000000_contract`: повторний
  ідемпотентний backfill `units.raceId` (`WHERE "raceId" IS NULL AND race IS NOT NULL`) для юнітів, записаних старим
  деплоєм під час білду; `DROP COLUMN` (спершу `units.groupId` з FK `units_groupId_fkey`, потім `DROP TABLE unit_groups`),
  `DROP TABLE racial_abilities`; `abilities` backfill `'[]'` + `SET NOT NULL`; `schema.prisma`: `abilities Json`.
  Видаляються `scripts/convert-abilities.ts` і скрипт у `package.json`. Мердж — лише після того, як прод працює на релізі 1.
- Одне opus-рев'ю на обидві гілки.

## 3. Чиста логіка та мертвий код (поведінка не змінюється, крім кубиків — §4.5)

### 3.1 Кубики — `lib/utils/common/dice.ts`

Єдині `parseDice`, `diceAverage`, `diceMax`, `rollDice` на основі наявного багатогрупового `parseDice`
(`DICE_RE` з `abilities/schema` лишається валідатором однієї групи в схемі здібностей). Переходять на них:
`lib/utils/battle/balance/dice.ts` (`getDiceAverage`, `parseDiceNotationToGroups`), `lib/utils/spells/spell-calculations.ts`,
`lib/utils/battle/spell/process-helpers.ts` (`getDiceSize`), `parseDiceFromDamageDice` у `app/api/campaigns/[id]/spells/import/route.ts`,
`parseDiceString` (`lib/utils/spells/spell-parsing.ts`), крит `max_damage` у `lib/utils/battle/attack/process/compute.ts`
(див. §4.5), `lib/utils/abilities/engine/amount.ts`, `calculateHPGain` (видаляється з §4.1). `"d6"` = `1d6` скрізь
(зміна для балансу та імпорту, де зараз `"d6"` = 0, — див. §4.5).
Мертві `averageRoll`, `rollDamage`, `maxRoll`/`validateDiceRolls` (лише тести) видаляються.

### 3.2 Інші дублі логіки

| Що | Лишається | Видаляється / переходить |
|---|---|---|
| Формула атаки героя (зброя + кубики рівня; «клієнт надіслав повні кидки або середнє кубиків героя») | один хелпер у `lib/utils/battle/damage/` (`getHeroDamageComponents` видаляється) | інлайн у `attack-mutation.ts:54`, `process/compute.ts:78-95`, `view/hero.ts:92-97`, `damage/breakdown.ts:61-81` |
| Ефективний AC | `participant/helpers.getEffectiveArmorClass` | `view/hero.effectiveArmorClass` |
| Сортування ініціативи | `battle-start.sortByInitiative` | копія в `battle-turn.ts:240-246` |
| HP у відсотках | `hpRatio(p)` у `lib/utils/battle/view/health.ts`: частка `[0,1]`, `maxHp ≤ 0 → 0`; умови здібностей множать на 100 | `participant/helpers.ts:60`, `registry/conditions.ts:59`, `hud/HealthBar.tsx:9` |
| Магічна школа (баланс) | один хелпер у `lib/utils/battle/balance` | копії в `balance-post.ts:57-71`, `balance-get.ts:28-42`, `dpr.isMagicMainSkill` |
| `getOptionalModifierValue` | `participant/artifact-utils.ts` | `balance-helpers.ts:12` |
| `signed()` | новий `lib/utils/format.ts` (`0 → "+0"`) | 3 копії (`registry/labels.ts:30`, `characters/sheet/lines.ts:13`, `character-profile/format.ts:1`) + інлайн у `CharacterAbilityScores.tsx:14` і ~10 інлайн `>0` |
| Плюралізація | `pluralUk` | `node-labels.pointsText`, `registry/labels.ts:66`, `UnitCard.tsx:224`, `RacesPageHeader.tsx:21`, 4 сторінки з жорсткими формами |
| Список характеристик | `lib/constants/abilities.ts` | ~12 копій (див. звіт розвідки; спільні короткі мітки — туди ж) |
| Ім'я скіла | `skill-helpers.getSkillName` | `spell-learning-internals.ts:23`; `getSkillRaces`/`isOpenToRace` (завжди `[]`/`true`) — видаляються |
| Пасивка раси | `race-summary.normalizePassiveAbility` | `RaceEditFormUtils.parsePassiveAbility`; дефолтна прогресія слотів — одна константа |

### 3.3 Типи

Видаляються: `lib/types/{artifacts,inventory,notification,races,unit-import}.ts`, `types/utils.ts`, `types/battle-ui.ts`,
барель `types/index.ts`, `types/notification.ts`, дублі в `types/hooks.ts` (лишається `GroupedSkillPayload`), невикористані
`Artifact`/`ArtifactBonus`/`ArtifactModifier` у `types/artifacts.ts`, `Inventory` у `types/inventory.ts`. `lib/types/spell-import.ts`
→ `types/import.ts`. Типи балансу (`AllyStats`, `SuggestedEnemy`, `CharacterDprBreakdown`) — лише `types/battle-setup.ts`.
`CSVRow`, `ArtifactSetOption` — по одній копії.

### 3.4 Мертвий код

- Файли: `components/spells/SpellSelectDropdown.tsx`, `lib/utils/prisma/includes.ts`, `lib/constants/{equipment,spellcasting}.ts`,
  `lib/utils/battle/artifact-sets/{constants,push-artifact-set-hud-marker}.ts`, `lib/hooks/characters/useInventory.ts`,
  `lib/hooks/skills/useSkillTrees.ts`, `lib/utils/battle/battle-log.ts`, бареля `components/battle/dialogs/index.ts`,
  `lib/utils/battle/attack-and-next-turn/index.ts`.
- Маршрут `battles/[battleId]/add-summon` (route + mutation + тест).
- Обгортки `getInventory`, `getArtifact`, `getArtifactSet`, `getBattles` у `lib/api`.
- ~40 мертвих експортів зі звіту розвідки (hero-scaling, spell-abilities, artifacts, spells, spell-effects, spell-enhancement,
  dice, artifact-effect-scope, battle-morale, turn-helpers, battle-timing, calculations, skills, character-race-effects,
  file-import, background-image, unit-parsing, participant/helpers getters, parse, modifiers, disabled-attacks, reaction,
  bonus-actions, spell-learning, hud/theme `SIDE_COLOR`, `EffectChip`, dead type exports у components).
- `package.json`: `import-spells` (файлу немає; `import-spells-from-csv.ts` реєструється під цим ім'ям, якщо він робочий,
  інакше видаляється), `scripts/fetch-skill-structure.ts`, `scripts/setup-battle-test-3v5.ts`, `scripts/migrate-to-new-supabase.sh`.
- Літеральні ключі запитів → `characterSheetKey()` (`useProgressionActions.ts:41`), `progressionKey` (`useSkillTreeEditor.ts:87`).
- Тести, що покривають лише мертвий код, видаляються разом із ним.

## 4. Зміни поведінки (погоджено)

### 4.1 Level-up — одна функція

**Зараз:** кнопка додає до наявних слотів приріст `calculateSpellSlotGain(from, to, maxLevel, raceProgression)` і +1 до
випадкової характеристики (без стелі); `PATCH` на **кожному** збереженні перезаписує слоти абсолютним
`calculateCharacterSpellSlots(finalLevel)` без прогресії раси (губить ключі, крім `universal`), а при зниженні рівня
скидає `skillTreeProgress` у `{}`. Гравець з `allowPlayerEdit` може змінити рівень/XP через `PATCH`, `campaign.maxLevel`
ігнорується.

**Стане:** `applyLevelGain(character, race, campaign, fromLevel, toLevel)` у `lib/utils/characters/level-up/`, викликають
`POST level-up` і `PATCH`, коли рівень зростає (поле рівня або XP).
- Рівень і XP змінює лише ДМ (для гравця поля ігноруються сервером), максимум — `campaign.maxLevel` (422 понад нього).
- Слоти — **приріст** `calculateSpellSlotGain(from, to, maxLevel, race.spellSlotProgression)` (без прогресії раси —
  фіксована таблиця) додається до наявних, тож ручні додаткові слоти зберігаються. Без зміни рівня слоти не чіпаються.
- +1 до випадкової характеристики за кожен отриманий рівень, стеля 30 (характеристика на стелі не обирається; якщо всі
  на стелі — без +1). Застосовується поверх значень із тіла `PATCH` (`data.X ?? character.X`); форма редактора після
  збереження синхронізується з відповіддю, щоб наступне збереження не відкотило +1.
- HP-приросту немає (колонки HP/`hitDice` йдуть за §6.5).
- Зниження рівня — як зараз: скидання прогресу дерева і перерахунок слотів за таблицею (поведінку не змінюємо).
- `useUpdateCharacter` і `useLevelUpCharacter` інвалідують `["battle-balance"]`.

### 4.2 Відсіч — базова механіка

Новий `lib/utils/battle/attack/retaliation.ts` замість `performReaction`/`getReactionDamageAmount`/`canPerformReaction`.

- **У кого:** у кожного учасника (герої, NPC-герої, юніти), 1 раз між своїми ходами (`hasUsedReaction`, скидається на
  початку свого ходу, як зараз). Учасник у паніці (результат моралі `skip`) не відповідає.
- **Коли:** після ближньої атаки зброєю по **основній (першій) цілі** — влучила вона чи звичайно промахнулась;
  критичний промах відсічі не викликає. Ціль має бути живою й притомною, не використати реакцію, мати атаку потрібного
  виду, а атака — не мати крит-ефекту `ignore_reactions`. Прапорець `counterAttack` розширює тригер на дальні атаки
  (`attackKinds: ["melee","ranged"]`); `magic` прибирається зі схеми прапорця, редактора й конвертерів — заклинання
  відсічі не викликають.
- **Чим:** атакою того самого виду (ближня — ближньою, дальня — дальньою: перша така атака учасника; для героя —
  зі слоту відповідної зброї). Немає такої атаки — немає відсічі.
- **Як:** `resolveRetaliation` перевикористовує кроки `processAttack` (кидок влучання проти AC атакувальника, шкода,
  крити, резисти, тригери здібностей при влучанні, `lethalDamage`/kill, перевірка моралі після смерті), але **не**
  витрачає дію захисника, не запускає тригери «перед/після атаки» і не дає додаткових ходів. Усередині відсічі
  нових відсічей немає. Кубики кидає сервер через `flow.ctx.rng` (детерміновано в тестах і `simulate-battle`).
  `counterAttack.bonusPercent` (людська расова «Контратака») — +% до шкоди відсічі.
- **Порядок:** відсіч — одразу після удару по основній цілі, до ударів по інших цілях; якщо атакувальник упав —
  решта ударів скасовується; перевірка перемоги — один раз після всього, як зараз.
- **Лог/UI:** окрема подія «Відсіч» із кидками; `ResultOverlay` — рядок «Відповідь цілі».
- `overrideReactionDamage` видаляється (UI його не надсилає): `reactionDamage` у `attackBodySchema`
  (`attack-mutation.ts:25`), `run-attack-phase.ts`, `flows/attack-flow.ts`.

### 4.3 Баланс

`balance-helpers.getCharacterAttacks` видаляється; баланс будує `BattleParticipant` для персонажів кампанії тим самим
кодом, що старт бою, з одного завантаження контексту (без `findUnique` на кожного персонажа — egress), бере атаки з
`participant/extract-attacks.ts` (зі слотом дальньої зброї) і середню шкоду з `averageAttackDamage` (з `primaryAbility`).
`balance/stats.ts:145-160` — теж через `averageAttackDamage`. Юніти — з `raceId` (§7).

### 4.4 Мораль раси — прапорці здібностей

Зараз правило порівнює `race` з англійськими `"human"`/`"necromancer"`, а раси в БД українські («Людина»…), тож воно
не спрацьовує ніколи. Стане: два нові прапорці в `FlagSchema` (`lib/utils/abilities/schema/effects.ts`), реєстрі й
редакторі — `noNegativeMorale` (від'ємна мораль = 0) і `ignoreMorale` (мораль не діє, перевірки немає). Одна функція
`effectiveMorale(p, participants)` через `findFlags` використовують `battle-morale.ts` і `view/hero.ts`. `BATTLE_RACE`
і порівняння назв рас видаляються. ДМ додає прапорці расам у редакторі; `simulate-battle` перевіряє обидва.

### 4.5 Кубики й крит `max_damage`

- `"d6"` = `1d6` скрізь (баланс та імпорт зараз дають 0).
- Крит `max_damage`: максимум усіх груп кубиків зброї плюс кубиків рівня героя (зараз — лише перша група зброї з
  фолбеком `1d6`).

### 4.6 `applyResistance`

Лишається `lib/utils/battle/resistance/index.ts`; `damage/resist.ts`, `applyResistanceToMultipleDamage`,
`computeDamageBreakdownMultiTarget` видаляються (production не змінюється).

## 5. Хвости пунктів 5–7

**Пункт 5**
- `useCreateSpellGroup` інвалідує лише `["spellGroups", campaignId]`.
- `useArtifacts`/`useArtifactSets` без `router.refresh()`; форми артефактів — `router.push(...)`, далі `router.refresh()`.

**Пункт 6**
- «−0»: шкода в результаті атаки — з `hpChanges` відповіді, відфільтрованих за id цілі (з відсіччю там є й атакувальник),
  не з різниці кешу; `useBattleAction` чекає refetch при розриві.
- «Деталі шкоди» відкриває журнал бою на останньому записі з розгорнутими `LogEntryDetails`.
- Плитка моралі: немає перевірки → «не потрібна», `none` → «без змін», `extra` → «бойовий дух», `skip` → «паніка».
- `moraleResult === "skip"` → без підтвердження «дію не використано».
- Спільний guard в `attack`, `spell`, `bonus-action`: учасник із `pendingMoraleCheck`, що вимагає пропуску → 422 `action_used`.

**Пункт 7**
- `moveProgressKey` (`save-skill-tree-handler.ts`): `prisma.$transaction`, умовні `updateMany` з `equals: old`,
  при `count === 0` перечитати й повторити (до 3 разів).
- `createBranch` повертає `boolean`; шторка закривається лише при успіху.
- `useProgressionActions`: злиття `skillTreeProgress[treeId]`, не заміна.
- JSON-null у прогресі: колонка вже `NOT NULL DEFAULT '{}'`, але JSON-значення `null` можливе — `loadProgressionContext`
  нормалізує `null → {}` і порівнює з тим, що прочитано (тест на рядок із `'null'::jsonb`).
- `get-progression-handler.ts`: `select` лише потрібних полів `Skill`.
- Сироти: `unlearn` приймає `nodeIds[]`, один запит.
- Оновити коментар у `start-build-context.ts:124-127`.
- `validateTree` кладе `label` у помилку; `unknownBranch` показує назву гілки.
- `resolveLearned`/`extract-skills`: один скіл — один запис (найвищий рівень).
- Оверлей нового рівня — лише `isOwner && !isDM`.
- `useCharacterProgression`: `staleTime: 0`.
- Зміна раси в редакторі дерева з незбереженими правками → `useConfirm`.
- Тести: non-owner learn → 403; PATCH (той самий/вищий рівень), потім learn → 200.

## 6. Дублі в UI персонажа та контракт

### 6.1 Книга заклинань

- Видаляються `CharacterSpellbook`, `CharacterSpellbookDialog`, `SpellSlotsBadge`, `useCharacterLearnedSpellIds`, їхні тести.
- Вкладка «Магія» в `ProfileEditor` показує `ProfileSpellBook` із `ProfileContext`. Сторінка створення — без книги.
- **Заглушка:** коли `sheet.spells` порожній — порожня книга (пергамент `SpellBookPages` без сторінок) і текст
  «Поки що Герой більше довіряє своєму мечу і луку». Слоти, якщо є, — над нею. Замінює `EmptyState «Магії поки немає»`.

### 6.2 Сети артефактів

- `findSetProgress` повертає по кожному сету `have/total/complete`; `findCompletedSets` (бій) = його `complete`-підмножина.
  Учасник, збудований `createBattleParticipantFromCharacter`, несе цей прогрес, і `sheet-handler` бере його звідти
  (без власного підрахунку і другого `loadArtifactSetBattleMaps`). Показуються сети з непорожніми `abilities` або `setBonus`.
- Видаляються `getCompletedArtifactSetsPreview` (+ тест), `CharacterCompletedArtifactSetsSummary`, `set-bonus-display-lines`,
  `PassiveEffectsList`.
- Блок сетів `ItemsTab` → спільний `SetList`, його ж рендерить редактор («Речі»).

### 6.3 Редактор персонажа і список ДМа

- `CharacterArtifactsSection` — лише сітка екіпірування з вибором; без книги, слотів, сетів і їхніх пропів.
- `CharacterHpPreview` бере `sheet.hp` (як бій, з бонусами); `DmCharacterCard` — той самий хелпер HP.
- Мертві пропи `artifactBonuses` у `CharacterAbilityScores`/`CharacterCombatParams` і мертві сетери форми видаляються:
  `setMaxHp`, `setCurrentHp`, `setTempHp`, `setSpellcastingClass` — разом із полями з §6.5; `setLanguages`,
  `setProficiencies`, `setImmunities`, `add/removeKnownSpell`, `setKnownSpells` — лише сетери (колонки `languages`,
  `proficiencies`, `immunities`, `knownSpells` живі).
- `dm/characters`: вкладки «Усі / Гравці / NPC-герої» (`?type=player|npc_hero`); «Створити» передає тип;
  пункт шапки «NPC Герої» → `dm/characters?type=npc_hero`; `dm/npc-heroes/page.tsx` — редирект туди; посилання на
  неіснуючі `/npc-heroes/new` і `/npc-heroes/[id]` зникають; прибираються згадки в `Breadcrumbs.tsx`,
  `background-image.ts`.

### 6.4 Спільні компоненти

- `components/common/IconUrlField` (прев'ю через `OptimizedImage`, перевірка URL, фолбек на літеру) замість
  `UnitAvatarInput`, `ArtifactIconUrlPreview`, полів у `SkillBasicInfo`, `SpellFormEffectsAndMeta`, `MainSkillEditForm`,
  `CreateMainSkillDialog`. `ui/image-upload` (URL або файл) лишається для `CharacterBasicInfo`, `ArtifactSetForm`,
  `RaceFormFields`, але всередині рендерить прев'ю через `IconUrlField`.
- `components/common/EntityIcon` (іконка з фолбеком на літеру) замість ~9 інлайн-копій.
- `MainSkillFormFields` — спільні поля `MainSkillEditForm` і `CreateMainSkillDialog`.
- `components/skills/dialogs/CreateGroupDialog` → `CreateSpellGroupDialog`.
- Свідомо не об'єднуються: журнал бою й рядки учасників гравця/ДМа.

### 6.5 Контракт: що прибирається

Реліз 1 — з `schema.prisma` і коду; реліз 2 — з БД.

| Таблиця | Колонки |
|---|---|
| `characters` | `passivePerception`, `passiveInvestigation`, `passiveInsight`, `proficiencyBonus`, `spellSaveDC`, `spellAttackBonus`, `hitDice`, `maxHp`, `currentHp`, `tempHp`, `spellcastingClass`, `personalityTraits`, `ideals`, `bonds`, `flaws` |
| `skills` | `combatStats`, `bonuses`, `skillTriggers`, `damage`, `armor`, `speed`, `physicalResistance`, `magicalResistance`; `basicInfo`, `spellData`, `mainSkillData` (копії пласких колонок, передумова 3 з §2; читачі `format-skills-response.ts:47-123` переходять на пласкі) |
| `artifacts` | `passiveAbility` |
| `artifact_sets` | `artifactIds` |
| `units` | `specialAbilities`, `race`, `groupId`, `groupColor`, `damageModifier` |
| `battle_scenes` | `initiativeOrder`, `battleLog`, `pendingSummons` |
| таблиці | `racial_abilities`, `unit_groups` |

Лишаються живі дані: `artifacts.bonuses/modifiers` (стати зброї), `races.passiveAbility`, `artifact_sets.setBonus`,
`skills.spellEnhancementData` (`spellAllowMultipleTargets`, `spellAoeSpellIds` — пласких колонок немає, читає
`participant/spell-enhancers.ts`). Запис `initiativeOrder: [], battleLog: []` у `battles/route.ts:36-37` прибирається.
`spellcastingClass` прибирається також із `from-character.ts:153`, `from-unit.ts`, `types/battle.ts`, схем create/update.

**Код, що видаляється в релізі 1:** конвертери `lib/utils/abilities/legacy/*` (`ConversionIssue` і `damage-kind`
переїжджають в `lib/utils/abilities/schema`; `read.ts` без fallback переїжджає в `lib/utils/abilities/read.ts` з тими ж
експортами `skillAbilities`, `raceAbilities`, `artifactAbilities`, `artifactSetAbilities`, `unitAbilities`,
`readAbilities`, `abilitiesJson`, `OwnerKind`; `NULL → []`), `convert-snapshot`, `upgradeLegacyParticipant` і
`skillUsageCounts` у `split-participant` (після передумови 2), банер «Перенесено зі старого формату» в `AbilityListEditor`, `battle-updated` у
`pipeline/legacy-battle.ts` (+ тести/фікстури), невикористані схеми в `artifacts/schemas.ts`, legacy-поля в
`collect.ts`, `format-skill(s)-response`, `dm/skills`, `dm/print/skills`, `skills/[skillId]/duplicate`, типах skills/api.
Застарілий `tests/integration/battle-flow.integration.test.ts:105-111` переписується на `battle-delta`.

**Скрипти:** `import-units`, `import-skills-library`, `units/import`, `seed-artifacts`, `seed-mock-battle-data` пишуть лише
`abilities`; `seed-mock-battles`, `backfill-first-hit-response-type` видаляються; `simulate-battle-scenario` без
легасі-фікстур (`legacyGuard`, дварф без `abilities`) — замість перевірки fallback перевірки відсічі (влучання,
промах, `counterAttack` +%, без ланцюжка) і прапорців моралі `noNegativeMorale`/`ignoreMorale`. `CLAUDE.md` і `ARCHITECTURE.md` оновлюються.

## 7. Юніти

### 7.1 Модель (expand-міграція в релізі 1)

- `units.raceId` (FK → `races`, nullable, `ON DELETE SET NULL`, індекс), `races.color` (`String?`).
- Backfill: `raceId` за назвою в межах кампанії — `units.race`, інакше `unit_groups.name`; `races.color` — з палітри.
- Backfill: точний збіг назви (як `load-race.ts:14` зараз); при кількох расах з однаковою назвою — найстаріша
  (`createdAt`). Юніти без збігу лишаються з `raceId = NULL`; міграція нічого не вигадує, а сторінка юнітів показує їх у
  «Без раси» — перед релізом 2 ДМ розносить їх (на prod контенту немає; на dev — перевіряється запитом).
- Код читає й пише лише `raceId`: `load-race`, `start-build-context`, `from-unit` (включно з призовом юнітів
  заклинаннями), `lib/cache/reference-data.ts`, `dm/battles/new/UnitsListCard.tsx`, `dm/units/[unitId]/page.tsx`,
  `UnitGroupAccordion`, `lib/utils/units/unit-form.ts`, `useUnitEditForm`, `balance-get.ts`, `balance-post.ts`,
  `balance/stats.ts`, `scripts/simulate-battle*.ts`, `scripts/import-units.ts`. Рушій отримує назву раси з
  підтягнутого рядка `Race` (`basicInfo.race`/`abilities.race` лишаються назвою).
- API перевіряє, що `raceId` належить тій самій кампанії (FK цього не гарантує).
- Назва раси унікальна в кампанії без урахування регістру: створення/перейменування дубля → 409.
- Перейменування раси в одній транзакції оновлює `characters.race` і `skill_trees.race` (обидва за назвою); зміни раси
  інвалідують `units-${id}`. `GET /races` — `Cache-Control: private, no-store` (зараз `public, s-maxage=60`).

### 7.2 Список

- Акордеони рас (кольорова смуга, іконка раси) → тіри; раси за назвою, усередині тир → назва.
- Пошук за назвою і чіпи рас угорі; за замовчуванням згорнуто; пошук розгортає групи зі збігами.
- Перетягування на расу ставить `raceId`, на «Без раси» — `null`; рівень — як зараз.
- «+ Група» → «+ Раса» (перехід на сторінку рас); колір раси — у формі раси (вибір кольору як в основному навику).

### 7.3 Редагування і створення

- `dm/units/new` — та сама форма + `POST /units` (`createUnit` у `lib/api/units.ts`, хук).
- Раса — вибір із рас кампанії (`raceId`); фолбек на назву групи прибрано.
- Форма синхронізується зі свіжим знімком, поки не «брудна».
- Числові поля тримають сирий рядок під час введення; 0 допустимий.
- `avatar` — однакова схема в `create`/`import`/`patch`; PATCH надсилає `avatar` лише якщо змінився.

### 7.4 Кеш і API

- `revalidateTag(\`units-${id}\`, { expire: 0 })` у всіх записах, включно з `delete-all`, `import`.
- `GET /units` — `Cache-Control: private, no-store`.
- Однакове сортування в SSR і API.

### 7.5 Імпорт

- CSV «Група» → раса (`raceId` за назвою); невідомі назви — у звіті імпорту.
- Атаки — з усіма полями (`type`, `targetType`, `maxTargets`, `damageDistribution`, `guaranteedDamage`).
- `scripts/import-units.ts` використовує той самий маппер, що маршрут.

### 7.6 Мертве

Мертві зараз: `units/delete-by-level` (+ `useDeleteUnitsByLevel`, схема), `PATCH units/groups/[groupId]`
(`renameUnitGroup`), `units/groups/[groupId]/remove-all-units` (`removeAllUnitsFromGroup`). Зникають із редизайном:
`GET/POST units/groups` (`useUnitGroups`, `useCreateUnitGroup`, `CreateGroupDialog` юнітів), `damageModifier` юніта й
групи (картка, форма, діалог, `getUnitDamageModifiers` для юніта).

## 8. Порядок робіт у `feat/dedup`

1. Мертвий код і чиста логіка (§3).
2. Дублі UI (§6.1–6.4).
3. Зміни поведінки (§4).
4. Хвости (§5).
5. Юніти (§7).
6. Контракт у коді (§6.5, реліз 1).

Потім `feat/dedup-contract` (§2, реліз 2).

## 9. Тестування й перевірки

- Зміни поведінки (§4, §5, §7) — TDD: падаючий тест першим.
- Дедуп логіки — тест, що фіксує поточну поведінку, до переносу (особливо кубики й формула атаки героя).
- Після кожного блоку: `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`. Наприкінці: `pnpm build`,
  `pnpm simulate-battle`.
- Тести level-up: гравець не змінює рівень/XP; понад `maxLevel` → 422; стеля 30; приріст слотів з прогресії раси;
  `PATCH` без зміни рівня не чіпає слоти.
- Тести відсічі: основна ціль, промах, критичний промах (без відсічі), паніка, `counterAttack` ranged і +%, атакувальник
  упав — решта ударів скасовано, без ланцюжка.
- Нові тести юнітів: маршрути (CRUD, кеш, avatar), перетягування на «Без раси», перейменування раси з каскадом,
  маппінг імпорту, синхронізація форми після refetch, `from-unit` з `raceId`.
- Контракт: на локальній БД `migrate deploy` → `simulate-battle` → тест RLS.
- **Браузер** (локальна Docker-БД, кампанія `cmuwjvnfq0001eyxo5fpfz2hw` «Перегляд профілю (пункт 8)» — не перейменовувати):
  профіль Ліри (заглушка магії, книга в редакторі, сети); ДМ (вкладки персонажів, редирект `npc-heroes`, редактор,
  level-up); юніти (створення, раса, перетягування, пошук, імпорт); бій (відсіч у журналі й оверлеї, «Деталі шкоди»,
  плитка моралі). Для ДМа роль у `campaign_members` (`preview-player-member`) змінюється тимчасово й повертається.
- Мердж `feat/dedup` → деплой → мердж `feat/dedup-contract`; кожен — лише із зеленими перевірками на змердженому результаті.
