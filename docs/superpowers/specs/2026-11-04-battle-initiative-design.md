# Ініціатива в бою: кидок DM і ручний порядок

Дата: 2026-11-04. Гілка реалізації (планується): `feat/battle-initiative`. Пункт 2 з батчу 2026-11-04.

## Мета

DM під час бою може (a) одним натисканням кинути ініціативу за всіх учасників на мапі, і всі гравці бачать кубики, що випали; (b) вручну задати порядок ходів. Порядок діє одразу й зберігається до кінця бою.

## Рішення (узгоджені з користувачем)

1. Кидок автоматичний на сервері, гравці кубик не кидають. Усі клієнти бачать 3D-кубики й рядок у лозі.
2. Нової опції в `rules` немає (`rules.initiative.mode` лишається як є). Кнопка DM доступна в активному бою.
3. Кидок: порядок застосовується одразу, `turnIndex = 0`, раунд той самий, ходить перший за новим порядком.
4. Ручна перестановка: вказівник ходу лишається на тій самій позиції, ходить той, хто тепер там стоїть (було `1 2 3`, DM поставив `3 1 2`, ходить 3).
5. Нічия: випадковий вибір на сервері, без перекидання й без окремого відображення.
6. Порядок зберігається на весь бій: початок раунду його не перераховує. Змінюють його лише кидок, ручна перестановка, додавання, розкриття з резерву і морально-додаткові ходи (як зараз).
7. Ефекти `modifyStat initiative` враховуються лише в момент кидка.

## Reuse before writing

| Що | Де | Як використовуємо |
|---|---|---|
| Розрахунок ініціативи | `lib/utils/battle/turn/initiative.ts` (`calculateInitiative`, `compareInitiative`) | кидок викликає ту саму формулу (d20 + DEX + `initiativeBonus` + `collectModifiers`), «завжди перший» ≥1000 лишається статичним |
| Мутаційний конвеєр | `runBattleMutation`, `mutations/<action>/`, реєстр `battleOps` (`lib/api/battle-ops.ts`), `makeBattleHook` | дві нові операції за стандартною схемою |
| Дельта з порядком | `buildClientDelta` (`order`, `patched`), `applyBattleDelta` | нічого нового: переставлений порядок і нові `initiative` вже передаються |
| Збереження порядку | колонка `battle_participants.orderIndex` | окремого рангу не додаємо |
| 3D-кубики для всіх | `components/battle/fx/dice/DiceStage`, архетип `dice`, `DiceThrowSpec`, зразок `lib/utils/battle/fx/dice/from-morale.ts` (детермінований `seed` з ключа), `useBattleFxQueue` | новий `from-initiative.ts` будує `DiceThrowSpec` з події; клієнти програють однаково |
| Лог | `dmEvent`, `textRef`, `details.log` | подія `battleLog.dm.initiativeRolled` з результатом кожного |
| Захист порядку | `guardTurnOrder` (`pipeline/turn-order-guard.ts`) | виняток для двох нових операцій (через `result.history`-подібний прапорець результату) |
| Доступ DM | `BattleAccess.DM`, приклад `conditions` | обидві операції лише DM, статус `ACTIVE`, заборонені при `awaiting_dm` |
| Вставка новачка | `add-participant-mutation.ts` (`compareInitiative` з монотонністю не передбачена) | уже працює на немонотонному порядку (розкриття), дописати тест для ручного порядку |
| DM-панель | `DmQuickActionsPanel`, `ConditionsDialog` | кнопка «Кинути ініціативу» і діалог перестановки за зразком |
| Перетягування | `useFlip` (`InitiativeTrack`) | анімація переміщення; сам DnD нової залежності не додаємо (див. UI) |
| i18n, whats-new | `messages/*/battle*.json`, `lib/onboarding/whats-new.ts` | нові ключі в обох мовах |

Нового пишемо: операції `initiative-roll` і `initiative-reorder`, чисту функцію кидка, `from-initiative.ts`, UI перестановки.

## Сервер

### `initiative-roll`
- `POST …/battles/[battleId]/initiative-roll`, тіло порожнє, `BattleAccess.DM`, бій `ACTIVE`, не `awaiting_dm`.
- `lib/utils/battle/turn/roll-initiative.ts` (чиста): для кожного учасника на мапі (не резерв, не `object`) кидає d20 через `rngOf(ctx)`, значення = d20 + мод. DEX + `initiativeBonus` + `collectModifiers(stat: "initiative")`; ≥1000 лишається `baseInitiative`. Повертає `{ participants, rolls: { id, d20, total }[] }`.
- Порядок: сортування `compareInitiative`, нічия вирішується випадковим ключем з `rngOf` (спочатку `initiative`, далі `baseInitiative`, `dexterity`, потім випадковий). Морально-додаткові слоти (`isExtraTurnSlot`) прибираються й не повертаються (їх додає наступний раунд).
- `scene.turnIndex = 0`; раунд, ефекти й лічильники не чіпаємо. Учасники з `revealPending` стають звичайними.
- Подія з рядком `battleLog.dm.initiativeRolled` і `actionDetails.diceRolls` (по групі `kind: "initiative"` на учасника, один d20), з яких `diceThrowsOf` будує FX. `dmEvent` отримує необов'язковий аргумент `diceRolls`.

### `initiative-reorder`
- `POST …/initiative-reorder`, тіло `{ order: string[] }`, ті самі обмеження доступу.
- Валідація: множина id дорівнює множині учасників на мапі (без резерву), без дублів; інакше 422 `BATTLE_INITIATIVE_ORDER_INVALID` (новий рядок у `api-errors.ts`).
- Масив переставляється, `turnIndex` не змінюється. `abilities.initiative` не чіпаємо (значення можуть бути немонотонними; `add-participant` це вже витримує).
- Подія в лозі `battleLog.dm.initiativeReordered` (без значень).

### Порядок на весь бій
- `round-start.ts`: прибрати `calculateInitiative`/`sortByInitiative`; зберігаємо лише `filter` extra-slot'ів і `countDownRoundEffects`. Як це впливає на режим `roll`: до зміни порядок у раунді ≥2 повертався до статичного (виклик без `rules`), після зміни лишається з кидків.
- Старт бою (`start-battle-handler`) не змінюється.
- `turn-order-guard.ts`: нові операції позначають результат прапорцем `reordered: true`, тоді guard пропускає.

## Дельта й Pusher

Без змін протоколу: `order` і `patched.initiative` вже в `ClientBattleDelta`. Подія з `actionDetails.diceRolls` приходить у `log`, клієнт будує FX з нових подій (`new-events.ts` → `diceThrowsOf`).

## Клієнт

- Реєстр `battleOps`: два рядки; хуки `useInitiativeRoll`, `useInitiativeReorder` (`makeBattleHook`) у `lib/hooks/battles`, експорт з барелю.
- `diceThrowsOf` (`lib/utils/battle/fx/dice/from-action.ts`): новий `kind: "initiative"` у `PHASES`, одна група з усіма d20 (до `MAX_INITIATIVE_DICE = 12`, решта лише в лозі). Окремого `from-initiative.ts` немає.
- UI DM: кнопка «Кинути ініціативу» у `DmQuickActionsPanel` (після підтвердження, бо це міняє порядок); режим «Порядок» у треку: перетягування портретів (pointer events, без нових залежностей) і запасний діалог зі списком і кнопками вгору/вниз для мобільного. Підтвердити зміну → одна операція `initiative-reorder`.
- Гравці бачать FX і оновлений `InitiativeTrack`; ніяких нових елементів.
- `data-tour="battle.initiative-roll"` для підказки DM.

## Крайні випадки

- Бій у `PREPARED` або `awaiting_dm`: кнопки недоступні, сервер 409.
- Один учасник: кидок працює, перестановка нічого не змінює (409 не потрібен, no-op із подією не пишемо).
- Учасник мертвий/недієздатний лишається в порядку (як зараз).
- Резерв не кидає; при розкритті діє наявна вставка.
- Відкат (`rollback`) повертає порядок із `battle_snapshots`; нова логіка не потрібна.
- Режим правил `static` також працює з кнопкою: кидок ігнорує `rules.initiative.mode`.

## Тести

- `roll-initiative`: детермінований `rng`, бонуси, ≥1000, нічия, відсутність extra-слотів.
- `initiative-roll`/`reorder` мутації: доступ, статуси, `turnIndex`, помилка валідації, `guardTurnOrder` пропускає.
- `round-start`: порядок і `initiative` не змінюються між раундами; extra-слоти як раніше.
- `add-participant` на ручному порядку.
- `from-initiative` (seed, обмеження кількості), `applyBattleDelta` з `order`.
- UI: тест кнопки й діалогу (`// @vitest-environment happy-dom`), ключі i18n.

## i18n і онбординг

Ключі `battleDm.initiative.*` та `battleLog.dm.initiativeRolled/Reordered` в `messages/uk` і `messages/en`; запис у `lib/onboarding/whats-new.ts` і `whatsNew.<id>` в обох `whatsNew.json`; hint для DM на `battle.initiative-roll`.

## Документація

Після реалізації: `docs/architecture/battle.md` (розділ ініціативи й «Turn advance»: порядок на весь бій, дві операції) і `docs/STATUS.md`.

## Відкрите для плану

- Перевірити, чи `round-start` тести/демо-тури (`engine clickFromTarget`) залежать від перерахунку.
- Точне місце прапорця `reordered` у `BattleMutationOutcome`.
- Ліміт кубиків у FX (12) перевірити на `DiceStage`.
