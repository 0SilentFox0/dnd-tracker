# Зображення в імпорті компендіуму — план

Спека: `docs/superpowers/specs/2026-10-29-import-images-spec.md` (читати §4–§10 перед кожною задачею).
Worktree `../dnd-tracker-images`, гілка `feat/import-images`. Виконавці — Sonnet, по одній задачі; без per-task review, одне фінальне Opus-review.

## Правила для кожної задачі

- Перед задачею: `CLAUDE.md`, потрібні розділи спеки, `docs/architecture/content-api.md` («JSON-компендіуми»).
- Без `git stash`; без повного `pnpm lint`/`pnpm test:run` до T12.
- Чекпоінт задачі: `pnpm exec tsc --noEmit -p .` (або `pnpm exec tsc --noEmit` — повний tsc дозволено), `pnpm exec eslint <змінені файли>`, `pnpm test:related <змінені файли>` (+ нові тест-файли напряму `pnpm test:run <file>`). Комміт на задачу: `feat(import-images): T<n> …`.
- Коментарі мінімальні (глобальний CLAUDE.md). Тексти UI/звіту — лише ключі i18n, обидві мови.
- Не логувати тіла, повні URL (лише host), повідомлення Storage/ключі.

Порядок залежностей: T1 → T2 → T3; T1 → T4 → T6 → T7 → T8 → T9 → T10; T5 незалежна (до T7); T11, T12 — в кінці.

---

## T1. Збирач медіа (чисто) + підключення в адаптацію

Файли: `lib/server/compendium-import/media/types.ts`, `media/collect.ts`, `adapt/state.ts`, `adapters/shared.ts`, `types.ts`.

```ts
// media/types.ts
export type MediaRole = "avatar" | "icon" | "inline";
export type MediaReason = /* повний список зі спеки §6 */;
export interface MediaRef { url: string; role: MediaRole; path: string; mediaId?: string; alt?: string; skip?: MediaReason }
export const MEDIA_LIMITS = { perImport: 1000, bytes: 1024 * 1024, urlLength: 1024, batch: 30, concurrency: 6, deadlineMs: 25_000, leaseMs: 90_000, maxAttempts: 3, knownRuns: 50, failuresShown: 100 } as const;
export const mediaIdOf = (url: string) => sha256(url).slice(0, 24);

// media/collect.ts
export function normalizeMediaUrl(href: unknown): { url: string } | { reason: MediaReason };   // {type:"external",url} | string; internal → MEDIA_INTERNAL_PATH; не https → MEDIA_HTTPS_ONLY; >1024 / не URL → MEDIA_INVALID_URL
export function fluffImages(root: Compendium, inputKind: string, row: JsonRecord): unknown[];  // row.fluff.images ++ root[`${inputKind}Fluff`] за name+source ++ inherits.fluff
export function collectEntryMedia(kind: TargetKind, inputKind: string, row: JsonRecord, root: Compendium, path: string, nested: boolean): MediaRef[];
```

Рішення:
- Пріоритети джерел і поле — таблиця спеки §4 (`FIELD_OF: Record<TargetKind, "avatar"|"icon"|undefined>`). Перше валідне → `role` поля; решта → `skip: "MEDIA_EXTRA"`; `nested` → усі `MEDIA_NESTED`.
- `AdaptedEntry.media?: MediaRef[]` (у `types.ts`); `addEntry` викликає `collectEntryMedia` після адаптера (для `scenarioPages` — ні, їх дає T2). `nested` = наявність `mergeParent` у результаті.
- `unsupported()`: поля `fluff`, `foundryImg`, `tokenHref`, `hasFluffImages`, `hasToken`, `hasFluff` — без issue (оброблені); інші `foundry*`/`soundClip` — як було.
- Фікстура `__tests__/fixtures/media-sample.json` (мінімальна: monster з tokenHref + monsterFluff, spell foundryImg, item з 2 fluff images, race з raceFluff, subclass з fluff, internal href, http URL).

Тести (`__tests__/media-collect.test.ts`): кожен рядок таблиці §4; пріоритет tokenHref > fluff; `MEDIA_EXTRA` для 2-го; `MEDIA_NESTED` для підкласу; internal → `MEDIA_INTERNAL_PATH`; `http://` → `MEDIA_HTTPS_ONLY`; `unsupported()` більше не дає `MEDIA_OR_FOUNDRY_SKIPPED` для `fluff`, але дає для `foundryAdvancement`. Оновити наявні тести, що очікували `MEDIA_OR_FOUNDRY_SKIPPED` на цих полях.

## T2. Картинки в главах матеріалів (адаптер)

Файли: `entries.ts`, `adapters/content.ts` (`materialPage`), `plan.ts` (`ADAPTER_VERSION = "5etools-2"`), `lib/constants/scenario.ts`, `lib/schemas/scenario.ts`.

```ts
export type EntryBlock = { text: string } | { image: { url: string; alt?: string; caption?: string; path: string } };
export function renderEntryBlocks(value: unknown, path?: string): { blocks: EntryBlock[]; issues: ImportIssue[] };
// renderEntries лишається обгорткою: join текстів, image/gallery → MEDIA_SKIPPED (для описів сутностей — як було)
```

Рішення:
- `walk` отримує колбек для `type:"image"` (і кожного елемента `gallery.images`) → закриває поточний текстовий блок, додає image-блок (`alt` = `title`, `caption` = `credit`/`title`). Ліміт 64 КБ рахується по сумі текстів, як зараз.
- `materialPage`: `notes.content` = послідовність `paragraph` (для тексту) і `{ type: "image", attrs: { mediaId, alt?, caption? } }` **без ключа `src`**; `entry.media` додає `MediaRef { role: "inline", mediaId, url }`; невалідний URL → вузол не створюється, `MediaRef.skip`.
- `NODE_TYPES += "image"`; у `lib/schemas/scenario.ts` refine для `image`: `attrs.mediaId` `/^[a-f0-9]{24}$/`, `src` (якщо є) — `isHostedOnProjectStorage`, `alt`/`caption` ≤ 300. `isHostedOnProjectStorage` з `lib/supabase/image-storage.ts` — якщо імпорт у schema тягне server-код, винести чисту перевірку хоста в `lib/utils/common/image-url.ts` і реюзати в обох.
- `buildSearchText` ігнорує `image` (перевірити).

Тести: `renderEntryBlocks` (текст–картинка–текст, gallery з 2, вкладені entries, image всередині list); `materialPage` дає вузли без `src` і `media` з тими самими `mediaId`; схема відхиляє `src` на чужий хост і приймає наш; **plan**: existing page body з `src` у вузлі vs нове adapted body без `src` → `unchanged` (`managedProjection`), і при зміні тексту merge зберігає `src`.

## T3. Вузол `image`: рендер, редактор, markdown

Файли: `components/scenario/ScenarioRichText.tsx`, `components/scenario/editor/extensions.ts`, `lib/utils/scenario/markdown.ts`, `lib/utils/scenario/block-inventory.ts` (якщо перелічує вузли), i18n `messages/{uk,en}/scenario.json`.

Рішення:
- Рендер: `case "image"` → є `src` → `<figure>` з `OptimizedImage` (`width`/`height` 800×600 + `className="h-auto w-full"`, `alt`), `figcaption` = `caption`; нема `src` → `null` для гравця, для ДМ (контекст рендера вже знає роль/режим — перевірити, що є в `ctx`) — плейсхолдер `t("scenario.image.missing")`.
- Tiptap: `Node.create({ name: "image", group: "block", atom: true, draggable: true, addAttributes: { mediaId, src, alt, caption }, parseHTML: [{ tag: "figure[data-media-id]" }], renderHTML })` + у списку розширень редактора. Без кнопки вставки.
- markdown: `{{image:<alt або mediaId>}}` у серіалізації; парсер не створює image (read-only, обмеження задокументоване в спеці).

Тести: `ScenarioRichText` (happy-dom) з/без `src`; `extensions.test.ts`: `editor.getJSON()` після `setContent` з image зберігає вузол і attrs; markdown серіалізація.

## T4. Черга медіа в preview-звіті (чисто)

Файли: `media/queue.ts`, `service.ts` (`reportOf`, `CompendiumReport`), `types/compendium-import.ts`.

```ts
export interface MediaPlanSummary { queued: number; skipped: Partial<Record<MediaReason, number>> }
export function buildMediaQueue(writes: Array<Pick<PlannedWrite, "kind" | "localId" | "nested" | "media">>, limit?: number): MediaQueueState;
export function summarizeQueue(state: MediaQueueState): MediaPlanSummary;
```

Рішення: дедуп за `url` (один `MediaItem`, кілька `targets`); порядок — порядок `writes`; після `limit` унікальних → `skipped.MEDIA_LIMIT` (кожне входження); `MediaRef.skip` → `skipped[reason]`. `reportOf` додає `media: summarizeQueue(buildMediaQueue(plan.writes))` (на preview `localId` можуть бути тимчасові — для summary неважливо). `CompendiumReport.media?: MediaPlanSummary | MediaReportState` — union з полем `items?`.

Тести: дедуп 2 сутності з одним URL → 1 item, 2 targets; 1001 унікальних → 1000 + `MEDIA_LIMIT: 1`; порядок стабільний; summary.

## T5. Завантаження, перевірка, сховище

Файли: `lib/server/compendium-import/media/fetch-image.ts`, `lib/supabase/compendium-media-storage.ts`, `lib/utils/api/__tests__/safe-fetch.test.ts` (доповнити).

```ts
export type FetchedImage = { ok: true; bytes: Buffer; mime: "image/png" | "image/jpeg" | "image/gif" | "image/webp"; sha256: string } | { ok: false; reason: MediaReason; params?: { status?: number }; retryable: boolean };
export async function fetchImportImage(url: string, fetchBuffer?: typeof safeFetchBuffer): Promise<FetchedImage>;
// server-only
export const COMPENDIUM_MEDIA_BUCKET = "compendium-media";
export async function storeCompendiumImage(image: Extract<FetchedImage, { ok: true }>, admin?: Admin): Promise<Result<string>>;
```

Рішення:
- `safeFetchBuffer(url, { maxBytes: MEDIA_LIMITS.bytes, headers: { "User-Agent": … } })`. Мапа `SafeFetchError.message` (`API_ERRORS.SAFE_FETCH_*`) → `MEDIA_INVALID_URL | MEDIA_HTTPS_ONLY | MEDIA_PRIVATE_HOST | MEDIA_TIMEOUT(retryable) | MEDIA_DNS(retryable) | MEDIA_TOO_LARGE | MEDIA_REDIRECTS | MEDIA_FETCH_FAILED(retryable)`. Статус: 429/5xx retryable, решта ні.
- Оголошений тип: `image/*` крім `image/svg+xml`, або `application/octet-stream`, або відсутній; `sniffImageMime` обов'язковий і визначає `mime`.
- Storage: `ensureBucket(admin, BUCKET, { public: true, fileSizeLimit: MEDIA_LIMITS.bytes, allowedMimeTypes: 4 })`; шлях `${sha.slice(0,2)}/${sha}.${ext}`; `upload(path, bytes, { contentType: mime, upsert: false, cacheControl: YEAR_CACHE_SECONDS })`; помилка з `statusCode 409`/`"Duplicate"`/`"already exists"` → успіх; таймаут 15 с через `Promise.race` → `MEDIA_STORAGE_FAILED`. Повертає `getPublicUrl(path)`.
- **Якщо користувач обрав стискання (відкрите питання 1):** `sharp(bytes).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 })` (`max` = 512 для avatar/icon, 1600 для inline — тоді `fetchImportImage` не стискає, а `storeCompendiumImage(image, variant)`; шлях `${sha}-${max}.webp`, `sha` — від вихідних байтів; gif — без стискання). Інакше — пропустити цей пункт.

Тести: `media-fetch.test.ts` (мок `fetchBuffer`): 4 формати ок; PNG-тип + HTML-байти; SVG; `text/html` + PNG-байти; 404 / 503 / кожен SafeFetchError → причина + retryable. `compendium-media-storage.test.ts` (мок admin): шлях, опції upload, duplicate = ок, ensureBucket з лімітами, таймаут. `safe-fetch.test.ts`: `https://2130706433/`, `https://[::ffff:127.0.0.1]/`, `https://[fe80::1]/`, редирект на `http://`, редирект на хост із `10.0.0.1`, 4 редиректи, стрім > maxBytes без `content-length`.

## T6. Confirm: черга у звіті запуску + attribution.images

Файли: `service.ts` (`confirmImport`), `repository.ts` (`saveEntry`), інтеграційний тест.

Рішення:
- Після циклу записів: `const media = buildMediaQueue(applied.map(r => ({ ...r, localId: idMap.get(r.localId) ?? r.localId })))`; `report.media = media` (повний стан) перед `saveRun`. Мережі немає.
- `saveEntry`: `attribution = { ...row.attribution, images: row.media?.map(({ url, role, mediaId }) => ({ url, role, ...(mediaId && { mediaId }) })) }` (лише якщо є).
- Відповідь confirm (`http.ts`): `mediaPresentation(report)` — `media` → `MediaProgress` (лічильники + ≤ 100 невдач), без `items`. Те саме для `GET reports?runId=`.
- Ідемпотентний повтор confirm повертає збережений звіт (із поточним станом media) — ок.

```ts
export interface MediaProgress { runId: string; total: number; saved: number; failed: number; skipped: number; pending: number; retryable: number; failures: Array<{ id: string; host: string; file: string; reason: MediaReason; params?: { status?: number } }> }
export function mediaProgress(runId: string, state: MediaQueueState): MediaProgress;
```

Тести: `service.test.ts` (фейковий репозиторій) — confirm пише `report.media` із реальними id після `idMap`, нічого не качає; `mediaProgress` лічильники; інтеграція (`campaign.integration.test.ts` або новий `media.integration.test.ts`, local DB): після confirm — `compendium_import_runs.report.media.items` і `compendium_entries.attribution.images`.

## T7. Батч-сервіс і репозиторій медіа

Файли: `media/service.ts`, `media/repository.ts` (`server-only`), тести.

```ts
export interface MediaRepository {
  claim(actor: Actor, runId: string, opts: { max: number; leaseMs: number; now: number; retryFailed: boolean }): Promise<{ items: MediaItem[]; known: Map<string, string> } | null>; // null = runId не цієї кампанії
  release(actor: Actor, runId: string, ids: string[]): Promise<void>;
  apply(actor: Actor, runId: string, results: MediaResult[]): Promise<MediaQueueState>;
}
export type MediaResult = { id: string; ok: true; storedUrl: string } | { id: string; ok: false; reason: MediaReason; params?: { status?: number }; retryable: boolean };
export interface MediaDeps { repository: MediaRepository; fetchImage: typeof fetchImportImage; store: typeof storeCompendiumImage; now?: () => number }
export async function processMediaBatch(actor: Actor, runId: string, deps: MediaDeps, opts?: { retryFailed?: boolean }): Promise<MediaProgress>;
```

Рішення:
- `requireActor` (session-DM) як у `service.ts`.
- `claim`: `prisma.$transaction` + `SELECT id FROM compendium_import_runs WHERE id=$1 AND "campaignId"=$2 FOR UPDATE`; `retryFailed` → `failed && retryable && attempts < maxAttempts` → `pending`; вибір `pending` або `leaseUntil < now`, до `batch`; `leaseUntil`, `attempts++`; запис report. `known`: `saved` URL→`storedUrl` з цього й останніх `knownRuns` запусків кампанії (`select report`, лише потрібні URL).
- Обробка: простий пул concurrency 6 (локальна функція, без залежностей); перед стартом кожного — перевірка дедлайну; незапущені → `release`.
- `apply` у `withCampaignContentWrite(campaignId)`: повторно `FOR UPDATE` run; для успіху кожна ціль: `field` → `CONTENT_RESOURCES[kind].find(actor, localId, "write")` → порожньо або == storedUrl → `update(actor, row, schemas.update.parse({ [field]: storedUrl }))`, інакше `MEDIA_TARGET_CUSTOMIZED`; нема → `MEDIA_TARGET_GONE`. `mediaId` → згрупувати по сторінці, `prisma.scenarioPage` read → проставити `src` у вузлах `image` з `mediaId` без `src` (чиста функція `fillImageSources(content, Map<mediaId, url>)` у `lib/utils/scenario/`), `snapshotIfDue` + `update` з `contentWrite`, `version: { increment: 1 }`. Item → `saved`/`failed`, `leaseUntil` прибрати; `attempts >= maxAttempts` → `retryable: false`. Інвалідація кешу — `afterContentCommit(() => invalidateAllReference(campaignId))` (як `saveRun`).
- Мережа (fetch/store) — **лише** між `claim` і `apply`.

Тести (`media-service.test.ts`, in-memory репозиторій + фейкові fetch/store): lease і прострочення; дедлайн → release; known URL без fetch; один URL кілька цілей; retryFailed лише retryable і `attempts<3`; повторний виклик після завершення — no-op; `fillImageSources` (чиста): лише вузли без `src`, вкладені таблиці/списки. Інтеграція (local DB, мок fetch/store): confirm → 2 батчі → `unit.avatar`, `spell.icon`, `artifact.icon` (через `persistIcon` без мережі), `src` у сторінці; кастомний `icon` ДМ не перетерто; reimport → `unchanged`, fetch не викликано.

## T8. Маршрут, API-клієнт, типи

Файли: `app/api/campaigns/[id]/compendium/media/route.ts`, `http.ts`, `lib/api/compendium.ts`, `types/compendium-import.ts`, `lib/constants/compendium-import.ts`.

Рішення:
- `compendiumRoute("media")`: mutation (same-origin), rate limit scope `compendium-media`, limit 60/хв; тіло — окремий `z.strictObject({ runId: z.string().min(1).max(100), retryFailed: z.boolean().optional() })` через чинний bounded reader (ліміт 4 КБ); `processMediaBatch(actor, runId, prodDeps)`; `null` від claim → `{ code: "RUN_NOT_FOUND" }` 404.
- `route.ts`: `runtime = "nodejs"`, `maxDuration = 60`, `POST = compendiumRoute("media")`.
- `lib/api/compendium.ts`: `processCompendiumMedia(campaignId, body: { runId: string; retryFailed?: boolean }, signal?)` → `MediaProgress`.
- Типи `MediaProgress`, `MediaReason`, `MediaPlanSummary` реекспортувати з `types/compendium-import.ts`.

Тести (`http.test.ts`): 403 не-DM/не session/не same-origin; 404 чужий `runId`; 429; 200 → форма `MediaProgress` без `items`; confirm-відповідь містить `media` як `MediaProgress`.

## T9. Хуки: фази й цикл медіа

Файли: `lib/hooks/compendium-import/useCompendiumMedia.ts`, `useCompendiumImport.ts`, `index.ts`, тести.

```ts
export type CompendiumPhase = "idle" | "reading" | "previewing" | "confirming" | "media" | "opening";
export function useCompendiumMedia(campaignId: string): { progress: MediaProgress | null; running: boolean; paused: boolean; start(initial: MediaProgress): void; resume(): void; retryFailed(): void; stop(): void };
```

Рішення:
- Цикл: поки `pending > 0` і не `stop` — `processCompendiumMedia`; 409/429/мережа → пауза 2 с, ≤ 3 повтори поспіль, далі `paused = true`. `AbortController` на unmount/`stop`. Після завершення — `invalidateQueries(compendiumKeys.all(campaignId))`.
- `useCompendiumImport`: `phase` (обчислюється з `reading`/mutations/`media.running`), після confirm — `media.start(report.media)` якщо `pending > 0`; `openRun` — `media.start` теж (без автозапуску, якщо `pending === 0`; якщо `pending > 0` — показати «Продовжити», автоматично не стартувати). Повертає `state.phase`, `state.media`, `actions.media`.
- Логіку циклу винести в чисту функцію `runMediaLoop(step, { onProgress, signal, sleep })` для тестів без React.

Тести (`__tests__/media-loop.test.ts`): завершення за N кроків; пауза після 3 помилок; abort зупиняє; прогрес монотонний.

## T10. UI: прогрес, звіт медіа, i18n

Файли: `components/content-import/CompendiumProgress.tsx`, `CompendiumMediaSummary.tsx`, `CompendiumMediaReport.tsx`, `CompendiumImport.tsx`, `CompendiumFileStep.tsx`, `CompendiumReport.tsx`, `lib/utils/compendium-import/labels.ts`, `messages/{uk,en}/compendium.json`, `messages/{uk,en}/compendiumReport.json`, тести.

Рішення (спека §10):
- `CompendiumProgress({ phase, media })`: `role="status"` `aria-live="polite"`, видимий підпис фази; невизначені фази — `LoadingState rows={1} label={…}`; `media` — progressbar (`role="progressbar"`, `aria-valuemin/max/now`) + «N із M». Рендер у `CompendiumImport` над `CompendiumSteps`; прибрати `busy`-рядок із `CompendiumFileStep`.
- `CompendiumMediaSummary` у `CompendiumReport` (preview): «Зображень: N…» + `details` з пропусками.
- `CompendiumMediaReport` під «Імпорт збережено» і у відкритому запуску: плитки (як `Counts`), групи невдач (`details`, ≤ 20 рядків + «ще»), кнопки «Повторити невдалі»/«Продовжити» (через `actions.media`).
- `labels.ts`: `mediaReasonLabel(t, reason, params)`; `infoSummary` не рахує більше оброблені медіа.
- Ключі: `compendium.import.progress.{reading,previewing,confirming,media,opening}`, `compendium.import.media.{title,summary,saved,failed,skipped,retry,resume,paused,queued,skippedTitle}`, `compendium.import.rights` (новий текст), `compendiumReport.media.reasons.<CODE>` для кожного `MediaReason` — uk і en.
- Компоненти ≤ 7 props, `wizard`/`media` як об'єкти; без `@/lib/api` у компонентах.

Тести (happy-dom): `CompendiumProgress` — кожна фаза (текст, `role=status`; для `media` `aria-valuenow`), `CompendiumMediaReport` — лічильники, група причин, кнопки за станом; `CompendiumMediaSummary`; тест ключів i18n: кожен `MediaReason` має ключ в обох `compendiumReport.json` (за зразком наявних тестів ключів).

## T11. Онбординг, довідка, документація

Файли: `lib/onboarding/whats-new.ts`, `messages/{uk,en}/whatsNew.json`, `lib/onboarding/help/dm.ts`, `messages/{uk,en}/help.json`, `docs/guides/compendium-json-import.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`.

- Запис `2026-10-29-compendium-images` (dm, `href: "/help/compendium-import"`) + тексти uk/en.
- Секція `{ blocks: [{ kind: "p" }, { kind: "list", count: 3 }] }` у статті `compendium-import` + `help.compendium-import.sections.s6.*` uk/en (тест скелет↔JSON).
- `content-api.md`: підрозділ «Зображення компендіуму» (потік, ліміти, бакет, `report.media` мутує після commit, SSRF/rebinding, вузол `image`); прибрати «URLs — текст»-неточність, якщо потрібно.
- `STATUS.md`: закрити хвіст рядка 62; нові хвости — дзеркалення CRUD-іконок і `Acquaintance.avatarUrl`, GC `compendium-media`, pinned-DNS, квота Vercel Image Optimization.

Чекпоінт: `pnpm test:related lib/onboarding/whats-new.ts lib/onboarding/help/dm.ts`.

## T12. Живий прогін і фінальна перевірка

1. `pnpm exec tsc --noEmit`, `pnpm exec eslint` по всіх змінених файлах гілки (`git diff --name-only main...`), **один** повний `pnpm test:run`.
2. Живий прогін (браузер-субагент Sonnet, скріни зменшені, перевірки JS/текстом): локальна БД `obojima` (`DATABASE_URL=…/obojima`), `COMPENDIUM_PREVIEW_SECRET` і Supabase service role у `.env.local`, `pnpm dev`. Повний Obojima через `/dm/compendium`:
   - preview: рядок «Зображень: N…», пропуски (`MEDIA_EXTRA`, `MEDIA_NESTED`, `MEDIA_TOO_LARGE` пізніше);
   - confirm: фази «Перевірка…», «Застосування…», далі «Збереження зображень: N із M» росте до кінця; звіт «N збережено / M не вдалося»;
   - перезавантажити сторінку посеред процесу → відкрити запуск → «Продовжити» доводить до кінця;
   - повторний імпорт того самого файла: нових завантажень 0 (лог host-лічильника або мережа), записи `unchanged`;
   - DOM: аватар юніта, іконка заклинання/предмета, картинка в главі — `src` через `/_next/image?url=…supabase.co…`; гравець не бачить плейсхолдерів;
   - кастомізувати іконку одного запису → «Повторити» не перетирає.
3. Звіт прогону — у `docs/superpowers/plans/2026-10-29-import-images-progress.md` (короткий, з числами N/M і причинами).
4. Після: `/simplify` на diff гілки (1–2 агенти), фінальне Opus-review, оновити `docs/architecture/*.md`/`STATUS.md` за підсумком; при merge — `git mv` спеки й плану в `docs/archive/superpowers/`.

## Розмір і вартість

12 задач, кожна ≤ одна Sonnet-сесія (T7 і T10 — найбільші; якщо T7 не вкладається — розрізати на T7a `claim/release/apply` полів і T7b сторінки). Орієнтовно 12 виконавців + 1 браузер-прогін + 1 review.
