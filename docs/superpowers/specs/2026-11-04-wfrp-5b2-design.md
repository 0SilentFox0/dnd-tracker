# WFRP 5b-2: Momentum на сцені й хвости рушія (spec)

Дата: 2026-11-04. Гілка `feat/wfrp` (не мерджити в main до «епік готовий»). Попередня частина — [5b-1](2026-11-04-wfrp-5b1-design.md); реєстр систем — [rule-systems.md](../../architecture/rule-systems.md).

Декомпозиція 5b змінена: **5b-2 — лише рушій** (цей spec), **5b-3 — UI бою** (варіант AttackWizard, HUD, підписи yd, кидок d100 клієнта `attackBodySchema.d20Roll` > 20, `useRuleSystem` під час завантаження, live-run у браузері). У 5b-1 spec «5b-2» означав UI — цей spec його заміщує.

## Мета й успіх

1. Momentum — стан сцени (`battle_scenes.momentum`), а не учасників; один шлях читання/запису для гравецьких і серверних атак (реакції, нагоди, легендарні дії, дії-рухи).
2. Закрито хвости рушія 5b-1: `InitiativeRollEntry.d20` тримає d10, невикористаний `abilities.wfrp.moveYd`, залишкові `rules?` / `?? DEFAULT_RULES` на шляхах, досяжних для wfrp.

Критерії: d20-системи (homm, dnd5e) без змін поведінки — наявні тести й `battle-sweep` на prodcopy (перед деплоєм епіку); `wfrp-battle-e2e` проходить; відкат ходу повертає жетон.

## Правила Momentum (без змін відносно 5b-1)

Булевий жетон на сторону (`ParticipantSide` = `ally | enemy`, інших немає). Виграш opposed (атакувальник або захисник) віддає жетон переможцю й забирає в іншої сторони; витрата дає +SL (`MOMENTUM_SL_BONUS`) наступному тесту сторони; захисник, що тримав жетон, витрачає його в захисті. Контракт `resolveAttack` не змінюється (`momentum: {attacker, defender}` на вході, `{spent, gainedBy}` на виході). Нове лише: серверні атаки теж беруть участь (рішення користувача). Числа й «звірити з книгою» — у `wfrp/combat/constants.ts`.

## Reuse

| Є | Використовуємо |
|---|---|
| `pendingCritChoice` / `pendingMoraleCheck` (колонка `battle_scenes`, `load-battle`, `save-battle`, `ScenePatch`, `client-delta`, `apply-delta`, `types/api`) | той самий шлях для `momentum` |
| `ActionFlow` (`common/action-flow.ts`), `resolveServerAttack`, `judgeWfrp` | носій стану в дії; логіка Momentum виноситься з `run.ts` |
| `snapshot-state.ts` + `restoreParticipantsAt` / rollback-mutation | знімок і відновлення сцени |
| `MutationResult.scene` | повернення зміни жетона з мутацій |

Нового пошуку в `lib/utils`, `components/*` не потрібно: UI не чіпаємо.

## Дизайн

### 1. Дані
- Prisma: `BattleScene.momentum Json?` (expand-only міграція; `battle_scenes` уже має RLS, нової таблиці немає). Форма `SceneMomentum = { ally?: true; enemy?: true }` (`types/battle.ts`).
- `BattleSceneState.momentum: SceneMomentum` (порожній об'єкт = жетонів немає); `load-battle`, `save-battle` (`ScenePatch.momentum`), публічна форма в `battle-response.ts`, `client-delta.ts` (`scene.momentum` присутнє лише коли не порожнє; відсутнє = порожнє), `apply-delta.ts`, `types/api.ts`.
- `battleData.momentum` видаляється з `types/battle.ts` і з рушія; старі значення не мігруються (wfrp-боїв на prod немає).
- Життєвий цикл: `start`, `reset` — `{}`; `complete` — `{}`; знімок сцени (`snapshot-state.ts`) отримує `momentum`, `rollback-mutation` відновлює його поряд з `pendingMoraleCheck` (раніше жетон відкочувався разом з учасниками — не втратити).

### 2. Рушій
- Чиста утиліта `lib/utils/battle/momentum.ts`: `heldBy(state, side): boolean`; `settle(state, {attackerSide, targetSide, held, resolved}) → { next: SceneMomentum; gained: boolean }` (спожите, виграш, скидання іншої сторони). Єдина реалізація для `judgeWfrp` (`attack/process/run.ts`) і `judgeServerWfrp` (`attack/server-attack.ts`); `momentumOf`/`setMomentum` видаляються.
- `ActionFlow.momentum: SceneMomentum` (+ `ctx` лишається незмінним). П'ять місць, що судять атаку, беруть жетон зі сцени й повертають зміну: `attack/process/run.ts` (через `runAttackPhase`, разом з `retaliation.ts`), `actions/opportunity.ts` (через `resolveMovement5e`), `actions/legendary.ts`, `actions/run.ts` (readied). `spell/cast/index.ts` теж створює `ActionFlow`, але Momentum не використовує (магія wfrp — 5d): передає константу `NO_MOMENTUM`; `berserk` так само (кидає `combat.dice` із серверним rng). Мутація-власник кладе `flow.momentum` у `MutationResult.scene.momentum` лише коли воно змінилося.
- Лог-рядок `battleLog.percentile.momentum` лишається (виводиться за `gained`).
- Для d20 `momentum` завжди `{}`, нічого не пишеться й не відправляється в дельті.

### 3. Хвости
- `InitiativeRollEntry`: `d20` → `roll`, `sides: number` обов'язковий; споживач — `initiative-roll-mutation.ts` (`diceRolls`) і тести.
- `rules` обов'язковий (прибрати `?` і `?? DEFAULT_RULES`): `attack/roll.ts`, `attack/crit-threshold.ts`, `types/damage-breakdown.ts`, `maneuvers/strike.ts`, `crit-choice/run-with-crit-choice.ts`, `mutations/start/start-fair-scaling.ts` (+ їхні ~12 викликів у `lib/`; `tsc` веде). Решта `rules?` (`roll-check`, `saves/`, `conditions/`, `death saves`, `balance-*`) стосується d20-логіки або дорогих перерозрахунків і лишається — запис у «Межі 5b-2».
- `abilities.wfrp.moveYd` видаляється (`wfrp/combat/participant.ts`, тести `from-character-wfrp`, `balance`); бюджет руху береться зі `speed`.

## Поза межами (відкладено)
UI бою (5b-3); щит/броня (5f); стани, крит-маркери, психологія (5c); d100 у `diceRolls`; смуги дальності; звірка еталонів `refHit`, `DIFFICULTY_SL`, Momentum з книгою; решта хвостів 5a (клас у wfrp, `readCharacteristics`, egress `list-templates` тощо).

## Тестування
- `momentum.test.ts` (settle: виграш, витрата, захисник, дубль-подія, обидві сторони).
- `wfrp-attack` / серверні атаки: реакція, нагода, легендарна дія читають і пишуть жетон сцени; атака, що виграла жетон, і наступна атака іншою дією його витрачає.
- Збереження/дельта: `save-battle`, `client-delta`, `apply-delta` (momentum лише коли змінився); `rollback` повертає жетон; `start/reset/complete` скидають.
- `wfrp-battle-e2e`; d20-тести без змін; гард: у d20-мутаціях `scene.momentum` не з'являється в дельті.
- Перед деплоєм епіку: `battle-sweep` homm/dnd5e на prodcopy (ще не запускався); міграція `battle_scenes.momentum` + попередні дві (`characteristics`, `units_base`).

## Ризики
- Прокидання `flow.momentum` через п'ять точок — основна кількість змін; забути одну = серверна атака мовчки не бачить жетона. Тест на кожну точку.
- Нагода/реакція тепер можуть забрати жетон: свідома зміна балансу, значення констант без змін.
