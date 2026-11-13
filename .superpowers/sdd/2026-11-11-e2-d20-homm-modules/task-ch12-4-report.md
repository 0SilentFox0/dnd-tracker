# Ч12 С4 — звіт

Статус: DONE (2 коміти, tsc чистий).

## Коміти
- e638220a2 fix(ch12): D15 covers content kinds, export, import example and skill trees
- 9f4fd6605 fix(ch12): path panels wait for the campaign rules (M8)

## D15
- `content.kinds` (`content-reads.ts`): `execute(caller)` фільтрує `KINDS` через `isKindActive(kind, caller.actor)`.
- `operation-service.ts`: `assertKindActive(kindOf(input.kind), actor)` для `content.export`, `content.import-example`; `assertKindActive('skills', actor)` для `skill-trees.list|save` (`skills` належить модулю skilltrees; ідентифікатор модуля в core не названо).
- Не взято (хвіст Ч17): `abilities.sources` (потребує фільтра по багатьох видах), імпорт компендіуму `lib/server/compendium-import/repository.ts` (не лише один виклик гейта).
- Тест `lib/server/content/__tests__/kind-active-gaps.test.ts` (голий dnd5e: kinds без main-skills/skills/artifact-sets/careers; export/import-example/skill-trees.list -> 404; homm проходить; core-вид проходить). `content-actions.test.ts` мокає `kind-active` (інакше йшов у БД).

## M8
`SkillsTab`: `const { system, ready }`, `pathPanels` лише при `ready`. Тест `skills-tab-path-panels.test.tsx` (без даних — немає; homm — є; dnd5e — немає); `skills-tab-map.test.tsx` тепер віддає правила homm.

## Тести
Точково під локом: `lib/server/content`, `lib/server/assistant`, `components/character-profile` — зелені. Повного прогону не було.

## tsc
`pnpm exec tsc --noEmit` — без помилок (після останнього коміту).

## Підсумок Ч12 (С1–С4)
- Ratchet: `system-imports-exempt.json` 6 і `system-literals-exempt.json` 16 — без росту відносно 85cb90883 (diff порожній); `i18n-exempt.json` без змін. `LEAK_NAMES` додано: `moraleOutcome: 0`, `moraleTriggerRolls: 0`, `needsMoraleCheck: 0` (С2), `isFiveE: 10` (С3).
- `rg "@/systems/" app lib components types scripts -g '!**/__tests__/**'`: збіги лише в згенерованих коренях і наявних шляхах (registry, `scripts/templates/systems/*`, `lib/utils/abilities/*`, `lib/utils/rules/systems/*`, `system-specs`, `systems-index`); нових немає.
- Хвости: решта `isFiveE` (10 файлів) і `systemKeyOfCampaign`+`systemOfCampaign` в один, `battle-ops`/мутації модулів у `useBattleActions` (В14), D15 для компендіуму й `abilities.sources` — Ч17; ефекти моралі у FX (`useBattleFxQueue` тощо), `effectiveMorale`/`awaitsMoraleCheck` лишаються core (В5/В7/В8); ключ `battleLog.*` моралі — core. Хвости С1/С2 — у `task-ch12-{1,2}-report.md`.
- Видима зміна (С2): панель моралі не показується після перезавантаження посеред ходу, коли учасник уже діяв.
