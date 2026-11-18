# S5: systems/wfrp (main d871500da)

## 1. Оцінки
| Критерій | Було | Зараз | Причина |
|---|---|---|---|
| Якість коду (wfrp) | ~7 | 7.5 | 263 src-файли, 20 544 LOC (тести 145 файлів, 23 346 LOC, співвідношення 1.14). 7 кастів `as unknown as`, 0 `any`, 5 `eslint-disable`. Один файл >500 рядків (downtime-handler 542); решта ≤357. |
| Перевикористання (wfrp<->d20) | 4-5 | 7 | Великі клони зникли, див. п.2. |
| UI-kit | 4 | 8 | 0 сирих `<button|input|select|img|textarea>` у `systems/wfrp` (rg). Єдиний запис у `raw-controls-exempt.json` — `ui/spells/SpellMagicFields.tsx`, пояснений як артефакт ESLint. 53 файли беруть core-kit. |
| Контракт / d6pool | 8 | 8.5 | `system-contract.test.ts` і `d6pool-battle.test.ts` перевіряють wfrp (`SYSTEM_SERVER.wfrp.operations`, `RULE_SYSTEM_REGISTRY.wfrp`). Заглушки combat прибрано (L9a-2b, `actionsOf`/`reactionsOf` з null-object). |
| Тести | ~6 | 7 | Покриття wfrp не виміряно (див. п.4). За іменами 25+ файлів `server/`, `hooks/`, `api/` без парного тесту. |

## 2. Що змінилось і зараз (докази)
- З ~19 однойменних файлів wfrp/d20 нині ідентичного копіпасту немає. Різниця рядків між файлами: `ui/StatsTab` 39 vs 176, `rules/state` 34 vs 143, `rules/sections` 42 vs 125. Тобто це різна логіка під спільним інтерфейсом, а не клони.
- Подібні за розміром `rules/conditions/apply.ts` (235/232) і `ui/UnitStatsFields` (31/32) мають 369 і 41 різних рядків, тож теж не дублікати.
- Решта збігів — шов `index.ts`/`meta.ts`/`server/index.ts`/`ui/index.ts`, де однакові імена очікувані.
- Дубль з L6-1, що був справжнім, винесено в `character-profile/RollableCell`. Він є в kit-списку `SYSTEM_UI_KIT` (`docs/architecture/ui-layers.md`).
- wfrp імпортує kit-компоненти (`ProfileContext`, `RollableCell`, `CombatRow`): MagicTab, AdvancementTab, CharacteristicsGrid, StatsTab, HeroStats, DowntimeTab, CorruptionBlock.
- `DowntimePeriodPanel` і `GrantCorruptionDialog` стоять на спільному `common/UndoableResultDialog` (L6-2).
- `downtime-handler` розбито (L7-6): `passPeriod` (рядки 339-386) і `undoPeriod` (509-542) — це конвеєри з малих функцій (`loadCareerStatuses`, `periodHeroes`, `gainPeriodIncomes`, `persistPeriod`, `checkUndoable`, `refundPeriodIncomes`, `restoredHeroes`, `persistUndo`). Найдовша функція ~50 рядків, `setDowntime` (138-224) ~85.
- `useWfrpDraftForm` розбито (L7b): 258 рядків, тобто <300.
- Критерій плану «0 клонів ≥12 рядків у wfrp» виконано за вибірковою перевіркою diff. Повний клон-сканер я не запускав.

## 3. Відкриті дефекти
- **I** `systems/wfrp/server/downtime-handler.ts` 542 рядки, імпортує `prisma` напряму, змішує доступ до БД, пересчіт стеша й лог. Немає прямого юніт-тесту (є лише `__tests__/lib/server/characters/wfrp-downtime-e2e.test.ts`). Виправлення: розбити на `downtime/{load,persist,income}.ts` і додати тести на `undoPeriod` (відкат, ідемпотентність).
- **I** Без парного тесту (за іменем): `server/advance-handler.ts` (197), `corruption-handler.ts` (160), `career-handler.ts` (147), `draft/create-wfrp-draft.ts` (135), `content/refs.ts` (126), `hooks/useWfrpDraftRolls.ts` (160), `useWfrpDraftPicks.ts` (128). Частину можуть покривати e2e-тести під іншими іменами. Виправлення: окремий тест на handler.
- **M** Функції >130 рядків лишилися в UI й rules. Ліміт плану (150) стосується `lib/server`, тому формально не порушений. Вибірка:
  - `ui/AdvancementTab.tsx:33` (163), `rules/combat/resolve-attack.ts:176` (162) — рядки з «функціями» одним проходом regex, межі підтверджено не всюди;
  - `ui/downtime/EndeavourPicker.tsx:65` (153), `ui/careers/CareerTierFields.tsx:55` (147), `rules/downtime/plan-period.ts:112` (145).
  Виправлення: винести під-блоки в компоненти.
- **M** Касти `as unknown as` (7), майже всі в `rules/slots.ts:48,53,65,69` (парсинг `ext` слота) та `index.ts:88`, `rules/traits/recipes.ts:39`, `rules/downtime/read.ts:178` (`PeriodSnapshot`). Виправлення: Zod-guard/`isRecord`-парсер замість каста; для `read.ts` — схема snapshot.
- **M** `rules/tables/defaults.ts` 357 рядків: це дані, не проблема. `ui/creation/SpeciesProfileEditor.tsx` 264, близько до межі.

## 4. Не перевірено
- Покриття `systems/**` у відсотках (ціль ≥80%): тести не запускались, порогу по системі не знаю. Парність тестів оцінено лише за іменами файлів.
- Вимірювання довжин функцій — наближене (regex-евристика), межі фрагментів можуть бути неточними.
- Дублювання з d20 для підкаталогів, яких немає в d20 з тими ж іменами (наприклад ui/downtime, ui/careers), не порівнювалось із `components/`; клон-сканер jscpd не запускався.
- Чи складається wfrp-composition з модулями d20 (morale, lair тощо) — не перевіряв.
