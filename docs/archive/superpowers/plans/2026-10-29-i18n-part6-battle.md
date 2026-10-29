# i18n частина 6: бій і залишки — план

> **Для виконавців:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Задачі 0 і 1 — першими й послідовно; далі хвилями, ≤ 3 одночасно (CPU). Одна задача ≈ одна сесія Sonnet (100–150k контексту), модель виконавця — **sonnet** для всіх задач. Кроки — чекбокси. Без per-task рев'ю; одне Opus-рев'ю в кінці.

**Goal:** бій (UI, лог, рушій, здібності, крит-ефекти, константи), бойові дії асистента й залишки ч.5 — на `next-intl` (`uk` слово в слово, повний `en`); лог перекладається в мові глядача; храповик на весь код; епік закрито.

**Architecture:** не-React код бою віддає `LogLine = string | TextRef` (повні ключі, вкладені `TextRef` у params), клієнт рендерить `useText()`/`formatText`. Лог — `BattleAction.log` у `battle_events.details.log` (без міграції), legacy `resultText` показується як є. Бойові ns вантажить `ExtendLocaleScope` у layout-ах сторінок бою (явне злиття з кампанійним скоупом); `abilityText`, `battleTerms` — у `CAMPAIGN_NAMESPACES`.

**Spec:** `docs/superpowers/specs/2026-10-29-i18n-part6-design.md` (рішення 1–10 — джерело правди). Правила — `docs/architecture/i18n.md`; рушій — `docs/architecture/{battle,abilities}.md`; зразок виконання — `docs/archive/superpowers/plans/2026-10-29-i18n-part5-large.md`.

## Global Constraints

- Лише worktree `/Users/silentfox/Work/dnd-tracker-t6`, гілка `feat/i18n-part6`; основну папку не чіпати; prod не чіпати; не пушити. Перед кожним git-кроком `git branch --show-current` (= `feat/i18n-part6`).
- Ключі англійські, camelCase; без масивів у JSON (списки — об'єкт `{ "1": …, "2": … }` + кількість у константі). `uk` = поточний текст слово в слово (плюралі не додаються, якщо їх не було; пунктуація й емодзі — як є); `en` — природний, ті самі ICU-плейсхолдери; плюралі `uk` `one/few/many/other`, `en` `one/other`.
- **Спільні файли править лише задача 0** (задача 1 — свій список, задача 11 — `eslint.config.mjs`/`i18n-exempt.json`/`i18n-migrated.json`/`scopes`): `lib/i18n/**` (крім нових тестів доменних задач `lib/i18n/__tests__/label-keys-<ns>.test.ts`), `global.d.ts`, `app/campaigns/**/layout.tsx`, `i18n-migrated.json`, `messages/*/{common,validation,errors,battleCommon,battleTerms}.json` (`battleTerms` після задачі 0 править лише задача 5), `messages/*/spells.json` (лише `fx.badges`/`fx.previewUnits`), `lib/constants/api-errors.ts`, `types/text.ts`. Доменна задача править лише файли зі свого списку + **свої** `messages/{uk,en}/<ns>.json` + `lib/i18n/__tests__/label-keys-<ns>.test.ts`. Потрібне щось у спільному файлі (новий `API_ERRORS`, ключ `common`/`battleCommon`) — у звіт, контролер додає у fix wave; до того — тимчасово `TextRef` на наявний ключ або рядок із `// TODO(i18n-part6)` у звіті.
- Чужий ns читати за повним ключем можна (`textRef("battleCommon.conditions.prone.label")`, `useTranslations()` + повний ключ), правити — ні.
- **Константи-підписи доменна задача не видаляє** (їх читають файли інших задач) — лише перестає читати у своїх файлах; поля без споживачів видаляє задача 11.
- **Типи-носії тексту розширює лише задача 1** (`LogLine` у `messages`, `DamageStep.label`, `ActiveEffect.label`, причини відмов, `describe*`, `BattleAction.log`). Доменні задачі змінюють **продюсерів** (рядок → `textRef(...)`), не споживачів. Якщо продюсер потребує нового поля — у звіт.
- Інваріанти бою (`CLAUDE.md`): `snapshot` → `snapshotHash` (лише через `saveBattle`), хід — лише `advanceTurn`, шкода → `applyDamageConsequences`, зняття ефектів — `removeEffects`, відповіді — `ClientBattleDelta`. Логіку рушія не змінювати — лише тексти й типи текстів; порядок кидків `rng` — без змін.
- Тексти для моделі — англійською в коді; сервер асистента — `caller.locale`, не `getRequestLocale` у діях. `throw new Error` інваріантів → англійською.
- Тести перевіряють ключі (мок `t("a")` → `"<ns>.a"`); тести рушія — текст через `logTextOf(action)`/`textOf(line)` (реальний `uk`-каталог, задача 1): `expect(action.resultText).toContain("промах")` → `expect(logTextOf(action)).toContain("промах")` — очікування не змінюються (це й перевірка «слово в слово»).
- Під час роботи — лише `pnpm test:related <файли>` / `pnpm test:changed`; повні `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit` — один раз контролер (lint/tsc > 10 хв — у фоні, `timeout 600000`).
- Інвентаризація: `python3 /private/tmp/claude-501/-Users-silentfox-Work-dnd-tracker/2e417044-c5ab-4c65-8c7b-cfad453283b3/scratchpad/cyr.py <dir…>` (з кореня worktree) або `rg -n "\p{Cyrillic}" <dir> -g '!**/__tests__/**'`; `pnpm i18n:extract <dir>` — чернетка JSON.
- `eslint-disable-next-line no-restricted-syntax -- <причина>` — лише для даних-конвенцій (legacy-розбір, регекси імпорту, кирилична розкладка клавіатури). Мінімум коментарів.
- **Інтеграція в одному worktree.** Задачі хвилі працюють паралельно в тому самому worktree на непересічних шляхах (перевірено в ч.4–5). Коміт — лише `git add <свої шляхи>` (не `-A`, не `.`), без `git stash`/`reset`/`checkout`/`restore` чужих файлів; `index.lock` — повторити через кілька секунд. Помилки `tsc`/тестів поза своїми шляхами (незавершена сусідня задача) — не лагодити, записати у звіт. Трейлер коміту: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

### Definition of Done (кожна задача)

1. `pnpm exec eslint <свої шляхи>` чисто (храповик уже діє — globs додала задача 0); `pnpm exec tsc --noEmit 2>&1 | grep -E "<свої шляхи>"` порожньо (фоном, якщо довго).
2. `rg -n "\p{Cyrillic}" <свої шляхи> -g '!**/__tests__/**'` → лише коментарі й задокументовані `eslint-disable`.
3. `pnpm test:run lib/i18n` — `parity`, свій `label-keys-<ns>` (кожен реєстр/enum і **кожен динамічний ключ** `t(\`…${x}\`)`/`textRef(\`…${x}\`)` — обидві мови), `server-namespaces`, `battle-scope-imports`.
4. `pnpm test:run lib/__tests__/client-entry-imports.test.ts` — клієнт без zod (хук із Zod-моделлю — поза barrel-ами entry-чанків).
5. Клієнтські Zod-помилки — `translateIssue(t, { message, params: issueParams(issue) })`.
6. ≥ 1 `renderWithIntl(ui, { locale, namespaces: [...] })` для `en` і `uk` (компонентні задачі) — без сирих ключів; для рушійних задач замість цього — `logTextOf` на `en` у ≥ 1 тесті.
7. `pnpm test:related <змінені файли>` зелений; звіт: відхилення від spec, запити до спільних файлів, кирилиця, що лишилась свідомо, розмір нових ns (raw KB).

## Reuse

Див. spec, «Reuse-аудит». Коротко: `TextRef` + `translateIssue`/`issueParams`/`useSheetLine`; `getTranslator`/`useTranslator`/`useFormatter`; `API_ERRORS` + `apiErrorJson`/`battleErrorResponse`/`BattleRuleError`; `gameTerms.*`, `abilityRegistry.*`, `spells.{costs,targeting,shapes,fx}`, `units.*`, `characters.archetypes.*`, `rules.*`, `common.{actions,form,states,dice,tabs}`, `assistant.*` + `resultLabel`; `COMPENDIUM_ERROR_KEYS`; `expectLabelKeys`, `renderWithIntl`, `makeT`, граф імпортів `client-api-errors`.

## Порядок і паралельність

| Хвиля | Задачі | Умова |
|---|---|---|
| A | **0** Каркас → **1** Модель тексту бою | послідовно |
| B | **2** Лог-ядро ‖ **5** Крит-ефекти й константи ‖ **7** Майстри | після 1 |
| C | **3** Дії 5e / стани / заклинання / лабіринт ‖ **4** Здібності ‖ **6** Сцена, HUD, лог-UI | після 1 (B не обов'язкова) |
| D | **8** Панель ДМ + UI лабіринту ‖ **9** Налаштування, список, dev ‖ **10** Асистент + залишки ч.5 | 8 після 3 (ключі станів/лабіринту), 9 після 5 (складність зустрічі), 10 після 2 |
| E | **11** Храповик на весь код, заміри, прибирання констант | після всіх |
| F | Після задач (контролер): прогін, Opus-рев'ю, fix wave, `/simplify`, docs, merge | — |

Файли задач 2–10 не перетинаються (межі нижче). Контролер може переставляти хвилі, тримаючи залежності D і ≤ 3 одночасно.

**Розмір** (символи кирилиці без коментарів / файли): 0 — ≈ 25 файлів + словники (≈ 6 тис. символів копії в JSON); 1 — ≈ 45 файлів (типи й споживачі, без продюсерів); 2 — 4,6 тис. / ≈ 60 + тести; 3 — 4,7 тис. / ≈ 35 + тести; 4 — 6,0 тис. / 17 + тести; 5 — ≈ 20 файлів (тексти вже в JSON); 6 — 2,8 тис. / ≈ 50; 7 — 1,7 тис. / ≈ 30; 8 — 2,4 тис. / ≈ 25; 9 — 3,7 тис. / ≈ 35 (з них 1,4 — dev англійською); 10 — 3,5 тис. / ≈ 25; 11 — ≈ 15 файлів.

---

### Task 0: Каркас (≈ 25 файлів, спільні)

**Files:**
- Modify: `lib/i18n/config.ts` (`NAMESPACES` += `abilityText, battleTerms, battleCommon, battle, battleWizards, battleDm, battleSetup, battleLog, battleActions`), `lib/i18n/scopes.ts` (`CAMPAIGN_NAMESPACES` += `abilityText, battleTerms`; новий `BATTLE_NAMESPACES = ["battleCommon","battle","battleWizards","battleDm","battleSetup","battleLog","battleActions"]`), `global.d.ts`, `i18n-migrated.json`, `messages/{uk,en}/{validation,errors,spells}.json`, `lib/constants/api-errors.ts`, `lib/i18n/__tests__/{server-namespaces,scope-size}.test.ts`.
- Create: `messages/{uk,en}/<9 ns>.json` (доменні — `{}`; `battleCommon`, `battleTerms` — заповнені), `lib/i18n/extend-locale-scope.tsx` (server), `lib/i18n/extend-messages.tsx` (`"use client"`), `app/campaigns/[id]/battles/layout.tsx`, `app/campaigns/[id]/dm/battles/layout.tsx`, `lib/i18n/__tests__/{battle-scope-imports,extend-messages,label-keys-battleCommon,label-keys-battleTerms}.test.ts(x)`.

**Сигнатури:**
```tsx
// lib/i18n/extend-locale-scope.tsx
export async function ExtendLocaleScope({ namespaces, children }: { namespaces: readonly Namespace[]; children: React.ReactNode }): Promise<JSX.Element>;
// lib/i18n/extend-messages.tsx — "use client"; merges with the outer provider (nested providers do not merge by default)
export function ExtendMessages({ messages, children }: { messages: AbstractIntlMessages; children: React.ReactNode }): JSX.Element;
```

**Словники (рішення 5–6 spec; uk копіює скрипт у scratchpad, не в репо):**
- `battleCommon`: `conditions.<key>.{label,description}` (з `CONDITION_5E_REGISTRY`), `coreActions.<key>` (`CORE_ACTION_REGISTRY.label`), `cunningStrike.<effect>`, `attackKinds.<kind>` (`ATTACK_KIND_LABELS`), `actionKinds.<type>` (`BATTLE_ACTION_LABELS` + `hazard`, `event`), `weather.<kind>`, `actors.{system,dm}`.
- `battleTerms`: `crits.{attack,save}.{success,fail}.<id>.{name,description,flavor.<n>}` (з `critical-effects.ts`, `save-critical-effects.ts`), `encounterDifficulty.<k>` (`experience.ts`).
- `spells.fx.badges.*` (написи анімацій `components/battle/fx/animations/*`: «−3 атака», «+атака», «−2 КБ», «−25% шкоди», «+КБ», «−2 мораль» — як ICU з `{value}`, де є число), `spells.fx.previewUnits.*` (`lib/utils/battle/fx/preview-units.ts`).
- `validation.hexColor`, `validation.image.{tooLarge,compressFailed}` (`image-resize.ts`).

**`API_ERRORS`:** `rg -n "\p{Cyrillic}"` по `errorResponse\(|ContentError\(|BattleOperationError\(|BattleAccessError\(|NextResponse\.json\(\{ ?error|throw new \w*Error\(` у `lib/server/battles/**`, `app/api/campaigns/[id]/battles/**`, `lib/supabase/*-storage.ts`, `lib/server/templates/**`, `lib/server/battles/record-service.ts`. Лише **суто серверні** повідомлення (маршрути, сервіси) → `API_ERRORS.<UPPER_SNAKE>` = `"errors.<camelKey>"`, `uk` слово в слово, `en`; наявний еквівалент (`FORBIDDEN`, `RATE_LIMITED`…) — використати. Причини з чистого рушія (`rejectAction`, `fail`, `availability`) — **не сюди** (вони клієнтські, задачі 2–3). Підключення в коді — доменні задачі; у звіт — мапа «файл:рядок → ключ».

**`i18n-migrated.json` (+=):**
```
components/battle/**, app/campaigns/*/battles/**, app/campaigns/*/dm/battles/**, app/dev/**
lib/hooks/{battle,battles}/**, lib/utils/battle/**, lib/server/battles/**, lib/utils/abilities/**
lib/server/assistant/actions/{battles,battle-actions,battle-coverage}.ts
lib/constants/{critical-effects,save-critical-effects,spells,abilities,skills,artifacts,damage,battle,battle-weather,experience,classes,main-skills,ungrouped,choices,hero-archetypes,monster}.ts
lib/supabase/**, lib/utils/common/**, lib/utils/items/**, lib/schemas/{battles,common}.ts, lib/redis.ts, lib/server/templates/**, lib/cache/**, types/**
```
Перевірка: `pnpm exec eslint "components/battle/wizards/attack/RollStep.tsx"` дає помилки храповика (навмисно червоний до задач 2–10).

- [ ] **Step 1:** `rg` імпортів `@/components/battle`, `@/lib/hooks/battle(s)`, `@/lib/utils/battle/(view|flows)` з `app/**`/`components/**` поза бойовими сегментами → список дозволених (`fx/{dice,runtime,preview}`, `fx/fx.css`, `lib/utils/battle/fx/*`) у тест `battle-scope-imports` (обхід графа — спільна функція з `client-api-errors`, винести в `lib/i18n/test/import-graph.ts`, якщо ще не винесена); падає, якщо досяжний файл містить ключі з префіксами `BATTLE_NAMESPACES`.
- [ ] **Step 2: Failing tests** — `server-namespaces` (+ `BATTLE ∩ SERVER = ∅`, `BATTLE ∩ CAMPAIGN = ∅`, жоден `LocaleScope`/`ExtendLocaleScope` не вантажить серверні ns); `scope-size` — два `it.each`: campaign і campaign ∪ battle (< 100, лог обох); `extend-messages`: всередині `ExtendMessages` компонент читає `common.actions.back` і `battle.*`-ключ; `label-keys-battleCommon` (усі `CONDITION_5E_KEYS`, ключі `CORE_ACTION_REGISTRY`, `CUNNING_STRIKE_EFFECTS`, `AttackType`, `BattleActionType`, `WEATHER_KINDS`), `label-keys-battleTerms` (усі id крит-таблиць × `name/description/flavor.1..flavorCount`, складність) → FAIL → реалізація → PASS.
- [ ] **Step 3:** ns, scopes, `global.d.ts`, layout-и з `ExtendLocaleScope`; словники (uk — скриптом з констант, `en` — переклад); `spells.fx.*`, `validation.*`; `API_ERRORS` + `errors.json`; `pnpm test:run lib/constants/__tests__/api-errors-coverage.test.ts lib/i18n` PASS.
- [ ] **Step 4:** `i18n-migrated.json`; `scope-size` до ч.6 — у звіт. **Commit** `feat(i18n): part 6 scaffold — battle scope, battle namespaces, dictionaries, ratchet globs, API errors`.

### Task 1: Модель тексту бою (≈ 45 файлів; лише типи й споживачі)

**Мета:** розширити носії тексту і перевести **всіх споживачів** на рендер, не змінюючи продюсерів (вони й далі пишуть рядки — `LogLine` включає `string`). Після задачі все працює як раніше, а нові події вже можуть писати `log`.

**Files:**
- Create: `types/text.ts` (`TextArg`, `TextRef`, `LogLine`; `types/choices.ts` ре-експортує `TextRef`/`TextParams`), `lib/i18n/text-ref.ts` (`textRef`, `formatText`), `lib/i18n/use-text.ts` (`useText`), `lib/i18n/test/text.ts` (`textOf`, `logTextOf`; `import.meta.glob("@/messages/*/*.json", { eager: true })` → `createTranslator` з `use-intl/core`, синхронно), `lib/utils/battle/log/{lines,legacy,format}.ts` (+ `__tests__`).
- Modify (типи): `types/battle.ts` (`BattleAction.log?: LogLine[]`; `actionDetails.damageRows?`, `criticalEffect` — `name/description` optional + `source`, `flavorIndex?`; `DamageStep.label: LogLine`; `ActiveEffect.label?: LogLine`; `hazard.label: LogLine`), `lib/utils/abilities/registry/effects/types.ts` (`messages: LogLine[]`), сигнатури `describe*`/`describeTrigger`/`describeAbility`/`abilitySummary` → `LogLine` (тіла не змінюються), `lib/utils/abilities/engine/core/run-abilities.ts` (тип `messages`), типи причин (`availability`, `spell-targeting` `fail`, `cunning-strike`, `validation/*`) → `LogLine`.
- Modify (лог): `lib/utils/battle/store/event-mapping.ts` (`details.log` ↔ `BattleAction.log`; `resultText: action.log ? "" : action.resultText`), `lib/utils/battle/common/new-action.ts`, `lib/utils/battle/view/{log-entry,log-format,damage-breakdown}.ts` (працюють з `actionLines`; legacy-гілка — у `log/legacy.ts`), `lib/server/battles/read-service.ts` (`lastEvents` → `formatBattleLog(enT, …)`), `scripts/sim/{battle-sweep,simulate-battle}.ts` (рендер `uk` через `formatBattleLog`).
- Modify (споживачі, `rg -l "resultText|describeEffect|describeAbility|describeTrigger|abilitySummary|\.messages\b|damageSteps|criticalEffect|reason\b"` поза продюсерами): `components/battle/{log/*,scene/LastActionTicker,scene/BattleOverBanner,overlays/ActionResultCard,dm/DmBattleLog,hud/EffectLine}.tsx`, `components/abilities/{AbilitySummary,EffectCard}.tsx`, `components/{skills/list/SkillCard,artifacts/ArtifactCard,units/list/UnitCard,artifact-sets/*}.tsx` (якщо читають описи), `lib/utils/battle/view/effect-summary.ts`, `lib/cache/{info-reference,artifact-reference}.ts`, `lib/utils/campaigns/info-reference.ts`, `lib/utils/units/to-unit.ts`, `lib/utils/items/item-stats.ts` — **лише** рендер (`useText()`/`formatText(t, x)`), без ключів у JSON.

**Сигнатури:**
```ts
// types/text.ts
export type TextArg = string | number | TextRef;
export interface TextRef { message: string; params?: Record<string, TextArg> }
export type LogLine = string | TextRef;               // string = legacy/content, shown as is
// lib/i18n/text-ref.ts
export function textRef(message: AppMessageKey, params?: Record<string, TextArg>): TextRef;
export function formatText(t: Translator, line: LogLine): string; // nested refs first, string params never translated
// lib/i18n/use-text.ts ("use client")
export function useText(): (line: LogLine) => string;
// lib/utils/battle/log/lines.ts
export function actionLines(action: BattleAction): LogLine[];  // log ?? legacyLines(resultText)
export function formatBattleLog(t: Translator, action: BattleAction, sep?: string): string; // " | " join
// lib/i18n/test/text.ts
export function textOf(line: LogLine, locale?: Locale): string;
export function logTextOf(action: BattleAction, locale?: Locale): string;
```

- [ ] **Step 1: Failing tests** — `formatText`: вкладений `TextRef`, рядок як є, рядковий параметр `"rest"` не перекладається, невідомий ключ → як є; `legacy`: golden — `logEntryView` для 5 справжніх `resultText` (атака з тригерами, заклинання, мораль, перемога з досвідом, дія ДМ) дає те саме, що до зміни; `event-mapping`: `log` → `details.log`, `resultText = ""`, round-trip; legacy-подія без `log` → `actionLines` = старі сегменти; `client-delta` несе `log`; `logTextOf` на події з `log: [textRef("battleCommon.actors.dm")]` дає «ДМ» (uk) / «DM» (en) → FAIL.
- [ ] **Step 2:** типи, рендер у споживачах (`useText` у компонентах, `formatText` у не-React), `read-service`, скрипти sim. Продюсери **не чіпати**.
- [ ] **Step 3:** `pnpm test:related` по змінених файлах + `pnpm test:run lib/utils/battle lib/utils/abilities` (тут дозволено: перевірка, що розширення типів нічого не зламало). **Commit** `refactor(i18n): battle text model — LogLine, structured log, renderers in consumers`.

### Task 2: Лог-ядро (≈ 4,6 тис. / 60) — ns `battleLog`

**Files:** `lib/utils/battle/{attack,attack-phase,damage,resistance,turn,morale,death-saves,concentration,saves,pipeline,store,summon,maneuvers,participant,proficiency,grid,validation,crit-choice,checks,artifact-sets,common,client,dice-record.ts}/**`, `lib/utils/battle/view/{log-format,log-entry,damage-breakdown,damage-step,damage-taken,volley-results,visibility,crit-outcome,retaliation,downed-heroes}.ts`, `lib/utils/battle/log/**` (після задачі 1), `lib/server/battles/{mutations,balance}/**`, `lib/server/battles/{run-mutation,guards,http,operations,pipeline-deps,dice,read-battle,record-operation}.ts` + їхні `__tests__`; `messages/{uk,en}/battleLog.json`; `label-keys-battleLog.test.ts`.
**Не чіпає:** `lib/utils/battle/{actions,conditions,spell,modes}/**` (3), `lib/utils/abilities/**` (4), `lib/server/battles/{action-service,read-service,execute-battle-operation,record-service}.ts` (10), `view/{health,summary,effect-summary,queue,…}` (6), `flows/**` (7).

**Рішення:**
- Кожен `resultText: [...].join(" | ")` → `log: [...]` з `textRef("battleLog.<area>.<event>", { attacker, target, damage, … })`; `messages: string[]` → `LogLine[]`; заголовок тригерів — `battleLog.triggers.<kind>` (без регексу).
- `damage/impl.ts`: джерела бонусів (`skill: "Бонус зі скілів"` …) → `battleLog.damage.sources.<k>`; рядки розкладки → `damageRows` (`{ label: LogLine, value, tone }`) замість рядка `damageBreakdown`; `DamageStep.label` → `textRef("battleLog.damage.steps.<k>")` для сталих, назва вміння/артефакту — рядок (контент).
- Крит у лозі: `criticalEffect = { id, type, source, flavorIndex }` без тексту; рядок «Критичне влучання — {effect}» — `textRef(..., { effect: textRef("battleTerms.crits.attack.success.<id>.name") })`.
- Перемога/поразка/досвід (`turn/victory.ts`), мораль, смерть, концентрація, рятунки, приклик, дії ДМ у мутаціях (`patch-participant`, `conditions`, `map-terrain`, `unit-control`, `crit-choice` «ДМ скасував дію», `rollback`…) → `battleLog.*`.
- Причини відмов цих каталогів (`rejectAction("…")`, `BattleRuleError(code, "…")`) → `battleLog.reject.*` (клієнтський ns, сервер перекладає повним ключем); `API_ERRORS` із задачі 0 — лише для серверних повідомлень мутацій.
- Тести: `action.resultText` → `logTextOf(action)` без зміни очікувань; нові рядки — `toEqual(textRef(...))`, де це простіше.

- [ ] **Step 1:** extract → `battleLog.json` (uk слово в слово) → тести на `logTextOf` червоні там, де продюсер уже змінено, — FAIL/PASS цикл по підкаталогах (attack → damage → turn → решта → мутації). `label-keys-battleLog`: джерела бонусів, кроки шкоди, види тригерів, `BattleRuleCode`.
- [ ] **Step 2:** `en`; ≥ 1 тест `logTextOf(action, "en")` для атаки з критом і шкодою. **Step 3:** DoD + `pnpm battle-sweep` **не** запускати (контролер). **Commit** `feat(i18n): battle log core as structured lines (attack, damage, turn, DM actions)`.

### Task 3: Дії 5e, стани, заклинання, лабіринт (≈ 4,7 тис. / 35) — ns `battleActions`

**Files:** `lib/utils/battle/{actions,conditions,spell,modes}/**` + `__tests__`; `messages/{uk,en}/battleActions.json`; `label-keys-battleActions.test.ts`.
**Не чіпає:** `components/battle/modes/**` (8), `lib/server/battles/mutations/{maze,maze-mark,core-action}/**` (2; ключі лабіринту для мутацій — читати повним ключем `battleActions.maze.*` після цієї задачі, у звіт).

**Рішення:**
- `conditions/registry.ts`: `label`/`description` — **не видаляти** (задача 11), рушій і UI беруть `battleCommon.conditions.<k>.*` (тексти вже в JSON); ефект стану — `ActiveEffect.label = textRef("battleCommon.conditions.<k>.label")`.
- `actions/{grapple,run,legendary,legendary-options,lair,availability,reaction,opportunity,movement,effects}.ts`: лог → `battleActions.<action>.*`; причини → `battleActions.reject.*`; назви ефектів «Ухилення», «Відхід», «Допомога», «Схований» → `ActiveEffect.label`.
- `spell/**`: `spell-targeting.ts` `fail("…")` → `textRef("battleActions.spell.target.<k>")`; `cast/*`, `long-cast.ts`, `power.ts`, `caster-dice.ts` — лог/причини; «Концентрація: {spell}» → `label` з `{spell}` (назва — контент).
- `modes/maze/texts.ts` — об'єкт рядків/функцій → `MAZE_TEXT` ключів (`battleActions.maze.<k>`), функції `escaped(name)` → `textRef(..., { name })`; споживачі в мутаціях і UI — у звіт (2, 8 читають повним ключем).

- [ ] **Step 1–3** як у задачі 2 (`logTextOf` у тестах, `label-keys-battleActions`: причини, `MAZE_TEXT`, події лабіринту, legendary-опції; ≥ 1 `en`). **Commit** `feat(i18n): 5e actions, conditions, spell casting and maze engine texts as keys`.

### Task 4: Здібності — описи й повідомлення рушія (≈ 6,0 тис. / 17) — ns `abilityText` (+ `abilities`, `abilityRegistry`)

**Files:** `lib/utils/abilities/**` (`registry/**`, `engine/**`, `read.ts`, `build/immunities.ts`, `summary.ts`, `target-rules.ts`) + `__tests__`; `messages/{uk,en}/{abilityText,abilities,abilityRegistry}.json`; `label-keys-abilityText.test.ts`.
**Не чіпає:** `components/abilities/**` (рендер уже переведено задачею 1; нові підписи UI — ні), `lib/utils/battle/**`.

**Рішення (spec, рішення 4):**
- `describeEffect`/`describeFlag`/`describe<Kind>`/`describeTrigger`/`describeAbility` → `textRef("abilityText.<group>.<k>", params)`; вкладені підписи — `textRef("abilityRegistry.options.<field>.<v>")`, `textRef("gameTerms.damageTypes.<t>")`, `textRef("gameTerms.monster.senses.<s>")`; числа/кубики/відсотки — параметри; `amountLabel`/`*Label`-хелпери повертають `TextArg`.
- `EffectApplyResult.messages` у `registry/effects/*.ts` (apply) і `engine/core/run-abilities.ts` → `abilityText.log.*`.
- `read.ts` issues → `abilities.read.{partialInvalid,columnInvalid}`; `build/immunities.ts`: регекси — `disable -- import data`, нотатка «Імунітет: {text}» → ключ, «Імунітети» (назва синтетичного вміння) → `textRef` у `name`? — **ні**: `name` — рядок; використати англійський технічний `id` + `label` опису (у звіт, якщо UI показує `name`).
- uk-`label`/`fields`/`options` у `registry/*`: якщо UI читає `abilityRegistry.*` (перевірити `label-keys-abilityRegistry`) і інших людських споживачів немає — видалити; текст для моделі (OpenAPI/AI-тули, `rg` у `lib/server/content`, `lib/ai`) — англійською.
- Тести реєстру: очікування описів — `textOf(describeEffect(e))` з тими самими uk-рядками.

- [ ] **Step 1:** `label-keys-abilityText`: кожен `kind` ефекту, кожен `flag`, кожна подія тригера, умова, ліміт (обхід реєстрів) → FAIL. **Step 2:** реалізація + `en`. **Step 3:** `renderWithIntl` `en` і `uk` — `AbilitySummary` з `["common","gameTerms","abilityRegistry","abilityText"]`. **Step 4:** DoD. **Commit** `feat(i18n): ability descriptions and engine messages as keys`.

### Task 5: Крит-ефекти й бойові константи (≈ 20 файлів) — ns `battleTerms` (+ `gameTerms`, `spells`, `characters`, `rules` — лише за потреби)

**Files:** `lib/constants/{critical-effects,save-critical-effects,spells,abilities,skills,artifacts,damage,battle,battle-weather,experience,classes,main-skills,ungrouped,choices,hero-archetypes,monster}.ts` + `lib/constants/__tests__`; `components/rules/sections/CriticalsSection.tsx`; людські не-UI споживачі констант поза бойовими каталогами (`rg` по кожній константі; напр. `lib/utils/characters/sheet/rest-block.ts`, `lib/server/characters/core/experience-handler.ts`); `messages/{uk,en}/battleTerms.json` (+ `gameTerms`/`characters`/`rules`/`spells` лише нові ключі, якщо бракує); `label-keys-battleTerms.test.ts` (доповнити).
**Не чіпає:** `lib/utils/battle/**`, `components/battle/**` (вони читають ключі самі), `lib/constants/import-aliases.ts`.

**Рішення (spec, рішення 5–6):**
- Крит-таблиці: додати `flavorCount`; `name`/`description`/`flavor` **не видаляти** (задача 11); `CriticalsSection` → `battleTerms.crits.attack.*`; `DOUBLE_DAMAGE_NAME` → ключ за `id`.
- Для кожного uk-поля — класифікація (spec, рішення 6) з таблицею «константа → рішення» у звіті. `BATTLE_STATUS_LABEL` — видалити зараз (без споживачів). `SPELL_CIRCLE_ORDINALS`/`CANTRIP_NAME` — дані (`disable -- spell group names stored in the DB`). `HERO_ARCHETYPES.className` — перевірити, чи пишеться в БД (`rg "className"` у `lib/utils/characters/generate`, `lib/server/characters`): так — контент у локалі автора через `characters.archetypes.<k>` у момент створення; `name` — показ через ключ.
- Підписи, які читає модель (`.describe()`, AI-тули) — англійською/id.

- [ ] **Step 1:** таблиця класифікації (звіт) → тести (`label-keys-battleTerms` + `CriticalsSection` на ключі) → FAIL. **Step 2:** реалізація. **Step 3:** `renderWithIntl` `en`/`uk` — `CriticalsSection` (`["common","rules","battleTerms"]`). **Step 4:** DoD. **Commit** `feat(i18n): critical effects and battle label constants as keys`.

### Task 6: Сцена, HUD, учасники, оверлеї, мапа, FX, лог-UI (≈ 2,8 тис. / 50) — ns `battle`

**Files:** `components/battle/{scene,turn,participants,overlays,map,hud,log,crit-choice,fx,audio}/**` + `__tests__`; `lib/hooks/battle/**` крім `{useSpellBook,useAttackWizard,useBattleSpellLibrary,useSpellMapTargeting,useDmParticipantActions,useLegendaryAction,mock-participants,useBattleMapPlayground}.ts`; `lib/hooks/battles/useBattleAction.ts`; `lib/utils/battle/view/{health,summary,effect-summary,queue,personal-effects,scene-maps,hero,knowledge,turn-exhausted,my-turn-key,rollback,index}.ts`, `lib/utils/battle/fx/**`; `app/campaigns/[id]/battles/[battleId]/**`, `app/campaigns/[id]/dm/battles/[battleId]/**` (крім `layout.tsx`); `messages/{uk,en}/battle.json`; `label-keys-battle.test.ts`.
**Не чіпає:** `components/battle/{wizards,dm,modes,setup,list,dev}/**`.

**Рішення:**
- `TurnCountdown`, `ActionGrid`, `CoreActionsDialog` (підписи дій — `battleCommon.coreActions.*`), `ReadiedAttackButton`, `MyTurnControls`, `MapTerrainToolbar`, `MapWeatherPicker` (`battleCommon.weather.*`), `BattleTopBar`, `DesktopBattleLayout`/`MobileBattleLayout`, `ResultOverlay`/`BattleResultScreen`/`BattlePreparationView`/`ActionResultCard`, `ParticipantDetails`/`MyHeroPanel`/`ReservePanel` → `battle.*`; кнопки й стани — `common.*`.
- `CritChoiceDialog` — назви/описи ефектів `battleTerms.crits.*`, «Випадково»/«Скасувати дію» — `battle.critChoice.*`.
- FX-анімації: написи бейджів отримують переклад із React-шару (`BattleFxLayer`/`SpellBattlePreviewPanel` передають `labels` з `spells.fx.badges.*` у `playFx`), canvas-модулі ключів не читають; `stage.ts` `throw` → англійською.
- view-хелпери (`health.ts` стани здоров'я, `queue.ts`, `summary.ts`, `effect-summary.ts`) → `LogLine` з `battle.view.*`.
- Тости хуків (`useBattleScene`, `usePusherBattleSync`, `usePlayerTurn`, `useCritPause`, `useBattleAction` 409) → `battle.notify.*`.

- [ ] **Step 1–4** як у задачі 4; `label-keys-battle`: стани здоров'я, погода, тости; `renderWithIntl` `en`/`uk` — `BattleTopBar` і `LogEntryCard` з новою подією (`log`) та legacy-подією, `namespaces: [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES]`. **Commit** `feat(i18n): battle scene, HUD, participants, overlays, map and log UI on next-intl`.

### Task 7: Майстри атаки й заклинань (≈ 1,7 тис. / 30) — ns `battleWizards`

**Files:** `components/battle/wizards/**` + `__tests__`; `lib/utils/battle/flows/**`; `lib/hooks/battle/{useSpellBook,useAttackWizard,useBattleSpellLibrary,useSpellMapTargeting}.ts`; `messages/{uk,en}/battleWizards.json`; `label-keys-battleWizards.test.ts`.

**Рішення:** `RollStep` (`MODES` → `battleWizards.attack.rollModes.<m>`), `SummaryStep`, `TargetStep`, `SpellCastDialog`, `CastSourceSelect`, `SlotSelect`, `SpellAimPanel`, `SpellSummary`, `BonusActionPicker` («Атака N/M», «Атака другою рукою»), `AuraZonePicker`, `AbilityAimPanel`; `flows/{spell-costs,spell-grants,spell-pick,spell-flow-types,attack-flow,attack-intent,die-input}.ts` — підписи/причини → `LogLine` (`battleWizards.flow.*`); вартість дії — `spells.costs.*` (reuse), Підступний удар — `battleCommon.cunningStrike.*`; причини з рушія (`spell-targeting`) уже рендеряться (задача 1). «Дію скасовано ДМом» → `battleWizards.critCancelled`.

- [ ] **Step 1–4** як у задачі 4; `renderWithIntl` `en`/`uk` — `RollStep` і `SlotSelect`. **Commit** `feat(i18n): attack and spell wizards on next-intl`.

### Task 8: Панель ДМ і UI лабіринту (≈ 2,4 тис. / 25; після 3) — ns `battleDm`

**Files:** `components/battle/{dm,modes}/**` + `__tests__`; `lib/hooks/battle/{useDmParticipantActions,useLegendaryAction}.ts`; `messages/{uk,en}/battleDm.json`; `label-keys-battleDm.test.ts`.

**Рішення:** `DmQuickActionsPanel`, `DmParticipantRow`, `ConditionsDialog` (`battleCommon.conditions.*`), `CompleteBattleDialog`, `LegendaryActionDialog`, `DmRevivePrompt`, `DmBattleLog`, `dialogs/{AddParticipant,DmCasterPicker,AwaitingDm,ChangeHp}Dialog`; `modes/maze/{MazeToolbar,MazeMarkPicker,MazeGenerateDialog,MazeReshuffleDialog,MazeDarkScreen,MazeCountsFields,ui}` → `battleDm.maze.*`; тексти рушія лабіринту — `battleActions.maze.*` (задача 3) за повним ключем.

- [ ] **Step 1–4** як у задачі 4; `renderWithIntl` `en`/`uk` — `ConditionsDialog` і `MazeToolbar`. **Commit** `feat(i18n): DM battle panel and maze UI on next-intl`.

### Task 9: Налаштування бою, список, dev (≈ 3,7 тис. / 35; після 5) — ns `battleSetup`

**Files:** `components/battle/{setup,list,dev}/**` + `__tests__`; `lib/hooks/battles/**` крім `useBattleAction.ts`; `lib/hooks/battle/{mock-participants,useBattleMapPlayground}.ts`; `lib/utils/battle/balance/**`; `lib/schemas/battles.ts`; `app/campaigns/[id]/dm/battles/{page.tsx,page-client.tsx,new/**}`; `app/dev/**`; `messages/{uk,en}/battleSetup.json`; `label-keys-battleSetup.test.ts`.

**Рішення:**
- `BattleSetupForm`, `BattleFormMap`, `BattleFormBasicInfo`, `AutopickCard`, `SidePanelCard`, `SetupParticipantRow`, `CharactersListCard`/`UnitsListCard`, `BalanceSummary`/`XpBalanceSummary` (`battleTerms.encounterDifficulty.*`), `BattleListCard`, `BattleSections`, `useBattleListSections` → `battleSetup.*`; `DeleteAllButton noun` («битви», ICU-плюраль кількості).
- `lib/schemas/battles.ts` → `battleSetup.validation.*` + `params`; показ — `translateIssue` (рішення 8 spec).
- Dev (`components/battle/dev/**`, `app/dev/**`, моки) — **англійські літерали без ns** (spec, рішення 8); `metadata.title` — англійською.

- [ ] **Step 1–4** як у задачі 4; `renderWithIntl` `en`/`uk` — `BalanceSummary` і `BattleListCard`. **Commit** `feat(i18n): battle setup, battle list on next-intl; dev tools in English`.

### Task 10: Асистент (бій) + залишки ч.5 (≈ 3,5 тис. / 25; після 2) — ns `assistant`, `compendium`, `compendiumReport`, `campaigns`

**Files:** `lib/server/assistant/actions/{battles,battle-actions,battle-coverage}.ts`, `lib/server/battles/{action-service,read-service,execute-battle-operation,record-service}.ts`; `lib/server/compendium-import/{feature-resolution,http,parse,types}.ts`, `lib/server/compendium-import/{adapt,adapters}/**`, `lib/constants/compendium-import.ts`, `lib/utils/compendium-import/{flow,file.worker}.ts`; `lib/supabase/{image-storage,image-bucket-storage}.ts`, `lib/utils/common/{image-resize,dice}.ts` + споживачі `image-resize` (`rg`), `lib/utils/items/item-stats.ts`, `lib/schemas/common.ts`, `lib/redis.ts`, `lib/server/templates/**`, `lib/hooks/world/useMapDrawing.ts`, `lib/utils/scenario/section-icon.ts`, `types/import.ts`; `lib/utils/characters/generate/{names,names.uk,names.en}.ts`; `lib/i18n/request-locale.ts` (лише REST-Bearer, погоджено як виняток зі спільних файлів); `messages/{uk,en}/{assistant,compendium,compendiumReport,campaigns}.json`; тести.

**Рішення (spec, рішення 7–8):**
- Асистент: `title`/`description` → англійською; handoff `reason` → `assistant.handoffs.battle{CritChoice,MapBackground}`; `actionResult("battles", resultLabel(locale, "battle"))`; `summary`/`warnings`/`affected[].name` → `assistant.battles.*` у `caller.locale`; `lastEvents` — уже англійський (задача 1).
- Компендіум: `AdapterContext.t` (`getTranslator(locale, "compendiumReport")`, `locale` — один раз у `http.ts`), похідні тексти → `compendiumReport.derived.*`; file-level `eslint-disable` прибрати, регекси — `disable-next-line -- import data`; `COMPENDIUM_ERROR_KEYS` += усі коди (`rg 'fail\("|CompendiumError\("|error: "'`), `$@N` → `{position}`.
- Зображення: серверні → `API_ERRORS` (задача 0), клієнтський `image-resize` → `validation.image.*`; `schemas/common.ts` → `validation.hexColor`; `item-stats` `.describe()` → англійською; `redis.ts` → англійською; `templates/**` → `API_ERRORS`/`campaigns.sync.*`; hotkeys, `section-icon`, `dice.ts` (кирилична `к`/`д` у розборі кубиків), `types/import.ts` → `disable -- data` (якщо ще ні).
- Імена: `NameTable.id`; раса → `id` за regex обох мов; тест: uk-назва раси «Темний ельф» з `locale: "en"` дає не-generic англійське ім'я; детермінізм `uk` за seed — без змін.
- REST-Bearer: `getRequestLocale()` — Bearer без cookie/AL → `users.locale` власника (`cache()`), далі `en`; тест `request-locale`. Якщо prisma потрапляє в граф `proxy.ts`/клієнта — відкотити, записати у звіт як «відкладено».

- [ ] **Step 1: Failing tests** — бойова дія асистента `en`/`uk` (`vi.unmock` перекладача): summary/handoff перекладені; `INVALID_TEXT` з позицією → текст обома мовами; адаптер із `t` `en` пише англійське «Origin»; імена; REST-Bearer. **Step 2–3:** реалізація, DoD (без `renderWithIntl` — серверна задача; `server-namespaces` зелений). **Commit** `feat(i18n): assistant battle actions, part 5 leftovers (compendium derived texts, worker codes, uploads, names)`.

### Task 11: Храповик на весь код, заміри, прибирання (≈ 15 файлів; після всіх)

**Files:** `eslint.config.mjs`, `i18n-exempt.json` (новий), `i18n-migrated.json`, `eslint/__tests__/cyrillic-rule.test.ts`, `lib/i18n/__tests__/scope-size.test.ts` (лише лог), константи з полями без споживачів (`critical-effects`, `save-critical-effects`, `conditions/registry`, `battle`, `cunning-strike`, `maze/texts`…), `lib/utils/battle/log/legacy.ts` (лише перевірка).

- [ ] **Step 1:** `eslint.config.mjs` — блок правила кирилиці: `files: ["**/*.{ts,tsx}"]`, `ignores` з `i18n-exempt.json` (spec, рішення 9); `i18n-migrated.json` лишається історією або видаляється разом із читанням у конфігу (рішення — простіше); тест `cyrillic-rule`: файл поза exempt ловиться, `scripts/**` — ні. `pnpm lint` (фоном) → кожна помилка: ключ (у звіт власнику ns — контролер) або `disable -- <причина>`.
- [ ] **Step 2:** `rg` споживачів текстових полів констант (`name`, `description`, `flavor`, `label`) — без споживачів видалити; `BATTLE_*_LABELS` тощо.
- [ ] **Step 3:** заміри у «Хід виконання»: `scope-size` (campaign, campaign+battle, uk/en); розмір нових подій — `battle-sweep` на prod-копії (`./scripts/db/prodcopy-db.sh`, `DATABASE_URL=…/prodcopy pnpm battle-sweep`), середній `octet_length(details::text) + octet_length("resultText")` по `battle_events` нових боїв проти старих; > +30 % — у звіт (spec, рішення 2). Перелік усіх `eslint-disable … no-restricted-syntax` у нетестовому коді з причинами — у звіт (піде в `i18n.md`). **Commit** `chore(i18n): ratchet covers all code, exempt list, unused label fields removed`.

---

## Review Focus (фінальне Opus-рев'ю)

1. З `NEXT_LOCALE=en` без сирих ключів: список боїв, налаштування бою (мапа, баланс), сцена гравця й ДМ (desktop/mobile), майстри атаки й заклинань, базові дії, легендарні дії/лігво, стани, крит-діалог і банер, лабіринт, результат бою, лог (нові й legacy-записи). Той самий бій у вкладках `uk` і `en` — лог кожною своєю мовою.
2. `uk` слово в слово (тести рушія через `logTextOf` не змінювали очікувань; diff тестів — лише заміна доступу); `en` — природний.
3. Інваріанти бою: логіка рушія й порядок `rng` не змінені; `snapshotHash` — лише `saveBattle`; `ClientBattleDelta` несе `log`; `resultText = ""` для нових подій; legacy-розбір ізольований у `log/legacy.ts`.
4. Скоупи: бойові ns лише на сторінках бою (`ExtendLocaleScope`), `battle-scope-imports` зелений, `scope-size` обох скоупів < 100 з цифрами; серверні ns не в клієнті; бандл без zod.
5. Описи здібностей: рушій читає лише дані (`collectModifiers`/`runAbilities`/`read.ts`); `info-reference` кешує `TextRef`; картки на сторінках кампанії (поза боєм) — перекладені.
6. Асистент: бойові дії — `caller.locale`, `lastEvents` англійською; MCP і чат не змінились.
7. Залишки ч.5: компендіум пише похідні тексти мовою автора; коди воркера перекладені; REST-Bearer — рішення виконане або записане.
8. Храповик на весь код; кожен `eslint-disable` має причину-дані.

## Після задач (контролер)

- [ ] `git branch --show-current` (= `feat/i18n-part6`); `git merge origin/main` у гілку; один раз повні `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit` (lint/tsc у фоні, `timeout 600000`); `pnpm battle-sweep` на prod-копії — exit 0, звіт `uk` без сирих ключів.
- [ ] Одне Opus-рев'ю всього diff за Review Focus → одна fix wave (Sonnet; сюди ж — запити задач до спільних файлів, TODO(i18n-part6)) → обмежене re-review → повторний повний прогін.
- [ ] `/simplify` на diff гілки: 1–2 агенти Sonnet на непересічних каталогах (рушій `lib/utils/{battle,abilities}` + `lib/server`; UI `components/battle` + `lib/hooks`).
- [ ] **Docs (Task 12):** `docs/architecture/i18n.md` — розділ «Бій і закриття (частина 6)» (`LogLine`/`TextRef` з вкладеними аргументами, `formatText`/`useText`, лог у мові глядача, `details.log` + legacy, `ExtendLocaleScope` і `BATTLE_NAMESPACES`, `abilityText`/`battleTerms`/`battleCommon`, храповик на весь код + `i18n-exempt.json` і перелік `disable`-причин), оновити «Межі коду» (рядок про лог), «Файли», «ESLint-храповик»; `docs/architecture/battle.md` — абзац «Лог: `BattleAction.log`, `resultText` legacy»; `docs/STATUS.md` — рядок «Мультимовність uk/en»: епік закрито, відкладено (`User.timeZone` — причина; REST-Bearer — якщо не зроблено; змішана мова старих боїв; переклад старих імпортів компендіуму — не робиться); `CLAUDE.md` — рядок i18n у «Subsystems» (лог бою — ключі, храповик на весь код).
- [ ] Merge у `main` — **лише після окремого «пушай» користувача**: тимчасовий worktree від `origin/main`, `git merge --no-ff feat/i18n-part6`, у merge-коміті `git mv` spec і план у `docs/archive/superpowers/{specs,plans}/`; перед push — `git merge-base --is-ancestor origin/main HEAD`; worktree прибрати.

## Хід виконання

_(заповнює контролер: коміти задач, заміри `scope-size` (задачі 0, 11), розмір подій до/після (11), відхилення, відповіді на відкриті питання spec)_
