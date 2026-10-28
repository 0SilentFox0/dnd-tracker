# Відтворювана перевірка assistant

Запускати з кореня checkout після `pnpm install --frozen-lockfile` та генерації Prisma client. Потрібні Node 22+ (глобальний WebSocket), локальна PostgreSQL із уже застосованими constructor migrations і Google Chrome. На macOS використовується стандартний шлях Chrome; в іншому середовищі передати абсолютний `CHROME_BIN`.

```sh
pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --check-target
ASSISTANT_CHECK_RUN_ID=s1-local-unique-marker pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --run
```

Guard приймає **обидва** `DATABASE_URL` і `DIRECT_URL` лише для `constructor` на loopback:54322. Runner встановлює `connection_limit=1` для обох до створення client/дочірніх тестів. Він не застосовує міграцій, не викликає prod/prodcopy, provider, Storage, Pusher чи Redis. `execution.integration.test.ts` перевіряє реальні locks/rollback/ownership/receipt idempotency; auth route mock і after-commit integrations залишаються synthetic.

Tracked fixture — `fixtures/campaign.synthetic.ts` (існував до S1). Кожен fixture має випадковий suffix і явний run marker. Cleanup працює з конкретними campaign/user ids, перевіряє ownership і зберігає чужі дані. Runner лише рахує залишки свого marker; не виконує глобальних delete. При аварійному завершенні тестового процесу можливі залишки: не видаляти за широким prefix без перевірки ownership.

`app.tsx` бандлить справжні AssistantWorkspace/AssistantHandoff із deterministic synthetic HTTP. `server.mjs` збирає JS через esbuild із зафіксованої залежності tsx та CSS через PostCSS/Tailwind; попередні `.next` чи `.superpowers` не потрібні. `check.mjs` перевіряє 9 сценаріїв на 1440/390 px. Це доказ UI/response mapping; labels fixture не доводять покриття відповідних domain writers.

Output створюється в **новому** `.superpowers/assistant-check/<runId>-<random>/`: логи, bundle/CSS, process metadata, `browser.json`, screenshots, окремий Chrome profile. Усе ignored; не додавати ці файли до Git. `.superpowers` використовується тільки як output. Ні credentials, ні session cookies не передаються в browser subprocesses. У кожного запуску власні ephemeral HTTP/CDP ports і новий profile; runner перевіряє pid свого child, а harness завершує лише свій Chrome при SIGTERM/SIGINT/IPC disconnect. Runner перевіряє відсутність цього Chrome після завершення.

Окреме складання без DB/Chrome: створити нову абсолютну output directory і виконати `node scripts/constructor/assistant-browser/server.mjs /absolute/output --bundle-only`. При помилці runner друкує тільки безпечний код і шлях до ignored evidence; raw DB/provider exceptions у stdout не потрапляють.
