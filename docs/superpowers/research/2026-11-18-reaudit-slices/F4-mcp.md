# F4 — MCP-сервер (повторний аудит, main d871500da)

## 1. Оцінки

| Критерій | Було | Стало | Причина |
|---|---|---|---|
| **MCP-сервер загалом** | 7.0 | **8.0** | 6 із 7 критеріїв виходу закрито в коді; ідемпотентність закрита лише умовно, L11-11 наполовину |
| Ідемпотентність записів | — | 6.5 | Працює тільки з клієнтським `requestId` або з `Mcp-Session-Id`, якого stateless-сервер сам не видає |
| Протокол (annotations, structuredContent, коди, resources) | — | 8.5 | Усе є; `outputSchema` — один загальний конверт з `data: unknown` |
| Безпека (auth, ліміти, витоки) | — | 8.5 | IP-ліміт до auth, токен хешований, expiresAt/rotate, live-ревалідація токена; ліміти без Upstash — пам'ять інстанса |
| Тести MCP | — | 7.5 | 429, WWW-Authenticate, annotations, structuredContent, rotate-гонка є; IDOR і дубль-ретрай наскрізно через MCP не знайдено |
| Документація `ai.md` | — | 7.5 | Ідемпотентність і ліміти описані чесно; перелік scopes застарів |

Ціль плану 9 не досягнута.

## 2. Що змінилося з 2026-11-17 (перевірено в коді)

- **annotations**: `toolAnnotations` з `effect`/`idempotent` (`lib/ai/tools/define.ts:61-73`), передаються в `registerTool` (`lib/ai/tools/index.ts:91`).
- **structuredContent + outputSchema**: `toolOutputSchema` (`define.ts:96-108`), `structuredContent: result`, `isError` (`index.ts:115-121`).
- **Реальні коди помилок**: `ERROR_CODE_BY_KEY` → ключ `API_ERRORS` у `error.code` (`define.ts:75-80, 243`); невідома помилка → `ASSISTANT_FAILED` 500 без тексту оригіналу (`define.ts:266-278`).
- **WWW-Authenticate** на 401, включно з простроченим токеном (`app/api/mcp/route.ts:22-27`).
- **Rate limit до auth**: per-IP `ip-mcp` 300/60 с у middleware (`lib/supabase/middleware.ts:89-95`, `lib/utils/api/ip-rate-limit.ts`), далі на токен і агрегат на кампанію (`route.ts:34-52`).
- **Аудит-лог** без payload (`lib/ai/mcp-audit.ts:24-53`), підключений через `onEvent` (`route.ts:67`).
- **Resources/prompts** за scopes, через `publicToolData` і `authorizeAssistant` (`lib/ai/mcp-capabilities.ts:49, 79, 117, 156`); помилка локалізована (`:101`).
- **Токени**: `expiresAt` (`prisma/schema.prisma:1097`, міграція `20261206000000_api_token_expires_at`), `isTokenActive`, `rotateApiToken` з умовним revoke у транзакції (`lib/ai/api-tokens.ts:116-156`), демо-токени зрізаються до read-scopes (`:228-230`).
- **Реєстр**: `propose_scene_slide` прибрано; записи `content_*` і `world_action` прибрано, лишились 7 read-аліасів (`lib/ai/tools/content.ts:95-103`); `defineTool` типізований (`define.ts:43-56`).
- **Ключ не витікає**: шлях MCP не читає ключ провайдера; лог пише тільки `error.name` (`define.ts:266`, `mcp-audit.ts:47`).

## 3. Відкриті дефекти

- **I1 — ідемпотентність за замовчуванням не працює.** Ключ із JSON-RPC id будується лише коли клієнт надіслав `Mcp-Session-Id` (`index.ts:100`, `lib/ai/mcp-context.ts:25-35`), а сервер stateless і сесію не видає (`route.ts:60-69`, `ai.md:19`). Типовий клієнт заголовка не шле → `toolRequestId` дає `randomUUID()` (`lib/ai/tools/request-key.ts:27`) → повтор після таймауту виконує дію вдруге. Виправлення: зробити `requestId` обов'язковим для `assistant_action` у каналі MCP або видавати session id в `initialize`.
- **I2 — `propose_scenario_edit` без клієнтського ключа** (`lib/ai/tools/propose.ts:16-25`): поля `requestId` у схемі немає, ретрай створює дубль pending-пропозиції. Додати опційний `requestId`, як в `assistant_action`.
- **I3 — L11-11 не закрито**: 12 легасі-тулів зі scope `ai` (`campaign.ts:11`, `scenario-read.ts:93-203`, `party.ts:70,84`, `battle.ts:11`, `show.ts:25`, `reference.ts:99,119`) читають БД напряму, повз каталог; авторизація — окрема гілка `authorizeLegacyAssistantRead` (`define.ts:197-208`). Потрібні read-actions у каталозі й тонкі аліаси.
- **I4 — немає наскрізних тестів IDOR і дубль-ретраю через MCP.** `mcp-idempotency.test.ts` перевіряє побудову ключа на моку dispatch; у маршрутних тестах кейсу з чужою кампанією немає (є лише `world.test.ts:65` на рівні тула). Додати тест: два однакові `tools/call` з `requestId` → один receipt; токен кампанії A з id сутності кампанії B.
- **M1 — ліміти без Upstash тримаються в пам'яті інстанса** (`lib/utils/api/rate-limit.ts:122-127`), на serverless це слабкий захист; помилка Redis теж веде у пам'ять (`:149-159`).
- **M2 — ліміт на токен тільки для POST** (`route.ts:34`); GET/DELETE роблять 3 запити до БД у `verifyApiToken` під самим IP-лімітом.
- **M3 — відмови 401/403/429 не потрапляють в аудит-лог** (повернення до `createMcpHandler`, `route.ts:22-51`).
- **M4 — `outputSchema` один на всі тули**, `data: z.unknown()` (`define.ts:99`): клієнт не отримує типів результату.
- **M5 — необмежені рядки у схемах** (`content.ts:32,45,57,77`, `world.ts:46`), `z.object` замість `strictObject`; L11-7 закрито частково.
- **M6 — каст лишився**: `def.input as z.ZodObject` (`index.ts:89`), хоча L11-6 заявляв прибирання.
- **M7 — `AiToolError` завжди 422** (`define.ts:244`), тому `WORLD_MAP_NOT_FOUND` приходить як 422, а не 404 (`world.ts:59`).
- **M8 — `ai.md:33` описує 3 scopes замість 15** (`lib/constants/ai.ts:145-161`); таблиця лімітів (`ai.md:132`) без IP і агрегату.
- **M9 — `WWW-Authenticate` без `error="invalid_token"`**; OAuth protected-resource metadata не зроблено (свідомо).

Критичних (C) не знайдено.

## 4. Що не перевірено

- Тести не запускалися (заборона брифу); їхній зміст оцінено за назвами кейсів і частково за кодом.
- Поведінку `mcp-handler` щодо session id і подій `onEvent` виведено з конфігурації маршруту, бібліотеку не читав.
- Чи застосована міграція `expiresAt` на проді та чи є там Upstash.
- Повний шлях `dispatchAction` → receipt (гонка двох одночасних запитів з одним `requestId`) переглянуто лише в частині `priorResult` (`lib/server/assistant/execute.ts:61-84`).
- UI ротації токенів і `components/ai`.
