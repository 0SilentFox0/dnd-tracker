# Лабіринт: опція «Підміна» (illusion swap) — дизайн

Дата: 2026-11-08. Режим: `maze`. Шлях: architectural (spec → plan → SDD).

## Мета

У лабіринті DM вмикає «Підміну» для пари союзних героїв: кожен бачить другого ворогом, причому різним
(Зехір бачить Годрика як Вампіра, Годрик бачить Зехіра як Ліча). Бій справжній: повна сила, здібності,
урон і смерть без обмежень. DM у будь-який момент повертає «союзників» однією дією, без втрати стану бою.
Пар може бути кілька (А–B, C–D). Для C герої А і B лишаються союзниками з справжніми іменами.

## Прийняті рішення

1. **Ворожість:** реальні `basicInfo.side` / `controlledBy` не змінюються. Підміна = «ворожі на вигляд» для
   атак і заклинань + маска імені/аватара. Перемога, мораль, XP рахуються за реальним `side`.
2. **Маски:** DM обирає для кожного героя пари, ким його бачить інший (юніт з бібліотеки або довільні
   ім'я+аватар). DM бачить справжні особи.
3. **Вмикання:** на пару, кілька пар одночасно, один герой — максимум в одній парі. Одна дія «Повернути
   союзників» очищає все.
4. **Приховування:** клієнтська маска (як `maskMazeScene` у Лабіринті). Дельти/Pusher/GET не редагуються;
   це правило проєкту («hiding is UI only», `battle.md`), не захист.
5. **Урон/смерть:** усе справжнє. Якщо один із пари помирає, залишає мапу або бій завершено, підміна
   знімається автоматично (подія лише для DM). XP/перемога/мораль без змін.

## Reuse before writing

| Потреба | Існуюче | Новий код |
|---|---|---|
| Стан у лабіринті | `MazeConfig` (`types/battle.ts`), `emptyMaze`, `mazeSchema` | ключ `illusionSwap` |
| Дельта | `modes/maze/delta.ts` `mazeChange` (будь-який новий ключ їде сам) | — |
| Операція DM | `mazeActionSchema` + `MAZE_OPS` (`op:"dark"` як шаблон), `useMazeAction`, `useMazeTools` | `op:"illusion"` |
| Тулбар | `MazeToolbar`, `MAZE_TEXTS` | кнопка + діалог |
| Маска | `deriveMazeView`, `maskMazeScene`, `maskMazeFxAction`, `useMazeMaskValue`, `ModeViewContext` | розширення на disguise |
| Лог DM-подій | `mazeOpEvent`/`dmEvent`, `mazeLogVisible` | — |
| Очищення | `mode.server.onReset`, mode `afterMutation` | чистка пар |
| Ворожість | `enemyOf`, `enemiesInReach`, `hostile()` (spell-targeting), `isEnemyOf` (strike) | єдиний `isHostile` з хуком режиму |
| Масок із бібліотеки | вибір юніта в існуючих діалогах DM (`dm/dialogs/*`) | перевикористати picker |

`charm` (`applyCharm`, `originalSide`) свідомо не використовується: він справді міняє side і ламає
припущення лабіринту (`ALLY` = герой, `dormant` для ENEMY).

## Дизайн

### 1. Стан і операція

```ts
type IllusionDisguise = { name: string; avatar?: string; unitId?: string };
type IllusionPair = { a: string; b: string; aSees: IllusionDisguise; bSees: IllusionDisguise };
// MazeConfig.illusionSwap?: { pairs: IllusionPair[] }   (default: відсутнє = порожньо)
```

- `aSees` — ким бачить **a** учасника **b** (і навпаки для `bSees`). Зафіксувати це у JSDoc одним рядком.
- `mazeActionSchema` отримує `{ op: "illusion", pairs: IllusionPair[] }`; порожній масив = повернути союзників.
  Операція замінює весь список (idempotent).
- Серверна валідація (`maze-ops.ts`): обидва учасники існують, `sourceType === CHARACTER`, розміщені на
  мапі, не мертві, `a !== b`, жоден id не повторюється між парами, імена масок непорожні. Помилки через
  `REJECT.*` / `rejectAction`.
- `onReset` очищає `illusionSwap`. Подія через `mazeOpEvent`, невидима гравцям.
- Автознімання: у mode `afterMutation` пара видаляється, якщо хтось з пари мертвий / не на мапі / бій не
  ACTIVE; DM-подія «підміна знята».

### 2. Ворожість у рушії

- Додати в `ModeEngineHooks` опційний `areHostile?(ctx, a, b): boolean | undefined` (undefined = не
  втручатись). Maze повертає `true` для учасників однієї пари.
- В ядрі один `isHostile(ctx, a, b)` = `modeHook ?? a.side !== b.side`. Ядро режим не імпортує
  (реєстр, як інші хуки).
- Замінити inline-порівняння лише тут: `attack-phase/targets.ts` (`enemyOf`), `grid/attack-reach.ts`,
  `actions/run.ts`, `actions/legendary.ts`, `actions/opportunity.ts`, `spell/spell-targeting.ts`
  (`hostile`, `resolveTargets`), `validation/ability-targets.ts`, `maneuvers/strike.ts` (`isEnemyOf`).
- UI: `useAttackTargets.ts` пропускає «ворожу» ціль попри `friendlyFire` (клієнтський дублер того ж правила).
- Поза межами: ауры, тригери здібностей, `fx/*`, інші ~70 порівнянь `side` лишаються на реальному `side`
  (зафіксувати в `battle.md`). Перемога/мораль/XP — реальний `side`.

### 3. Маска (клієнт)

- `deriveMazeView` додає в `MazeView` мапу `disguiseOf(viewerId, targetId)` для глядача-героя в парі.
- `maskMazeScene`: ростер, черга ходів, активний учасник. `maskMazeFxAction`: імена в FX.
  Лог: `actorName`, `targets[].participantName`, `hpChanges[].participantName`, `textRefs`. Тости.
- Токени мапи: `modeView.visible` + підміна імені/аватара.
- Треті гравці: справжні імена. DM: справжні + позначка «(під маскою)» у ростері/токені.
- Перевірити `turn-started` push і Pusher-тости на витік імен.

### 4. DM-інтерфейс

- Кнопка «Підміна» в `MazeToolbar`; діалог: список пар (додати/видалити), для кожної обрати двох героїв і
  маску для кожного (picker юнітів + довільні ім'я/аватар). Блок активних пар + кнопка «Повернути
  союзників» (`op:"illusion", pairs:[]`).
- Стан/відправка в `useMazeTools`. Тексти `messages/{uk,en}/battleDm.json`, `battleLog.json`, `errors.json`.
- Онбординг: запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в обох `messages/*/whatsNew.json`.

## Помилки та крайні випадки

- Герой помер/покинув мапу під час підміни → автознімання + DM-подія.
- Перезапуск бою/reset → очищення.
- Герой у двох парах → 400 з текстом із `api-errors.ts`.
- Масштаб дельти: `illusionSwap` малий; на `PUSHER_DELTA_LIMIT_BYTES` не впливає.
- Відома межа: AoE-заклинання й cleave вважають пару ворогами лише через `isHostile`; ауры/тригери — ні.

## Тестування

- Схема і валідація пар (дублікати, не-герой, мертвий, поза мапою).
- `isHostile`: хук maze, fallback на `side`; атака, площинне заклинання, cleave, opportunity в парі.
- Автознімання; `onReset`.
- Маска: ростер, черга, лог (імена + textRefs), FX; глядач у парі / третя сторона / DM.
- `delta-invariant.test.ts` оновити; i18n-ключі uk/en.
- Vitest, `// @vitest-environment happy-dom` для UI.

## Документи

`docs/architecture/map-modes.md` (хук `areHostile`), `battle.md` (підміна, «UI only», межі `isHostile`),
`docs/STATUS.md`.

## Вихід за межі

Підміна не-героїв, підміна між сторонами (ally↔enemy), справжня секретність (per-user дельти),
запобіжник смерті/підтвердження DM, авто-вмикання при зустрічі.
