# Дослідження: відео-фон карти бою та фонова музика DM

Контекст коду: `BattleMapConfig.background: string | null` (types/battle.ts:171), `<Image fill priority>` під SVG-сіткою (BattleMap.tsx:384),
завантаження в бакет `battle-maps` з `cacheControl` 1 рік (lib/supabase/battle-map-storage.ts), `LOCAL_MAP_PATH` приймає лише webp/jpg/png.
Обмеження: Supabase Free = 1 GB storage, ~5 GB cached + 5 GB uncached egress, ліміт файлу на Free 50 MB; Vercel Hobby (100 GB bandwidth).
Залишається Pusher (мало повідомлень, free-ліміти).

## 1. Відео-фон карти

### Рекомендація
Короткий (5-10 с) беззвучний loop, **два файли: MP4 H.264 (основний, працює скрізь, апаратне декодування) + опційно WebM VP9** як менший варіант;
плюс обов'язковий **poster (webp)** — він же fallback для reduced-motion / Save-Data / помилки. AV1/HEVC — не потрібні (iOS < 17 без AV1 hw; HEVC ліцензійно/браузерно нерівний).
Альфа-прозорість не потрібна (це фон); WebM VP9 alpha не працює в Safari, HEVC-alpha лише Safari — ігноруємо.

### Формат і бітрейт (бюджет egress)
- 1280x720 (на телефоні cover-фон на 1080p зайвий; для великих карт 1600x900 максимум), 24 fps, без звукової доріжки (`-an`), `+faststart`.
- H.264 High, CRF 28-30, ціль 0.6-1.2 Мбіт/с => 5-10 с = 0.5-1.5 MB. VP9 CRF 36-40 дає ~30-40 % менше.
- Приклад: `ffmpeg -i in.mov -an -vf scale=1280:-2,fps=24 -c:v libx264 -crf 29 -preset slow -movflags +faststart -pix_fmt yuv420p out.mp4`
- Ліміт на завантаження: <= 8 MB (валідація на клієнті й сервері), довжина <= 15 с.
- Egress-арифметика: відео 1.5 MB x 6 гравців x 1 перегляд = 9 MB на бій; браузерний кеш (`cacheControl` 1 рік, унікальне ім'я) => повторні сесії 0. Free-tier 10 GB вистачає на ~1000 перегляд-сесій. Нормально, на відміну від 20-30 MB роликів.
- Range-запити: Supabase Storage їх підтримує, `preload="auto"` для невеликого файлу ок.

### Альтернативи сховища
- Supabase Storage + CDN (cached egress окремий 5 GB) — залишити, є вже інфраструктура/RLS/бакет. Додати у бакет mime `video/mp4`, `video/webm`.
- `public/` у репо — тільки для вбудованих стокових loop-ів (як `/battle-maps/*.webp`), віддає Vercel CDN, але роздуває репо/деплой; для 3-5 дефолтних loop-ів по <1.5 MB ок.
- Vercel Blob — додатковий сервіс і ліміти Hobby; зайве. Зовнішній CDN (Cloudflare R2: безкоштовний egress) — найдешевший за egress, але нова залежність; розглядати лише якщо Supabase впреться у квоту.

### Animated WebP/AVIF vs відео
- Animated WebP/GIF: у 5-10x більші за H.264 при тій же якості, без апаратного декодування, не можна pause/seek, CPU-важкі на телефонах. Підходить лише для дуже коротких (1-2 с) малих (<512 px) ефектів, не для фону карти.
- Animated AVIF: добра компресія, але декодування програмне, підтримка анімації у Safari <16.4 нема; не рекомендовано.
- Висновок: відео краще у всіх вимірах, окрім "просто один тег img".

### Автоплей і loop
- Автоплей дозволений, якщо `muted` + `playsInline` (iOS Safari вимагає обох + `autoplay`); Chrome/Android — muted autoplay ок; Chrome desktop може блокувати за MEI лише для звуку. У React `muted` як атрибут працює нестабільно: ставити `video.muted = true` у ref/useEffect перед `play()`, а `play()` ловити (`.catch` -> лишити poster).
- iOS Low Power Mode блокує автоплей відео -> poster залишається; додати кнопку "play" не потрібно, просто деградація.
- Бездоганний loop: атрибут `loop` на HTML5 video часто дає мікро-паузу в рядку keyframe. Рішення (від простого): (1) змонтувати loop на рівні контенту — зробити відео, де останній кадр == перший (кросфейд у ffmpeg/DaVinci, 0.5-1 с); (2) keyframe на початку (`-g 24 -keyint_min 24`), короткий GOP; (3) за потреби два `<video>` з кросфейдом по `timeupdate` — не варто для MVP. Рекомендовано: (1)+(2).
- `preload="auto"`, `disablePictureInPicture`, `disableRemotePlayback`, `controls` відсутні, `aria-hidden`.

### Продуктивність при pan/zoom
- Елемент `<video>` має бути в тому ж трансформованому шарі, що й грід (CSS `transform: translate3d/scale` на спільному контейнері), `will-change: transform` лише на контейнері; не міняти `width/height`/`object-fit` під час жесту. Відео-текстура композититься на GPU, на сучасних телефонах 720p H.264 при 60 fps pan = ок.
- Не ставити `filter`, `mix-blend-mode`, `backdrop-filter` поверх відео.
- Зупиняти відео: `document.visibilitychange` (pause у фоні), `IntersectionObserver` не потрібен (карта на весь екран). На слабких пристроях: `navigator.hardwareConcurrency <= 4` або `deviceMemory <= 2` => показувати poster.
- Fallback до статики: `window.matchMedia("(prefers-reduced-motion: reduce)")`, `navigator.connection?.saveData` (Chromium-only, опційно), `effectiveType` in ('slow-2g','2g','3g') => не вантажити відео взагалі (`preload="none"`/не монтувати), лише poster. Також користувацький перемикач "Анімований фон" в налаштуваннях карти (localStorage), бо Low Power Mode не детектується.

### Next.js специфіка
- `next/image` відео не обробляє (і не оптимізує animated); використовувати нативний `<video>` з прямим URL Supabase Storage; `remotePatterns` для відео не потрібні. Poster можна віддавати через `next/image` (Vercel-кеш) або напряму.
- Не пускати відео через Vercel (`/_next/image` або route handler) — витрата Hobby-квот; тільки прямий CDN-URL зі Storage.
- CSP/`next.config`: перевірити `media-src`, якщо CSP налаштовано (зараз у next.config лише `images.remotePatterns` для `**.supabase.co`).
- SSR: `<video>` рендерити лише на клієнті або з `poster`+`preload="none"` в HTML, щоб не міняти перший HTML; `muted` гідрація — ставити в effect.

### Підгонка під конфіг (зворотно сумісна)
Зараз `background: string | null`. Мінімально-ламаючий варіант:
```ts
background: string | null;          // лишається, = still/poster (сумісність, мініатюри, fallback)
backgroundVideo?: { url: string; poster?: string; width?: number; height?: number } | null;
```
або `background: string | { kind: "image"; url } | { kind: "video"; url; poster }` з нормалізатором у одному місці (`readMapBackground`). Перший варіант дешевший: усі існуючі читачі продовжують працювати, Zod `.optional()`, міграція БД не потрібна (JSON у battleData/map config — перевірити, що це JSON). Серверна частина: `resolveMapBackgroundForPersistence` розширити на video (mime-whitelist mp4/webm, розмір <= 8 MB, перевірка magic-bytes), окремий `VIDEO_PATH` regex, повернення двох URL (video + poster). Для poster: клієнтський витяг першого кадру через canvas при завантаженні (вже є data-URL пайплайн для зображень) або вимагати завантаження окремо.
Дефолтні loop-и в `public/battle-maps/*.mp4` — за потреби як пресети.

### Обсяг роботи (оцінка)
| Таск | Оцінка |
|---|---|
| Тип/Zod + сумісність, `readMapBackground` | 0.25 дня |
| BattleMap: `<video>` у трансформованому шарі, poster, reduced-motion/saveData/visibility/play() catch | 0.5-0.75 дня |
| Upload: BattleFormMap (вибір файлу, валідація розміру/довжини, витяг poster), storage-функція, бакет mime | 0.75 дня |
| Тести (utils + компонент happy-dom), ручна перевірка iOS/Android | 0.5 дня |
| Разом | ~2-2.5 дня (MVP з однією URL + poster) |
Складне: iOS Low Power / автоплей без жесту, seamless loop (контентна проблема, не кодова), перевірка на реальних телефонах, ліміт 50 MB на Free (не проблема при <=8 MB). Серверне транскодування — не робити (нема ffmpeg на Vercel); ресурс обмежується валідацією, DM готує файл сам (дати у UI підказку з ffmpeg-командою).

## 2. Фонова музика DM

### (a) Власні треки
- Формат: MP3 128 kbps (або OGG Vorbis/Opus ~96 kbps; Safari/iOS грають Opus лише в CAF/mp4, тому для сумісності **MP3 або AAC/M4A**). Ціль: <= 4 MB на трек (~4 хв @128k = 3.8 MB).
- Сховище: новий бакет `battle-music` (або папка в існуючому), `cacheControl` 1 рік, унікальні імена; ліміт Free 1 GB storage => ~250 треків на всі кампанії; ліміт на кампанію (напр. 10 треків / 40 MB) обов'язковий.
- Egress: 4 MB x (1 DM + N гравців) за сесію; з кешем браузера повтор безкоштовний. Якщо музика тільки в DM — 4 MB x кількість треків, що DM слухає. Для синхронізації на всіх — множник x кількість гравців: 6 гравців x 5 треків x 4 MB = 120 MB за сесію; це ~25 сесій на 3 GB — відчутно, але ок.
- Плеєр: один `<audio>` (або `Audio` у модульному singleton/React context на рівні battle layout, щоб не переривався при навігації), плейлист у стані, next/prev, `volume`, loop (track/playlist), `ended` => наступний. `Media Session API` (`navigator.mediaSession.metadata`, action handlers) — керування з lock-screen/навушників, дає фонову роботу на Android/iOS.
- Модель даних: `campaign_tracks` (id, campaignId, title, url, durationSec, sortOrder) + RLS-міграція (вимога CLAUDE.md), або JSON-масив у кампанії для MVP (дешевше, без міграції; плейлист — до 20 елементів).
- Bundled-треки: тільки CC0 / явна ліцензія. Джерела: OpenGameArt (фільтр CC0), Kevin MacLeod / incompetech (CC-BY 4.0 — потрібна атрибуція), Pixabay Music (Pixabay Content License — не CC0, не можна перепродавати як окремий файл), Free Music Archive (змішані ліцензії — перевіряти кожен трек), freepd.com (CC0), Musopen (public domain записи). Тримати `CREDITS.md`/сторінку з атрибуцією навіть для CC0 (бажано). Користувацькі завантаження — відповідальність DM, додати ToS-підказку "лише твори, на які маєте права".
- Не завантажувати комерційну музику в репо.

### (b) YouTube
- Умови: IFrame Player API дозволений для вбудовування; вимоги Required Minimum Functionality: viewport >= 200x200 px, 16:9 бажано >= 480x270, не можна ховати/перекривати/обрізати плеєр або приховувати контролі так, щоб порушити UX; також заборонено відокремлювати аудіо від відео ("не можна дозволяти відтворення лише аудіо, відокремлене від відео" — розділ про separation of audio/video з YouTube API Services Developer Policies III.E.4.). Отже **"audio-only з прихованим плеєром" порушує політику** (ризик блокування API-клієнта/відео; технічно `display:none` iframe або 1x1 px може працювати, але це проти ToS). Легально: видимий міні-плеєр >= 200x200 (можна згорнути до панелі, але не прихований).
- Автоплей: у браузерах лише після жесту користувача (або `mute`); на iOS Safari `playVideo()` без тапу ігнорується; `autoplay=1` у `playerVars` не гарантований. DM натискає Play = жест, ок.
- Фонове відтворення на мобільних: iframe-плеєр зупиняється при блокуванні екрана/згортанні вкладки на iOS і часто на Android Chrome (без YouTube Premium); на desktop працює у фоновій вкладці. Тобто для DM на телефоні — ненадійно.
- Додатково: реклама в роликах, видалені/регіон-заблоковані/embed-disabled відео (onError 101/150), немає контролю гучності між треками (є `setVolume`), немає точного crossfade. Плейлисти YouTube підтримуються (`list=`).
- Парсинг посилання: витягти `videoId` (youtu.be/, watch?v=, shorts, `list=`) через Zod-regex; використовувати `youtube-nocookie.com` (`host: "https://www.youtube-nocookie.com"`); завантажувати `https://www.youtube.com/iframe_api` динамічно, лише коли DM відкрив YouTube-режим.
- Висновок: YouTube — це "додаткова опція" з видимим міні-плеєром, не основа.

### Ключове питання: лише у DM чи синхронно всім
| | Локально (лише DM) | Синхронно (всі гравці) |
|---|---|---|
| Складність | низька, 0 Pusher-подій | висока |
| Egress | мінімум | x N гравців |
| Надійність | висока | autoplay-блок на кожному клієнті (потрібен жест "Увімкнути музику"), дрейф, мобільні паузи |
| Реальний сценарій D&D | DM чи так грає з колонки/Bluetooth у кімнаті (очні ігри) або голосовий чат (Discord) | корисно, коли гравці віддалено і без Discord |

**Рекомендований MVP: лише на пристрої DM** (+ пізніше опційний режим "транслювати гравцям" як v2). Обґрунтування: більшість груп уже мають спільний звук (кімната/Discord), синхронізація дорога за egress і крихка на iOS.

### Синхронізація (v2, якщо вирішите робити)
- Подія в канал битви (Pusher `music-state`, мала, не через `battle-delta` щоб не інкрементувати `version`): `{ trackId|url, playing, positionSec, startedAtServerMs, volumeHint, seq }`. DM-команди: play/pause/seek/next/volume. Стан зберігати в `Battle`/кампанії (JSON) лише для пізнього приєднання (late join), оновлювати при зміні треку/паузі, не по таймеру.
- Позиція = `positionSec + (Date.now() + clockOffset - startedAtServerMs)/1000`; `clockOffset` оцінити один раз із заголовка `Date` відповіді API (або ping-pong). Клієнт: при отриманні — `audio.currentTime = target` якщо `|drift| > 0.5-1 с`, інакше не чіпати; перевірка раз на 10-15 с із ліком через `playbackRate` 0.98-1.02 для плавної корекції; для музики фону допустимий дрейф ~1 с — точна синхронізація не потрібна.
- Автоплей: кожен гравець бачить кнопку/банер "Увімкнути музику DM" (жест => `audio.play()` розблоковується для сесії); поки не тапнув — тихо ігнорувати події. Гравець має локальні mute/volume (localStorage).
- Pusher: не слати position-тики; лише зміни стану (~1-5 подій на сесію) — вкладається в free-ліміт.
- YouTube синхронно: `seekTo`, `getCurrentTime`; ті ж проблеми + кожен гравець показує видимий плеєр; ще складніше, не робити.

### Оцінка роботи
| Варіант | Оцінка |
|---|---|
| MVP A: локальний плеєр DM з власними треками (бакет, upload UI, список, next/prev/volume/loop, Media Session, ліміти, тести) | 2-3 дні (без міграції — JSON у кампанії; з таблицею + RLS + API/hook — 3-3.5) |
| Додати YouTube (парсинг, IFrame API, видимий міні-плеєр, обробка помилок) | +1-1.5 дня |
| Bundled CC0-пак (5-10 треків, відбір/конвертація, кредити) | +0.5 дня |
| v2 синхронізація для гравців (Pusher-подія, late-join стан, clockOffset, UI "Увімкнути", mute) | +3-4 дні |

Що складно: iOS autoplay/lock-screen, ліцензії, ліміти сховища/egress, YouTube ToS (видимий плеєр), синхронізація дрейфу, збереження аудіо-елемента між навігаціями (глобальний провайдер у layout).

## Підсумкові рекомендації
1. Відео-фон: MP4 H.264 720p <= 8 MB, без звуку, 5-15 с, bezshovnyi loop у самому контенті, poster webp, fallback на poster (reduced-motion, saveData, слабкий пристрій, помилка play). Конфіг: додати `backgroundVideo?: {url, poster}` поруч із `background`. ~2-2.5 дня.
2. Музика: MVP лише на DM, власні MP3 (<= 4 MB, ліміт на кампанію), плейлист + Media Session; YouTube — другий етап з видимим плеєром (audio-only приховано заборонено ToS). 2-3 дні (+1-1.5 YouTube, +3-4 синхронізація).

## Джерела
- YouTube API Services - Required Minimum Functionality: https://developers.google.com/youtube/terms/required-minimum-functionality
- YouTube API Services Developer Policies (розділ про відокремлення аудіо/відео): https://developers.google.com/youtube/terms/developer-policies
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- Supabase pricing / Storage egress: https://supabase.com/docs/pricing , https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing
- MDN autoplay guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- WebKit "New video policies for iOS": https://webkit.org/blog/6784/new-video-policies-for-ios/
- MDN Media Session API: https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API
- OpenGameArt CC0 / freepd.com / incompetech (ліцензії перевіряти по кожному треку).
Примітка: за YouTube ToS пункт про audio-only підтверджено лише з пам'яті політики (пошук повернув тільки Required Minimum Functionality) — перед реалізацією перечитати Developer Policies III.E.4.
