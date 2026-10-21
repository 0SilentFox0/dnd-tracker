# AI-асистент ДМ: ключі провайдерів, чат зі сценарієм і живий режим, MCP (дизайн)

## Context

Сценарій живе в застосунку (редактор «Сценарій», режим гри, «Показ»). ДМ хоче мати AI-помічника, підключеного власним ключем (Claude, ChatGPT, Gemini):

1. **Сценарій:** редагувати текст і пропонувати ідеї на сторінці сценарію.
2. **Живий режим:** чат під час гри, який знає поточну сцену й швидко відповідає на питання ДМ.
3. **Згодом** (після відкритого API конструктора) — створювати юнітів, персонажів, артефакти, спели, скіли тими самими інструментами.

Спека конструктора (`2026-10-20-campaign-constructor-design.md`) ставила вбудований AI на етап 6 на MCP-інструментах. Ця спека робить його раніше, але на тій самій основі: один реєстр інструментів, який і чат, і зовнішній MCP використовують однаково. Етап 2 конструктора лише додасть у реєстр інструменти створення сутностей.

**Рішення користувача:**
- правки сценарію — тільки пропозиції з підтвердженням ДМ («було → стало», «Застосувати» / «Відхилити»);
- один реєстр інструментів: вбудований чат викликає його напряму, той самий реєстр відкрито як MCP-сервер `/api/mcp` за токеном кампанії;
- ключі належать користувачеві-ДМ, кілька провайдерів одночасно, зашифровані на сервері, перемикач провайдера/моделі в чаті;
- автоконтекст живого режиму: сторінка сценарію, партія, показ (бій — лише через інструмент);
- історія — треди в БД.

Користується асистентом тільки ДМ; гравці його не бачать.

## Підхід: Vercel AI SDK + прямі провайдери з ключем ДМ

Пакети `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/react`, `mcp-handler` 2.x (+ `@modelcontextprotocol/server` 2.x як його peer). На кожен запит сервер розшифровує ключ ДМ і створює провайдера (`createAnthropic({ apiKey })` тощо), `streamText` з інструментами, на клієнті `useChat`.

Відкинуто:
- **Vercel AI Gateway з BYOK** — BYOK налаштовується на команду Vercel, а не на окремого ДМ; зайвий посередник для моделі «кожен ДМ платить своїм ключем».
- **Власні fetch-адаптери** — три різні формати стрімінгу й tool-calls без жодної переваги над AI SDK.

Перед реалізацією звірити API AI SDK зі встановленою версією (`node_modules/ai/docs/`), а не з пам'яттю: AI SDK 7 вимагає Node ≥ 22 і ESM.

## Що перевикористовується

- Доступ і помилки: `requireDM`, `requireAuth`, `parseBody`, `errorResponse` + `API_ERRORS`, `handleApiError` (`lib/utils/api`).
- Сценарій: `readContent`/`contentWrite`/`toPage`/`listPages` (`lib/server/scenario/page-store.ts`), `snapshotIfDue`/`pruneVersions` (`versions.ts`), `scenarioContentSchema`, `newId`, `docText`, `EMPTY_DOC`; SQL-пошук сценарію виноситься з маршруту в `lib/server/scenario/search.ts`, щоб його викликали і маршрут, і інструмент.
- Показ: `readShowState`; бій: `loadBattle` (`lib/utils/battle/store`), `BattleStatus`; довідник: `getCachedUnits`/`getCachedSpells`/`getCachedRaces`.
- Клієнт: `campaignGet/Post/Patch/…` (`lib/api/client.ts`), `useOptionalNotify`/`useConfirm`, `QueryState`/`EmptyState`/`LoadingState`, `HudPage`/`HudCard`/`HudPanel`, `ResponsiveDialog`, `ScenarioRichText` для «було → стало».
- Нове, бо аналогів немає: шифрування секретів, адаптер провайдерів, реєстр інструментів, markdown-діалект (наявний `docText` дає лише плоский текст і губить розмітку), операції пропозицій.

## Модель даних (міграція expand-only)

Нові таблиці, у кожній `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`).

- **`ai_credentials`** — `id`, `userId` (FK `users`, cascade), `provider` (`anthropic|openai|google`), `ciphertext`, `iv`, `authTag` (base64 TEXT), `keyVersion INT`, `last4`, `defaultModel TEXT NULL`, `createdAt`, `updatedAt`; `@@unique([userId, provider])`.
- **`ai_threads`** — `id`, `campaignId` (cascade), `userId`, `mode` (`scenario|live`), `scenarioPageId TEXT NULL` (FK `ON DELETE SET NULL`), `title`, `provider`, `model`, `createdAt`, `updatedAt`; індекс `[campaignId, userId, updatedAt]`.
- **`ai_messages`** — `id`, `threadId` (cascade), `seq INT`, `role` (`user|assistant`), `parts JSONB` (формат `UIMessage.parts` AI SDK: текст, виклики інструментів, результати), `metadata JSONB` (`usage`: input/output токени, `model`), `createdAt`; `@@unique([threadId, seq])`.
- **`ai_proposals`** — `id`, `campaignId`, `threadId TEXT NULL` (null для пропозицій з MCP), `pageId` (FK `scenario_pages`, cascade), `ops JSONB`, `summary TEXT`, `status` (`pending|applied|rejected|stale`), `appliedVersion INT NULL`, `createdAt`, `updatedAt`; індекс `[pageId, status]`.
- **`api_tokens`** — `id`, `campaignId` (cascade), `userId`, `name`, `tokenHash` (sha256 hex, unique), `prefix` (перші 8 символів для показу), `scopes TEXT[]` (зараз лише `ai`), `lastUsedAt NULL`, `revokedAt NULL`, `createdAt`. Ту саму таблицю використає етап 2 конструктора (відкрите API).

Константи (провайдери, режими, статуси, моделі) — `lib/constants/ai.ts`; типи — `types/ai.ts`; Zod-схеми — `lib/schemas/ai.ts`.

## Безпека ключів

- `lib/ai/crypto.ts` (`server-only`): AES-256-GCM, майстер-ключ `AI_KEYS_SECRET` (32 байти base64, env Vercel Production/Preview + `.env.local`). `keyVersion` = 1; для ротації `AI_KEYS_SECRET_PREV` розшифровує записи старої версії, нові пишуться поточною.
- Розшифровка тільки всередині запиту до провайдера; ключ не потрапляє в логи, Pusher, відповіді, помилки (тексти помилок провайдера фільтруються від рядка ключа).
- `GET` ключів повертає `{ provider, last4, defaultModel, updatedAt }`.
- Збереження ключа перевіряє його дешевим запитом до провайдера (список моделей); невалідний → 400 з українським текстом із `lib/constants/api-errors.ts`.
- Без `AI_KEYS_SECRET` усі AI-маршрути → 503 («AI-асистент не налаштований на сервері»), UI ховає кнопку AI.
- Токени MCP: генерується 32 випадкові байти (`dndt_` + base64url), у БД лише sha256; показ один раз.

## API (маршрути тонкі, логіка в `lib/ai/*`)

Ключі (рівень користувача, `requireAuth`):
- `GET /api/ai/credentials`, `PUT /api/ai/credentials/[provider]` (`{ apiKey, defaultModel? }`), `PATCH` (лише `defaultModel`), `DELETE`.

Кампанія (`requireDM`):
- `GET/POST /api/campaigns/[id]/ai/threads` (фільтр `?pageId=`), `PATCH/DELETE …/threads/[threadId]` (назва, провайдер, модель), `GET …/threads/[threadId]/messages`.
- `POST …/threads/[threadId]/chat` — стрім (див. «Чат»).
- `GET …/ai/proposals?pageId=&status=pending`, `POST …/ai/proposals/[proposalId]/apply`, `POST …/reject`.
- `GET/POST /api/campaigns/[id]/api-tokens`, `DELETE …/api-tokens/[tokenId]` (ставить `revokedAt`).

MCP:
- `app/api/mcp/route.ts` (URL `/api/mcp`) через `mcp-handler` 2.x (`@modelcontextprotocol/server` 2.x, stateless Streamable HTTP; обробник створюється на кожен запит із замиканням на контекст токена). Шлях `/api/mcp/` виключається з CSRF-перевірки `rejectCrossOriginMutation` (`lib/supabase/middleware.ts`): він не читає cookie, авторизація лише Bearer-токеном, а браузерні MCP-клієнти шлють чужий `Origin`. `Authorization: Bearer <token>` → пошук за хешем, перевірка `revokedAt` і що власник токена досі ДМ кампанії, оновлення `lastUsedAt` (не частіше раза на хвилину). Невалідний → 401.

Клієнтські обгортки — `lib/api/ai.ts` (включно з `createChatTransport` для `useChat`, щоб компоненти не робили fetch); хуки — `lib/hooks/ai/` (`useAiCredentials`, `useAiThreads`, `useAiChat`, `useAiProposals`, `useApiTokens`; ключі в `keys.ts`).

## Реєстр інструментів (`lib/ai/tools/`)

Один файл на інструмент: `defineTool({ name, description, input: ZodSchema, kind: "read" | "propose", handler(ctx, input) })`, `ctx = { campaignId, userId, threadId: string | null }`. `index.ts` — масив `AI_TOOLS`; адаптери `toAiSdkTools(ctx)` (для `streamText`) і `registerMcpTools(server, ctx)` (для `mcp-handler`). Обробники викликають доменні функції напряму, не HTTP. Відповіді компактні (тільки потрібні моделі поля, без сирих JSON-снапшотів), ліміт розміру результату ~6k токенів з позначкою «обрізано».

Перша версія:

| Інструмент | Що повертає |
|---|---|
| `list_scenario_pages` | id, вид, арка, назва, статус |
| `read_scenario_page(pageId, sectionId?)` | розділи з рядками як markdown (історія + нотатки ДМ), id розділів і рядків, легенда, прапорці `played` |
| `search_scenario(query)` | збіги по `searchText` з контекстом |
| `get_party` | герої гравців: рівень, раса, клас/роль, HP/AC, ключові статі, коротке біо |
| `read_character(id)` | лист персонажа: характеристики, скіли, спели, артефакти, біо, нотатки |
| `get_show_state` | поточний набір і слайд (назва, підпис, нотатки ДМ), стан музики |
| `get_battle_state(battleId?)` | без id — активний бій кампанії; раунд, черга ходів, учасники з HP/станами, останні ~10 подій |
| `search_reference(kind, query)` / `read_reference(kind, id)` | юніти, спели, раси — з кешу `lib/cache/reference-data.ts` (`getCachedUnits`/`getCachedSpells`/`getCachedRaces`); скіли й артефакти — прямим запитом prisma (у кеші їх немає) |
| `propose_scenario_edit(pageId, summary, ops[])` | id пропозиції, статус `pending` |

## Пропозиції правок сценарію

Операції (`lib/utils/scenario/ai-ops.ts`, чиста логіка):
- `replaceRow { sectionId, rowId, story?, notes? }`
- `insertRow { sectionId, afterRowId?, story, notes? }`
- `addSection { afterSectionId?, title, rows: { story, notes? }[] }`
- `renameSection { sectionId, title }`

Видалення рядків і розділів у першій версії немає — ДМ видаляє сам.

Текст модель пише markdown-діалектом сценарію (`lib/utils/scenario/markdown.ts`, двобічне перетворення markdown ↔ `RichDoc`), що покриває **всі** `NODE_TYPES` і `MARK_TYPES`, щоб правка рядка не знищувала спецблоки:
- `paragraph`, `heading` (`#`…), `bulletList`/`orderedList`/`listItem`, `hardBreak` (два пробіли + перенос), `bold` (`**`), `italic` (`*`);
- `secret` — `||текст||` (у промпті пояснено: секрет бачить лише ДМ);
- `readAloud` — блок `:::read … :::`, `say` — `:::say … :::`, `callout` — `:::callout{kind="…" tag="…"} … :::` (вкладені блоки за схемою `callout`);
- `mention` — `[@Ім'я](<type>:<id>)` для `MENTION_TYPES`; `token` — `{{token:red}}` / `{{token:green}}`;
- `table`/`tableRow`/`tableCell`/`tableHeader` — GFM-таблиці.

Повний цикл `RichDoc → markdown → RichDoc` має давати той самий документ (тест на всіх 10 сторінках з prodcopy). Якщо рядок містить щось, що не переживає цикл, `propose_scenario_edit` для нього відповідає моделі помилкою «рядок містить нестандартну розмітку, редагуйте вручну» замість тихої втрати. Результат перевіряється тими самими схемами, що й збереження редактора (`scenarioContentSchema`, `SCENARIO_MAX_CONTENT_BYTES`). Той самий конвертер дає markdown для `read_scenario_page` і автоконтексту.

Створення: інструмент валідує ops проти поточної сторінки (розділи/рядки існують) і записує в кожну операцію `before` — поточний вміст зачепленого рядка (`story`, `notes`) чи назву розділу; для вставки — id сусіда. Нові id рядків/розділів генеруються на сервері.

Застосування (`POST …/proposals/[id]/apply`, `lib/server/ai/apply-proposal.ts`): у транзакції читає сторінку, порівнює `before` кожної операції з поточним вмістом. Будь-яка розбіжність або зниклий рядок → `stale` (409, пропозиція не застосована). Інакше:
1. `snapshotIfDue(tx, pageId, userId, { force: true })` + `pruneVersions` — знімок стану **до** правки AI завжди потрапляє в історію (звичайне автозбереження знімає версію лише раз на `SCENARIO_VERSION_INTERVAL_MS`);
2. застосовує ops, `updateMany` з `version` поточної сторінки (як `saveScenarioContentHandler`: `contentWrite`, `version + 1`);
3. `status = applied`, `appliedVersion`; відповідь — `{ page: ScenarioPage }`.

Глобальну `version` сторінки на момент пропозиції не перевіряємо: ДМ редагує постійно, і пропозиції без потреби старіли б.

**Відкритий редактор.** `useScenarioDraft` тримає `expectedVersion` і на 409 зупиняє автозбереження до перезавантаження, тож серверне застосування під відкритим редактором зламало б його. Тому:
- у режимі перегляду/гри (редактор закритий) — просто `apply` і оновлення кешу сторінки відповіддю;
- у режимі редагування — `useAiProposals.apply` спершу чекає на `flush()` чернетки (той самий шлях, що «Готово»), потім `apply`, потім сторінка-клієнт перемонтовує `ScenarioEditor` з новою сторінкою з відповіді (`key` = `version`), тож чернетка стартує з актуальних `content`/`version`. Редактор віддає свій `flush` назовні через проп `onDraftReady`.

Клієнт надсилає лише `proposalId`; застосовуються тільки збережені `ops`.

## Чат

`POST /api/campaigns/[id]/ai/threads/[threadId]/chat`, тіло `{ text, focus?: { pageId, sectionId?, rowIds? } }`, `maxDuration = 300`.

Пайплайн (`lib/ai/chat/run-chat.ts`):
1. `requireDM`, тред належить кампанії й користувачеві, ключ провайдера треду існує (інакше 400 «Додайте ключ …»). Один активний стрім на тред: клієнт блокує відправку під час стріму; сервер не тримає блокувань (на Fluid Compute інстанси різні, а користувач один).
2. Записати повідомлення користувача (`seq + 1`).
3. Історія з БД: останні 30 повідомлень; результати інструментів старших за 6 останніх повідомлень стискаються до одного рядка.
4. Промпт (`lib/ai/context/`):
   - **роль**: помічник ДМ кампанії «{назва}» ({опис}), відповідає українською;
   - **режим** `scenario`: співавтор, правки лише через `propose_scenario_edit` з коротким `summary`, ідеї — текстом; `live`: 1–5 речень, спершу шукати в довіднику, якщо питання про правила;
   - **автоконтекст** (свіжий на кожне повідомлення): `live` — поточна сторінка (зіграні розділи назвами, поточний розділ повністю, легенда), партія, поточний слайд показу; `scenario` — уся сторінка + `focus`. Бюджет ~10k токенів, жорстке обрізання від найдальших розділів.
   - для Anthropic роль + автоконтекст позначаються `cacheControl` (`providerOptions.anthropic`).
5. `streamText({ model, system, messages, tools: toAiSdkTools(ctx), stopWhen: до 8 кроків })` → UI message stream.
6. `onFinish` — записати відповідь асистента з `usage`; при скасуванні клієнтом — записати те, що встигло прийти.

Моделі (`lib/constants/ai.ts`): для кожного провайдера список `{ id, label, tier: "fast" | "smart" }` і дефолти; новий тред `live` бере `fast`, `scenario` — `smart` (або `defaultModel` ключа). Anthropic: `claude-haiku-4-5-20251001` (fast), `claude-sonnet-5-5` (smart); ID OpenAI і Gemini звірити з документацією провайдерів під час реалізації.

Помилки провайдера → українські тексти в стрічці чату (тред не ламається): 401/403 «ключ недійсний або відкликаний», 429 «ліміт провайдера, спробуйте за хвилину», 5xx/мережа «провайдер недоступний». Ліміт повідомлення — 8 000 символів.

Облік: сума `usage` по треду показується в шапці панелі.

## UI

- **`app/settings/ai`** (новий сегмент верхнього рівня; сторінка за `getClaims`, без сесії — `/sign-in`, як решта сторінок у `proxy.ts`; `HudPage`): картка `HudCard` на провайдера — поле ключа, «Перевірити і зберегти», `…a1b2`, модель за замовчуванням, «Видалити». Посилання з меню користувача й з AI-панелі, коли ключа немає.
- **`app/campaigns/[id]/dm/ai`** (`HudPage`): API-токени — список (назва, префікс, останнє використання), «Створити» (`ResponsiveDialog hud`, токен показується один раз з копіюванням), «Відкликати» (`useConfirm`), фрагмент конфігу для Claude Desktop (через `mcp-remote` з заголовком `Authorization`) і Cursor (нативно, `headers`) з URL `/api/mcp`. Конектори claude.ai web вимагають OAuth — поза межами першої версії. Посилання з DM-дашборду.
- **AI-панель** (`components/ai`): кнопка «AI» у `ScenarioBar` (редагування й гра). Десктоп — права бічна панель ~420 px поряд із книгою сценарію; телефон — `ResponsiveDialog` (bottom sheet). Вміст:
  - шапка: вибір треду (новий / попередні для сторінки), провайдер і модель, лічильник токенів;
  - стрічка: markdown-повідомлення, виклики інструментів компактними чипами («Читаю сторінку…», «Шукаю в довіднику: Фенікс»);
  - **картка пропозиції**: `summary`, по кожній операції «було → стало» через `ScenarioRichText`, «Застосувати» / «Відхилити», статус `stale` з кнопкою «Переробити» (надсилає в чат прохання оновити пропозицію);
  - поле вводу з показом `focus` (виділений рядок/розділ, можна зняти); у режимі гри — швидкі чипи («Ім'я для NPC», «Що далі за сценарієм?», «Яке DC?»); «Стоп» під час стріму.
- У редакторі сценарію бейдж «Пропозиції AI (N)» з `pending` для сторінки (зокрема з MCP); клік відкриває панель зі списком.
- Після `apply` кеш сторінки оновлюється відповіддю (див. «Відкритий редактор»).

## Тестування (vitest)

- `crypto`: повний цикл, підробка `authTag`/`iv` → помилка, `keyVersion` з `AI_KEYS_SECRET_PREV`.
- `markdown.ts`: повний цикл для кожного вузла й марки (`secret`, `readAloud`, `say`, `callout`, `token`, таблиці, згадки); фікстури з реальних сторінок prodcopy дають ідентичний `RichDoc`.
- `ai-ops.ts`: кожна операція, `before`-перевірка → `stale`, зниклий рядок, нові id.
- `apply-proposal`: примусовий знімок версії до правки; після `flush` і перемонтування наступне автозбереження йде з новою `version` без 409.
- CSRF: `/api/mcp/*` з чужим `Origin` пропускається, інші `/api/*` — як раніше.
- Збирач контексту: бюджет і обрізання, нотатки ДМ присутні лише в AI-контексті ДМ.
- Кожен інструмент на моках prisma/кешу, ліміт розміру результату.
- Маршрути: не-ДМ → 403, чужа кампанія → 404, ключ ніколи не у відповіді, 503 без `AI_KEYS_SECRET`.
- MCP: хеш токена, відкликаний/чужий токен → 401, власник більше не ДМ → 401.
- Чат-пайплайн на `MockLanguageModel` з AI SDK: виклик `propose_scenario_edit` → рядок у `ai_proposals`, повідомлення записані з `usage`; помилка провайдера → український текст.
- Компоненти (happy-dom): картка пропозиції (applied/stale), сторінка ключів (маскування).
- Наприкінці — перевірка в браузері з реальним ключем користувача на локальній БД.

## Робоче місце і розгортання

- Worktree `../dnd-tracker-ai`, гілка `feat/ai-assistant`, локальна БД `aiassistant` (`./scripts/db/prodcopy-db.sh aiassistant`). Основна папка не чіпається.
- Перед мержем: `AI_KEYS_SECRET` у Vercel Production і Preview (`vercel env add`). Міграція застосується продакшн-білдом.

## Поза межами першої версії

- Інструменти створення/редагування сутностей (юніти, персонажі, артефакти, спели, скіли) — після етапу 2 конструктора, як `propose`-інструменти з власним `apply`.
- Видалення рядків/розділів через AI, генерація зображень для слайдів, голосовий ввід, AI для гравців.
