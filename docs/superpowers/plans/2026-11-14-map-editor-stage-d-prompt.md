Контекст: репо /Users/silentfox/Work/dnd-tracker. Робоча гілка feat/map-editor-w (worktree ../dnd-tracker-map-editor-w; node_modules там — симлінк на ../dnd-tracker-map-editor/node_modules). У ній: етапи A, B (B1–B6 двері), 0, 0b, хвости P1–P3 (edge-break/restore + логування і знімки з mapStateChanged, перепривʼязка бібліотечної карти в prepared-бою, фон/калібрування/hazard у редакторі бібліотеки). Усе НЕ запушено і НЕ змерджено в main (merge лише за явним «так»). Пам'ять: project-map-editor-0b.md, project-map-editor-stage-a.md; docs/STATUS.md (секції 0/0b/B6), docs/architecture/map-modes.md і battle.md; план docs/superpowers/plans/2026-11-13-map-editor.md (етап D, камера C).

Завдання: етап D — рендер сітки для великих карт (feature flag). За планом:
- Spike 2 (профілювання поточного рендера 60×60, 100×100, 200×200) — результат у docs/superpowers/research/.
- `GridLayer`: один path/pattern замість клітинка=елемент, делегований pointer, рендер лише клітинок з позначками, культинг за камерою; memo `zoneCells`.
- FX-контракт: `[data-fx-grid]` + геометричний `cellPoint` в `fx/runtime/anchors.ts` + тести (DOM-контракт `data-fx-*` зберегти).
- Аудиторські виправлення: cap `moveBudget`, `outOfRangeMarks`, кільцевий `cellsByDistance`/`nearestStandable`, кеш `hazardCells`, `playableBounds`, чанковий/інкрементальний terrain.
- Профілювання до/після; зняти ліміт розстановки `battleMaxSide = 60` лише під флагом (MAP_LIMITS: фото-карти ≤ 60×60, тайлові ≤ 200×200).
Перший крок: brainstorming + reuse-пошук (CLAUDE.md), spec і лаконічний план (Opus, підагентом), далі SDD: Sonnet-виконавці без рев'ю по задачах, одне Opus-рев'ю наприкінці.

Обмеження: не пушити; міграції 20261202000000_battle_map_storage і 20261203000000_map_library_flag на prod не застосовувати (їдуть із деплоєм). Живі прогони у Chrome: dev на окремому порту (3010+) з env із /Users/silentfox/Work/dnd-tracker/.env.local і DATABASE_URL на prodcopy_merge0b, НЕ `pkill -f next-server`; субагенти не мають браузерних інструментів — браузер веди з основного сеансу. Тести: test:changed/test:related, повний test:run один раз наприкінці; eslint лише по змінених файлах. Prisma-клієнт у спільному node_modules може бути застарілим (tsc дає mapLibraryEnabled) — перед tsc/sweep спитати «так» на `prisma generate`. Мова — українська; на ~150k контексту стоп і новий промпт; наприкінці нагадати про /usage.

Перед D: перевір, що живий прогін P1–P4 пройдено (чек-листи в docs/STATUS.md) і повні гейти (tsc, test:run, battle-sweep з mapDoorsCheck на prodcopy, repo-wide eslint один раз) зелені; без них D не починати.
