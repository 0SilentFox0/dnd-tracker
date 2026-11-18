# F2 — Безпека всього застосунку (re-audit, main d871500da)

## 1. Оцінка

| Критерій | Було | Стало | Причина |
|---|---|---|---|
| Безпека (загалом) | 7 | **8.0** | Critical/High не знайдено; authz, IDOR, SSRF, RLS, Pusher, upload — чисто. До 9 не дотягує: rate limit у prod fail-open, CSP лише report-only, редакція учасників на denylist (3 Medium при цілі «0 Medium»). |
| Authz / IDOR | — | 9 | Усі 208 `route.ts` мають перевірку (скрипт по графу імпортів + ручний перегляд 19 «підозрілих»); публічні лише `health`, `openapi.json`, `locale`, `theme`. |
| Приватність учасників | — | 7.5 | Серверна редакція є в GET/SSR/мутації/Pusher, але denylist пропускає частину полів ворогів. |
| Заголовки / rate limit | — | 6.5 | Часткове виконання критеріїв виходу. |

Критерії виходу плану: серверна редакція — так (із застереженням); DM-only бібліотека карт — так; Demo-join — так; security-заголовки — частково; rate limit fail-closed у prod — **ні**; 0 Medium — **ні**.

## 2. Що змінилося з 2026-11-17 (перевірено в коді)

- **Редакція учасників**: `lib/utils/battle/view/redact-participants.ts:201,219,314`; виклики в `battle-response.ts:106,111` (GET/SSR/відповідь мутації через `readScenePreview`/`buildScenePreview`) і `:147-154` (публічна Pusher-дельта, повна лише в `private-battle-dm-*`). Журнал: `read-battle.ts` редагує `events`/`summary` для не-DM.
- **Pusher auth**: `app/api/pusher/auth/channel-access.ts` — DM-канал лише для ролі DM, battle/show — члени кампанії, user/notify — власник.
- **Карти**: `maps/route.ts:22` GET лише DM; `player-access.ts` — гравець читає лише закріплену версію; `PUT` вимагає `expectedVersion`; квота + rate limit; sniff magic bytes і перевірка належності URL кампанії (`background-upload.ts:30-60`, `image-bucket-storage.ts:76`).
- **inviteCode**: закрито всі три «непокриті» місця — `read-campaign.ts:22-27` (список), `:34` (GET), `characters/operations/get.ts:60-71`; `read-inventory.ts:27` вибирає лише `members`; SSR `app/campaigns/[id]/page.tsx:180`.
- **Demo-join**: `join-campaign.ts:41` → 403; join має rate limit 10/600с.
- **Заголовки**: `next.config.ts:23-34` (`frame-ancestors 'self'`, `nosniff`, `Referrer-Policy`, CSP report-only).
- **CSRF**: `lib/supabase/middleware.ts:20-83` — перевірка Origin/`Sec-Fetch-Site` для всіх мутацій `/api/*`.
- **IP rate limit до auth**: `ip-rate-limit.ts` для `/api/mcp` і публічних маршрутів.
- **Health**: `app/api/health/route.ts:11-23` — `deep=1` під `HEALTH_SECRET`, `timingSafeEqual`.
- **SSRF**: `safe-fetch.ts` — https-only, блок-лист приватних мереж (включно з v4-mapped, NAT64, 6to4), пінінг IP, перевірка на кожному редиректі, ліміт розміру, таймаут.
- **RLS**: 79 `CREATE TABLE` у міграціях — усі мають `ENABLE ROW LEVEL SECURITY`, жодного `DISABLE`/`CREATE POLICY`.

## 3. Відкриті дефекти

Critical / High — немає.

- **I1. Rate limit у prod fail-open.** `lib/utils/api/rate-limit.ts:125-127,150-159`: без Upstash або при помилці Redis викликач без `memoryFallback` отримує `allowed: true`. Усі бойові мутації — `lib/server/battles/pipeline-deps.ts:38-44` (без `memoryFallback`), також `record-service.ts:454` (audio); 6 із 24 викликів. Пам'ять інстанса на serverless — слабкий ліміт; за нотатками Upstash у prod не підключено. Фікс: `memoryFallback` за замовчуванням, у production без Redis для чутливих scope — 503/429; підключити Upstash.
- **I2. Редакція на denylist.** `redact-participants.ts:20-30` (`SECRET_BATTLE_KEYS`) + `:151-158`: гравцю про ворога лишаються `equippedArtifacts`, `artifactSets`, `pools`, `abilityUsage`, `pendingCast`, `transform`, `schoolMastery`, `movement`, повні `resolvedAbilities` (вирізаються лише прапори `resistance`/`spellAbsorb`, `:105`), повні неприховані `activeEffects`. Нове поле `battleData` тече за замовчуванням. Фікс: allowlist публічних ключів + тест «невідомий ключ не проходить».
- **I3. CSP не діє.** `next.config.ts:9-21,26`: повна політика лише `Report-Only`, без `report-uri`/`report-to` (звіти ніхто не збирає), `script-src 'unsafe-inline'`; немає `Permissions-Policy`, явного HSTS. Фікс: nonce-CSP у `proxy.ts`, enforce, endpoint звітів.
- **M1.** `player-access.ts:30`: `status != COMPLETED` включає PREPARED — гравець може прочитати повну карту ще не початого бою (спойлер), знаючи `mapId`. Фікс: лише ACTIVE (+ останній завершений).
- **M2.** `app/api/cron/assistant-cleanup/route.ts:17`: порівняння секрету через `!==`, не `timingSafeEqual`.
- **M3.** `lib/server/show/deck-operations.ts:80-95`: `bindDeckRecord`/`deleteDeckRecord` пишуть за `{ id }` без `campaignId` (захист лише у викликача `ownedDeck`). Фікс: `where: { id, campaignId }`.
- **M4.** `ip-rate-limit.ts:19-23`: `x-real-ip`/`x-forwarded-for` довіряються без умов — поза Vercel підробляються (актуально для плану переїзду).
- **M5.** Немає ratchet-тестів «кожен `route.ts` має auth» і «кожна міграція з `CREATE TABLE` має RLS» (у `lib/__tests__` лише `security-headers`, `route-no-prisma`).
- **M6.** `join-campaign.ts:53-58`: відповідь join повертає весь рядок кампанії (з `inviteCode`, `rules`); код гравець уже знає, але зайві дані.
- **M7.** Бакети зображень `public: true` (`image-bucket-storage.ts:33`): доступ за невгадуваним URL без авторизації; загальної квоти сховища на кампанію немає (лише rate limit на квитки).

## 4. Що не вдалося перевірити

- Тести не запускалися (заборонено брифом); тести приватності на рівні маршруту бачив лише за наявністю файлів.
- Реальні заголовки/CSP-порушення у prod, наявність `HEALTH_SECRET`/`CRON_SECRET`/Upstash у Vercel env.
- Стан RLS у живій БД (лише SQL міграцій); політики Supabase Storage.
- Authz перевірено скриптом по токенах у графі імпортів (глибина 4) плюс вибірково вручну (~25 обробників), не кожен із 208 маршрутів построково. MCP-інструменти та валідацію UVTT-парсера глибоко не читав (окремі зрізи).
- Редакцію `sceneState`, `pendingChoice`, `knowledge` і wfrp `redactSlot` построково не звіряв.
