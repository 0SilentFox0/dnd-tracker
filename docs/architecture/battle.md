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

## Changing battle behavior

Expect to touch the mutation, the engine util, and possibly the hook and UI under `components/battle/`.
