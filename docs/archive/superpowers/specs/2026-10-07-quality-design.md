# Пункт 14 — якість коду: дублікати, константи, мертвий код, тести

Дата: 2026-10-07 · гілка `feat/quality` · джерело: `docs/reports/final-review-2026-10-07.md` (розділ D і дрібне)

## Мета

Одна реалізація кожної речі, доменні значення лише з констант, без мертвого коду, і тести на критичні шляхи. **Поведінка не змінюється**, крім явно описаних виправлень (500 → 400 на кривий JSON, українські повідомлення про помилки API).

**Критерії:**
- `grep` не знаходить літералів статусів бою, сторін і типів атаки поза `lib/constants`;
- немає двох реалізацій налаштування бою, «живий / впав», `isRecord`, метал-мап, назв рівнів заклинань;
- мертві файли й залежності видалено (`knip` чистий за погодженим конфігом);
- тести покривають доступ API, `pusher/auth` і крит-ефекти;
- повний ланцюжок зелений, а `simulate-battle` без змін у результатах.

Перед видаленням кожен «мертвий» елемент перевірити grep-ом (імпорти, динамічні імпорти, `package.json` scripts, `scripts/`).

## Потоки (паралельно, кожен у своєму worktree; межі файлів — нижче)

### Q1 — мертвий код, залежності, гігієна

- **D9 — видалити:**
  - `components/spells/SpellRichOption.tsx`, `components/ui/avatar.tsx`, `components/ui/progress.tsx`;
  - `lib/constants/skill-effects.ts`, `types/skill-triggers.ts` (тригери для скрипта імпорту — лише в `scripts/`);
  - `lib/utils/battle/types/index.ts` (невикористана бочка);
  - `scripts/update-artifact-icons.ts`, `scripts/run-spells-testing*.ts` разом із `lib/utils/spells/spells-testing-parser.ts` і його тестом;
  - залежності `react-hook-form`, `@hookform/resolvers`, `@neondatabase/serverless`, `redis` (якщо Upstash / KV використовує інший пакет — перевір), `@radix-ui/react-avatar`, devDep `@typescript-eslint/eslint-plugin` (якщо не потрібен конфігу).

  `postcss` додати в devDependencies явно.
- **No-op логери:** `lib/utils/battle/battle-timing.ts` (`logBattleTiming`, `measureTiming`) і `logTurnTiming` у `turn/turn-helpers.ts`. Видалити разом із прапорцем `BATTLE_TURN_TIMING` у `package.json` dev-скрипті та згадкою в CLAUDE.md.
- **Типи:**
  - легасі `SkillEffect` і `SkillDamageType` у `types/battle.ts` прибрати, якщо не використовуються;
  - `lib/types/artifact-set-bonus.ts` → `scripts/legacy-convert/`;
  - `lib/types/info-reference.ts` → `types/`;
  - типи `Inventory` і `Artifact` з `lib/api/*` → `types/`.
- **`isRecord` ×7** → один у `lib/utils/common/is-record.ts`.
- **`void _x` ×16:** налаштувати `@typescript-eslint/no-unused-vars` з `argsIgnorePattern`/`varsIgnorePattern: "^_"` і `ignoreRestSiblings`, прибрати `void`. Зайві параметри видалити там, де їх можна прибрати без зміни API.
- **Коментарі:**
  - прибрати коментарі, що переказують код (~230): `// Перевіряємо …`, `// Отримуємо …`, JSDoc-шапки на кшталт `/** Enum для типів атаки */`;
  - прибрати історичні нотатки (`CODE_AUDIT …`, «замінює ~94 catch-блоки»);
  - лишити лише неочевидне «чому».
- **Barrel-и:** прибрати з `index.ts` хуків і `lib/api/index.ts` реекспорти, які ніхто не імпортує з бочки. `useUpdateUnit` / `useUpdateUnitAny` звести в один.
- **Скрипти міграції іконок:** `migrate-{skill,spell,unit}-icons-to-supabase.ts` — якщо міграції виконані (на проді немає контенту, а локально нові картинки й так ідуть у Storage), видалити разом із їхніми записами в `package.json`. Інакше — спільний модуль.
- **Межі файлів:** Q1 не чіпає `app/campaigns/[id]/dm/battles/**`, `components/battle/setup/**`, `app/api/**/route.ts` (крім видалення імпортів мертвого коду) і кольори в компонентах.

### Q2 — доменна узгодженість (сервер і логіка)

- **D3 — константи:**
  - `BattleStatus` (const + тип), `CampaignStatus`;
  - використати наявний `CombatStatus`;
  - `DM_ACTOR = { actorId, actorName, actorSide }`;
  - `ParticipantSide` скрізь, `AttackType` замість `"melee"`/`"ranged"`.

  Замінити всі літерали в `lib/**`, `app/api/**`, `components/**`, крім файлів Q3 (див. межі).
- **D2:** один `isUp` / `isDown` (статус + HP) у `lib/utils/battle/participant`. 7 копій замінити. Наявний `isUp` у `abilities/engine/participants.ts` перейменувати на `isActive` (інша семантика).
- **D8:** `AttackPhaseError` → `BattleRuleError` / `BattleAccessError` напряму; `pipeline/compat-errors.ts` видалити. Тека `attack-and-next-turn` → `attack-phase` (або злити з `attack/`), з оновленням імпортів.
- **D7 (маршрути):**
  - `loadOwned(model, id, campaignId)` → `entity | NextResponse` (з `select`), щоб прибрати 23 повтори `findUnique` + `validateCampaignOwnership` + зайвих `if (!x)`;
  - `isDM` у `CampaignAccessResult`, щоб прибрати копії `members[0]?.role === CampaignRole.DM`;
  - `parseBody(schema, req)` → 400 на кривий JSON або Zod-помилку з однаковою формою `{ error: string, issues? }`;
  - спільні повідомлення про помилки українською в `lib/constants/api-errors.ts` (`Forbidden`, `Not found` тощо). Клієнт показує `error` — тексти мають бути людські.
- **Важкі `route.ts`** (`characters/route.ts`, `characters/[characterId]/route.ts`, `spells/import/route.ts`, `inventory/route.ts`, `pusher/auth/route.ts`) → тонкий route + сусідні handler-файли. Маппінг даних заклинань → `build-spell-data.ts`.
- **Дрібне в лозі:**
  - `PHYSICAL_DAMAGE_TYPES` → `lib/constants/damage.ts`;
  - `extractDamageDice` — одна реалізація;
  - назви рівнів заклинань — одна функція в `lib/constants/spells` (і для «Кола», і для «Рівня» — обери одну термінологію з тим, що бачить гравець у бою);
  - `SPELLCASTING_ABILITIES` + тип у `lib/constants/abilities`, без 4 оголошень;
  - `Race`-маппінг → `lib/utils/races/to-race.ts` (як `toUnit`);
  - крит-ефекти (`attack/critical.ts`) емітити як `StaticEffect`, а `legacy-active-effects.ts` видалити, якщо результат бою не змінюється. Інакше покрити тестом і лишити з поясненням.
- **Ключі TanStack:** фабрика `keys.ts` у кожному домені `lib/hooks/<domain>`. Інлайн-ключі (~100) замінити, назви уніфікувати (kebab-case).
- **Межі файлів:** Q2 не чіпає `app/campaigns/[id]/dm/battles/**`, `components/battle/setup/**`, `lib/hooks/battles/setup/**`, сторінки входу, `components/{common,hud}` і кольори в компонентах.

### Q3 — UI-дублікати й HUD-токени

- **D1 — налаштування бою new/edit:** одна `BattleSetupForm` (`components/battle/setup/`) + `useBattleParticipants(initial?)`, використана обома сторінками.
  - Видалити `Edit*`-копії карток і хуки-дублікати (`useEditBattleData` логіку злити);
  - типи `EditBattleCharacter` / `EditBattleUnit` / `SetupParticipant` злити з `SetupCharacter` / `SetupUnit` / `BattlePreparationParticipant`;
  - локальне `groupUnitsByRace` → `lib/utils/units/group-units`;
  - константи (`ParticipantSide` тощо) у цих файлах — тут, а не в Q2.

  Поведінка й тексти обох сторінок ті самі, включно з блоком «Баланс бою» пункту 15.
- **D5:**
  - `PageHeader` + 4 обгортки → прямо `HudPageHeader`; обгортки, що містять лише розмітку, видалити;
  - `FormCard` → `HudFormPage` / `HudForm` у `MainSkillEditForm` і `RaceEditForm`, потім видалити;
  - `FormField` злити з `LabeledInput`;
  - `metalClass` / `SpellTier` → `components/hud`, реекспорти `components/battle/hud` для HUD-примітивів прибрати й оновити імпорти.
- **D6:** `useRaceForm`, `useMainSkillForm` (як `useArtifactSetForm`). Артефакти без `router.refresh`, якщо інвалідація TanStack достатня.
- **D7 (UI):** вхід і реєстрація — один `GoogleAuthForm({ mode })` + `useGoogleOAuth`. Перевір, що `AuthCard` з пункту 11 уже частково це робить.
- **D4 — HUD-токени:**
  - зареєструвати кольори як Tailwind theme-токени (`--color-hud-muted`, `-gold`, `-ink`, `-bone`, `-line` #4a3c2c, `-field` #1a140f, `-rule` #3a2e22, `-danger` #d0705c, `-panel`);
  - codemod-ом замінити `text-[#8f8473]` → `text-hud-muted` тощо в усіх компонентах;
  - візуальна рівність (ті самі значення);
  - робити останнім у Q3, після інших правок, щоб не конфліктувати.
- **Дрібне UI:**
  - `DeleteAllButton({ count, nouns, description, onConfirm })` замість 6 копій (з `pluralUk`);
  - `HudStatChip` / `HudPill` у `components/hud/page` замість `Chip`, `StatChip`, `Fact`, CHIP-рядків;
  - іконки через `EntityIcon` (+ emoji fallback) замість `isValidImageSrc`, сирого `next/image` і `<img>`;
  - одна метал-мапа рівнів гілок у `components/hud`;
  - залишки shadcn `Card` у HUD-сторінках (`UnitAttack`, `SelectedSpellsList`, `CharacterHpPreview`; `SpellPrintCard` — лише друк, лишити);
  - `ReferenceSearchBar` → `HudPanel`;
  - колізія імен `ParticipantRow` (new vs scene) — перейменувати setup-версію.
- **Межі файлів:** Q3 не чіпає `lib/utils/**` (крім `group-units`) і `app/api/**`.

## Тести (розподілено)

- **Q2:**
  - `pusher/auth` — вже є з пункту 12, доповнити за потреби;
  - `api-auth`, `loadOwned`, `parseBody` (кривий JSON → 400);
  - маршрути join / members / main-skills / spells / artifact-sets / inventory / duplicate: 403 гравцю на DM-операціях;
  - крит-ефекти (`critical.ts`) до і після переходу на `StaticEffect`.
- **Q3:** `BattleSetupForm` (new і edit), `DeleteAllButton`, `GoogleAuthForm`.
- **Q1:** конфіг `knip` (`knip.json`) з ігноруванням `scripts/` і тестових фікстур; `pnpm exec knip` — 0 невикористаних файлів і залежностей.

## Додатково (з рев'ю пункту 13)

Оцінити `"sideEffects": ["*.css"]` у `package.json` (−18–20 KB на маршрут). Брати лише якщо порядок CSS і вигляд не змінюються; перевірка — порівняння зібраного CSS до і після. Це робить Q1.

## Перевірка

- `pnpm test:run && pnpm test:integration && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm simulate-battle` (числа simulate — ті самі).
- Після мерджу трьох потоків — opus-рев'ю і браузерна перевірка ключових сторінок (налаштування бою new/edit, бій, профіль, списки, форми, вхід) разом із відкладеною перевіркою пунктів 13 і 15.
