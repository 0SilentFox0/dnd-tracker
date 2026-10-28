# Промпти для старту сесій рефакторингу

Номер паралельної робочої сесії не дорівнює номеру плану: перші дві роботи — S1 і S5.1–S5.3. Assistant executor S2 залежить від S1.

## Робоча сесія 1 — S1

```text
Працюємо українською в /Users/silentfox/Work/dnd-tracker-constructor,
гілка feat/constructor. Виконай тільки S1.

Прочитай CLAUDE.md та файли в docs/superpowers/plans/:
- 2026-10-26-constructor-refactor-roadmap.md
- 2026-10-26-constructor-refactor-execution-guide.md
- 2026-10-26-constructor-refactor-s1-baseline-security.md
Також прочитай docs/architecture/ai.md, актуальні STATUS і constructor-handoff.

Зафіксуй branch/status/HEAD, збережи сторонні зміни. Виконай задачі S1.1–S1.4:
inventory, відтворюваний tracked assistant-check/browser harness, первинний
security audit входів chat/MCP/session/cron та свіжий цільовий baseline.
Підтверджені security дефекти виправляй окремими змінами з RED→GREEN evidence.
Усі conclusions прив'язуй до конкретного коду й фактичних результатів.

Паралельна сесія володіє lib/utils/rules/, визначеними в execution guide
domain constants та їхніми тестами. Не редагуй цю область.

DB writes — тільки guarded local constructor з перевіркою ОБОХ URLs.
Зберігай connection_limit=1, cleanup власних fixtures/processes та міграції.
Не додавай credentials/logs/screenshots/profiles/bundles до Git.

Збережи checkpoint із HEAD/commits/перевірками/findings/залишками та next task S2.1.
Якщо власний checkpoint S1 уже існує, продовжуй його й передай точний шлях.
Не переходь до S2, не змінюй gameplay, persisted JSON чи API/MCP contracts.
Prod/prodcopy, HOMM gateway, merge/push/deploy не запускай.
```

## Робоча сесія 2 — паралельні S5.1–S5.3

```text
Працюємо українською. Це паралельна друга сесія, незалежна від S1.
Твоя задача — тільки S5.1–S5.3: pure rules/defaults/domain constants.

Вихідний репозиторій: /Users/silentfox/Work/dnd-tracker-constructor.
Прочитай CLAUDE.md і файли docs/superpowers/plans/:
- 2026-10-26-constructor-refactor-roadmap.md
- 2026-10-26-constructor-refactor-execution-guide.md
- 2026-10-26-constructor-refactor-s5-rules-constants.md
Якщо документи ще untracked, читай їх у вихідній папці.

Через superpowers:using-git-worktrees створи окремий worktree і власну
гілку від зафіксованого HEAD feat/constructor. Не перемикай гілку й
не редагуй робочу копію першої сесії. Зніми власний targeted baseline.

Дозволені зміни:
- lib/utils/rules/
- lib/constants/classes.ts, choices.ts, spells.ts,
  weapon-traits.ts, hero-scaling.ts
- sibling tests цих модулів
- docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s5-progress.md

Побудуй mechanic→schema/default→engine/UI/API consumer map.
Усунь підтверджені дублікати за планом, збережи public exports,
DEFAULT_RULES/parseRules/mergeRules, errors і формули HOMM/5e 2014/2024.
Consumers поза allowlist лише читай; потрібні зміни запиши для інтегратора.
Не вводь нових абстракцій, які лише обгортають наявні утиліти.

Перевір неповні/некоректні rules, patch без підстановки defaults,
array independence, disabled mechanics та міжпольові constraints.
Запусти related tests, TypeScript і lint власних змін.

Не редагуй assistant/lib/ai/hooks/harness, package/lockfile/Prisma,
загальні roadmap/README/STATUS/handoff. БД і зовнішні сервіси не потрібні.
Не інтегруй чужу сесію самостійно, merge/push/deploy не запускай.

Передай branch/base/commits/results/interfaces і залишки.
S5.4 познач як очікування перевірки об'єднаного стану після інтеграції S1.
```

## Наступна assistant-сесія — S2 після S1

```text
Працюємо українською в constructor worktree. Виконай тільки S2:
docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s2-assistant-executor.md.

Прочитай CLAUDE.md, roadmap, execution guide та фактичний checkpoint S1.
Перевір, що security fixes S1 і tracked runner доступні на твоєму HEAD.
Збережи сторонні зміни й зафіксуй start HEAD.

Виконай послідовно S2.1–S2.4: limits/statuses/typed envelope,
transaction extraction, external/effects continuation, compatibility verification.
Збережи signatures public facade, query/lock order, scoped transaction,
fresh auth, stale checks, atomic write+receipt, effect keys і no retry unknown paid.
Не звужуй snapshots і не змінюй persisted JSON — це не обсяг S2.

Для extraction використовуй existing behavioral tests; нові uncovered contracts
перевір RED→GREEN. Для locks/recovery потрібна guarded local PostgreSQL,
connection_limit=1; mock suite не замінює цей доказ.

Збережи S2 checkpoint із commits, commands/results і next task S3.1.
Не переходь до S3. Prod/prodcopy, HOMM gateway, merge/push/deploy не запускай.
```
