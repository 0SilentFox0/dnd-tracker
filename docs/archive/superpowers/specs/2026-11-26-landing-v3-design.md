# Лендінг v3 — прод-версія (дизайн)

Статус: дизайн погоджено власником 2026-11-26 (розмова), spec на рев'ю. Гілка `feat/landing-v3` (worktree `../dnd-tracker-landing`, від `main` `ac12c9281`).

## Мета

Привести лендінг (`/`, `/uk`) до дизайну платформи після Ч8a (tavern/parchment, золото лише для змісту, спільний фон `vey-strait`), зробити його коректним на 4K, додати паралакс (скрол + курсор, напрям — oneon.world/stay-tuned), нові блоки, свіжі скріни в новому дизайні та все, що потрібно для публічного запуску: Privacy/Terms/Cookies, аналітика, видалення акаунта.

**Не в обсязі:** увімкнення індексації (`SITE_INDEXING` лишається вимкненим), ціни/ранній доступ, юридична вичитка текстів (тексти — шаблон, звіряє власник), WebGL.

## Рішення власника (2026-11-26)

| Питання | Рішення |
|---|---|
| Паралакс | Обидва: курсор у hero + скрол у секціях |
| Шари | `vey-strait` + процедурні CSS-шари, без нових картинок |
| Скріни | Два набори: `uk` — HOMM5, укр. UI; `en` — SRD-демо, англ. UI; профіль героя в обох — HOMM5, герой з портретом (ризик IP бере власник) |
| Системи правил | D&D 5e (SRD 5.2), Grim d100 (без назви WFRP/Warhammer), власні модулі |
| Нові блоки | «Нові можливості», «Системи правил», «Замість 6 застосунків» |
| Оператор у legal | Плейсхолдери в константі |
| Прод | Privacy + Terms + Cookies, видалення акаунта, Vercel Web Analytics |
| Видалення акаунта | Герої в чужих кампаніях лишаються ДМу; опублікований шаблон, яким користуються інші, блокує видалення |

## Reuse

- `components/landing/*` (секції, `MediaFrame` на `next/image`, `SessionDemo`, `landing-metadata.ts`, `messages.ts` `keysOf/listOf`), `components/hud` (`HUD_SURFACE`, `hud-sc`, `metal-gold`), `LocaleSwitcher`, `FixedLocaleProvider`, `getTranslator`.
- Фон: файли `public/bg/vey-strait-{2k,4k}.webp` і правило з `app/globals.css` (`body::before` + вінʼєтка `body::after`); лендінг зараз їх вимикає (`landing.css`) — замість цього малює власний шар з тими ж файлами (окремий шар потрібен для transform).
- Скріни: `scripts/landing/capture-screens.mjs` + `shots.json` (`pnpm landing:screens`, `--login`, `--only`).
- Admin Supabase: `lib/supabase/admin.ts` (`createAdminClient`), `requireAuth`, `errorResponse`, `parseBody`.
- Підтвердження: наявний `ConfirmProvider` / `ResponsiveDialog`.
- Нове лише: компонент паралаксу за курсором, legal-сторінки, `account`-ендпоінт і сервіс видалення.

## Ч1 — візуал, 4K, паралакс

**Шари (знизу вгору), усі `position: fixed`/`absolute`, `pointer-events: none`, `aria-hidden`:**
1. `ld-bg` — `vey-strait` (`image-set`: 2k до 1920 px, 4k вище; `<link rel=preload>` для 2k з `fetchpriority=high`, бо фон стає LCP). Скрол: `translateY` 0 → −8 % за всю сторінку (`animation-timeline: scroll(root)`), курсор: ±12 px.
2. `ld-fog` — два радіальні/шумові градієнти, повільний дрейф (40–60 с), курсор ±24 px.
3. `ld-light` — м'яка пляма світла за курсором (radial-gradient з `--mx/--my`), opacity ≤ 0.12.
4. `ld-vignette` — як `body::after` платформи (rgba 0.72 по краях), щоб панелі мали контраст ≥ 4.5:1.

Без жаринок/частинок/глоу (планка «преміум» власника).

**Секції:** фонові акценти (скрін-«вітрина», декоративна мапа) рухаються зі швидкістю 0.9–1.1 через `animation-timeline: view()`; вміст тексту не рухається.

**Курсор:** `components/landing/PointerParallax.tsx` (`"use client"`, ~1 КБ): один `pointermove` (passive) → rAF → `document.documentElement.style.setProperty('--mx'|'--my', -1…1)`; згладжування lerp 0.08; вимкнено при `(pointer: coarse)` і `prefers-reduced-motion: reduce`; пауза при `visibilitychange`. Сторінка лишається статичною (`○`).

**Фолбек:** без `animation-timeline` (Firefox, старі Safari) — шари статичні; reduced-motion — усе статичне.

**4K:** контейнер `--ld-max: clamp(72rem, 80vw, 120rem)`; типографіка через `clamp()` (h1 2.5→6 rem, body 1→1.25 rem); сітки секцій розширюються до 3–4 колонок на ≥ 2560; hero і фонові секції на всю ширину. `sizes` у `MediaFrame` оновити під широкі контейнери (щоб 3840-варіант брався лише на 4K).

**Токени:** лише з Ч8a (tavern за замовчуванням; лендінг не має перемикача палітри — лишається tavern).

## Ч2 — секції й тексти

Порядок: Hero → Problem → **Replace (нова: «Замість 6 застосунків»)** → Combat → **Features (нова: «Нові можливості»)** → Mechanics → **Systems (нова)** → Prep → AI → Players → HowItWorks → FAQ → FinalCta. Навігація шапки — оновити `nav.items`.

- **Replace:** таблиця категорій (VTT/мапа, трекер ініціативи, нотатки й сценарій, музика/звуки, листи персонажів, показ гравцям) × «окремий застосунок» / CritNest; без назв конкурентів. Phone — картки замість таблиці.
- **Features:** 6–8 карток зі скріном/іконкою: лист персонажа, мапа світу (туман, слід загону, шари), редактор мап + імпорт UVTT, саундборд і музика, граф сценарію, копіювання контенту, MCP/AI.
- **Systems:** D&D 5e (SRD 5.2), Grim d100, «свої модулі/конструктор»; лічильники (заклинання, істоти, класи, раси) рахує `components/landing/template-stats.ts` на етапі збірки з `data/templates/*` (без БД; функція чиста, з тестом).
- Тексти EN/UK у `messages/{en,uk}/landing.json`; тест `__tests__/messages.test.ts` і parity лишаються зеленими; `{brand}` замість назви.
- Запис у `lib/onboarding/whats-new.ts` не потрібен (лендінг не в продукті).

## Ч3 — скріни

- Шляхи: `public/landing/{en,uk}/screen-<name>.webp`; `media.ts` отримує локаль (`showcaseMedia(locale)`).
- Розміри: desktop 1920×1200 CSS, DPR 2 → 3840 px webp q82; phone 390×844, DPR 3 → 1170 px. Ціль ≤ 450 КБ на 4K-кадр.
- Кадри: `battle`, `dashboard`, `hero` (лист), `world`, `scenario`, `show`, `constructor`, `map-editor`, `soundboard`, `player-mobile`.
- Джерела: `uk` — локальна копія з HOMM5 (prodcopy-клон, не prod); `en` — локальна БД `landingshots` (SRD-демо), крім `hero` — HOMM5-герой з портретом в англійському UI.
- `shots.json` → профілі `{ locale, db, campaignId, shots[] }`; скрипт: `--locale=en|uk`, `--profile`, `--only`. Сесію (`--login`) робить власник один раз.
- Telegram-прев'ю після деплою — @WebpageBot; OG-картка лишається брендовою.

## Ч4 — legal і аналітика

- Сторінки: `app/(legal)/{privacy,terms,cookies}/page.tsx` (EN) і `app/uk/{privacy,terms,cookies}/page.tsx`; статичні, спільний `LegalPage` у `components/landing/legal/`; тексти — `messages/{en,uk}/legal.json` (новий namespace через per-route scopes, бюджет у `scope-size.test.ts`).
- `LEGAL` у `lib/constants/site.ts`: `operatorName`, `operatorAddress`, `contactEmail`, `jurisdiction`, `updatedAt` — плейсхолдери (`TODO-operator`), щоб пошук у коді знаходив незаповнене. Тест: сторінки рендерять значення з `LEGAL`.
- Privacy: які дані (email, ім'я, аватар, контент кампаній, файли), мета й підстава (договір), субпроцесори (Supabase, Vercel + Web Analytics, Pusher, Resend, Google OAuth, Upstash, AI-провайдер за ключем користувача — BYOK), строки зберігання, права GDPR, видалення акаунта в профілі, контакт.
- Terms: опис сервісу (альфа, без гарантій), акаунт, контент користувача й ліцензія на зберігання, заборонений контент, контент третіх осіб (SRD 5.2 CC BY 4.0 — атрибуція з футера), припинення, відповідальність, зміни умов.
- Cookies: лише необхідні — auth-сесія Supabase, `NEXT_LOCALE`, палітра; аналітика без кук → банер не потрібен.
- Футер лендінгу й застосунку: посилання Privacy/Terms/Cookies; `sitemap.ts` — нові URL з hreflang; форма реєстрації — рядок «Створюючи акаунт, ви погоджуєтесь з Умовами і Політикою конфіденційності» з посиланнями.
- Аналітика: `@vercel/analytics` (`<Analytics />` у root layout — клієнтський компонент, root layout лишається без cookies/headers); CSP: same-origin `/_vercel/insights` (перевірити, що `script-src 'self'` і `connect-src 'self'` достатньо, у тому числі на nonce-маршрутах). Увімкнути Web Analytics у проєкті Vercel — дія власника.

## Ч5 — видалення акаунта

**UI:** профіль → «Небезпечна зона» → «Видалити акаунт»: діалог з поясненням наслідків, підтвердження введенням email, кнопка активна лише за збігу. Після успіху — вихід і редирект на `/`.

**API:** `DELETE /api/account` (тонкий `route.ts`: `requireAuth`, Zod `{ email }` = email сесії) → `lib/server/account/delete-account.ts`.

**Сервіс (порядок):**
1. **Гард шаблонів:** якщо користувач — ДМ кампанії-шаблону, з якої синхронізуються чужі кампанії (`campaign_source_syncs.sourceCampaignId` / `campaigns.createdFromId` / шари контенту — точний перелік таблиць фіксує план після проходу по схемі), → 409 з текстом-ключем і контактом підтримки.
2. Зібрати власні кампанії (`dmUserId`), їхні файли в Storage (обкладинки, мапи, музика, картинки контенту) і особисті файли (аватар, бібліотека звуків).
3. Транзакція: видалити власні кампанії (FK `Campaign.dm` — Restrict, тому явно; залежне — каскадом), далі `users` (каскад: членства, AI-ключі, нотатки, онбординг, звуки, сповіщення, `QuestTracking`; `Character.controlledBy` → `SetNull`, тобто герої в чужих кампаніях лишаються ДМу — перевірити, що SetNull справді на кожній ігровій сутності, а не каскад).
4. Після коміту: видалити файли Storage (помилки — у лог без персональних даних, не відкатують) і користувача Supabase (`auth.admin.deleteUser`). Якщо Supabase впав — 500 з ключем, рядка `users` вже нема; повтор запиту ідемпотентний (видаляє лише auth-користувача).

**Тести:** сервіс на скретч-БД (`deletetest_*`): власна кампанія з даними зникла; герой у чужій кампанії лишився з `controlledBy = null`; шаблон з підписниками → 409 і нічого не видалено; ідемпотентність. Маршрут: 401 без сесії, 400 при чужому email.

## Перевірка

- Lighthouse на `next start`: mobile ≥ 90, desktop ≥ 95 (perf/a11y/BP/SEO), обидві мови.
- Живий прогін: 390 / 1440 / 2560 / 3840, reduced-motion, тач-емуляція (курсор вимкнено), обидві мови, legal-сторінки, реєстрація (рядок згоди), видалення акаунта на локальній БД (тестовий акаунт), консоль чиста, CSP без порушень.
- Прев'ю-деплой гілки — фінальна перевірка там (глобальне правило).
- Гейти: `tsc`, `pnpm test:changed main`, `lint:dirs --changed main`, `pnpm cycles`; повний `test:run` один раз перед мерджем.

## Порядок і ризики

Ч1 → Ч2 → Ч4 послідовно в цій гілці; Ч3 (скріни) — окрема сесія паралельно (потрібен вхід власника); Ч5 — окрема гілка `feat/account-delete` з окремим Opus-рев'ю.

| Ризик | Захід |
|---|---|
| Фон як LCP погіршить mobile perf | preload 2k, `fetchpriority`, без 4k на мобільних |
| scroll-timeline не всюди | статичний фолбек, без JS-поліфіла |
| IP HOMM5/Grim | рішення власника; WFRP/Warhammer не згадується |
| Видалення зачепить чужі дані | гард шаблонів, SetNull-перевірка в тестах, скретч-БД |
| Legal-тексти не юридично вичитані | плейсхолдери `LEGAL`, вичитка власником до запуску індексації |
