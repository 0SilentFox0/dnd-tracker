# Інфраструктура для реального проду: оцінка і план

> **Статус:** відкладено до завершення альфа-тестування (рішення користувача 2026-10-28). Ціни зняті 2026-10-28; Hetzner та інші перед замовленням перевірити заново. Першим робити етап 1 (не залежить від хостингу).

## Контекст
Конструктор змерджено, готуємось до виходу в прод. Зараз усе на free-тарифах (Vercel Hobby, Supabase Free, Pusher Sandbox) плюс ще не налаштований SMTP. Пріоритети: стресостійкість, мінімальна вартість поки немає клієнтів, нічого не білиться «просто так».

## Що показав аудит коду
- **Vercel-специфіки мало.** Немає `@vercel/*` пакетів, edge runtime, cron-ів. Є: `after()` (Pusher publish, show, cleanup), `unstable_cache`/`revalidateTag` (reference-data), `next/image` (кеш Supabase-картинок), довгі стріми (AI chat і MCP, `maxDuration` 300 с), `scripts/vercel-build.mjs` (migrate deploy), гілки `VERCEL` у `lib/db.ts`.
- **Supabase:** Prisma-only для БД, Realtime не використовується, RLS без політик. Прив'язка тільки через Auth (email/password, Google OAuth, `getClaims`) і Storage (6 бакетів, signed upload URL).
- **Pusher:** приватні канали battle/user/show/world, один `battle-delta` на мутацію, є polling fallback. Presence і client events немає, тож Pusher-сумісний сервер (Soketi) підходить без зміни коду.
- **Email:** лише Supabase Auth (confirm, reset). App-листів немає.
- **Upstash Redis:** у проді не налаштований. Rate limit fail-open, AI-ліміти тільки in-memory. Це дірка для прод-навантаження.
- **Немає** Dockerfile, `output: standalone`, `.nvmrc`, жодних load-тестів, жодних цифр про розмір БД, egress чи очікувану кількість юзерів.

## Оцінка по компонентах

### 1. Хостинг застосунку (Vercel)
- Hobby офіційно **некомерційний**, тож для реального проду потрібен Pro (від $20/міс за місце плюс usage). Ризик «біллить просто так» — це usage: image optimization, active CPU стрімів, трафік.
- **Рекомендація: один контейнер у Frankfurt/Helsinki** (Hetzner VPS, або керований Fly.io/Railway/Render, якщо не хочеш ops), перед ним Cloudflare (безкоштовний CDN, DDoS, кеш статики й картинок). Деплой через Coolify або Docker + Caddy.
- Ціна Hetzner в 2026 різко змінилась: CPX22 піднявся до €19.49, тож дивитись cost-optimized лінійку CX, ціну перевірити в день замовлення. Орієнтир: €5–10/міс за 2–4 vCPU/4 ГБ.
- Що доведеться зробити в коді:
  - `output: "standalone"` і Dockerfile; зафіксувати Node через `.nvmrc`/`engines`.
  - `prisma migrate deploy` винести в deploy-крок CI, а не в build.
  - Прибрати гілки `VERCEL` у `lib/db.ts`, `postinstall.mjs`, `vercel-build.mjs`. Не забути: `connection_limit=1` спрацьовує і на будь-якому pooler-URL.
  - `after()` працює на довгоживучому Node-процесі, це простіше, ніж на serverless.
  - AI/MCP стріми на VPS простіші (немає ліміту функції, `supportsCancellation` не потрібен).
  - `unstable_cache`/`revalidateTag` на кількох репліках не синхронізується. Для одного інстансу ок, для масштабування потрібен cacheHandler на Redis (Upstash уже є).
  - `next/image` на власному хості: потрібен `sharp`, дисковий кеш. Cloudflare перед `/_next/image` знімає основне навантаження.
- **Мінус єдиного VPS:** це single point of failure. Для стресостійкості: другий інстанс за балансувальником, коли з'являться перші клієнти (потрібен cacheHandler). До цього достатньо healthcheck, автоперезапуску й швидкого rollback (попередній образ).
- Альтернатива «лишитись на Vercel Pro»: найменше роботи, але вища ціна за трафік і CPU, та vendor-lock на кеш/`after()`. Варто лише якщо час до запуску дуже малий.

### 2. База і Auth (Supabase)
- **Free не годиться для проду:** пауза після неактивності, немає бекапів, ліміт egress (у вас він уже «жорстка межа»).
- **Рекомендація: лишитись на Supabase, перейти на Pro ($25/міс, у ньому $10 кредиту на compute, Small ≈ $15)**. Перед запуском, не раніше. Egress понад квоту ≈ $0.09/ГБ. Прив'язка тільки Auth+Storage, а Postgres через Prisma переноситься безболісно, тож вихід лишається відкритим.
- Альтернативи, чесно: Neon (scale-to-zero, дешевше на малому навантаженні, але Auth доведеться замінювати: Clerk/Better Auth/Auth.js, і Storage теж). Self-host Postgres на тому ж VPS: найдешевше, але бекапи, HA і оновлення на тобі. Для старту це не варто ризику.
- Платити за БД «в нуль клієнтів» мінімально: Pro $25 фіксовано, без сюрпризів. Це розумна ціна за бекапи, PITR (додаткова опція) і відсутність паузи.
- Egress-економія вже закладена (дельти, `next/image`). Додатково: Cloudflare перед Storage або перенос картинок на **Cloudflare R2** (нульовий egress), робити лише коли egress реально дорожчає.

### 3. Realtime (Pusher)
- Sandbox: 100 одночасних з'єднань, 200k повідомлень/день. Startup $49: 500 з'єднань, 1M повідомлень.
- Fan-out = мутації × підписники, тож бій на 6 гравців і активна гра швидко з'їдають ліміт.
- **Рекомендація:** лишити Pusher на старті (безкоштовно, нуль роботи). Коли 100 з'єднань стане мало, не платити $49, а підняти **Soketi** (Pusher-сумісний, самохостинг) на тому ж VPS; код змінюється лише в host/port конфігах. Перевірити підтримку Soketi перед рішенням. Запасний варіант: Ably.

### 4. SMTP
- Supabase Auth на дефолтному SMTP має жорсткий ліміт і не годиться для проду. Потрібен власний домен із SPF/DKIM/DMARC.
- Варіанти: Resend (безкоштовний старт), Amazon SES (копійки за тисячу), Brevo. Рекомендація: Resend для швидкого старту або SES для найменшої ціни. Обсяг листів у вас малий (confirm, reset), це не стаття витрат.

### 5. Redis (Upstash)
- Підключити **до** запуску: rate limit перестане бути fail-open, AI-ліміти стануть спільними між інстансами. Pay-as-you-go, на нульовому трафіку ≈ $0.

### 6. Спостережуваність і стрес-тест
- Зараз цифр немає. Перед запуском: k6-сценарій проти prodcopy (бій на N учасників, M клієнтів, Pusher і polling), заміри p95 мутацій, кількість з'єднань Prisma/pgbouncer, egress на бій.
- Моніторинг: UptimeRobot/Better Stack (безкоштовно), Sentry (безкоштовний тариф), алерти на 5xx і пул з'єднань, регулярна перевірка відновлення з бекапу.

## Орієнтовна вартість на місяць (без клієнтів → перші клієнти)
| Компонент | Зараз | Мінімальний прод | Після росту |
|---|---|---|---|
| Хостинг | Vercel Hobby $0 | Hetzner VPS ≈ €5–10 | 2 інстанси + LB ≈ €15–30 |
| БД і Auth | Supabase Free $0 | Supabase Pro $25 | + Small/Medium compute |
| Realtime | Pusher $0 | Pusher $0 | Soketi на VPS ≈ $0 (або $49) |
| SMTP | немає | Resend/SES ≈ $0–5 | $5–20 |
| Redis | немає | Upstash ≈ $0–2 | $5–10 |
| CDN | немає | Cloudflare $0 | $0 |
| **Разом** | **$0** | **≈ $35–45** | **≈ $60–120** |

Орієнтир по Vercel-варіанту: Pro $20 + Supabase $25 + usage ≈ $50–80 уже на старті, і з нелінійним ростом.

## Етапи
1. **Перед запуском (обов'язково, не залежить від хостингу):** Supabase Pro, свій SMTP+домен, Upstash, перевірка бекапів, k6-стрес на prodcopy, моніторинг.
2. **Міграція з Vercel:** Dockerfile + standalone, винести migrate у CI, прибрати гілки `VERCEL`, Cloudflare перед сервісом, rollback-процедура. Прогнати на staging-VPS, тоді перемкнути DNS.
3. **За тригерами:** Soketi коли Pusher впирається в 100 з'єднань; другий інстанс + cacheHandler на Redis коли CPU/RAM або доступність стануть проблемою; R2 коли Supabase egress дорожчає.

## Критичні файли (для етапу 2)
`vercel.json`, `scripts/vercel-build.mjs`, `scripts/postinstall.mjs`, `lib/db.ts`, `next.config.ts`, `lib/cache/reference-data.ts`, `lib/cache/info-reference.ts`, `lib/utils/battle/pipeline/default-deps.ts` (`after()`), `app/auth/callback/redirect-origin.ts`, `docs/VERCEL.md`. Переюзати наявне: `lib/redis.ts` (Upstash REST), `lib/utils/api/rate-limit.ts`, `docker-compose.yml` для локальної перевірки образу.

## Перевірка
- Локально: зібрати Docker-образ, запустити з `DATABASE_URL` на prodcopy, пройти `pnpm battle-sweep`.
- Staging-VPS: k6 навантаження, перевірка AI-стріму й MCP довше 60 с, `after()`-побічних ефектів (Pusher після відповіді), рестарт контейнера посеред бою.
- Auth: вхід email і Google на новому домені (Redirect URLs у Supabase), листи з нового SMTP доходять не в спам.
- Відновлення БД із бекапу на окремий проєкт.

## Відкриті питання до тебе
- Готовий вести ops (VPS, оновлення, алерти) чи краще керований контейнерний хост (Fly/Railway/Render) за трохи більші гроші?
- Є дата запуску або кількість очікуваних одночасних гравців? Це визначає, чи потрібен другий інстанс одразу.
- Чи підходить Supabase Pro як єдиний фіксований «мінімум» витрат?
