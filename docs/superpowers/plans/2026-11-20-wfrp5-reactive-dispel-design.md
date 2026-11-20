# WFRP 5e: реактивний Dispel, що скасовує закляття (дизайн)

Дата: 2026-11-20 · гілка-основа: `feat/wfrp5-w9` · статус: дизайн, код не писався.

Закриває хвіст (а) з `docs/architecture/rule-systems.md` («реактивний Dispel не скасовує вже застосовані ефекти»).

## 1. Проблема

Ворожий каст у WFRP canon5e проходить в одному запиті: `createSpellMutation` → `executeCast` → `castSpell` кидає Casting-тест і одразу кладе ефекти/шкоду. Реактивний Dispel (`systems/wfrp/server/battle/dispel-mutation.ts`, `mode: 'reactive'`) працює вже після цього і лише стирає `lastCast`. Потрібно, щоб успішний Dispel означав, що закляття **не подіяло**.

## 2. Що вже є в ядрі (ключова знахідка)

У d20 Counterspell уже реалізовано **відкладений каст**:

- `lib/server/battles/mutations/spell/cast-counter.ts` (`openCounterIfAny`) — каст зупиняється, у `scene.pendingChoice` пишеться `{ shown: ShownCounter, hidden: HiddenCounter }` (запит, `seed`, `userId`, `isDM`, `attempts`).
- `scene.pendingChoice` живе в колонці `battle_scenes.pendingCritChoice` (`save-battle.ts`), **не** в `battle_participants.snapshot` → правило `snapshotHash` не зачіпається; учасники при відкритті вікна не змінюються.
- Поки `pendingChoice` відкрите, `run-battle-mutation.ts` відхиляє всі інші операції (`COUNTER_WINDOW_OPEN`), крім тих, що мають `allowWhileCritPending` → між кастом і реакцією нічого не вклинюється.
- Дельта (`client-delta.ts` → `scene.pendingChoice: publicPending(...)`) і Pusher уже несуть вікно; гравцям `redactCounterForPlayers` ховає назву закляття і DM-офери.
- `counter-window-mutation.ts`: `pass` / `expire` (після `deadline`, `COUNTER_WINDOW_MS = 10 s`) / `closeAll` (DM) / `counter`; закриття = повтор запиту з тим самим `seed` (`replay.seed`) або `counteredBy` → `counteredResult`.
- UI: `lib/hooks/battle/use-counter-window.ts`, `components/battle/counter/CounterWindow{Banner,Dialog}.tsx`, `useCounterWindowOp`.

Отже потрібна не нова підсистема, а **узагальнення вікна контрзаклинання** на «реакцію системи після Casting-тесту».

## 3. Порівняння варіантів

### A. Відкладений каст через вікно реакції (рекомендовано)

Каст із Casting-тестом, для якого система має кандидатів на реакцію, рахується «на пробу» (у пам'яті, з фіксованим `seed`), система за результатом проби вирішує, чи відкривати вікно; результат проби **відкидається**, у `pendingChoice` пишеться вікно. Закриття: успішна реакція → повтор із `counteredBy` (тест і його ціна сплачуються, ефектів немає); інакше → повтор із тим самим `seed` (ідентичний результат).

- ✅ Ефекти/шкода просто не застосовуються — нічого відкочувати; `applyDamageConsequences`, `removeEffects`, `advanceTurn` не зачіпаються.
- ✅ ~80% інфраструктури вже є і перевірена на d20 (персист, дельти, редакція, блокування, таймаут, DM-закриття, UI).
- ✅ d20/d6pool без змін: хук опційний, `openCounterIfAny` не чіпається.
- ➖ Подвійне обчислення касту (проба + повтор) для canon-кастів, де є кандидат-диспелер. Пом'якшується дешевим префільтром `mayReact`.
- ➖ Залежність від детермінізму `castSpell` при однаковому `seed` (див. ризики).

### B. Застосувати, потім відкотити за записаними id ефектів

`lastCast.applied = { [participantId]: effectId[] }`, успішний Dispel → `removeEffects` за цими id.

- ✅ Дешево для чистих баф/дебаф-заклять.
- ❌ Не відкочує шкоду/HP, смерть і її каскад (`applyDamageConsequences`: мораль, непритомність, вихід з мапи, падіння `sustain`), призов, зони/terrain, примусовий рух, трансформації, гранти. Повернути HP — це не «зняття ефекту», а відновлення стану = undo (`rollback-mutation` — DM-only, за індексом дії, перезаписує учасників цілком і ламає все, що сталося після).
- ❌ Без вікна між кастом і Dispel кастер/союзники вже ходять далі → порядок відкату неоднозначний.
- ❌ Клієнти вже програли FX/лог шкоди, потім «назад».
- Магічні снаряди й інші шкідливі закляття WFRP — основний випадок, тож B коректний лише для меншості.

**Рішення: A.** B відхилено як некоректний для шкоди/смерті.

## 4. Дизайн (варіант A)

### 4.1 Потік

```
POST spell (canon wfrp, є кандидати)
  createSpellMutation
    ... план як зараз ...
    openCounterIfAny (d20, без змін) → null
    openCastReactionIfAny(plan):
      reaction = ruleSystemOf(rules).magic.tested?.reaction
      нема хука / каст без тесту / !reaction.mayReact(...) → null
      seed = rng-based
      probe = executeCast(plan, { rng: mulberry32(seed), crit: pick-без-паузи })
      window = reaction.open({ casterId, resolved: probe.participants, participants: order, ... })
      window = null → return { seed }   // далі звичайний прогін з цим seed
      інакше → openCounterWindow(... offers з system, hidden.system = window.data, seed)
  → MutationResult: participants без змін, events [], scene.pendingChoice
  → дельта + Pusher (як для counter)

POST counter-window { action: 'react', windowId, reactorId }
  answerFor → перевірка прав (як counter)
  r = reaction.answer({ reactorId, casterId, data: hidden.system, participants, rng: mulberry32(seed+1+attempts), ... })
  r.cancelled → close(..., { countered: reactor.name })  → повтор зі seed + counteredBy
  інакше → offer.answer='failed', deadline оновлено, attempts+1; усі відповіли → close resolve

pass / expire / closeAll — без змін (повтор зі seed → закляття діє)
```

Повтор зі `seed`: `runWithCritChoice({ seed })` бере `mulberry32(seed)`, а `diceRolls` уже лежать у `hidden.request` (як у counter) → Casting-тест і решта кидків ідентичні пробі. Крит-пауза після вікна працює як зараз (`close` переносить `replayed.scene.pendingChoice`).

### 4.2 Чому проба, а не ранній тест

Dispel протиставляється SL касту (`castSl`, `critBonus`) і має сенс лише для **успішного** тесту, а дальність міряється до місця закляття (`lastCast.at/targets`). Усе це знає лише `castSpell` після `rollCastTest` + `casterUpdate`. Проба повністю повторно використовує ці шляхи (жодного дублювання підготовки `readyCaster`), а система читає власний слот (`wfrpState(caster).lastCast`) з `probe.participants`.

Важливо: **кандидатів оцінюємо за станом до касту** (`participants: order`), бо в пробі диспелер-ціль може вже бути вбитий.

### 4.3 Скасований тестований каст

`counteredResult` (лише економія дії) лишається для кастів без тесту (d20). Для кастів із Casting-тестом скасування = «тест відбувся, закляття не подіяло»:

- `CastSpellParams.cancelledBy?: string`. У `castSpell` одразу після перевірки `settle && !settle.cast.success`:
  `if (settle && params.cancelledBy !== undefined)` → `spendCastCost` + `settleCastTest` (casterUpdate: Fortune, `channelledSl`, `lastHand`; miscast через `magic.miscast` з `applyDamageConsequences`) → `finishSpellAction(..., { fizzled: true, cancelledBy })`.
- `finishSpellAction`: `cancelledBy` → заголовок `battleActions.spell.cancelled` `{ name, spell, by }` замість `fizzled`; `actionDetails.countered = true`.
- `executeCast` іде гілкою `fizzleResult` (інгредієнти списуються, як при провалі тесту).
- `spell-mutation.ts`: `if (replay?.counteredBy !== undefined && !runsCastTest(plan)) return counteredResult(...)`; інакше `plan.cancelledBy = replay.counteredBy` і звичайний прогін зі `seed`.

Рішення за каноном (с. 237): miscast від подвоєнь і витрачена Fortune лишаються — тест був кинутий.

### 4.4 Форми даних

`lib/utils/battle/counter/types.ts`:

```ts
export interface CounterOffer {
    reactorId: string;
    dm: boolean;
    answer?: 'pass' | 'failed';
    /** Spell offers (d20 Counterspell) */
    spellId?: string;
    grantKey?: string;
    slotLevels: number[];          // [] для system-оферу
    /** Answered by the rule system's cast reaction, not by casting a spell */
    system?: { label: AppMessageKey };
}

export interface HiddenCounter {
    request: SpellRequestData;
    seed: number;
    serverRolls?: boolean;
    userId: string;
    isDM: boolean;
    attempts: number;
    /** The system's view of the held cast, given back to `reaction.answer`; never sent to clients */
    system?: SystemSlot;
}
```

`ShownCounter` не змінюється (`kind: 'counter'`, `spell`, `deadline`, `offers`) — UI/редакція/`asShownCounter` працюють як є.

`lib/utils/rules/systems/types-magic.ts`:

```ts
export interface CastReactionOffer {
    reactorId: string;
    /** i18n key of the answer button */
    label: AppMessageKey;
}

export interface CastReactionArgs {
    casterId: string;
    /** Before the cast: positions, who is alive, reaction budget */
    participants: BattleParticipant[];
    rules: Ruleset;
    map: BattleMapConfig | null | undefined;
    round: number;
}

/** Lets other participants answer a successful tested cast before it lands */
export interface RuleSystemCastReaction {
    /** Cheap prefilter before the probe cast; false = no window */
    mayReact(args: CastReactionArgs): boolean;
    /** `resolved` = participants after the probe cast (the system reads its own state of the caster) */
    open(
        args: CastReactionArgs & { resolved: BattleParticipant[] }
    ): { offers: CastReactionOffer[]; data: SystemSlot } | null;
    /** One reactor's answer, rolled on the server; `cancelled` = the cast has no effect */
    answer(
        args: CastReactionArgs & {
            reactorId: string;
            data: SystemSlot;
            rng: Rng;
        }
    ): { participants: BattleParticipant[]; lines: LogLine[]; cancelled: boolean };
}

export interface RuleSystemTestedMagic {
    // ...
    reaction?: RuleSystemCastReaction;
}
```

`lib/schemas/battles.ts` — новий варіант `counterWindowSchema`:

```ts
z.object({ action: z.literal('react'), windowId: counterWindowIdSchema, reactorId: z.string().min(1) })
```

Кидок Dispel лише серверний (як і зараз у `DispelPanel`), тож поля `roll` немає.

WFRP `data` = `LastCast` з проби: `{ spell, sl, critBonus?, at?, targets? }` (вже має парсер у `rules/slots.ts`).

### 4.5 Реалізація WFRP

`systems/wfrp/rules/magic/dispel-reaction.ts` → `wfrpCastReaction: RuleSystemCastReaction`, підключається в `WFRP_TESTED_MAGIC` (`rules/magic/index.ts`):

- `mayReact`: `isCanonDispel(rules)` і є ворог кастера (ворожість — той самий предикат, що в engagement W9), активний, `canDispel(p)`, `wfrpState(p).dispelRound !== round`.
- `open`: `last = wfrpState(resolvedCaster).lastCast` (пишеться лише при canon-успіху); нема → `null`; `last.critBonus === 'unstoppableForce'` → `null`; офери — кандидати з `mayReact`, для яких `isDispelRange` до будь-якої з `last.targets ?? [last.at]` (позиції до касту), label `wfrpMagic.dispel.react`; порожньо → `null`.
- `answer`: повторна перевірка `dispelRound`/дальності; `wfrpDispel({ dispeller, caster, spellName: data.spell, castSl: data.sl, critBonus: data.critBonus, rules, rng })`; диспелеру `dispelRound = round`; `cancelled = result.dispelled`.
- `dispel-range.ts`: додати `dispelSpotsOfCast(last: LastCast, fallback?: GridPoint)`; `dispelSpotOf/dispelSpotsOf` для режиму `reactive` більше не потрібні.
- `dispel-mutation.ts`: лише `persistent`; `mode` у схемі прибрати (або `z.literal('persistent')`), реактивна гілка й `anyTurn` видаляються. `lastCast` лишається (його читає `open`), скидання на початку ходу — без змін.
- `useDispelPanel.ts`: лише постійні цілі.

### 4.6 Ядро: нове й змінене

- `lib/server/battles/mutations/spell/cast-reaction.ts` (новий): `openCastReactionIfAny(plan, options): Promise<MutationResult | { seed: number } | null>`; викликає `openCounterWindow` (розширити аргументи: `offers` вже готові, `system?: SystemSlot`, `seed` ззовні). Мапа офера: `{ reactorId, dm: controlledByDm(p, dmUserId), slotLevels: [], system: { label } }`.
- `cast-execute.ts`: експорт `runsCastTest(plan)` (та сама умова, що вмикає `castTest`: `!free && !legendaryAbility && !grant && magic.tested`), передача `plan.cancelledBy` у `castSpell`.
- `spell-mutation.ts`: виклик після `openCounterIfAny` тією ж умовою (`!preview && !resume && replay?.seed === undefined && !skipCounter`); якщо повернувся `{ seed }` — передати його в `runWithCritChoice` (інакше реальний прогін може розійтися з пробою, і успішний каст пройде без вікна). Гілка `counteredBy` з п. 4.3.
- `counter-window-mutation.ts`: дія `react`; `counter` на system-офері → `stale()`, `react` на spell-офері → `stale()`; права як у `counter` (`offer.dm ? isDM : controls`). Подія — `actorEvent(round, reactor, lineText(r.lines, ' | '))`.
- `counter/pending.ts`: `openCounterWindow` приймає `seed` і `system`; `counterRequest` — guard на `spellId`.
- UI: `useCounterWindowOp` + `lib/api/battle-ops.ts` — `react`; `use-counter-window.ts` → `canReact`; `CounterWindowDialog.tsx` — для `offer.system` кнопка з `t(offer.system.label)` без вибору слоту. Банер без змін.
- i18n (`uk`/`en`): `battleActions.spell.cancelled`, `wfrpMagic.dispel.react`; перевірити бюджет i18n-ратчету.

Нічого не пишеться в `battle_participants.snapshot` при відкритті вікна; запис диспелера (`dispelRound`) і результат повтору йдуть звичайним шляхом збереження зі `snapshotHash`. Хід не змінюється вікном; повтор проходить той самий post-mutation.

## 5. Файли

Ядро:
- `lib/utils/rules/systems/types-magic.ts` — типи хука.
- `lib/utils/battle/counter/{types,pending}.ts` — `system` в офері/hidden, `openCounterWindow(seed, system)`.
- `lib/utils/battle/types/spell-process.ts` — `CastSpellParams.cancelledBy`.
- `lib/utils/battle/spell/cast/{index,finish}.ts` — гілка скасування.
- `lib/server/battles/mutations/spell/{cast-reaction (новий),cast-execute,cast-types,spell-mutation}.ts`.
- `lib/server/battles/mutations/counter-window/counter-window-mutation.ts`, `lib/schemas/battles.ts`.
- `lib/api/battle-ops.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/use-counter-window.ts`, `components/battle/counter/CounterWindowDialog.tsx`.
- `messages/{uk,en}/*.json` (battleActions, wfrpMagic).

WFRP:
- `systems/wfrp/rules/magic/{dispel-reaction (новий),dispel-range,index}.ts`.
- `systems/wfrp/server/battle/dispel-mutation.ts`, `systems/wfrp/hooks/useDispelPanel.ts` (+ відповідний UI панелі, якщо показує режим).

Документи: `docs/architecture/rule-systems.md` (хвіст (а) → закрито, опис хука), `docs/architecture/battle.md` (вікно реакції = узагальнене counter-вікно), `docs/STATUS.md`.

## 6. Тест-кейси

Ядро (`lib/server/battles/mutations/spell/__tests__`, `counter-window/__tests__`; хук підставляється стабом через registry, як у наявних тестах систем, без імпорту `@/systems/*`):

1. d20-правила: каст іде одним прогоном, `pendingChoice` немає, наявні тести spell/counter зелені без змін.
2. Тестована магія без `reaction` — без змін.
3. `mayReact` → false: проби немає (spy на `executeCast` викликаний 1 раз).
4. Хук повертає офери: `participants === ctx.participants`, `events: []`, `pendingChoice.shown.kind === 'counter'`, офер має `system.label`, `slotLevels: []`; `hidden.system`, `hidden.seed`, `hidden.request.diceRolls` збережені; `shown` не містить `system`-даних.
5. `open` → null: реальний прогін використовує seed проби (SL касту збігається з пробою, серверний кидок).
6. Детермінізм: вікно → `pass` → SL у лозі повтору = `hidden.system.sl`; урон/ефекти такі ж, як у пробі.
7. `react` успіх: на цілях немає ефектів/шкоди, економія кастера витрачена, `casterUpdate` (Fortune/channel) застосовано, miscast застосовано, лог має `battleActions.spell.cancelled` + рядки Dispel, `pendingChoice: null`, `response.countered: true`.
8. `react` невдача, лишились офери: вікно відкрите, `answer: 'failed'`, `deadline` оновлено, `attempts + 1`; остання невдача → закляття діє.
9. `expire` до дедлайну → 422 `retryAfterMs`; після → діє. `closeAll` DM → діє; не-DM → 403.
10. `counter` на system-офері → 409 stale; `react` на spell-офері → 409; гравець на DM-офері → 403; DM на будь-якому → ок.
11. Інша операція при відкритому вікні → `COUNTER_WINDOW_OPEN` (наявний тест, перевірити).
12. Редакція для гравців: без `spell` і DM-оферів (наявна поведінка).
13. `castSpell` з `cancelledBy` (unit у `lib/utils/battle/spell/cast/__tests__`): провалений тест → звичайний fizzle (cancelledBy ігнорується); успішний → без ефектів, без `spellCast after` тригера.

WFRP (`systems/wfrp/rules/magic/__tests__`, `systems/wfrp/server/__tests__`):

14. `open`: не-canon → null; `unstoppableForce` → null; офери лише ворогам із тренованим Language (Magick), активним, без `dispelRound` цього раунду, у дальності WP ярдів до будь-якої клітинки `targets`; диспелер-ціль, убитий у пробі, все одно отримує офер.
15. `answer`: варіанти `opposedModel` `higherSl` / `attackerMustSucceed`; `dispelRound` проставлено; повторна спроба в тому ж раунді відхиляється.
16. `dispel-mutation`: `reactive` більше не приймається; `persistent` без змін.
17. Інтеграційний (`lib/__tests__/d6pool-battle.test.ts`-подібний рівень для wfrp): каст Magic Missile canon → вікно → `react` успіх → HP цілі незмінне; → `pass` → HP зменшено на ту саму величину, що показала проба.

Живий прогін (стейдж): WFRP canon бій, герой із тренованим Language (Magick) проти NPC-мага; DM кастить → у гравця діалог із кнопкою Dispel; успіх → лог «скасовано», без FX; таймаут 10 с → закляття діє.

## 7. Розбивка задач для Sonnet

Тести агенти пишуть, але не запускають; один повний прогін наприкінці.

1. **T1 — типи й рушій (ядро, pure).** `types-magic.ts` (хук), `counter/types.ts` + `pending.ts` (`system`, `openCounterWindow(seed, system)`, guard `spellId`), `CastSpellParams.cancelledBy` + гілка в `castSpell`/`finishSpellAction`, i18n `battleActions.spell.cancelled`. Тест 13.
2. **T2 — сервер ядра.** `cast-reaction.ts`, `runsCastTest` у `cast-execute.ts`, проводка в `spell-mutation.ts` (seed fall-through, `counteredBy` для тестованих), `react` у `counterWindowSchema` + `counter-window-mutation.ts`. Тести 1–11.
3. **T3 — WFRP.** `dispel-reaction.ts`, підключення в `WFRP_TESTED_MAGIC`, `dispel-range.ts`, `dispel-mutation.ts` лише persistent, i18n `wfrpMagic.dispel.react`. Тести 14–17.
4. **T4 — UI й документи.** `battle-ops.ts`/`useCounterWindowOp` (`react`), `use-counter-window.ts` (`canReact`), `CounterWindowDialog.tsx`, `useDispelPanel.ts` без реактивних цілей; whats-new не потрібен (WFRP поза main), оновити `rule-systems.md`, `battle.md`, `STATUS.md`.

T1+T2 можна одним диспатчем; T3 після T1 (типи); T4 після T2. Фінал: `pnpm cycles`, eslint по теках, повний `pnpm test:run`, рев'ю Opus, живий прогін.

## 8. Ризики

- **Детермінізм проби.** Якщо `castSpell`/фінал використовує `Math.random`/`crypto` для чогось, що впливає на результат (не лише id), повтор розійдеться з пробою (SL у вікні ≠ SL повтору). Захист: тест 6; при розбіжності — зафіксувати Casting-кидок у `hidden.request.castRoll` (`serverRoll: false`) перед відкриттям вікна.
- **Вартість.** Проба = ще один `executeCast` (+ асинхронні `loadPool` для призову) на кожен canon-каст із кандидатом. Префільтр `mayReact` обмежує це кастами, де справді є ворог-диспелер.
- **Пауза бою до 10 с** на кожен такий каст (як у d20). Диспелерів мало (Advanced-навичка); DM може `closeAll`.
- **Крит-/negation-паузи.** Проба йде без паузи; повтор може зупинитись на крит-виборі — `close` уже переносить `pendingChoice`. Каст, відновлений із крит-паузи (`resume`), вікна не відкриває; після d20-counter-повтору (є `seed`) — теж. Задокументувати як обмеження.
- **Витік інформації.** Гравці бачать, що вікно відкрилось (є хтось, хто може реагувати) — так само, як у d20.
- **Сумісність у польоті.** Вікно, відкрите до деплою, має старий `CounterOffer` без `system` — сумісне (поле опційне). `spellId` стає опційним — перевірити всі читання (`counterRequest`, діалог).
- **Межа ядра.** Ядро перевіряє лише наявність `magic.tested?.reaction` (можливість), без назв систем; `hidden.system` — непрозорий `SystemSlot`. Ратчети `system-imports-exempt`/`system-literals-exempt` не ростуть.
