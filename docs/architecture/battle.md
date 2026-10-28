# Battle data flow

The most complex part of the app. Related: [balance.md](balance.md), [map-modes.md](map-modes.md), [abilities.md](abilities.md).

## Page → mutation

Page `app/campaigns/[id]/battles/[battleId]/page.tsx` (server: `userId` from `getClaims`, the scene from `readBattleScene` — the same code as `GET /` — seeded into the query cache with `PrefetchedQuery`, so the first HTML has the battle and the client does not GET on mount) → `BattlePageClient` → `useBattleSceneValue` + `BattleSceneProvider` (`lib/hooks/battle`, read with `useBattleScene()`) → `BattleScreen` (`components/battle/scene`: mobile layout < 1024 px, desktop three columns ≥ 1024 px) → mutations in `lib/hooks/battles/useBattles.ts` (all through `useBattleAction`) → `lib/api/battles.ts` → route in `app/api/campaigns/[id]/battles/[battleId]/<action>/route.ts`.

## Mutation pipeline

Every battle route is a Zod schema + `runBattleMutation` (`lib/utils/battle/pipeline/`) with a sibling `<action>-mutation.ts`. The pipeline:

- does auth (`getClaims`);
- loads the battle in one query (`lib/utils/battle/store/loadBattle`). Participant snapshots — ~75 % of the bytes — come from a per-instance content-addressed cache keyed by `snapshotHash`, and only misses are read, so **anything writing `battle_participants.snapshot` must write its `snapshotHash` too**, as `saveBattle` does;
- checks access (`dm` / `turnController` / `currentController` / `member`) and status;
- runs `mutate` (pure engine code from `lib/utils/battle/*`, `lib/utils/abilities/*`), checks victory once;
- saves with an optimistic `version` lock (`saveBattle`: changed `battle_participants` rows in one `UPDATE … FROM (VALUES …)` without reading rows back, append-only `battle_events`, `battle_snapshots` for rollback — pruned to the last 20 when the battle completes);
- answers `{ delta, response? }` (`ClientBattleDelta` from `pipeline/client-delta.ts`: new participants and those whose snapshot changed go in `upserted`, the rest as `patched` with only the column/state fields from `PATCHABLE_PARTICIPANT_FIELDS`);
- sends Pusher `battle-delta` (or `{ refetch: true }` above 9 500 bytes) after the response (`after()`).

`GET /` and `dryRun` still return the full `BattleScene` with the last 30 events; older ones come from `GET /events?before=<seq>` («Показати раніші», `useBattleLogHistory`), and `GET /?versionOnly=1` answers `{ version }`.

## Turn advance

One engine: `lib/utils/battle/turn/advanceTurn` (used by next-turn and attack with `endTurn`).

## Client cache

`applyBattleDelta` (`lib/utils/battle/client`) patches the cached `BattleScene` (old version ignored, gap or patch for an unknown id → one GET). After a Pusher gap or a tab hidden > 15 s, `usePusherBattleSync` asks for the version and refetches only when it is newer. `useBattleAction` sends `expectedVersion`; 409 → refetch + battle toast. `actionIndex` in the client log is the event `seq` (rollback target).

## Player UI logic

Wizards (attack, spellbook, player turn) are reducers in `lib/utils/battle/flows` driven by hooks in `lib/hooks/battle`. What a player may see (health states instead of enemy HP, AC known from attacks, observed traits from `actionDetails.damageSteps`, turn queue with morale extra turns) is `lib/utils/battle/view`. Hiding is client-side.

## Attack: cover, chain shot, cleave

- **Cover** is computed by the server (`grid/line-of-fire.ts`) per target of a ranged attack: a living, non-airborne participant, `wall`/`barrier`, `blocked` cells, or a mode wall (`lineBlocked`) on the line. Not applied to melee, chain jumps or secondary targets of piercing shots. The wizard and the map show the same result.
- **Target limit**: `attack/max-targets.ts`, shared by client and server; auto-targets (chain, cleave, piercing, hits-all) are outside it.
- **Chain shot**: ability flag `chainShot` (`attack/process/chain.ts`) — the player picks one target, the server jumps to the nearest enemy in range (`grid/nearest.ts`) from the previous target's cell.
- **Cleave**: a melee attack with `maxTargets > 1` (`attack/process/cleave.ts`) also hits enemies adjacent to both attacker and target; the server rolls d20/damage for them (`attack-phase/targets.ts`).
- **FX**: `originId` on a spec is where the projectile starts (chain jumps); secondary victims get a splash spec (`fx/impact.ts`); the queue is trimmed by whole actions. The result card lists every target (`view/volley-results.ts`).

## 5e: стани, рятівні кидки, смерть, концентрація

Усе вмикається в `rules` кампанії (`saves.proficiency`, `deathSaves`, `concentration`, `conditions`; default — поведінка HOMM5 без змін, бій читає зафіксовану копію `battle.rules`). Стани 5e рушій обробляє незалежно від `conditions.enabled` — вони приходять лише з даних.

- **Стани** (`lib/utils/battle/conditions/`): `CONDITION_5E_REGISTRY` — стан → наявні маркери (`skip_action`, `immobilized`, …) + прапорці `abilityEffects` (`implies` розгортає, напр. paralyzed → incapacitated). `applyCondition5e` пише один `ActiveEffect` (`type: "condition"`) з маркерами й прапорцями, враховує `conditionImmunity` (перевіряється лише ключ, що накладається). Читання/зняття — `query.ts`: `hasCondition`, `conditionSourceIds`, `removeCondition5e`. **Зняття ефектів — лише через `removeEffects`** (повертає зняті ефекти; після нього синхронізується виснаження та HP).
- **Виснаження**: ефекти беруться із сумарного рівня (`syncExhaustion`), варіант 2014/2024 зберігається на самому ефекті (з `rules.conditions.exhaustion` на момент накладання); повторне накладання додає рівні до 6 (на 6 — смерть); 2014 рівень 4 ділить макс. HP, `restoreExhaustionHp` повертає його при знятті.
- **Рятівні кидки**: `rollSave` (`lib/utils/battle/saves/`) — автопровал, перевага/перешкода (`saveAdvantage`/`saveDisadvantage`, `vsSpells`, виснаження), бонус = модифікатор + майстерність (`saveProficiency` або `Character.savingThrows` при `saves.proficiency`) + стат `savingThrow`; `presetRoll` клієнта — перший d20. `rollSave` викликають заклинання, маневри, концентрація, `saveEnds`. `rollSaveEnds` — повторні кидки ефектів з `saveEnds` наприкінці ходу цілі (проти СК накладача, успіх знімає стан).
- **Наслідки шкоди**: кожен примітив шкоди → **одразу `applyDamageConsequences`** (`damage/consequences.ts`): юніти падають у `dead` на 0 HP (`unitsDieAtZero`), герой на 0 HP стає `unconscious` + `battleData.deathSaves`, масивна шкода, провал кидків смерті від шкоди (крит = 2), перевірка концентрації. У флоу заклинань/атак це робить `applyFlowDamage` (`common/action-flow.ts`). Без правил (`rules` не задано) або з вимкненими механіками повертає `after` без змін. `settleStatusChange` — ті самі наслідки для ручних змін ДМ (HP, воскресіння, вбивство).
- **Кидки смерті** (`lib/utils/battle/death-saves/`): d20 кидається в циклі пропуску ходу (`processEndOfTurn`) для непритомного нестабільного героя; 10+ успіх, 1 — два провали, 20 — 1 HP і прихід до тями; 3 успіхи — `stable`, 3 провали — `dead`. Лікування знімає стан `unconscious` і скидає лічильники. Лічильники — у `battleData.deathSaves` (кружечки в картці учасника). Герой при смерті (`isDying`: `UNCONSCIOUS` + `deathSaves`) не вважається полеглим (`isFallen`): зберігає ефекти, лишається на клітинці мапи й може бути ціллю ворожої атаки (`isAttackable`). HOMM-учасники без `deathSaves` поводяться як раніше.
- **Концентрація** (`lib/utils/battle/concentration/`): прапорець зберігається в існуючій колонці `Spell.concentration` (не в JSON `definition`). Каст створює на кастері ефект «Концентрація: …» (`concentration: { castId }`), а ефекти й зони цього касту — тег `concentrationOf`; новий каст спершу знімає попередню (`beginConcentration`, `dropConcentration`). Шкода → `concentrationCheck` (Вит проти `max(10, ⌊шкода/2⌋)`, межа `dcCap`); провал, недієздатність, смерть, 0 HP — концентрація зникає з усіма ефектами. **Зони згасають лениво**: `isZoneConcentrationLive` — зона скинутої концентрації просто перестає діяти, не видаляючись одразу.
- **Роут `conditions`** (`POST …/battles/[battleId]/conditions`, Zod `apply|remove` + `runBattleMutation`): лише ДМ (`BattleAccess.DM`), бій `ACTIVE`, не дозволений, поки чекає рішення ДМ про перемогу (`awaiting_dm`). UI — `components/battle/dm/ConditionsDialog.tsx` (меню станів у швидких діях ДМ).

## 5e: базові дії

Вмикається `rules.actions` (`{ enabled: false, opportunityAttacks: true, variant: "2014" | "2024" }`); `enabled: false` — жодних кнопок і атак при відході, HOMM без змін. Рушій у `lib/utils/battle/actions/`.

- **Каталог**: `CORE_ACTION_REGISTRY` (`registry.ts`) — `dash`, `disengage`, `dodge`, `help`, `hide`, `ready`, `standUp`, `grapple`, `shove`, `escape` (підпис, вартість, тип цілі). `validateCoreAction` / `coreActionAvailability` (`availability.ts`) — єдине джерело причин відмови для сервера й діалогу.
- **Роут `core-action`** (`POST …/battles/[battleId]/core-action`, Zod `discriminatedUnion("action")` + `runBattleMutation`, `BattleAccess.MEMBER`, `blockedByMode`): `core-action-mutation.ts` перевіряє права й хід, `runCoreAction` (`run.ts`) — чистий рушій. Керує власник учасника або ДМ. Виняток — `readiedAttack`: **реакція поза ходом**, доступна керівнику й ДМ у будь-який момент.
- **Ефекти** (`effects.ts`): «Відхід» (маркер `disengaged`), «Ухилення» (`disadvantageForAttackers` + перевага СПР; згасає з недієздатністю чи швидкістю 0), «Допомога» (перевага на одну атаку), «Схований» (маркер `hidden`, знімається після атаки/заклинання). Ключ — `coreTimedKey(action, participantId)`.
- **Рух**: Ривок додає базовий рух (`baseMovement` + `battleData.extraMovement`, `grid/path.ts`); `standUp` коштує половину базової швидкості й неможливий при швидкості 0. Без мапи дії руху лише пишуться в лог.
- **Реакції** (`reaction.ts`): `reactionBlocker`/`canReact` — витрачена реакція, недієздатність, `no_reaction`.
- **`rollCheck`** (`checks/roll-check.ts`): `rollCheck`, `checkBonus`, `passivePerception` — навичка чи характеристика, майстерність, `checkAdvantage`/`checkDisadvantage`, виснаження. «Сховатися» — Скритність проти найбільшої пасивної Уважності ворогів. Ту саму функцію візьме 4d.
- **`resolveServerAttack`** (`attack/server-attack.ts`): серверна ближня атака без гравця, спільна з HOMM-відплатою (`retaliation`); мітки `retaliation | opportunity | readied`.
- **Атаки при відході** (`opportunity.ts`, `movement.ts` → `resolveMovement5e`, викликається з `move-mutation`): шлях будує сервер (`pathTo` у `grid/path.ts`, один BFS, той самий граф, що `reachable`). Атаки автоматичні (реакція ворога, ближня атака), провокує вихід із досяжності; `disengaged` блокує; якщо мувер падає — рух зупиняється в цій клітинці. Рух ДМ у режимі розстановки не провокує.
- **Схоплення** (`grapple.ts`, `conditions/grapple-links.ts`): зв'язок — ефект `grappled` з ключем `core:grapple:<grapplerId>`. 2014: змагання Атлетики з більшим з Атлетики/Акробатики; 2024: рятівний кидок проти СК. `shove` — `prone` або відштовхування на 5 фт (якщо клітинка вільна). `escape` знімає зв'язок. Рух схоплювача тягне ціль у звільнену клітинку (`planDrag`) і коштує подвійно. **Зняття зв'язків** — `releaseInvalidGrapples` у пайплайні (`run-battle-mutation.ts`) після кожної мутації: схоплювач упав/недієздатний/не суміжний → ціль вільна.
- **Хід**: у 5e хід не завершується автоматично, поки на мапі лишається рух (`view/turn-exhausted.ts`).
- **UI**: `components/battle/turn/CoreActionsDialog.tsx` (плитка «Дії» в `ActionGrid`), `ReadiedAttackButton.tsx` (картка учасника з `readied`, поза ходом), хук `lib/hooks/battle/useCoreActions.ts`, клієнт `lib/api/battles`. Вкладка «Дії 5e» на `dm/rules`.
- **OpenAPI**: бюджет тесту розміру збільшено до 120_000.

## 5e: класи й рівні

Вмикається `rules.classes { enabled: false }`; без нього і для персонажа з порожнім `classes` — шлях HOMM без змін (архетип, HP за формулою, слоти раси). Чисті функції — `lib/utils/characters/classes/`, слоти — `lib/utils/spells/class-slots.ts`.

- **Дані персонажа**: `Character.classes [{ classId, subclassId?, level }]` (перший запис — стартовий клас). Змінює лише ДМ; при вимкнених правилах — 422. Сервер виводить `level` (сума), текстові `class`/`subclass` і `spellSlots` (`apply-classes.ts`, `applyClasses`; для порожнього списку повертає `data: null` і пише лише `classes: []`). Невідомий `classId` пропускається.
- **Режим класів у бою** — лише якщо розв'язано ≥ 1 запис класу (`resolveClassEntries`); інакше (усі невідомі) учасник збирається по-HOMM-івськи. Архетип ігнорується (множники 1).
- **HP** — середнє за кістками: 1-й рівень стартового класу — максимум кістки + мод. Тіл, далі `кістка/2 + 1` + мод. Тіл, мінімум 1 за рівень; нічого не зберігається.
- **Рятівні**: стартовий клас ∪ ручні `Character.savingThrows`.
- **Слоти** (`classSpellSlots`): рівень заклинача = Σ (`full` — рівень, `half`/`third` — ⌊·⌋; єдиний клас — ⌈·⌉ з 2-го/3-го рівня), таблиця мультикласу 5e → кола 1–9; пакт — окремо за рівнем класу `pact` (кілька різних pact-класів сумують рівні). Слот пакту — `spellSlots.pact { level, max, current }`; `spellSlotKey` для каста кола N бере слот кола N, а якщо немає — пакт з колом ≥ N. Вибір слота й підсилення вищим колом — 4c-2.
- **Вміння**: джерело `class` (див. [abilities.md](abilities.md)); `limits.perRest` = `perBattle` до 4d.
- **Кола заклинань 0–9** по всьому стеку (Zod, форми, `SlotGrid`, `.circle-0…9`); кантрип = коло 0. Обмеження HOMM (раса 1–5, крива до рівня 10, відкриття кіл школою) лишаються даними HOMM.
- **Підвищення рівня** (`POST …/level-up`, ДМ): у режимі класів тіло `{ classId, subclassId? }` — наявний клас або мультиклас; підклас обов'язковий на `subclassLevel` і заборонений раніше; `campaign.maxLevel` — на суму; випадкового +1 до характеристики немає; слоти перераховуються.

## 5e: атаки й заклинання

Режим 5e для героя вмикає `abilities.damageModel: "5e"` (`from-character.ts`, коли клас резолвиться); без нього — HOMM-шкода, кидки й валідація без змін (герой кампанії з `classes.enabled`, але без класів, лишається HOMM).

- **Характеристика й модифікатор** — `lib/utils/battle/attack/ability.ts` (`isFiveE`, `hasTrait`, `attackAbilityFor`, `attackRollModifier`, `attackDamageModifier`). Формула шкоди 5e = кубик зброї (+ кубик `versatileDice`, коли клітинка «Щит» порожня) + модифікатор; без кубиків героя й рівня. Метальна зброя лишається ближньою. Безоружний удар героя 5e (`default-melee`) = плоска «1» + Сил; дальня атака без зброї лишається без кубиків (лише модифікатор).
- **Властивості зброї** (`lib/constants/weapon-traits.ts`): `light`, `finesse`, `twoHanded`, `versatile`, `reach`, `thrown`, `ammunition`. У артефакті — модифікатор `traits` (рядок через кому) + `versatileDice`; у юніта — поля атаки. Текстове `properties` — лише примітка.
- **Досяжність і дальність** — `grid/attack-reach.ts`: `meleeReachCells` (2 клітинки зі зброєю `reach`), `rangeBands` («80/320»), `rangeDisadvantageReasons` (`bonus.ts`: «Далека дистанція», «Ворог поруч»). Атаки по можливості (`actions/opportunity.ts`) використовують ту саму досяжність.
- **Додаткова атака** — стат `attacksPerAction`; `attack/attacks-left.ts` (`spendAttack`, `canAttackFromPool`, `attacksLeft`, `attackedWithLight`). Атака з лічильника не витрачає ні дію, ні пул HOMM `pendingExtraActions`; захоплення/штовхання беруть з того ж пулу; скидання — `turn/turn-state.ts`.
- **Друга рука** — `offHand: true` у запиті атаки: бонусна дія, легка ближня зброя з клітинки «Щит» (`hand: "off"`, id `<id>:off`), потрібна попередня атака легкою; без прапорця `twoWeaponFighting` модифікатор шкоди не додається. `canEquipOffHand` (`lib/utils/artifacts/off-hand.ts`) перевіряє вдягання (stash і `update-inventory`, лише змінена клітинка щита); помилки `OFF_HAND_*` у `api-errors.ts`.
- **Криті** — `rules.criticals.doubleDice`: сервер (`attack/crit-dice.ts`) докидає відсутній другий набір кубиків і позначає його в лозі; без прапорця прев'ю лишається ×2 (HOMM).
- **Заклинання**: `casterSpellDice(caster, spell, castLevel?)`, кантрип масштабується `spellDice5e` (×1/2/3/4 на рівнях 1/5/11/17), підсилення слотом — `upcastDice` на крок і `upcastTargets` (одиночна ціль: 1+N×кроків; площа/шаблон: `maxTargets`+N×кроків). Слот обирається `slotKey` у запиті касту (`spell/slot.ts`, `resolveChosenSlot`; нижче кола, порожній чи відсутній слот → 422; HOMM-герой із `slotKey` = автовибір). `castLevel` пишеться в `actionDetails` лише за явного вибору слота.
- **Атака заклинанням** — `resolution: "attack"`: кидок проти AC (`attackRolls` у запиті), крит додає кубики з `doubleDice`; цілі не-вороги — автоматично.
- **UI**: лічильник «Атака N/M», «Атака другою рукою» у `BonusActionPicker`, вибір слота в `SpellCastDialog` (лише 5e), d20-поля для атаки заклинанням.

## Changing battle behavior

Expect to touch the mutation, the engine util, and possibly the hook and UI under `components/battle/`.
