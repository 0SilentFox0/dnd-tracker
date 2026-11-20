# Media egress: Cloudflare-кеш, стиснення, Upstash

## Мета
Зняти Supabase egress (free: 5 ГБ) з шляху видачі картинок і закрити дірку rate-limit без Redis. Без міграції файлів і URL у БД.

## Що вже є (reuse, нічого не пишемо заново)
- Обрізання історії сценарію: `lib/server/scenario/versions.ts` (`pruneVersions`, `SCENARIO_MAX_VERSIONS = 50`), список версій не віддає `content`. Єдина зміна: ліміт 50 → 20 (`lib/constants/scenario.ts`) і разова чистка прод-рядків понад 20.
- Клієнтське стиснення: `lib/utils/common/image-resize.ts` (quality 0.85), ліміти `SLIDE_MAX_EDGE_PX = 2560`, `WORLD_MAP_MAX_EDGE_PX = 6000`.
- Redis і rate-limit: `lib/redis.ts` (читає `UPSTASH_REDIS_REST_*` і `KV_REST_API_*`), `lib/utils/api/rate-limit.ts` (`memoryFallback`, `failClosed`).
- URL-хелпери: `lib/utils/common/image-url.ts` (`parsePublicStorageUrl`, `isHostedOnProjectStorage`, `isSupabaseStorageUrl`), `supabaseImagePatterns()` у `next.config.ts`.

## 1. Cloudflare Worker перед Supabase Storage
- `infra/media-worker/`: Worker (`wrangler.toml`, `src/index.js`) на `*.workers.dev`.
- Приймає лише `GET`/`HEAD` на `/storage/v1/object/public/*`, решта 404/405.
- Проксіює на `https://<ref>.supabase.co` з `cf.cacheEverything` і TTL 1 рік для 2xx (імена файлів незмінні: новий upload = новий шлях), 60 с для 404, 0 для 5xx. Додає `Access-Control-Allow-Origin: *`.
- Origin задається змінною Worker `ORIGIN`, не хардкодом.
- Деплой: `wrangler deploy` з токеном у змінних середовища, токен не зберігається в репо.
- Зміна коду: змінна `NEXT_PUBLIC_MEDIA_BASE_URL`. Нова функція `toMediaUrl(src)` в `image-url.ts` підміняє хост Supabase Storage на media-хост, лише коли змінна задана (інакше нічого не міняється). Викликається в єдиному місці рендеру: `normalizeImageUrl`/`OptimizedImage` і компонентах з `unoptimized`. Стародавні URL у БД теж виграють, бо підміна йде при рендері.
- `parsePublicStorageUrl`, `isHostedOnProjectStorage`, `isSupabaseStorageUrl` і `remotePatterns` у `next.config.ts` приймають обидва хости.
- Запис (signed upload, `createSignedUploadUrl`) лишається в Supabase без змін.
- Відкат: прибрати змінну, і все повертається до прямих URL.

## 2. Стиснення
- `SLIDE_MAX_EDGE_PX` 2560 → 1920, `WORLD_MAP_MAX_EDGE_PX` 6000 → 4096, quality для карт і слайдів 0.85 → 0.8. Перевірити, що ліміти не ламають існуючі тести й межі UVTT/калібрування карт.
- Скрипт `scripts/media/recompress.ts` для існуючих файлів у `scene-slides`, `battle-maps`, `world-maps`: за замовчуванням dry-run зі звітом економії, `--apply` перезаписує об'єкт під новим шляхом і оновлює URL у БД. Запуск на проді тільки з явного «так».

## 3. Upstash
- Створюється через Vercel Marketplace (`vercel integration add upstash`, регіон fra1), змінні потрапляють у проєкт автоматично (`KV_REST_API_*`).
- Тест, що з Redis ліміт реально рахується, а без нього `memoryFallback`-шляхи не падають. Окремо перевірити, що `failClosed: true` у битві без Redis поводиться так, як задумано.

## Не робимо
R2, міграція файлів, власний домен (`media.critnest.com`, пізніше достатньо змінити `NEXT_PUBLIC_MEDIA_BASE_URL`), зміна Auth.

## Перевірка
- Юніт-тести `toMediaUrl` (з змінною і без, обидва хости, чужий хост не чіпається).
- `curl -I` до Worker: `cf-cache-status: MISS`, потім `HIT`; Supabase-запити в логах не ростуть при повторних запитах.
- Браузер на деплої гілки: картинки карт і слайдів вантажаться з media-хоста, показ працює.
- Egress в дашборді Supabase через добу після деплою.

## Порядок
1. Worker + `NEXT_PUBLIC_MEDIA_BASE_URL` + `toMediaUrl`. 2. Стиснення + скрипт. 3. Upstash + ліміт версій.
