# S1 — baseline, відтворюваність, первинний аудит

Дата: 2026-10-26. Обсяг: тільки S1 дорожньої карти; S2 не почато.

## Початковий стан

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, `feat/constructor` (наявний linked worktree).
- Start HEAD `73c5de1a1425e90dd4f160c1305c8138f128e72f`; merge-base й локальний `main` — `9a9224f8e0d767958a76c051e9eaad198f1598d9`. S1 не виконувала fetch/merge. End code HEAD — `5c2d7e7d` (checkpoint docs commit іде наступним).
- Сторонні зміни на старті: modified `docs/superpowers/README.md`, untracked `docs/superpowers/plans/2026-10-26-constructor-refactor-roadmap.md`. Не редагувати й не включати до комітів S1: користувач продовжує деталізацію планів.
- Різниця всієї гілки з main включає constructor, суміжні merge-зміни та generated SRD data. S1 review обмежений diff від start HEAD; механіки й generated data не змінюються.
- T19/T20 у handoff — історичні свідчення, а не свіжі результати. STATUS має застарілі згадки про зупинку перед T16/T20; звірити в checkpoint S1.

## Послідовність S1

1. Baseline Git, документації та цільових unit suites.
2. Tracked browser harness і synthetic fixtures; окремий output, перевірка процесів і cleanup власних fixtures.
3. Security matrix chat/MCP/session HTTP/cron; підтверджені дефекти окремими diff/комітами з RED→GREEN.
4. Guarded local constructor execution із `connection_limit=1`, synthetic browser, TypeScript/lint та diff review.
5. Оновити цей checkpoint, STATUS, architecture і handoff; зупинитися перед S2.

Ruling: чинний linked worktree та явний запит користувача задають місце виконання; нового worktree не створювати. Дорожня карта є scope/spec для S1, її незавершену деталізацію не переписувати. Ціна помилки — лише невідповідність майбутньому детальному плану; контракти не змінювати.

## Свіжі перевірки (початкові)

| Команда | Exit | Passed / failed / skipped | Межі |
| --- | --- | --- | --- |
| `pnpm exec vitest run lib/server/assistant lib/ai app/api/__tests__/assistant-cleanup-cron.test.ts app/api/__tests__/assistant-mcp.test.ts app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-context-api.test.ts app/api/__tests__/assistant-run-api.test.ts app/api/__tests__/api-tokens-mcp.test.ts` | 0 | 399 / 0 / 0, 55 файлів | Default config виключає integration; DB/provider/мережа mocked |
| `pnpm exec vitest run lib/utils/rules lib/constants/__tests__ lib/schemas/__tests__/constructor-fields.test.ts components/rules/__tests__ lib/utils/characters lib/server/characters 'app/api/campaigns/[id]/characters' lib/utils/battle` | 0 | 2597 / 0 / 0, 382 файли | Цільовий baseline механік, не HOMM gateway |
| `pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --check-target` | 1 → 0 | sandbox IPC EPERM → обидва local constructor | Повтор з escalation; URLs/credentials не друкувалися; DB writes відсутні |

Локальні необов'язкові логи S1: `.superpowers/sdd/2026-10-26-constructor-refactor-s1/`; не додавати до Git.

## Ownership та виконані задачі

Під час роботи з'явилися детальні S1–S10 та execution guide. Це стороння незавершена документація: не редагувалася й не включається в commits S1. Checkpoint перенесено у визначений guide шлях `plans/2026-10-26-constructor-refactor-s1-progress.md`. Паралельна S5.1–S5.3 володіє rules/constants і власним progress; S1 ці файли не змінює й її worktree не інтегрує.

**Зовнішня зміна HEAD:** під час S1 інша сесія додала merge `21ee22e5` із S5 commits `95181e74`/`70825040`. S1 цього merge не запускала й не скасовувала. Rules/constants diff та S5 progress не належать S1. Початковий full8113 почався20:03:53, до merge20:07:56; фінальний full8127 і build нижче виконано після merge та review fix. Так evidence відокремлено від результатів лише S1.

Inventory на start HEAD проти локального main: 459 commits, з них 8 merges; 1969 paths = application/config/tests/assets 1707, scripts 168, docs 64, Prisma 20, data 10. Це категорії шляхів, не твердження про ексклюзивне авторство конструктора. Merges включають ranged combat/scenario manuscript, stash/player drafts, AI та scenario play/FX. Generated SRD/library data, міграції й ці суміжні підсистеми залишено без змін. Для review S1 використовується start HEAD, а не всі 459 commits.

- **1.1:** baseline/ownership зафіксовано; STATUS/handoff звірено з T20 cleanup route й чинною UI-проєкцією invisible у `deriveMapScene`. Історичні claims не замінюють свіжих тестів.
- **1.2:** tracked `scripts/constructor/assistant-check/{browser-app.tsx,browser-server.mjs,browser-check.mjs,preflight.ts,README.md}`; `--check-target`/`--run` збережено, додано `--output-dir` і `--chrome-path`. `fixtures/campaign.synthetic.ts` уже був tracked, повторного fixture не створено. Sources визначаються від script location; outputs/profile — у новій directory під output root. Нема читання старих `.superpowers` artifacts чи залежності від `.next`; CSS збирається з tracked `app/globals.css`.
- **1.3:** security matrix нижче, три доведені disclosure/body defects виправлено окремими security commits. Наявні negative suites покривають wrong campaign, revoke, втрату DM, sessionOnly, Bearer confirmation та owner-only deletion receipt; дублікати tests заради назв не додавалися.
- **1.4:** цільові baseline та ширший unit baseline після зміни dependency; фінальні DB/browser/quality checks наведено нижче. Структурні зміни S2 не починалися.

Ruling: у деталізації згадано `scripts/constructor/package.json`, але nested package/workspace у репозиторії немає. Пряму devDependency `esbuild: 0.27.3` додано до чинного root `package.json` та єдиного lockfile importer; жодна інша версія не оновлена. Ціна помилки — ширший root devDependency footprint; full suite/build перевіряють цей ризик.

Ruling: CSS компілюється PostCSS/Tailwind у harness, тому build не є його prerequisite. Це прибирає приховану залежність від попередньої `.next`; окремий production build усе одно входить у перевірку dependency change. Ціна помилки — browser CSS може відрізнятися від Next packaging; screenshot smoke не доводить pixel parity production.

## Security matrix

Це первинний audit entrypoints і спільних authority/output boundaries, не повторний повний review всіх domain writers. Шляхи нижче — від кореня repo. Negative tests виконані свіжим unit suite; real transaction evidence — лише named local integration.

| Вхід / код | Actor, campaign/owner boundary, scopes / sessionOnly | Validation, rate/body limits | Outputs / свіже evidence |
| --- | --- | --- | --- |
| Chat POST `app/api/campaigns/[id]/ai/threads/[threadId]/chat/route.ts` → `ai-handlers.ts` → `lib/ai/chat/run-chat.ts` | Cookie DM через `aiGuard/requireDM`; `loadThread(campaignId,userId,threadId)`; caller створює server, не model. `beginAssistantRun.own` повторює live DM і thread owner. Session scopes=null; model не має confirm/set-auto | strict `chatRequestSchema`/focus/sessionContext, stable requestId+hash, active run/thread lease; `AI_LIMITS` maxSteps/history/deadline 270s, retries=0. Окремого request-rate/streaming body byte limit немає; Zod limits діють після `req.json()` | Provider key — тільки `loadApiKey`→model, safe error mapping/status logs. Context projections + history тепер sanitized, no-store успішних stream/recovery. `run-chat.test.ts`, `assistant-run.test.ts`, `assistant-context.test.ts` |
| Chat GET/DELETE recovery, `ai-handlers.ts`, `lib/server/assistant/runs.ts` | `requireDM`, `own` з campaign+user+thread; requestId не є actor/run grant. Cookie session, не Bearer transport | requestId regex, bounded runs/receipts/history; DELETE змінює лише abortRequested. Окремого rate limit немає | private/no-store; recovery не повторює domain write або оплату; unknown не звільняє active claim. `assistant-run-api.test.ts`, `assistant-run.test.ts`; решта runs-storage integration у S1 не запускалася |
| MCP GET/POST/DELETE `app/api/mcp/route.ts` | Лише verified Bearer, cookie fallback відсутній. `verifyApiToken` перевіряє hash/revoked/current DM; campaign з token row. `toolsFor` фільтрує scopes, `callerOf` не приймає model identity; canonical і legacy aliases йдуть через executor | Zod tool schemas, bounded projection, req.signal+270s. **До fix:** wrapper preparse обходив SDK 4MiB. **Тепер:** `lib/ai/mcp-request.ts` рахує bytes і зупиняє stream перед parsing. Окремого MCP request-rate limit немає | v2 JSON envelope, safe unknown errors, `publicToolData`, без raw credentials/signed media. `api-tokens-mcp.test.ts` (auth/scopes, 4MiB boundary/UTF-8/headerless cancellation), `assistant-mcp.test.ts`, tools/assistant suites |
| Session list/detail/receipt/confirm/reject/policy `lib/server/assistant/http.ts` та `app/api/campaigns/[id]/assistant/**` | Authorization header відхиляється; requireDM, campaign+user owners; mutation потребує same-origin. Confirm лише session DM. Tombstone receipt виняток: requireAuth + точні user/campaign/intent + applied campaign.delete, повертає тільки id/status/deleted | bounded ids/cursor/limit/status, policy strict Zod, read 120/min, mutations 20/min з memoryFallback; confirm/reject body ігнорується, policy `parseBody` без окремого byte cap | private/no-store включно з auth/rate/errors; exceptions не логуються raw. `assistant-intents-api.test.ts`, `authorize.test.ts`, `execution.integration.test.ts` owner-only tombstone |
| Context preview POST/source-notes GET `lib/server/assistant/context-http.ts` | Bearer заборонений, session DM; POST same-origin, власний thread; notes reads scoped campaign/current DM | strict preview/sessionContext, max5 unique selected note keys, notes options pages20; preview20/min, notes120/min memoryFallback. POST Zod після `req.json()` без streaming cap | Preview повертає disclosure labels/count/provider/model, не текст. Notes options — тільки key/title; текст лише в `buildInstructions` через session UI selection. `assistant-context-api.test.ts`, `assistant-context.test.ts`, `handoffs.test.ts` |
| Спільний write boundary `lib/server/assistant/{authorize,execute}.ts` | `authorizeAssistant` перевіряє original+live scopes/membership. prepare sessionOnly intent дозволено, token execute заборонено. Confirm повторює originating token id/user/campaign/revoked/scopes під lock перед writer; input не задає actor | saved payload повторно валідовано; fresh prepare/precondition hash, expiry/status/replay checks. Scoped transaction/connection, lock order і domain writer+receipt atomicity збережені | Тільки writer result/receipt; status не виконує paid action. `execute.test.ts`, `authorize.test.ts`; real local `execution.integration.test.ts`6/6: concurrent confirm, HTTP-vs-preview stale, new ref stale, tombstone, revoke during prepare, effect retry |
| Handoffs/compendium `lib/server/assistant/actions/handoffs.ts`, `lib/schemas/assistant-handoff.ts` | ID regex, allowlisted relative paths; link не дає дозволів. Foreign deck id може утворити link, але destination `app/campaigns/[id]/dm/show/[deckId]/page.tsx` робить requireCampaignDM+deck campaign lookup. Token compendium reads → handoff | strict schemas, bounded projections, model не може передати selectedKeys у handoff. Note text helper sessionOnly і перевіряє current DM+campaign+exact selected keys; notes action відсутній у catalog | Без raw book/sourceJson/credentials/upload URLs. `handoffs.test.ts` та context tests; destination перевірено статично, runtime destination/browser auth не моделювався |
| Cron GET `app/api/cron/assistant-cleanup/route.ts` | Точний `Authorization: Bearer CRON_SECRET`; missing secret503, mismatch401; не приймає user/campaign params | Body не читається; фіксована retention operation, без request-rate limit | Тільки counts, unknown failure500 без raw exception. `assistant-cleanup-cron.test.ts`, `cleanup.test.ts`; зовнішній cron і prod env не викликалися |
| Суміжні legacy settings/threads/proposals, credentials | `ai-handlers.ts`: requireDM, thread reads/updates campaign+user; proposals campaign-scoped. `credential-handlers.ts`: requireAuth, credentials user+provider. REST content `resolveActor`: Authorization без cookie fallback, campaign binding, `sessionOnly` | Existing schemas/domain guards; legacy `parseBody` без streaming cap, загального rate limit немає. Ці native UI writers не переведені в новий contract | Credential summaries select only provider/last4/model/date; encrypted DB storage, token plaintext лише одноразовий create. `lib/ai` suite й token tests; live provider verification не викликалася |

Same-origin у session assistant mutations перевіряється локально; для решти native routes чинний proxy (`lib/supabase/middleware.ts`) відхиляє cross-origin mutations з Origin. Bearer CSRF exemption застосовується до API загалом; chat читає тільки cookie identity й не отримує token privileges. Browser-level CORS/CSRF penetration test у S1 не проводився.

## Підтверджені дефекти та disposition

| ID / severity | Файл / сценарій / evidence | Виправлення |
| --- | --- | --- |
| S1-SEC-01 **Medium**, disclosure | `lib/ai/tools/projection.ts`: `HTTPS://…/object/sign/…?token=PRIVATE_SIGNATURE` та mixed-case scheme проходили case-sensitive regexp; serialized tool output містив signature. Два RED tests у `lib/ai/tools/__tests__/assistant.test.ts` | Regexp case-insensitive. Обидва transport-и й context projection використовують цю межу. GREEN; commit `ef90aaba` |
| S1-SEC-02 **High**, provider disclosure | `lib/ai/chat/run-chat.ts`: недавній historical tool result із lowercase signed URL передавався в `convertToModelMessages` після лише compaction. Regression перехопив справжній prompt на MockLanguageModelV4 і побачив `PRIVATE_SIGNATURE` у tool-result | `publicToolData` перед model message conversion. Stored JSON не переписується, що перевіряє тест. GREEN; той самий окремий disclosure commit `ef90aaba`. Це synthetic доказ дефекту, не твердження про інцидент у production |
| S1-SEC-03 **Medium**, authenticated availability | `app/api/mcp/route.ts`: встановлений `mcp-handler/dist/index.mjs` робить `req.clone().json()` і передає parsedBody у SDK, через що його bounded reader пропускається. RED: declared4194305 і headerless ~10MiB JSON обидва200 замість413 | Перед wrapper додано byte-bounded stream read/cancel, 4MiB як default установленого SDK. Малий/malformed JSON і valid exact-limit contracts перевірені; oversized повертає SDK-shaped JSON-RPC413. GREEN; commit `7efcb07e` |

Підтверджених невиправлених authority/data-isolation blocker у перевірених entrypoints не знайдено. Це не доказ відсутності всіх вразливостей у гілці.

## Гіпотези, structural та залишки

- **Potential Medium / hardening, не доведений exploit:** chat/MCP і деякі legacy session routes не мають окремого request-rate limit; chat/context/policy/credentials використовують `req.json()` до Zod limits. Наявність цього gap підтверджена кодом, але DoS/provider-cost вплив не вимірювався. MCP byte bypass закрито окремо; спільний `parseBody` та нові QoS limits без визначеного contract у S1 не змінювалися. Наступна дія: окрема задача з узгодженими byte/rate budgets та streaming/abuse tests, без змішування з extraction S2.
- **Structural:** велика різниця гілки й snapshots, TTL/стани, широкі reads/invalidation — кандидати S2–S4/S8; bottlenecks не виміряні. Performance baseline/p50/p95/SQL traffic — **unavailable**, прискорення не заявляється.
- **Low / tooling limit:** SIGKILL/crash integration worker може залишити власні fixtures; runner fail-closed рахує leftovers, не видаляє чужі дані широким prefix. Самовільний глобальний cleanup не додавався. Browser graceful success перевіряє власний Chrome stopped; аварії ОС/kill -9 окремо не тестувалися.
- Live provider/Storage/Pusher/Redis, реальний HTTP auth/browser через Next, інші assistant storage integration files, production cron та HOMM gateway — **не запускалися**. Synthetic UI18/18 не є end-to-end доказом server authority або всіх domain actions.

## Верифікація після змін

| Команда / evidence | Exit | Passed / failed / skipped | Умови |
| --- | --- | --- | --- |
| Disclosure RED: `pnpm exec vitest run lib/ai/tools/__tests__/assistant.test.ts lib/ai/chat/__tests__/run-chat.test.ts` | 1 | 27 / 3 / 0 | Усі3 failures — фактична наявність signature, без provider network |
| Disclosure GREEN: та сама команда + `lib/ai/context/__tests__/assistant-context.test.ts` | 0 | 45 / 0 / 0 | Case-insensitive tools/context + historical provider prompt; stored fixture незмінений |
| MCP RED: `pnpm exec vitest run app/api/__tests__/api-tokens-mcp.test.ts` | 1 | 18 / 2 / 0 | Обидва oversized cases помилково200 |
| MCP GREEN: `pnpm exec vitest run app/api/__tests__/api-tokens-mcp.test.ts app/api/__tests__/assistant-mcp.test.ts` | 0 | 24 / 0 / 0 | 4MiB exact200, UTF-8 oversized413, headerless cancelled early, malformed400 |
| Preflight: `pnpm exec vitest run scripts/constructor/assistant-check/__tests__/preflight.test.ts lib/server/assistant/__tests__/test-support.test.ts` | 1 → 0 | RED2failed+5passed → GREEN7/0/0 | Output/source overlap, unavailable/non-executable Chrome, malformed flags; both-URL guard. Початковий module-missing run також exit1, не рахувався behavioral RED |
| `pnpm exec vitest run 'app/api/campaigns/[id]/battles' lib/utils/spells/__tests__/class-slots.test.ts lib/utils/spells/__tests__/spell-slots.test.ts` | 0 | 34 / 0 / 0, 3 files | Доповнення battle API/class slots baseline |
| `pnpm test:run` | 0 | **8113 / 0 / 0**, 1257 files | Один повний default suite через direct dependency change; integration files excluded |
| Фінальний `pnpm test:run` після зовнішньої S5 інтеграції й review fix | 0 | **8127 / 0 / 0**, 1259 files | Стабільний сумарний стан: +12 S5 compatibility tests та +2 report regressions; integration excluded. Повтор обґрунтований новими змінами |
| Named S1.3: `pnpm exec vitest run lib/server/assistant/__tests__/authorize.test.ts lib/server/assistant/__tests__/handoffs.test.ts app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-mcp.test.ts app/api/__tests__/assistant-cleanup-cron.test.ts` | 0 | 40 / 0 / 0, 5files | Після зовнішнього merge |
| Named S1.4: `pnpm exec vitest run lib/server/assistant/__tests__ lib/utils/rules/__tests__ lib/server/characters/__tests__ lib/utils/battle/participant/__tests__ lib/utils/battle/turn/__tests__` | 0 | 554 / 0 / 0, 85files | Поточний сумарний baseline, не окремий mechanics refactor |
| Review-fix: `pnpm exec vitest run scripts/constructor/assistant-check/__tests__ lib/server/assistant/__tests__/test-support.test.ts` | 1 → 0 | RED2failed → GREEN9/0/0 | Actual integration counts; skip/empty/failure/malformed report не стають PASS |
| `pnpm exec tsc --noEmit` | 2 → 0 | — | Перший перенос виявив зайве kind у fixture props та missing NODE_ENV у child env. Виправлено; final exit0 |
| `pnpm exec eslint` для всіх змінених TS/TSX/MJS | 0 після fixes | 0 errors / 0 warnings | Початкові warning у перенесеному check і padding error у новому helper усунено |
| `pnpm build` | 143 (SIGTERM завислого sandbox run) → 0 → final0 | Compile16.2s/38pages; final7.9s/38pages | Перший sandbox compile завис; тільки власний Next PID91178 зупинено SIGTERM після перевірки parent/process. Повтори з escalation, без deploy/migrations. Фінальний build після S5 merge/review change |
| `git diff --check` | 0 | — | Перед окремими commits і checkpoint |

Runtime: Node22.0.0, Vitest4.0.18, pnpm9.15.5; звичайний suite має existing Node DEP0040 punycode warnings та очікувані synthetic error logs. Нові production credentials/payloads не записувалися.

Локальні DB/browser запуски:

1. `ASSISTANT_CHECK_RUN_ID=s1-20261026-baseline pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --run` — exit0, integration6/6, browser18/18, migrations41→41, leftovers `[0,0,0,0,0]`.
2. Clean checkout: `git archive HEAD` (`aaf4abb7`) у нову `/tmp/assistant-s1-checkout-P5sxD1`, тільки symlink installed node_modules; `.env.local` не копіювався, передано абсолютний env-file з вихідного worktree. Та сама CLI `--run`, marker `s1-clean-checkout-20261026` — exit0,6/6+18/18,41→41,zero leftovers. На старті checkout не мав `.superpowers` чи `.next`.
3. Фінальний harness: `ASSISTANT_CHECK_RUN_ID=s1-final-20261026 pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --run --output-dir .superpowers/refactor/s1 --chrome-path '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'` — exit0,6/6+18/18,41→41,zero leftovers. Фактичний output `.superpowers/refactor/s1/s1-final-20261026-UxXsaS/` ignored. Chrome ownership/termination перевірено самим runner.
4. Повтор clean checkout з archive `14d2cd7b` у `/tmp/assistant-s1-checkout-d3qXn1` — exit0,6/6+18/18,41→41,zero leftovers; попередніх artifacts немає. Це підтверджує source closure після rename/CLI/direct dependency alignment.
5. Після review fix та сама команда з п.3 — exit0; фактичний JSON: integration `{total:6,passed:6,failed:0,skipped:0}`, browser `{total:18,passed:18,failed:0,skipped:0}`. Migrations41→41, leftovers `[0,0,0,0,0]`. Output `.superpowers/refactor/s1/s1-final-20261026-WabPvk/`; JSON reporters, raw logs і screenshots/profile ignored. Попередні запуски звірено з реальними логами; їхній старий hardcoded summary сам по собі не вважався доказом6pass.

Кожен DB запуск має guard обох URL **в runner і suite**, тільки loopback:54322/constructor, `connection_limit=1` встановлено для DATABASE_URL і DIRECT_URL до client/child test. Міграції не застосовувалися. Реальними є SQL/locks/domain data+receipts; requireDM route stub, Pusher/runtime effects mocked. Жодного live provider/Storage/Pusher/Redis виклику. DB outputs не містять connection strings.

Для dependency install: offline спроби завершилися exit1 (`UNEXPECTED_STORE` у sandbox, потім missing offline registry metadata). `pnpm add -D -E esbuild@0.27.3 --prefer-offline --store-dir /Users/silentfox/Library/pnpm/store/v3` з escalation — exit0, downloaded0; зміни тільки root importer, версії інших packages незмінні. Мережевий доступ для package metadata не є provider/Storage/DB викликом.

CLI unavailable-browser перевірено додатково справжнім subprocess `node --import tsx scripts/constructor/assistant-check.ts --run --chrome-path /tmp/assistant-browser-does-not-exist` із synthetic local URLs: exit1, тільки `ASSISTANT_CHROME_UNAVAILABLE`, до DB init; stdout порожній. Перевірка snapshots/fixtures не перетворює missing prerequisites на PASS.

## Review, commits і наступний крок

Один незалежний read-only review за `requesting-code-review` перевірив лише S1 range/files і checkpoint. Знайдено **P2 tooling defect**: hardcoded integration6/6 міг приховати skip при exit0. Regression2RED → machine-readable reports + fail-on-skip/empty →9GREEN; фінальний full8127, tsc/lint/build і реальний runner з actual counts пройшли. Другого review не запускали. Інших підтверджених S1 authority/output blocker reviewer не виявив.

Ruling: review всього constructor branch замінено review лише S1 diff від start HEAD, бо користувач обмежив сесію S1, а гілка містить459 попередніх commits і паралельну S5. Ціна помилки — цей review не дає гарантій про всі попередні domain writers; це явно лишається майбутньому review/gateway.

Reviewer не перевіряв незалежно actual DB/browser/build results; live integrations/cron/HOMM, browser auth/CORS/CSRF/CSS parity, усі storage suites/domain writers, performance/abuse/OS crash cleanup, S5 та planning docs. **Ruling:** ці межі лишаються явно неперевіреними, а не PASS; S1 використовує власне fresh command evidence для named suites і первинний scope audit. Ціна помилки — загальна готовність до merge/prod із цього checkpoint не випливає. Відкладених minor findings reviewer не залишив.

Окремі S1 commits:

- `aaf4abb7` — перший tracked harness та safe ignored outputs.
- `ef90aaba` — SEC-01/02 disclosure fix + regression.
- `7efcb07e` — SEC-03 bounded MCP preparse + regression.
- `14d2cd7b` — узгоджені source paths, CLI preflight/options, direct esbuild dependency.
- `5c2d7e7d` — actual reports, reject skips/empty + regression.
- Checkpoint/docs commit — цей progress, architecture/STATUS/handoff; сторонні плани/README не включати.

**S1 завершено локально.** Наступна залежна задача — **S2.1**, лише в новій сесії за її планом. Для S5 потрібне окреме формальне закриття **S5.4** інтегратором; S1 зберігає сумарну regression evidence, але не виконує її implementation tasks. Окрема hardening задача з byte/rate budgets описана вище. S2, prod/prodcopy, HOMM gateway, merge/push/deploy цією сесією не запускалися.
