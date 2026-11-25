Працюй у /Users/silentfox/Work/dnd-tracker. Спілкуйся українською.

## Старт (обовʼязково)
1. `git status`, `git branch --show-current`, `git worktree list`, `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`. Основне дерево може бути зайняте іншою сесією: свій worktree `git worktree add ../dnd-tracker-ch8 -b feat/game-ui-ch8 <база>`, лише там. Чужі незакомічені файли не чіпай. Локальний запуск: порт 3101 (3100 і 3200 заняті іншими), окрема копія БД (`pg_dump` з наявної в Docker `dnd-tracker-db-1` у нову базу, не prodcopy), `.env.local` скопіюй у worktree без читання, `DATABASE_URL`/`DIRECT_URL` перепиши на нову БД (не друкуй), для `next start` став `RATE_LIMIT_ALLOW_MEMORY=1`. Не `pkill` чужі сервери.
2. База: Ч6 + Ч7 (reach/fog) змерджені в гілку `feat/game-ui-ch6` (tip `35ab324dc`), НЕ в main; у main лежить Ч5 (запушено e2313acff). Базуйся від `feat/game-ui-ch6`, якщо користувач не скаже інакше. Перед тестами після merge main: `pnpm install --frozen-lockfile` і `pnpm exec prisma generate`.

## Що таке Ч8
У нумерації епіку (docs/superpowers/plans/2026-11-21-game-style-ui.md, таблиця «Порядок і залежності») Ч8 = «перенос решти сторінок, фінальний прохід по всіх екранах» (старий розділ «Ч7. Платформа в стилі Game», XL, хвилями): кампанія/лобі як «головний екран гри» (Продовжити / Бій / Мапа / Персонаж), список героїв, DM-розділи, сценарій, показ, музика, налаштування; форми (`HudFormPage`, `HudForm`: центральна колонка, мінімум рамок, `ResponsiveDialog hud`, без акордеонів); друковані `dm/print/*` лишаються світлими; лендинг і перезйомка скрінів (проєкт landing-screens). Hex-геометрія (`gridType`) НЕ входить: вона в `feat/game-ui-ch7c`.
Спека перша: ця частина XL, тому спека розбиває її на хвилі (кожна хвиля = група сторінок, окремий план/прогін), оцінює обсяг і пропонує порядок. Додаткові ідеї епіку (переходи-сцени, звукові відгуки, гарячі клавіші, портрет-first, екран завантаження, онбординг, режим ТВ) не робити без рішення власника: винеси їх питанням.

## Спершу прочитай
CLAUDE.md, .claude/rules/components.md, docs/architecture/{ui-layers,platform,onboarding}.md, docs/STATUS.md (game-style UI, «хвости»: Ч5 sheet, Ч6 бій, Ч7 reach/fog), docs/superpowers/plans/2026-11-21-game-style-ui.md (рішення власника, принципи, ризики), specs/2026-11-21-game-style-ui-approved-design.md, `components/layout/Header.tsx`, `components/hud/**` (page, form, shell), `app/campaigns/[id]/**` (перелік сторінок і які вже на каркасі Ч1–Ч6), `app/globals.css` + `app/palettes.css` (токени, спільне тло `public/bg/vey-strait-*`).

## Вимоги власника (діють для всіх екранів)
- «Преміум» = стриманість, чітка ієрархія, зручність і доступність (контраст ≥ 4.5:1 текст / ≥ 3:1 UI, цілі ≥ 40 px, не лише кольором, focus-кільця, `prefers-reduced-motion`). Золото лише для змісту, червоний лише HP. Без орнаментів, глоу, частинок.
- ОДНЕ спільне тло платформи (`vey-strait-{2k,4k}.webp` + затемнення) лише для темних палітр, parchment/frost плоскі; не повертай картинки по екранах, без тайлових шарів (шви).
- Мобільний паритет: усе, що гравець може на десктопі, доступне на phone; частина не закрита без прогону на обох.
- Адаптивність до 4K (1440/1920/2560/3840): без вузької смуги посеред екрана.
- Рух із змістом: токени/хуки в app/motion.css і lib/hooks/common, transform/opacity, reduced-motion = спокійна заміна.
- Живий прогін до слів «готово» (`next start`, збірка `NODE_OPTIONS=--max-old-space-size=8192 pnpm build:local`; користувач сам логіниться; браузерні прогони віддавай Sonnet-субагенту, скейлені скріншоти 0.5, JS/текст-перевірки; розміри вікна через iframe). Обовʼязково: темна + parchment + frost (через реальний перемикач `/settings/preferences`), DM і гравець, desktop і phone, консоль без помилок.

## Процес
Ти на Sonnet. Спека і план першими: `docs/superpowers/specs/<дата>-game-ui-ch8-design.md` (reuse-список; матриця «що є → як міняється» по кожній сторінці; хвилі; ризики; тести) і `plans/<дата>-game-ui-ch8.md` (задачі на 1–2 виконавці-Sonnet, точні файли, критерії, «що не чіпаємо»). Один Opus-субагент на ревʼю спеки й плану. ПІСЛЯ плану зупинись із стислим підсумком і питаннями власнику, чекай «так». Далі виконавці Sonnet по хвилях (агенти тести не запускають; один повний `pnpm test:run` наприкінці хвилі; давні падіння: `props-budget` (DashboardGroups, HudGameShell), `system-install-entries` (journal), `assistant/coverage` (quests)); lint `pnpm lint:dirs --changed`; `/simplify` (1–2 агенти); оновити docs/architecture і docs/STATUS.md; `whats-new` + `messages/*/whatsNew.json` для користувацьких змін; i18n лише ключами. Коміти лише у feat/game-ui-ch8 (`git add <шляхи>`), у повідомленнях `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Merge лише за явним «так», push окремим «так». Контекст ~150k = стоп і підсумок для нової сесії. Нічого не вигадуй, секрети не читай.

## Кінцевий звіт
Шляхи спеки й плану, 5–8 рішень, питання власнику, залежності, оцінка обсягу; після реалізації: тести, живий прогін, хвости у STATUS.
