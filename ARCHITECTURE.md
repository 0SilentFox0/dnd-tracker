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
| **`docs/`** | Документація (ТЗ, опис юнітів тощо) |
| **`imports/`** | Вхідні дані для імпорту (CSV, JSON) |
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
| `api/campaigns/[id]/battles/[battleId]` | Старт, next-turn, attack, attack-and-next-turn, spell, morale-check, complete, rollback, add-participant, damage-breakdown тощо |
| `api/campaigns/[id]/skills` | CRUD скілів |
| `api/campaigns/[id]/skills/[skillId]` | GET/PATCH скіла |
| `api/campaigns/[id]/spells` | Заклинання, групи, імпорт |
| `api/campaigns/[id]/races` | Раси кампанії |
| `api/campaigns/[id]/units` | Юніти та групи |
| `api/campaigns/[id]/artifacts` | Артефакти |
| `api/campaigns/[id]/main-skills` | Основні навички (MainSkill) |
| `api/campaigns/[id]/skill-trees` | Дерева прокачки |
| `api/campaigns/[id]/members/[memberId]` | Учасники кампанії |
| `api/pusher/auth` | Авторизація каналів Pusher для real-time |

У складних route (наприклад attack, next-turn, start) логіка часто винесена в окремі файли: `route.ts` тільки валідує, викликає хелпери/хендлери.

### 1.3 `app/campaigns/[id]/` — сторінки кампанії

- **`character/`** — перегляд/редагування персонажа гравця (character-view-enhanced, edit).
- **`battles/[battleId]/`** — сторінка активного бою (черга, учасники, атаки, заклинання).
- **`info/`** — інформаційні сторінки кампанії.
- **`dm/`** — панель DM:
  - `dm/characters` — список персонажів; `[characterId]` — редагування; `new` — створення.
  - `dm/battles` — список боїв; `[battleId]` — редагування; `new` — створення.
  - `dm/spells`, `dm/units`, `dm/races`, `dm/artifacts`, `dm/main-skills`, `dm/skill-trees`, `dm/npc-heroes` — відповідні розділи налаштувань.

Сторінки часто розділені: `page.tsx` (серверний компонент, дані) + `*-client` / `page-client` (клієнтський UI з `"use client"`).

---

## 2. `components/` — React-компоненти

Компоненти згруповані за доменами. Загальні UI-примітиви — в `ui/`.

### 2.1 Доменні папки

| Папка | Що містить |
|-------|------------|
| **`ui/`** | Базові компоненти (Button, Card, Dialog, Select, Tabs, Accordion тощо) — shadcn/ui стиль. |
| **`common/`** | Спільні блоки: FormCard, FormField, LabeledInput, ImageUpload. |
| **`layout/`** | Макети, хедери, навігація. |
| **`battle/`** | Бій: картки учасників (`cards/`), діалоги атаки/заклинань/моралі (`dialogs/`), списки, оверлеї, панелі, представлення ходу (`views/`). |
| **`characters/`** | Персонаж: basic info, ability scores, combat params, skills, spells, artifacts, stats (damage calculator, HP preview). |
| **`campaigns/`** | Кампанія: join, members, info, settings. |
| **`skills/`** | Скіли: форми створення/редагування (`form/`), списки, картки, тригери, ефекти, діалоги (наприклад CreateGroupDialog). |
| **`skill-tree/`** | Дерево прокачки: `core/` (CircularSkillTree, SkillTreeCard, SkillTreeContent), `elements/`, `ui/`, `utils/`. |
| **`spells/`** | Заклинання: списки, групи, діалоги, форми. |
| **`races/`** | Раси: форми редагування, стати, слоти заклинань. |
| **`main-skills/`** | Основні навички (MainSkill): картки, діалог створення. |
| **`artifacts/`** | Артефакти: картки, форми, кнопки видалення. |
| **`inventory/`** | Інвентар: валюта, екіпіровка, рюкзак. |
| **`units/`** | Юніти: списки, форми, діалоги. |

Іменування: доменні компоненти з великої літери; підкомпоненти часто в тій самій папці або в підпапках (`battle/cards/participant-card/`).

---

## 3. `lib/` — логіка та інфраструктура

### 3.1 `lib/api/`

Клієнти для HTTP-запитів до власних API (Next.js route handlers). Один модуль на домен.

- **`client.ts`** — базові функції (campaignGet, campaignPatch, campaignPost тощо) та можливо базовий URL.
- **`campaigns.ts`**, **`characters.ts`**, **`battles.ts`**, **`skills.ts`**, **`spells.ts`**, **`races.ts`**, **`units.ts`**, **`artifacts.ts`**, **`inventory.ts`**, **`main-skills.ts`**, **`skill-trees.ts`** — методи типу get/create/update/delete для відповідних сутностей.
- **`battles-types.ts`** — типи для battles API.

Виклики йдуть з клієнтських компонентів або з хуків; серверні route в `app/api/` обробляють запити і використовують Prisma.

### 3.2 `lib/hooks/`

React-хуки згруповані по папках за доменом; кожна папка має `index.ts` для публічного API. Імпорт: `@/lib/hooks/battles`, `@/lib/hooks/characters` тощо.

- **`lib/hooks/battles/`** — список і CRUD боїв: `useBattles` (useBattle, useStartBattle, useUpdateBattle, …), `mergeBattleCache`, `useBattles-cache`.
- **`lib/hooks/battle/`** — логіка одного бою: `useBattleSceneLogic`, `usePusherBattleSync`, `useAttackFlow`, `useDamageBreakdown`, `useDamageFlash`, `useMoraleOverlay`, `useBattlePageDialogs`.
- **`lib/hooks/campaigns/`** — `useCampaignMembers`.
- **`lib/hooks/characters/`** — персонажі та форма: `useCharacterForm`, `useCharacterView`, `useCharacters`, `useInventory`, `useDamageCalculator`, `useHeroScalingCoefficients`; типи `SkillTreeProgress`, `Character`.
- **`lib/hooks/skills/`** — скіли та дерево: `useSkills`, `useMainSkills`, `useSkillForm`, `useSkillTreePage`, `useSkillTreeEnrichment`, `useSkillTreeFilters`, `useSkillTreeSave`, `useSkillTreeClear`, `useSkillTreeAssignment`; тип `SkillFromLibrary`.
- **`lib/hooks/spells/`** — заклинання: `useSpells`, `useSpellGroups`, `useSpellGroupActions`, `useSpellSelection` та мутації (create, update, delete, move, …).
- **`lib/hooks/units/`** — юніти: `useUnits`, `useUnit`, `useUnitGroups`, `useCreateUnitGroup`, `useUnitGroupActions` та мутації.
- **`lib/hooks/races/`** — раси: `useRaces`, `useCreateRace`, `useUpdateRace`, `useDeleteRace`.
- **`lib/hooks/common/`** — спільні: `useFileImport`, `useInfoReferenceFilters`, `useAppearanceSave`; тип `UseFileImportReturn`.

Хуки часто повертають об’єкт з даними + колбеками; форми — об’єкт з полями та сетерами/групами (basicInfo, effectsGroup, damageGroup тощо).

### 3.3 `lib/utils/` — утиліти та доменна логіка

#### `lib/utils/battle/`

Вся логіка бою: атаки, урон, заклинання, учасники, ініціатива, мораль.

- **`attack/`** — розрахунок атаки: куби, крит, ефекти, процес удару (`process/`: hit, critical, critical-fail тощо).
- **`attack-and-next-turn/`** — перехід ходу після атаки (advance-turn-phase, run-attack-phase).
- **`damage/`** — розбиття урону (breakdown), модифікатори, resistance, бонуси, формули.
- **`participant/`** — учасник бою: з character/unit, пасивні ефекти, артефакти.
- **`spell/`** — застосування заклинання: гілки (process-branches), ефекти (process-effects), розрахунки.
- **`balance/`** — баланс бою (CR, DPR тощо).
- **`resistance/`** — опір урону.
- **`triggers/`** — контекст тригерів для скілів у бою.
- **`common/`**, **`types/`** — спільні типи та хелпери.

Файли тримаються компактними (<300 рядків), складна логіка винесена в окремі модулі/папки.

#### `lib/utils/skills/`

Скіли: тригери, виконання ефектів у бою.

- **`triggers/`** — умови тригерів (evaluateSkillTrigger, getSkillsByTrigger тощо).
- **`execution/`** — виконання скілів за типом тригера: bonus-action, battle-start, on-hit, on-kill, morale, effects, simple; типи в `types/`.
- **`skill-helpers.ts`**, **`skill-tree-mock.ts`** тощо — допоміжні функції та моки для дерева.

#### `lib/utils/spells/`

- **`spell-learning.ts`** — які заклинання додавати при вивченні скілів/дерева.
- **`spell-learning-from-tree.ts`**, **`spell-learning-internals.ts`** — внутрішня логіка та типи.

#### `lib/utils/characters/` та інші

- **`characters/`** — перетворення персонажа в форму (character-form тощо).
- **`races/`** — утиліти для рас.
- **`api/`** — спільні API-допоміжки.
- **`common/`** — загальні утиліти.

Тести: поруч з кодом у папках **`__tests__/`** (наприклад `lib/utils/battle/__tests__/`, `lib/utils/skills/__tests__/`).

### 3.4 `lib/constants/`

Константи D&D та гри: abilities, alignment, battle (ParticipantSide, AttackType тощо), hero-scaling, spell-enhancement, skill-triggers, critical-effects, artifacts. Використовуються в логіці та формах.

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

- **`index.ts`** — реекспорт усього з types (artifacts, battle, campaigns, characters, hooks, inventory, races, skill-triggers, skills, spells, units, api, main-skills, skill-tree, utils).
- **`battle.ts`** — BattleParticipant, BattleAction, SkillEffect, ActiveSkill тощо (бойова модель).
- **`api.ts`** — типи для API (BattleScene тощо).
- **`characters.ts`**, **`campaigns.ts`**, **`races.ts`**, **`skills.ts`**, **`spells.ts`**, **`units.ts`**, **`artifacts.ts`**, **`inventory.ts`** — сутності відповідних доменів.
- **`skill-tree.ts`** — SkillTree, MainSkill, Skill, UltimateSkill, SkillLevel, SkillLevelType.
- **`main-skills.ts`** — MainSkill (API/форма), MainSkillFormData.
- **`skill-triggers.ts`** — типи тригерів скілів.
- **`hooks.ts`** — типи для хуків (GroupedSkillPayload, SkillEffect тощо).
- **`utils.ts`** — допоміжні типи.

При зміні контрактів API або моделей оновлюйте відповідні файли тут і в Prisma-моделях.

---

## 5. `prisma/`

- **`schema.prisma`** — повна схема БД (User, Campaign, CampaignMember, Character, Unit, UnitGroup, Spell, SpellGroup, Artifact, ArtifactSet, CharacterInventory, SkillTree, CharacterSkills, BattleScene, StatusEffect, RacialAbility, Skill, Race, MainSkill тощо).
- **`migrations/`** — історія міграцій. Після зміни схеми: `npx prisma migrate dev --name опис`.

Після змін обов’язково: `npx prisma generate` (часто виконується в `postinstall` та перед build).

---

## 6. `scripts/`

Скрипти для CLI та одноразових операцій (запуск: `pnpm run <script>` або `tsx scripts/імʼя.ts`).

- **Імпорт:** `import-spells.ts`, `import-docs-spells.ts`, `import-units.ts`, `import-skills-library.ts` (та допоміжні parse/triggers/types).
- **Міграції зберігання:** `migrate-spell-icons-to-supabase.ts`, `migrate-skill-icons-to-supabase.ts`, `migrate-unit-icons-to-supabase.ts`.
- **Дані:** `seed-artifacts.ts`, `seed-mock-battle-data.ts`, `seed-mock-battles.ts`, `reset-mock-battle-data.ts`, `delete-mock-battle-data.ts`, `redistribute-character-spell-slots.ts`.
- **Тести/симуляції:** `run-skills-testing.ts`, `run-spells-testing.ts`, `simulate-battle-3v5.ts`, `setup-battle-test-3v5.ts`.
- **Інше:** `fetch-skill-structure.ts`, `artifact-icon-map.ts`, `update-artifact-icons.ts`, `import-spells-from-csv.ts`.

Детальніший опис mock-даних — у **`scripts/README-MOCK-DATA.md`**.

---

## 7. Конвенції та поради

### 7.1 Імпорти

- Використовуйте аліас **`@/`** для шляхів від кореня.
- Типи: **`import type { X } from "..."`** де можливо.
- Порядок: зовнішні бібліотеки → внутрішні модулі (`@/`), часто з групуючим ESLint (simple-import-sort).

### 7.2 Компоненти

- Сторінки та великі екрани — в **`app/`**; переиспользувані блоки — в **`components/`**.
- Якщо компонент великий або багато пропсів — виносити в підкомпоненти або в окрему папку з `index.ts` (наприклад **`BattlePageDialogs/`**).
- Клієнтський код: **`"use client"`** на початку файлу.

### 7.3 API routes

- **`route.ts`** — тільки валідація (Zod), перевірка сесії, виклик хендлера/хелпера. Важка логіка — в окремих файлах (наприклад **`attack-handler.ts`**, **`build-character-update-data.ts`**).

### 7.4 Тести

- **Vitest** + React Testing Library; тести поруч з кодом у **`__tests__/`** або з суфіксом **`.test.ts(x)`**.
- Запуск: **`pnpm test`** / **`pnpm test:run`**.

### 7.5 Стиль та якість

- **ESLint** — правила Next.js, TypeScript, React, import sort. **`pnpm run lint`**.
- **TypeScript** — strict mode; уникати `any`; для складних API можна використовувати type assertion лише там, де це обґрунтовано.

---

## 8. Типові потоки даних

1. **Відкриття бою:** сторінка `app/campaigns/[id]/battles/[battleId]/page.tsx` → хук `useBattleSceneLogic` → API `useBattle`, мутації (nextTurn, attack, spell тощо) → оновлення через Pusher.
2. **Атака:** кнопка в UI → `handleAttack` (з useBattleSceneLogic-handlers) → API `attack` або `attack-and-next-turn` → `lib/utils/battle/attack*` та **`damage/`** на сервері → оновлення BattleScene та кешу.
3. **Форма скіла:** сторінка DM → **`useSkillForm`** → **`SkillCreateForm`** / **`SkillEditForm`** → **`buildSkillFormPayload`** → API **PATCH/POST** skills.
4. **Дерево прокачки:** **`useSkillTreePage`** → **`useSkillTreeFilters`**, **`useSkillTreeEnrichment`**, **`useSkillTreePage-handlers`** → збереження через **`useSkillTreeSave`** до API skill-trees / characters.

Орієнтуйтесь на імена хуків і файлів у `lib/hooks/` та `lib/utils/battle/` — вони відповідають цим потокам.

---

## 9. Додаткова документація

- **`docs/README.md`** — загальний опис проекту, стек, швидкий старт, скрипти, деплой.
- **`docs/TECHNICAL_SPECIFICATION.md`** — технічне завдання (якщо є).
- **`scripts/README-MOCK-DATA.md`** — робота з mock-боями та даними.

Якщо додаєте новий домен (наприклад, новий тип контенту кампанії), логічно додати відповідні гілки в **`app/api/campaigns/[id]/`**, **`app/campaigns/[id]/dm/`**, модуль в **`lib/api/`**, хуки в **`lib/hooks/`**, типи в **`types/`** та компоненти в **`components/`**.
