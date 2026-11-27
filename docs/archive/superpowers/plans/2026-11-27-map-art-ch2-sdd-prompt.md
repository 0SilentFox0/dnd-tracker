# Промпт для нової сесії: SDD Ч2 (штампи + пайплайн ассетів)

Модель сесії: Sonnet (`/model sonnet`); розмова з власником українською. Робоча тека `/Users/silentfox/Work/dnd-tracker-stamps`, гілка `feat/map-art-ch2`. Головну теку `/Users/silentfox/Work/dnd-tracker` не чіпати.

1. Прочитай `CLAUDE.md`, план `docs/superpowers/plans/2026-11-26-map-art-ch2-stamps.md` (головне джерело; розділи «Рішення плану» й «Відкриті питання»), spec `docs/superpowers/specs/2026-11-26-map-art-ch2-stamps-design.md`, `docs/architecture/README.md`.
2. Скажи «Using subagent-driven-development» і виконай задачі в порядку: 1 → 1b → 2 → 3 → 4 → 5 → (6) → 7. Імплементери — Sonnet; ревʼю по задачах не робити, одне фінальне Opus-ревʼю всієї гілки в Task 7.
3. Агенти пишуть тести, але **не запускають** їх; один повний прогін (`tsc`, `pnpm cycles`, `pnpm lint:dirs --changed main`, `pnpm test:run`) — у Task 7. Коміти: `git add <шляхи>`, трейлер `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
4. **Task 6 (конвертер) заблокована**, поки `fix/map-art-tails` (`../dnd-tracker-mapart`) не злито в `main` і конвертер ground/wallfill не застосовано на проді. Перевір `git log origin/main` на коміти tails; якщо їх немає — пропусти Task 6, зроби Task 7 без неї й запиши хвіст у `docs/STATUS.md`. Якщо є — `git rebase origin/main` перед Task 6.
5. Перед Task 6 спитай власника: (1) read-only підрахунок карт із шаром `objects` на проді — так/ні; (2) запечені карти за замовчуванням пропускати (рекомендація) чи `--include-baked`. Прод `--apply` — лише за окремим «так», після резервної копії й деплою Ч2.
6. Task 5 Step 5 (пілотна генерація аркушів) робить власник — не чекати на неї, фіча працює на 35 наявних об'єктах.
7. Живий прогін (Task 7 Step 3) — субагентом Sonnet на `next build && next start`, локальна БД prodcopy й battle-sweep — лише за «так»; власник логіниться в Chrome розширення сам.
8. Контекст ~150k — зупинись, онови `docs/STATUS.md` + пам'ять і дай промпт на продовження. Merge у `main` — лише за рішенням власника.
