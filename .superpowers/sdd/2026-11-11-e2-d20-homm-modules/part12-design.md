# Ч12 — дизайн: UI бою й клієнтські flow (2026-11-13, Opus)

Гілка `feat/e2-part12-battle-ui` від local main 85cb90883 (Ч11 злита), worktree `/Users/silentfox/Work/dnd-tracker-e2-ch12`. Паралельно йде Ч16 (`../dnd-tracker-e2-ch16`). Брифи: `common-ch12.md`, `task-ch12-{1,2,3,4}-brief.md`. Сесії йдуть строго послідовно, одним Sonnet-виконавцем: С1 → С2 → С3 → С4.

## Головна знахідка: частина плану вже зроблена, частина — не UI

Звірка з кодом (`rg`, 2026-11-13):

| Пункт плану / хвіст | Реальний стан | Рішення |
|---|---|---|
| `attack-flow`: `fortune` → `system?: SystemSlot` | **Зроблено в Ч5**: `lib/utils/battle/flows/attack-flow.ts:66` має `system?: SystemSlot`, `fortune` у flows/store/view немає | нічого (В2) |
| M4: `client-delta` шле `scene.system` лише при зміні, `null` = очищення | **Зроблено** комітом b78355102: `lib/utils/battle/pipeline/client-delta.ts:150-154`, `lib/utils/battle/client/apply-delta.ts:122-123`, тести в `pipeline/__tests__/client-delta.test.ts`, `client/__tests__/apply-delta.test.ts` | лише закрити «Борги E2 M4» у `STATUS.md` (контролер) (В2) |
| `SystemUi.battle` обовʼязковий з `HeroPanel`, `ParticipantStats` | `components/systems/types.ts:159-169`: `battle?` з шістьма необовʼязковими слотами wfrp; d20 `battle` не має; КБ показують три core-компоненти за прапорцем `d20Stats` | `battle` обовʼязковий, слоти — за місцем (В1) |
| `turn-flow`: `moraleOutcome` → `system` | `lib/utils/battle/flows/turn-flow.ts:1-22`: фаза `'morale'`, `MoraleOutcome`, імпорт `MoraleCheckResult`; уся логіка кидка — у core `usePlayerTurn.ts:152-208` | нейтральний «гейт ходу» + слот модуля (С2) |
| `store/types.ts` без системних полів | `pendingMoraleCheck` (D9: колонка не перейменовується), `retaliationsUsed`, `spellSlotsCurrent`, `psychologyTested`, `critChoiceByDm` — це **форми зберігання** | не чіпаємо: Ч14/Ч15 (В3) |
| `view/**`: d20-поля через внески UI | `view/hero.ts:312-325` `needsMoraleCheck` (мораль), `view/knowledge.ts` (свідчення КБ — пише й сервер, `store/history.ts`), `slotLevels`/`pactSlot` (читають `useSpellBook`, `build-sheet`) | `needsMoraleCheck` зникає (С2); `knowledge`, `slotLevels` лишаються core (В6) |
| `unitstacks`: кількість у стеку, `scale-units` | модуль — порожня оболонка (рішення Ч8), `scale-units` — core (В3 Ч11) | нічого (В4) |
| `retaliation`: позначка відсічі | лише рядки журналу/підсумку (`view/retaliation.ts`, `LogEntryCard`, `ActionResultCard`) | лишаються core (В5) |
| i18n `meta.i18n.battle` модулів | `systemScope(key, slot)` (`lib/i18n/system-scope.ts:19`) бере `metaOf(key)` — для `homm` це пресет з `i18n: {}`; модулі не враховуються; `systemKeyOfCampaign` (файл Ч16) повертає лише ключ | `systemScope` за композицією + `battleMorale` (С3) |
| M1 Ч8 (клієнт читає `abilities.moraleCap ?? 3`) | `lib/utils/abilities/engine/effects/morale.ts:7`; клієнтський гейт: `usePlayerTurn.ts:51` (`needsMoraleCheck`), `useBattleMapScene.ts:109-122` (`awaitsMoraleCheck`) — обидва без композиції | гейт питає композицію (`combat.turn.startCheck`) (С2) |
| `isFiveE` у читачах | 12 core-файлів (`attack/ability.ts:13` + 11 читачів); `rules` є лише в `attack-phase/request.ts:185` і (ймовірно) у ланцюжку `spell/power.ts:110` | 2 місця + ratchet (В11) |
| `useBattleRules().d20Stats` + `MyHeroPanel` | `useBattleRules.ts:24`; читачі `MyHeroPanel.tsx:53,117,143`, `ParticipantList.tsx:40,57`, `ParticipantDetails.tsx:124,197` | ключ видаляється, `MyHeroPanel` **свідомо змінюється** (С1) |
| множники архетипу, `hero-damage` (хвіст Ч10) | `from-character.ts:442-445,572-575` пише `meleeMultiplier`…`archetypeKey` усім, включно з голим `dnd5e` і wfrp; знімки D12 `participant-{dnd5e,dnd5e+morale,wfrp}.json` їх містять; `hero-damage.ts:37` бере типову таблицю, коли `abilities.heroDice` немає | → Ч15 (В12): перенос міняє D12 |
| M2 Ч10 (сплячий `skillTreeProgress`) | нормалізація можлива лише при вмиканні модуля (шов Ч16) і руйнівна | → Ч16 (В13) |
| M8 Ч10 (запит `progression` до правил) | `components/character-profile/SkillsTab.tsx:34,109` рендерить `pathPanels` із пресету-фолбеку до завантаження правил | гейт `ready` (С4) |
| D15-прогалини (`part11-review.md` M1) | `lib/server/assistant/actions/content-reads.ts:21` (`content.kinds` — усі `KINDS`); `lib/server/content/operation-service.ts:199-205` (`skill-trees.*`), `:220-229` (`content.import-example`, `content.export` → `exportCsv`, `import/export.ts:136`) без `assertKindActive` | гейт `kind-active` (С4) |
| `battle-ops` → власники, боєві хуки wfrp/crit/morale у `useBattleActions` (хвіст Ч11) | `scene.actions` — єдина поверхня мутацій зі спільною обробкою дельт | → Ч17 (В14) |

## Відхилення

- **В1. Слоти за місцем, а не один `HeroPanel`.** `SystemUi.battle` стає обовʼязковим обʼєктом (`battle: SystemBattleUi`), але **кожен слот у ньому необовʼязковий**: відсутній слот = відсутня механіка (правило core, без `() => null` у wfrp/d6pool). Один `HeroPanel` не може стояти в трьох місцях панелі героя без зміни вигляду, тому база дає `HeroStats` (рядок статів), `defense` (текст захисту для рядка списку), `ParticipantStats` (секція картки учасника), а база й модулі — списки `heroPanels`, `badges`, `dialogs`, `notices` і групу `turnStart`. Слот `SystemUi.battleConditionsDialog` переїжджає в `battle.ConditionsDialog`.
- **В2. Вже зроблено:** `attack-flow.system` (Ч5), M4/D10 (b78355102). Перевірити тести, оновити `STATUS.md`.
- **В3. `store/types.ts` не чистимо.** Поля там — форма знімка й колонок; їх переносять у слоти Ч14 (wfrp) і Ч15 (d20/модулі). `pendingMoraleCheck` лишається за D9.
- **В4. `unitstacks` у UI — нічого.** Модуль порожній за рішенням Ч8, `scale-units` — core (В3 Ч11).
- **В5. Відсіч і мораль у журналі/підсумку — core.** Рядки виводяться з журналу (`view/retaliation.ts`, `LogEntryCard`, `ActionResultCard`) і мусять рендеритися для старих боїв навіть після вимкнення модуля (D16). Тексти `battleLog.*` теж лишаються core.
- **В6. `view/knowledge.ts` лишається core.** Це нейтральне «межа захисту зі свідчень атак»; сервер зберігає `summarizeKnowledge` (`store/history.ts`). Показ («КБ між…») — у d20-слотах. `slotLevels`/`pactSlot` мають core-читачів (`useSpellBook`, `build-sheet`).
- **В7. `lib/utils/battle/morale/*` лишається core.** Читачі поза модулем: `abilities/engine/effects/morale.ts`, `scripts/sim/*`, `lib/api/battle-ops.ts` (тип), `turn/act-gate.ts`, `turn/index.ts`, FX-черга. Переїжджає лише те, що втрачає всіх core-читачів: `moraleOutcome` (з `turn-flow`), `moraleTriggerRolls`; `needsMoraleCheck` видаляється (дублював `awaitsMoraleCheck`).
- **В8. FX моралі — core.** Кидок d10 для глядачів (`useBattleFxQueue.ts:37-65`), затримка ударів (`useFxImpacts.ts:35`), синхронізація `morale-dice.ts`, `badge-labels.ts:23` — керуються даними (`pendingMoraleCheck`), тож при вимкненому модулі мовчать. Шар FX → Ч18.
- **В9. Легендарні дії й лігво (DM) — core.** Показ гейтиться даними учасника; `actions/{legendary-options,lair}.ts` лишились у core в Ч6 (читачі UI/заклинань) → Ч17/Ч18.
- **В10. Тексти бази d20 лишаються в core-namespace бою.** База завжди вантажиться для своїх кампаній, виграшу немає. У модульні namespace ідуть лише тексти addon-ів (мораль).
- **В11. `isFiveE` — лише два місця.** `request.ts` (off-hand) і `power.ts` (модифікатор характеристики до шкоди заклинання) — там `rules` у доступі. Решта 10 (`attack/ability`, `attack-reach`, `breakdown`, `hero-damage`, `average`, `attacks-left`, `caster-dice`, `spell-pick`, `spell-costs`, `spell-targeting`) потребують `rules` у клієнтських прогнозах і `scripts/sim` → Ч17. Ріст стопить `LEAK_NAMES.isFiveE`.
- **В12. Множники архетипу й `hero-damage` → Ч15.** Перенос частини учасника в `heroscaling` прибирає `meleeMultiplier`/`archetypeKey` зі знімків D12 голого `dnd5e`/wfrp, а D12 оновлювати заборонено. Ч15 і так змінює форму учасника — там і оновлення D12 за «так» власника.
- **В13. M2 Ч10 → Ч16.** Нормалізація дерева, якщо рівень упав, поки модуль був вимкнений, можлива лише при вмиканні (шов Ч16) і стирає дані (як `levelResets`). Рекомендація для Ч16: при вмиканні `skilltrees` з `confirm` застосувати ту саму `levelResets`-логіку до персонажів, чий рівень нижчий за записаний вузол; текст підтвердження це називає.
- **В14. Мутації модулів у `useBattleActions` (`moraleCheck`, `channel`, `critChoice`, `conditionTest`, …) і `lib/api/battle-ops.ts` — core** → Ч17 (потрібен реєстр дій бою, а не механічний переїзд).
- **В15. `systemKeyOfCampaign` (`lib/server/campaigns/system-key.ts`) — файл Ч16.** Ч12 додає власний `systemOfCampaign` у `lib/server/systems/campaign-system.ts`. Злиття двох читачів → Ч17.

## Контракт `SystemBattleUi` (С1, типи; `components/systems/types.ts`)

```ts
export interface DefenseCtx {
    order: BattleParticipant[];
    log: BattleAction[];
    knowledge?: BattleKnowledge;
    exact: boolean;
}
export interface HeroStatsProps { hero: BattleParticipant; compact: boolean }
export interface ParticipantStatsProps { participant: BattleParticipant; exact: boolean }
export interface HeroPanelProps { hero: BattleParticipant }
export interface BattleBadgeProps { participant: BattleParticipant; place: 'hero' | 'row' }
export type TurnGateOutcome = 'extra' | 'skip' | 'none';           // реекспорт із flows (С2)
export interface TurnGateControls { resolve(outcome: TurnGateOutcome): void; skipTurn(): void }
export interface TurnStartPanelProps { hero: BattleParticipant; gate: TurnGateControls }

export interface SystemBattleUi {
    // база (виключні)
    HeroStats?: ComponentType<HeroStatsProps>;             // рядок HP у MyHeroPanel
    defense?(p: BattleParticipant, ctx: DefenseCtx): string | null; // текст у рядку ParticipantList
    ParticipantStats?: ComponentType<ParticipantStatsProps>;        // секція в ParticipantDetails
    ConditionsDialog?: ComponentType<SystemConditionsDialogProps>;  // був SystemUi.battleConditionsDialog
    RollBody?; RollTitle?; CastTest?; ChannelDialog?; ChannelLabel?; ConditionTestPanel?; // як є
    // база й модулі (списки)
    heroPanels?: readonly ComponentType<HeroPanelProps>[];
    badges?: readonly ComponentType<BattleBadgeProps>[];
    dialogs?: readonly ComponentType[];
    notices?: readonly ComponentType[];
    // модуль (виключна група, задає один addon)
    turnStart?: {
        Panel: ComponentType<TurnStartPanelProps>;
        Label: ComponentType<{ outcome?: TurnGateOutcome }>;
    };
}
// SystemUi: battle: SystemBattleUi (обовʼязковий); battleConditionsDialog — видалити
```

- `composeParts` (`lib/utils/rules/systems/compose.ts:186-235`) уже вміє все потрібне: обʼєкт `battle` зливається вглиб, масиви конкатенуються в порядку композиції, другий addon із `turnStart` кидає «replaces … without a claim». Правок у `composeUi` не потрібно.
- `useSystemBattleUi()` (`components/battle/use-system-battle-ui.ts:5`) → `systemUiOf(rules.system.key, rules.system.modules).battle` з `useBattleSceneData().battle.rules`, тип без `| undefined`. Це закриває хвіст Ч11 «боєві читачі `systemUiOf(key)` без `modules`» (і `DmQuickActionsPanel.tsx:137`).
- `TurnGateOutcome` визначається в `lib/utils/battle/flows/turn-flow.ts` (С2), тип у `types.ts` — `import type`.

## Рішення по сесіях

### С1 — `SystemUi.battle` і внески d20

1. Контракт (вище), d20 `battle: {}`, d6pool `battle: {}`, wfrp: `battleConditionsDialog` → `battle.ConditionsDialog`; `useSystemBattleUi` за композицією.
2. **КБ.** d20 `systems/d20/ui/battle/{HeroStats,ParticipantStats}.tsx` + `defense` (`systems/d20/ui/battle/defense.ts`): точне значення `getEffectiveArmorClass(p, order)`, інакше `formatKnownArmorClass(resolveKnownArmorClass(log, id, knowledge))` — рівно як `ParticipantList.tsx:55-68`. `ParticipantStats` = секція «Броня» з `ParticipantDetails.tsx:197-227` (свідчення). Core: `MyHeroPanel` рендерить `<HeroStats hero compact />` замість `:117-118` і `:143-151`; `ParticipantList` бере `acText = ui.defense?.(p, ctx) ?? null`; `ParticipantDetails` — `<ParticipantStats />`. `useBattleRules().d20Stats` видалити.
3. **Слоти й рятунки від смерті.** `git mv components/battle/hud/SlotGrid.tsx systems/d20/ui/battle/SlotGrid.tsx` (єдиний читач — `MyHeroPanel.tsx:157`; рядок бареля `hud/index.ts:8` прибрати); d20 `heroPanels: [SpellSlotsPanel]` (обгортка: `useBattleRules().spells && <SlotGrid />`). `DeathSavePips` (`ParticipantRow.tsx:55-61`) → `systems/d20/ui/battle/DeathSaveBadge.tsx` у `badges` (рендер лише для `place === 'row'` і `battleData.deathSaves`). Core: `ParticipantRow` рендерить `badges` (`place="row"`) там, де зараз `:200-201`; `MyHeroPanel` — `badges` (`place="hero"`) біля імені й `heroPanels` там, де був `SlotGrid`.
4. **Крит-вибір.** `git mv` `components/battle/crit-choice/{CritChoiceDialog,CritChoiceWaitingBanner}.tsx` → `systems/d20/ui/battle/crit-choice/`, `lib/hooks/battle/useCritChoiceDialog.ts` → `systems/d20/hooks/battle/useCritChoiceDialog.ts` (рядок бареля `lib/hooks/battle/index.ts:41` прибрати; перевір читачів `CritChoiceRow`). Діалог сам викликає хук (без пропа `dialog`). d20 `dialogs: [CritChoiceDialog]`, `notices: [CritChoiceWaitingBanner]`; `BattleScreen.tsx:14-15,145,232,248` рендерить списки на тих самих місцях. `CritWaitingNote` лишається core (читають майстри). Тести `components/battle/crit-choice/__tests__/{CritChoiceDialog,useCritChoiceDialog}` → `systems/d20/__tests__/ui/battle/crit-choice/` (дзеркально; `useSpellBook-crit` тестує core-хук — лишити).

### С2 — мораль у клієнті через модуль; нейтральний `turn-flow` (M1 Ч8)

1. **Перейменування (поведінка ≡).** `turn-flow.ts`: фаза `'morale'` → `'gate'`, `needsMorale` → `gated`, `MORALE_RESULT` → `GATE_RESULT`, `moraleResult` → `gateResult`, `MoraleOutcome` → `TurnGateOutcome`, `MORALE_SKIP_MS` → `TURN_SKIP_MS`; `moraleOutcome()` поки лишається, але переїжджає в кінці С2. Ключ `turnControls.strip.morale` → `strip.gate` (той самий текст). Усі читачі в тому ж коміті.
2. **`combat.turn.startCheck` (M1).** `lib/utils/rules/systems/types.ts` (`RuleSystemTurn`):
   ```ts
   export interface TurnStartCheck {
       /** The current participant must pass the check before acting (server gate parity) */
       due(scope: ActGateScope, participantId: string): boolean;
       /** Outcome of a check the server already resolved, read from the scene's pending payload */
       outcomeOf(pending: unknown, participantId: string): TurnGateOutcome | undefined;
   }
   // RuleSystemTurn: startCheck?: TurnStartCheck
   ```
   (`ActGateScope` уже є: `lib/utils/rules/systems/types.ts:254-258`, той самий скоуп, що отримує `ActGate`; `awaitsMoraleCheck` приймає його надмножину `MoraleScope` без `rules` — сумісно). `systems/morale/index.ts`: `turn.startCheck = { due: awaitsMoraleCheck, outcomeOf }`, де `outcomeOf` = нинішній `moraleOutcome(pending.moraleResult)` для `pending.participantId === id` (новий `systems/morale/rules/turn/outcome.ts`). Клієнт: `usePlayerTurn.ts:48-57` → `gated: !!startCheck?.due(scope, id)`; `:61-68` → `startCheck?.outcomeOf(scene.battle.pendingMoraleCheck, id)`; `useBattleMapScene.ts:109-122` → `startCheck?.due(...)`. `needsMoraleCheck` (`view/hero.ts:312-325`) видалити; `scripts/sim/{balance-library,simulate-battle}.ts` → `awaitsMoraleCheck` (скоуп `{ participants, scene: { turnIndex, pendingMoraleCheck } }`; якщо в сим-скрипті немає `turnIndex` — зупинка й звіт, функцію не видаляти). Тест: учасник легасі-знімка з `moraleCap: 3` і мораллю ≠ 0 у бою голого `dnd5e` → `gated: false`; `homm` і `dnd5e + morale` → `true`; учасник, що вже діяв, → `false` (паритет із сервером, виправлення: раніше після перезавантаження сторінки посеред ходу клієнт просив кидок).
3. **Панель, підпис, бейдж.** `usePlayerTurn` віддає `gate: TurnGateControls` (`resolve` = `GATE_RESULT`; `skipTurn` = нинішній таймер `nextTurn` з `expectedVersion` і `RECOVER`, `usePlayerTurn.ts:190-200`), `rollMorale` видаляється. Модуль: `systems/morale/hooks/useMoraleRoll.ts` (мутація `scene.actions.moraleCheck`, `resolve`, `afterMoraleDice` при FX, показ підсумку, тост «без змін», `skipTurn` для пропуску — порядок як у `usePlayerTurn.ts:152-208`); `systems/morale/ui/battle/{MoralePanel,MoraleLabel,MoraleBadge}.tsx`: панель = блок `MyTurnControls.tsx:191-230` (з `moraleTriggerRolls`), підпис = плитка `ActionGrid.tsx:172-175` і рядок смуги, бейдж = `MyHeroPanel.tsx:97-108` (`place === 'hero'`). `MORALE_MODULE_UI.battle = { turnStart: { Panel, Label }, badges: [MoraleBadge] }`. Core: `MyTurnControls` у фазі `'gate'` рендерить `turnStart?.Panel`; `ActionGrid` — `turnStart?.Label`; смуга фази `'gate'` — `Label` без `outcome` (якщо смуга приймає лише рядок — лишити ключ `strip.gate` і звіт). `moraleOutcome`, `moraleTriggerRolls` переїжджають у `systems/morale/rules/**` (лише якщо core-читачів не лишилось; `morale-trigger-rolls.test.ts` — слідом). `afterMoraleDice` — експорт із бареля `lib/hooks/battle`.
4. **Оверлей підсумку.** `types/battle-scene.ts:16-56`: варіант `{ kind: 'morale-extra' | 'morale-skip'; … }` → нейтральний `{ kind: 'system'; module: string; data: unknown }`; `isActionResult` (`view/result-fx.ts:3-4`) → `fx.kind !== 'system'`. `git mv components/battle/overlays/ResultOverlay.tsx systems/morale/ui/battle/MoraleResultOverlay.tsx` (рендерить лише `fx.kind === 'system' && fx.module === 'morale'`); `MORALE_MODULE_UI.battle.dialogs = [MoraleResultOverlay]`; динамічний імпорт `BattleScreen.tsx:80-84,222` прибрати (оверлей вантажиться через `dialogs`; якщо вага бандла критична — `dynamic` у `systems/morale/ui/index.ts`, як у wfrp). Тест `components/battle/overlays/__tests__/result-overlay.test.tsx` → `systems/morale/__tests__/ui/battle/`.

### С3 — i18n модулів і `isFiveE`

1. **Скоуп за композицією.** `lib/i18n/system-scope.ts`: `systemScope(system: string | { key: string; modules?: readonly string[] } | null, slot)` = обʼєднання `i18n[slot]` мети пресета/бази й **модулів композиції** (`composition(system)` і `moduleMetaOf` з `lib/utils/rules/systems/catalog.ts` — лише імпорт, файл належить Ч16 і не редагується), без дублів, порядок — за композицією. Рядок-ключ лишається для наявних викликачів (`app/campaigns/[id]/layout.tsx` тощо — не чіпати). Новий `lib/server/systems/campaign-system.ts`: `systemOfCampaign = cache(async (id) => …)` — сирий запит `SELECT rules->'system' AS system FROM campaigns WHERE id = …` (як `system-key.ts`), розбір: `key` — рядок або `null`, `modules` — масив рядків або `undefined`. `app/campaigns/[id]/{battles,dm/battles}/layout.tsx` → `systemScope(await systemOfCampaign(id), 'battle')`. Тест `lib/i18n/__tests__/system-scope.test.ts`: `{ key: 'dnd5e' }` без `battleMorale`; `{ key: 'dnd5e', modules: ['morale'] }` і `'homm'` — з ним; `'wfrp'` — `battleWfrp`.
2. **Namespace `battleMorale`.** `messages/{uk,en}/battleMorale.json`: блок `battle.morale.*`, `battle.hero.morale` (→ `badge`), `battle.notify.moraleUnchanged` (→ `unchanged`), `battle.turnControls.strip.gate` (→ `strip`, якщо С2 перевів смугу на `Label`). Видалити ці ключі з `battle.json` (обидві мови). `MORALE_META.i18n = { battle: ['battleMorale'] }`. Модульні компоненти С2 → `useTranslations('battleMorale')`. `lib/i18n/__tests__/scope-size.test.ts`: для кожної бази — додатковий скоуп «база + battle-namespace усіх сумісних addon-ів» з лімітом бази (`budgetKb.battle` або `LIMIT_KB`); тексти `battleLog.*` моралі лишаються core (В5).
3. **`isFiveE` (В11).** `RuleSystemCombat.offHand?(attacker: BattleParticipant): boolean` (d20: `isFiveE`) — `attack-phase/request.ts:185` → `!ruleSystemOf(rules).combat.offHand?.(attacker)`. `RuleSystemMagic.spellAbilityMod?(caster): { mod: number; label: string } | null` (d20: модифікатор як у `power.ts:38-46` для 5e-учасника, інакше `null`) — `spell/power.ts:110` → `input.rules`-хук; якщо `rules` недосяжний у `computeSpellPower` без протягування через >3 файли — зупинка, звіт, лишити. `LEAK_NAMES.isFiveE` = фактичне число core-файлів після сесії.

### С4 — хвости сервера й персонажа

1. **D15** (`part11-review.md` M1): `content.kinds` (`content-reads.ts:21`) — лише види, для яких `isKindActive(kind, actor)`; `content.export`/`content.import-example` (`operation-service.ts:220-229`) — `assertKindActive(kind, actor)` перед викликом; `skill-trees.list|save` (`:199-205`) — `assertKindActive('skills', actor)` (вид `skills` належить тому ж модулю, що й дерева; ідентифікатор модуля в core не називаємо). Тести: голий `dnd5e` — `content.kinds` без `main-skills`/`skills`/`careers`, export `skills` → 404, `skill-trees.list` → 404; `homm` — як є. Імпорт компендіуму (`compendium-import/repository.ts:53-56,533`) і `abilities.sources` — лише якщо `actor` уже в доступі й це ≤ 1 рядок; інакше хвіст Ч17.
2. **M8 Ч10.** `SkillsTab.tsx:34` → `const { system, ready } = useCampaignSystem(…)`; `pathPanels` (`:109`) рендеряться лише при `ready`. Тест: до завантаження правил панелі немає (і запиту `progression` теж).
3. Звіт С4 + підсумкові числа ratchet.

## Порядок комітів (кожен компілюється)

**С1:**
1. `feat(ch12): SystemUi.battle is required and composed per campaign` — типи, `useSystemBattleUi` з `modules`, `ConditionsDialog`, d20/d6pool `battle: {}`, тест композиції списків.
2. `refactor(ch12): armor class in battle comes from the d20 battle UI` — `HeroStats`/`defense`/`ParticipantStats`, `d20Stats` прибрано, тести.
3. `refactor(ch12): spell slots and death saves move to the d20 battle UI` — `git mv SlotGrid`, `heroPanels`, `badges`.
4. `refactor(ch12): crit choice dialog and banner move to the d20 battle UI` — `git mv` + `dialogs`/`notices`.

**С2:**
1. `refactor(ch12): the turn flow speaks of a turn gate` (перейменування).
2. `feat(ch12): the turn-start check comes from the composition (M1)`.
3. `refactor(ch12): morale panel, label and badge come from the morale battle UI`.
4. `refactor(ch12): the morale result overlay is a morale dialog`.

**С3:**
1. `feat(ch12): system i18n scopes follow the composition`.
2. `refactor(ch12): morale battle texts live in battleMorale`.
3. `refactor(ch12): off-hand and spell ability modifier ask the d20 base`.

**С4:**
1. `fix(ch12): D15 covers content kinds, export, import example and skill trees`.
2. `fix(ch12): path panels wait for the campaign rules (M8)`.

## Ratchet після Ч12 (очікування; ріст = стоп)

- `system-imports-exempt.json` = 1 (без змін), `system-literals-exempt.json` — не росте.
- `LEAK_NAMES` += `moraleOutcome: 0`, `moraleTriggerRolls: 0`, `needsMoraleCheck: 0` (кожен — лише коли справді 0), `isFiveE: <факт>` (очікування 10).
- `RULES_SECTION_READERS` без росту (перевір `criticals` після переїзду `useCritChoiceDialog` — він читає `(battle.rules ?? DEFAULT_RULES).criticals`, regex його не бачить; число не зміниться).
- `i18n-exempt.json` без змін.

## Що НЕ робимо в Ч12 (хвости)

- **Ч14/Ч15:** `store/types.ts` (В3); множники архетипу, `hero-damage` (В12).
- **Ч16:** M2 Ч10 (В13); M2 Ч11 (окремий ключ помилки feat↔кар'єра — `api-errors.ts`); M7 Ч11 (миготіння меню — `Header`/`useCampaignRules`).
- **Ч17:** решта `isFiveE` (В11); `battle-ops` і мутації модулів у `useBattleActions` (В14); `systemKeyOfCampaign` + `systemOfCampaign` в один (В15); хвости Ч7 «(а)» (читачі слотів без `rules`: `slot-keys`, `spell-costs`, `view/hero`), «(з)» (`attack/bonus.ts`, `critical.ts`, `crit-threshold.ts`, крит-каталог), M1/M3/M5/M6/M7 Ч7; D15 для компендіуму й `abilities.sources`, якщо С4 їх не взяла.
- **Ч18:** FX моралі (В8), легендарні дії/лігво (В9), `CritWaitingNote`, стан `fx`-черги.
- **Ч19:** M4/M5/M8/M9 Ч11.

## Пастки

- **П1. `ParticipantRow` — `memo` з порівнянням `view.acText`** (`ParticipantRow.tsx:79,95`). У `view` передається **рядок** (`defense`), не `ReactNode`; бейджі рендерить сам рядок із `useSystemBattleUi()`.
- **П2. UI-цикл.** `systems/*/ui/battle/**` може імпортувати примітиви `@/components/battle/hud/*` і `@/components/hud`, але не `@/components/systems` (крім `types`) і не `components/battle/use-system-battle-ui`. Перевір, що `hud`, який імпортує d20-UI, не тягне `use-system-battle-ui`/реєстр (гейт `client-entry-imports`).
- **П3. Обʼєкт `battle` бази мусить існувати** (хоч порожній), інакше результат композиції для голої бази — `undefined`, а тип обовʼязковий.
- **П4. `useReducer(turnFlow, …, init)`** у `usePlayerTurn` рахує `gated` один раз на монтуванні: `startCheck` береться з `scene.battle.rules`, які на монтуванні вже є (сцена завантажена).
- **П5. Порядок «мутація → `resolve` → кубики FX → підсумок → `skipTurn`»** зберегти дослівно; `expectedVersion` фіксується до таймера (`usePlayerTurn.ts:190-191`).
- **П6. i18n.** Модульний namespace вантажиться лише в layout-ах бою; `components/battle/demo/DemoBattleSandbox.tsx` (видно лише сам файл) — перевір, де він рендериться, і чи потрібен там `battleMorale`. Тест ключів (`messages`) вимагає обидві мови.
- **П7. Спільні файли з Ч16** (`lib/__tests__/system-literals.test.ts`, `lib/utils/rules/systems/types.ts`, `messages/*`, `docs/STATUS.md`): правки локальні, без переформатування сусідніх рядків, щоб злиття було тривіальним.
- **П8. Тести компонентів, що тепер звертаються до `systemUiOf`,** тягнуть реєстр UI (холодний імпорт секунди): прогрів у `beforeAll(…, 30_000)` або мок `@/components/battle/use-system-battle-ui`.
- **П9. `DEFAULT_RULES` = `homm`.** Тести «без модуля» явно задають `parseRules({ system: { key: 'dnd5e' } })`.

## Після С4 — контролер (один раз)

- `tsc`; повний `test:run` (під локом важких процесів); eslint по зачеплених теках окремими запусками; контрактні тести (`system-contract`, `systems-index`, `system-literals`, `system-imports`, `client-entry-imports`, `lib/i18n/__tests__/scope-size.test.ts`); `pnpm systems:index` ідемпотентний.
- Sweep (prodcopy `prodcopy_ch12`, за «так»): `srd-5.2`, `heroes-homm`, `grim-d100`, `srd-5.2+morale`, `--out .superpowers/sdd/e2/part12`; очікування ≡ part11 (UI-частина рушія не змінює; С2 змінює лише клієнт і `scripts/sim` гейт моралі).
- Live-run (Sonnet-субагент, порт 3100, JS/текстові перевірки; тестові бої видалити): `srd-5.2`, `heroes-homm`, `grim-d100`, `srd-5.2+morale` × ДМ і гравець × desktop і 375 px. Чекліст: КБ у панелі героя (компакт і повна), у списку (точне / «між»), у картці учасника зі свідченнями; слоти заклинань; рятунки від смерті в рядку; крит-вибір (діалог ДМ, банер гравця); мораль (панель d10, підпис плитки, бейдж біля імені, повноекранний підсумок, пропуск ходу з автопередачею) — є в `heroes-homm` і `srd-5.2+morale`, **немає** в `srd-5.2` і `grim-d100`; wfrp: `ConditionTestPanel`, діалог станів ДМ; тексти моралі без сирих ключів; у голому `dnd5e` мережа не вантажить `battleMorale`; лист героя HOMM: дерево навичок без 404 `progression` на холодному завантаженні.
- `/simplify` (1 агент), Opus-ревʼю, docs: `rule-systems.md` (`SystemUi.battle`, `turn.startCheck`, i18n модулів), `battle.md` (`turn-flow`, оверлей), `STATUS.md` (Ч12 + закрити M4 у «Борги E2»), розділ «Ч12» плану з відхиленнями.

## Питання власнику (рекомендований варіант прийнято, якщо не заперечить)

1. **В1.** Слоти за місцем, усі необовʼязкові, `battle` — обовʼязковий обʼєкт. Прийнято.
2. **В11/В12.** `isFiveE` — 2 місця з 12; множники архетипу і `hero-damage` — у Ч15 через D12. Прийнято.
3. **В13.** M2 Ч10 передається в Ч16 (нормалізація при вмиканні `skilltrees`). Прийнято; контролер передає дизайнеру Ч16.
4. **С2.2 — видима зміна:** після перезавантаження сторінки посеред ходу (вже діяв) гравцеві більше не показується кидок моралі (паритет із сервером). Прийнято.
