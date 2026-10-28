# S7 — бойові механіки: checkpoint

Мова роботи: українська. Поточний статус: S7.1–S7.4 завершено. Нижче — історія extraction; integrated gate наведено наприкінці.

- Branch: `refactor/constructor-s7-battle-mechanics`.
- Worktree: `/Users/silentfox/.codex/worktrees/378f/dnd-tracker-constructor`.
- Base/start HEAD: `515c1f02d4e8451cf8e429fe8a77ef0949cda211` (`feat/constructor`).
- Integrated ancestors verified with `git merge-base --is-ancestor`: S2 `7183b7ef`, S5 `95181e74`, S6.1–3 `96a62dcf`; усі exit 0. S6 integration merge `4ad9011b`, S2 merge `3dc1b024`.
- S6.4 відкрита. Пряме доручення дозволяє незалежні extraction-и; остаточний S7.4 чекає інтеграції й закриття необхідних попередніх перевірок.
- Native worktree створено від SHA; власна гілка. `node_modules` — symlink на встановлені залежності вихідного checkout; env не копіювався.
- Плани/guide прочитано у вихідній папці (частина untracked); чужі diff-и не переносились.

## Рішення та pre-flight

- Ruling: для extraction використано чинні behavioral suites за прямим дорученням; нові characterization tests тільки для непокритих контрактів. Gameplay не виправляється під виглядом extraction.
- Ruling: спільні architecture/STATUS/roadmap/README/handoff не редагуються; інтеграційні нотатки тут.
- S7.1 → S7.2: signatures costs/selection збережено; S7.2 використовує нових owners, compatibility facade лишається.
- S7.3 незалежна від spell helpers; orchestration споживає ті самі boundary functions/results.

## Baseline

Команда — об’єднання трьох targeted suites плану (без S7.4):

```sh
pnpm exec vitest run lib/utils/battle/flows/__tests__/spell-flow.test.ts lib/utils/battle/flows/__tests__/spell-blocked-by-slots.test.ts lib/utils/battle/spell/__tests__/slot-choice.test.ts lib/utils/battle/conditions/__tests__/attack-conditions.test.ts app/api/__tests__/battles/attack-off-hand.test.ts app/api/__tests__/battles/core-action-mutation.test.ts lib/utils/battle/turn/__tests__/start-end.test.ts lib/utils/battle/turn/__tests__/advance-turn.test.ts lib/utils/battle/turn/__tests__/advance-after-removal.test.ts lib/utils/battle/turn/__tests__/control-effects.test.ts
```

Exit 0, 10 файлів, 140 passed, 0 skipped; `/tmp/constructor-s7-baseline.log`.
`pnpm exec tsc --noEmit --incremental false`: exit 0; `/tmp/constructor-s7-baseline-tsc.log`.
Consumers зафіксовано через `rg` у `/tmp/constructor-s7-consumers.txt`; вихідний spell-flow у `/tmp/constructor-s7-spell-flow-before.ts`.

## Хід роботи

- [x] S7.1: types/costs/selection.
- [x] S7.2: calculations/authority audit.
- [x] S7.3: turn boundaries/determinism/measurements.
- [x] S7.4: integrated pipeline/delta gate завершено, див. фінальний розділ.

## S7.1

- `spell-flow-types.ts`: SpellTargetMode, SpellPick, SlotOption, SpellFlowState, SpellFlowAction, SpellWidening.
- `spell-costs.ts`: slotOptions, spellSlotsLeft, casterUsesUniversalSlot, spellBlockedBySlots, spellSlotCostLabel.
- `spell-pick.ts`: spellDefinition, spellSpec, spellTargetSide, buildSpellPick, spellAimTargets, spellTargetCandidates, spellTargetInRange, spellSaveTargets, spellWidening.
- `spell-flow.ts` лишає initialSpellFlow, rollsComplete, canGoBack, spellFlow, withLiveAimTargets, withAllTargets, withChainTargets, spellPayload та compatibility re-exports усіх перенесених definitions. `flows/index.ts` експортує owners явно; попередня surface збережена.
- Разове AST-порівняння `/tmp/s7-compare-declarations.cjs`: 38 declarations (public/private, включно з signatures, default parameters, types і повними bodies) збігаються з base byte-for-byte. `spellPayload` незмінний.
- Types імпортують domain types через `import type`; costs/pick не імпортують facade чи barrel. React/DB/server imports не додано.
- Targeted команда S7.1 з плану: exit 0, 3 файли / 53 passed / 0 skipped (`/tmp/constructor-s7-1.log`). OPEN/PICK/BACK/FAIL/SET_LEVEL, SET_SLOT target/roll pruning, SET_GRANT/SET_CAST_LEVEL dice reset, pact/regular/free підтверджено чинними тестами.
- Наявна nuance: TOGGLE_TARGET/SET_AIM/live-target helpers прибирають stale saves; attack rolls фільтруються за targetIds у payload. Reconcile pick прибирає обидва види rolls. Внутрішні attacks на звичайній зміні цілей не переписувались, щоб extraction не змінив поведінку.
- TypeScript exit 0; lint `--max-warnings=0` exit 0 (після видалення невикористаних imports); diff check exit 0 після нормалізації EOF. Проміжні lint warnings та зайвий EOF усунено.

## S7.2

`slotOptions` повторно використовує чинний `resolveChosenSlot`: той самий caster, spellLevel і наявний key, ті самі castLevel/available predicates. Залишено зовнішні guards (5e, nullable caster/slots, коло ≥ 1), slotRestoreOrder, labels та `current ?? 0`/`left <= 0` для неповних legacy значень. Жодного нового registry/helper чи client authority. Attack ability і spell-targeting не змінено: інших підтверджених тотожних expressions, які варто переносити у дозволеній області, немає.

| Контракт | Спільний owner / чинна відмінність |
| --- | --- |
| HOMM / 5e ability | attack/ability: isFiveE, attackAbilityFor, attackRollModifier, attackDamageModifier; HOMM використовує common calculations, 5e finesse/ranged/strength. bonus/process читають цих owners. Spell power/caster-dice мають інші inputs/формули, не замінені attack modifier. |
| reach / ranged / thrown | grid/attack-reach: attackReachError, meleeReachCells, rangeBands, rangeDisadvantageReasons; predictAttack і server attack читають спільну геометрію/модифікатори. HOMM engaged забороняє ranged; 5e дає disadvantage. Spell range — feet/footprints, без weapon bands/reach. |
| off-hand / multiattack | attackDamageModifier зберігає min(mod,0) без twoWeaponFighting; attacks-left/spendAttack володіє action pool. Off-hand витрачає bonus action, звичайна атака — main action або залишок attacksLeft. |
| reactions | reactionBlocker/canReact; server spell mutation перевіряє ownership, cost та blockers поза ходом, spendCastCost витрачає reaction. UI noSlot/castDisabled не є server permission. |
| slots / grants / upcast | resolveChosenSlot, spellSlotKey/Left, slotLevel/RestoreOrder, casterSpellDice/upcastSteps; server додатково перевіряє known spell, slotOrGrant, grantKey freshness, pool/cost, bounds, legendaryOnly та взаємовиключення slot/grant. UI option list не замінює цих guards. |
| targeting / visibility | spellAimTargets і server resolveTemplate використовують templateArea, skill radius — skillRadiusArea; UI spellSaveTargets обмежує введення rolls власником. Server resolveSpellTargets сам відхиляє відсутні/неправильної сторони/out-of-range/airborne/charmed targets. Candidate preview не замінює authority. |
| invisible AoE | Invisible marker не виключає participant із templateArea. Новий test у spell-flow перевіряє preview IDs → server target resolution → фактичне castSpell damage (20→16), input не мутується. Нових правил invisibility не додано. |

- До runtime зміни: новий uncovered AoE characterization case пройшов, flow 45 passed; розширений baseline S7.2 — 11 файлів / 180 passed / 0 skipped (`/tmp/constructor-s7-2-before.log`).
- Після reuse: команда S7.2 плюс primary-ability, extra-attack, attack-reach{,-5e}, spell-mutation, spell-grants, spell-slot-key, spell-blocked-by-slots, slot-choice — exit 0, 13 файлів / 189 passed / 0 skipped (`/tmp/constructor-s7-2.log`). Серверні stale grant/target, resource reject і off-turn reaction перевірено чинними suites. Є лише Node punycode deprecation warning.
- Новий test fixture мав TS-помилку відсутнього name, її усунено додаванням поля (production контракт не змінено). У підготовлених turn fixtures виправлено chance→limits.chance до extraction. Фінальні TS/lint результати нижче/у фінальному checkpoint.
- Performance calculations S7.2 окремо не вимірювались; прискорення не заявляється.

## S7.3

- `turn-start.ts`: processStartOfTurn та StartOfTurnResult/StartOfTurnHazard; `turn-end.ts`: processEndOfTurn; `round-start.ts`: processStartOfRound.
- `start-end.ts` зберігає public re-exports functions/types. Чинний `turn/index.ts` не змінено. New boundary modules не імпортують facade назад.
- `runAdvanceTurnLoop(params: AdvanceTurnLoopParams): AdvanceTurnLoopResult` — єдина orchestration; diff у файлі містить лише direct imports boundary owners. maxAttempts, victory frequency, event ids, Date.now/new Date calls незмінні.
- AST-порівняння з base: усі 5 declarations start-end (3 functions + 2 interfaces) збігаються byte-for-byte, включно з bodies, signatures і default args. S7.1 мав 38/38 unchanged declarations; після S7.2 37/38 незмінні, єдина навмисна зміна — slotOptions reuse вище.
- Фактичний порядок збережено точно за кодом: recharge → DOT і його damage/concentration consequences → hazard і його consequences → HOT → countdown/arming → status/skip/reset/pools → dive/downed або turnStart abilities. Не нав’язано історичний порядок із формулювань плану.
- Round: extra slots removal → summons (без reserve) → baked auras/battleStart newcomers → roundStart → initiative sort → round-effect countdown/lair messages. End transition зберігає death saves у поточному раунді та передачу round-wrap rolls orchestration.
- Нові characterization snapshots записано **до extraction** на незміненому start-end/loop. Після extraction запускаються без `--update`; `shasum -c /tmp/constructor-s7-turn-snapshot-hashes-before.txt` — усі 3 OK.
- Frozen clock `2026-10-27T12:00:00Z` (`1793102400000`): start-end RNG `[0.91,0.12,0.74,0.03,0.08,0.87,0.27]` (7 calls); round-wrap `[0.31,0.92,0.14,0.27]` (4 calls); removal/death save `[0.99]` (1 call). Кількість calls asserted окремо, значення/порядок та повні outputs — у snapshots. Extra RNG call понад записаний список кидає помилку в перших двох сценаріях.
- Snapshots порівнюють повних participants, messages/actions (включно з event ids/timestamps, hpChanges), turn/round, pending reserve. Concentration loss видаляє linked effect іншого учасника; input immutability asserted. Death-save 20 під час removal повертає наступного до тями без повторного turnEnd попереднього.
- Pre-extraction characterization: start-end/advance-turn 54 passed (2 snapshots), removal 4 passed (1 snapshot); 0 skipped. Початкове неправильне розташування test chance виправлено на limits.chance до перенесення production коду; snapshots лише після цього заморожені.
- Після extraction: команда S7.3 плюс spell-recharge/death-saves/concentration — 7 файлів / 122 passed / 0 skipped, exit 0 (`/tmp/constructor-s7-3.log`). Фінальні TS/lint і named suites наведено далі.

## Вимірювання turn loop

Разовий локальний experiment `/tmp/s7-turn-benchmark.test.ts` + `/tmp/s7-benchmark-config.mts`, без змін package/config у repo. Vitest config наслідує чинні aliases/setup; setup задає loopback placeholder URL, Prisma запити не виконуються. Прямий tsx спочатку не стартував через sandbox IPC, після дозволеного rerun — через відсутній URL у статичному import graph; вимірювання виконано у звичному Vitest середовищі. БД/мережа/зовнішні сервіси не викликалися.

Команди:

```sh
pnpm exec vitest run --config /tmp/s7-benchmark-config.mts
S7_BENCHMARK_OUTPUT=/tmp/constructor-s7-turn-after.json pnpm exec vitest run --config /tmp/s7-benchmark-config.mts
```

Fixtures: 10/100 makeParticipant, alternating ally/enemy, 20 HP, 2 effects на кожному (DOT=2 fire, HOT=1); без abilities/maps/pending. currentTurnIndex=0 або N−1 для wrap, round=1, clock як вище, RNG=0.42 (фактично 0 calls). 5 warmups + 30 measured runs кожного сценарію; JSON/output assertions поза timed interval. Node v22.0.0, pnpm 9.15.5, Vitest 4.0.18. Before: production turn code base 515c1f02, branch HEAD b5f18c90; after: HEAD 8dc50506 з pending turn extraction. PostgreSQL/version/SQL/lock/bytes/serialization metrics unavailable.

Participant-array scans виміряно окремо поза timing: обгортки find/some/every/filter/map/flatMap/forEach/reduce рахують callbacks тільки в arrays із participant у першому елементі. Це не всі обходи рушія (не рахуються for-of, Set/Map, effect arrays), а виміряна підмножина. Не плутати calls методу й callbacks/visits. Після збору instrumentation знято.

| N | wrap | callback visits before=after | find calls/visits | median ms before→after | p95 ms before→after |
| --- | --- | --- | --- | --- | --- |
| 10 | False | 175 | 13/59 | 0.042230→0.030563 | 0.379625→0.144792 |
| 10 | True | 443 | 43/178 | 0.046187→0.048979 | 0.177709→0.305917 |
| 100 | False | 6160 | 103/5054 | 0.145125→0.168334 | 0.774166→0.954917 |
| 100 | True | 26858 | 403/15253 | 0.573438→1.113355 | 1.276708→2.565250 |

Повні participants/events/turn-round outputs та scan/RNG counts before/after збігаються для всіх 4 сценаріїв. Wall-time коливається (паралельно інші локальні роботи/typecheck); причинний speedup або regression з цих samples не виводиться. Жодної performance optimization/cache/index не додано: виграш не доведено, statement bodies незмінні. Індекс не переживає mutation, бо нового індексу немає. Сканування лишаються кандидатом окремої виміряної задачі після інтеграції.

Raw samples (ms) та counts; повні outputs додатково у `/tmp/constructor-s7-turn-{before,after}.json`:

```json
[{"N":10,"wrap":false,"scans":{"filter":{"calls":8,"visits":80},"find":{"calls":13,"visits":59},"some":{"calls":3,"visits":12},"map":{"calls":2,"visits":20},"every":{"calls":4,"visits":4}},"rngCalls":0,"beforeMs":[0.061291999999866675,0.37962500000003274,1.622041999999965,0.20404099999996106,0.14858400000002803,0.043417000000317785,0.09825000000000728,0.04104200000028868,0.05108300000028976,0.02874999999994543,0.19120799999973315,0.12237499999991996,0.07345900000018446,0.15116699999998673,0.037207999999736785,0.028083000000151515,0.03524999999990541,0.026292000000012195,0.022875000000112777,0.037333000000217,0.02604200000041601,0.021499999999832653,0.09133300000030431,0.1439170000003287,0.046291999999994005,0.02733299999999872,0.023458000000118773,0.028708000000278844,0.029333999999835214,0.022958999999900698],"afterMs":[0.10983299999952578,0.05900000000019645,0.5967920000002778,0.11320799999975861,0.051165999999284395,0.03191599999991013,0.04320800000004965,0.03150000000005093,0.03162499999962165,0.027291999999761174,0.027665999999953783,0.04133300000012241,0.02824999999938882,0.1447920000000522,0.032000000000152795,0.026749999999992724,0.031208999999762455,0.029917000000750704,0.025959000000511878,0.05945799999972223,0.027082999999947788,0.025125000000116415,0.024957999999969616,0.024625000000014552,0.02937500000007276,0.02695899999980611,0.024915999999393534,0.02620900000056281,0.035208000000238826,0.0270410000002812]},{"N":10,"wrap":true,"scans":{"find":{"calls":43,"visits":178},"filter":{"calls":20,"visits":200},"map":{"calls":5,"visits":50},"some":{"calls":3,"visits":11},"every":{"calls":4,"visits":4}},"rngCalls":0,"beforeMs":[0.0437499999998181,0.04620799999975134,0.43604199999981574,0.10179100000004837,0.1277919999997721,0.11162500000000364,0.061459000000013475,0.05466699999988123,0.04991700000027777,0.07349999999996726,0.06429200000002311,0.04399999999986903,0.03774999999995998,0.04608300000018062,0.053915999999844644,0.04358300000012605,0.04695799999990413,0.0597499999998945,0.04233299999987139,0.03862500000013824,0.040415999999822816,0.03845899999987523,0.11499999999978172,0.04616600000008475,0.0375000000003638,0.03662499999973079,0.03279199999997218,0.034249999999701686,0.03204199999981938,0.17770900000004985],"afterMs":[0.05170899999939138,0.0559159999993426,0.17229200000019773,0.06037500000002183,0.10899999999946886,0.07474999999976717,0.05183300000044255,0.04195900000013353,0.04058400000030815,0.05850000000009459,0.04216699999960838,0.10820799999964947,0.30591699999968114,0.2594170000002123,0.5985000000000582,0.07966699999997218,0.061916000000564964,0.04295799999999872,0.03845900000032998,0.03625000000010914,0.045415999999931955,0.04625000000032742,0.04550000000017462,0.045583000000078755,0.04241699999965931,0.03720900000007532,0.04158300000017334,0.039958000000297034,0.04120899999998073,0.24050000000079308]},{"N":100,"wrap":false,"scans":{"filter":{"calls":8,"visits":800},"find":{"calls":103,"visits":5054},"some":{"calls":3,"visits":102},"map":{"calls":2,"visits":200},"every":{"calls":4,"visits":4}},"rngCalls":0,"beforeMs":[0.11441699999977573,0.11679099999992104,0.20879100000001927,0.22208399999999529,0.1918749999999818,2.75058399999989,0.18325000000004366,0.1916670000000522,0.22729100000015023,0.7741660000001502,0.1595830000001115,0.12966699999969933,0.239292000000205,0.1999999999998181,0.14112500000010186,0.24420799999961673,0.1329160000000229,0.11941699999988487,0.10945799999990413,0.14912500000036744,0.10745899999983521,0.12158299999964584,0.10783300000002782,0.10870800000020608,0.2078750000000582,0.15937499999972715,0.12116700000024139,0.11916599999995015,0.11979200000041601,0.11604099999976825],"afterMs":[0.14129200000024866,2.6115000000008877,0.3304580000003625,0.18487500000082946,0.5117079999999987,0.9549170000000231,0.22362500000053842,0.22083400000065012,0.22641599999951723,0.29962500000056025,0.1632499999996071,0.19108299999970768,0.15049999999973807,0.16462499999943248,0.1376669999999649,0.15391700000054698,0.1422919999995429,0.14591699999982666,0.13712500000019645,0.1891250000007858,0.14733400000022812,0.2232080000003407,0.16179100000044855,0.12933299999986048,0.16470900000058464,0.31029099999977916,0.14295799999945302,0.41062500000043656,0.16424999999981083,0.17195799999990413]},{"N":100,"wrap":true,"scans":{"find":{"calls":403,"visits":15253},"filter":{"calls":110,"visits":11000},"map":{"calls":5,"visits":500},"some":{"calls":3,"visits":101},"every":{"calls":4,"visits":4}},"rngCalls":0,"beforeMs":[0.596208999999817,0.6356670000000122,6.6406660000002375,0.7265840000000026,0.5525410000000193,0.5325000000002547,0.7306670000002669,1.2767080000003261,0.5122500000002219,0.4570829999997841,0.4901669999999285,0.5015840000000935,0.5943340000003445,0.6436670000002778,0.7425830000001952,1.2497920000000704,0.4732920000001286,0.47624999999970896,0.44812499999989086,0.4586669999998776,0.43287499999996726,0.6478329999999914,0.4882079999997586,0.4459580000002461,0.7781670000003942,0.4937079999999696,0.7357919999999467,0.7703329999999369,1.1490410000001248,0.43699999999989814],"afterMs":[0.6757910000005722,1.1144169999997757,1.0246250000000146,1.5148330000001806,3.7026669999995647,0.6204580000003261,0.6487910000005286,0.7844999999997526,1.3439170000001468,2.5652499999996508,1.2645839999995587,0.6004579999998896,0.819416999999703,0.8677920000000086,2.0738750000000437,1.0620420000004742,0.5756659999997282,1.9050829999996495,0.6061250000002474,1.4769580000001952,1.8843329999999696,1.3985830000001442,0.6657079999995403,0.6020840000001044,1.112292000000707,1.216374999999971,1.1640830000005735,2.0747910000000047,1.0821670000004815,1.4498750000002474]}]
```

## Незалежний review

Один read-only reviewer перевірив `515c1f02..6bbbdea5` за superpowers:requesting-code-review, включно з Review Focus та окремим simplify-pass. Critical/Important/Minor — **0/0/0**; verdict — **ready for integration review для S7.1–S7.3**. Reviewer не змінював worktree і не повторював runtime suites. Незалежно підтвердив AST 37/38 spell + 5/5 turn declarations, checksum review package проти git diff, scope/exports/cycles, diff check і benchmark outputs/scans/RNG; оглянув fresh logs 20 files/311 passed. Fix pass не потрібний, deferred minors відсутні.

Declined-to-judge розглянуто й явно залишено відкритим за прямим scope користувача:

- expectedVersion conflict — S7.4 після інтеграції/необхідних попередніх перевірок.
- Changed snapshot→changed snapshotHash — S7.4; persistence тут не змінювалась.
- Unchanged participant→patch/new participant→full upsert — S7.4; engine characterization не є доказом delta contract.
- Delta gap→один refetch — S7.4; client/hooks поза scope.
- Assistant→canonical battle writer, transactions/atomic persistence — S7.4/S6.4; відповідні consumers не змінювались.
- Історичні gameplay/event-format особливості не виправляються у extraction. Втрата фактичної поведінки була б finding; AST/behavioral evidence підтвердило її збереження.

Ціна помилкового припущення про ці відкладені контракти — ризик несумісності сумарного стану після інтеграції; тому жоден із них не оголошений перевіреним. Ruling: full suite/build та інтеграційне закриття не замінюються поточними targeted тестами; залишаються відповідним наступним стадіям. Ruling: branch/worktree залишено без merge/push — це вже вибір користувача, додаткове меню інтеграції не потрібне.

## Фінальна перевірка S7.1–S7.3

Code/test HEAD: `6bbbdea565f1e2ab1a43b79dc9de65d0c5aa2a90`. Фінальний документаційний HEAD цього checkpoint: `git log -1 --format=%H -- docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s7-progress.md`.

```sh
pnpm exec vitest run lib/utils/battle/flows/__tests__/spell-flow.test.ts lib/utils/battle/flows/__tests__/spell-blocked-by-slots.test.ts lib/utils/battle/spell/__tests__/slot-choice.test.ts lib/utils/battle/conditions/__tests__/attack-conditions.test.ts app/api/__tests__/battles/attack-off-hand.test.ts app/api/__tests__/battles/core-action-mutation.test.ts lib/utils/battle/attack/__tests__/primary-ability.test.ts lib/utils/battle/attack/__tests__/extra-attack.test.ts lib/utils/battle/grid/__tests__/attack-reach-5e.test.ts lib/utils/battle/grid/__tests__/attack-reach.test.ts app/api/__tests__/battles/spell-mutation.test.ts app/api/__tests__/battles/spell-grants.test.ts app/api/__tests__/battles/spell-slot-key.test.ts lib/utils/battle/turn/__tests__/start-end.test.ts lib/utils/battle/turn/__tests__/advance-turn.test.ts lib/utils/battle/turn/__tests__/advance-after-removal.test.ts lib/utils/battle/turn/__tests__/control-effects.test.ts lib/utils/battle/turn/__tests__/spell-recharge.test.ts lib/utils/battle/death-saves/__tests__/death-saves.test.ts lib/utils/battle/concentration/__tests__/concentration.test.ts
pnpm exec tsc --noEmit --incremental false
git diff --name-only --diff-filter=AM 515c1f02..HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint --max-warnings=0
git diff --check 515c1f02..HEAD
shasum -c /tmp/constructor-s7-turn-snapshot-hashes-before.txt
```

- Фінальний combined targeted: exit 0, 20 файлів / 311 passed / 0 failed / 0 skipped; `/tmp/constructor-s7-final-targeted.log`.
- TypeScript після всіх code/test змін: exit 0; `/tmp/constructor-s7-3-tsc.log`. S7.1 і S7.2 також мали green typecheck до commits; `/tmp/constructor-s7-{1,2}-tsc.log`.
- Лінт усіх змінених TS: exit 0, 0 errors/warnings; `/tmp/constructor-s7-final-lint.log`. `git diff --check` для всього range — exit 0. Frozen snapshots — 3/3 hashes OK.
- Named S7.1 task gate: 3 файли / 53 passed / 0 skipped; S7.2: 4 / 64 / 0; S7.3: 4 / 71 / 0; усі exit 0. Розширені suite результати наведені вище.
- Повний suite/build не запускався; package/config/shared test helpers не змінювались. БД, browser, provider/Storage/Pusher/Redis та інші зовнішні сервіси не запускались. Це unit/CPU evidence, не доказ persistence pipeline/delta чи загальної серії.
- Scope: лише flows, turn та власний checkpoint. Attack ability/spell-targeting читались для audit і не змінені. API tests лише запускались; production API/payloads/writers не змінювались. Assistant, participant builder, compendium/templates, hooks/UI, package/lockfile, Prisma й спільні docs не редагувалися.

## Commits та передача

Для інтегратора — поверх `515c1f02d4e8451cf8e429fe8a77ef0949cda211`:

1. `b5f18c90a3b4e70848b25e2050ec17b3cd1edd3a` — `refactor(battle): separate spell flow state and helpers`.
2. `8dc50506a22c7ac22b9011f26c423e2a8ac6d6b5` — `refactor(battle): reuse compatible mechanics calculations`.
3. `6bbbdea565f1e2ab1a43b79dc9de65d0c5aa2a90` — `refactor(battle): separate turn boundary processing`.
4. Наступний docs commit додає фінальні результати/review до цього checkpoint; SHA командою вище.

**S7.4 НЕ ВИКОНАНО. Наступна задача — S7.4 після інтеграції й закриття необхідних попередніх перевірок, зокрема відкритої S6.4.** Pipeline/snapshotHash/version/client delta contracts не редагувались і їхню фінальну сумарну перевірку ця сесія не оголошує виконаною. No gameplay/security defects confirmed у дозволеному diff; це не заміна повного security audit.

Для інтеграційних architecture notes: flow types/costs/selection мають окремих owners, старі imports підтримані; turn boundaries у named modules, start-end — сумісний facade; єдина loop orchestration незмінна. S8 у цій сесії не виконувався. S3/інші паралельні результати не інтегрувалися.

Branch і native worktree збережено; merge/push/deploy, prod/prodcopy, HOMM gateway не запускались. Source `feat/constructor` не перемикали й не редагували. Тимчасові логи/benchmark artifacts у `/tmp` локальні; достатні raw samples, contracts і результати перенесено сюди.

## Локальна інтеграція у feat/constructor

Нове пряме доручення користувача: «мерджи і познач всі зроблені пункти». Воно дозволило локальний merge та зміну статусів саме S7; початкова заборона merge більше не застосовується до цієї інтеграції. Push/deploy та інші заборонені дії не виконувались.

- Target/worktree: `feat/constructor`, `/Users/silentfox/Work/dnd-tracker-constructor`.
- Target до merge: `515c1f02d4e8451cf8e429fe8a77ef0949cda211`.
- Source: `refactor/constructor-s7-battle-mechanics`, `abe338e8501d2f0bfc94074cd31e667595acaaec`.
- `git merge --no-ff refactor/constructor-s7-battle-mechanics -m 'Merge S7.1-S7.3 battle mechanics refactor'`: exit 0, без конфліктів.
- Merge commit: `76cc17a729c8a09c667340a02e39fcce9581e831`.
- На merge HEAD повторено ту саму final combined targeted команду (20 файлів) із розділу вище: **311 passed, 0 failed, 0 skipped, exit 0**; `/tmp/constructor-s7-merged-targeted.log`.
- `pnpm exec tsc --noEmit --incremental false`: exit 0; `/tmp/constructor-s7-merged-tsc.log`.
- `git diff --name-only --diff-filter=AM 515c1f02..HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint --max-warnings=0`: exit 0, 0 errors/warnings; `/tmp/constructor-s7-merged-lint.log`.
- `git diff --check 515c1f02..HEAD` та diff check документаційних змін: exit 0.
- План S7 додано до Git із усіма **19 виконаними** кроками/перевірками/commits S7.1–S7.3. Шість пунктів S7.4 лишаються відкритими. Часткові measurements/engine characterization та basic checks не видаються за завершену фінальну pipeline/delta перевірку.
- Чужі локальні зміни `docs/superpowers/README.md` та інші untracked плани залишено недоторканими й не включено в commit. Спільні roadmap/STATUS/handoff не змінювалися. Робочі копії паралельних S3/S6/інших сесій не редагувались.
- Native worktree S7 і source-гілка збережені: ними керує середовище. Загальні full suite/build, БД/browser, S7.4 та S8 не запускались.
- Фінальний HEAD документаційного статусу: `git log -1 --format=%H -- docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s7-battle-mechanics.md`.

## S7.4 — integrated pipeline/delta gate (2026-10-27)

Start code HEAD `77c32ddb`, S5.4/S6.4 закрито, S1–S4 інтегровані.

- [x] S7.4. Named pipeline/delta/snapshot/assistant suites + split/diff/turn/flow/API/resync: **38 files / 355 passed / 0 failed/skipped**, exit 0. ExpectedVersion conflict, snapshot-only hash change, hot-state-only hash stability, unchanged participant omission, patch/upsert та rollback snapshots покриті чинними tests.
- `useBattleAction.test.tsx` додатково закріплює рівно одну scene invalidation для version gap; **10 passed**, exit 0.
- Named guarded `battle-actions-storage` + `battle-pipeline-storage`: **8 passed / 0 failed/skipped**, exit 0; реальні SQL/writers, rollback/version/hash/receipt; connection_limit=1, both-URL guard, owned cleanup.
- S7.3 deterministic characterization повторно пройшов без snapshot update: frozen clock1793102400000; recorded RNG7/4/1 calls, повні participant/event outputs незмінні. Before/after raw samples та scan visits наведені вище й залишаються історичними даними extraction. Нових CPU optimizations не додано; збіг outputs підтверджено, прискорення/production latency не заявляємо.
- TypeScript на integrated S6/S7 code/test стані — exit0; ESLint зміненого test із --max-warnings=0 і diff check — exit0.
- Logs: `.superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/s7-{4,client,integration}.log`. Full suite/build/browser — S10.

S7 завершено; stable flow/cost/selection exports готові для S8.2. Gameplay/невидимість/payloads не змінені.
