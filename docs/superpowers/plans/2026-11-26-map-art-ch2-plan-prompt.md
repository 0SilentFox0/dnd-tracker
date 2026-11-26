# Промпт для нової сесії: план Ч2 (штампи + пайплайн ассетів)

Робоча тека `/Users/silentfox/Work/dnd-tracker-stamps`, гілка `feat/map-art-ch2` (від origin/main cd5701cd6). Рекомендована модель: Opus (план), далі Sonnet для виконання.

1. Прочитай `CLAUDE.md`, `docs/superpowers/specs/2026-11-26-map-art-ch2-stamps-design.md` (затверджений власником), епік `2026-11-26-map-art-epic-design.md`, `docs/architecture/README.md`.
2. Скажи «Using writing-plans» і напиши план у `docs/superpowers/plans/2026-11-26-map-art-ch2-stamps.md` за порядком spec §14. Сигнатури, тест-кейси й рішення, повний код лише де неочевидно (без багатотисячних планів).
3. Перед планом переглянь `git worktree list` і гілку `fix/map-art-tails`: порядок змін `scripts/maps/convert-tiles-to-art.ts` (spec §9) і read-only підрахунок мап з шаром `objects` на проді (лише за «так» власника).
4. Дай план власнику на перегляд і вибір методу виконання (SDD у свіжій сесії на Sonnet). Тести агенти не запускають; один повний прогін у кінці частини.
