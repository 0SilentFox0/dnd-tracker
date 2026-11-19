# Архітектура та структура проекту D&D Combat Tracker

Детальний опис папок, організації коду та конвенцій для швидкого розуміння кодової бази.

---

## Кореневі директорії

| Папка / файл | Призначення |
|---------------|-------------|
| **`app/`** | Next.js App Router: сторінки, API routes, layout, auth |
| **`components/`** | React-компоненти UI (переиспользувані, за доменами) |
| **`lib/`** | Бізнес-логіка: API-клієнти, хуки, утиліти, константи |
| **`types/`** | Глобальні TypeScript-типи та інтерфейси |
| **`prisma/`** | Схема БД та міграції |
| **`scripts/`** | CLI/одноразові скрипти (імпорт, міграції, seed) |
| **`systems/`** | Рулсистеми: бази, модулі, пресети (`docs/architecture/rule-systems.md`) |
| **`ratchets/`** | Baseline-файли ratchet-перевірок (лише скорочуються) |
| **`docs/`** | Документація (ТЗ, опис юнітів тощо) |
| **`public/`** | Статичні файли (зображення, фони) |

**Аліас імпортів:** у `tsconfig.json` задано `"@/*": ["./*"]` — імпорт з кореня: `import { x } from "@/lib/api/campaigns"`.

---

## 1. `app/` — Next.js App Router

### 1.1 Маршрути та групи

- **`(auth)/`** — група маршрутів без зміни URL:
  - `sign-in/[[...sign-in]]` — вхід
  - `sign-up/[[...sign-up]]` — реєстрація
- **`auth/callback`** — OAuth callback після логіну (Supabase).
- **`campaigns/`** — публічні сторінки кампаній:
  - `new` — створення кампанії
  - `[id]/` — кампанія за ID: character, battles, info, dm, тощо

### 1.2 `app/api/` — API Routes

Усі маршрути під **`/api/campaigns/[id]/...`** (окрім join/active-battles). Контекст — завжди `campaignId` з URL.

| Шлях | Призначення |
|------|-------------|
| `api/campaigns/join` | Приєднання до кампанії за кодом |
| `api/campaigns/active-battles` | Список активних боїв |
| `api/campaigns/[id]/characters` | CRUD персонажів |
| `api/campaigns/[id]/characters/[characterId]` | GET/PATCH персонажа, damage-preview, inventory, level-up |
| `api/campaigns/[id]/battles` | Список боїв, balance |
| `api/campaigns/[id]/battles/[battleId]` | Старт, next-turn, attack (з `endTurn`), spell, bonus-action, morale-check, complete, rollback, add-participant тощо; мутації відповідають `{ delta, response? }` |
| `api/campaigns/[id]/skills` | CRUD скілів |
| `api/campaigns/[id]/skills/[skillId]` | GET/PATCH скіла |
| `api/campaigns/[id]/spells` | Заклинання, групи, імпорт |
| `api/campaigns/[id]/races` | Раси кампанії |
| `api/campaigns/[id]/units` | Юніти та групи |
| `api/campaigns/[id]/artifacts` | Артефакти |
| `api/campaigns/[id]/main-skills` | Основні навички (MainSkill) |
| `api/campaigns/[id]/skill-trees` | Дерева прокачки (PATCH валідує дерево) |
| `api/campaigns/[id]/characters/[characterId]/progression` | Прокачка персонажа: GET, `learn` / `unlearn` / `reset` / `seen-level` (правила перевіряє сервер) |
| `api/campaigns/[id]/members/[memberId]` | Учасники кампанії |
| `api/pusher/auth` | Авторизація каналів Pusher для real-time |

У складних route (наприклад attack, next-turn, start) логіка часто винесена в окремі файли: `route.ts` тільки валідує, викликає хелпери/хендлери.

### 1.3 `app/campaigns/[id]/` — сторінки кампанії

- **`character/`** — перегляд/редагування персонажа гравця (character-view-enhanced, edit).
- **`battles/[battleId]/`** — сторінка активного бою (черга, учасники, атаки, заклинання).
- **`info/`** — інформаційні сторінки кампанії.
- **`dm/`** — панель DM:
  - `dm/characters` — список персонажів із вкладками «Усі / Гравці / NPC-герої» (`?type=player|npc_hero`); `[characterId]` — редагування; `new?type=` — створення.
  - `dm/battles` — список боїв; `[battleId]` — редагування; `new` — створення.
  - `dm/spells`, `dm/units`, `dm/races`, `dm/artifacts`, `dm/main-skills`, `dm/skill-trees` — відповідні розділи налаштувань.

Сторінки часто розділені: `page.tsx` (серверний компонент, дані) + `*-client` / `page-client` (клієнтський UI з `"use client"`).

---

## 2. `components/` — React-компоненти

Компоненти згруповані за доменами. Загальні UI-примітиви — в `ui/`. Правило розміру: у папці до ~10 файлів компонентів; більше — підпапки за відповідальністю (а не за алфавітом). Barrel `index.ts` лежить у корені папки лише там, де він уже є; імпорт завжди через `@/components/...`. Шари й межі — [ui-layers.md](docs/architecture/ui-layers.md).

### 2.1 Примітиви та спільне

| Папка | Що містить |
|-------|------------|
| **`ui/`** | Базові компоненти (Button, Card, Select, Tabs, Accordion тощо) — shadcn/ui стиль. Діалоги — лише `ResponsiveDialog` (модалка на десктопі, шторка `vaul` на телефоні); підтвердження й повідомлення — `ConfirmProvider` + `useConfirm` / `useNotify`. `ActionBar` — `ui/action-bar`. |
| **`hud/form/`**, **`hud/page/`** | HUD-форми (`HudFormPage` + `HudForm`, `HudTab`, `HudSection`) і HUD-сторінки (`HudPage`, `HudPageHeader`, `HudCard` / `HudTile`, `HudChipTabs`, `HudPanel`). Усередині `.hud-surface` shadcn-токени HUD-кольорові, текст — `--hud-muted`. Арт розділу ставить `screenBackgroundLayout(SCREEN_BACKGROUND.x)` у `layout.tsx` сегмента (CSS у `app/globals.css`); сторінки друку лишаються світлими. |
| **`common/`** | Спільні блоки без доменних типів: `fields/` (ColorField, IconUrlField, ImageUpload, SearchInput…), `entity/` (EntityIcon, OptimizedImage, DmEntityCard, GroupAccordionItem, MarkdownLite…), `dialogs/` (ImportDialog, NameOnlyCreateDialog, RenameGroupDialog, UndoableResultDialog), `shell/` (PrintPageShell, PagerNav, PlayerViewGuard/Toggle, LocaleSwitcher, ToastHost, StepIndicator), `states/` (`EmptyState`, `LoadingState`, `ErrorState`, `QueryState`, `SearchEmptyState`, `SectionLoading`). |
| **`layout/`** | Макети, хедери, навігація, `ThemeProvider`, `PaletteSwitcher`. |
| **`systems/`** | Реєстр UI рулсистем і типи слотів (`registry.ts`, `types`); сам UI систем — у `systems/<id>/ui`. |
| **`fx/`** | 2D-ефекти: `animations/`, `auras/`, `frames/`, `runtime/`, `preview/` (один файл на анімацію). |
| **`dice/`**, **`audio/`**, **`music/`**, **`soundboard/`**, **`notifications/`** | 3D-кубики (`DiceStage`, `DiceRoller`), аудіо, музична бібліотека/плеєр, швидкі звуки ДМ, сповіщення. |
| **`auth/`**, **`landing/`**, **`onboarding/`** | Вхід/реєстрація, статичний лендінг (`sections/`), чеклісти, підказки, «Що нового». |

### 2.2 Бій

| Папка | Що містить |
|-------|------------|
| **`battle/scene/`** | `BattleScreen`, `BattleSceneProvider`, `BattlePlayerViewToggle`; `layout/` (Desktop/Mobile розкладки, `CornerStack`, `BattleTopBar`, `MapStrip`), `banners/` (AwaitingDm, BattleOver, Connection, `BattleToast`, `LastActionTicker`). |
| **`battle/map/`** | Мапа бою: `BattleMap`, `MapStage` у корені; `layers/` (шари фону, токенів, стін, дверей), `tokens/` (токен, HUD токена, курсори атаки, геометрія), `edges/` (редактор ребер, двері), `panels/` (панелі мапи, погода, рух, інструменти), `camera/`, `fog/`, `grid/`, `motion/`, `tiles/`, `weather/`. |
| **`battle/setup/`** | Створення бою: `form/` (`BattleSetupForm`, вкладки), `map/` (бібліотека карт, калібрування сітки), `participants/` (списки героїв/юнітів, рядки учасників), `balance/` (баланс і XP). |
| **`battle/modes/maze/`** | Режим лабіринту: `layers/` (туман, стіни, фічі), `view/` (провайдер вигляду, перемикач, огляд партії), `tools/` (тулбар, редактор ребер, мітки), `dialogs/` (генерація, ілюзії, перетасовка). |
| **`battle/`** (решта) | `wizards/` (атака, книга заклинань, бонусна дія, кидки), `participants/`, `turn/`, `log/`, `dm/` (діалоги й панелі ДМ), `hud/`, `overlays/`, `list/`, `audio/`, `demo/`, `dev/`. |

### 2.3 Персонаж і контент

| Папка | Що містить |
|-------|------------|
| **`character-profile/`** | Лист героя: `tabs/` (Combat, Magic, Skills, Story, BasicEdit), `hero/` (портрет, шапка, раса, риси, книга заклинань), `level-up/` (діалоги підвищення, вибори, бейджі), `story/` (біографія, цілі, нотатки), `combat/` (рядки бою, кидки, розбивка), `tokens/`, `inventory/`, `path/`, `rest/`, `stash/`; `CharacterProfile`, `ProfileContext`, `ProfileEditor` у корені. |
| **`characters/`** | Створення/списки персонажів: `basic/`, `abilities/`, `skills/`, `spells/`, `artifacts/`, `stats/`, `rest/`, `review/`, `player-draft/`, `list/`. |
| **`choices/`** | Вибори персонажа: `editor/` (редактор виборів для ДМ), `picker/` (вибір гравцем, майстер, передісторії), `character/` (панелі виборів героя). |
| **`abilities/`** | Редактор умінь: `editor/` (список, панель, умови, контекст), `recipes/` (шаблони й «Скопіювати з…»), `flow/` (схема потоку, чипи, `EffectCard`), `fields/` (поля з реєстру), `sections/`, `effect-renderers/`. |
| **`spells/`** | Заклинання: `list/`, `groups/`, `dialogs/`, `book/`, `preview/`; `form/` — `fields/` (поля форми), `forms/` (create/edit/body/effects), `effects/`. |
| **`skills/`**, **`races/`**, **`feats/`**, **`artifacts/`**, **`units/`** | Картки, списки й форми відповідного контенту (`units/form`, `units/list`). |
| **`content-import/`** | Імпорт: `ContentImportWizard`; `compendium/` (кроки компендіуму), `compendium/report/` (звіти, медіа, покриття), `steps/`, `shared/` (чипи, лічильники, кнопки передачі). |
| **`rules/`**, **`campaigns/`**, **`acquaintances/`** | Секції правил кампанії (`sections/`, `system/`); кампанія (`dashboard/`, `info/`, `join/`, `members/`, `settings/`, `templates/`); знайомі. |

### 2.4 Сценарій, показ, світ, AI

| Папка | Що містить |
|-------|------------|
| **`scenario/`** | `book/` (книга, зміст, індекс, пошук, шрифти, CSS), `page/` (сторінка, rich text, підсумок), `chips/` (маркери, іконки секцій, вибір героя), `editor/` (див. нижче), `graph/`, `play/`. |
| **`scenario/editor/`** | `acquaintance/` (діалог і форми знайомих, журнал), `dialogs/` (вибір бою/маркера/слайда, властивості, версії, треки), `rich-text/` (TipTap-редактор, згадки), `chrome/` (тулбар, статус збереження, порядок), `rows/` (клітинки, прив'язки, розкриття). |
| **`show/`** | «Показ»: `editor/`, `puzzle/`, `stage/`, `world/` (карта світу в показі). |
| **`world/`**, **`maps/`** | Карта світу (`editor/`, `notes/`, `play/`, `travel/`); бібліотека карт бою (`maps/editor`). `world/editor/`: `panels/` (маркер, інспектор), `maps/` (смуги, дропзона, налаштування, нова карта). |
| **`ai/`** | `chat/` (панель, композер, повідомлення, тред), `proposals/` (пропозиції, операції сценарію), `assistant/` (воркспейс, черга, ревю, політика, handoff), `settings/` (провайдери, інструкції, токени). |

Іменування: доменні компоненти з великої літери; хуки `useX.ts`, чисті хелпери й типи — kebab-case поруч у відповідній підпапці.

---

## 3. `lib/` — логіка та інфраструктура

### 3.1 `lib/api/`

Клієнти для HTTP-запитів до власних API (Next.js route handlers). Один модуль на домен.

- **`client.ts`** — базові функції (campaignGet, campaignPatch, campaignPost тощо) та можливо базовий URL.
- **`campaigns.ts`**, **`characters.ts`**, **`battles.ts`**, **`skills.ts`**, **`spells.ts`**, **`races.ts`**, **`units.ts`**, **`artifacts.ts`**, **`inventory.ts`**, **`main-skills.ts`**, **`skill-trees.ts`** — методи типу get/create/update/delete для відповідних сутностей.
- Типи для battles API лежать у `types/battle-setup.ts`.

Виклики йдуть лише з хуків (`lib/hooks/<domain>`); компоненти й сторінки імпортувати `@/lib/api/*` не можуть — це перевіряє ESLint (`no-restricted-imports`). Типи, потрібні компонентам, лежать у `types/`. Серверні route в `app/api/` обробляють запити і використовують Prisma.

### 3.2 `lib/hooks/`

React-хуки згруповані по папках за доменом; кожна папка має `index.ts` для публічного API. Імпорт: `@/lib/hooks/battles`, `@/lib/hooks/characters` тощо.

- **`lib/hooks/battles/`** — список і CRUD боїв: `useBattles` (useBattle, useStartBattle, useUpdateBattle, …); усі мутації бою — через `useBattleAction` (`expectedVersion`, застосування дельти, 409 → рефетч і тост).
- **`lib/hooks/battle/`** — логіка одного бою: `useBattleSceneValue`/`useBattleScene` (контекст сцени), `usePusherBattleSync` (`battle-delta`), `useAttackWizard`, `useSpellBook`, `usePlayerTurn`, `useBattleToast`, `useHpChange`, `useBattlePageDialogs` (DM-діалоги).
- **`lib/hooks/campaigns/`** — `useCampaignMembers`.
- **`lib/hooks/characters/`** — персонажі та форма: `useCharacterForm`, `useCharacterView`, `useCharacters`, `useDamageCalculator`, `useHeroScalingCoefficients`; тип `Character`.
- **`lib/hooks/skills/`** — скіли та прокачка: `useSkills`, `useMainSkills`, `useSkillForm`, `useCharacterProgression`, `useProgressionActions`, `useLevelUpCelebration`, `useSkillTreeEditor`; тип `SkillFromLibrary`.
- **`lib/hooks/spells/`** — заклинання: `useSpells`, `useSpellGroups`, `useSpellGroupActions`, `useSpellSelection` та мутації (create, update, delete, move, …).
- **`lib/hooks/units/`** — юніти: `useUnits`, `useUnit`, `useUnitGroups`, `useCreateUnitGroup` та мутації.
- **`lib/hooks/races/`** — раси: `useRaces`, `useCreateRace`, `useUpdateRace`, `useDeleteRace`.
- **`lib/hooks/common/`** — спільні: `useFileImport`, `useInfoReferenceFilters`, `useAppearanceSave`; тип `UseFileImportReturn`.

Хуки часто повертають об’єкт з даними + колбеками; форми — об’єкт з полями та сетерами/групами (basicInfo, effectsGroup, damageGroup тощо).

### 3.3 `lib/utils/` — утиліти та доменна логіка

#### `lib/utils/battle/`

Вся логіка бою: атаки, урон, заклинання, учасники, ініціатива, мораль.

- **`attack/`** — розрахунок атаки: куби, крит, ефекти, процес удару (`process/`: hit, critical, critical-fail тощо).
- **`attack-and-next-turn/`** — фаза атаки (`runAttackPhase`).
- **`turn/`** — єдиний движок переходу ходу (`advanceTurn`).
- **`store/`**, **`pipeline/`** — нормалізоване сховище бою і `runBattleMutation` для всіх battle-роутів (`client-delta.ts` будує дельту для клієнта).
- **`client/`** — `applyBattleDelta` для кешу на клієнті; **`flows/`** — редʼюсери майстрів (атака, книга, хід); **`view/`** — що бачить гравець (стани HP, відомий AC, помічене в бою, черга ходів).
- **`damage/`** — розбиття урону (breakdown), модифікатори, resistance, бонуси, формули.
- **`participant/`** — учасник бою: з character/unit, збирання умінь, артефакти, покращення заклинань.
- **`spell/`** — застосування заклинання: гілки (process-branches), ефекти (process-effects), розрахунки.
- **`balance/`** — баланс бою (CR, DPR тощо).
- **`maze/`** — режим «Лабіринт» на карті бою: чиста геометрія (стіни по ребрах `x:y:e|s`, досяжність виходу, рух до 3 кроків за хід із шляхом на сервері), зір героя (конус 90°, туман, темрява), генератор і перетасовка, пробудження сплячих ворогів. Один код для сервера й клієнта: сервер будить ворогів після кожної мутації (`withMazeAwareness`), клієнт малює туман війни. Приховування лишається на клієнті (`view/maze-view.ts`), сервер надсилає повну сцену. Роути: `maze` (ДМ: generate, reshuffle, walls, exit, teleport, fog, dark, scatterStarts) і `maze-mark` (мітки гравців); рух — звичайний `move`. Вихід усіх союзників → очікування рішення ДМ. Перевірка наскрізно — `pnpm battle-sweep --mode maze`.
- **`resistance/`** — опір урону.
- **`common/`**, **`types/`** — спільні типи та хелпери.

Файли тримаються компактними (<300 рядків), складна логіка винесена в окремі модулі/папки.

#### `lib/utils/abilities/`

Уміння — одна модель «тригер → умова → ліміти → ефекти» для скілів, рас, артефактів, сетів і юнітів.

- **`schema/`** — Zod-модель уміння (тригери, умови, ефекти, правила сумісності).
- **`registry/`** — реєстр тригерів, умов і ефектів: `matches` / `evaluate` / `apply`, `describe`, `fields` для UI.
- **`engine/`** — `runAbilities` (один виконавець подій бою з лімітами й шансом), `resolveDowned` (летальна шкода → вбивство), `collectModifiers` (постійні модифікатори: пасивки, аури, таймові ефекти).
- **`build/`** — збирання умінь учасника («найвищий рівень у лінії», школа магії) і запікання статів при побудові.
- **`read.ts`** — єдине читання колонки `abilities` (`skillAbilities` / `raceAbilities` / … для бою, `readAbilities` для редакторів; колонка `NOT NULL DEFAULT '[]'`, невалідні записи відкидаються з попередженням). Форми пишуть `abilities` напряму; `summary.ts` рахує короткі описи для списків. Конвертери старих форматів — лише в `scripts/import/legacy-convert/` (для `import-skills-library`).

#### `lib/utils/skills/`

- **`progression/`** — єдиний рушій прокачки: `normalizeTree` (вузли дерева), `canLearn`/`canUnlearn` (правила), `progressionView`/`rankOffers` (UI гравця), `resolveLearned` (бій, баланс, заклинання), `validateTree` і редагування JSON для DM.
- **`skills.ts`** (групування скілів за основними навичками) і **`form/`** (нормалізація й payload форми скіла).

#### `lib/utils/spells/`

- **`spell-learning.ts`** — які заклинання додавати при вивченні скілів/дерева.
- **`spell-learning-from-tree.ts`**, **`spell-learning-internals.ts`** — внутрішня логіка та типи.

#### `lib/utils/characters/` та інші

- **`characters/`** — перетворення персонажа в форму (character-form тощо).
- **`races/`** — утиліти для рас.
- **`api/`** — спільні API-допоміжки.
- **`common/`** — загальні утиліти.

Тести: поруч з кодом у папках **`__tests__/`** (наприклад `lib/utils/battle/__tests__/`, `lib/utils/abilities/**/__tests__/`).

### 3.4 `lib/constants/`

Константи D&D та гри: abilities, alignment, battle (ParticipantSide, AttackType тощо), hero-scaling, spell-enhancement, critical-effects, artifacts. Використовуються в логіці та формах.

### 3.5 `lib/providers/`

React-провайдери: **`query-provider.tsx`** (TanStack Query), можливо інші обгортки для клієнтського стану.

### 3.6 `lib/supabase/`

Клієнти Supabase: **`client.ts`** (браузер), **`server.ts`** (сервер), middleware для сесій. Використовується для auth та, за потреби, storage.

### 3.7 `lib/cache/`

Допоміжні функції кешу (наприклад для React Query або Prisma), якщо використовуються.

### 3.8 `lib/types/`

Додаткові типи, що відносяться до lib (наприклад **`main-skills.ts`**, **`battle.ts`**, **`skills.ts`**). Глобальні типи доменів краще шукати в кореневій **`types/`**.

---

## 4. `types/` — глобальні типи

Централізовані інтерфейси та типи для всього проекту.

- **`index.ts`** — реекспорт усього з types (artifacts, battle, campaigns, characters, hooks, inventory, races, skills, spells, units, api, main-skills, skill-tree, utils).
- **`battle.ts`** — BattleParticipant, BattleAction, SkillEffect, ActiveSkill тощо (бойова модель).
- **`api.ts`** — типи для API (BattleScene тощо).
- **`characters.ts`**, **`campaigns.ts`**, **`races.ts`**, **`skills.ts`**, **`spells.ts`**, **`units.ts`**, **`artifacts.ts`**, **`inventory.ts`** — сутності відповідних доменів.
- **`skill-tree.ts`** — `SkillLevel`, `SkillLevelType`; формат дерева — `RawTree` у `lib/utils/skills/progression`.
- **`progression.ts`** — `CharacterProgressionDto`.
- **`main-skills.ts`** — MainSkill (API/форма), MainSkillFormData.
- **`hooks.ts`** — типи для хуків (GroupedSkillPayload, SkillEffect тощо).
- **`utils.ts`** — допоміжні типи.

При зміні контрактів API або моделей оновлюйте відповідні файли тут і в Prisma-моделях.

---

## 5. `prisma/`

- **`prisma/schema/`** (`core.prisma`, `systems/*.prisma`) — повна схема БД (User, Campaign, CampaignMember, Character, Unit, Spell, SpellGroup, Artifact, ArtifactSet, CharacterInventory, SkillTree, CharacterSkills, BattleScene, StatusEffect, Skill, Race, MainSkill тощо).
- **`migrations/`** — історія міграцій. Після зміни схеми: `npx prisma migrate dev --name опис`.

Після змін обов’язково: `npx prisma generate` (часто виконується в `postinstall` та перед build).

---

## 6. `scripts/`

Скрипти для CLI та одноразових операцій (запуск: `pnpm run <script>` або `tsx scripts/<група>/імʼя.ts`). Групи:

- **`scripts/import/`** — імпорт: `import-units.ts` (ручний імпорт CSV DM; бібліотечні юніти — `data/library/units` через `seed-library`), `import-skills-library*.ts`, іконки (`import-*-icon*.ts`, `artifact-icon-map.ts`, `wiki-icons-lib.ts`), `legacy-convert/`.
- **`scripts/seed/`** — seed і mock-дані: `seed-library.ts`, `seed-artifacts.ts`, `seed-homm5-characters.ts`, `seed-mock-battle-data.ts`, `reset-/delete-mock-battle-data.ts`.
- **`scripts/sim/`** — симуляції й баланс: `simulate-battle.ts` (`pnpm simulate-battle` — лише на локальній БД: окрема кампанія, бій через ті самі mutation-функції, що й API, з перевірками ефектів), `battle-sweep.ts`, `balance-library.ts`, `hero-growth-report.ts`.
- **`scripts/db/`** — бекап/відновлення/міграції (`*.sh`), `redistribute-character-spell-slots.ts`, `sync-unit-initiative.ts`.
- **`scripts/assets/`** — `upload-assets-to-supabase.ts`; **`scripts/shared/`** — спільні константи.
- У корені лишаються `vercel-build.mjs`, `postinstall.mjs`, `sync-env-to-vercel.mjs`.

Детальніший опис mock-даних — у **`scripts/seed/README-MOCK-DATA.md`**.

---

## 7. Конвенції та поради

### 7.1 Імпорти

- Використовуйте аліас **`@/`** для шляхів від кореня.
- Типи: **`import type { X } from "..."`** де можливо.
- Порядок: зовнішні бібліотеки → внутрішні модулі (`@/`), часто з групуючим ESLint (simple-import-sort).

### 7.2 Компоненти

- Сторінки та великі екрани — в **`app/`**; переиспользувані блоки — в **`components/`**.
- Якщо компонент великий або багато пропсів — виносити в підкомпоненти або в окрему папку з `index.ts` (наприклад **`components/battle/scene/`**).
- Клієнтський код: **`"use client"`** на початку файлу.

### 7.3 API routes

- **`route.ts`** — тільки валідація (Zod), перевірка сесії, виклик хендлера/хелпера. Важка логіка — в окремих файлах (наприклад **`attack-mutation.ts`**, **`build-character-update-data.ts`**).

### 7.4 Тести

- **Vitest** + React Testing Library; тести поруч з кодом у **`__tests__/`** або з суфіксом **`.test.ts(x)`**.
- Запуск: **`pnpm test`** / **`pnpm test:run`**.

### 7.5 Стиль та якість

- **ESLint** — правила Next.js, TypeScript, React, import sort. **`pnpm run lint`**.
- **TypeScript** — strict mode; уникати `any`; для складних API можна використовувати type assertion лише там, де це обґрунтовано.

---

## 8. Типові потоки даних

1. **Відкриття бою:** серверна сторінка `app/campaigns/[id]/battles/[battleId]/page.tsx` (userId) → `page-client.tsx` (`BattlePageClient`) → `useBattleSceneValue` + `BattleSceneProvider` → `BattleScreen`; мутації через `useBattleAction`, оновлення — дельтами (відповідь і Pusher `battle-delta`).
2. **Атака:** «Атака» → `AttackWizard` + `useAttackWizard` (редʼюсер `flows/attack-flow`: зброя → ціль → кидок → шкода → підсумок) → API `attack` → `lib/utils/battle/attack*` та **`damage/`** на сервері (кроки шкоди пишуться в `actionDetails.damageSteps`) → дельта в кеш → `ResultOverlay`.
3. **Форма скіла:** сторінка DM → **`useSkillForm`** → **`SkillCreateForm`** / **`SkillEditForm`** → **`buildSkillFormPayload`** → API **PATCH/POST** skills.
4. **Прокачка:** гравець — **`ProgressionPanel`** → **`useCharacterProgression`** (GET `…/progression`) і **`useProgressionActions`** (`learn` тощо, патч кешу без рефетчу); DM — **`SkillTreeEditor`** → **`useSkillTreeEditor`** → PATCH `skill-trees`.

Орієнтуйтесь на імена хуків і файлів у `lib/hooks/` та `lib/utils/battle/` — вони відповідають цим потокам.

---

## 9. Додаткова документація

- **`README.md`** — загальний опис проекту, стек, швидкий старт, скрипти, деплой.
- **`docs/architecture/`** — деталі підсистем: бій, баланс, режими мапи, abilities, «Показ».
- **`docs/STATUS.md`** — що зараз у роботі, домовленості та відкриті хвости.
- **`docs/superpowers/`** — активні специфікації й плани; виконані лежать у `docs/archive/superpowers/`.
- **`scripts/seed/README-MOCK-DATA.md`** — робота з mock-боями та даними.

Якщо додаєте новий домен (наприклад, новий тип контенту кампанії), логічно додати відповідні гілки в **`app/api/campaigns/[id]/`**, **`app/campaigns/[id]/dm/`**, модуль в **`lib/api/`**, хуки в **`lib/hooks/`**, типи в **`types/`** та компоненти в **`components/`**.
