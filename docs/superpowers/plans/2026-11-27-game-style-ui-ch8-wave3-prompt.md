# Промпт для нової сесії: Ч8, хвиля 3 (D-C: «Показ» і «Сценарій»)

Рекомендована модель головної сесії: Sonnet (лише оркестрація); виконавці — Sonnet у фоні.

Працюй у /Users/silentfox/Work/dnd-tracker-ch8 (гілка feat/game-ui-ch8, хвилі 1 і 2 злиті, tip e561adf4b, у main не злито). Виконуй хвилю 3 за docs/superpowers/plans/2026-11-26-game-style-ui-ch8-waves.md (розділ 9, смуги C1–C4; порядок злиття C2, C1, C4, C3; C3 стартує після T3.5 з C2). Рішення власника R1–R17 діють. Прочитай пам'ять: project-ch8-wave2, project-ch8-wave1, project-game-ui-ch8, feedback-token-economy, feedback-context-150k, feedback-tests-premerge-only, feedback-browser-live-check.

Правила хвилі:
- Смуги в окремих worktree ../dnd-tracker-ch8-<lane> (c1..c4), гілки feat/game-ui-ch8-<lane>, node_modules — симлінк на /Users/silentfox/Work/dnd-tracker-ch8/node_modules. Виконавці Sonnet у фоні; тести не запускають (лише eslint --fix по своїх файлах, tsc з NODE_OPTIONS=--max-old-space-size=10000, pnpm cycles).
- C1 додає залежність @dnd-kit: після неї потрібен pnpm install --frozen-lockfile-сумісний lockfile; node_modules-симлінк не перевстановлювати в worktree, а інсталювати в основному ch8 після злиття.
- R7: з lib/server дозволено лише два файли (list-cards.ts, thumb у library-service.ts) — уже використані; нові правки lib/server — лише з дозволу власника. R15: WFRP-прогін поза обсягом, живий прогін на d20/HOMM5.
- Після злиття смуг: tsc, pnpm cycles, pnpm lint:dirs --changed main; потім NODE_OPTIONS=--max-old-space-size=10000 pnpm build:local (без цього OOM), прогнати prisma migrate deploy на ch8_live, next start -p 3100 з RATE_LIMIT_ALLOW_MEMORY=1; власник логіниться у вікні розширення; живий прогін Sonnet-агентом (1280/1600/390/540 через same-origin iframe, бо resize_window не міняє viewport; tavern+parchment, одна кнопка збереження, консоль, 5xx, MISSING_MESSAGE, hscroll, elementFromPoint для перекриттів).
- Після цього: повний test:run (вперше за частину!) → /simplify (1 агент) → Opus-рев'ю → фікси → docs/architecture, STATUS, whats-new → злиття в main з git mv spec/plan у docs/archive/superpowers (за «так» власника; основна тека може бути на іншій гілці — зливати в тимчасовому worktree).
- Уроки хв. 1–2: шапка+дії — липкий рядок із суцільним фоном; елементам сітки min-w-0; ns має бути в route-scopes маршруту; пропси ≤7 (групуй в об'єкти, напр. layout: {…}); тека ≤~10 файлів; нічого не перекриває зум/кнопки полотна; на phone дії в один рядок.
- Відкриті хвости хв. 2 (див. project-ch8-wave2): бюджет i18n-маршрутів не виміряно; ToggleRow лишився; thumb мап без storage-URL; не перевірено upload фону, maze, parchment 390, touch, 360.
- Контекст ~150k → зупинись і дай промпт для нової сесії.
