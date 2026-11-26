Працюй у /Users/silentfox/Work/dnd-tracker-ch8 (worktree, гілка `feat/game-ui-ch8`, від main e0fe227bd). Спілкуйся українською.

## Старт
1. `git status`, `git branch --show-current`, `git worktree list`, `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`. Основне дерево /Users/silentfox/Work/dnd-tracker не чіпай.
2. Стенд: порт 3100, локальна БД `ch8_live` (не prodcopy; `.env.local` у worktree вже вказує на неї, DATABASE_URL не друкуй). Збірка `NODE_OPTIONS=--max-old-space-size=10240 pnpm exec next build`, далі `RATE_LIMIT_ALLOW_MEMORY=1 pnpm exec next start -p 3100`. Власник логіниться сам у вікні розширення Chrome. `resize_window` вікно не звужує: phone 390/540 міряти в same-origin iframe через JS.
3. Прочитай: CLAUDE.md, .claude/rules/components.md, docs/architecture/ui-layers.md, **docs/superpowers/specs/2026-11-25-design-system.md (DESIGN.md — візуальне джерело правди)**, docs/superpowers/specs/2026-11-21-game-style-ui-approved-design.md (композиція й поведінка), docs/superpowers/plans/2026-11-21-game-style-ui.md (розділи «Ч7. Платформа в стилі Game» = Ч8 і «Ч8a»), перший запис docs/STATUS.md (Крок 0 і рішення власника).

## Рішення власника (2026-11-25)
- DESIGN.md діє для всієї платформи: спершу фаза «токени й база» (обидві палітри tavern/parchment, `--crimson`/`--crimson-fg`, `--inset`, `--panel-2`, радіус 4 px, зерно, `--focus`, контраст 8.2), потім Ч8a і Ч8 у новій мові.
- Виняток для бою/мапи: функціональні кольори (рух бірюза, дальність заклинань, ресурси) і круглі жетони лишаються; змінюються шрифти, радіуси панелей, золото → багряний у HUD.
- Шрифти self-host (Cormorant SC 700, Alegreya 400/500/700/italic, Oswald 500; woff2 latin+cyrillic в `app/fonts.css`), без Google Fonts.
- Ч9 немає: Ч8 = редизайн усіх нечіпаних сторінок. Пріоритет: профіль користувача (`/profile`, `/settings/*`, `/help`, `/library/sounds` — усі під `ProfileShell`) і **всі форми з інпутами**, особливо лист персонажа в режимі редагування (`components/character-profile/ProfileEditor.tsx`, 457 рядків, ~25 полів: SelectField, LabeledInput, Textarea, ImageUpload, Checkbox).
- Відкриті питання Ч8a (спитати на початку): зведення гравця в профілі; розділ «Підписка».

## Інвентар (2026-11-25)
У `GameShell` (`components/layout/game-shell-route.ts`) лише 7 маршрутів: `/campaigns`, `/campaigns/[id]`, `/journal`, `/world`, `/dm/world`, `/character`, `/dm/characters/[characterId]`. Поза оболонкою ~55 сторінок: профіль/налаштування, campaigns/new, info, acquaintances, show; characters new/draft, dm/characters (список, new); DM: artifacts, battles (список + BattleSetupForm), rules, assistant, ai, compendium, SystemDmPage-розділи, feats, races, spells, spell-groups, units; scenario, show (+deck, preview), music; graph, maps; ops. Форм-кіт: `components/hud/form/*` (HudForm, HudFormPage, HudSection, HudTabs), `components/ui/*` (input, textarea, select-field, number-input, bounded-number-input, switch(-field), slider, checkbox, radio, labeled-input, comma-list-input), `components/common/fields/*`. Друк `dm/print/*` — світлий. Лендинг/auth — окремо.

## Що зробити в цій сесії
1. Spec (Opus): фаза токенів + Ч8a, з розділом reuse. Найбільший важіль — форм-кіт: перевести примітиви (`components/ui` inputs, `hud/form`) на DESIGN.md, тоді всі ~25 форм оновляться разом; окремо — композиція `ProfileEditor` (центральна колонка, без акордеонів, секції `HudSection`). Далі plan (Opus), SDD (Sonnet, 2–3 задачі на агента), фінальне ревʼю (Opus субагентом, дати код).
2. Ч8 (решта сторінок хвилями) — окремі spec/plan у наступних сесіях.

## Правила процесу
- Reuse before writing (lib/utils, lib/hooks, components/{common,ui,hud,layout}); у spec — що перевикористано.
- Тексти ключами messages/{uk,en}, кирилиця в коді заборонена; `lib/i18n/__tests__/scope-size.test.ts`; нова користувацька фіча → `lib/onboarding/whats-new.ts` + `whatsNew.<id>`.
- Шари: components без `@/lib/api`/fetch; пропи ≤ 7; коментарі мінімальні англійською.
- Будь-який новий контрол має видимий підпис або tooltip/aria-label; ціль ≥ 40 px на телефоні.
- Не чіпати lib/server/**, lib/utils/battle/{pipeline,turn}, components/fx/**, wizards/**, usePlayerTurn без явної потреби й попередження.
- Агенти тести не запускають (крім test:related); один повний `pnpm test:run` наприкінці частини. Коміти з «Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>».
- Кожен завершений агент → TaskStop. На ~150k контексту — стоп і промпт для нової сесії.
- Наприкінці: /simplify (1 агент), docs, spec/plan `git mv` у docs/archive/superpowers/ у merge-коміті; merge/push лише після окремого «так», merge у тимчасовому worktree. Перед «done» — живий прогін на стенді.
- Відкриті хвости Кроку 0 — у STATUS (кнопка «Далі» на 390 не перевірена після `c0b6c40d7` — перевірити в першому ж прогоні).
