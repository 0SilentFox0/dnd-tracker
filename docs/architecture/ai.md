# AI-асистент (BYOK-чат, пропозиції правок, MCP)

Спека: `docs/superpowers/specs/2026-10-21-ai-assistant-design.md`. Лише для ДМ; гравці AI не бачать.

## Шари

- **Ключі**: `ai_credentials` (на користувача й провайдера; `anthropic`/`openai`/`google`). `lib/ai/crypto.ts` (`server-only`) — AES-256-GCM, майстер-ключ `AI_KEYS_SECRET` (32 байти base64), `keyVersion` = 1. `lib/ai/credentials.ts` шифрує/розшифровує, `verifyProviderKey` (`lib/ai/providers.ts`) перевіряє ключ безкоштовним запитом списку моделей. Клієнту повертається лише маска. Без `AI_KEYS_SECRET` усі AI-маршрути → 503.
- **Провайдери**: `createModel(provider, apiKey, modelId)` — AI SDK 7 (`@ai-sdk/{anthropic,openai,google}`).
- **Реєстр інструментів**: `lib/ai/tools/*.ts` (один файл — інструмент, `AiToolDef` з `define.ts`) + рядок у `AI_TOOLS` (`tools/index.ts`). Два адаптери над одним реєстром: `toAiSdkTools` (чат) і `registerMcpTools` (MCP). Результат кожного інструмента обрізається до `AI_LIMITS.toolResultChars` у `runTool`.
- **Чат-пайплайн** (`lib/ai/chat/run-chat.ts`): `POST …/ai/threads/[threadId]/chat` → `loadThread` → ключ користувача → збереження повідомлення користувача → `buildInstructions` + історія (`compactHistory` стискає старі результати інструментів) → `streamText` (`stopWhen: isStepCount(AI_LIMITS.maxSteps)`) → UI-стрім; відповідь із `usage` дописується в `ai_messages` по завершенню. Помилка провайдера → український текст (`lib/ai/errors.ts`). `maxDuration = 300`, у `vercel.json` для цього маршруту `supportsCancellation: true` — інакше обрив клієнта не доходить до `abortSignal` і стрім платно доїдає.
- **Збирач контексту** (`lib/ai/context/prompt.ts`): блок ролі → **постійні інструкції кампанії** (`campaigns.aiInstructions`, ≤ `AI_LIMITS.instructionsChars`, редагуються на `/dm/ai`, не обрізаються) → правила режиму (`scenario`/`live`) → партія → показ (live) → фокус ДМ → текст сторінки в markdown. Лише сторінка обрізається під `contextChars`. Нотатки героїв потрапляють лише в AI-контекст ДМ. Ті самі інструкції віддає інструмент `get_campaign_brief`, тож зовнішній MCP-клієнт їх теж бачить.
- **Пропозиції** (`lib/ai/proposals.ts`, `ai_proposals`): AI ніколи не пише у сценарій напряму — `propose_scenario_edit` створює рядок `pending` з операціями (`ScenarioAiOp`, `lib/utils/scenario/ai-ops.ts`). Кожна операція несе `before` (старий текст/заголовок/story+notes). `apply` у транзакції: перевіряє `before` через `applyAiOps` (розбіжність → `stale`, 409), валідує схему й розмір, **примусово знімає версію сторінки** (`snapshotIfDue(…, { force: true })`) перед правкою, пише з оптимістичним `version` (нова `version` у `appliedVersion`). `reject` — лише з `pending`/`stale`.
- **Редактор**: `useAiProposals({ beforeApply, onApplied })` на сторінці сценарію: `beforeApply` = `flush()` незбережених правок редактора (якщо flush не вдався — apply не йде) → `POST …/apply` → відповідь кладеться в кеш сторінки й редактор перемонтовується з новою `version`, тож наступне автозбереження не дає 409.
- **Markdown-діалект** (`lib/utils/scenario/markdown.ts`): `**жирний**`, `_курсив_`, `||секрет ДМ||`, `:::read`/`:::say`/`:::callout`, `[@Ім'я](character:id)`, `{{token:red|green}}`; інструменти читають сторінку в ньому, id розділів/рядків видно моделі.
- **MCP** (`app/api/mcp/route.ts`, `mcp-handler`): stateless, обробник на запит. `Authorization: Bearer dndt_…` → `verifyApiToken` (SHA-256 хеш у `api_tokens`, не відкликаний, власник усе ще ДМ кампанії) → ті самі інструменти з `{ campaignId, userId, threadId: null }`. Токени: `app/api/campaigns/[id]/api-tokens`, значення показується один раз при створенні.
- **Клієнт**: `lib/api/ai.ts` → `lib/hooks/ai` (`aiKeys` у `keys.ts`) → `components/ai`; сторінка `/campaigns/[id]/dm/ai` (ключі, токени, постійні інструкції, налаштування MCP-клієнтів — Claude Desktop через `mcp-remote`, Cursor/інші за URL).

## Правила, які не можна порушувати

- Ключ провайдера ніколи не залишає сервер: не у відповіді, не в логах, Pusher, тексті помилки; розшифровується лише в `loadApiKey` безпосередньо перед `createModel`.
- Зміни сценарію лише через `ai_proposals` + `apply`; жоден інструмент не пише у `scenario_pages` напряму.
- Новий інструмент = файл у `lib/ai/tools` + рядок у `AI_TOOLS`; він автоматично доступний в обох каналах (чат і MCP). Окремо під канал не реєструвати.
- `/api/mcp` звільнений від CSRF-перевірки (`lib/supabase/middleware.ts`: браузерні MCP-клієнти шлють чужий `Origin`) і приймає лише Bearer із `api_tokens`; cookie-сесію не читає.
- Кожен маршрут — лише ДМ і в межах кампанії (`requireDM` через `guarded()`; кожен запит до БД фільтрується за `campaignId`, а треди — ще й за `userId`); маршрути ключів — `requireAuth` (ключ належить користувачеві).
- `AI_KEYS_SECRET`/`_PREV` не логувати й не комітити.

## Env і ротація ключа

`AI_KEYS_SECRET` (`openssl rand -base64 32`) — Vercel Production і Preview, `.env.local`; `AI_KEYS_SECRET_PREV` — лише під час ротації. Ротація:

1. `UPDATE ai_credentials SET "keyVersion" = 0;` — записи тепер читаються ключем `_PREV`.
2. Старе значення `AI_KEYS_SECRET` → `AI_KEYS_SECRET_PREV`.
3. Новий секрет → `AI_KEYS_SECRET`; деплой.
4. Записи перешифровуються поточним ключем (`keyVersion` = 1) при наступному збереженні ключа користувачем; після того як усі користувачі пересохранили (або їх перепросили), `_PREV` можна прибрати.

## Підключення зовнішнього MCP-клієнта

Сторінка `/campaigns/[id]/dm/ai`: створити токен, скопіювати готовий JSON для клієнта (URL `/api/mcp`, заголовок `Authorization: Bearer <токен>`).
