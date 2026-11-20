# WFRP 5e: завершення W2 (Fate, Fortune, Momentum, UI, баланс, дані)

Гілка `feat/wfrp5-canon-w0-w1` (HEAD 7bb8aad71). Усе лише під `canon5e`; легасі не змінюється. Контекст: [handoff](2026-11-20-wfrp5-canon-handoff-w0-w3.md) («Хвости W2», сесії 2–5), аудит `docs/superpowers/research/2026-11-19-wfrp5-canon-audit.md` (M05–M08), `docs/architecture/rule-systems.md` («Wfrp: редакція»).

Правила для виконавців (Sonnet): тести пишуть, але **не запускають**; канон-тести в `systems/wfrp/__tests__/canon/` через `bookExample(page, …)`; коментарі англійською, мінімальні; нові тексти лише через ключі (`uk` + `en`); core не називає систему. Фінальні гейти (пакет K): `pnpm test:related <змінені файли>`, `pnpm exec eslint --fix` по папках, `pnpm cycles`, `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`.

## Канон (перефраз)

- с. 133 Fortune: Advantage до кидка; перекинути тест (новий результат лишається, можна витратити ще Fortune й перекинути знову); зняти один стан (с. 184). Fortune повертається щосесії.
- с. 133 Fate: **How Did That Miss?** — після кидків атаки, до шкоди/наслідків протиборчого тесту/критів: атака не має ефекту. **Not Today!** — замість смерті персонаж вибуває з сутички й більше не бере в ній участі, але виживає. Fate не відновлюється сам.
- с. 163 Disengage: із Momentum — втратити її й рухатися без штрафу; без неї — тест Dodge/Perform.
- с. 167 Два види зброї: після атаки однією — витратити Momentum на негайну атаку зброєю в іншій руці. с. 168: за хід не більше однієї додаткової атаки за Momentum.
- с. 169 Leadership: вільна дія — втратити Momentum, тест Leadership, при успіху союзник отримує Momentum.
- с. 27/29/31/33/35 види: людина Fate 4 / Fortune 3, дварф 2/2, гафлінг 2/3, високий ельф 1/2, лісовий ельф 1/2.

## Що перевикористовуємо (і чому нове)

| Потреба | Беремо | Нове |
|---|---|---|
| Пауза атаки до рішення цілі | `lib/utils/battle/crit-choice/{gate,run-with-crit-choice,types,pending}.ts` (реплей за `seed`, `CritResume`, пауза при `offers`), `BattleOperationDeps.attack` (резюме), блокування інших мутацій (`crit_pending`), `redactPendingForPlayers`/дельти — без змін | generic `negate`-пікер у гейті (поряд із `rider`), wfrp-операція `fate-reaction` (d20 `crit-choice` живе в `systems/d20`, wfrp її не має) |
| UI вікна | шаблон `systems/d20/hooks/battle/useRiderChoiceDialog.ts`, `RiderChoiceDialog`, `CritChoiceWaitingBanner`, `WaitingNotice`, слоти `SystemBattleUi.dialogs/notices` | `FateReactionDialog`, `FateWaitingNotice` |
| Друга атака | пул `battleData.attacksLeft` (`attacks-left.ts`: `hasPoolAttack`/`spendFromPool`, скидання в `turn-state.ts`), `wfrpResetState` (scope `turn`) | `grantSecondAttack` у `combat/momentum.ts` |
| Тест Leadership / кидок | `resolvePercentileTest`, `skillTarget` (`leadership` — basic, `catalog.ts:68`), `selfTestMod/selfSlMod`, схема `roll`/`serverRoll` і `rngOf` з `condition-test-mutation.ts`, `newBattleAction`+`logFields` | `momentum-mutation.ts` |
| Зняти стан | `reduceWfrpConditionIn(ps, id, key, 1)` (`conditions/apply.ts`), `ConditionTestPanel` + `useConditionTestPanel` | `fortune-condition-mutation.ts` |
| Fortune/Fate | `applyFortune`, `forcedOf`, `spentFor/spentFate/spentFortune`, `resolveModeSources`, `FORTUNE_INPUT`, `assertWfrpInput` | `rerolls`, `fateLeftOf` |
| Смерть | `kill`/`startDeathTimer`/`tickDeathTimer` (`critical.ts`), Bleeding-смерть (`tick.ts:236`) | `notToday` |
| Ресурси | `editResources` + `resources.limits` (`fateMax` = насправді макс. Fortune), `ResourceFields`, `SHEET_SLOT` (`fortuneMax`, `fateLeft`) | `fateLimit`, `patch.fate` |
| Баланс | `winChanceFor`, кеш таблиць, `hitModelOf` | режими Advantage + стаціонарна Momentum |

## Рішення (прийняті за замовчуванням)

1. **Гейт Fate-витрат** — профіль `fortunePools === 'split'` (= `canon5e`), без нового поля профілю.
2. **Поточна Fate** — `fateLeftOf(p) = wfrpState(p).fate ?? participantChars(p)?.fate ?? 0`. Зараз `assertWfrpInput`/UI читають `wfrpState.fate ?? 0`, тож герой, що ще не витрачав Fate, бачить 0 — це баг, виправляє пакет A.
3. **How Did That Miss** — лише атаки (ближні/дальні) з однією ціллю; закляття → W5 (касти йдуть іншим конвеєром). Пропозиція з'являється лише при влучанні (`isHit`) і `fateLeftOf(target) ≥ 1` (вороги з редакційною Fate — теж, відповідає DM). Відповідає власник цілі або DM, дедлайну немає (як crit-choice). Скасування прибирає **всі** наслідки атаки: шкоду, Momentum обох сторін, крит захисника за дублем (с. 133: «до розв'язання протиборчого тесту»); витрачені атакувальником Fortune/Fate лишаються витраченими.
4. **Not Today** — застосовується автоматично, коли учасник із Fate ≥ 1 мав би загинути під `split` (альтернатива — смерть). Стан: `UNCONSCIOUS`, `fate − 1`, `outOfFight: true`, без таймера смерті; далі жодних критів, тіків Bleeding чи таймера; після бою не мертвий.
5. **Fortune-перекид під canon5e** — оголошується до кидка з кількістю `rerolls` (1…Fortune): перекидаємо, доки результат не успіх і ліміт не вичерпано, списуємо лише використані. Перекид «будь-якого результату» після показу кидка потребував би ще одного вікна — не робимо (дає вигоду лише для гонитви за SL). Ручний кидок — максимум один перекид. Легасі: як зараз (`rerolls` ігнорується = 1).
6. **Fortune «зняти стан»** — будь-коли контролером або DM (поза паузою), без витрати дії, один рівень стану.
7. **Друга атака за Momentum** — після основної дії (`hasUsedAction`), лише раз на хід (`momentumAttack`), потрібні ≥ 2 атаки ближнього бою (дві зброї; таланти Dual Wielder — пізніше). Видає `attacksLeft: 1`, далі звичайна кнопка атаки.
8. **Momentum у деталях** — під `participant` модель Momentum не витрачається, а дає Advantage: деталі пишуть `momentumAdvantage: true` (замість `momentumUsed`), UI показує «Momentum: Advantage». Підпис Fortune `sl` під `reverse` = «Advantage».
9. **Тест на аркуші** — `fortune` у тілі тесту; списання в транзакції обробника; заборонено, коли герой у активному бою (як inspiration, `assertNotInActiveBattle`).
10. **Ліміт Fate (DM-правка)** — `limits()` повертає `fateLimit = characteristics.fate`; `patch.fate` клампиться `0…fateLimit`. Перейменування `fateMax → fortuneMax` у core не робимо (зайвий churn).

## Пакети

Позначки: **∥** можна паралельно (файли не перетинаються), **→** після.

### A. Фундамент: стан, хелпери, ключі (перший, послідовно)
Файли: `systems/wfrp/rules/slots.ts`, новий `systems/wfrp/rules/combat/fate.ts`, `rules/combat/input.ts`, `rules/percentile/fortune.ts`, `server/attack-input.ts`, `ui/battle/D100RollBody.tsx`, `ui/battle/CastTestBody.tsx`, `lib/constants/api-errors.ts`, `messages/{uk,en}/{errors,battleWfrp,battleWizards,rest,whatsNew}.json` (+ namespace редактора характеристик і `wfrpCreation`), `systems/wfrp/meta.ts`.
- `WfrpParticipantState`: `outOfFight?: true`, `momentumAttack?: true` + парсинг у `PARTICIPANT_STATE`.
- `combat/fate.ts`: `fateLeftOf(p): number`; `fateSpendsOn(rules): boolean` (= `editionOf(rules).fortunePools === 'split'`). Замінити читання Fate в `input.ts`, `D100RollBody`, `CastTestBody`.
- `FortuneInput.rerolls?: number` (ціле 1…9) у `FORTUNE_INPUT` і `WfrpFortuneInputSchema`; `assertWfrpInput`: `fortune ≥ (rerolls ?? 1)` для `reroll`.
- `API_ERRORS`: `FATE_REACTION_NONE`, `MOMENTUM_UNSUPPORTED`, `MOMENTUM_NONE`, `MOMENTUM_ATTACK_USED`, `SECOND_ATTACK_UNAVAILABLE`, `LEADERSHIP_ALLY_INVALID`, `FORTUNE_CONDITION_UNAVAILABLE` (+ `errors.json` uk/en).
- Ключі i18n (uk+en): `battleWfrp.log.{fateHowDidThatMiss {name, attacker}, fateNotToday {name}, momentumSecondAttack {name}, leadershipTransfer {name, ally, sl}, leadershipFailed {name, sl}, fortuneCondition {name, condition}, fortuneRerolls {name, rolls}}`; `battleWfrp.ui.fortune.{advantage, rerolls, usedRerolls {rolls}, critical, location, removeCondition}`; `battleWfrp.ui.fateReaction.{title, body {attacker, name}, spend, accept, waiting}`; `battleWfrp.ui.momentum.{title, secondAttack, leadership, ally, reason.{none, used, action, weapons}}`; `battleWizards.attack.summary.d100.momentum.advantage`; `rest.badges.fate {current}`; `rest.resources.{fortune, fate}`; `rest.sheetRoll.fortune.{label, off, advantage, reroll, notFail, used, usedNotFail}` (сторінка героя не вантажить `battleWfrp`); підпис «Fortune max» у namespace `CharacteristicsEditor`; `wfrpCreation` — Fortune виду.
- `whatsNew`: `{ id: '2026-11-20-wfrp-fate-fortune', audience: 'all' }` у `meta.ts` + `whatsNew.json` uk/en (Advantage, особиста Momentum і її витрати, Fate «I Will Not Fail / How Did That Miss / Not Today», Fortune). За потреби підняти `budgetKb.battle`.

### B. Core: generic `negate` у crit-гейті (→ A; ∥ D, H, I, J)
Файли: `lib/utils/battle/crit-choice/{types,gate,run-with-crit-choice}.ts`, `__tests__/`.
```ts
interface NegateInfo { holder: BattleParticipant; actorId: string; cost: string /* i18n key of the price */ }
type NegatePicker = (info: NegateInfo) => boolean;
interface NegateOffer { key: string; holderId: string; actorId: string; cost: string }
// CritPicker.negate?: NegatePicker; PendingCritChoice.negations?: NegateOffer[]; CritResume.negateChoices?: Record<string, boolean>
```
- Гейт: ключ `negate:<holderId>:<n>`, офер пишеться завжди, повертає `!!negateChoices?.[key]`; **rng не чіпає** (реплей детермінований).
- `runWithCritChoice`: пауза також при `negations.length > 0` (без резюме); `shown.negations`; `resume.negateChoices` іде в гейт. `triggers: []` лишається масивом (тоді `critPendingOf` працює).
- Тести: ключі стабільні при двох цілях; пауза з negations; резюме з `{key: true}` повертає `pendingChoice: null`; d20-райдери без змін.

### C. How Did That Miss: правила + сервер (→ B)
Файли: `systems/wfrp/rules/combat/resolve-attack.ts`, новий `systems/wfrp/server/battle/fate-reaction-mutation.ts`, `server/index.ts`, `api/battle.ts`, `__tests__/canon/fate.test.ts`, `server/__tests__/`.
- `resolve-attack.ts`: `negateByFate(ctx, r, edition): ResolvedAttack` викликається **один раз на фінальному результаті**, до `marked` (`marked(negateByFate(result.resolved), fortune)` у ближньому і так само в дальньому), бо `applyFortune` може викликати `meleeOnce` двічі. Умова: `fateSpendsOn`, `r.isHit`, `fateLeftOf(target) ≥ 1`, `ctx.crit?.negate?.({ holder: target, actorId, cost: 'battleWfrp.ui.fateReaction.spend' })`. Результат: `isHit: false`, без `scene`, `attackerUpdate` прибрано (counter-crit і Momentum теж), `targetUpdate: p => withWfrpState(p, spentFate(p))`, рядок `fateHowDidThatMiss`, у `ACTION_SLOT` позначка `negated: true`.
- Мутація: схема `{ answers: z.record(z.string().max(120), z.boolean()) }`. `critPendingOf` без `negations` → `FATE_REACTION_NONE`; набір ключів має збігтися з оферами (`CRIT_CHOICE_INCOMPLETE`); доступ: DM або контролер **усіх** holder-ів (`FORBIDDEN`); далі `deps.attack({...ctx, userId: hidden.userId, isDM: hidden.isDM}, hidden.request, { seed, choices: {}, negateChoices: answers }, { serverRolls })`.
- Реєстрація `'fate-reaction'` у `WFRP_MODULE_SERVER.battle`: `access: 'member'`, `allowWhileAwaitingDm`, `allowWhileCritPending`, `respond: 'wrapped'`, `missing: FATE_REACTION_NONE`. `api/battle.ts`: `fateReactionOp(answers)`.
- Тести: с. 133 «влучання з Fate → пауза; spend → без шкоди, Fate −1, Momentum не змінилась; accept → як без паузи (той самий seed)»; без Fate/легасі — без паузи; промах — без пропозиції; чужий гравець → 403.

### C2. How Did That Miss: UI (→ C; ∥ F)
Файли: нові `systems/wfrp/hooks/useFateReaction.ts` (+ експорт у `hooks/index.ts`), `systems/wfrp/ui/battle/{FateReactionDialog,FateWaitingNotice}.tsx`, `ui/index.ts`, `ui/battle/__tests__/FateReactionDialog.test.tsx`.
- Хук за зразком `useRiderChoiceDialog`: `{ open, rows: { key, holderName, attackerName }[], answer(answers), isSubmitting }`; `open` — є `negations`, `triggers` порожні, глядач — DM або контролює всіх holder-ів.
- Діалог: на рядок дві кнопки «Витратити Fate — промах» / «Прийняти удар»; надсилає всі відповіді разом. Notice: `WaitingNotice` для решти (не DM і не holder).
- `battle.dialogs: [FateReactionDialog]`, `battle.notices: [FateWaitingNotice]` (динамічний імпорт, як `ChannelDialog`).

### D. Not Today (→ A; ∥ B, H, I, J)
Файли: `systems/wfrp/rules/combat/{critical,on-zero-hp}.ts`, `rules/conditions/tick.ts`, `__tests__/canon/wounds.test.ts` (або новий `canon/not-today.test.ts`).
- `critical.ts`: `notToday(p): BattleParticipant | null` (Fate ≥ 1 → `UNCONSCIOUS`, `fate − 1`, `outOfFight`, `dyingRounds: undefined`); `kill` спершу пробує `notToday`. `critical.ts` викликається лише під `critical`-моделлю; Bleeding-смерть у `tick.ts` — додатково перевірити `fateSpendsOn(rules)`.
- Лог: `notTodayLine(prev, next)` → `fateNotToday`, коли `outOfFight` щойно з'явився; викликачі (`crit-effect.ts`/`apply.ts`, `tickDeathTimer`-місце у `wfrpSkippedTurn`, Bleeding) додають рядок.
- `outOfFight`: `criticalOnZeroHp` повертає без змін; `wfrpSkippedTurn` і тік Bleeding пропускають; `startDeathTimer` не стартує. Перевірити, чи core-лікування (`statusForHp`) повертає `ACTIVE`: якщо є системний хук — заблокувати, інакше записати хвіст у STATUS.
- Тести (с. 133): смертельний рядок крита з Fate 1 → живий, unconscious, Fate 0, `outOfFight`; без Fate → мертвий; таймер смерті з Fate; повторний удар по `outOfFight` — без крита; легасі без змін.

### E. Витрата Momentum (→ C і C2: спільні `server/index.ts`, `ui/index.ts`, `api/battle.ts`)
Файли: `systems/wfrp/rules/combat/momentum.ts`, `rules/state-parts.ts` (`wfrpResetState`), новий `server/battle/momentum-mutation.ts`, `server/index.ts`, `api/battle.ts`, нові `hooks/useMomentumPanel.ts`, `ui/battle/MomentumPanel.tsx`, `ui/index.ts` (`battle.heroPanels`), тести.
```ts
secondAttackBlocker(p: BattleParticipant): 'none' | 'used' | 'action' | 'weapons' | null
grantSecondAttack(p): BattleParticipant // loseMomentum + momentumAttack + attacksLeft: 1
```
- `wfrpResetState` (scope `turn`) скидає `momentumAttack`.
- Мутація: `z.discriminatedUnion('mode', [{ mode: 'secondAttack', participantId }, { mode: 'leadership', participantId, allyId, roll?, serverRoll? }])` з refine «roll або serverRoll». Перевірки: `momentumModel === 'participant'` (інакше `MOMENTUM_UNSUPPORTED`), `requireActor`, хід актора (`currentOf`), `assertCanAct`, `hasMomentum`. Leadership: спершу `loseMomentum` (втрачається і при провалі), тест `skillTarget(chars, 'leadership')` + `selfTestMod`/`selfSlMod`, `slModel` редакції; успіх → `withMomentum(ally, true)`. Союзник: та сама сторона, активний, не сам (`LEADERSHIP_ALLY_INVALID`). Лог через `newBattleAction` як у `condition-test`.
- Реєстрація `momentum` (`access: 'member'`, `blockedByMode`, `rateLimitScope: 'attack'`, `missing: MOMENTUM_UNSUPPORTED`); `momentumOp(body)`.
- UI: панель видно, коли `hasMomentum(hero)` і модель `participant`: «Друга атака» (вимкнена з причиною), «Передати Momentum» → вибір союзника + сервер/ручний d100 (`D100Input`, `AiRollButton`, як у `ConditionTestPanel`).
- **Disengage — див. питання 1.**
- Тести: канон с. 167/168 (друга атака раз на хід, потрібні дві зброї, не до основної дії), с. 169 (успіх/провал Leadership; Momentum втрачається завжди), легасі → `MOMENTUM_UNSUPPORTED`.

### F. Fortune: канонічний перекид, зняття стану, Momentum-Advantage у деталях (→ C; ∥ C2)
Файли: `rules/percentile/fortune.ts`, `rules/combat/resolve-attack.ts`, `rules/combat/details.ts` (або `percentile/details.ts`, де `PercentileAttackDetails`), `rules/magic/cast-test.ts`, `ui/battle/PercentileResultLines.tsx`, новий `server/battle/fortune-condition-mutation.ts`, `server/index.ts`, `api/battle.ts`, `hooks/useConditionTestPanel.ts`, `ui/battle/ConditionTestPanel.tsx`, тести.
```ts
applyFortune(test, fortune, isSuccess, firstPreset?, opts?: { repeat?: boolean })
  // → { result, fortune?: { kind; firstRoll?; rolls?: number[]; spent: number } }
spentFortune(p, n = 1); spentFor(p, kind, n = 1)
```
- `repeat` (= `fateSpendsOn`) дозволяє до `rerolls` перекидів, доки не успіх; `manualReroll` — лише перший. Викликачі (`resolve-attack` `marked`, `cast-test`) списують `fortune.spent`. Рядок `fortuneRerolls` при > 1.
- `resolve-attack`: під `personal` замість `momentumUsed` писати `momentumAdvantage: true`; `PercentileResultLines` → `momentum.advantage`; перелік перекидів `usedRerolls`.
- Мутація `fortune-condition`: `{ participantId, condition }`; `fateSpendsOn`, контролер або DM, `fortune ≥ 1`, стан є → `reduceWfrpConditionIn(ps, id, key, 1)` + `spentFortune`; лог `fortuneCondition`; інакше `FORTUNE_CONDITION_UNAVAILABLE`. Реєстрація (`access: 'member'`), `fortuneConditionOp`.
- Панель станів: під canon5e кнопка «Fortune: зняти» біля кожного стану (`removeWithFortune(key)`, `fortuneLeft`).
- Тести с. 133: два перекиди → другий успіх, списано 2; успіх з першого → списано 0; легасі — один перекид; зняття стану −1 рівень і −1 Fortune; без Fortune → помилка.

### G. Тест на аркуші: Fortune / Advantage / notFail (→ F, H)
Файли: `types/characters.ts` (`SheetTestSubject & { difficulty?; fortune?: 'advantage' | 'reroll' | 'notFail'; rerolls?: number }`, `SheetPercentileRollResult.fortune?`), `lib/schemas/out-of-combat.ts`, `lib/utils/rules/systems/types.ts` (`SheetTestInput.resources`; результат `spent?: { fortune?: number; fate?: number }`), `lib/server/characters/core/roll-handler.ts`, `systems/wfrp/rules/sheet-test.ts`, `components/systems/types.ts` (`RollDialogBodyProps.extra` + `setExtra`), `components/character-profile/rest/SheetRollDialog.tsx`, `systems/wfrp/ui/RollDialogBody.tsx`, тести.
- wfrp: `advantage` → `resolveModeSources({ advantage: 1 })` під `reverse`, інакше +1 SL; `reroll` → `applyFortune`; `notFail` → `forcedOf`. Недостатньо ресурсу → `ContentError(NO_FORTUNE | NO_FATE, 409)`.
- Обробник: при `fortune` — `assertNotInActiveBattle`; у транзакції lock рядка, повторна перевірка, віднімання `spent` із `resources` (запис `resources`-колонки тим самим шляхом, що й `resources-handler`).
- UI: `RollDialogBody` бере `fortune`/`fateLeft` з `SHEET_SLOT` (`useProfile`) і рендерить `FortunePicker` (з пакета H).
- Тести: схема приймає/відкидає; списання Fortune/Fate; notFail → успіх ≥ +1 SL; d20 sheet-roll без змін.

### H. UI підписи + редагування ресурсів + core clamp (→ A; ∥ B, D, I, J)
Файли: `ui/battle/D100RollPicker.tsx` (+ новий `ui/battle/FortunePicker.tsx`), `ui/battle/{D100RollBody,CastTestBody,ChannelDialog}.tsx`, `ui/{HeroStats,RestBadges,ResourceFields,CharacteristicsEditor}.tsx`, `rules/characteristics/keys.ts` (сетер: `'fortune'`), `systems/wfrp/index.ts` (`limits` → `fateLimit`), `lib/utils/rules/systems/types.ts` (`limits?(): { fateMax?; fateLimit? }`), `lib/utils/characters/resources/edit.ts`, `types/characters.ts` (`ResourcesEditBody.fate`), `lib/schemas/out-of-combat.ts` (`fate`), `lib/server/characters/core/resources-handler.ts`, тести.
- `FortunePicker` (витяг із `D100RollPicker`): props `{ advantageLabel, left, fateLeft, value, onChange, rerolls?, notFail?: { critical, location, set } }`; `sl` під `advantageLabel` = «Advantage»; для `reroll` під canon і серверного кидка — лічильник 1…left; для `notFail` — перемикач Critical + вибір `LOCATIONS`. Тіла діалогів збирають вхід `{ kind, rerolls?, critical?, location? }` і передають `advantageLabel = editionOf(battle.rules).advantageModel === 'reverse'`.
- `HeroStats`: Fate `fateLeft/fate`, Fortune `fortune/fortuneMax`. `RestBadges`: дві плашки (Fortune x/y, Fate n). `ResourceFields`: поля Fortune і Fate. `CharacteristicsEditor`: «Fortune max» (порожньо = як Fate).
- `editResources`: `patch.fate` → `min(fateLimit, max(0, …))`, лише коли `fateLimit` задано.
- **G і H обидва чіпають `types/characters.ts` і `out-of-combat.ts`** — тому G після H.
- Тести: `edit.ts` (кламп Fate, відсутній `fateLimit` → ігнор), `D100RollPicker.test.tsx` (підпис Advantage, лічильник, локація).

### I. Баланс: Advantage і Momentum у win-chance (незалежний; ∥ будь-що)
Файли: `rules/combat/{win-chance,hit-model}.ts`, `rules/combat/__tests__/`.
```ts
winChanceFor(model, modes?: { attacker?: 'advantage' | 'normal' }) // table key includes the mode
momentumWinChance(model): (a, d) => number
// wN = normal, wA = advantage; p* = wN / (1 − wA + wN); chance = p*·wA + (1 − p*)·wN
```
- `hit-model.ts`: `canonModel` бере `momentumWinChance`, коли `advantageModel === 'reverse' && momentumModel === 'participant'`. Легасі-таблиця та сама.
- Тести: `wA ≥ wN`; `wN ≤ momentum ≤ wA`; легасі `winChance` не змінився (порівняти кілька точок).

### J. Дані видів: Fortune (незалежний; ∥ будь-що, ключі з A)
Файли: `rules/creation/{profile,schema,plan}.ts`, `ui/creation/SpeciesStep.tsx`, DM-редактор профілю виду (знайти за `RaceProfile`/`race-profile`), `scripts/templates/systems/wfrp/validate.ts`, `data/templates/grim-d100/race-profiles.json`, тести creation.
- `SpeciesProfile.fortune?: number` (схема 0…9, optional); `plan.ts` переносить `fortune` у характеристики; без поля — як зараз (`fortuneMax` = Fate). Міграція не потрібна. Значення — питання 2.

### K. Фінал (→ усе)
Гейти: `pnpm test:related` на змінені файли, eslint по папках (`systems/wfrp`, `lib/utils/battle/crit-choice`, `lib/server/characters`, `lib/utils/characters`, `components/character-profile`), `pnpm cycles`, `tsc`. Документи: `rule-systems.md` («Wfrp: редакція»: Fate-реакції, Momentum-витрати, Fortune), `battle.md` (generic `negate` у crit-гейті), `docs/STATUS.md`, handoff («W2 закрито»). Шаблон Grim на проді — крок власника.

## Порядок і хвилі

| Хвиля | Пакети |
|---|---|
| 0 | A ∥ I ∥ J |
| 1 | B ∥ D ∥ H |
| 2 | C |
| 3 | C2 ∥ F |
| 4 | E ∥ G |
| 5 | K |

Для зменшення числа диспетчів: I+J одним виконавцем, C+C2 одним (послідовно), D окремо.

## Відкриті питання власнику

1. **Disengage за Momentum (с. 163).** У wfrp немає стану Engaged і вільних атак при відході (M12, W4), тож витрата Momentum на Disengage зараз нічого б не змінила. За замовчуванням: перенести у W4 разом із M12 (режим `disengage` додається в ту саму `momentum`-операцію). Чи робити заглушку зараз?
2. **Fortune/Fate видів Grim** (homebrew-види, не канонічні). Пропозиція за аналогами книги: lowlander (≈ людина) Fate 2 → лишити, Fortune 3; delver (≈ дварф) 0 / 2; hearthkin (≈ гафлінг) 2 / 3; veyl (≈ ельф) 0 / 2. Чи брати канонічні Fate (4/2/2/1) замість поточних? Інакше в даних додається лише `fortune`.

## Рішення власника (2026-11-20)
- Усе за замовчуванням плану, максимально близько до канону.
- Disengage за Momentum → W4 (немає Engaged).
- Fate видів Grim: книжкова (lowlander 4, delver 2, hearthkin 2, veyl 1), Fortune за аналогами (3/2/3/2); пакет J оновлює й Fate.

## Передача: закрити хвости W2 (нова сесія)
Стан: пакети A–J готові, НЕЗАКОМІЧЕНО на `feat/wfrp5-canon-w0-w1` (HEAD 7bb8aad71). tsc/cycles/eslint чисті, `test:changed` зелений крім `assistant-cleanup-cron` (БД, не наш), `/simplify` пройдено.
Хвости:
1. core-хук `keepsDown?(p)` (або еквівалент): `statusForHp`/DM-правка HP/лікування не повертає `outOfFight`-учасника в бій (перевірити всі шляхи лікування, не лише patch-participant).
2. Перевірка зброї другої атаки (`momentum.ts` `secondAttackBlocker`) — враховувати руку (основна/`:off`), не лише ≥2 ближні атаки.
3. UI Critical+локація для notFail у sheet-пікері (схема `out-of-combat.ts` приймає лише `fortune`/`rerolls`).
4. Типізувати `RollDialogBodyProps.extra` (зараз `Record<string, unknown>` + cast у `SheetRollDialog`).
5. e2e grim ставлять `fate: 0` (`grim-e2e-helpers.ts`) — додати окремі e2e для Fate-паузи (How Did That Miss) і Not Today.
6. Перевірити в рев'ю: `rules` у `view` (`useAttackWizard.ts`, `useSpellBook.ts`); тест логіки `useFateReaction` (open/waiting/DM/controller) без моку; `bookExample` у `momentum-mutation.test.ts`.
7. Фінал: Opus-рев'ю гілки, повний `test:run`, sweep homm/dnd5e (prodcopy, потрібен «так»), коміт (після «так»).
