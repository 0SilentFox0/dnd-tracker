# Рефакторинг конструктора — спільні правила виконання

Цей документ і [roadmap](2026-10-26-constructor-refactor-roadmap.md) обов’язково читати разом із конкретним планом S1–S10. Плани підготовлено за HEAD `73c5de1a`; перед виконанням звірити код. Ця сесія готує документацію; реалізацію тут не запускали. Фактичний стан паралельних робіт звіряти за їхніми checkpoint-ами.

## Паралельний старт

Користувач попросив запускати дві перші робочі сесії паралельно. Розподіл:

- **Робоча сесія 1 → S1**: assistant runner, локальні fixtures/harness, baseline і security audit.
- **Робоча сесія 2 → S5, задачі 1–3**: чисті rules/defaults/domain constants в окремому worktree. Вона знімає власний цільовий baseline; S5.4 виконується після інтеграції S1.
- **S2 залишається залежним від S1**. Номер другого implementation plan не означає другу паралельну сесію.

Сесію 2 починати від зафіксованого commit `feat/constructor` у власній гілці/worktree через `superpowers:using-git-worktrees`. Не перемикати гілку поточної робочої копії. Якщо ці плани ще untracked, читати їх за абсолютним шляхом у вихідній папці; не копіювати чужий незавершений diff у свою гілку.

Сесія 2 володіє тільки `lib/utils/rules/`, `lib/constants/classes.ts`, `lib/constants/choices.ts`, `lib/constants/spells.ts`, `lib/constants/weapon-traits.ts`, `lib/constants/hero-scaling.ts`, їхніми sibling tests та власним `2026-10-26-constructor-refactor-s5-progress.md`. Consumers поза цим списком читати; потрібні зміни записати для наступної інтеграції. Не редагувати загальні STATUS/README/roadmap/handoff/package/lockfile/Prisma.

S1 володіє assistant harness/runner і власним `2026-10-26-constructor-refactor-s1-progress.md`. Якщо її підтверджений security fix потребує файлів S5 — зафіксувати finding і узгодити володіння перед зміною. Наявність окремих worktree не скасовує фінальної перевірки об’єднаного стану.

Після паралельних робіт інтегратор звіряє commits та common base, зберігає обидва набори змін і виконує S5.4. Кожен виконавець передає branch, commits, результати й обмеження; самостійного merge/cherry-pick іншої сесії немає.

## Незмінні обмеження

- Підтримка HOMM і 5e, API/MCP action ids, payloads, error/status semantics, persisted JSON та чинні defaults залишаються сумісними.
- Не змінювати механіки, формули, баланс чи правила невидимості. Доведений дефект виправляти окремою задачею з regression evidence.
- DB writes тільки на guarded local `constructor`: перевірити ОБИДВА `DATABASE_URL` і `DIRECT_URL`; не друкувати URLs, tokens, payloads із приватними даними.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy. Не редагувати застосовані міграції; DDL/індекси — окрема задача після evidence.
- Зберігати lock order, live authorization, scoped transaction/connection, atomic write+receipt, after-commit effects, idempotency і заборону повторної unknown платної операції.
- Не вводити новий business registry або глобальний cache для authoritative preconditions. Звуження reads/locks/invalidation потребує повного доказу залежностей.

## Цикл задачі

1. Перевірити вхідні artifacts/dependencies; зняти baseline зазначеною командою до зміни.
2. Для простого extraction використовувати чинні поведінкові тести. Якщо потрібна нова логіка або знайдено непокритий дефект — додати названий у задачі regression test, підтвердити RED з причиною, потім GREEN.
3. Змінити тільки файли задачі, зберегти public exports, перевірити всіх consumers через `rg`.
4. Запустити зазначену перевірку й оглянути diff. Перед commit виконати `git diff --check`, lint змінених TS/TSX та потрібний typecheck.
5. Записати evidence й зробити окремий commit тільки файлів задачі, якщо реалізаційна сесія працює з commits. Не включати чужі зміни. Запропоновані commit messages наведено в планах.

Кроки плану — обов’язкові перевірювані результати. Нові модулі — визначені місця відповідальностей; якщо попередня сесія вже створила той самий контракт, використати її результат і прибрати дублювання в плані перед змінами.

## DB та browser verification

Перед DB integration:

```sh
pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --check-target
```

Очікується `{"database":"constructor","local":true,"bothUrls":true}`. Невдалий guard означає відсутність DB writes. Інтеграційний Vitest config читає `.env.local`; перевірити guard у самій suite. Запускати лише названі files, не весь `pnpm test:integration` з Pusher/Redis suites. Один connection перевіряти параметром обох guard-checked URLs у runner, не змінюючи `.env.local`.

S1 зберігає CLI `assistant-check.ts --run`, додає `--output-dir <dir>` і `--chrome-path <binary>`. Приклад після S1:

```sh
ASSISTANT_CHECK_RUN_ID=refactor-s1-local-check pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --run --output-dir .superpowers/refactor/s1
```

Залежності harness — tracked; outputs/profile/bundles — тільки в output dir. Відсутні Chrome/CSS/build artifacts дають явну помилку preflight, а не PASS. Для browser використовуються synthetic HTTP responses; DB authority доводиться окремо локальною integration suite. Provider/Storage/Pusher/Redis не викликати для звичайної серії.

## Вимірювання

S3 створює guarded `scripts/constructor/assistant-benchmark.ts` та synthetic fixtures. Small: 10 spells, 10 artifacts, 2 characters; large: 500 spells, 500 artifacts, 20 characters; решта необхідних refs мінімальні. Для сценарію 5 warmups + 30 measured iterations, фіксовані seed/clock; write fixtures відновлювати поза measured interval. Cleanup тільки власного run marker.

Метрики: `queryCount`, `resultJsonBytes`, `elapsedMs`, окремі `serializeMs`/`transactionMs`, якщо виміряні. `resultJsonBytes` — розмір серіалізованих повернутих даних, не wire traffic PostgreSQL. Lock wait/duration не виводити з wall time: виміряти явно або позначити unavailable. SQL parameters/private values у звіт не писати. Для EXPLAIN використовувати тільки synthetic read queries локально; не виконувати EXPLAIN ANALYZE destructive writes.

Звіти містять raw samples, Node/Postgres versions, commit, fixture sizes, warmup/run counts та медіану/p95. Не встановлювати довільного відсотка прискорення. Якщо evidence не підтверджує виграш, залишити простіший безпечний шлях і записати результат.

## Checkpoint

Для кожної сесії: `docs/superpowers/plans/2026-10-26-constructor-refactor-sN-progress.md`.

Зміст: start/end HEAD, branch/worktree, виконані task ids, файли/public interfaces, commands+exit codes+passed/skipped, security findings із file/сценарієм/evidence, raw measurements або unavailable, залишки, наступний task id. Секрети й raw campaign notes не включати.

Full suite запускається один раз у S10, або раніше, якщо змінено package dependencies/config/shared test helpers і цільовий module graph не покриває ризик. Повтор — тільки після нових змін чи невирішеного збою. Зміна direct esbuild dependency у S1 потребує цього ширшого baseline; це явний виняток до звичайного targeted режиму.
