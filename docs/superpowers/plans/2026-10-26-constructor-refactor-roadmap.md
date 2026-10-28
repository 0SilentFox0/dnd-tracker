# Рефакторинг конструктора — дорожня карта сесій

> Для наступних сесій: це карта обсягу й залежностей. Нижче наведено окремі детальні плани S1–S10. Перед виконанням прочитати актуальний код, архітектуру, спільний контракт і checkpoint попередника. Для виконання застосувати `superpowers:executing-plans` або погоджений користувачем спосіб роботи.

**Мета:** оптимізувати `feat/constructor`, спростити відповідальності модулів, прибрати змістове дублювання констант і хуків та перевірити безпеку, з пріоритетом `lib/server/assistant/` і механік конструктора.

**Підхід:** послідовні невеликі зміни в чинній структурі директорій; спочатку відтворювані перевірки й ризики, далі декомпозиція, потім оптимізація з вимірюваннями. Чинні domain writers, battle pipeline, фабрика контенту й реєстр механік залишаються точками розширення.

**Стек:** Next.js 16, React 19, TypeScript strict, Prisma 6/PostgreSQL, TanStack Query 5, Zod 4, Vitest 4, pnpm.

**Джерела вимог:** запит користувача від 2026-10-26; `CLAUDE.md`; `docs/STATUS.md`; `docs/architecture/{ai,battle,abilities,characters,content-api}.md`; чинні специфікації конструктора від 2026-10-20, механік від 2026-10-22 та AI від 2026-10-25.


## Поточний checkpoint (2026-10-27)

S1–S9 завершені локально на `feat/constructor`, включно з S5.4/S6.4/S7.4/S8.2/S8.4/S9.5. S10: findings disposition, security regression та незалежний review виконано; підсумкові результати й межі наведено в checkpoint. [Актуальний S10 checkpoint](2026-10-26-constructor-refactor-s10-progress.md) є єдиним поточним manifest; історичні base/status notes нижче збережено як provenance. Невідстежувані деталізації планів інших сесій не редагувалися.

Відкладені structural/hardening питання мають owner/причину в S10; вони не замінюють виконані compatibility gates. HOMM/prodcopy/rollout лишаються окремими завданнями.

## Вихідний стан

Статичний огляд виконано 2026-10-26. Продуктовий код і БД під час підготовки карти не змінювалися; тести та вимірювання продуктивності не запускалися. Перелік нижче — спостереження й кандидати на дослідження, а не завершений аудит безпеки чи доведені bottlenecks.

- Worktree: `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`.
- HEAD: `73c5de1a1425e90dd4f160c1305c8138f128e72f`.
- Локальні `main`, `origin/main` і merge-base на момент огляду: `9a9224f8e0d767958a76c051e9eaad198f1598d9`; свіжість remote не перевірялася через fetch.
- `main..HEAD`: 459 комітів; `main...HEAD`: 1969 змінених шляхів, 1176 TS/TSX файлів поза `__tests__`. У diff також є дані, документація, scripts та зміни, що приходили зі злиттями. Це інвентаризація, а не список файлів для обов'язкового переписування.
- `lib/server/assistant/`: 42 TS-файли поза `__tests__`, 2958 рядків. Декомпозиція вже є; ціль — межі відповідальностей і зрозумілі контракти.
- `execute.ts` — 363 рядки: dispatch, підтвердження, авторизація, транзакційний writer, external execution, receipts, reject і reconciliation.
- `actions/handoffs.ts` — 389 рядків: навігаційні переходи, схеми, compendium read projections та action definitions.
- `actions/content-snapshot.ts` читає всі `BUNDLE_TABLES`, character refs, inventory, skills та campaign fields; бере row locks. Вузький preview потенційно оплачує широкий snapshot. Звуження потребує доказу повноти залежностей.
- `jsonContent` у `actions/content-snapshot.ts` і локальні JSON roundtrips у `actions/show.ts`, `actions/handoffs.ts` потребують звірки семантики; схожий запис ще не доводить взаємозамінність.
- `intent-store.ts`, `execute.ts`, `runs.ts`, `cleanup.ts` мають локальні TTL, deadlines, transaction limits і retention windows. Частина deadline вже є в `AI_LIMITS.requestDeadlineMs`.
- `useAssistantIntents.ts` має inline query keys та polling intervals; фабрика `aiKeys` уже існує. `useAssistantEffects.ts` використовує широку `invalidateCampaignQueries`.
- `useClassForm`, `useFeatForm` і `BackgroundForm` повторюють частину form lifecycle; `BackgroundForm` тримає submit/state в компоненті. Загальний `useCrudMutation` уже використовується класами й backgrounds.
- Великі точки механік: `useSpellBook.ts` — 491 рядок, `flows/spell-flow.ts` — 431, `participant/from-character.ts` — 311, `turn/start-end.ts` — 380, `turn/run-advance-turn-loop.ts` — 368. Розмір задає чергу читання, але не є самостійною причиною поділу.
- `scripts/constructor/assistant-check.ts` запускає browser harness із `.superpowers/sdd/2026-10-25-constructor-stage6-ai/`. Ці файли не відстежуються Git; `.superpowers/` у `.gitignore`. Відтворюваність runner у чистому checkout треба забезпечити до використання як обов'язкового критерію.
- `docs/STATUS.md` містить старі checkpoint-и T19/невидимості, а кінець `constructor-handoff.md` вже описує T20 і подальші зміни. Перед baseline звірити статус із кодом та evidence.

## Підходи та рекомендований порядок

1. **Послідовно за ризиком і залежностями — рекомендовано.** Відтворюваність → assistant authority → структура → виміряна оптимізація → механіки → UI → content/import/sync → загальна перевірка. Полегшує пошук регресій; потребує окремих checkpoint-ів.
2. **За технічними шарами:** спочатку всі константи, потім усі хуки, далі весь server. Дає великі механічні diff-и й змушує повторно відкривати ті самі домени; важче перевіряти зміст змін.
3. **Масове перенесення у `modules/<domain>`.** Архітектурний епік уже відкладений у `docs/STATUS.md` до злиття конструктора. Для цієї серії достатньо локальних меж модулів.

Після запиту на паралельний старт робоча сесія 1 виконує S1, а робоча сесія 2 — незалежні задачі S5.1–S5.3 в окремому worktree. S5.4 перевіряє об'єднаний результат. S2 залежить від завершення S1. Номер плану й номер паралельної робочої сесії відрізняються.

## Загальні обмеження

- Зберігати поточні API/MCP action ids, payloads, status/error semantics, URL, persisted JSON і підтримку HOMM та 5e. Виправлення доведеного дефекту оформляти окремою зміною з regression evidence.
- Не змінювати правила гри, defaults, формули, баланс, доступність цілей чи поведінку невидимості під виглядом рефакторингу.
- Працювати в constructor worktree. На початку сесії перевіряти branch/status; залишати зміни інших сесій. Оновлення від `main`, якщо потрібне, завершувати окремо перед новим baseline, без змішування з рефакторингом.
- У цій серії локальні DB-перевірки виконувати тільки на `constructor`, із перевіркою ОБОХ `DATABASE_URL` та `DIRECT_URL`, без друку credentials. Prod/prodcopy, rollout, push/merge/deploy та окремий HOMM gateway залишаються окремими завданнями.
- Не редагувати застосовані міграції. Якщо вимірювання доведуть необхідність індексу/DDL — винести це в окрему явно описану задачу; дотриматися RLS та expand-only вимог.
- Зберігати єдину транзакцію й з'єднання через `runContentWriteContext`/`createScopedDatabase`, порядок locks, повторну перевірку actor/token, atomic domain write + receipt та after-commit effects.
- Свіжі preconditions не читати з кешу. Скорочення reads/locks допустиме лише зі збереженням stale/cascade/ref checks для всіх зачеплених writers.
- Backend лишається authority для механік. UI повторно використовує чисті розрахунки/availability; hooks не стають другим рушієм правил.
- Константи групувати за власником і змістом: persisted statuses, runtime limits, UI polling, domain rule data. Не створювати один глобальний файл усіх чисел і не змінювати значення під час extraction.
- Використовувати чинні утиліти й хуки. Спільну абстракцію вводити для однакової семантики кількох реальних consumers; відмінні domain validation/body builders залишати в доменах.
- Один checkpoint має завершуватися робочим станом. Якщо сесія завелика — поділити на незалежні deliverables до початку змін, не залишати напівперенесений public contract.

## Детальні плани

Спочатку прочитати [спільний контракт виконання та паралельний розподіл](2026-10-26-constructor-refactor-execution-guide.md). Кожен план містить файли, interfaces, послідовні checkbox-кроки, команди перевірки, review focus і критерій завершення.

[Готові промпти](2026-10-26-constructor-refactor-session-prompts.md): S1, паралельна друга сесія S5 та наступний assistant-етап S2.

| План | Деталізація |
| --- | --- |
| S1 | [Baseline, відтворюваність і security audit](2026-10-26-constructor-refactor-s1-baseline-security.md) |
| S2 | [Assistant executor, стани та константи](2026-10-26-constructor-refactor-s2-assistant-executor.md) |
| S3 | [Вартість preview та snapshots](2026-10-26-constructor-refactor-s3-assistant-performance.md) |
| S4 | [Adapters, handoffs і run recovery](2026-10-26-constructor-refactor-s4-assistant-adapters.md) |
| S5 | [Rules, defaults і константи механік](2026-10-26-constructor-refactor-s5-rules-constants.md) |
| S6 | [Класи, choices, grants і ресурси](2026-10-26-constructor-refactor-s6-character-mechanics.md) |
| S7 | [Бойові spell/attack/turn механіки](2026-10-26-constructor-refactor-s7-battle-mechanics.md) |
| S8 | [Спільні хуки та UI](2026-10-26-constructor-refactor-s8-hooks-ui.md) |
| S9 | [Content CRUD, compendium import і source sync](2026-10-26-constructor-refactor-s9-content-import-sync.md) |
| S10 | [Фінальна регресія, security review і handoff](2026-10-26-constructor-refactor-s10-final-review.md) |

## Сесії

### S1. Baseline, відтворюваність і первинний аудит безпеки

**Межі:** `scripts/constructor/assistant-check.ts`, його synthetic fixtures/browser harness, `lib/server/assistant/test-support.ts`, API/MCP entrypoints та документи статусу. Це завершення поточної підготовки перед структурними змінами.

- [x] Зафіксувати актуальні HEAD/base, ownership змін, вже пройдені перевірки та відкриті дефекти. Відділити constructor changes від суміжних merge-змін і generated data.
- [x] Перенести потрібні runner dependencies із локальних session artifacts у tracked test-support/script directory; generated logs/screenshots тримати окремо. Runner має працювати без попередньої `.superpowers` сесії.
- [x] Скласти таблицю входів chat/MCP/session HTTP/cron: actor, campaign boundary, scopes, `sessionOnly`, validation, rate/body limits, response redaction. Перевірити секрети, provider context, source notes, signed media URLs і handoff hrefs.
- [x] Зняти цільовий baseline для assistant, rules, characters та battle; зберегти команди, exit codes, passed/skipped і умови середовища. Нові тести додавати для непокритих ризиків, а не для кожного переміщення.
- [x] Знахідки класифікувати як підтверджений дефект / гіпотеза / поліпшення структури. Підтверджені порушення authority/data isolation виправляти перед залежними extraction-ами, окремими diff-ами.

**Готово коли:** перевірки відтворюються з tracked файлів, цільові suites мають baseline, є security matrix і список залишків із evidence. Непрогнані перевірки явно позначені.

### S2. Assistant: executor, стани, константи й типи

**Залежність:** S1. **Основні файли:** `lib/server/assistant/{execute,authorize,prepare,intent-store,receipts,runs,cleanup,types}.ts`, `lib/schemas/assistant.ts`, `lib/constants/ai.ts`.

- [x] Відокремити orchestration від transaction execution та external/effects recovery; зберегти публічні exports `createAssistantExecutor`, `dispatchAction`, `confirmIntent`, `rejectIntent`, `reconcileEffects` і dependency injection.
- [x] Виділити runtime limits/retention/status groups у модулі їхніх власників; звірити значення з Zod, типами й CHECK constraints. Terminal sets intent/receipt/run можуть відрізнятися.
- [x] Для persisted external/effects envelope замінити неперевірені casts вузьким typed parsing/serialization boundary; врахувати наявні рядки БД і `Prisma.JsonNull`.
- [x] Зберегти lock order, fresh auth, provenance token recheck, stale/expiry semantics, replay/hash conflict, deletion tombstone і одну платну external operation за run.

**Перевірки:** наявні `execute`, `authorize`, `intent-store`, `effects`, `cleanup`, `runs-storage.integration`, `execution.integration` suites. Окремо: concurrent confirm, revoke під час prepare, crash до/після effect delivery, unknown external без повторного платного виклику, `stale` у retention.

**Готово коли:** зовнішні результати й збережений формат сумісні, усі ці сценарії проходять; відомо, який модуль володіє кожним переходом стану.

### S3. Assistant: вартість preview та читання контенту

**Залежність:** S2. **Основні файли:** `actions/{content-snapshot,content,content-operations,content-operation-preview,content-dependencies}.ts`, domain snapshot helpers.

- [x] Виміряти SQL count, прочитані/повернуті байти, snapshot/hash/serialization time та тривалість транзакції на однакових synthetic small/large campaigns. Порівнювати rules update, одиничний CRUD, cascade delete та source apply.
- [x] Побудувати карту refs/preconditions для кожної родини операцій. Поточний guard хешує весь snapshot: зберегти його input і conservative stale semantics; operation-specific скорочення, яке їх змінює, винести в окреме майбутнє рішення про versioning протоколу.
- [x] Перевикористати JSON normalization/hashing лише після фіксації поведінки Date/null/undefined/масивів і порядку ключів. Зберегти сумісність fingerprints pending intents.
- [x] Прибрати доведені повторні reads/serialization в одному execution scope. Не розпаралелювати SQL на одній транзакційній connection заради формального `Promise.all`.

**Перевірки:** `content-actions`, `content-operations`, `content-effects`, `content-storage.integration`, `execution.integration`; refs змінені звичайним HTTP між preview/confirm, nested refs, delete cascade, source apply. Перевірити `connection_limit=1` і rollback.

**Готово коли:** для оптимізованих шляхів є before/after measurements та той самий security/stale результат. Якщо покращення не підтверджено — не додавати складніший код.

### S4. Assistant: доменні адаптери, handoffs і run recovery

**Залежність:** S2–S3. **Основні файли:** `actions/{handoffs,characters,character-progression,battle-actions,show,campaign,scenario}.ts`, `runs.ts`, `lib/ai/{chat,tools,context}/`.

- [x] Розділити в `handoffs.ts` navigation construction, compendium read projections та catalog composition; зберегти imports/exports, які використовує `lib/ai/context/prompt.ts`.
- [x] Перевірити, що адаптери делегують чинним domain services/writers. Прибрати змістове дублювання validation, result mapping та transaction plumbing без другого action/business registry.
- [x] Перевірити run ownership, terminal mapping, usage aggregation, Stop/recover і read projections; звузити завеликі selects лише після вимірювання.
- [x] Зберегти output sanitization для обох transport-ів, bounded projection pagination і source-note disclosure. Local/paid/provider calls замінювати synthetic fixtures у звичайних перевірках.

**Перевірки:** доменні assistant suites, `transport-catalog`, `coverage`, `handoffs`, `handoff-storage.integration`, `lib/ai/chat/__tests__/assistant-run.test.ts`, `lib/ai/context/__tests__/assistant-context.test.ts`, API/MCP suites. Перевірити незмінний набір canonical/legacy action ids.

**Готово коли:** adapters мають зрозумілу domain responsibility, chat/MCP/session дають сумісні результати, recovery не повторює domain write або оплату.

### S5. Механіки: rules, константи та межі конфігурації

**Залежність:** S5.1–S5.3 дозволено паралельно із S1 у власному worktree та з власним цільовим baseline; S5.4 — після інтеграції з S1. Паралельна фаза обмежена pure rules/domain constants; schema/UI consumers поза її allowlist лише читати. **Основні файли:** `lib/utils/rules/{schema,defaults,registry,formulas}.ts`, `lib/constants/{classes,choices,spells,weapon-traits,hero-scaling}.ts`; consumer verification — `lib/schemas/`, `components/rules/`.

- [x] Побудувати карту mechanic → schema/default → engine consumer → form field → content/API/MCP input. Відрізнити immutable rule constants від campaign-editable data та UI labels.
- [x] Звести підтверджені дублікати меж/enum/options до власників; використати чинні `MECHANIC_REGISTRY`, `DEFAULT_RULES` і domain constants.
- [x] Зберегти `parseRules` fallback і `mergeRules` semantics для старих, часткових та некоректних JSON; не вводити нові defaults.
- [x] Спільні чисті formula/availability helpers використати на сервері й у preview; перевірити import boundaries, щоб серверні залежності не потрапили в client bundle.

**Перевірки:** `lib/utils/rules/__tests__/`, `lib/constants/__tests__/`, `lib/schemas/__tests__/constructor-fields.test.ts`, `components/rules/__tests__/`. Випадки: відсутня секція, disabled mechanic, HOMM, 5e 2014/2024, некоректний patch, активний бій із frozen rules.

**Готово коли:** відомий власник кожної конфігурації, defaults і збережені правила сумісні; рішення не повертають name-based hardcode.

### S6. Механіки персонажа: класи, choices, grants і ресурси

**Залежність:** S5. **Основні файли:** `lib/server/characters/{apply-classes,class-level-up,choices,operations}/`, `lib/utils/characters/{classes,choices,level-up}/`, `lib/utils/spells/{class-slots,spell-slots}.ts`, `lib/utils/battle/participant/from-character.ts`.

- [x] Відокремити завантаження campaign refs від чистого розрахунку класів/choices/resources та складання battle participant. Використати наявні preloaded contexts.
- [x] Звести спільні розрахунки choices/slots/grants між create, patch, level-up, sheet і battle snapshot; зберегти доменні відмінності та відповідальність writers.
- [x] Виміряти N+1/повторне завантаження класів, предметів, заклинань і choices для групи персонажів; оптимізувати лише підтверджені повтори.
- [x] Зберегти невідомі class refs/fallback, ASI deltas, pact/regular slots, rest pools, item grants, consumables та правила активного бою.

**Перевірки:** `apply-classes`, choices/class-slots/spell-slots suites, `participant/__tests__/from-character-*`, character create/patch/choices API suites; roundtrip rest → battle → завершення → sheet. Для зміни DB writers додати цільову локальну integration-перевірку атомарності.

**Готово коли:** sheet, preview і snapshot узгоджені з baseline; немає подвійного ASI/списання ресурсу, невідомі refs не змінюють fallback.

### S7. Бойові механіки: spell/attack/turn і продуктивність

**Залежність:** S5–S6. **Основні файли:** `lib/utils/battle/{flows,spell,attack,turn,conditions,actions,pipeline}/`, відповідні `app/api/campaigns/[id]/battles/[battleId]/` mutations.

- [x] Поділити змішані відповідальності `spell-flow.ts` і turn orchestration за наявними чистими межами: reducer, selection/availability, payload, resolution. Публічні barrels зберегти.
- [x] Перевірити дублювання calculations між server attack/spell resolver і UI flow; повторно використати наявні `collectModifiers`, `runAbilities`, cost/slot/target helpers.
- [x] Виміряти повторні обходи participants/effects/spells; локальні індекси/derived data вводити на час однієї операції, зі збереженням RNG call order і порядку ефектів.
- [x] Зберегти `runBattleMutation`, optimistic version, `snapshotHash`, delta contract, damage consequences, concentration/death saves, reactions, grapple cleanup та turn advance.

**Перевірки:** цільові spell/attack/conditions/turn suites, `flows/__tests__/spell-flow.test.ts`, pipeline/delta tests, API mutations; HOMM/5e, disabled mechanics, AoE, invalid/stale target, off-turn reaction, multiattack, pact/upcast, смерть/концентрація. Поточну невидимість перевірити як сумісність, нові правила не додавати.

**Готово коли:** детерміновані вхід/seed дають той самий результат і порядок подій; оптимізації мають measurements; persistence і client delta інваріанти проходять.

### S8. Спільні хуки та декомпозиція UI конструктора

**Залежність:** S4–S7. **Основні файли:** `lib/hooks/ai/{keys,useAssistantIntents,useAssistantEffects,useAssistantContext}.ts`, `lib/hooks/battle/useSpellBook.ts`, `lib/hooks/{classes,feats,backgrounds,common}/`, `components/{ai,classes,feats,backgrounds,choices}/`.

- [x] Перенести assistant query prefixes, workspace keys і polling constants до відповідних власників; зберегти cache identity й invalidation coverage.
- [x] Відокремити в `useSpellBook` data loading/derived selection, state orchestration та submit effects, повторно використовуючи чисті helpers S7. Зберегти зовнішній API хука.
- [x] Винести lifecycle форми backgrounds у доменний hook; спільні операції класів/рис/backgrounds будувати на `useCrudMutation`, `useAbilityValidity`, `useNavigateFresh` та чинних form primitives. Body builders лишити доменними.
- [x] Виміряти requests/refetches після receipt; звужувати широку invalidation тільки за повною картою affected/cascade dependencies, з консервативним fallback для невідомого domain.
- [x] Перевірити cleanup subscriptions/editor registrations, async response races, double submit, campaign/thread switching, disclosure reset та save-before-apply.

**Перевірки:** assistant effects/context/workspace/intent-card suites, form suites, spellbook-monster/attack-wizard hooks. Browser smoke 1440/390: rules form, class/background choices, spell flow, review/stale/receipt recovery. Заміряти render/refetch count на однаковому сценарії.

**Готово коли:** UI поведінка сумісна, components переважно рендерять, lifecycle має власника, query keys проходять через фабрики; кількість requests не зростає.

### S9. Content CRUD, імпорт, templates і source sync

**Залежність:** S3–S8. **Основні файли:** `lib/server/content/`, `lib/server/compendium-import/{adapt,service,repository,plan}.ts`, `lib/server/templates/{bundle,sync}/`, constructor schemas/resources та відповідні routes.

- [x] Перевірити узгодженість ресурсу між CRUD schema, OpenAPI, MCP та import/export; залишити чинні resource/operation registries власниками контрактів.
- [x] Декомпозувати adapter orchestration у `adapt.ts` за реальними content families, використовуючи чинний adapter registry; не дублювати normalization/ref resolution.
- [x] Перевірити campaign ownership усіх nested refs, source baseline/hash, id remapping, import idempotency, HMAC preview/confirm binding, freshness/expiry та atomic rollback.
- [x] Перевірити bounded parser на великих/глибоких JSON, небезпечних keys, HTML/URL на output boundaries; source notes не потрапляють у model/tool history без чинного явного вибору.
- [x] Профілювати великі import/sync scenarios на synthetic fixtures: queries, bytes, memory, lock duration. Індекси/DDL розглядати окремо після query evidence.

**Перевірки:** content resources/service/access/OpenAPI, compendium parse/adapters/service/http/repository.integration, templates bundle/remap/assert-no-leak, source-sync hash/apply/API. Roundtrip export → import → source update, missing refs і changed source між preview/confirm.

**Готово коли:** content families і refs проходять roundtrip; немає cross-campaign writes або часткового confirm; є виміряний результат оптимізацій.

### S10. Загальна регресія, повторний security review і handoff

**Залежність:** S1–S9.

- [x] Переглянути повний diff серії та security matrix S1: authority, scopes/sessionOnly, stale/TOCTOU, replay/unknown, data disclosure, parsers, cron, retention.
- [x] Один раз виконати повний unit/regression suite, TypeScript, lint і production build; перевірити локальні integration-сценарії для змінених DB paths та браузерні сценарії змінених UI. Full suite повторювати лише після нової зміни/збою, який цього потребує.
- [x] Зіставити baseline/final measurements: SQL count, bytes, serialization, transaction duration, refetches/renders. Навести raw results і умови вимірювання; відсутній baseline не замінювати припущенням про прискорення.
- [x] Оновити `docs/architecture/{ai,battle,abilities,characters,content-api}.md`, `docs/STATUS.md`, constructor handoff і цю карту за фактично виконаними змінами. Прибрати застарілі checkpoints без втрати відомих обмежень доказів.
- [x] Записати залишки: severity, file/сценарій, evidence, причина перенесення, наступна дія. Окремо позначити готовність до майбутнього HOMM gateway; не оголошувати його пройденим за unit fixtures.

**Готово коли:** серія має reviewable diff, сумісні контракти, свіжі перевірки з чіткими межами й відтворювані performance results. Merge/deploy залишається окремим кроком.

## Повторне використання

| Наявний механізм | Використання в серії |
| --- | --- |
| `lib/utils/api/` | `parseBody`, auth/access, ownership, same-origin, rate limits, private cache headers; не дублювати в routes |
| `lib/server/content/{service,write,write-context}.ts` | canonical writers і спільний transaction/connection context |
| `lib/utils/battle/store/stable-json.ts` | чинна canonical serialization для hash; формат не міняти без міграційної стратегії |
| `lib/utils/rules/`, `MECHANIC_REGISTRY`, domain constants | власники правил, defaults і labels |
| `lib/utils/characters/{classes,choices}/`, `lib/utils/spells/` | чисті розрахунки для server/UI/snapshot |
| `lib/hooks/common/{useCrudMutation,useNavigateFresh}.ts` | mutation/navigation lifecycle; врахувати чинний порядок async callbacks |
| `lib/hooks/{ai,classes,backgrounds,characters}/keys.ts` | query identity та invalidation prefixes |
| `components/common/states/`, `components/ui/responsive-dialog.tsx`, `components/hud/form/` | чинні loading/error/form/dialog primitives |

## Як перевіряти без зайвих прогонів

Після невеликої зміни запускати пов'язані тести, наприклад:

```sh
pnpm test:related lib/server/assistant/execute.ts
pnpm exec vitest run lib/utils/rules/__tests__
pnpm exec eslint <changed-ts-files>
pnpm exec tsc --noEmit
git diff --check
```

Значні зміни транзакцій обов'язково перевіряти на реальній локальній PostgreSQL з одним з'єднанням. Перед будь-якими DB writes перевірити ціль:

```sh
pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --check-target
```

Очікується тільки `{"database":"constructor","local":true,"bothUrls":true}`. У S1 забезпечити tracked runner dependencies; надалі запускати лише конкретні integration files, а не весь `pnpm test:integration`, який включає зовнішні Pusher/Redis сценарії. Перед використанням старої integration suite перевірити її власний target guard/fixture lifecycle.

Для фіналу: `pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, `git diff --check`. Build не є дозволом на deployment чи production migrations.

## Checkpoint кожної сесії

Оновлювати цей розділ або давати посилання на окремий tracked handoff:

1. Session id, start/end HEAD, змінені файли й відповідальності.
2. Контракти/інваріанти, які перевірено; конкретні security findings та їхній статус.
3. Commands/results: passed, failed, skipped, причина skip; local DB/browser/provider/mock межі доказів.
4. Before/after measurements з fixtures, розмірами, прогрівом і кількістю повторів. p50/p95 наводити лише за достатньої кількості вимірювань.
5. Залишки й точна наступна задача; поточний diff/commit має бути придатним до окремого review.

| Сесія | Статус | Залежності |
| --- | --- | --- |
| S1 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s1-progress.md) | — |
| S2 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s2-progress.md) | S1 |
| S3 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s3-progress.md) | S2 |
| S4 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s4-progress.md) | S2–S3 |
| S5 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s5-progress.md) | S1 (інтеграційний gate S5.4) |
| S6 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s6-progress.md) | S5 |
| S7 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s7-progress.md) | S5–S6 |
| S8 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s8-progress.md) | S4–S7 |
| S9 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s9-progress.md) | S3–S8 |
| S10 | Завершено локально — [checkpoint](2026-10-26-constructor-refactor-s10-progress.md) | S1–S9 |

Одна сесія — один тематичний checkpoint; якщо evidence показує більший обсяг, розбити її на `Sx.a`, `Sx.b` із власними результатами й оновити залежності. Десять сесій — початкове групування, не обіцянка тривалості.

## Наступний крок

S1–S10 завершено локально. Не повторювати реалізацію за історичними стартовими prompts; поточні результати, review і backlog — у [S10 checkpoint](2026-10-26-constructor-refactor-s10-progress.md) та [реєстрі findings](2026-10-27-constructor-refactor-s10-findings.md).

HOMM/prodcopy gateway, merge, push і deploy залишаються окремим завданням; цей roadmap не дає дозволу їх запускати. Перед майбутнім gateway потрібні свіжа локальна prodcopy, еталонне порівняння HOMM, battle-sweep і живі DM/player сценарії за загальним constructor spec.
