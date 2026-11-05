# WFRP 5c-2: хвости 5c-1

Дата: 2026-11-05. Гілка `feat/wfrp` (у main не мерджити до кінця епіку). Попереднє: [5c-1](2026-11-04-wfrp-5c1-design.md), межі — [rule-systems.md «Межі 5c-1»](../../architecture/rule-systems.md). Тут лише 9 хвостів 5c-1; психологія, травми, смерть через крити й загоєння (за spec 5c-1 — «5c-2») ідуть наступною частиною. Посилання `файл:рядок` звірені з HEAD `d6d935775`.

## 1. Приватність журналу: редагування на сервері

**Стан.** Редагує лише клієнт: `BattleLog.tsx:18` → `sanitizeLogEntry` (`lib/utils/battle/view/visibility.ts:62-76`; рядки wfrp — `:42-60`, `percentile.defender` — `:73`). Сервер віддає сирий журнал у чотирьох місцях: (а) GET сцени — `readScenePreview` → `buildScenePreview` (`lib/utils/battle/pipeline/run-battle-mutation.ts:191-209`, `entries` з `loadRecentEvents`); (б) сторінки журналу — `readBattleEvents` (`lib/server/battles/read-battle.ts:73-85`; `authorize` не знає `isDM`, `loadAccess` повертає лише `isMember`); (в) відповідь тому, хто діяв, — `clientDelta.log` (`run-battle-mutation.ts:292-317`); (г) **Pusher**: `buildPusherMessages` (`lib/utils/battle/pipeline/battle-response.ts:64-97`) шле одну дельту в один спільний канал `private-battle-<id>` (`lib/pusher/channels.ts:11`) для ДМ і гравців. Підсумок (`readBattleSummary`) рядків журналу не має.
**Важливо:** `initiativeOrder` у сцені й дельтах іде всім без редагування (`toBattleResponse`, `battle-response.ts:25-61`): `activeEffects` ворога (тобто й рівні станів `wfrp:<key>`) та його `currentHp` видно в сирій відповіді й без журналу. Редагування журналу закриває лише канал «журнал»; див. питання П1.

**Рішення.** Одна функція `redactLogForPlayers(entries, participants)` у `visibility.ts` = `sanitizeLogEntry` з найнижчим привілеєм (`{ isDM: false, canSeeEnemyHp: false }`), повертає `{ entries, changed }`. Викликається лише на сервері, у чотирьох точках:
- (а) `buildScenePreview`: якщо `!loaded.isDM`;
- (б) `readBattleEvents`: `loadAccess` повертає ще `isDM`; для не-ДМ — `deps.loadParticipants` (гортання назад рідкісне) і редагування сторінки;
- (в) `runGuardedBattleOperationCore`: `clientDelta.log` редагується, коли `!ctx.isDM`;
- (г) Pusher: у публічний канал іде відредагована дельта; якщо `changed`, вона несе `redacted: true`, і повна дельта йде другим повідомленням у новий канал `private-battle-dm-<id>` (`battleDmChannelName`). Клієнт ДМ (`lib/hooks/battle/usePusherBattleSync.ts:53`) підписаний на обидва й ігнорує публічну дельту з `redacted`. Без `changed` повідомлення одне, як зараз. Pusher auth (`app/api/pusher/auth/channel-access.ts:13`) пускає в dm-канал лише ДМ кампанії.

Клієнтський `sanitizeLogEntry` **лишається**: він ідемпотентний (вже відредагований рядок не змінює), дешевий і закриває записи, що не пройшли через сервер (оптимістичні/локальні, `hiddenTargetSteps`). Гравець із `seeEnemyHp` втрачає в журналі рівні станів ворога (бачить бейджі) — свідомо, бо Pusher-канал спільний.
**Файли:** `visibility.ts`, `run-battle-mutation.ts`, `battle-response.ts`, `read-battle.ts`, `pipeline-deps.ts` (`loadBattleAccess` + `isDM`), `lib/pusher/channels.ts`, `channel-access.ts`, `usePusherBattleSync.ts`.
**Тести:** `visibility.test.ts` — `redactLogForPlayers` (applied → appliedHidden, endTest без target, defender прибраний, `changed`), ідемпотентність `sanitizeLogEntry(sanitizeLogEntry(e))`; `battle-response.test.ts` — dm-повідомлення лише при `changed`, публічне з `redacted`; `run-mutation.test.ts` — гравець отримує відредаговану відповідь, ДМ — повну; `read-battle` — сторінки для гравця відредаговані; `channel-access.test.ts` — dm-канал: ДМ так, гравець ні; `usePusherBattleSync.test.tsx` — ДМ ігнорує `redacted`.
**Ризики:** префікс `private-battle-dm-` починається з `private-battle-` — у `channel-access` перевіряти dm-префікс першим, інакше `battleId = "dm-…"`. Ліміт `PUSHER_DELTA_LIMIT_BYTES` рахувати для кожного з двох повідомлень. Кількість Pusher-повідомлень росте лише на мутаціях зі зміною (атаки по ворогах, стани).

## 2. Тест з листа не бачить станів бою

**Стан.** `rollForSheet` будує учасника з листа (`lib/server/characters/core/roll-handler.ts:41`) з порожніми `activeEffects`, тож `selfTestMod` у `wfrp/sheet-test.ts:40` завжди 0.
**Рішення.** Новий `loadBattleEffects(campaignId, characterId)` поруч із `lib/server/characters/battle-lock.ts` (той самий `where`, що `inActiveBattle`, `:8-15`): `select: { state: true }` (лише `state.activeEffects`, `split-participant.ts:46-47`; не весь `snapshot` — egress). У `roll-handler` для систем із `conditions` ефекти підставляються в `participant.battleData.activeEffects`; поза боєм — як зараз.
**Тести:** `roll-handler` (мок prisma): у бою з Fatigued ×2 ціль −20; без бою — без змін; d20-система запиту не робить.
**Ризик:** персонаж у двох активних боях неможливий (battle-lock), `findFirst` достатньо.

## 3. Каталог станів проти книги

**Стан.** `wfrp/conditions/catalog.ts:5-42` («verify against 5e book»). Книги в репо немає; research §4.4 (`docs/superpowers/research/2026-11-03-wfrp-rule-system.md:108-110`) дає лише список і «Bleeding: 1 рана/рівень, шанс непритомності 10%×рівень» з рецензій. Перевірено за кодом: тест зняття — один неопозиційний кидок, успіх знімає рівно 1 рівень (`end-test.ts:47-53`); Entangled — S + власний штраф (`:43-45`, `catalog.ts:36`); Bleeding знімається Endurance (`:30`); тики на початку ходу носія (`tick.ts`), Poisoned шкоди не має; Blinded/Deafened нерівневі (`:39-40`).
**Твердження з пам'яті про 4e (не перевірені; 5e може відрізнятися)** — їх має підтвердити користувач (П3): зняття = 1 + SL рівнів; Entangled — опозиційний S проти джерела; Bleeding зупиняє Heal (або перев'язка), а 10%×рівень — шанс **смерті** непритомного з 0 Wounds, не непритомності; Poisoned −1 Wound/рівень за раунд; Blinded/Deafened рівневі (−10/рівень, +10/рівень по носію), спадають раз на два раунди; Broken/Poisoned/Stunned тестуються автоматично в кінці раунду, а не вільною спробою; тики — у кінці раунду; Prone — ще −20 до власних тестів руху; явної межі 10 рівнів немає.
**Рішення (мінімальне, без зміни чисел).** Механіку зробити даними: `endTest` отримує `removes: "one" | "onePlusSl"` (типово `"one"`) і `selfPenalty: boolean` (типово `true`), `end-test.ts` читає їх. Числа й нові механіки (опозиційний тест, тік Poisoned, рівневі Blinded/Deafened, кінець раунду) — лише після відповідей П3, окремим пакетом D.
**Тести:** `end-test.test.ts` — `onePlusSl` з SL 2 знімає 3 рівні; `selfPenalty: false` для Entangled дає 47.
**Ризики:** опозиційний тест потребує учасника-джерела, якого в ефекті може не бути (ДМ накладає з `sourceName`) — запасна ціль спитати в П3.

## 4. Тік, breakOnDamage, тривалий Unconscious

**Стан.** `hurt` у `tick.ts:24-36` віднімає Wounds без `dropBreakOnDamage` (ядро робить це для DOT: `turn/turn-start.ts:130`), тож Bleeding/Ablaze не знімають ефекти `breakOnDamage`. Unconscious зі статусом `UNCONSCIOUS` пропускає хід (`turn/turn-end.ts:53-60`) і весь блок початку ходу (`turn-start.ts:118-122`), тож його тривалість ніколи не спливає, а статус синхронізується лише в `apply.ts:52` / `:84-86`. ДМ може задати `rounds` (`system-condition-mutation.ts:18,39`).
**Рішення.** (а) `tick.ts`: `after = dropBreakOnDamage({...}, amount)` (`lib/utils/abilities/engine/effects/hp.ts:10`). (б) Unconscious без тривалості: `WfrpConditionDef.timed?: false` для `unconscious`, `SystemConditionInfo.timed: boolean`, `apply` ігнорує `rounds` для нетривалих, діалог ДМ ховає поле «Раунди». Знімає ДМ або лікування (як у межах 5c-1). Кровотеча на непритомному — після П4.
**Тести:** `tick.test.ts` — ефект з `breakOnDamage` знято після тіку; `catalog.test.ts` — `rounds` для unconscious ігнорується; тест діалогу — поля немає.
**Ризики:** `hp.ts` → `battle/conditions/query`, `death-saves` — нового циклу не дає (перевірити `eslint` на змінених файлах).

## 5. Мітки станів через контракт

**Стан.** Ядро знає ключі `battleWfrp`: `useConditionTestPanel.ts:37` (`battleWfrp.conditions.<key>.label`), `visibility.ts:47-57` (applied/endTest*), `attack/process/run.ts:241` (`battleWfrp.log.fortune*`). `SystemConditionInfo` (`systems/types.ts:111-115`) мітки не має.
**Рішення.** `SystemConditionInfo.label: string` (i18n-ключ, wfrp заповнює в `conditions/index.ts`); `RuleSystemConditions.concealLine(line): LogLine` (wfrp-мапа applied → appliedHidden, endTest* → *Hidden переїжджає з `visibility.ts` у `wfrp/conditions/conceal.ts`); `sanitizeLogEntry`/`redactLogForPlayers` отримують `rules` і кличуть `ruleSystemOf(rules).conditions?.concealLine`. Рядок Fortune будує wfrp: `ResolvedAttack.fortune.line: LogLine` (у `resolve-attack.ts`), `run.ts` лише пушить його. `useTranslations("battleWfrp.ui.*")` у `D100RollBody`, `ConditionTestPanel`, `PercentileResultLines` лишаються (UI-неймспейс, перенесення в `components/systems/wfrp` — поза межами).
**Тести:** `visibility.test.ts` з `rules` wfrp/dnd5e; гард — `grep`-тест, що `lib/utils/battle/**` не містить `"battleWfrp.`.
**Залежність:** після пакета B (#1, ті самі файли).

## 6. Мертві поля attemptEnd

**Стан.** `attemptWfrpConditionEnd` повертає `roll/target/sl` (`end-test.ts:20-21,38,55`; контракт `types.ts:143-148`); єдиний виклик `condition-test-mutation.ts:43` їх не читає; читає лише `end-test.test.ts:44,51,58,66,78`.
**Рішення.** Прибрати з типу, контракту й `none`; тест перевіряє `params` рядка журналу (`messages[0].params.target/roll`).

## 7. ESLint `import/no-cycle`

**Стан.** `eslint.config.mjs:185` — `maxDepth: 1`. Прогін `pnpm exec eslint lib/utils/rules lib/utils/battle --rule 'import/no-cycle: [2, { maxDepth: N }]'` (795 файлів): N=1 — 0 помилок (~115 с), N=3 — 1, N=6 — 13 (~85 с; час від глибини майже не залежить). Два кластери: (а) `battle/attack/ability.ts` → `abilities/engine/core/amount` → `battle/damage/average` → назад (3 модулі; через барель `damage/index` — ще 7 файлів); (б) `battle/attack/index.ts` ↔ `attack/process/{index,run,hit,compute}` (`compute.ts:10` імпортує барель `..`).
**Рекомендація.** Спершу розірвати обидва кластери (у (б) — імпорт з конкретного файлу замість `..`; у (а) — винести потрібну з `average` функцію в модуль без залежності від `attack/ability`), потім `maxDepth: 6`; повний repo-wide прогін — один раз, з виміром часу. Застосування — рішення користувача (П6), окремий пакет E.

## 8. Косметика

**Стан і рішення.**
- Ручний Fortune «Перекинути» (`components/battle/wizards/attack/D100RollBody.tsx:42-53`) завжди просить другий кидок; влучання клієнт знати не може (ближній бій опозиційний), а сервер використовує другий кидок лише при промаху (`resolve-attack.ts:87-89`). Рішення: лише текст — `ui.fortune.secondRoll` → «Кидок на випадок промаху» / «Reroll if the first misses».
- Тік підписаний «кінець ходу»: запис DOT/тіків має `actionType: "end_turn"` (`turn/run-advance-turn-loop.ts:132-137`) → `battleCommon.actionKinds.end_turn` (`log-entry.ts:69`). Рішення: у `logEntryView` запис, де всі `damageRolls` мають `damageType: "dot"`, отримує мітку `battleCommon.actionKinds.turnStart` («початок ходу»/«turn start»); `actionType` не міняти (`lastAction`, `hero.ts:162-167`).
- Пропуск ходу Unconscious без рядка: `processEndOfTurn` (`turn-end.ts:53-60`) пропускає мовчки. Рішення: для систем із `conditions` (є `deathSaves.rules`) — рядок `battleLog.turn.skipUnconscious` «{name} непритомний — хід пропущено»; d20 без змін.
- «Fortune» в uk-UI (`messages/uk/battleWfrp.json:67-68,88-96`) проти «Удача» в листі (`characterProfile.json:28,35`, `rest.json`): в uk — «Удача» скрізь у `battleWfrp`; en без змін.
- Ледачий режим Fate/Fortune — ок, змін немає.
**Тести:** `log-view.test.ts` — мітка turnStart; `turn-end` — рядок для wfrp, немає для dnd5e; `D100RollBody` intl-тест тексту; i18n-паритет ключів.

## 9. Не з'ясоване

- 1 Wounds після бою — **задумано для всіх систем, не wfrp-специфіка**: `completeBattle` при перемозі піднімає непритомних союзників з `reviveHp = persistResources ? 1 : maxHp` (`turn/victory.ts:86-100`), а wfrp-пресет має `persistResources: true` (`wfrp/rules-preset.ts:11`). Чи лишати для wfrp — П5.
- Dev-індикатор Next «1 Issue» без браузера не відтворюється — пункт live-run.

## Пакети (кожен — одна Sonnet-задача)

| Пакет | Хвости | Залежить від |
|---|---|---|
| A | #6, #4, #2 — рушій wfrp + roll-handler | — |
| B | #1 — серверна редакція + dm-канал | — |
| C | #5, #8 — контракт міток/conceal, косметика, i18n | B |
| D | #3 — числа каталогу | відповіді П3–П4, A |
| E | #7 — розрив циклів + `maxDepth` | рішення П6; після C (той самий `run.ts`) |
| Live-run | ДМ і гравець (2 акаунти): журнал гравця без рівнів/цілі, ДМ повний через Pusher; тест з листа в бою; Unconscious пропуск + рядок; dev-індикатор «1 Issue» | A–C |

Порядок: A і B паралельно (різні файли), далі C, потім D/E за відповідями. Тести — `pnpm test:related`/`test:changed` у пакеті; повний прогін і repo-wide lint — один раз у кінці.
**Бюджет i18n:** `scope-size` (кампанія + бій + battleWfrp, uk) 102.7 / 105 KB. Нові ключі пакета C (~0.15 KB: `actionKinds.turnStart`, `turn.skipUnconscious`) — у межах; D може додати описи станів — якщо перевищить, винести довгі описи в довідку.

## Рішення (користувач, 2026-11-05)

- **П1.** У 5c-2 редагується лише журнал (п. 1). Повна серверна приватність учасників (`activeEffects`, `currentHp` ворогів у `initiativeOrder`) — окремий епік для всіх систем; у відкриті хвости `rule-systems.md`.
- **П2.** Так: гравці (зокрема з `seeEnemyHp`) не бачать рівнів станів ворога в журналі; бейджі лишаються.
- **П3.** Числа каталогу станів і формулу Entangled **не чіпати** (джерела немає). `conditions/catalog.ts` не змінюється, `end-test.ts` — лише прибирання мертвих полів (п. 6); `removes`/`selfPenalty` з п. 3 не робляться, Unconscious без тривалості (П7) — поза каталогом; хвіст №3 лишається відкритим — лише позначка в docs (5c-3).
- **П4.** Так: кровотеча на непритомному тікає — шанс смерті 10%×рівень (наявна константа `BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL`, без зміни чисел) на пропущеному ході.
- **П5.** Непритомний герой після перемоги: 0 Wounds + Unconscious до лікування. `completeBattle` змінюється лише для систем із прапорцем контракту (wfrp); dnd5e/homm — як зараз.
- **П6.** Так: розірвати обидва кластери й підняти `maxDepth` до 6; перевірка — eslint по каталогах (repo-wide lint заборонено).
- **П7.** Unconscious без тривалості (п. 4б).

Наслідок для пакетів: пакет D = непритомний (П4 + рядок пропуску ходу з п. 8 + П5) замість чисел каталогу.

## Питання до користувача

- П1. Учасники (зокрема `activeEffects` і `currentHp` ворогів) ідуть усім сирими — редагування лише журналу ок у 5c-2, а повна серверна приватність учасників — окремий епік (зачіпає всі системи)?
- П2. Гравці з `seeEnemyHp` втрачають рівні станів ворога в журналі (бейджі лишаються) — прийнятно?
- П3. Числа станів (п. 3, «з пам'яті про 4e»): зняття 1+SL; Entangled опозиційний; Bleeding через Heal і 10% — смерть, не непритомність; тік Poisoned; рівневі Blinded/Deafened; автоматичні тести й тики в кінці раунду; межа 10. Що з цього так у 5e?
- П4. Кровотеча на непритомному (тік зараз пропускається) — робити шанс смерті за книгою?
- П5. Непритомний герой після перемоги: 1 Wound (як зараз) чи 0 Wounds + Unconscious до лікування?
- П6. ESLint: розірвати 2 кластери й підняти `maxDepth` до 6?
- П7. Unconscious без тривалості (рішення п. 4б) — підтвердити (альтернатива — відлік тривалості для пропущених ходів).
