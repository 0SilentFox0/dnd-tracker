# Ч12 С1 — звіт

Статус: DONE.

## Коміти
- f8f64f051 feat(ch12): SystemUi.battle is required and composed per campaign
- 5cdb4e082 refactor(ch12): armor class in battle comes from the d20 battle UI
- a6c5e84e3 refactor(ch12): spell slots and death saves move to the d20 battle UI
- 816633409 refactor(ch12): crit choice dialog and banner move to the d20 battle UI

## Слоти
| слот | компонент | місце рендеру в core |
|---|---|---|
| `HeroStats` | d20 `ui/battle/HeroStats` | `MyHeroPanel` (компакт і повний) |
| `defense` | d20 `ui/battle/defense` | `ParticipantList` -> `view.acText` (рядок) |
| `ParticipantStats` | d20 `ui/battle/ParticipantStats` | `ParticipantDetails` |
| `heroPanels` | d20 `SpellSlotsPanel` (-> `SlotGrid`) | `MyHeroPanel` (`!compact`) |
| `badges` | d20 `DeathSaveBadge` (`place === 'row'`) | `ParticipantRow` (через проп `badges`), `MyHeroPanel` (`place="hero"`) |
| `dialogs` | d20 `CritChoiceDialog` | `BattleScreen` |
| `notices` | d20 `CritChoiceWaitingBanner` | `BattleScreen` (стек сповіщень) |
| `ConditionsDialog` | wfrp (раніше `battleConditionsDialog`) | `DmQuickActionsPanel` |

## Відхилення від дизайну
- `ParticipantRow` не викликає `useSystemBattleUi()`: хук читає `BattleSceneDataContext`, що змінюється з кожною дельтою, і `memo` рядка втратив би сенс (П1). `ParticipantList` бере `badges` зі слота й передає пропом (`badges?: SystemBattleUi['badges']`, порівнюється за посиланням у `sameProps`). `acText` лишається рядком.
- `Section` винесено в `components/battle/participants/Section.tsx` (читачі: `ParticipantDetails`, d20 `ParticipantStats`).
- `Pips` перенесено разом із `DeathSaveBadge` (інших читачів не було).
- `systems:index` повторно: без змін (нова тека `systems/d20/hooks` індексу не потребує).
- `CritWaitingNote` лишився в `components/battle/crit-choice/`.

MyHeroPanel змінено свідомо: КБ через слот `HeroStats`; слоти заклинань через `heroPanels`; бейджі `place="hero"`; `?.` у `useSystemBattleUi()` прибрано.

## Тести
Нові: `components/systems/__tests__/battle-compose.test.ts` (3), `systems/d20/__tests__/ui/battle/{defense.test.ts (3), hero-stats.test.tsx (2), slot-grid.test.tsx (1)}`, `components/battle/participants/__tests__/system-battle-slots.test.tsx` (2: піпси лише в d20, SlotGrid у MyHeroPanel).
Перенесено: `systems/d20/__tests__/ui/battle/crit-choice/CritChoiceDialog.test.tsx` (хук замокано, діалог без пропа), `systems/d20/__tests__/hooks/battle/useCritChoiceDialog.test.tsx`.
Оновлено: `registry.test.tsx` (wfrp-слоти з `ConditionsDialog`, d20 без wfrp-слотів), `use-battle-rules.test.tsx` (без `d20Stats`), `hud-primitives.test.tsx` (без SlotGrid), моки `useSystemBattleUi` повертають `{}`.
Точково запущено (під локом): усі файли вище, `rule-system-flags`, `components/battle/participants`, `components/battle/scene` (render-count), `client-entry-imports`, `system-imports`, `system-literals`, `useSpellBook-crit` — усі зелені. `tsc --noEmit` чистий.

## Ratchet
`system-imports-exempt.json`, `system-literals-exempt.json`, `LEAK_NAMES`, `RULES_SECTION_READERS` — без змін. Нових `@/systems/*` у core немає (залишились лише наявні в `scripts/templates/systems/**`).

## Хвости
- `d20Stats` лишився як локальна змінна в `DmCharacterCard`, `CombatTab` (персонажі, не бій).
