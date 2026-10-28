# Лендінг і авторизація

## Лендінг (`/`)

- Статична сторінка (`○ /` у збірці, CDN-кеш). Root layout **не читає сесію**: email у шапці береться на клієнті (`useSessionEmail`, `getSession` з cookie — лише для показу), тому будь-який `cookies()`/`getClaims` у `app/layout.tsx` знову зробить усі сторінки динамічними.
- Проксі на `/` не ходить у Supabase (`lib/supabase/middleware.ts`); виняток — `/?code=` / `/?token_hash=` (Supabase повертає на Site URL, якщо `redirectTo` не в allow-list) → редірект на `/auth/callback`.
- «Гість / учасник» у CTA — `SessionSwitch` + `useHasSessionCookie` (наявність cookie `sb-…-auth-token`), без supabase-js у бандлі.
- Код: `components/landing/`. Двомовність: словники `copy/{en,uk}.ts` (типи й `getCopy(locale)` — `copy/types.ts`, `copy/index.ts`; ключі однакові, тест заборонює кирилицю в EN і зайву латиницю в UK), маршрути `/` (EN) і `/uk`, перемикач мови в шапці. Назва продукту — лише `BRAND` (`lib/constants/site.ts`). `lang` ставиться на обгортку лендінгу (`<div data-landing lang=…>`); root `<html lang="uk">` лишається, щоб не ламати статичність. Секції — `sections/*` (Hero, Problem, Combat, Mechanics, Prep, AiSection, Players, HowItWorks, Faq, FinalCta), картинки й іконки — `media.ts`, прапорець блоку шаблонів — `flags.ts` (`LANDING_TEMPLATES`, зараз `false`: нотатка про офіційні шаблони не рендериться). Стилі й CSS-таймлайн демо — `landing.css` (8-секундний цикл, усі `ld-*` анімації ключуються на ті самі відсотки). Мапа демо й силуети токенів — статичні `public/landing/battle-map.svg`, `tokens.svg` (сітка 16×10: центр клітинки = (c+0.5)·6.25%, (r+0.5)·10%). Скріни продукту — `public/landing/screen-*.webp`.
- Шляхи лендінгу — `LANDING_PATH`/`LANDING_PATHS` у `lib/constants/site.ts`; їх читають проксі (без Supabase), `HeaderGate`, `Breadcrumbs`, метадані й sitemap. Нова мова = запис у `LANDING_LOCALES`/`LANDING_PATH` + словник.
- Нижні секції — `.ld-lazy` (`content-visibility: auto`), щоб спрайти й картинки не вантажились до першої відмальовки. Шапка застосунку (`HeaderGate` → dynamic `Header`) і діалог `ConfirmProvider` — ліниві чанки.
- `experimental.inlineCss` у `next.config.ts` — CSS у HTML, без блокуючих запитів (діє на всі сторінки).
- SEO: метадані й JSON-LD (WebApplication + FAQPage, мова з відповідного словника) у `app/page.tsx` і `app/uk/page.tsx`; `app/sitemap.ts` — обидві URL з hreflang; `app/robots.ts`. Індексація вимкнена, доки не задано `SITE_INDEXING=1`; домен — `NEXT_PUBLIC_SITE_URL` (`lib/constants/site.ts`).
- Lighthouse: цифри для старого лендінгу (desktop 100/100/100/100, mobile 91/100/100/100) — для v2 не перемірювано.

## Авторизація

- Способи: Google OAuth і email + пароль (Supabase Auth, підтвердження пошти обов'язкове).
- Екрани (`components/auth/AuthScreens.tsx`): `/sign-in`, `/sign-up` (→ «Перевірте пошту» + повторний лист), `/forgot-password`, `/reset-password`; налаштування `/settings/password` (Google-користувач може додати пароль). Supabase-виклики — лише в `lib/hooks/auth/useEmailAuth.ts`; схеми — `lib/schemas/auth.ts`; тексти помилок за кодами Supabase — `AUTH_ERRORS` у `lib/constants/auth.ts`.
- `/auth/callback` приймає всі посилання: OAuth `code`, листи (`code` для PKCE або `token_hash` + `type`). `next` — лише внутрішні шляхи (`safeNextPath`); recovery → `/reset-password`, помилки recovery → `/forgot-password?error=…`. Тут же `ensureDbUser` створює рядок `users` (ім'я з `user_metadata.full_name`).
- PKCE: посилання з листа треба відкрити в тому ж браузері (інакше `flow_state_not_found` з поясненням).
- Налаштування Supabase (вручну): власний SMTP (вбудований шле лише учасникам команди проєкту), Redirect URLs `https://<домен>/**` і `http://localhost:3000/**`.
