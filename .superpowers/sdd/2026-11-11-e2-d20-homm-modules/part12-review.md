# Ч12 — Opus-ревʼю (2026-11-13)

Гілка `feat/e2-part12-battle-ui`, `git diff main...HEAD` (b9e2ca6fe, без `.superpowers`). Ревʼю статичне: tsc/vitest/eslint не запускались (лок `/tmp/e2-heavy.lock` тримала смуга Ч16; гейти робить `gate-ch12`).

Підсумок: **C 1 / I 1 / M 6.**

## Critical

### C1. З увімкненими FX кидок моралі «extra»/«skip» не показує підсумок і не передає хід
`systems/morale/hooks/useMoraleRoll.ts:33-40, 56, 66-72` + `components/battle/turn/MyTurnControls.tsx:183-185`.

`useMoraleRoll` живе в `MoralePanel`, а панель рендериться лише при `turn.phase === 'gate'`. Після мутації хук викликає `gate.resolve(result)` → `turnFlow` переводить фазу в `'acting'` (extra) або `'ended'` (skip) → панель розмонтовується → cleanup ефекту робить `controller.abort()`. `afterMoraleDice(signal)` на `abort` резолвиться одразу, і наступний рядок `if (signal?.aborted) return;` виходить із функції. Наслідок:
- extra: повноекранний «Бойовий дух» не показується;
- skip: «Паніка» не показується і **`gate.skipTurn()` не викликається** — хід не передається автоматично, гравець лишається у фазі `ended` без кнопки (сервер блокує дії `panicSkip`), бій стоїть, доки ДМ не передасть хід вручну.

У main `rollMorale` жив у `usePlayerTurn` з `lifetime` на весь `MyTurnControls`, тож це регресія Ч12 (коміт c55b3c4fe).

Відтворення: кампанія `homm` (або `dnd5e + morale`), FX увімкнені (типово), вкладка видима; герой з мораллю ≠ 0 на початку ходу кидає d10 у зону «extra»/«skip» → кубик котиться, оверлею немає; при «skip» хід не переходить.

Чому тести не бачать: `use-morale-roll.test.tsx` мокає FX вимкненими, а `usePlayerTurn.test.tsx:18-24` складає обидва хуки в одному `renderHook` (панель ніколи не розмонтовується), тож тест «з FX оверлей чекає кубик» зелений.

Виправлення (на вибір): (а) `TurnGateControls` отримує `signal: AbortSignal` з `lifetime` у `usePlayerTurn`, `useMoraleRoll` бере його замість власного контролера; або (б) `MyTurnControls` тримає `turnStart.Panel` змонтованою до кінця ходу (панель сама ховає UI поза `'gate'`). Тест: `MyTurnControls` (або обгортка з умовним рендером панелі за `phase`) з `fx.enabled = true` → після `moraleDiceDone()` `showResult` викликано і для `skip` — `nextTurn` через `TURN_SKIP_MS`.

## Important

### I1. `systemOfCampaign` не повторює фолбеки `parseRules` — у легасі-кампаніях бій без `battleMorale`
`lib/server/systems/campaign-system.ts:7-28`, `lib/i18n/system-scope.ts:61-77`.

Клієнт бере `battle.rules = parseRules(raw)`: без/з невалідним `rules.system` → `{ key: classes.enabled ? 'dnd5e' : 'homm' }` (`lib/utils/rules/schema.ts:191-197`), з невалідною композицією → модулі пресета (`:202-204`). Серверний скоуп натомість: `rules.system` відсутній → `{ key: null }` → `systemScope` повертає `[]`; невалідні `modules` йдуть у `composition` як є. Для `homm`-кампанії без записаного `rules.system` UI моралі (панель, підпис, бейдж, оверлей) рендериться (`parseRules` → `homm` з `morale`), а namespace `battleMorale` у провайдер не потрапляє → сирі ключі / помилки next-intl. До Ч12 це не мало наслідків (пресет `homm` не мав battle-namespace), тепер має.

Відтворення: у локальній БД `UPDATE campaigns SET rules = rules - 'system' WHERE id = …` (кампанія з `classes.enabled = false`), відкрити бій героя з мораллю ≠ 0 — тексти моралі без перекладу. Аналогічно `rules.system = {key:'homm', modules:['morale','bogus']}`: клієнт отримує пресет, скоуп — інший набір.

Виправлення: `systemOfCampaign` читає `rules` цілком і повертає `parseRules(rules).system` (або той самий `loadRules`), щоб скоуп і клієнт мали одну композицію; тест `campaign-system.test.ts` — «немає `system`» → ключ пресета за `classes.enabled`. Перевірити на prodcopy, чи є такі рядки (якщо backfill E0 їх уже прибрав — понизити до Minor, але фолбек лишається розбіжним).

## Minor

- **M1.** `systems/morale/ui/battle/MoraleBadge.tsx:14-16` — хук `useBattleSceneData()` викликається до `place !== 'hero'`, тому в кожному `ParticipantRow` (через `badges`) зʼявляється споживач контексту, що перерендерюється на кожну дельту й повертає `null`. `memo` рядка ціле (компонент малий), але виграш П1 частково втрачено. Варіант: окремі списки `heroBadges`/`rowBadges` або ранній вихід до хука через обгортку.
- **M2.** `lib/i18n/system-scope.ts:44-58` — `try/catch` ковтає будь-яку помилку `composition` (не лише невідомий ключ) і мовчки повертає `[]`; рядковий шлях `systemScope('homm', 'battle')` дає `[]`, а обʼєктний `{ key: 'homm' }` — `['battleMorale']`: дві семантики однієї функції. Хоча б коментар/тест, що рядковий шлях не знає модулів, або перевести решту викликачів у Ч17 (разом із В15).
- **M3.** `lib/hooks/battle/__tests__/usePlayerTurn.test.tsx:9` — core-тест імпортує `@/systems/morale/hooks/useMoraleRoll`; покриття панічного таймера тепер залежить від модуля. Краще перенести композиційні кейси в `systems/morale/__tests__/hooks/`, а core-тест лишити на `gate.resolve/skipTurn`.
- **M4.** `lib/hooks/battle/usePlayerTurn.ts:144-160` — `gate` створюється заново кожного рендеру і передається пропом у `turnStart.Panel`; зараз безпечно, але будь-який `memo`/`useEffect([gate])` у модулі отримає нестабільне посилання. `useMemo`/`useRef`-стабілізація дешева.
- **M5.** `systems/morale/__tests__/hooks/use-morale-roll.test.tsx` — немає кейсу з `fx.enabled = true` і розмонтуванням (див. C1); немає кейсу `extra` (лише `skip`, `none`, помилка).
- **M6.** `docs/architecture/{rule-systems,battle}.md` ще не описують `SystemUi.battle` (слоти, порядок списків), `combat.turn.startCheck`, `combat.offHand`, `magic.spellAbilityMod`, i18n модулів, `ResultFx { kind: 'system' }` — заплановано контролером після ревʼю, нагадування.

## Перевірено, зауважень немає

- **Паритет гейту з сервером.** `startCheck.due` = `awaitsMoraleCheck` — та сама функція, що в `moraleGate` (`systems/morale/rules/turn/gate.ts:24-27`), скоуп `{ participants, scene: { turnIndex, pendingMoraleCheck }, rules }` збирається з `battle.currentTurnIndex` (`lib/hooks/battle/turn-start-check.ts:12-24`). Голий `dnd5e` з легасі `moraleCap` → слота немає → `gated: false`; учасник, що вже діяв, → `false` (свідома видима зміна С2.2). `useBattleMapScene` і `usePlayerTurn` питають одне й те саме.
- **`ParticipantRow` memo.** `acText` — рядок з `defense` (`ParticipantList.tsx:54-61`), `badges` — пропом і порівнюється за посиланням; `systemUiOf` кешує композицію (`components/systems/registry.ts:31-37`), тож посилання стабільне.
- **M4 client-delta `scene.system`** — не змінювалось у Ч12 (В2), тести в `pipeline/__tests__/client-delta.test.ts` на місці.
- **i18n.** `battleMorale.json` uk/en — однаковий набір ключів (перевірено `jq paths`); усі видалені з `battle.json` ключі (`morale.*`, `hero.morale`, `notify.moraleUnchanged`, `turnControls.strip.morale`) перенесені 1:1 (`badge`, `unchanged`, `strip`); у core/модулях посилань на старі ключі немає; `global.d.ts` оновлено; `MORALE_META.i18n.battle`.
- **D15.** `content.kinds` фільтрує через `isKindActive` (кеш `systemOf` на `actor`, без N запитів); `content.export`/`content.import-example` — `assertKindActive(kindOf(...))`; `skill-trees.list|save` — `assertKindActive('skills')` (вид `skills` належить `skilltrees`, id модуля в core не названо).
- **M8 SkillsTab** — `pathPanels` лише при `ready`.
- **Межі.** Нових `@/systems/*` у `app|lib|components|types|scripts` (поза тестами) немає; `system-imports-exempt.json`, `system-literals-exempt.json`, `i18n-exempt.json` без diff; `LEAK_NAMES` лише додано (`moraleOutcome/moraleTriggerRolls/needsMoraleCheck: 0`, `isFiveE: 10`). Модульний UI не імпортує `@/components/systems` (лише `types`) і `use-system-battle-ui`; `power.ts` → реєстр без циклу (d20 бере листовий `ability-modifier.ts`, `power.ts` імпортують лише `spell/cast/*` і sim). `MoraleResultOverlay` — `dynamic(ssr:false)` у `systems/morale/ui/index.ts`, `client-entry-imports` оновлено.
- **wfrp / d6pool / dnd5e без модулів.** wfrp: `battleConditionsDialog` → `battle.ConditionsDialog`, `DmQuickActionsPanel` бере його через композицію; без `HeroStats/defense/badges` (як раніше без `d20Stats`). d6pool: `battle: {}`. Голий `dnd5e`: d20-слоти (КБ, слоти, рятунки, крит-вибір) є, мораль — ні. `CritChoiceWaitingBanner` тепер лише d20 — `pendingChoice` пише лише крит-вибір d20.
- **`isFiveE`.** `combat.offHand` і `magic.spellAbilityMod` для d20 = попередня поведінка; `computeSpellPower.rules` обовʼязковий, усі викликачі передають правила (`hero-growth-report` — `DEFAULT_RULES` = `homm`, той самий d20).
- **MyHeroPanel** — змінено лише в описаних місцях: `HeroStats` (компакт/повний), `heroPanels` (замість `SlotGrid`), `badges place="hero"` (замість бейджа моралі), `useSystemBattleUi()` без `?.`. `DeathSaveBadge` для `hero` повертає `null` — як у main (рятунків у панелі героя не було).
