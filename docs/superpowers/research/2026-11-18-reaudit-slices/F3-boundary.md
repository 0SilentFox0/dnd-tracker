# F3: межа CORE<->SYSTEMS, реєстр, ratchet-и (main d871500da)

## 1. Оцінки

| Критерій | Було | Зараз | Причина |
|---|---|---|---|
| Модульність core<->systems | 5 | **6.5** | Логіку morale/lair/skilltrees/artifactsets винесено, стан у `ext.*`, імпортів `@/systems/*` поза коренями 0, wfrp/homm/dnd5e у core чисті. Але ціль «0 назв модулів у core» не виконана: сотні згадок, схема, messages, сторінки. |
| Маніфест / реєстр | 8 | **8** | `requires/conflicts/claims/after` валідуються, є матриця композицій і фікстура d6pool. Контракт сам називає модулі (`lair`, `inspiration`, `offHand`), `unitstacks` порожній. |
| Ratchet-и | 5 | **7** | props-budget 24 -> 5 (ціль виконана), нові surface/raw-controls/cyrillic baseline-и, перевірки двосторонні. `system-literals-exempt` = 5 (ціль <= 2 не виконана, без змін), сканер має сліпі зони, CI немає. |

## 2. Що змінилось з 2026-11-17 (перевірено в коді)

- `systems/**` + `lib/utils/rules/systems`: 235 файлів, +11765/-2523. `systems/morale` 1495 рядків, `skilltrees` 6096, `artifactsets` 1396, `lair` 256.
- `system-imports-exempt.json`, `ui-layers-exempt.json`, `import-cycles-baseline.json` = `[]` (як і було).
- `props-budget-exempt.json`: 24 записи (сума 208) -> 5 записів (9, 9, 10, 10, 12); ліміт 7, сканує `components` + `systems`.
- Новий `system-surface-exempt.json` (`scripts/shared/system-ratchet.ts:263-369`, тест `lib/__tests__/system-surface.test.ts`): code 57 файлів / 77 влучань, schema 18, messages 34.
- Нові тести: `module-disable.test.ts` (skilltrees/artifactsets: секції, content kinds, gate сторінок), `system-module-subsets.test.ts` (усі валідні пари, «всі без одного», маски), `module-battle-matrix.test.ts`, `module-toggle-d16.test.ts`.
- `scanModuleQueries` у core = `{}` (немає `modules.includes('x')`, `ext.x`).
- `raw-controls-exempt.json` 3 файли / 3; `cyrillic-comments-exempt.json` 4 файли / 9; `i18n-exempt.json` 11 glob-ів (без змін).

## 3. Відкриті дефекти

**I1. Ціль «0 назв модулів у core» не досягнута.** rg по `lib components app types` без тестів і коренів: morale 62 файли / 112, artifactSet 48 / 127, skillTree 32 / 81, inspiration 48 / 158, lair 25 / 68 (ціле слово), offHand 20 / 61, retaliation 21 / 51. Приклади: `lib/utils/rules/defaults.ts:6,16,29,41`, `lib/utils/rules/section-shapes.ts:31,48,65,87`, `lib/utils/rules/inspiration-on.ts:5`, `lib/schemas/battles.ts:388` (`moraleCheckSchema`), `lib/utils/battle/turn/act-gate.ts:44` (`skipMorale`), `lib/constants/api-errors.ts:86,398`, `lib/utils/abilities/build/bake.ts:55`, `lib/utils/battle/attack/{inspiration,off-hand}.ts`, `lib/utils/battle/death-saves/`. Фікс: секції правил і схеми операцій у модуль через реєстр секцій; `morale` як стат у `StatColumnsPart`.

**I2. Сторінки й API модулів у core.** `app/campaigns/[id]/dm/{skill-trees,artifact-sets}`, `app/api/campaigns/[id]/{skill-trees,artifact-sets}`, `app/api/.../characters/[characterId]/inspiration`, `lib/api/{skill-trees,artifact-sets}.ts`, `lib/hooks/artifact-sets`, `types/{skill-tree,artifact-sets}.ts`, `messages/en/skillTree.json`. Вони лише закриті gate-ом (`module-disable.test.ts:9-15`), а не належать модулю. Фікс: `dm/system/[section]` + `system/[action]`, які вже існують.

**I3. Сканер літералів не бачить аддони.** `system-ratchet.ts:73-75`: для `kind === 'addon'` береться `m.keys`, а вони всюди `[]`; id аддона ловить лише surface-сканер із 5 шаблонів (`:263-281`). Не ловляться: `=== 'morale'` (зафіксовано як 0 у `system-literals.test.ts:281`), елементи масивів (`lib/utils/abilities/schema/kinds.ts:75,90`), ідентифікатори (`moraleCheck`, `skipMorale`), і все camelCase: id `skilltrees/artifactsets/deathsaves/heroscaling/offhand` порівнюються з урахуванням регістру, тож `skillTree`, `artifactSets`, `deathSaves`, `offHand` у коді невидимі. Фікс: `aliases` у meta + регістронезалежний пошук підрядка з baseline.

**I4. `system-literals-exempt` = 5 при цілі <= 2**, склад ідентичний 155874c7d. 4 з 5 записів не є назвою системи (`'d20'` як кубик/бренд: `lib/constants/site.ts:14`, `lib/utils/battle/log/codec.ts:47`, `types/characters.ts:449`, `SheetRollDialog.tsx:77`); справжній витік один: `lib/utils/rules/defaults.ts:52`. Фікс: перейменувати `kind: 'd20'` на `'check'` або дати сканеру allow-коментар.

**I5. Схема і messages лише заморожені.** 18 колонок/моделей (`BattleScene.pendingMoraleCheck`, `Character.inspiration`, `model SkillTree` ...) і 34 ключі в allowlist. Сканер messages бере тільки `en`, тільки точний збіг останнього сегмента (`:330-352`): мій підрахунок ключів, що містять назву модуля, дає 110 у 21 core-namespace; імена файлів-namespace не перевіряються.

**I6. CI відсутній** (`.github` немає): усі ratchet-и живуть лише в локальному `test:run`.

**M1.** Слоти контракту названі за модулями: `types-combat.ts:183,192,230,287-301`, `components/systems/types.ts:269` (`artifactSets`), `lib/server/systems/types.ts:101` (`skillTreeProgress`).
**M2.** `systems/unitstacks/index.ts` = `defineAddon(() => ({}))`, але meta заявляє `claims: ['combat.hitModel.damage']`: claim без реалізації.
**M3.** База `systems/d20` називає аддони (inspiration 26, opportunity 10, deathsave 9 влучань).
**M4.** Обхід масок у `system-module-subsets.test.ts:87` з кроком 7 і стелею 8 модулів з 11: покриття вибіркове.
**M5.** Файлів `composition*.test` немає в morale, skilltrees, artifactsets, heroscaling (покриті лише спільними матрицями).

## 4. Що не перевірено

- Тести, eslint і tsc не запускались: чи зелені ratchet-тести на HEAD, беру з журналу (хвиля 3).
- Реальне вимкнення модуля в браузері та бекфіли `ext.*` на проді.
- `ui-layers` і `raw-controls` правила не аудитовані на сліпі зони, лише розмір baseline.
- rg-підрахунки включають коментарі та i18n-ключі, тому це верхня межа.
