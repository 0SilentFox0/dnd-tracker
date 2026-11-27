# Швидка атака (П4.7 UX-аудиту) — дизайн

**Мета.** Удар зброєю за 1–2 кліки: типова зброя → ціль (клік по ворожому токену) → кидок. Візард лишається для складних випадків (кілька цілей, ручні кубики, вибір режиму, Cunning Strike, друга рука). Кидок показує спільна візуалізація (`components/dice`, 3D d20) — рішення власника.

## Що є зараз (перевірено в коді)
- **Візард** `components/battle/wizards/AttackWizard.tsx` + кроки `attack/{Weapon,Target,Roll,Damage,Summary}Step.tsx`; редʼюсер `attackFlow` (`lib/utils/battle/flows/attack-flow.ts`, кроки `weapon → target → roll → damage → summary → submitting → result`); хуки `useAttackWizard` → `useAttackActions` / `useAttackTargets` / `useAttackSteps` / `useAttackSubmit` (`lib/hooks/battle/`). Рендериться в `components/battle/turn/MyTurnControls.tsx` — і для гравця, і для ДМа (ДМ «контролює» ворогів через `isMyTurn`, `lib/utils/battle/view/derive-scene.ts:85`).
- **Шлях через меню** (`ActionGrid` плитка «Атака», гаряча клавіша `1`): `actions.open()` без цілі → Weapon (якщо зброї > 1) → Target → «Next» → Roll («Auto roll») → Damage («Auto roll» + «Next») → Summary («Submit») ≈ 8 кліків.
- **Клік по ворожому токену вже частково «швидкий»:** `useParticipantClick` → `participantAttackIntent` (`flows/attack-intent.ts`) бере зброю через `pickAttack` (`lib/utils/battle/grid/attack-reach.ts:84`: спершу ближня в досяжності, потім дальня в дальності) → `MyTurnControls` споживає intent (`canConsumeIntent`) → `actions.open(targetId, attackId)` з `picked`, одразу `CONFIRM_TARGETS` → візард відкривається на кроці Roll. Далі все одно Roll → Damage → Summary (3–4 кліки).
- **Недосяжна ціль при кліку:** `pickAttack` повертає `error`, але intent = `null` і клік мовчки відкриває інфо-картку (`select`) — причину не видно. У візарді причина — `LogLine` `battleLog.targetNotNear` (є uk/en); англійський текст в аудиті — наслідок перемикання мови (окремий пункт i18n), не відсутній ключ.
- **Сервер:** `POST …/battles/[battleId]/attack` → `runBattleMutation('attack')` → `createAttackMutation` (`lib/server/battles/mutations/attack/attack-mutation.ts`) → `runWithCritChoice` → `runAttackPhase`. Тіло вже дозволяє `serverRoll: true` (сервер кидає d20/d100, `run-attack-phase.ts:354`); шкоду кидає клієнт (`damageRolls`), на криті сервер сам докидає другий набір (`attack/crit-dice.ts`).
- **Крит ДМа:** при `critChoiceByDm` відповідь має `pendingChoice` → `WAIT_CRIT` + `useCritPause` чекає рішення, «Скасувати дію» → `FAIL critCancelled`.
- **Результат:** `scene.result.show(buildAttackResultFx(...))` → `ActionResultCard` (`components/battle/overlays/`, 4 с) з `DiceStage` (3D d20) + «Hit/−7/Downed»; `HitFloat` над токеном. На кроці Roll результату немає, крок Damage — лише кубики шкоди.
- **Нейтральність:** кубик — `ruleSystemOf(rules).combat.dice`; `serverJudged` (d100-бази) пропускають крок шкоди, свій `RollBody` дає `useSystemBattleUi()`; блокування зброї — `combat.attackBlocked`; майстерність/криті/досяжність — хуки композиції. Ядро системи не називає.

## Рішення
1. **Точки входу.**
   - Клік по ворожому токену в свій хід (наявний intent) = швидка атака замість відкриття візарда.
   - Плитка «Атака» / клавіша `1` вмикає **режим цілі**: досяжні вороги підсвічені на мапі (наявні `marks`, `canAttack` у `map-scene.ts`), картка швидкої атаки зі списком досяжних цілей (для гри без мапи і мобільного). Якщо досяжний рівно один ворог — він уже вибраний.
   - `Shift+1` / посилання «Майстер атаки» в картці — повний візард (поточна поведінка `actions.open()`).
2. **Типова зброя** = `pickAttack(...)` для цієї цілі (без змін правила вибору). Перемикання — чипи інших основних атак у картці (`attacks` без `hand: 'off'`, недосяжні сірі з причиною з `attackReachError`); вибір не запамʼятовується між атаками (YAGNI).
3. **Кидок.** Одна дія `QUICK_ROLL` у `attackFlow`: d20-шлях — клієнт кидає d20 (і другий при `forced` перевазі/недоліку з `forcedFor`), рахує `rollOutcomeOf`, на влучанні кидає `diceSlots` (`cryptoRandom`, як «Auto roll» у DamageStep; другий набір на криті докидає сервер) → одразу `submitting`. `serverJudged`-шлях — наявний `rollAction()` без d20 (вже йде в `submitting`). Наслідки на сервері ті самі, нового роуту/схеми немає.
4. **Результат.** Після відповіді — наявний `ActionResultCard` з 3D d20 (влучання/промах, шкода, «повалено») + `HitFloat`; окремої нової поверхні немає. Візард виправляємо мінімально: заголовок кроку Damage показує результат кидка («d20 14 → Влучання»/«Крит»), щоб «влучив/схибив» було видно до тосту.
5. **Коли швидка атака не застосовується → відкривається візард на потрібному кроці:** `maxTargets > 1` чи `attackHitsAllEnemies` (вибір цілей), система вимагає ввід атаки (`RollBody` без авто-кидка), користувач хоче ручні кубики/режим/натхнення/Cunning Strike (посилання «Детальніше» передає вже вибрані зброю й ціль). Друга рука — як зараз, окремою кнопкою у візарді.
6. **Крит ДМа:** без змін — `useAttackSubmit` вже робить `WAIT_CRIT`/`useCritPause`; картка показує «Чекаємо вибору ДМа» замість кнопки, скасування повертає її в стан до кидка.
7. **Дальня атака / укриття:** вибір зброї й укриття рахують ті самі `pickAttack`/`lineOfFire`; у картці рядок «Укриття» (як `RollStep`) і причина вимушеного недоліку (`forcedMode.reason`). Стіна на лінії — ціль недосяжна, клік показує причину тостом (`useBattleToast`) замість мовчазної інфо-картки.
8. **Додаткові атаки:** після удару, якщо `attackCounter`/`attacksLeft` > 0, режим цілі лишається активним, картка показує «Атака 2/3»; наступний клік по токену — наступна атака. Хід не завершується автоматично (поточна поведінка `afterAction`).
9. **Реакції / атаки по можливості / легендарні / підготовлені** — серверні атаки (`resolveServerAttack`), швидка атака їх не чіпає.
10. **Гравець і ДМ** — один компонент у `MyTurnControls`; права й хід перевіряє сервер (`assertCanAct`).

## Перевикористовуємо
`attackFlow` (+1 дія), `useAttackWizard`/`useAttackActions` (+`quick(targetId, attackId?)`), `pickAttack`, `attackReachError`, `forcedFor`, `rollOutcomeOf`, `damageDiceSlots`, `rollDie`/`cryptoRandom`, `useAttackSubmit` (+крит-пауза), `participantAttackIntent`, `ActionResultCard`/`DiceStage`, `HitFloat`, `useBattleToast`, `HudButton`, `CornerStack`. Новий лише компонент картки (наявні діалоги модальні й закривають мапу).

## Файли
- `lib/utils/battle/flows/attack-flow.ts` — дія `{ type: 'QUICK_ROLL'; d20?: number; second?: number; outcome: RollOutcome; damage: number[]; judge?: 'server' }`: з `roll` або щойно відкритого `picked` стану ставить удар і переходить у `submitting`.
- `lib/utils/battle/flows/attack-intent.ts` — `participantAttackIntent` повертає `{ intent } | { reason: LogLine } | null` (причина недосяжності); `quickAttackAllowed(attacker, attack, ctx): boolean` (п.5).
- `lib/hooks/battle/useAttackActions.ts` — `quick(targetId: string, attackId?: string)`; `useParticipantClick` — тост причини.
- `lib/hooks/battle/useAttackWizard.ts` — `view.quick: { allowed: boolean; weapons: { attack; reachable; reason? }[] }`.
- `components/battle/wizards/QuickAttackCard.tsx` (новий, неблокуюча картка в `CornerStack`/доку): ціль, чипи зброї, укриття/вимушений режим, кнопка «Атакувати», «Майстер атаки», лічильник атак.
- `components/battle/turn/MyTurnControls.tsx` — intent → `quick`, плитка/`1` → режим цілі, `Shift+1` → візард; `useActionHotkeys` — модифікатор.
- `components/battle/wizards/attack/DamageStep.tsx` — результат кидка в заголовку.
- `messages/{uk,en}/battleWizards.json` — `attack.quick.*` (заголовок, «Атакувати», «Майстер атаки», «Атака {n}/{m}», «Чекаємо вибору ДМа»), `attack.damage.rolled`.
- `docs/architecture/battle.md` — абзац про швидку атаку; `lib/onboarding/whats-new.ts` + `whatsNew.quickAttack` у обох мовах.

## Тести
- `attack-flow.test.ts`: `QUICK_ROLL` влучання → `submitting` з `damage`; промах → `submitting` з `damage: []`; `judge: 'server'`; ігнорується в `closed`/`summary`; `attackPayload` після `QUICK_ROLL` = payload візарда з тими ж кидками.
- `attack-intent.test.ts`: недосяжна ціль → `{ reason }`; стіна на лінії → `targetBehindWall`; `quickAttackAllowed` false для `maxTargets > 1`, `attackHitsAllEnemies`, обовʼязкового вводу системи.
- `useAttackWizard.test.tsx`: `quick` з типовою зброєю (ближня поруч, дальня здалеку); вимушена перевага кидає два d20; крит → `WAIT_CRIT` → `SUCCESS`; скасування криту повертає картку; після удару з `attacksLeft` режим цілі лишається.
- `useParticipantClick.test.tsx`: клік по досяжному ворогу → `quick`; по недосяжному → тост, не інфо-картка; по союзнику → `select`.
- `QuickAttackCard` (happy-dom): чипи зброї, сірий недосяжний чип з причиною, «Майстер атаки» відкриває візард на кроці Roll з тією ж зброєю й ціллю; uk-тексти (`wizards-intl.test.tsx`).
- `DamageStep`: заголовок показує d20 і влучання/крит.
- Д6-база (`lib/__tests__/d6pool-battle.test.ts`) і `serverJudged`-система: швидка атака не падає, кубик береться з `combat.dice`.
- Живий прогін на стейджі: ДМ-монстр і герой гравця, ближня/дальня з укриттям, крит з вибором ДМа, мобільна ширина.

## Поза межами
Авто-рух до цілі перед атакою; запам'ятовування улюбленої зброї; швидкі заклинання; редизайн `ActionResultCard`; виправлення мови екрана бою (окремий пункт i18n аудиту); атаки поза ходом.

## Питання власнику
**Що робить клік по ворожому токену у свій хід?**
- **A. Миттєва атака (1 клік):** клік = кидок і удар типовою зброєю без жодної картки; інша зброя/ручні кубики — тільки через меню «Атака» → візард. Найшвидше для ДМа з 5–10 істотами, але гравець, що кидає фізичні кубики, втрачає ввід у швидкому шляху, а випадковий клік = витрачена атака (відкат лише через «Скасувати дію»/rollback).
- **B. Картка + «Атакувати» (2 кліки):** клік відкриває неблокуючу картку з підсвіченою ціллю, типовою зброєю (чипи для зміни), укриттям і кнопкою «Атакувати» (авто-кидок) та «Майстер атаки» (ручні кубики). Захист від випадкового кліку, один шлях для гравця й ДМа.
- **C. A для істот під керуванням ДМа, B для героїв гравців.**

**Рекомендація: B** — різниця з A лише в одному кліку, зате немає випадкових атак, видно, якою зброєю б'ємо і чи є укриття, а ручні кубики лишаються на відстані одного посилання; C подвоює гілки й тести заради одного кліку для ДМа.

**Рішення власника (2026-11-27): B** — картка + «Атакувати» (2 кліки), «Майстер атаки» як запасний шлях.
