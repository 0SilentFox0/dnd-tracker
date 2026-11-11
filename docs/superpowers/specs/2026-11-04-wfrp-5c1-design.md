# WFRP 5c-1: стани й Fortune у бою (spec)

Дата: 2026-11-04. Гілка `feat/wfrp` (не мерджити в main до «епік готовий»). Попередні частини — [5b-2](2026-11-04-wfrp-5b2-design.md), 5b-3 (UI бою); реєстр систем і межі — [rule-systems.md](../../architecture/rule-systems.md); правила — [research §4.3–4.4](../research/2026-11-03-wfrp-rule-system.md). 5c розбито: **5c-1** — стани, тіки, зняття, Fortune (цей spec); **5c-2** — психологія, травми, смерть через крити, загоєння.

## Мета й успіх

1. 12 станів WFRP у бою: рівневі Bleeding, Fatigued, Poisoned, Stunned, Ablaze, Broken, Entangled; нерівневі Prone, Surprised, Blinded, Deafened, Unconscious. Крит-маркери bleeding/stunned/unconscious/prone перестають бути інертними й накладають стан.
2. Тіки на початку ходу носія (Bleeding, Ablaze), зняття окремою дією «Спробувати зняти» (d100-тест за каталогом), накладання/зняття ДМом.
3. Fortune в атаці: перекидання невдалого d100 або +1 SL; списується лише коли спрацювало.

Критерії: d20-системи без змін поведінки (наявні тести без правок, `CONDITION_5E_REGISTRY` не змінюється); `wfrp-battle-e2e` проходить сценарій крит → Bleeding → тік → зняття; live-run у браузері.

## Рішення (затверджені користувачем)

| Питання | Рішення |
|---|---|
| Обсяг | 12 станів вище; Besmirched, Corruption — поза межами; Fate лишається на листі/ДМ без нової механіки |
| Модель | `WFRP_CONDITION_REGISTRY` у `wfrp/conditions/` (ключ → `{ leveled, markers, testMod, tick, endTest }`), доступ із ядра лише через необов'язковий хук `RuleSystemDefinition.conditions`; у d20 хука немає |
| Зберігання | стан = `ActiveEffect` з `abilityKey: "wfrp:cond:<key>"`, рівень — значення маркера (як рівні виснаження 5e); рівні з кількох джерел складаються, обрізаються `max` каталогу |
| Тіки | на початку ходу носія; шкода — через `applyDamageConsequences` як небойове джерело |
| Зняття | окрема дія за ходом носія (гравець або ДМ), d100 за таблицею каталогу, серверний або ручний кидок; успіх −1 рівень або зняття |
| Fortune | `fortune: "reroll" \| "sl"` у тілі атаки; лише wfrp і `fortune ≥ 1`, інакше відмова; запис у `actionDetails.fortune` |
| Дані | без міграції; знімок пишуть лише наявні шляхи мутацій (`snapshotHash` як зараз); старі інертні крит-ефекти не мігруються (wfrp не на prod/main) |
| i18n | новий namespace `battleWfrp` (uk/en), не `battle.json` (бюджет scope-size: зараз uk 102.0 / 105 KB gzip); whats-new не додається |
| Приватність | рівень стану чужої не-exact цілі не показується (`canSeeExactStats`), лише наявність |

## Reuse

| Є | Використовуємо |
|---|---|
| `upsertLabeled` / `upsertTimedEffect` (`stackable`), `removeEffects` (`conditions/query.ts`), `PERMANENT_ROUNDS` | накладання/зняття ефекту-стану; без нового сховища |
| `EffectMarker.SKIP_ACTION` (значення 100) / `IMMOBILIZED`, `resetTurnFlags` у `turn-start.ts` | Stunned/Surprised/Unconscious пропускають дію, Entangled/Prone/Unconscious стоять |
| `applyStartOfTurnDamage` (`turn-start.ts`), `resolveDowned`, `runAdvanceTurnLoop` / `enterChangedTurn` | тіки, падіння в непритомність, пропуск неактивного носія |
| `applyDamageConsequences` → `wfrpOnZeroHp` | шкода тіків; на 0 Wounds — наявне правило «небойове джерело дає крит у body» |
| `resolvePercentileTest`, `skillTarget`/`value` (`characteristics/derive.ts`), `resolveOpposed` (`presetRolls.defender`) | тест зняття, перекидання Fortune з тим самим кидком захисника |
| `battleConditionsMutation` (форма схеми/подій), `requireActor`/`currentOf` (`common/control`), `assertCanAct`, `makeBattleHook`, `battleOps` | нові мутації й хуки за тим самим шаблоном |
| `inspiration` (`applyCharacterResources` → `battleData` → `applyBattleResult` у `persistCharacterResources`) | шлях Fortune лист → бій → лист |
| `EffectLine`/`EffectIcon` (`components/battle/hud`), `ConditionsDialog` (`components/battle/dm`), `D100RollBody`, `ActionResultCard` | бейджі, діалог ДМ, перемикач Fortune, підсумок |
| `ExtendLocaleScope` (умовне підвантаження, як `demoTours` у `app/campaigns/[id]/layout.tsx`) | `battleWfrp` лише для wfrp-кампаній |

## Каталог станів

Числа — у `wfrp/conditions/catalog.ts` з позначкою «звірити з книгою» (як `combat/constants.ts`). `L` — рівень; `max` рівневих = 10.

| Ключ | Рівні | Маркери | testMod | Тік на початку ходу | Зняття (`endTest`) |
|---|---|---|---|---|---|
| bleeding | так | — | — | −L Wounds без TB/AP; потім шанс 10%×L отримати Unconscious | Endurance |
| fatigued | так | — | −10×L до всіх власних d100 | — | немає (ДМ/відпочинок) |
| poisoned | так | — | −10×L до всіх власних d100 | — | Endurance |
| stunned | так | SKIP_ACTION | −10×L до всіх власних d100 | — | Endurance |
| ablaze | так | — | — | d10 + L − 1, мінус TB і AP body, мінімум `MIN_DAMAGE` | Athletics |
| broken | так | — | −10×L до всіх власних d100 | — | Cool |
| entangled | так | IMMOBILIZED | −10×L до всіх власних d100 | — | S (характеристика) |
| prone | ні | IMMOBILIZED | атакам ближнього бою по носію +20 | — | «встати» без кидка |
| surprised | ні | SKIP_ACTION | атакам по носію +20 | — | ні; тривалість 1 раунд (наявний відлік) |
| blinded | ні | — | −20 до власних атак; атакам по носію +20 | — | ні (тривалість/ДМ) |
| deafened | ні | — | — | — | ні (тривалість/ДМ) |
| unconscious | ні | SKIP_ACTION, IMMOBILIZED | — | — | ні (ДМ); статус `UNCONSCIOUS` |

«Власні d100» = атака (`attackTarget`, `resolveWfrpAttack`: ціль атакувальника і захисника), тест з листа в бою (`rollWfrpSheetTest`, вхід уже має `participant`), тест зняття.

## Дизайн

### 1. Контракт системи (`lib/utils/rules/systems/types.ts`)
```ts
export interface SystemConditionInfo { key: string; maxLevel: number | null; endTest: "roll" | "stand" | null }
export interface SystemConditionApply { key: string; levels?: number; rounds?: number; round: number; source?: ActiveEffect["source"]; sourceName: LogLine }
export interface SystemConditionResult { participants: BattleParticipant[]; messages: LogLine[] }
export interface RuleSystemConditions {
  catalog: readonly SystemConditionInfo[];
  list(p: BattleParticipant): { key: string; level: number }[];
  apply(ps: BattleParticipant[], targetId: string, input: SystemConditionApply): SystemConditionResult;
  reduce(ps: BattleParticipant[], targetId: string, key: string, by: 1 | "all"): SystemConditionResult & { removed: boolean };
  turnStart(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng; rules: Ruleset }): SystemConditionResult & { downed: boolean };
  attemptEnd(ps: BattleParticipant[], id: string, key: string, ctx: { round: number; rng: Rng; rules: Ruleset; presetRoll?: number }): SystemConditionResult & { success: boolean; roll: number; target: number; sl: number };
}
```
`RuleSystemDefinition.conditions?: RuleSystemConditions`; `RuleSystemCombat.fortune?: true`. `WFRP_SYSTEM` отримує обидва; `unusedMechanics` лишає `"conditions"` (5e-стани й їхній UI в wfrp і далі сховані).

### 2. Рушій wfrp (`lib/utils/rules/systems/wfrp/conditions/`)
- `catalog.ts`: `WFRP_CONDITION_KEYS`, `WfrpConditionKey`, `WFRP_CONDITION_REGISTRY: Record<WfrpConditionKey, WfrpConditionDef>`; `WfrpConditionDef = { leveled: { max: number } | false; markers: EffectMarker[]; testMod?: { self?: (L) => number; selfAttack?: number; against?: { melee?: number; all?: number } }; tick?: "bleeding" | "ablaze"; endTest: { skill: string } | { characteristic: CharacteristicKey } | "stand" | null; rounds?: number }`.
- `levels.ts`: `conditionLevel(p, key): number` (сума значень маркера `wfrp:<key>` по ефектах, обрізана `max`; нерівневі — 0/1), `wfrpConditions(p)` (для `list`).
- `apply.ts`: `applyWfrpConditionTo(p, input): { participant; messages }` — `upsertLabeled` з `{ timedKey: "wfrp:cond:<key>", name: "wfrp:cond:<key>", label: dynamicTextRef("battleWfrp.conditions.<key>.label"), type: "condition", stackable: leveled, permanent: !rounds, effects: [{ type: "wfrp:<key>", value: levels }, ...markers] }`; маркер рівня з префіксом `wfrp:`, щоб `hasCondition`/`conditionEffects` 5e його не бачили. Unconscious ставить `CombatStatus.UNCONSCIOUS`. `reduceWfrpCondition(p, key, by)`: −1 з найновішого ефекту (0 → `removeEffects`) або всі; зняття Unconscious повертає `ACTIVE`, лише якщо `currentHp > 0`. Обгортки на масив учасників для хука.
- `test-mod.ts`: `selfTestMod(p, kind: "attack" | "test"): number`, `againstMod(target, attackKind): number`. Виклики: `wfrpAttackTarget` і `resolveWfrpAttack` (ціль атакувальника `+ selfTestMod(attacker) + againstMod(target)`, цілі захисту `+ selfTestMod(target)`), `rollWfrpSheetTest`, `attemptEnd`.
- `tick.ts`: `wfrpConditionsTurnStart(ps, id, ctx)` — Bleeding, потім Ablaze; кожна шкода: зміна `currentHp` → `applyDamageConsequences({ before, after, amount, rules, rng, participants, round })` (без `location`); шанс непритомності — `rng() < 0.1 × L` → `applyWfrpConditionTo(unconscious)`; `downed` = носій перестав бути `isActive`.
- `end-test.ts`: `attemptWfrpConditionEnd` — ціль за `endTest` (`skillTarget` або `value`) + `selfTestMod`; `resolvePercentileTest({ target, rng, presetRoll })`; успіх → `reduce(key, 1)` (нерівневий → зняття); `"stand"` → зняття без кидка. Лог `battleWfrp.log.endTest*`.
- `index.ts`: `WFRP_CONDITIONS: RuleSystemConditions`.
- Крит: `combat/crit-effect.ts` — якщо `crit.markerKey` ∈ `WFRP_CONDITION_KEYS` (bleeding, stunned, unconscious, prone), викликає `applyWfrpConditionTo(…, { levels: 1, sourceName: крит })` замість інертної мітки; disarmed/winded/crippled лишаються мітками (5c-2). Закриває пропуск head.5 з «Межі 5b-2».

### 3. Ядро бою (лише через `ruleSystemOf(rules).conditions?.…`)
- `turn/turn-start.ts`, `applyStartOfTurnDamage`: усередині гілки «носій активний» після DoT — `conditions?.turnStart(...)`; повідомлення в `damageMessages`; `downed` → `statusChanged = true` (далі наявний `resolveDowned`, `runAbilities` не запускається). `enterChangedTurn` і `runAdvanceTurnLoop` уже перевіряють `isActive(turn.participant)` після `processStartOfTurn`; нового коду в циклі немає, лише тест повторного входу.
- `battleData.conditionTests?: string[]` — ключі, які носій уже пробував зняти цього ходу; скидається в `resetTurnState`. Спроба не витрачає дію; одна на стан за хід.

### 4. Мутації, роути, клієнт
- `lib/server/battles/mutations/system-condition/system-condition-mutation.ts` (ДМ): `systemConditionSchema = discriminatedUnion("action", [{ action: "apply", participantId, condition: string, levels?: int 1..10, rounds?: int 1..CONDITION_LIMITS.rounds }, { action: "remove", participantId, condition, all?: boolean }])`; `systemConditionMutation(ctx, body): MutationResult` — без хука системи або з невідомим ключем → `BattleRuleError("invalid_target", API_ERRORS.CONDITION_UNSUPPORTED)`; відсутній стан при remove → `CONDITION_ABSENT`; подія `dmEvent`.
- `lib/server/battles/mutations/condition-test/condition-test-mutation.ts` (гравець/ДМ): `conditionTestSchema = { participantId, condition: string, roll?: int 1..100, serverRoll?: boolean }` (refine: `roll` або `serverRoll`); `requireActor` + `assertCanAct` (лише поточний носій, активний); ключ зі `endTest !== null` і не в `conditionTests` → інакше `BattleRuleError("action_rejected", API_ERRORS.CONDITION_TEST_UNAVAILABLE)`; кидок — `rngOf(ctx)`/`roll`; подія `battleActionToEvent` з `actionDetails.percentile` тесту.
- `operations.ts`: `"system-condition"` (`access: DM`), `"condition-test"` (`access: MEMBER`, `blockedByMode: true`, `rateLimitScope: "attack"`). Роути `app/api/campaigns/[id]/battles/[battleId]/{system-condition,condition-test}/route.ts` — по одному рядку `runBattleMutation(..., { operation })`. Відповіді — дельти.
- `lib/api/battle-ops.ts`: `systemCondition`, `conditionTest`; `lib/hooks/battles/useBattles.ts`: `useSystemCondition`, `useConditionTest` (`makeBattleHook`); тип тіл — `types/battle.ts` (через `z.infer` у мутації, як `BattleConditionsBody`).
- `lib/constants/api-errors.ts`: `CONDITION_UNSUPPORTED`, `CONDITION_TEST_UNAVAILABLE`, `NO_FORTUNE` + тексти в `messages/{uk,en}/errors.json`.

### 5. Fortune
- Лист → бій: `applyCharacterResources` кладе `battleData.fortune = r.fortune`, коли воно задане; бій → лист: `applyBattleResult` пише `fortune: p.battleData.fortune ?? r.fortune` (wfrp-пресет має `persistResources: true`). Юніти Fortune не мають. Відкат ходу відновлює значення разом зі знімком.
- `attackBodySchema`: `fortune?: "reroll" | "sl"`, `fortuneRoll?: int 1..100` (ручний другий кидок); refine — `fortune` лише з однією ціллю. `validateAttackRequest(scope, data, rules)`: `fortune` без `ruleSystemOf(rules).combat.fortune` або з `(attacker.battleData.fortune ?? 0) < 1` → `BattleRuleError("action_rejected", API_ERRORS.NO_FORTUNE)`.
- `ResolveAttackCtx.fortune?: { kind: "reroll" | "sl"; manualReroll?: number }`; `ResolvedAttack.fortune?: { kind: "reroll" | "sl"; firstRoll?: number }` — присутнє лише коли Fortune спрацювало.
- `resolveWfrpAttack`: `sl` — `+1` до SL атакувальника (`slModifier`/`attackerSlMod`), спрацьовує завжди, коли тест кинуто; `reroll` — лише коли `!isHit`: дальній бій кидає тест удруге, ближній — `resolveOpposed` повторно з `presetRolls: { attacker: manualReroll, defender: <перший rawRoll захисника> }`; береться другий результат (і його Momentum-вихід). Влучання з першого кидка → Fortune не списується.
- `judgeWfrp` (`attack/process/run.ts`): `r.fortune` → −1 `battleData.fortune` атакувальника у `flow.ps`, рядок `battleWfrp.log.fortune`, `action.actionDetails.fortune = r.fortune`. Серверні атаки (`judgeServerWfrp`) Fortune не передають.
- Ручний режим: при ввімкненому «Перекинути» візард просить другий d100 одразу (поле «кидок Fortune, якщо перший невдалий») і шле його як `fortuneRoll`; сервер використовує його лише після промаху. «Авто» — серверний rng.

### 6. UI (`components/battle/*` без `lib/api`, лише хуки)
- Бейджі: `EffectLine`/`MapToken` показують ефекти `wfrp:cond:*` з рівнем `×L` (з `conditions.list`); для чужої не-exact цілі — лише назва без рівня.
- ДМ: у `DmQuickActionsPanel` для систем із `conditions` — діалог `SystemConditionsDialog` (каталог з `conditions.catalog`, рівні, тривалість, зняття) замість 5e `ConditionsDialog`; рендериться через новий необов'язковий слот `SystemUi.battleConditionsDialog` (`components/systems/wfrp/`), бо ядро не імпортує wfrp.
- Носій: у `MyHeroPanel` (і в ДМ-панелі поточного учасника) кнопка «Спробувати зняти» для станів з `endTest`, ще не спробуваних цього ходу; кидок — `D100Input` («Авто»/«Вручну») як в атаці.
- Атака: `D100RollBody` — перемикач Fortune (вимк. / Перекинути / +1 SL), видно при `battleData.fortune ≥ 1` і одній цілі; показує залишок. `ActionResultCard` і журнал — «Fortune використано» (перекидання показує перший кидок).
- i18n: `messages/{uk,en}/battleWfrp.json` (`conditions.<key>.{label,description}`, `log.*`, `ui.*`), namespace у `NAMESPACES` (`lib/i18n/config.ts`); батл-лейаути (`app/campaigns/[id]/battles/layout.tsx`, `dm/battles/layout.tsx`) додають `ExtendLocaleScope namespaces={["battleWfrp"]}` лише для wfrp-кампанії (ключ системи без читання всього JSON `rules`); `scope-size.test.ts` отримує сценарій «campaign + battle + battleWfrp» з тим самим лімітом.

## Дані й міграції
Міграції немає. Стани — `ActiveEffect` у знімку учасника; `battleData.conditionTests`, `battleData.fortune` — JSON знімка; Fortune на листі — `characters.resources`. Усі записи — через `runBattleMutation` / `save-battle` (`snapshotHash` як зараз).

## Тестування
- `wfrp/conditions/__tests__/catalog.test.ts`: складання рівнів з двох джерел, обрізання `max`, нерівневий не складається, `reduce` −1 / усі, Unconscious ставить і знімає статус (з `currentHp` 0 лишається UNCONSCIOUS), маркери `wfrp:*` не бачить `hasCondition`.
- `test-mod.test.ts`: Fatigued 2 → −20 в атаці й тесті з листа; Stunned/Blinded/Entangled знижують ціль атаки; Prone/Surprised/Blinded дають бонус атакувальнику; захисник зі станом — нижча ціль захисту.
- `tick.test.ts` (детермінований rng): Bleeding 2 → −2 Wounds; шанс непритомності на межі (rng 0.19 / 0.21 при L=2); Ablaze з TB/AP і мінімумом; падіння на 0 → `wfrpOnZeroHp`.
- `end-test.test.ts`: успіх −1 рівень, провал без змін, «stand» без кидка, ручний `presetRoll`, штраф Fatigued враховано.
- Крит: `combat.test.ts` — head.2 → Bleeding 1, head.5 → Unconscious + статус, arm.3 «disarmed» лишається міткою.
- Fortune (`combat.test.ts` + attack-mutation): reroll лише при невдачі (влучання першим кидком — не списано), ближній reroll зберігає кидок захисника, `sl` +1 SL і списано, ручний `fortuneRoll`, відмова `NO_FORTUNE` без Fortune / у d20 / з кількома цілями, `actionDetails.fortune`, persist у `resources.fortune` після завершення.
- Ядро: `turn-start`/`run-advance-turn-loop` — носій знепритомнів від тіку → цикл переходить до наступного активного; `enterChangedTurn` так само; d20 без хука — без змін.
- Мутації: `system-condition` (ДМ, невідомий ключ, d20 → `CONDITION_UNSUPPORTED`), `condition-test` (не свій хід, повтор того ж стану → `CONDITION_TEST_UNAVAILABLE`, дельта).
- `wfrp-battle-e2e.test.ts`: крит → Bleeding → тік на початку ходу → «Спробувати зняти» → стан знято.
- Паритет d20: наявні тести без правок; `scope-size` для обох сценаріїв.
- Під час роботи `pnpm test:related` по змінених файлах; повний прогін раз у кінці; live-run у браузері — один Sonnet-субагент після реалізації (стани на токені, діалог ДМ, зняття, Fortune у ручному й авто режимі).

## Ризики
- Ефекти `type: "condition"` з wfrp-маркерами: місця ядра, що загально фільтрують `type === "condition"` (не через 5e-ключ), можуть зачепити їх — пройти `grep` під час плану й покрити тестом.
- Unconscious має два джерела (0 Wounds через `wfrpOnZeroHp` і стан); статус синхронізується лише при накладанні/знятті стану — лікування до >0 Wounds не знімає стан-ефект (ДМ знімає вручну).
- Тік, що вбиває носія на початку ходу, проходить через `resolveDowned` і цикл; пропуск цієї гілки = завислий хід. Покрито тестом циклу.
- Бюджет i18n: `battleWfrp` в wfrp-кампанії додається до 102 KB; якщо сценарій «campaign + battle + battleWfrp» перевищить 105 KB — скоротити описи станів (довгі описи — у довідку 5c-2).

## Поза межами (5c-2 і далі)
Психологія (Fear, Terror, Frenzy, Hatred, Animosity), постійні травми й леджер `injuries`, смерть через крити (> TB), загоєння й Heal-тест іншого учасника, Besmirched, Corruption, Fate у бою, тіки на непритомному носії (кровотеча до смерті), мітки disarmed/winded/crippled як механіка, Fortune для ініціативи й серверних атак.

## Відкриті питання / припущення
- Числа каталогу (max 10, −10×L, +20, формула Ablaze, навичка зняття Ablaze/Entangled) — припущення до звірки з книгою 5e.
- Спроба зняття — вільна дія, одна на стан за хід; Poisoned без тіку (лише штраф).
