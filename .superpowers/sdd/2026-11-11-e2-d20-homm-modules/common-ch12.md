# Спільний контекст для виконавців E2 Ч12 (прочитати першим)

Worktree `/Users/silentfox/Work/dnd-tracker-e2-ch12`, гілка `feat/e2-part12-battle-ui` (від local main 85cb90883). Працюєш **лише** в цьому worktree; `../dnd-tracker-e2-ch16` (Ч16) і основну теку `../dnd-tracker` не чіпаєш. Звіт пиши українською, ідентифікатори коду — англійською. Коментарі мінімальні: один компактний рядок і лише справжнє «чому»; зайві коментарі-«що», на які натрапиш у зачеплених місцях, прибирай.

Прочитати:
- `CLAUDE.md`; для UI ще `.claude/rules/components.md`;
- `.superpowers/sdd/2026-11-11-e2-d20-homm-modules/part12-design.md` — повністю, це джерело рішень (таблиця «Головна знахідка», відхилення В1–В15, контракт `SystemBattleUi`, пастки П1–П9);
- у плані `docs/superpowers/plans/2026-11-11-e2-d20-homm-modules.md` — лише «Як працювати з планом» і «Ч12»;
- `docs/architecture/rule-systems.md` (композиція, `composeParts`, `SystemUi`), `docs/architecture/battle.md` (сцена, дельти, `turn-flow`);
- звіти попередніх сесій Ч12 (`task-ch12-*-report.md` у теці журналу цього worktree).
- Журнали попередніх частин (`part11-review.md` тощо) лежать лише в основній теці: `/Users/silentfox/Work/dnd-tracker/.superpowers/sdd/2026-11-11-e2-d20-homm-modules/` (читати можна, писати — ні).

Перш ніж писати новий хелпер, пошукай наявний у `lib/utils`, `lib/hooks/battle` (барель), `lib/utils/battle/view`, `components/battle/hud`, `components/hud`, `components/common`, `lib/utils/rules/systems` (`composition`, `moduleMetaOf` у `catalog.ts` — лише імпорт).

## Межі смуги

- Ч12 володіє: `components/battle/**`, `lib/hooks/battle/**`, `lib/utils/battle/**`, `types/battle.ts`, `types/battle-scene.ts`, `systems/*/ui/battle/**`, `systems/*/hooks/battle/**`, `systems/morale/**` (клієнтська частина), `components/systems/types.ts`, `lib/i18n/**`, `app/campaigns/[id]/{battles,dm/battles}/layout.tsx`, `messages/*/battle*.json`, `scripts/sim/*` (лише гейт моралі, С2), плюс файли, названі в брифах С4.
- **НЕ чіпати (Ч16):** `lib/utils/rules/systems/catalog.ts` (імпорт можна), `lib/server/campaigns/**`, `lib/schemas/campaigns.ts`, `lib/api/campaigns.ts`, `lib/hooks/campaigns/**`, `components/rules/sections/SystemSection.tsx`, `lib/constants/api-errors.ts`, `lib/onboarding/whats-new.ts`, `messages/*/whatsNew.json`, OpenAPI (`lib/server/content/openapi.ts`), AI-інструмент правил. Якщо задача вимагає цих файлів — зупинись і запиши у звіт.
- Спільні з Ч16 файли (`lib/__tests__/system-literals.test.ts`, `lib/utils/rules/systems/types.ts`, `messages/*`): правки локальні, без переформатування сусідніх рядків.

## Жорсткі правила

- **Файли змінюються ЛИШЕ через Edit/Write і `git mv`.**
  - ЗАБОРОНЕНІ: `sed -i`, `perl -i`, `python`/`node`/`tsx`-скрипти, що переписують файли, `awk … > file`, `xargs … sed`, `tee` у файл, heredoc (`cat <<EOF > file`, навіть «порожній» чи «лише для перевірки») і будь-яке інше масове переписування. Новий файл — тільки Write.
  - Заборона діє й для масового перейменування імпортів: по одному Edit на файл.
  - Якщо правок забагато для Edit, зупинись і напиши про це у звіті. Порушення = зупинка роботи (у Ч5–Ч11 таке вже траплялось).
- **Не чіпати** golden D11 (`lib/utils/battle/log/__tests__/fixtures/e2-golden/*`), знімки D12 (`lib/server/characters/__tests__/__snapshots__/d12/*`, `-u` заборонено). `components/battle/participants/MyHeroPanel.tsx` змінюється **лише** в тих комітах, де дизайн цього свідомо вимагає (С1 коміти 2–3, С2 коміт 3) і лише в описаних місцях; у звіті позначити «MyHeroPanel змінено свідомо: <що>». Не робити stash/reset/checkout чужих змін і не комітити `.eslintcache`.
- **Коміти.**
  - Лише `git add <явні шляхи> && git commit -m "…" -- <ті самі шляхи>` (zsh). Заборонено `git add -A`, `git add .`, глоби й `--pathspec-from-file`. Шляхи з `[id]` бери в одинарні лапки.
  - Для `git mv` і видалень (`git rm`) у списку коміту мають бути обидва шляхи: старий і новий.
  - Повідомлення закінчується рядком:
    `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
- **Після кожного коміту:**
  - `git show --stat HEAD`: жодного 0-байтового файла (нулі в рядку rename — норма);
  - `git status --short`: жодних staged `D`/`R` поза комітом;
  - порожні теки після `git mv`/`git rm` прибрати (`rmdir`).
- **Кожен коміт компілюється.**
  - Переїзд = `git mv` + правка всіх імпортів у ТОМУ Ж коміті, без зміни поведінки.
  - Зміна поведінки — окремий коміт із тестом.
  - Тести їдуть за кодом у `systems/<id>/__tests__/<дзеркальний шлях>`.
  - Зниження ratchet кладеш у той самий коміт, що його спричинив.
- **Межі core.**
  - Core (`lib`, `app`, `components`, `types`, `scripts`) не імпортує `@/systems/*`. Доступ лише через `ruleSystemOf`/`systemUiOf`/`systemServerOf`/згенеровані корені; у бою — `useSystemBattleUi()` (`components/battle/use-system-battle-ui.ts`).
  - Файл переїжджає в модуль, лише якщо ПІСЛЯ коміту всі його не-тестові читачі лежать у модулі. Перевір: `rg -l "<шлях без розширення>'"`, відносні імпорти й барелі (`lib/hooks/battle/index.ts`, `components/battle/hud/index.ts`, `lib/utils/battle/view/index.ts`, `lib/utils/battle/flows/index.ts`) за іменами експортів. Інакше файл лишається, і це відмічається у звіті.
  - Модуль імпортує інший модуль лише за `requires` у `meta.ts`.
- **Ніяких заглушок і `?? true` у core:** відсутній слот/хук = відсутня механіка. Нові поля контракту — необовʼязкові (В1); база не дає `() => null`.

## Пастки (кожна вже коштувала сесії)

- **TDZ / холодний імпорт.** Тест, що першим кроком імпортує реєстр систем (`@/lib/utils/rules/systems`, `@/components/systems`, `@/lib/server/systems/registry`) або компонент, що їх тягне, робить це в `beforeAll(async () => { await import('@/lib/server/systems/registry'); … }, 30_000)` (серверні) або прогріває `@/components/systems` так само (UI); або мокає `@/components/battle/use-system-battle-ui`. Модульні тести першим імпортують `@/lib/server/systems/registry`, якщо торкаються сервера.
- **Клієнтський граф.** `systems/*/index.ts`, `systems/*/rules/**`, `systems/*/ui/**`, `systems/*/hooks/**`, `systems/*/api/**`, `lib/api/**`, `lib/hooks/**`, `components/**` — клієнтські. Там заборонені `zod`, `@prisma/client`, `@/lib/server/*`, `server-only`, барель `@/lib/utils/battle/store` (окремі файли `store/reject` тощо — можна, якщо без `zod`), `lib/utils/characters/resources/schema.ts`. Гейт: `lib/__tests__/client-entry-imports.test.ts`.
- **`"use client"`** обовʼязковий у кожному файлі `systems/**/ui/**` і `systems/**/hooks/**`, що використовує хуки React, `useTranslations`, `useBattleScene*`.
- **UI-цикл `registry → systems/*/ui → components/* → components/systems`.** Модульний UI не імпортує `@/components/systems` (крім `@/components/systems/types` як тип) і `components/battle/use-system-battle-ui`. Слоти рендерить викликач (core-компонент бою).
- **`memo` у рядках бою** (`ParticipantRow`): у `view` — лише примітиви/рядки, не `ReactNode`.
- **`rules` у фікстурах тестів.** `DEFAULT_RULES` = `homm` (усі модулі). Тест, що чекає голий `dnd5e` чи wfrp, явно задає `parseRules({ system: { key: 'dnd5e' } })` або `{ key: 'dnd5e', modules: ['morale'] }`.
- **Ratchet лише знижується і лише вручну.**
  - Максимуми в `lib/__tests__/system-literals.test.ts` (`LEAK_NAMES`, `RULES_SECTION_READERS`) і `MAX_EXEMPT_FILES` у `system-imports.test.ts` правиш через Edit до фактичного числа; нове імʼя в `LEAK_NAMES` — з фактичним числом.
  - `pnpm exec tsx scripts/shared/system-ratchet.ts --write` — тільки коли числа ПАДАЮТЬ (перевір `git diff` exempt-файлів: лише видалення рядків/зменшення).
  - Будь-який ріст (новий exempt, вищий лічильник, новий літерал `wfrp`/`dnd5e`/`homm` або id модуля в core) = зупинка і звіт, без «підгонки». Обхід regex перейменуванням заборонено.
- **Після зміни шарів модуля** (нова тека `systems/<id>/hooks`, `ui/index.ts` тощо): `pnpm systems:index`; повторний запуск дає порожній diff. Згенеровані блоки `// <systems:generated>` руками не правити.
- **i18n.** Тексти — у `messages/{uk,en}/<ns>.json` (обидві мови, однакові ключі); кирилиця в коді заборонена (ESLint), `i18n-exempt.json` не росте.

## Важкі процеси — один на всю машину

`tsc`, `vitest` (будь-який, навіть `pnpm test:run <файли>`), `eslint` по теці, `next dev`/`next build`, sweep — **не більше одного на всю машину**; цим самим локом користується смуга Ч16.

```bash
until mkdir /tmp/e2-heavy.lock 2>/dev/null; do sleep 20; done
# … один важкий процес …
rmdir /tmp/e2-heavy.lock
```

- Лок звільняй **завжди**, навіть коли процес упав (наступна команда після важкої — `rmdir /tmp/e2-heavy.lock`).
- Процес довше 5 хв = завислий: вбий його, звільни лок, запусти вужче.
- `prettier` і `eslint --cache --fix <кілька файлів>` по зачеплених файлах — легкі, лок не потрібен.
- Дев-порт цієї смуги — **3100**; БД — `postgresql://postgres:postgres@localhost:54322/prodcopy_ch12`. Дев-сервер і БД виконавцю не потрібні (live-run робить контролер).

## Форматування й перевірки

- По нових і змінених файлах: `pnpm exec prettier --write <файли>`, потім `pnpm exec eslint --cache --fix <файли>`.
- Після prettier перевір, що `// eslint-disable-next-line` лишився над тим самим рядком.
- Тести, які читають вихідні файли (`system-literals`, `client-entry-imports`, `system-imports`, regex по тексту), мають бути формат-агностичні.
- **Тести пишеш, але НЕ запускаєш** (рішення власника 2026-11-12: повний прогін робить контролер один раз наприкінці частини). Дозволено лише точково `pnpm test:run <конкретні файли>` під локом, коли без цього не зрозуміти поломку. Повний прогін, `pnpm test:changed` без шляхів і repo-wide eslint — заборонені.
  - Один `pnpm exec tsc --noEmit` наприкінці сесії (можна й після великого коміту) — під локом. Перед ним: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next|tsc"`.
- `rg` замість `grep --include`; без глобів у zsh-командах git.
- Субагентів не запускати. Не пушити, у prod не писати, Docker/БД не чіпати, `prodcopy-db.sh`, `battle-sweep`, `template import`, `next dev` не запускати (це робить контролер після «так» власника).

## Звіт

Звіт — у файл `.superpowers/sdd/2026-11-11-e2-d20-homm-modules/task-ch12-<N>-report.md` цього worktree (тека в `.gitignore`; файл не комітиш). Що в ньому має бути:
- статус;
- коміти (хеш + заголовок);
- таблиця «що → куди» (і що лишилось у core та чому, з кількістю читачів);
- відхилення від `part12-design.md` з причиною;
- «MyHeroPanel змінено свідомо: …» (якщо змінювався);
- хвости;
- які тести написано/перенесено (файли й кейси); тести не запускались — так і написати (або які точково і з яким результатом); результат `tsc`;
- лічильники ratchet: було → стало (`system-imports-exempt.json` записів, `system-literals-exempt.json` файлів, нові/змінені `LEAK_NAMES`);
- результат `rg "@/systems/" app lib components types scripts -g '!**/__tests__/**'` за винятком згенерованих коренів (нових збігів бути не має).

Фінальна відповідь контролеру: статус (DONE / DONE_WITH_CONCERNS / BLOCKED), хеші, один рядок про `tsc`, concerns.
