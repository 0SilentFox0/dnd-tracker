# Конструктор: передзлиттєві виправлення (частина 2) — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** закрити всі 86 знахідок [реєстру](2026-10-27-constructor-premerge-findings.md) (commit або обґрунтоване відкладення) і 4 хвости S10, не змінюючи геймплей, persisted JSON і публічні контракти API/MCP.

**Architecture:** 29 задач у порядку залежностей: спершу переноси шарів (pipeline → `lib/server/battles`, мутації/ядра з `app/api` → `lib`), далі egress-виправлення, константи/дедуплікація, UI-шар, хвости, фінальна перевірка. Кожна задача — RED→GREEN або refactor під наявними тестами з явним доказом «поведінка не змінилась».

**Tech Stack:** Next.js 16 App Router, React 19, TS strict, Prisma 6 / Postgres (локальна Docker БД `constructor`, порт 54322), Zod, TanStack Query, Vitest (+ happy-dom для UI), ESLint.

**Spec:** [2026-10-27-constructor-premerge-review-design.md](../specs/2026-10-27-constructor-premerge-review-design.md), частина 2. Стан — [constructor-handoff.md](../constructor-handoff.md).

## Global Constraints

- Гілка `feat/constructor`, worktree `../dnd-tracker-constructor`. Нічого не зливати в `main`, не пушити, не деплоїти.
- Не змінювати: геймплейні результати (кидки, DC, урон, порядок ходу), persisted JSON (`snapshot`, `abilities`, `rules`, bundle), тексти наявних помилок, авторизацію, provider consent, guards платних операцій, runtime ids/payloads API і MCP.
- Публічні схеми: `lib/server/content/__tests__/openapi*.test.ts` і `app/api/__tests__/openapi-route.test.ts` мають проходити без змін очікувань. Якщо Low-задача змінює згенеровану OpenAPI/MCP-схему або текст помилки — відкотити цю частину й записати її в backlog (розділ «Disposition») з причиною.
- Нові тексти помилок — лише ключами в `lib/constants/api-errors.ts`, українською; наявні ключі перевикористовувати, якщо текст збігається дослівно.
- Шари CLAUDE.md: компоненти не імпортують `@/lib/api/*`; `fetch` лише в `lib/api/<domain>`; query keys — фабрики в `keys.ts`; `lib/**` не імпортує `@/app/*` (після T10/T11 — ESLint).
- Коментарі мінімальні (глобальний CLAUDE.md); `padding-line-between-statements`, `simple-import-sort` — `pnpm lint --fix`.
- Тести під час роботи: `pnpm test:changed` / `pnpm test:related <files>`; integration — `pnpm test:integration <file>` лише проти локальної `constructor` (guard `assertConstructorDatabaseUrls`). Full suite — тільки в T29.
- Кожна задача закінчується `pnpm exec tsc --noEmit` + `pnpm lint` (0 errors) на зачеплених файлах і одним commit з ID знахідок у повідомленні (`fix(constructor): A01 A03 …`). Commit-trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Імплементатори — Sonnet; фінальне ревю — одне, Opus (T29). Між задачами — без окремих ревю (feedback-review-cadence).

## Протокол задачі (діє для кожної T)

1. Прочитати знахідки задачі в реєстрі (рядок «file:line / Concrete action») і файли зі списку.
2. **RED:** написати тести з розділу «Тести» задачі; запустити `pnpm test:related <файли>` — нові тести падають (для чистого refactor — тести-характеристики проходять ДО змін і фіксують поведінку).
3. **GREEN:** мінімальна реалізація за «Рішеннями»; тести проходять.
4. `pnpm test:changed`, `pnpm exec tsc --noEmit`, `pnpm lint`.
5. Commit. У звіті імплементатора — список ID і для кожного «done / backlog: причина».

## Review Focus

1. **Застарілий precondition-хеш після запису, що оминає `updatedAt`** (B04): DM робить preview асистента, хтось змінює рядок без бампу `updatedAt` → execute мусить відмовити як stale. Тест — T12 (bind деки, SQL-міграції, `updateMany`).
2. **Тіло без `Content-Length` (chunked) понад ліміт** на chat/context/credentials: має бути 413 до Zod, без буферизації всього тіла. Тест — T25.
3. **Видалення середнього елемента в списках вибору** (C21): після видалення стан і лічильники помилок лишаються на своїх рядках. Тест — T23.
4. **Кома/пробіл у полі списку** (C08): `"a, "` → можна дописати другий елемент. Тест — T21.
5. **Кидок у кампанії з нестандартним `saveDcBase`** (A02/A11): grapple/shove і grant-DC використовують базу кампанії, дефолтна кампанія — без змін. Тест — T3.

---

## Рішення, ухвалені до плану

- **D1 (B04, варіант A, користувач 2026-10-27).** Доказ, що записи не оминають `updatedAt`:
  - `updatedAt @updatedAt` мають: Campaign, Character, CharacterInventory, CharacterSkills, Race, GameClass, Feat, Background, MainSkill, ScenarioPage, SlideDeck, CampaignShow.
  - Raw SQL записи в коді (`$executeRaw`) — лише `battle_participants`/`battle_snapshots` (save-battle), advisory locks, SAVEPOINT; `$queryRaw … FOR UPDATE` не пише. Bundle-імпорт і sync виключають `updatedAt` (`EXCLUDED_COLUMNS`, bundle.ts:22), create — нові id.
  - **Єдиний обхід:** `bindDeckRecord` (`lib/server/show/deck-operations.ts:48`) свідомо зберігає `updatedAt` (CAS редактора деки) і змінює лише `scenarioPageId`. Тому для SlideDeck хеш = `id + updatedAt + scenarioPageId` — повна проєкція всіх записів.
  - Ризик: дві записи одного рядка в межах 1 мс дають однаковий `updatedAt`. Записи контенту серіалізовані `withCampaignContentWrite`; приймаємо.
  - Наслідок: формат хешу міняється → інтенти, підготовлені до деплою, стануть stale (погоджено).
- **D2 (B04, «інакше повний рядок»).** Таблиці без `updatedAt` (Unit, Spell, SpellGroup, Artifact, ArtifactSet, Skill, SkillTree, CampaignTrack) хешуються повним рядком, але в Postgres: `SELECT md5(string_agg(md5(t::text), '' ORDER BY t.id)) FROM <table> t WHERE t."campaignId" = $1` — та сама семантика повного рядка, egress ≈ 32 байти. Ім'я таблиці — лише з whitelist (`@@map`), через `Prisma.raw`.
- **D3 (B04 long-term `campaigns.contentRevision`)** — backlog: нова колонка + міграція + протокол; S10 відніс до окремого epic.
- **D4 (C02).** Recovery-endpoint отримує адитивний query `statusOnly=1` → відповідь без `messages` (поле стає optional). Повна відповідь без параметра не змінюється.
- **D5 (Хвіст 2, F04).** Прибрати лише тотожні повтори: внутрішні `CONTENT_OPERATIONS[x].body.parse(body)` і `z.enum(...).parse` у `operation-service.ts` після `contentOperationSchema`; повторний envelope-parse у `prepare` після `dispatchAction`. Зберегти: `parseBody` в `operationRoute` (власний текст 400), re-parse збереженого payload у `execution-transaction.ts:89` (межа довіри БД), `validatedBody` (media handoff, track title, `apiCreate`), подвійний parse при `prepareUpdate` (значення змінилося), class-column guard.
- **D6 (Хвіст 1).** Бюджети байтів обґрунтовані схемами: chat 64 KiB (text ≤ 8000 символів × 4 байти + focus/sessionContext), context-preview 16 KiB, settings 64 KiB (instructions 8000), credentials 4 KiB, threads/patch/policy 4 KiB, slide-image 16 KiB. Rate: chat 20/60 с, credentials 10/60 с, MCP 120/60 с на токен — усі `memoryFallback: true`.

---

## Task 1: Pipeline layering і guards (A05, A06, A07, A18)

**Files:**
- Create: `lib/server/battles/execute-battle-operation.ts`, `lib/server/battles/pipeline-deps.ts`, `lib/server/battles/record-operation.ts`, `lib/server/battles/guards.ts`
- Modify: `lib/utils/battle/pipeline/run-battle-mutation.ts`, `lib/utils/battle/pipeline/default-deps.ts` (видалити/перенести), `lib/utils/battle/pipeline/execute-battle-operation.ts` (перенести), `lib/server/battles/action-service.ts:41,181-183`, `lib/constants/api-errors.ts`, усі імпортери (`grep -rn "pipeline/default-deps\|pipeline/execute-battle-operation\|runGuardedBattleRecordOperation"`)
- Test: `lib/server/battles/__tests__/guards.test.ts`, наявні `lib/utils/battle/pipeline/__tests__/*`

**Interfaces — Produces:**
- `assertExecutionScope(actor: Actor, execution: { actor: Actor; tx: unknown } | undefined, tx: unknown): void` — кидає `ContentError(API_ERRORS.ACTOR_MISMATCH | TX_MISMATCH, 409)`.
- `requireDmMember(db: Pick<PrismaClient,"campaignMember">, actor: Actor): Promise<void>` — `ContentError(API_ERRORS.DM_ONLY, 403)`; порівняння з `CampaignRole.DM`.
- `runGuardedBattleOperationCore(...)`: `Promise<{ delta: ClientBattleDelta; version: number }>`; кидає типізовані `BattleOperationError { status, message, issues? }`. HTTP-обгортка `runGuardedBattleOperation` = core + `NextResponse.json`.
- `guardBattleContext(...)` повертає `{ ctx, awaiting, isDryRun }`.
- `API_ERRORS.DM_ONLY = "Лише DM"`, `TX_MISMATCH = "Невідповідна транзакція"`, `ACTOR_MISMATCH = "Невідповідний actor"` (тексти дослівно як зараз).

**Рішення:** `lib/utils/battle/pipeline` після задачі не імпортує `lib/server/*`, `lib/db`, немає `await import()` і `import("…")`-типів. `executeBattleOperation` використовує core напряму (без `response.json()` і `JSON.parse(JSON.stringify)` на рядку 65 — `structuredClone` не потрібен, повідомлення вже plain).

**Тести:**
- `assertExecutionScope`: інший actor → 409 ACTOR_MISMATCH; інша tx → 409 TX_MISMATCH; збіг → не кидає.
- `requireDmMember`: player → 403 DM_ONLY; dm → ok.
- Pipeline-тест: `checkVictoryConditions` викликається 1 раз на мутацію (spy), `options.dryRun` — 1 раз.
- Static: `grep -rn "lib/server\|@/lib/db" lib/utils/battle/pipeline` порожній (тест у `lib/utils/battle/pipeline/__tests__/layering.test.ts` читає файли через `fs`).

- [ ] RED → GREEN → verify → commit `refactor(constructor): A05 A06 A07 A18 battle pipeline layering`

## Task 2: Battle load egress (A01, A03)

**Files:** `lib/utils/battle/store/load-battle.ts:108,115,146,158`, `lib/server/battles/pipeline-deps.ts` (з T1), `lib/utils/rules/*` (де `parseRules`)
**Interfaces — Consumes:** `pipeline-deps.ts` з T1. **Produces:** `loadBattleAccess(db, battleId, userId): Promise<{ isMember: boolean; isDM: boolean } | null>`; `recheckAccessWith(db)` — єдиний для default і scoped deps; `parseRulesCached(raw: unknown): Rules` (memo за `JSON.stringify(raw)`, LRU 50).
**Рішення:** `campaign.rules` select лише для `status === PREPARED` (два кроки: спершу `battle.status`/`rules`, при PREPARED — campaign.rules). `recheckAccess` не викликає `loadBattle`.
**Тести:** spy на `battleParticipant.findMany` — 1 виклик на закомічену мутацію (було 2); `loadBattle` для ACTIVE не читає `campaign.rules`; для PREPARED читає; `parseRulesCached` повертає той самий об'єкт для того самого JSON і новий для іншого; доступ: не-член → 404/403 як раніше.
- [ ] RED → GREEN → verify → commit `perf(constructor): A01 A03 membership-only recheck`

## Task 3: DC і кубикова математика (A02, A11, A21, A22, C05)

**Files:** `lib/utils/battle/actions/grapple.ts:25`, `lib/utils/battle/spell/power.ts:14,22`, `spell/cast/index.ts:78`, `conditions/apply.ts:111`, `fire-burst.ts:25`, `participant/from-unit.ts:185`, `balance/stats.ts:105,127,168-174`, `units/monster.ts:23`, `turn/turn-start.ts:65-67`, `lib/schemas/units.ts:65`, `lib/hooks/battle/useAttackWizard.ts:136-141`, `attack/roll.ts:34`, `spell/cast/outcome.ts:56`, `lib/constants/battle.ts`
**Produces:**
- `spellSaveDc(caster, ability, saveDcBase: number)`; `grappleDc(attacker, rules)` через `getSpellSaveDC(prof, mod, rules.formulas.saveDcBase)`.
- `bestSpell(...)` без `dcBonus`; from-unit і stats викликають `monsterSaveDc`.
- `RECHARGE_THRESHOLDS = [4, 5, 6] as const` (lib/constants/battle), `isRecharge` + schema з неї; `rollDie(6, rng)`.
- `critThresholdOf(rules, participants, attackerId, extra = 0): number` у `lib/utils/battle/attack/crit-threshold.ts`; `MIN_CRIT_ON = 2` у lib/constants/battle.
- power.ts імпортує `ABILITY_SHORT_LABELS`.
**Тести:** кампанія `saveDcBase: 10` → grapple DC і grant DC на +2 вищі; дефолт (8) — ті самі числа, що в наявних тестах; `monsterSaveDc` == старий результат stats для 3 фікстур юнітів; `critThresholdOf` з модифікатором −20 → 2; клієнт і сервер дають однаковий поріг (useAttackWizard тест через чисту функцію); snapshot-тести turn не змінюються.
- [ ] RED → GREEN → verify → commit `fix(constructor): A02 A11 A21 A22 C05 DC base and crit threshold`

## Task 4: Проходи модифікаторів (A04, A26)

**Files:** `lib/utils/battle/saves/roll-save.ts:23-33,47,77`, `checks/roll-check.ts:25-42`, `actions/opportunity.ts:55-71`, `actions/movement.ts:95`
**Рішення:** один `collectModifiers(..., { flags: [saveAdv, saveDis, autoFail, saveProficiency] })` на кидок, локальне розбиття; `stat: savingThrow` — окремо. `checkBonus` бере flags із `checkMode`. Opportunity: перед циклом кроків `Map<enemyId, { attack, reach }>`, оновлення лише після provoke; прибрати `releaseInvalidGrapples` з movement (pipeline `withPlacement` робить це).
**Тести:** spy `collectModifiers` — ≤ 2 виклики на `rollSave`, ≤ 2 на check; результати 20 сидованих кидків (seed rng) ідентичні до/після (тест-характеристика спершу на старому коді); рух через 3 клітини біля 2 ворогів — ті самі provoke-події; grapple звільняється рівно раз (pipeline-тест).
- [ ] commit `perf(constructor): A04 A26 single modifier pass`

## Task 5: Item stats (A09, A10, A17)

**Files:** `lib/utils/items/item-row.ts:6-10,95-160`, `items/item-stats.ts:9-79`, `items/resolve.ts`, `items/pools.ts`, `lib/constants/artifacts.ts`, `participant/character-spell-grants.ts`, `from-unit.ts:126-135`, `refresh-from-source.ts:29`, `abilities/class-columns.ts:68`
**Produces:** `ITEM_LIMITS` (cost, castLevel, dc, attackBonus, options, label, spells, keyPattern) у lib/constants/artifacts — і `readStats`, і `ItemStatsSchema` читають звідти; `ITEM_KINDS`/`ARMOR_CATEGORIES` замість локальних; `itemStatsFromRow` кешує в `WeakMap<object, ItemStats | null>`; `spellGrantFields(spell): Partial<Pick<SpellGrant,"castLevel"|"dc"|"attackBonus"|"upcast">>`; `spellPoolKey(id)`, `grantPoolKey(...)`, `classPoolKey(...)` у items/pools.ts (рядки ключів дослівно ті самі).
**Тести:** таблиця граничних значень (min−1, min, max, max+1 для кожного поля) — `readStats` і zod дають однаковий accept/reject; той самий row-об'єкт → JSON.parse викликається 1 раз; pool-ключі == старі літерали (`"pool:spell:x"`); openapi-тести без змін.
- [ ] commit `refactor(constructor): A09 A10 A17 item stats limits and cache`

## Task 6: Обхід вибору (A12, A27-selections, A28)

**Files:** `lib/utils/characters/choices/{walk,selections,prune,plan}.ts`, `participant/load-character-context.ts`, `from-character.ts:84-90`
**Produces:** `forEachChoiceOwner(state, refs, visit: (o: { owner: ChoiceOwnerRef; defs: ChoiceDef[]; picks: ChoicePicks; level: number; columns: ClassColumns | null; path: string }) => void)`; `CharacterContext.classEntries`.
**Рішення:** шляхи (`path`) мають збігатися дослівно з поточними трьома схемами — якщо схеми різні, `visit` отримує обидва поля (`path`, `legacyPath`), і споживач бере свій.
**Тести:** характеристика — для 4 фікстур (раса+підраса, фон+feat, мультиклас із підкласом, feat-ланцюжок) selections/prune/visitPicks дають ті самі виходи до і після; dedupe через Set зберігає порядок першої появи; `resolveClassEntries` викликається 1 раз на build.
- [ ] commit `refactor(constructor): A12 A27 A28 single choice-owner walk`

## Task 7: Білдери учасників і хід (A13, A14, A24)

**Files:** `participant/from-character.ts:45-272`, `from-unit.ts:22-221`, `turn/run-advance-turn-loop.ts:36-366`, `turn/turn-start.ts:48-247`, `extract-attacks.ts`, `extract-artifacts.ts:29,64`
**Produces:** `loadCharacterBuildRefs`, `characterSpellcasting`, `finalizeCharacter`, `monsterSpellcasting(unit, rules)`, `roundTransition`, `startTurnEntries`, `rechargePools`, `applyStartOfTurnDamage`, `resetTurnFlags` (у сусідніх файлах тієї ж папки). `context` у лоадерах артефактів — required; fallback-запити видалити; `artifactsById` з `artifactRows`.
**Тести:** наявні snapshot-тести turn/participant мають проходити без оновлення snapshot; tsc ловить усі виклики без context; нова функція ≤ 80 рядків (перевірка оком у ревю).
- [ ] commit `refactor(constructor): A13 A14 A24 builders and turn decomposition`

## Task 8: Гігієна констант (A15, A16, A19, A20, A23)

**Files:** `lib/constants/battle.ts`, `lib/constants/classes.ts`, `lib/constants/experience.ts`, `conditions/{registry,query}.ts`, `turn-start.ts:78-82`, `opportunity.ts:47`, `abilities/registry/effects/state.ts`, `participant/state.ts:23-35`, `attack/bonus.ts:72-74`, `abilities/schema/kinds.ts`, `balance/xp-budget.ts`, `spells/class-slots.ts`, `rules/schema.ts:9,47,48,58`, `types/battle.ts:73`, `checks/roll-check.ts:19`, `content/import/values.ts:107,112`, `units/unit-parsing.ts`, `characters/classes/columns.ts:6-8`
**Produces:** `EffectMarker` const (`immobilized`, `skip_action`, `no_reaction`, `no_bonus_action`, `disengaged`) і `hasEffectMarker(p, marker: EffectMarker)`; `isCondition5eKey(key)`; `RULES_EDITIONS = ["2014","2024"] as const`, `type RulesEdition`, `DEFAULT_RULES_EDITION`; SRD-таблиці в lib/constants; `lib/utils/common/dice.ts`: `DICE_PATTERN`, `DICE_TERM_PATTERN`, `normalizeDiceText(s)` (к/д/k → d).
**Рішення:** у rules/schema спершу `z.enum(RULES_EDITIONS)`; якщо openapi-тест показує різницю — `z.union(RULES_EDITIONS.map(e => z.literal(e)))` (схема незмінна).
**Тести:** `normalizeDiceText` таблиця («2к6», «1Д8+2», «3k4», « d20 ») == результатам кожного старого regex на тих самих рядках; `hasCondition` == `hasEffectMarker` на фікстурах; XP-бюджет на рівнях 1, 20, 21(clamp) — ті самі числа.
- [ ] commit `refactor(constructor): A15 A16 A19 A20 A23 constants`

## Task 9: Імпорт-шар і persist (A08, A25, A27-rest, A29)

**Files:** `lib/constants/compendium-import.ts` (create), `lib/server/compendium-import/parse.ts` (re-export), `lib/utils/content/import/table.ts:5,103,133`, `lib/utils/compendium-import/{flow,file,file.worker}.ts`, `battle/store/persist-xp.ts:40-44`, `persist-consumables.ts:34`, `inventory/stash-actions.ts:81-237`
**Produces:** `COMPENDIUM_KINDS`, `COMPENDIUM_LIMITS`, `COMPENDIUM_REQUEST_HEADROOM_BYTES = 8192`, `byteLength` у lib/constants (pure); `CompendiumError` лишається в lib/server — клієнт отримує лише код. persist-xp: один `updateMany({ where: { id: { in } }, data: { experience: { increment: share } } })` + ті самі логи. Stash: `grantAction`, `attuneAction`, `equipAction`… кожна з власним типізованим ctx; `pruneAttuned(next.attuned, next)`.
**Тести:** static — `lib/utils/**` не імпортує `lib/server/` (fs-тест); persist-xp — 3 персонажі отримують той самий приріст, 1 SQL-виклик; stash-actions — наявні тести + кейс attune 3 предметів (O(n) — без регресії результату).
- [ ] commit `refactor(constructor): A08 A25 A27 A29 import layer and persist`

## Task 10: Battle layering з `app/api` (B11 — battle)

**Files:** перенести `app/api/campaigns/[id]/battles/[battleId]/**/*-mutation.ts`, їх schemas і balance-хелпери, що імпортують `lib/server/battles/{operations,dice,action-service}.ts`, у `lib/server/battles/mutations/` (або `lib/utils/battle/...` для чистих), route-файли імпортують з lib.
**Рішення:** `git mv` для збереження історії; тести переїжджають поряд у `__tests__`. Публічні шляхи API не змінюються.
**Тести:** `grep -rn "@/app/" lib/server/battles lib/utils` порожній; наявні тести мутацій зелені після переносу.
- [ ] commit `refactor(constructor): B11 battle mutations into lib`

## Task 11: Ядро операцій персонажа (B01, B02, B12, B22, B11 — characters, ESLint)

**Files:** `lib/server/characters/{operation-context,action-service,progression-service,access}.ts`, `lib/server/characters/operations/*.ts`, `stash-update.ts:138-140`, character handler cores з `app/api/campaigns/[id]/characters/**`, `eslint.config.mjs`
**Produces:**
- `type CharacterGate = { access: CharacterAccess; character: CharacterWithInventory }`.
- Чисті операції `(gate: CharacterGate, input: T) => Promise<Data>` у `lib/server/characters/operations/<op>.ts`; `CHARACTER_OPERATIONS: Record<CharacterOp, Operation>` — асистент викликає через map (без `new Request("http://local")`, без `responseData`, без двох 20-case switch).
- HTTP: `guardedCharacterHandler({ campaignId, characterId }, op)` — gate 1 раз, body парситься 1 раз, без позиційних рядків і duck typing `Actor`.
- `characterState`/`progressionState` звужені до `ids` (`select { id, updatedAt }` коли id немає); без окремого запиту `inventories`; access і ref-check — 1 раз на виконання.
- ESLint `no-restricted-imports` `@/app/*` у `lib/**`.
**Тести:** spy — на roll/hit-die/resources один `requireCharacterAccess` і один `character.findUnique` на запит; `request.clone` не викликається; assistant-шлях дає той самий `data` що й HTTP для 3 операцій (roll, experience, choices); progression з `ids=[a]` не читає інших персонажів; `pnpm lint` ловить штучний імпорт `@/app/x` у lib (тест на конфіг або разовий прогін).
- [ ] commit `refactor(constructor): B01 B02 B11 B12 B22 character ops core`

## Task 12: Precondition-хеші асистента (B04, B05, B10)

**Files:**
- Create: `lib/server/assistant/digest.ts`, `lib/server/assistant/__tests__/updated-at-audit.test.ts`, `lib/server/assistant/__tests__/digest.integration.test.ts`
- Modify: `lib/server/assistant/actions/content-snapshot.ts`, `lib/server/characters/reference-state.ts`, `lib/server/scenario/action-service.ts:24-38`, `lib/server/show/action-service.ts:53-68`, `lib/server/battles/action-service.ts:39-41,70-76,118-122`, `lib/server/battles/record-service.ts:37`, `docs/architecture/ai.md`

**Produces:**
- `UPDATED_AT_TABLES` (model → `@@map`), `FULL_ROW_TABLES` (whitelist `@@map`).
- `stampDigest(db, model, where): Promise<Array<{ id: string; updatedAt: Date }>>` — `select { id, updatedAt }` (`SlideDeck` + `scenarioPageId`).
- `fullRowDigest(db, table: FullRowTable, campaignId): Promise<string>` — SQL з D2.
- `contentSnapshot` повертає `{ stamps, rowDigests, campaign }` (FOR UPDATE локи без змін); scenario: сторінки — stamps (+`version`), повний `content` лише цільової; decks — stamps; show — те саме.
- B05: прибрати `unit`/`spell` з `sources`; персонаж — stamp. B10: `findMany({ id: { in } })` по типу; `battleRecord(…, select?)`; `liveAccess` без зайвого member-запиту.

**Тести:**
- Integration (локальна `constructor`): `updateMany` на Race бампить `updatedAt` (доказ D1); `bindDeckRecord` не бампить, але deck-хеш змінюється (через `scenarioPageId`); зміна поля spell → `fullRowDigest` інший; зміна в іншій кампанії — той самий.
- Stale: preview content-дії → `bindDeckRecord` → execute відповідає наявною stale-помилкою (Review Focus 1); preview → raw `UPDATE races SET name=…` без updatedAt — задокументоване обмеження (тест фіксує, що audit-тест забороняє такий код).
- `updated-at-audit.test.ts`: сканує `lib/`, `app/`, `scripts/` — немає `$executeRaw*` з `UPDATE "?(<UPDATED_AT_TABLES>)`; немає `updatedAt:` у `data` `update/updateMany/upsert` крім allowlist `deck-operations.ts` (bind); міграції новіші за `20261108000000_assistant_intents` з `UPDATE` таких таблиць мусять містити `"updatedAt"`.
- Egress: spy — content-дія не викликає `findMany` без `select` на bundle-таблицях; battle-дія — одне читання units/spells.
- Документ: розділ «Precondition-хеш» у `docs/architecture/ai.md` (правило: запис у таблицю з `updatedAt` без Prisma-бампу заборонено; виняток — bind деки).
- [ ] commit `perf(constructor): B04 B05 B10 scoped precondition digests`

## Task 13: Сервіс кампаній (B03, B16, B14)

**Files:** `lib/server/campaigns/action-service.ts:40,87,99,166,207-257`, `lib/server/campaigns/create-campaign.ts` (create), `app/api/campaigns/route.ts:30-61`, `app/api/campaigns/[id]/route.ts:14-17`, `lib/utils/api/actor.ts`, `lib/server/assistant/caller.ts` (або наявний модуль caller), 13+4 місця з реєстру B14
**Produces:** `export` op → `{ href, formatVersion: BUNDLE_FORMAT_VERSION }` без читання; clone/template — один `exportCampaign` всередині запису, хеш того самого bundle; `createCampaignForUser(userId, data)`; `CAMPAIGN_INCLUDE`, `CAMPAIGN_OMIT` в одному модулі; `sessionDmActor(campaignId, userId): Actor`; `chatCaller(campaignId, userId, threadId): AssistantCaller`.
**Тести:** spy `exportCampaign` — clone 1 виклик (було 3), export op — 0; precondition clone stale, якщо кампанія змінилась між preview і execute; route і action створюють кампанію з однаковими полями.
- [ ] commit `perf(constructor): B03 B14 B16 campaign service`

## Task 14: Помилки (B13, B15, B20)

**Files:** `lib/utils/api/error-handler.ts`, ~16 catch-блоків з B13, ~200 літералів з B15 (`grep -rn '"[А-ЯІЇЄҐ][^"]*' lib/server lib/ai | grep -v api-errors`), `lib/server/assistant/errors.ts`, `lib/schemas/ai.ts`, `lib/server/assistant/runs.ts:60`, `ai-handlers.ts:180-182`
**Produces:** `handleApiError` повертає `errorResponse(e.message, e.status, e.issues)` для `ContentError` без логу 500; `API_ERRORS.ASSISTANT_*`/`BATTLE_*` (тексти дослівно); `forbidden()`/`conflict()` лише в `lib/server/assistant/errors.ts`; `assistantRequestIdSchema` + `API_ERRORS.INVALID_REQUEST_ID = "Некоректний ідентифікатор запиту"`.
**Рішення:** літерал, що ≈ наявному ключу, але не дослівно (напр. «Некоректне тіло запиту» vs INVALID_JSON) — новий ключ із тим самим текстом, не зливати (текст — контракт).
**Тести:** `handleApiError(new ContentError("x", 409, issues))` → 409 + issues, `console.error` не викликано; static — `lib/server/**` і `lib/ai/**` без кириличних рядкових літералів у `throw`/`errorResponse` (fs-тест, allowlist для prompt-текстів `lib/ai/context/prompt.ts`); assistant-тести з текстами помилок проходять без змін.
- [ ] commit `refactor(constructor): B13 B15 B20 error plumbing`

## Task 15: Вартість AI-чату (B07, B08, B23)

**Files:** `lib/ai/chat/run-chat.ts:20,49,61-68`, `lib/ai/threads.ts:68`, `lib/constants/ai.ts`, `ai-handlers.ts:175,186`
**Produces:** `AI_LIMITS.cancelPollMs = 2500`; cancel-перевірка в `onStepFinish` + повільний poll як fallback; `recoveredState(caller, threadId, requestId)` для replay/recover/cancel (усі через `slimToolOutputs`); `AI_TOOL_OUTPUT_COMPACTED` у lib/constants/ai; `compactToolOutputs(messages, { minChars })` замість двох функцій.
**Тести:** fake timers — за 10 с стріму ≤ 5 запитів `assistantRun` (було 20); `abortRequested` між кроками зупиняє стрім до наступного кроку; replay повертає стиснені tool outputs (довгий output → маркер).
- [ ] commit `perf(constructor): B07 B08 B23 chat run costs`

## Task 16: Compendium import сервер (B06, B09, B17, B18-compendium, B19)

**Files:** `lib/server/compendium-import/{repository,adapt,plan,feature-resolution,presentation}.ts`, `lib/server/compendium-import/adapt/*.ts` (create), `lib/server/assistant/actions/compendium-reads.ts`, `lib/constants/campaigns.ts`, `scripts/srd/lib/load-template.ts:7`
**Produces:** `loadNames(campaignId)` (`select { id, name|title }`), `loadRows(kind, ids)`; без `scenarioPages` для template; `Map` за `kind:localId`; reports — `$queryRaw` проєкція `report->'counts'`, `report->'readyToImport'`; один `authorize`; `AdaptState` + `adaptTopLevel`, `attachSubclasses`, `attachSubraces`, `adaptBooks`, `adaptOptionalFeatures`, `finalize`; `readCompendiumSummary` — map `operation → handler`; plan/feature-resolution — функції по kind/фазі ≤ 80 рядків; `SRD_TEMPLATE_NAME` у lib/constants/campaigns, `CampaignKind.TEMPLATE`, `CampaignVisibility.OFFICIAL`; `targets()` — один раз на шаблон.
**Тести:** наявні compendium-тести (adapt на SRD-фікстурі — той самий вихід, порівняння JSON до/після); spy — `loadDomain`-замінник не читає `content` сторінок; reports повертають ті самі counts.
- [ ] commit `perf(constructor): B06 B09 B17 B18 B19 compendium import`

## Task 17: Дрібні спільні хелпери (B21, B24, B25, B26, B27, B28, B18-spell)

**Files:** 6 копій clone-хелпера і 3 `xxxResult` (B21), `lib/server/assistant/coverage.ts` → `__tests__/helpers/coverage.ts`, `intent-store.ts` `requestDigest` → `lib/server/assistant/json.ts`, `lib/ai/tools/{content,assistant,propose,define}.ts`, `lib/schemas/units.ts:86,115,148`, 6 місць pagination (B28), `spell-mutation.ts:52` (після T10 — у lib)
**Produces:** `jsonContent` скрізь; `actionResult(domain, name)(data, id)`; `aliasHandler(name)`; `unitFields` shape; `pageOf(rows, offset, limit): { items; hasMore; nextOffset }` у lib/utils/api; `resolveSpellSource` у lib/utils/battle/spells.
**Рішення (B27):** якщо openapi/MCP-схема юнітів змінюється хоч на `.describe` — B27 у backlog «змінює публічну схему».
**Тести:** `pageOf` — offset 0/середина/кінець; openapi-тести; `resolveSpellSource` — legendary/grant/slot кейси з наявних тестів spell-mutation.
- [ ] commit `refactor(constructor): B18 B21 B24 B25 B26 B27 B28 shared helpers`

## Task 18: Compendium import UI + пагінація (C01, C10, C28)

**Files:** Create `lib/api/compendium.ts`, `lib/hooks/compendium-import/{keys,index,useCompendiumImport,useCompendiumReports,useSourceNotes}.ts`, `lib/hooks/common/usePager.ts`, `components/common/PagerNav.tsx`, `types/compendium-import.ts`, `types/assistant.ts` (DTO з AssistantHandoff); Modify `components/content-import/{CompendiumImport,CompendiumReport,SourceNotes}.tsx`, `components/ai/{AssistantHandoff,AssistantIntentCard,AssistantQueue,AssistantContextDisclosure}.tsx`, `lib/constants/compendium-import.ts` (`ERROR_TEXT`, page sizes), `lib/utils/compendium-import/flow.ts` (`excludeAllBlocked`)
**Produces:** `compendiumKeys.reports(c, offset)`, `.entries(c, offset)`, `.options(c)`; `usePager<T>(items: T[], size: number): { page; pageItems; canPrev; canNext; prev; next }`; `PagerNav({ pager })`; UI розбито на `CompendiumFileStep`, `CompendiumCategories`, `CompendiumDependencies`, `CompendiumRunsList` на `HudSection`/`Input`/`SelectField`.
**Тести (happy-dom):** `usePager` — межі; wizard: preview → confirm викликають `lib/api/compendium` (mock), помилка коду показує текст з `ERROR_TEXT`; ESLint — компоненти без `fetch`/`@/lib/server`; статичний grep `fetch(` у components/content-import порожній.
- [ ] commit `refactor(constructor): C01 C10 C28 compendium import layering`

## Task 19: Трафік асистент-чату (C02, C18, C19, C14)

**Files:** `lib/hooks/ai/{useAiChat,useAssistantEffects}.ts`, `components/ai/{AiPanel,AssistantWorkspace,AssistantIntentCard}.tsx`, `lib/api/ai.ts:62-68`, recovery GET у `ai-handlers.ts`, `lib/constants/ai.ts`, `lib/hooks/common/{useExpiry,usePageHidden?}.ts`, `lib/utils/ai/focus.ts`, `lib/hooks/campaigns/useSourceSync.ts:41-42`
**Produces:** `ASSISTANT_POLLING = { recoveryMs: 2000, recoveryMaxMs: 8000 }` (backoff ×2, пауза при `document.hidden`); `getAiRunRecovery(c, t, requestId?, { statusOnly? })` (D4); messages замінюються лише при зміні статусу run; `recover()` після нормального завершення стріму не викликається (лише stop/error/reconnect); `onFinish` не рефетчить threads, якщо title/updatedAt не змінились; `useExpiry(iso): boolean` (один `setTimeout`) — також для `blockedUntil`; `affected[].domain → key factory` мапа з fallback на campaign-wide; useSourceSync — лише `router.refresh()` або invalidation (обрати за тим, чи сторінка server-rendered); AiPanel props `focus={{ value, page, onClear }}`, `proposals={{ data, render, showPending, review }}`; `focusLabelOf` у lib/utils/ai/focus.ts.
**Тести:** fake timers — за 20 с recovering ≤ 6 запитів, усі з `statusOnly=1`; прихована сторінка — 0; нормальний send — рівно 1 запит після стріму (proposals); recovery без параметра повертає `messages` (контракт); `useExpiry` — flip рівно в момент expiresAt; receipt із domain `spells` інвалідує лише `spellKeys`.
- [ ] commit `perf(constructor): C02 C14 C18 C19 assistant chat traffic`

## Task 20: Spellbook (C03, C04)

**Files:** `lib/hooks/battle/{useSpellBook,useBattleSpellLibrary,useSpellMapTargeting}.ts`, `components/battle/**/SpellAimPanel.tsx`, `lib/utils/battle/flows/spell-grants.ts` (create)
**Produces:** `grantsFor`, `defaultGrant`, `poolUsage(pool): { left; max; label }`, `sourceOptions`, `castLevelOptions`, `costBlocked` (pure, з тестами); `useMemo` для library/byLevel/levels/targets; hover/aimPreview — у SpellAimPanel (через `onHover` з `useSpellMapTargeting`).
**Тести:** pure-функції — таблиці (slot, grant pool 0/1, legendary); render-count тест: 10 hover-подій → `MyTurnControls` рендериться 0 разів додатково (React Profiler / лічильник у mock); `useBattleSpellLibrary` повертає ту саму референцію між рендерами без змін.
- [ ] commit `perf(constructor): C03 C04 spellbook memo and grants util`

## Task 21: Спільні примітиви форм (C08, C09, C17, C23, C24, C25, C29)

**Files:** Create `components/ui/comma-list-input.tsx`, `components/ui/switch-field.tsx`, `components/common/states/FormAlert.tsx`, `lib/utils/common/patch-defined.ts`; Modify місця з реєстру (ClassBasicsTab, ChoiceListEditor:180, SpellFormPowerFields:173, rules/sections/*, ArtifactItemFields, SheetRollDialog, ExperienceDialog, SlotSelect, CastSourceSelect, GrantArtifactDialog, LimitsSection, ChoicesEditor, ConditionsDialog, ClassLevelUpDialog, SourceSyncDialog, SaveAsTemplateDialog, CampaignSettingsDialog, ProfileEditor, CriticalsSection, ChoiceOptionsEditor, CoreActionsDialog, ChoicePicker), `lib/constants/battle.ts` (`BATTLE_SELECT_CLASS`)
**Produces:** `CommaListInput({ value: string[]; onChange; id?; placeholder? })` — локальний текст, парсинг на blur/зміні без обрізання хвоста; `SwitchField({ id, label, checked, onCheckedChange, disabled?, description? })`; `FormAlert({ children })` — один колір токена danger; `patchDefined(obj, patch, isEmpty?)`; `toggleItem` скрізь; `useMemo` для candidates/first у PropertyFields; `SPELL_COST_LABELS`, `spellLevelName` замість локальних.
**Тести (happy-dom):** Review Focus 4 — ввести `"a, "` потім `"b"` → `onChange(["a","b"])`; `SwitchField` — label клікабельний (htmlFor); `patchDefined` — undefined/empty видаляються; `FormAlert` має `role="alert"`.
- [ ] commit `refactor(constructor): C08 C09 C17 C23 C24 C25 C29 form primitives`

## Task 22: Option-картки і бібліотечні списки (C07, C06)

**Files:** Create `components/hud/OptionButton.tsx`, `components/hud/TargetRadioList.tsx`, `lib/hooks/common/useLibraryList.ts`, (опційно) `components/hud/page/LibraryListPage.tsx`; Modify ConditionsDialog, LegendaryActionDialog, CoreActionsDialog, ChoicePicker; delete `components/battle/turn/option-button.ts`; `lib/hooks/{classes/useClassesList,feats/useFeatsList}.ts`, `app/campaigns/[id]/dm/{backgrounds,classes,feats}/page-client.tsx`
**Produces:** `OptionButton({ role: "radio"|"checkbox"; checked; disabled?; title; meta?; note?; onClick })`; `TargetRadioList({ targets, value, onChange })`; `useLibraryList<T>({ query, create, remove, texts }): { items; status; createDialog: { open; setOpen }; remove(id) }`.
**Тести:** OptionButton — `aria-checked`, клавіатура Space; useLibraryList — confirm=false не видаляє, помилка → notify; backgrounds page-client не викликає мутацій напряму (ESLint/grep).
- [ ] commit `refactor(constructor): C06 C07 option cards and library lists`

## Task 23: Редактори вибору (C16, C20, C21, C22)

**Files:** `components/choices/{ChoiceListEditor,ChoiceOptionsEditor,OptionSpellsEditor,SpellGrantEditor,ChoicePicker}.tsx`, ItemCastingFields, FeatBasicsTab, SubclassesEditor + `lib/hooks/classes/useClassForm.ts`, `useRulesForm.ts`, ConditionsDialog, ResourcesDialog, `conditions-mutation.ts:14,16` (після T10 — у lib), `lib/constants/{classes,spells,abilities,battle}.ts`, `components/classes/use-error-totals.ts` → `lib/hooks/common/useErrorTotals.ts`, `components/characters/rest/CharacterPickList.tsx` (`useCheckedIds` → lib/hooks/common)
**Produces:** `MAX_SPELL_LEVEL = 9`, `ABILITY_SCORE_CAP = 20`, `DEFAULT_SUBCLASS_LEVEL = 3`, `CONDITION_LIMITS = { rounds: 99, dc: 40 }` — і в zod, і в UI; `MAX_CLASS_LEVEL`, `CHOICE_LIMITS`, `MAX_EXHAUSTION`; стабільний `uid` для choices/options (як `shortId` у SubclassesEditor), не персиститься (знімається перед збереженням); `ChoiceHeaderRow`, `SkillChoiceFields`, `AbilityScoreChoiceFields`, `SpellChoiceFields`, `OptionChoiceFields`.
**Тести (happy-dom):** Review Focus 3 — 3 вибори, помилка в третьому, видалити другий → помилка лишається на (тепер другому) колишньому третьому, стан `AbilityListEditor` теж; збережений JSON без `uid`; zod і UI межі з тих самих констант (ввід 100 раундів → помилка в обох).
- [ ] commit `refactor(constructor): C16 C20 C21 C22 choices editors`

## Task 24: DM-навігація і діалогові форм-хуки (C13, C15)

**Files:** `lib/constants/campaigns.ts` (`DM_SECTIONS`), `components/layout/{Header,Breadcrumbs,dm-menu}.tsx|ts`, `app/campaigns/[id]/page.tsx:23,46-68`, `components/character-profile/{ClassLevelUpDialog,stash/GrantArtifactDialog}.tsx`, `components/characters/basic/CharacterBasicInfo.tsx`, `lib/hooks/characters/{useClassLevelUpForm,useGrantArtifactForm}.ts`, character form hook
**Produces:** `DM_SECTIONS: Array<{ path; label; icon; subtitle?; templateVisible: boolean; requiresClasses?: boolean }>`; `dmSectionsFor({ isTemplate, classesEnabled })`; Header/page/Breadcrumbs рендерять з неї. Хуки форм з reset/validation/clamp; кнопки — у `footer`; `LoadingState`.
**Рішення:** поточна видимість — еталон для сторінки кампанії; розбіжність Header (напр. «ai» у шаблоні) вирівняти за сторінкою і записати у звіт задачі.
**Тести:** `dmSectionsFor` — шаблон без classes не містить classes/feats/backgrounds; Header і page дають той самий набір шляхів; GrantArtifact — quantity clamp і reset при закритті.
- [ ] commit `refactor(constructor): C13 C15 dm sections and dialog form hooks`

## Task 24a: Query/egress-гігієна (C11, C12, C26, C27)

**Files:** `lib/hooks/characters/useChoiceRefs.ts:19-45`, `lib/hooks/spells/{keys,useSpells,useSpellRefs}.ts`, `lib/api/spells.ts`, spells GET route (`?fields=ref` або окремий `/spells/refs`), `lib/hooks/campaigns/useSourceSync.ts:76-103`, `components/campaigns/templates/SourceSyncDialog.tsx:87-105`, `lib/hooks/scenario/useScenarioDraft.ts:162-166`
**Produces:** `GET /api/campaigns/[id]/spells/refs` → `{ id, name, level, lists }[]` (адитивний endpoint; повний список не змінено); `spellKeys.refs(c)`; `useSpellRefs(c, { enabled })` — лише коли є resolved choice kind `spell`; `classesById` з lib/utils/characters/classes; `useMemo` refs/autoAdded, index-курсор у BFS, `useCallback` toggle/setGroup, `React.memo(SyncItemRow)`; `hashKey(scenarioKeys.page(c,p))` один раз; видалити `spellKeys.byIds(c, "")` з invalidateKeys.
**Тести:** refs-endpoint повертає лише 4 поля, player-доступ як у списку; useChoiceRefs без spell-choice — запит refs не йде; BFS на 500 записах — той самий результат, що старий (характеристика); toggle 1 рядка → інші `SyncItemRow` не рендеряться.
- [ ] commit `perf(constructor): C11 C12 C26 C27 query hygiene`

## Task 25: Хвіст 1 — AI entrypoint hardening

**Files:** `lib/utils/api/parse-body.ts`, `lib/utils/api/read-limited-body.ts` (create, витягнути з `lib/ai/mcp-request.ts` спільну частину), `lib/ai/mcp-request.ts`, `app/api/campaigns/[id]/ai/ai-handlers.ts`, `app/api/ai/credentials/**/credential-handlers.ts`, `lib/server/assistant/{context-http,http}.ts`, `app/api/mcp/route.ts`, `lib/constants/ai.ts` (`AI_BODY_LIMITS`, `AI_RATE_LIMITS`), `lib/constants/api-errors.ts` (`BODY_TOO_LARGE`), `docs/architecture/ai.md`
**Produces:**
- `readLimitedBody(req, maxBytes): Promise<{ ok: true; text: string } | { ok: false }>` — Content-Length > max → відміна тіла; інакше стрім-reader з обривом.
- `parseBody(schema, req, message?, options?: { maxBytes?: number })` → 413 `API_ERRORS.BODY_TOO_LARGE` до Zod; без `maxBytes` — поведінка як зараз.
- `AI_BODY_LIMITS` і `AI_RATE_LIMITS` за D6; `checkRateLimit` + `rateLimitResponse` у chat POST (scope `assistant-chat`), credentials PUT/PATCH (`ai-credentials`), MCP POST (`mcp`, ключ — token id).
**Кроки:** спершу інвентар (у звіт задачі і `docs/architecture/ai.md`): entrypoint → читання тіла → ліміт → rate. RED-тести відтворюють ризик, далі GREEN.
**Тести:** chat 70 KiB з Content-Length → 413; той самий без Content-Length (ReadableStream чанками) → 413, reader скасовано після межі (Review Focus 2); 60 KiB валідного JSON → проходить до Zod; 21-й chat-запит за 60 с → 429 з Retry-After; MCP поточні 413-тести зелені; тексти наявних помилок не змінились; `parseBody` без options — наявні `parse-body.test.ts` зелені.
- [ ] commit `fix(constructor): AI entrypoint byte and rate budgets`

## Task 26: Хвіст 2 — повторний parsing (F04)

**Files:** `lib/server/content/operation-service.ts:77-168`, `lib/server/assistant/actions/content.ts:~93,~118`, `lib/server/assistant/execute.ts:49`, `lib/utils/api/content-routes.ts`, `lib/server/assistant/__tests__/parse-cost.bench.test.ts` (create), реєстр знахідок (рядок F04)
**Рішення:** D5. Для type narrowing замість `body.parse(body)` — `bodyOf<K extends ContentOperationId>(id: K, input): z.output<(typeof CONTENT_OPERATIONS)[K]["body"]>` (каст після валідації в `contentOperationSchema`). `prepare` приймає вже розібраний envelope від `dispatchAction`.
**Кроки:** (1) карта шарів і вимір: bench-тест 1000 операцій `rules.update` і content update — час до/після, записати в реєстр; (2) прибрати тотожні; (3) якщо виграш < 5 % — все одно лишити (менше коду), у реєстрі висновок з цифрами.
**Тести:** невалідне тіло все ще дає той самий 400 з тим самим текстом (HTTP і assistant); class-column guard — тест «невідома колонка → CLASS_COLUMN_UNKNOWN 400» зелений; spy — `CONTENT_OPERATIONS["rules.update"].body.parse` 1 раз на HTTP-запит (було 3).
- [ ] commit `refactor(constructor): F04 drop identical re-parses`

## Task 27: Хвіст 3 — accessibility confirm/notify

**Files:** `lib/hooks/common/useNotify.ts:6`, `components/ui/confirm-dialog.tsx:88-114`, `components/ui/responsive-dialog.tsx`, `components/ui/__tests__/confirm-dialog.test.tsx`, `lib/constants/` (`NOTICE_TITLE = "Повідомлення"`)
**Рішення:** `notice(message)` → `{ title: NOTICE_TITLE, description: message, … }`. Confirm без `description`: ResponsiveDialog передає `aria-describedby={undefined}` у `DialogContent`/`Drawer.Content` (заголовок самодостатній) — інакше рендерить Description.
**Тести (happy-dom):** notify — `getByRole("dialog")` має `aria-describedby`, що вказує на елемент із текстом повідомлення; confirm без опису — `console.warn` не викликано (spy), desktop і mobile (mock `matchMedia`); наявні тести діалогів — оновити `findByText` на новий title.
**Браузер (Sonnet-агент, `feedback-browser-context`):** `pnpm dev` на БД `constructor`; desktop і 390 px: notify і confirm — фокус у діалозі, Tab циклічний, Esc закриває, фокус повертається; JS-перевірка `aria-describedby` → текст; скріншот зменшений. Результат — у звіт задачі.
- [ ] commit `fix(constructor): dialog accessible description`

## Task 28: Хвіст 4 — аварійне завершення assistant-check

**Files:** `scripts/constructor/assistant-check.ts`, `scripts/constructor/assistant-check/{browser-server.mjs,manifest.ts,recover.ts}` (create manifest/recover), `scripts/constructor/assistant-benchmark.ts`, `scripts/constructor/assistant-check/benchmark-fixtures.ts`, `lib/server/assistant/__tests__/fixtures/campaign.synthetic.ts`, `scripts/constructor/assistant-check/README.md`, `scripts/constructor/assistant-check/__tests__/crash-cleanup.integration.test.ts`
**Produces:**
- Маніфест `<outputDir>/manifest.json`: `{ runId, pids: { parent, vitest?, server?, chrome? }, fixtures: { userIds[], campaignIds[] }, startedAt }` — пишеться атомарно (tmp + rename) ДО створення кожного fixture/процесу; fixture-фабрики приймають `onCreated(kind, id)`.
- `recoverRun(manifestPath, { db, kill })`: для PID — убити лише якщо процес живий І його `ps -o command=` містить шлях до власного скрипта/профілю `outputDir` (інакше пропустити, звітувати); для fixtures — видалити лише точні id з маніфесту, після перевірки ownership як у `benchmark-fixtures.cleanup` (name prefix, dmUserId, sole member, `@example.invalid`); БД — лише через `assertConstructorDatabaseUrls`; будь-яка невизначеність → exit 1 без видалень (fail-closed).
- `--recover <runId>` режим CLI; на старті `--run` — якщо маніфест з тим runId уже є, вимагати `--recover`.
- vitest-дитина запускається через `spawn` (не `spawnSync`) з обробниками SIGINT/SIGTERM з самого початку.
**Тести (integration, локальна `constructor`):** fault injection — запустити worker, що створює fixture і пише маніфест, `SIGKILL` → `recoverRun` видаляє рівно ці id, чужий campaign з тим самим префіксом лишається; `SIGKILL` browser-server → chrome orphan, `recoverRun` убиває chrome за PID із маніфесту; маніфест із PID чужого процесу (`sleep` без маркера) → не вбито, exit 1; БД не constructor → відмова до будь-якого запиту.
- [ ] commit `fix(constructor): assistant-check crash recovery`

## Task 29: Фінальна перевірка, ревю, документи

**Files:** `docs/superpowers/plans/2026-10-27-constructor-premerge-findings.md` (колонка Disposition), `docs/STATUS.md`, `docs/superpowers/constructor-handoff.md`, зачеплені `docs/architecture/*.md` (battle.md, ai.md, abilities.md), промпт для частини 3
- [ ] `pnpm test:run`, `pnpm test:integration` (constructor), `pnpm exec tsc --noEmit`, `pnpm lint` (0 errors), `pnpm build` — вивід у звіт.
- [ ] `/simplify` одним агентом (Sonnet) на `git diff 7ee09df5...HEAD`; застосувати; повторити test:changed.
- [ ] Одне фінальне ревю Opus (`superpowers:requesting-code-review`) на весь диф частини 2 з Review Focus цього плану; виправлення — Sonnet; повторні перевірки — Sonnet.
- [ ] Disposition кожного з 86 ID (commit-SHA або backlog + причина) + F04/хвости у реєстрі.
- [ ] Оновити STATUS.md, handoff (частина 2 закрита, наступна — частина 3 HOMM-шлюз у новій сесії), architecture-docs; записати промпт для частини 3.
- [ ] commit `docs(constructor): premerge fixes evidence and dispositions`

---

## Disposition (план)

| ID | Задача | | ID | Задача | | ID | Задача |
|---|---|---|---|---|---|---|---|
| A01 | T2 | | B01 | T11 | | C01 | T18 |
| A02 | T3 | | B02 | T11 | | C02 | T19 |
| A03 | T2 | | B03 | T13 | | C03 | T20 |
| A04 | T4 | | B04 | T12 (long-term — backlog D3) | | C04 | T20 |
| A05 | T1 | | B05 | T12 | | C05 | T3 |
| A06 | T1 | | B06 | T16 | | C06 | T22 |
| A07 | T1 | | B07 | T15 | | C07 | T22 |
| A08 | T9 | | B08 | T15 | | C08 | T21 |
| A09 | T5 | | B09 | T16 | | C09 | T21 |
| A10 | T5 | | B10 | T12 | | C10 | T18 |
| A11 | T3 | | B11 | T10, T11 | | C11 | T24a |
| A12 | T6 | | B12 | T11 | | C12 | T24a |
| A13 | T7 | | B13 | T14 | | C13 | T24 |
| A14 | T7 | | B14 | T13 | | C14 | T19 |
| A15 | T8 | | B15 | T14 | | C15 | T24 |
| A16 | T8 | | B16 | T13 | | C16 | T23 |
| A17 | T5 | | B17 | T16 | | C17 | T21 |
| A18 | T1 | | B18 | T16, T17 | | C18 | T19 |
| A19 | T8 (умовно backlog, якщо змінює OpenAPI) | | B19 | T16 | | C19 | T19 |
| A20 | T8 | | B20 | T14 | | C20 | T23 |
| A21 | T3 | | B21 | T17 | | C21 | T23 |
| A22 | T3 | | B22 | T11 | | C22 | T23 |
| A23 | T8 | | B23 | T15 | | C23 | T21 |
| A24 | T7 | | B24 | T17 | | C24 | T21 |
| A25 | T9 | | B25 | T17 | | C25 | T21 |
| A26 | T4 | | B26 | T17 | | C26 | T24a |
| A27 | T6, T9 | | B27 | T17 (умовно backlog, якщо змінює OpenAPI/MCP) | | C27 | T24a |
| A28 | T6 | | B28 | T17 | | C28 | T18 |
| A29 | T9 | | | | | C29 | T21 |


## Порядок і пакети для SDD

Послідовно (залежності): T1 → T2 → T10 → T11 → T12 → T13 → T14 (після T1/T11, бо тексти з них) → T3 … T9 → T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24 → T24a → T25 → T26 → T27 → T28 → T29.

Пакети одного dispatch (дрібні суміжні): [T3+T4], [T5+T6], [T8+T9], [T15+T17], [T20+T24a], [T22+T24]. Решта — по одній задачі.

## Backlog (з причиною)

- **B04 long-term `campaigns.contentRevision`** — нова колонка, міграція і протокол precondition; S10 відніс до окремого epic «scoped hash/versioning». Короткострокове рішення — T12.
- **A19 / B27 (умовно)** — лише якщо T8/T17 покажуть зміну згенерованої OpenAPI/MCP-схеми: «Low зі зміною публічного контракту».
