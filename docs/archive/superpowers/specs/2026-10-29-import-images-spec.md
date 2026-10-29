# Зображення в імпорті компендіуму — спека

Дата: 2026-10-29. Гілка `feat/import-images` (worktree `../dnd-tracker-images`, від main `1c3c79e4`).
План: `docs/superpowers/plans/2026-10-29-import-images-plan.md`.
Пов'язане: `docs/architecture/content-api.md` (розділи «JSON-компендіуми», «Кампанійний JSON-компендіум»), `docs/STATUS.md` (хвіст «Імпорт компендіуму: зображення»).

## 1. Проблема

Зараз імпорт компендіуму (`lib/server/compendium-import`, UI `components/content-import`, сторінка `/campaigns/[id]/dm/compendium`) **пропускає всі зображення**: поля `fluff`/`foundry*`/`token*` → `MEDIA_OR_FOUNDRY_SKIPPED` (`adapters/shared.ts → unsupported`), вузли `image`/`gallery` у `entries` → `MEDIA_SKIPPED` (`entries.ts → renderEntries`). Корені `monsterFluff`/`raceFluff` ігноруються.

Obojima (`~/Downloads/1985 Games; Obojima - Tales from the Tall Grass.json`, заміряно 2026-10-29): 1181 URL, **723 унікальні картинки**, усі `webp` на `raw.githubusercontent.com`. Розподіл: глави книги/пригоди (`bookData`/`adventureData` `entries[].images[]` і `type:"image"`) ≈ 560 входжень; `item`/`baseitem` `fluff.images` 369; `monster.tokenHref` 70 + `monsterFluff` 61; `spell.foundryImg` 50; `subclass`/`background`/`raceFluff`/`spell` fluff ≈ 26. Вибірка 17 файлів: 52 КБ–2,2 МБ, медіана ≈ 130 КБ, середнє ≈ 300 КБ → повний Obojima ≈ 150–220 МБ.

Домени в `next/image` `remotePatterns` динамічно додавати не можна (довільні компендіуми). Отже зображення **копіюються в наше сховище** (Supabase Storage), а в записи пишуться наші URL.

## 2. Рішення користувача (зафіксовано)

1. **Коли:** на кроці **підтвердження**. Після застосування (commit транзакції) сервер качає всі картинки в Supabase Storage, у записах — наші URL; UI показує прогрес і звіт «N збережено / M не вдалося» з причинами.
2. **Ліміти:** ≤ 1 МБ на файл; лише png/jpg/webp/gif, перевірка **magic bytes** (не лише `Content-Type`); ≤ 1000 зображень на імпорт. Перевищення — пропуск із рядком у звіті.
3. **SSRF:** лише `https`; без приватних/loopback/link-local IP (резолв DNS + перевірка); без редиректів на приватні адреси (перевірка кожного кроку); таймаут; ліміт розміру під час стрімінгу.
4. **Egress (Supabase free tier):** immutable `cacheControl` (рік), ім'я файлу = content-hash (дедуп між імпортами й кампаніями), віддача через `next/image`.
5. **Без зайвих схем/міграцій.** Перевірено: **міграція не потрібна** (див. §6).

## 3. Що перевикористовуємо (reuse before writing)

| Що | Де | Як |
|---|---|---|
| SSRF-безпечне завантаження | `lib/utils/api/safe-fetch.ts` → `safeFetchBuffer`, `assertPublicHttpsUrl`, `isPrivateIp` | https-only, DNS-резолв і перевірка **кожного** редиректу (≤ 3), таймаут 10 с, стрімінговий ліміт `maxBytes`, `content-length` precheck. Беремо як є з `maxBytes = 1 МБ`. |
| Magic bytes | `sniffImageMime` там же | png/jpeg/gif/webp — рівно наш набір. |
| Коди помилок fetch | `API_ERRORS.SAFE_FETCH_*` | мапимо на причини звіту (`MEDIA_*`). |
| Бакет із лімітами | `lib/supabase/buckets.ts → ensureBucket` | публічний бакет з `fileSizeLimit` і `allowedMimeTypes` (як `imageBucketStorage.ensure`). |
| Admin-клієнт (service role) | `lib/supabase/admin.ts → createAdminClient` | лише сервер; ключ не потрапляє в логи/відповіді. |
| Кеш-рік | `YEAR_CACHE_SECONDS` (`lib/constants/storage.ts`) | `cacheControl` для immutable об'єктів. |
| «Вже наш URL» | `isHostedOnProjectStorage` (`lib/supabase/image-storage.ts`) | валідація `src` у вузлі сценарію; `persistIcon` артефактів сам пропускає наші URL (див. §7.4). |
| Рендер зображень | `components/common/OptimizedImage.tsx` | Supabase URL → `next/image` з оптимізацією (кеш Vercel), інші — `unoptimized`. `**.supabase.co/storage/v1/object/public/**` уже в `remotePatterns`. |
| Транзакція / блокування | `withCampaignContentWrite`, `prismaImportRepository.transaction` | короткі записи результатів, без мережі всередині. |
| Запис контенту | `CONTENT_RESOURCES[kind].find/update` (як `repository.write`) | встановлення `icon`/`avatar` через ті самі ресурси й guards. |
| Сторінки сценарію | `contentWrite`, `snapshotIfDue` (`lib/server/scenario/*`) | оновлення `src` у вузлах. |
| HTTP-обгортка | `compendiumRoute` (`http.ts`): same-origin, session-DM, `checkRateLimit`, `privateJson`, фіксовані коди | новий режим `"media"`. |
| Клієнт API | `lib/api/compendium.ts` (`campaignPost`) | `processCompendiumMedia`. |
| UI-примітиви | `LoadingState` (`components/common/states`), `HudPanel`/`HudPill`, `Button`, `ActionBar`, `StepIndicator`; progressbar-розмітка як у `components/music/TrackList.tsx` | прогрес і звіт. |
| Звіт/i18n | `translateCompendiumReport`, `messages/{uk,en}/compendium*.json`, `labels.ts` (`infoSummary`) | причини як `issues.*`-подібні ключі. |
| Онбординг | `lib/onboarding/whats-new.ts`, `help/dm.ts` (`compendium-import`) | новий запис + секція статті. |

Нового пишемо лише: збирач медіа з 5etools-рядків, чергу медіа у звіті запуску, батч-обробник із «орендою» (lease), бакет `compendium-media`, вузол `image` у сценарії, UI прогресу/звіту. Причина: нічого з цього не існує; дзеркалення `resolveImageForPersistence` не підходить напряму (ліміт 5 МБ, випадкове ім'я замість content-hash, шлях із `campaignId`, виклик синхронно в запиті).

## 4. Які зображення куди

Одне зображення на сутність (поле-ікона), усі — у главах матеріалів.

| Ціль (`TargetKind`) | Поле | Джерело (за пріоритетом) |
|---|---|---|
| `units` | `avatar` | `tokenHref` → `monsterFluff[name,source].images[0]` → `fluff.images[0]` |
| `spells` | `icon` | `foundryImg` → `fluff.images[0]` (`spellFluff` теж) |
| `artifacts` | `icon` | `foundryImg` → `fluff.images[0]` (`itemFluff`/`baseitemFluff`; `magicvariant.inherits.fluff`) |
| `races` | `icon` | `raceFluff[name,source].images[0]` → `fluff.images[0]` |
| `classes`, `feats`, `backgrounds` | `icon` | `<kind>Fluff` → `fluff.images[0]` |
| `scenarioPages` (глави `book`/`adventure`) | вузол `image` у `notes` рядка | усі `type:"image"` і елементи `type:"gallery"` у порядку тексту |

- Вкладені записи (`nested`: підкласи, підраси) поля не мають — їхні картинки пропускаються з причиною `MEDIA_NESTED` (інформаційно).
- Друге й наступні зображення сутності — `MEDIA_EXTRA` (не качаються: економія сховища).
- Обкладинки `book/adventure.cover`, `_meta.fonts`, `foundry*`-корені — не беремо (лишається `MEDIA_OR_FOUNDRY_SKIPPED`/`UNSUPPORTED_CATEGORY`).
- `href.type === "internal"` (шлях відносно репозиторію 5etools без бази) → `MEDIA_INTERNAL_PATH`.
- Поля, які тепер оброблено (`fluff`, `foundryImg`, `tokenHref`, `hasFluffImages`, `hasToken`), більше не дають `MEDIA_OR_FOUNDRY_SKIPPED`.

Адаптер **не кладе** URL у `body` запису: медіа йдуть окремим каналом `AdaptedEntry.media`. Так diff/baseline/локальні правки ДМ (`managedProjection` у `plan.ts` проектує лише ключі baseline) не бачать іконок, а повторний імпорт лишається `unchanged`.

## 5. Потік

```
preview  ── adapt → entry.media[] ──► report.media = { queued, skipped{reason:n} }   (без мережі)
confirm  ── tx (як зараз) + черга медіа в run.report.media + attribution.images      (без мережі)
          ◄── відповідь: report (media.pending = N)
client   ── POST /compendium/media {runId} … поки pending > 0                         (батчі)
             сервер: claim(lease) → fetch+validate+upload (поза tx, concurrency 6)
                     → коротка tx: icon/avatar / src у сторінках + статуси
```

### 5.1 Preview

`collectEntryMedia` (чиста) заповнює `entry.media: MediaRef[]`. `buildMediaQueue` (чиста) рахує по плану: дедуп за нормалізованим URL, порядок = порядок `plan.writes`, перші 1000 унікальних — `queued`, решта — `MEDIA_LIMIT`; невалідні URL (не https, > 1024 символів, не парситься) — `MEDIA_INVALID_URL`/`MEDIA_HTTPS_ONLY` **уже на preview**. `report.media = { queued, skipped }`. `entry.media` входить у `plan.writes` → у `plan.hash` → токен preview покриває і медіа.

`ADAPTER_VERSION` → `"5etools-2"` (змінився вихід адаптера: вузли `image` у сторінках).

### 5.2 Confirm (транзакція, без мережі)

Після записів (коли відомі справжні `localId` з `idMap`) у тій самій tx:
- `report.media = MediaQueueState` (див. §6) зберігається через чинний `saveRun`;
- у `CompendiumEntry.attribution.images = [{ url, role, mediaId? }]` — **оригінальний URL** (атрибуція й повтор).

Мережі в tx немає: завантаження довге (сотні запитів), а tx має ліміт 30 с і тримає campaign lock.

### 5.3 Батчі `POST /api/campaigns/[id]/compendium/media`

Тіло `{ runId: string, retryFailed?: boolean }`. Session-DM, same-origin, rate limit `compendium-media` 60/хв, `maxDuration = 60`.

1. **Claim** (коротка tx, `SELECT … FOR UPDATE` рядка `compendium_import_runs`): до 30 елементів у статусі `pending` або з простроченою орендою → `leaseUntil = now + 90 с`. `retryFailed` спершу переводить `failed` з `retryable: true` у `pending` (і `attempts` не скидає; ліміт 3 спроби → далі `retryable: false`).
2. **Обробка поза tx**, concurrency 6, дедлайн 40 с від початку запиту (нові не стартують; незапущені — оренда знімається):
   - відомий URL (той самий URL уже `saved` у цьому або одному з останніх 50 запусків кампанії) → беремо `storedUrl` без завантаження;
   - інакше `fetchImportImage(url)` → `safeFetchBuffer(url, { maxBytes: 1 МБ })`; статус ≠ 2xx → `MEDIA_HTTP_STATUS {status}` (5xx/429 — retryable); оголошений `Content-Type` має бути `image/*` (не `image/svg+xml`) або `application/octet-stream`; `sniffImageMime(bytes)` ∈ {png,jpeg,gif,webp} — інакше `MEDIA_BAD_FORMAT`; `sha256(bytes)`;
   - `storeCompendiumImage(bytes, mime, sha)` → бакет `compendium-media`, шлях `<sha[0..2]>/<sha>.<ext>`, `upsert: false`, `cacheControl: YEAR_CACHE_SECONDS`, `contentType: mime`; «вже існує» = успіх (дедуп між кампаніями); таймаут upload 15 с → `MEDIA_STORAGE_FAILED` (retryable).
3. **Apply** (коротка tx у `withCampaignContentWrite`): для кожного успіху — кожна ціль:
   - поле `icon`/`avatar`: читаємо рядок ресурсом; якщо значення порожнє або дорівнює `storedUrl` → `resource.update(actor, row, { [field]: storedUrl })`; інакше ціль `skipped: MEDIA_TARGET_CUSTOMIZED` (ДМ поставив свою картинку — не перетираємо); рядка нема → `MEDIA_TARGET_GONE`;
   - сторінка: у `content` знаходимо вузли `image` з `attrs.mediaId === id` без `src` → ставимо `src`; одна `update` сторінки на батч (`contentWrite`, `version +1`); вузла нема (ДМ видалив) → `MEDIA_TARGET_GONE`.
   Статуси й лічильники записуються в `run.report.media`.
4. Відповідь — `MediaProgress` (лише лічильники + ≤ 100 невдач), не повний звіт.

Campaign lock зайнятий (NOWAIT → `CONTENT_CONFLICT` 409) або 429 → клієнт чекає 2 с і повторює (≤ 3 рази), далі пауза з кнопкою «Продовжити».

### 5.4 Ідемпотентність, відновлення, часткове виконання

- Оренда (lease) переживає вбиту функцію Vercel: прострочений елемент знову `pending`.
- Повторний виклик батчу після завершення — no-op з тим самим прогресом.
- Закрита вкладка: решта лишається `pending`; у списку запусків відкритий звіт показує «Продовжити збереження».
- Повторний імпорт того самого файла: черга будується знову, але відомі URL беруться з попередніх запусків без завантаження; цілі з уже нашим URL — no-op.
- Сторінка після reimport: вузли `image` без `src` в adapted-body, тож `mergeValue` залишає локальний `src` (ключа немає в incoming); якщо структура глави змінилась (інша довжина масиву) — `src` зникне, але наступний батч відновить його з відомих URL без мережі.
- Невдала картинка: запис уже створено **без зображення** (`icon` = null / вузол без `src` не рендериться гравцям; ДМ бачить плейсхолдер «зображення не збережено»). «Повторити невдалі» — для retryable причин.

### 5.5 Чому не все в confirm / не фоново

Confirm уже має бюджет 60 с (planning 15 с + tx 30 с). 700 завантажень ≈ 1–3 хв навіть з concurrency 6. `after()`/`waitUntil` у Next 16 живуть у межах того ж `maxDuration`. Черги (Vercel Queues/Workflow) — нова інфраструктура. Клієнтські батчі — найпростіше, відновлювано й чесно показує прогрес.

## 6. Дані без міграції

- **Іконки/аватари:** у всіх цільових моделях уже є поле (`Unit.avatar`, `Spell.icon`, `Artifact.icon`, `Race.icon`, `GameClass.icon`, `Feat.icon`, `Background.icon`).
- **Вузол `image` у сценарії:** `ScenarioPage.content` — JSON; додаємо тип у `NODE_TYPES` і перевірку attrs у `lib/schemas/scenario.ts`. Колонок не треба.
- **Черга медіа:** `CompendiumImportRun.report` (JSON) отримує розділ `media`:

```ts
type MediaReason = "MEDIA_INVALID_URL" | "MEDIA_HTTPS_ONLY" | "MEDIA_INTERNAL_PATH" | "MEDIA_LIMIT" | "MEDIA_EXTRA" | "MEDIA_NESTED"
  | "MEDIA_PRIVATE_HOST" | "MEDIA_DNS" | "MEDIA_TIMEOUT" | "MEDIA_TOO_LARGE" | "MEDIA_REDIRECTS" | "MEDIA_HTTP_STATUS"
  | "MEDIA_BAD_FORMAT" | "MEDIA_FETCH_FAILED" | "MEDIA_STORAGE_FAILED" | "MEDIA_TARGET_CUSTOMIZED" | "MEDIA_TARGET_GONE";
interface MediaTarget { kind: TargetKind; localId: string; field?: "avatar" | "icon"; mediaId?: string; status?: "saved" | "skipped"; reason?: MediaReason }
interface MediaItem { id: string; url: string; targets: MediaTarget[]; status: "pending" | "saved" | "failed"; reason?: MediaReason; params?: { status?: number }; retryable?: boolean; storedUrl?: string; leaseUntil?: number; attempts: number }
interface MediaQueueState { version: 1; items: MediaItem[]; skipped: Partial<Record<MediaReason, number>> }
```

  `id` = перші 24 hex `sha256(url)`; він же `mediaId` вузла сторінки. Розмір: 1000 × ~300 Б ≈ 300 КБ у найгіршому випадку; `GET …/reports?runId=` віддає звіт із `media`, обрізаним до лічильників і ≤ 100 невдач (`mediaPresentation`).
- **Оригінальний URL:** `CompendiumEntry.attribution.images` (JSON) — бачить ДМ у «Джерело» (`SourceNotes`, URL як текст).
- **Бакет** `compendium-media` створює `ensureBucket` під час першого батчу (`public`, `fileSizeLimit: 1 МБ`, `allowedMimeTypes` 4 типи) — Storage сам відкине чужий тип/розмір. Таблиць `public` не додається → RLS-правило не зачіпається.

Звіт запуску досі «незмінний» щодо записів контенту; розділ `media` — єдина частина, що оновлюється після commit (документуємо в `content-api.md`).

## 7. Безпека

1. **SSRF** — `safeFetchBuffer`: https-only; `localhost`/`*.localhost`; IP-літерали й усі адреси DNS-резолву перевіряються `isPrivateIp` (RFC1918, loopback, link-local 169.254/fe80, CGNAT, multicast, ULA, IPv4-mapped/NAT64/6to4 IPv6); кожен редирект (≤ 3) перевіряється заново, `redirect: "manual"`; таймаут 10 с на весь ланцюг; `content-length` precheck і стрімінговий ліміт 1 МБ. Додаємо тести для десяткового IP (`https://2130706433/`), `::ffff:127.0.0.1`, редиректу на `http://`, на приватний хост.
   **Залишковий ризик DNS rebinding** (перевірка й `fetch` резолвлять окремо): приймаємо, як і для чинного дзеркалення аватарів. Обґрунтування: тіло відповіді не повертається користувачу інакше, ніж як валідоване зображення (magic bytes), функції Vercel не мають цінної приватної мережі, нових залежностей (`undici` Agent з pinned lookup) не додаємо. Зафіксовано як відоме обмеження.
2. **Формат:** `sniffImageMime` обов'язковий; SVG ніколи (XSS); `Content-Type` бакета = sniffed mime.
3. **Service role:** лише `createAdminClient` у server-only модулях (`import "server-only"`); помилки Storage мапимо на `MEDIA_STORAGE_FAILED` без тексту/ключів; `console.warn` без URL з query-рядком і без тіла.
4. **Права:** лише session-DM цільової кампанії; `runId` перевіряється на належність `campaignId`; цілі — лише з черги, яку записав confirm (клієнт не передає URL/цілі).
5. **Логи:** не логуємо тіла запитів/відповідей і повні URL (тільки host).
6. **Приватність/авторські права:** чекбокс «Маю право…» розширюється текстом про зображення; оригінальний URL зберігається для атрибуції; гравці бачать зображення лише там, де бачать сам запис/сторінку (Storage-об'єкти публічні за непередбачуваним content-hash — як усі наші бакети).
7. **`persistIcon` артефактів** усередині `resource.update` бачить наш URL (`isHostedOnProjectStorage`) і не робить мережевого запиту — tx лишається без мережі.

## 8. Egress і квоти

- Віддача: `OptimizedImage` → `next/image` (кеш Vercel), об'єкт immutable (`cacheControl` рік, ім'я = hash) → Supabase віддає кожен розмір один раз.
- Дедуп: той самий файл у різних кампаніях/імпортах = один об'єкт.
- **Сховище:** Obojima ≈ 150–220 МБ з 1 ГБ free tier (оцінка з вибірки); ≈ 5–10 % файлів > 1 МБ будуть пропущені (`MEDIA_TOO_LARGE`). Див. відкрите питання 1 (стискання).
- Vercel Image Optimization: нові source images рахуються в квоту трансформацій; ~700 на великий компендіум — зазначити в STATUS.
- Об'єкти ніколи не видаляються (спільні між кампаніями) — сироти після видалення кампанії приймаємо; GC — окремо з прод-інфрою (`docs/product/infra-prod-plan-2026-10-28.md`).

## 9. «Матеріали» та інші зовнішні посилання — аудит

| Місце | Зараз | Рішення |
|---|---|---|
| Глави `book`/`adventure` → `ScenarioPage` (`materialPage`) | увесь текст глави — один `paragraph` у `notes`; `image`/`gallery` викидаються (`MEDIA_SKIPPED`); `{@link}`/`link` → лише текст; у сценарії **немає** вузла зображення (`NODE_TYPES`) | **Переносимо в сховище**: новий вузол `image` (`attrs: { mediaId, src?, alt?, caption? }`), текст глави ріжеться на абзаци між зображеннями. Це ≈ 75 % картинок Obojima. Відкрите питання 2 — підтвердити обсяг у цій гілці. |
| «Показ» (слайди, `lib/server/show/deck-store.ts`) | уже дзеркалить через `resolveImageForPersistence` у `scene-slides` | нічого |
| Карта світу (`world-map-storage.ts`) | завантаження в наш бакет | нічого |
| Іконки/аватари CRUD (`units`, `spells`, `races`, `classes`, `feats`, `backgrounds`, `skills`, `main-skills`; `IconUrlField`) | приймають довільний зовнішній URL, рендер `unoptimized` (хотлінк, без egress Supabase, але приватність/доступність) | **поза обсягом**; хвіст у STATUS: дзеркалення через `prepareCreate/prepareUpdate`, як у `artifacts`/`artifact-sets` |
| Знайомства `Acquaintance.avatarUrl` | зовнішній URL без дзеркалення | поза обсягом, той самий хвіст |
| Нотатки джерела `CompendiumEntry.notes/attribution`, `_meta.sources[].url` → `credits` | URL як текст (`SourceNotes`) | лишаємо текстом; + `attribution.images` |

Вузол `image` у сценарії:
- `lib/constants/scenario.ts` `NODE_TYPES += "image"`; схема: `src` — лише `isHostedOnProjectStorage` (чужі хотлінки заборонені), `mediaId` `^[a-f0-9]{24}$`, `alt`/`caption` ≤ 300.
- Рендер `ScenarioRichText`: `src` → `OptimizedImage` (ширина колонки, `alt`), підпис `caption`; без `src` — гравцю нічого, ДМ (режим редактора) — плейсхолдер.
- Редактор Tiptap: власний `Node.create({ name: "image", atom: true, group: "block" })` у `components/scenario/editor/extensions.ts` — **обов'язково**, інакше Tiptap викине невідомі вузли при збереженні. Вставки нових картинок з UI в v1 немає (лише показ/переміщення/видалення).
- `markdown.ts` (читання для AI): серіалізує як `{{image:<alt>}}` (лише читання); пропозиції AI, що переписують рядок, можуть втратити вузол — відоме обмеження.
- Бандл/клон/експорт переносять вузол як JSON (URL спільні й вічні).

## 10. UI

### 10.1 Стани завантаження на `/dm/compendium` (додаток користувача)

Хук віддає `phase: "idle" | "reading" | "previewing" | "confirming" | "media" | "opening"` і `media: MediaProgress | null`. Компонент `CompendiumProgress` (`components/content-import`):
- `role="status"`, `aria-live="polite"`, видимий підпис фази: «Читання файла…», «Перевірка імпорту…», «Застосування змін…», «Збереження зображень: N із M», «Відкриття звіту…»;
- невизначені фази — `LoadingState rows={1} label=…` (наявний примітив) під підписом;
- фаза `media` — progressbar (`role="progressbar"`, `aria-valuenow`, розмітка як у `TrackList`), «N із M», де M = `items.length`, N = `saved + failed` (+ цілі, пропущені на apply, не впливають на M);
- показується над кроками; кнопки, що змінюють стан, `disabled` (як зараз `busy`); «Закрити» під час `media` лише зупиняє цикл (решта лишається `pending`).
- Замінює поточний `<p role="status">{t("busy")}</p>` у `CompendiumFileStep`.

### 10.2 Preview

У `CompendiumReport` (не `committed`) — рядок `CompendiumMediaSummary`: «Зображень: N буде збережено після підтвердження» + згорнутий список пропусків за причинами (`MEDIA_LIMIT`, `MEDIA_EXTRA`, `MEDIA_NESTED`, `MEDIA_INVALID_URL`…). Не блокує імпорт, не впливає на `readyToImport`/`readyToPlay`.

### 10.3 Після підтвердження / відкритий запуск

`CompendiumMediaReport`: під час роботи — `CompendiumProgress`; після — «N збережено / M не вдалося», плитки (`saved`, `failed`, `skipped`), невдачі згруповані за причиною (`details`, як `IssueGroupCard`; рядок = host + ім'я файла, підпис цілі), кнопки «Повторити невдалі» (є retryable) і «Продовжити» (є `pending` і цикл стоїть). Повідомлення «Імпорт збережено» показується одразу після confirm — записи вже є, зображення доїжджають.

Чекбокс прав: «Маю право використати цей файл і його зображення в цій кампанії».

### 10.4 i18n

`messages/{uk,en}/compendium.json`: `import.progress.*`, `import.media.*`, оновлений `import.rights`; причини — `compendium.import.media.reasons.<CODE>` (з `{status}` для `MEDIA_HTTP_STATUS`; клієнтський namespace, бо `compendiumReport` серверний і на клієнт не передається). Сервер віддає коди, переклад — на межі (`useTranslator`). Тести перевіряють ключі для кожного `MediaReason` в обох мовах.

## 11. Онбординг, довідка, документація

- `lib/onboarding/whats-new.ts`: `{ id: "2026-10-29-compendium-images", date: "2026-10-29", audience: "dm", href: "/help/compendium-import" }` + `whatsNew.2026-10-29-compendium-images` у `messages/{uk,en}/whatsNew.json`.
- Довідка: нова секція в `help/dm.ts` (`compendium-import`, `{ p, list(3) }`: що копіюється, ліміти, «Повторити/Продовжити») + тексти `help.compendium-import.sections.s6.*` в обох мовах (тест скелет↔JSON).
- Нового екрана немає → нова підказка не потрібна.
- `docs/architecture/content-api.md` — підрозділ «Зображення компендіуму»; `docs/guides/compendium-json-import.md` — розділ про зображення; `docs/STATUS.md` — закрити хвіст, додати нові (CRUD-дзеркалення, GC, rebinding).

## 12. Тестова стратегія

- **Чисті (node):** `collectEntryMedia` на фікстурах (token/fluff-корінь/inline fluff/foundryImg/internal href/nested/extra); `normalizeMediaUrl`; `buildMediaQueue` (дедуп, порядок, ліміт 1000 → `MEDIA_LIMIT`, причини на preview); `renderEntryBlocks` (порядок абзаців і картинок, `gallery`, підписи); `materialPage` → вузли без `src`; `plan`: reimport після проставлення `src`/`icon` → `unchanged`.
- **Fetch/validate (мок `safeFetchBuffer`):** PNG/JPEG/GIF/WebP ок; `Content-Type: image/png` + байти HTML → `MEDIA_BAD_FORMAT`; SVG → `MEDIA_BAD_FORMAT`; `text/html` + PNG-байти → `MEDIA_BAD_FORMAT`; 404 → `MEDIA_HTTP_STATUS` не retryable; 503 → retryable; кожен `SafeFetchError` → своя причина.
- **SSRF (`safe-fetch.test.ts`, мок `node:dns/promises` і `fetch`):** десятковий IP, `::ffff:127.0.0.1`, `[fe80::1]`, редирект на `http://`, редирект на хост із приватним IP, 4 редиректи, стрім > 1 МБ без `content-length`, таймаут.
- **Storage (мок admin-клієнта):** шлях за hash, `upsert:false`, «Duplicate» = успіх, `cacheControl`, `ensureBucket` з лімітами.
- **Сервіс батчу (in-memory репозиторій):** claim/lease/прострочення; дедлайн знімає оренду; відомий URL — без fetch; `retryFailed` лише retryable, ліміт 3 спроби; кастомізована ціль → `MEDIA_TARGET_CUSTOMIZED`; кілька цілей одного URL; повторний виклик після завершення — no-op.
- **HTTP (`http.test.ts`):** режим `media`: 403 не-DM / чужа кампанія / не same-origin; чужий `runId` → 404-код; rate limit; відповідь без повного звіту.
- **Інтеграція (локальна БД, `lib/server/test-support/local-db.ts`, мок fetch+storage):** confirm → черга у звіті + `attribution.images`; батчі → `icon`/`avatar`/`src` проставлені; reimport → `unchanged`, без fetch.
- **UI (happy-dom):** `CompendiumProgress` для кожної фази (підпис, `role=status`, progressbar з `aria-valuenow`), `CompendiumMediaReport` (лічильники, групи, кнопки), `CompendiumMediaSummary`; рендер вузла `image` (є/нема `src`, роль ДМ/гравець); Tiptap-розширення зберігає вузол при `getJSON()`.
- **Живий прогін:** локальна БД `obojima`, `pnpm dev`, повний Obojima через UI (браузер-субагент): прогрес «N із M», звіт, «Повторити невдалі», повторний імпорт без нових завантажень; перевірити картинки на юніті/заклинанні/предметі/сторінці глави (DM і гравець), `next/image`-URL у DOM. Storage — хмарний (dev = prod проект), див. відкрите питання 3.

## 13. Поза обсягом

Дзеркалення зовнішніх URL у CRUD-формах і знайомствах; GC об'єктів; вставка картинок у редакторі сценарію з UI; обкладинки книг; шрифти `_meta.fonts`; `foundry*`-корені; pinned-DNS fetch; галереї для сутностей (лише перше зображення).

## 14. Відкриті питання до користувача

1. **Стискати картинки перед збереженням?** `sharp` уже є в залежностях (`lib/ai/images.ts`). Варіант: webp q80, ≤ 512 px для іконок/аватарів, ≤ 1600 px для глав. Це −50…70 % місця (Obojima ≈ 60–90 МБ замість 150–220 МБ з 1 ГБ), прибирає метадані й «поліглот»-файли; ціна — ~50–150 мс CPU на картинку, ім'я = hash **вихідних** байтів + розмір. Ліміт завантаження 1 МБ лишається. **Рекомендація: так** (у плані — T5, гілка «якщо так»).
2. **Картинки в главах матеріалів (вузол `image` у сценарії, T2–T3) у цій гілці?** Це ≈ 75 % зображень, але зачіпає редактор Tiptap/рендер/схему сценарію. **Рекомендація: так**, інакше фіча дає лише ~200 іконок.
3. **Живий прогін вантажить у хмарний Storage** (той самий проект, що й прод) ≈ 0,1–0,2 ГБ. Через content-hash прод потім перевикористає ці об'єкти. Ок, чи прогнати лише частину (категорії `monster`+`spell`+одна глава)? **Рекомендація: повний прогін один раз.**
