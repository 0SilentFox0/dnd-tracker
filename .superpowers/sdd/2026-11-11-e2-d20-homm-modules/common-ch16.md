# Спільний контекст для виконавців E2 Ч16 (прочитати першим)

Репо — worktree `/Users/silentfox/Work/dnd-tracker-e2-ch16`, гілка `feat/e2-part16-mode-seam` (від local main 85cb90883). Працюй **лише** в цьому worktree; `../dnd-tracker` і `../dnd-tracker-e2-ch12` не чіпати. Звіт пиши українською, ідентифікатори коду — англійською. Коментарі мінімальні: один компактний рядок і лише справжнє «чому»; зайві коментарі-«що», на які натрапиш у зачеплених місцях, прибирай.

Прочитати:
- `CLAUDE.md`; для UI ще `.claude/rules/components.md`;
- `.superpowers/sdd/2026-11-11-e2-d20-homm-modules/part16-design.md` — повністю, це джерело рішень (особливо «Головна знахідка», Р1–Р10, пастки П1–П8, відхилення В1–В7);
- у плані `docs/superpowers/plans/2026-11-11-e2-d20-homm-modules.md` — лише «Як працювати з планом» і «Ч16»;
- `docs/architecture/rule-systems.md` (композиція, секції, `claims`), `docs/architecture/onboarding.md`, `docs/architecture/i18n.md`; `docs/STATUS.md` блоки «E2 Ч10» і «E2 Ч11»;
- звіти попередніх сесій Ч16 (`task-ch16-*-report.md`).

Паралельна смуга Ч12 володіє `components/battle/**`, `lib/hooks/battle/**`, `lib/utils/battle/**`, `types/battle.ts`, `systems/*/ui/battle/**` — **не чіпати** навіть для «дрібного фіксу» (запиши у звіт). Спільні файли (`messages/*`, `whats-new.ts`) — лише вставки в місцях, названих у дизайні.

Перш ніж писати новий хелпер, пошукай наявний у `lib/utils`, `lib/utils/api` (`parseBody`, `errorResponse`, `operationRoute`), `lib/server/content` (`ContentError`, `withCampaignContentWrite`), `lib/utils/rules/systems` (`composition`, `moduleMetaOf`, `moduleCatalog`, `PRESETS`, `validateComposition`), `lib/utils/rules/section-registry.ts` (`validateSections`, `sectionsOfSystem`), `lib/hooks/common` (`useConfirm`, `useNotify`), `components/ui` (`switch`, `switch-field`) і `components/common`.

## Жорсткі правила

- **Файли змінюються ЛИШЕ через Edit/Write і `git mv`.**
  - ЗАБОРОНЕНІ: `sed -i`, `perl -i`, `python`/`node`/`tsx`-скрипти, що переписують файли, `awk … > file`, `xargs … sed`, `tee` у файл, heredoc (`cat <<EOF > file`, навіть «порожній» чи «лише для перевірки») і будь-яке інше масове переписування. Новий файл — тільки Write.
  - Заборона діє й для масового перейменування імпортів: по одному Edit на файл.
  - Якщо правок забагато для Edit, зупинись і напиши про це у звіті. Порушення = зупинка роботи (у Ч5–Ч11 таке вже траплялось).
- **Не чіпати** `components/battle/participants/MyHeroPanel.tsx`, golden D11 (`lib/utils/battle/log/__tests__/fixtures/e2-golden/*`), знімки D12 (`lib/server/characters/__tests__/__snapshots__/d12/*`, `-u` заборонено). Не робити stash/reset/checkout чужих змін і не комітити `.eslintcache`.
- **Коміти.**
  - Лише `git add <явні шляхи> && git commit -m "…" -- <ті самі шляхи>` (zsh). Заборонено `git add -A`, `git add .`, `--pathspec-from-file` і глоби. Шляхи з `[id]` бери в одинарні лапки.
  - Для `git mv` і видалень (`git rm`) у списку коміту мають бути обидва шляхи: старий і новий.
  - Повідомлення закінчується рядком:
    `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
- **Після кожного коміту:**
  - `git show --stat HEAD`: жодного 0-байтового файла (нулі в рядку rename — норма), жодного `.eslintcache`;
  - `git status --short`: жодних staged `D`/`R` поза комітом;
  - порожні теки після `git mv`/`git rm` прибрати (`rmdir`).
- **Кожен коміт компілюється.**
  - Переїзд = `git mv` + правка всіх імпортів у ТОМУ Ж коміті, без зміни поведінки. Зміна поведінки — окремий коміт із тестом.
  - Тести їдуть за кодом (сусідні `__tests__/`; для `systems/<id>` — `systems/<id>/__tests__/<дзеркальний шлях>`).
- **Межі core.**
  - Core (`lib`, `app`, `components`, `types`, `scripts`) не імпортує `@/systems/*`. Доступ лише через `ruleSystemOf`/`systemUiOf`/`systemServerOf` і згенеровані корені (новий корінь `RULES_PRESETS` додається в генератор і в `SYSTEM_ROOTS` ESLint, руками блоки `// <systems:generated>` не правити).
  - Core не називає систему: жодних `=== 'wfrp'`, `'dnd5e'`, `'homm'` у коді (ratchet `system-literals`); лише id addon-ів у тестах і в даних meta.
  - Модуль імпортує інший модуль лише за `requires` у `meta.ts`.
- **Ніяких заглушок і `?? true` у core:** відсутній хук = відсутня механіка.

## Пастки (кожна вже коштувала сесії)

- **Холодний імпорт.** Тест, що зачіпає реєстри (`systemServerOf`, `ruleSystemOf`, маршрути), першим кроком робить `beforeAll(async () => { await import('@/lib/server/systems/registry'); … }, 30_000)`. Тести модулів (`systems/*/__tests__`) — теж першим імпортують `@/lib/server/systems/registry` (TDZ-цикл `systems/<id>/server ↔ registry`, M9 Ч11).
- **Клієнтський граф.** `systems/*/index.ts`, `systems/*/rules/**`, `systems/*/ui/**`, `systems/*/api/**`, `systems/*/hooks/**`, `lib/api/**`, `lib/utils/rules/systems/catalog.ts` — клієнтські. Там заборонені `zod`, `@prisma/client`, `@/lib/server/*`, `server-only`, барель `@/lib/utils/battle/store`. Гейт: `lib/__tests__/client-entry-imports.test.ts`. Пресети правил (`systems/*/rules/rules-preset.ts`) — лише дані.
- **`"use client"`** обовʼязковий у кожному файлі з хуками React, `useTranslations`, `useRouter` (`lib/hooks/**`, `components/**`).
- **Шари.** Компоненти й `app/**` не імпортують `@/lib/api/*` і не викликають `fetch` (ESLint): мутації — у хуках `lib/hooks/campaigns/**`, експорт через барель `lib/hooks/campaigns/index.ts`. Ключі запитів — лише з `campaignKeys` (`lib/hooks/campaigns/keys.ts`), без інлайн-масивів.
- **i18n.** Кирилиця в коді заборонена (ESLint), тексти — `messages/{uk,en}/<ns>.json`, **обидві локалі однаковими ключами**. Не-React код повертає ключі (`rules.validation.composition.<code>`), переклад — на межі.
- **`rules` у фікстурах тестів.** `DEFAULT_RULES` = `homm` (усі модулі). Тест «голого» `dnd5e` чи wfrp явно задає `parseRules({ system: { key: 'dnd5e' } })` або `{ key: 'dnd5e', modules: [...] }`.
- **Ratchet лише знижується і лише вручну.** Будь-який ріст (`system-imports-exempt.json`, `system-literals-exempt.json`, `LEAK_NAMES`, `MAX_EXEMPT_FILES`) = зупинка і звіт, без «підгонки». Обхід regex перейменуванням чи склеюванням рядків заборонено. `pnpm exec tsx scripts/shared/system-ratchet.ts --write` — тільки коли числа падають.
- **Після зміни шарів** (новий `systems/<id>/rules/rules-preset.ts`, новий корінь у генераторі): `pnpm systems:index`; повторний запуск дає порожній diff.

## Важкі процеси й середовище

- **Важкі процеси — не більше одного на всю машину.** Це `pnpm exec tsc --noEmit`, `pnpm test:run …`, `pnpm exec eslint` по теці, `next dev`, sweep. Інша смуга (Ч12) користується тим самим локом. Перед запуском:
  ```
  until mkdir /tmp/e2-heavy.lock 2>/dev/null; do sleep 20; done
  ```
  після завершення (і при помилці теж) — `rmdir /tmp/e2-heavy.lock`. Команди з локом запускай одним викликом: `until mkdir /tmp/e2-heavy.lock 2>/dev/null; do sleep 20; done; pnpm exec tsc --noEmit; rc=$?; rmdir /tmp/e2-heavy.lock; exit $rc`. Процес довше 5 хв = завислий: вбити, зняти лок, записати у звіт. Prettier й eslint по кількох файлах — легкі, лок не потрібен.
- Дев-сервер (якщо колись знадобиться) — порт **3200**; БД — `postgresql://postgres:postgres@localhost:54322/prodcopy_ch16`. Виконавцям С1–С3 сервер і БД **не потрібні**.
- Не пушити, у prod не писати, Docker/БД не чіпати; `prodcopy-db.sh`, `battle-sweep`, `template import` не запускати (це робить контролер після «так» власника). `pnpm template validate <key>` (без БД) — дозволено.
- Субагентів не запускати.

## Форматування й перевірки

- По нових і змінених файлах: `pnpm exec prettier --write <файли>`, потім `pnpm exec eslint --cache --fix <файли>`.
- Після prettier перевір, що `// eslint-disable-next-line` лишився над тим самим рядком.
- Тести, які читають вихідні файли (`system-literals`, `client-entry-imports`, regex по тексту), мають бути формат-агностичні.
- **Тести пишеш, але НЕ запускаєш** (рішення власника 2026-11-12: повний прогін робить контролер один раз наприкінці частини). Дозволено лише точково `pnpm test:run <конкретні файли>` (під локом), коли без цього не перевірити гіпотезу; повний `pnpm test:run`, `pnpm test:changed` і repo-wide eslint — заборонені.
- Один `pnpm exec tsc --noEmit` наприкінці сесії (під локом; можна й після великого коміту). Помилки `tsc` виправити до звіту.

## Звіт

Звіт — у файл `.superpowers/sdd/2026-11-11-e2-d20-homm-modules/task-ch16-<N>-report.md`. Що в ньому має бути:
- статус;
- коміти (хеш + заголовок);
- відхилення від `part16-design.md` з причиною;
- хвости;
- які тести написано (файли й кейси); тести не запускались (або які точково запускались і чому); результат `tsc`;
- лічильники ratchet: було → стало (`system-imports-exempt.json` записів, `system-literals-exempt.json` файлів, `LEAK_NAMES`) — очікування Ч16: без змін;
- результат `rg "@/systems/" app lib components types scripts -g '!**/__tests__/**'` за винятком згенерованих коренів (нових збігів бути не має);
- нові ключі i18n (namespace → ключі), однакові в uk і en.

Фінальна відповідь контролеру: статус (DONE / DONE_WITH_CONCERNS / BLOCKED), хеші, один рядок про `tsc`, concerns.
