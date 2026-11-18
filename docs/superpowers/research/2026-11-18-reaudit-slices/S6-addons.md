# S6: addon-модулі (main d871500da)

Вимірювання: wc/rg, тести не запускались. LOC = нетестові .ts/.tsx у `systems/<m>/`; тести = файли/LOC у `__tests__`.

## Таблиця

| модуль | LOC / тести | composition-тест | при вимкненні | залишки в ядрі |
|---|---|---|---|---|
| artifactsets | 1396 / 9 ф., 1519 | немає власного; `module-disable`, `module-battle-matrix` | dmSections + contentKinds закриті (`catalog`, `module-disable.test.ts`); сторінки під `dmSectionLayout` | `lib/api/artifact-sets.ts`, `lib/hooks/artifact-sets/*`, `lib/constants/source-sync.ts`, `app/campaigns/[id]/dm/artifact-sets` (UI-споживачі в ядрі, гейт на рівні layout/kind) |
| deathsaves | 579 / 7 ф., 7061 (golden) | є | `claims combat.onZeroHp`; `ext.deathsaves` лишається в d20 `state.ts:35-55` | `systems/d20/rules/state.ts` знає `ext.deathsaves` |
| heroscaling | 324 / 6 ф., 440 | немає (`module-battle-matrix:173` порівнює d20 з/без) | `claims progression.maxHp`, кубики рівнів лише з модуля | `lib/hooks/campaigns/useRulesForm.ts`, `defaults.ts`, `section-shapes.ts` |
| inspiration | 50 / 2 ф., 164 | є | `inspirationOn()` (`lib/utils/rules/inspiration-on.ts:6`) гейтить route/set | route `characters/[id]/inspiration`, `OutOfCombatSection`, `DmRestActions`, `RollStep`, `DmCharacterCard`, `d20/state.ts` (`ext.inspiration`), колонка `character.inspiration` |
| lair | 256 / 2 ф., 169 | є | `lairOf(rules)` у `legendary-mutation.ts:192`; стан `ext.lair` + fallback `battleData.lair` (`lair/rules/state.ts:50`) | `types/battle.ts:275` kind `'lair'`, `LimitsSection.tsx:84`, `useLegendaryAction.ts:134`, `actions/schema.ts:12`, `abilities/schema/ability.ts:273` (поле `limits.lair`) |
| morale | 1495 / 20 ф., 1839 | немає `composition.test.ts`; є `module.test.ts` + matrix | хуки turn.* / participant.fromCharacter відсутні; `ext.morale` у scene-слоті | `combatStats.morale/moraleCap` у типах та `participant-patch.ts`, `lib/schemas/units.ts`, `abilities/schema` (stat 'morale'), `sheet-bonuses.ts`, `build-sheet.ts`, `log/codec.ts`, `fx/dice/from-action.ts`; `scripts/db/*pending-morale*` |
| offhand | 51 / 2 ф., 142 | є | `combat.offHand?.` optional (`off-hand.ts`) | `offHand` прапор у `attack-flow.ts`, `schemas/battles.ts`, `attack-mutation.ts`, `weapon-slot.ts`, `MyTurnControls`, `AttackWizard`, `useInventory` |
| opportunity | 299 / 5 ф., 537 | є | claim-less; `after` для retaliation | `server-attack.ts:25-26` (actionType), `types-combat/types-turn` |
| retaliation | 224 / 4 ф., 447 | є | `after:['opportunity']` | `counter-strike.ts` (label 'retaliation' :131), `view/retaliation.ts`, `ActionResultCard`, `LogEntryCard`, `constants/battle.ts:80`, `types/battle-actions.ts:62` |
| skilltrees | 6096 / 36 ф., 4430 | немає; `module-disable`, `system-surface` | sections/kinds закриті; `lib/server/content/kind-active.ts` гейтить CRUD за kind | `lib/api/skill-trees.ts`, `app/api/campaigns/[id]/skill-trees/route.ts`, `lib/hooks/skills/*`, `lib/schemas/skills.ts`, `source-sync.ts`, `lib/server/templates/*`, `assistant/actions/content-*`, `battles/participant/load-character-context.ts`, `start-build-context.ts` |
| unitstacks | 14 / 1 ф., 38 | є | нічого не змінюється: `defineAddon(() => ({}))` | лише реєстри та `homm/meta.ts:16` |

## Оцінки (S6)
- Модульність аддонів: **6.5** (було 5). Є meta/registry/composition, `module-disable`/`subsets`/`battle-matrix`, hooks-через-слоти, lair/morale перенесені в `ext` з fallback. Мінус: великі шматки домену лишились у ядрі (skilltrees/artifactsets API+hooks, morale-статистики, offhand-прапор).
- Покриття тестами аддонів: **7**. Усі мають тести; 4 з 11 без власного composition-тесту (artifactsets, heroscaling, morale, skilltrees), закриті спільними матрицями.

## Що змінилось з 17.11
Lair перенесено в `systems/lair` (`ext.lair`, 02700bc42); morale `pendingMoraleCheck` -> `ext.morale` з upgrade-on-read (2a0b9881b); retaliation/opportunity action items у модулях; додано `module-disable`, `system-module-subsets`, `module-battle-matrix`, `system-surface` тести (b4c485cf7); `kind-active.ts` гейтить content CRUD.

## Дефекти
- I: **unitstacks порожня оболонка** `systems/unitstacks/index.ts:4` (`() => ({})`), але `meta.ts` заявляє `claims: ['combat.hitModel.damage']` без жодної реалізації; docs (`rule-systems.md:12,161`) стверджують, що він обгортає скаляр. Реалізувати або видалити з реєстру/homm-пресету.
- M: skill-trees route (app/api/campaigns/[id]/skill-trees/route.ts:9) йде через operationRoute; гейт за kind імовірно в operation-service.ts:36 (kind-active), рантаймом не підтверджено.
- I: core `lib/api|hooks` для skill-trees/artifact-sets і `lib/server/templates`, `assistant/actions/content-*` називають модульні домени; перенести в `systems/*/api|hooks`.
- M: `systems/d20/rules/state.ts:35-55` знає ключі `ext.deathsaves/inspiration/offhand` модулів (d20 як база читає стан аддонів).
- M: `LimitsSection.tsx:84`, `types/battle.ts:275`, `actions/schema.ts:12`: `'lair'` як ядровий literal (у `system-surface-exempt.json`).
- M: `heroscaling`, `morale`, `artifactsets`, `skilltrees` без `composition.test.ts` (діє shared matrix).
- M: morale `index.ts` відступи не відформатовані (`startCheck` блок).

## Не перевірено
Runtime-поведінка при вимкненні (тести не запускались); чи гейтить `offhand`/`opportunity` UI слоти фактично (лише по коду); повний перелік `system-surface-exempt.json` (обрізано); використання `ext[...]` у scripts/db.
