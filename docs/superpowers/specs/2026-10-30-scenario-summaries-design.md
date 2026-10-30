# Конспекти сцен (епік «граф сценарію», етап 3b)

Епік: `docs/superpowers/specs/2026-10-30-scenario-graph-epic.md`. Попередні етапи: індекс 3a (`docs/archive/superpowers/specs/2026-10-30-scenario-index-design.md`), граф 4 (`…-scenario-graph-design.md`). Далі — 3c (digest у промпті) і 5 (Obsidian).

## Мета

ДМ за запитом генерує для сторінки сценарію LLM-конспект: що відбувається, ключові події, прихований шар. Конспект лише для ДМ, зберігається за `(pageId, version)`, застарілий лишається видимим із позначкою. Він має бути придатним для вставки в промпт помічника (3c).

## Рішення (користувач, 2026-10-30)

- Окрема таблиця, не колонка в `scenario_page_index` (перерахунок індексу не повинен стирати платний результат).
- Застарілий конспект видимий із позначкою «застарілий», поки ДМ не перегенерує. Застарілість обчислюється (`summary.version < page.version`), не зберігається.
- `||секрети||` ідуть у вхід генератора (помічник радить з урахуванням прихованого).
- Генерація лише за запитом, ключ ДМа (BYOK), модель **smart** першого провайдера з ключем, одна генерація на версію сторінки.
- Без масової генерації (YAGNI).

## Reuse (що береться, чому нове потрібне)

- `lib/ai/dm-model.ts`: `pickDmTextModel` бере лише fast. Додати `pickDmSmartTextModel(campaignId)` у тому ж файлі через спільний внутрішній хелпер з параметром tier (без дублювання циклу по провайдерах); `readDmAiAvailability` не міняти.
- `generate-backstory.ts` + `draft-ai-guard.ts` (`guardDraftAi`, `limitDraftAi`) — зразок `generateObject` + `aiErrorMessage` + rate limit. Для конспекту guard лише DM: перевірити, чи `guardDraftAi` придатний (він для гравців); інакше `aiGuard`/`requireDM` з `lib/ai/guarded.ts`.
- `lib/server/scenario/index-store.ts`: шаблон upsert «не перезаписувати новішу версію» і `resolveEntities` (імена чипів). Не дублювати SQL-логіку: зробити спільний приватний хелпер або експортувати `resolveEntities`.
- `lib/utils/scenario/{search-text,read-chunks,structure}.ts` — плоский текст сторінки; перевірити, чи є готовий серіалізатор із `||секретами||` і чипами, перед написанням нового.
- `lib/schemas/scenario-index.ts`, `types/scenario.ts`, `entityKey` (`lib/utils/scenario/index/build`) — ключі сутностей `type:id`.
- `lib/hooks/scenario` (`keys.ts`, `useScenarioIndex.ts`), `lib/api/scenario.ts`, `components/scenario` (панель сторінки, `graph/` — панель вузла).
- Обмеження: `lib/ai/errors.ts` (`aiErrorMessage`), `API_ERRORS`, `AI_LIMITS` (`lib/constants/ai.ts`).

## Дані

Таблиця `scenario_page_summaries` (модель `ScenarioPageSummary`, relation до `ScenarioPage`, `onDelete: Cascade`):
`pageId` PK, `campaignId` (index), `version Int`, `summary Json`, `provider String`, `model String`, `inputTokens Int?`, `outputTokens Int?`, `createdAt/updatedAt`.
Один рядок на сторінку. Upsert через raw SQL за зразком `upsertPageFacts` (вставка лише поки сторінка існує; `WHERE existing.version <= EXCLUDED.version`). Міграція expand-only + `ENABLE ROW LEVEL SECURITY`.

## Формат конспекту

`lib/schemas/scenario-summary.ts` (Zod, спільна для моделі й читання з БД):
- `overview` ≤ 600 символів;
- `events[]` ≤ 8 × ≤ 160;
- `secrets[]` ≤ 5 × ≤ 200 (прихований шар);
- `entities[]` ≤ 20 ключів `type:id`; після генерації фільтруються до допустимого набору (невідомі відкидаються);
- `digest` ≤ 300 — один рядок для промпту 3c.
Мова — локаль запиту (`getRequestLocale`, `languageName`). Читання рядка з БД через `safeParse`; пошкоджений рядок = «немає конспекту».

## Вхід генератора

Чиста функція `buildSummaryInput(page, entities)` в `lib/utils/scenario/summary/input.ts`:
- заголовок, вид і арка сторінки; секції по порядку; текст рядків із `||секретами||` (позначити явно «hidden from players»); чипи замінені іменами;
- перед текстом — список допустимих сутностей `key — label` з індексу 3a (лише ті, що згадані на сторінці);
- бюджет `AI_LIMITS.summaryInputChars` (нова константа, ~30 000); понад бюджет — обрізання за секціями з маркером «[truncated]» і прапором `truncated` у відповіді;
- повертає `{ prompt, allowedKeys, truncated }`.

## Сервер

- Схема тіла та константи — в `lib/schemas`/`lib/constants`.
- `app/api/campaigns/[id]/scenario/[pageId]/summary/route.ts` — thin: `POST` (генерація, body `{ force?: boolean }`) → `summary-handler.ts`. `maxDuration = 120`.
- Хендлер: конфігурація AI (503 без `AI_KEYS_SECRET`) → `requireDM` → `loadOwned` сторінки → rate limit → якщо рядок для поточної `version` є і немає `force`, повернути його без виклику моделі → `pickDmSmartTextModel` (нема ключа → `AI_NOT_CONFIGURED`-подібна помилка, 400) → `generateObject` з `abortSignal: req.signal` → фільтр сутностей → upsert → відповідь `{ summary, version, stale: false, truncated }`.
- Гонка: версія сторінки читається до генерації; upsert не перезаписує новішу. Якщо за час генерації версія зросла, результат зберігається під старою `version` і виходить застарілим — це очікувано.
- Помилки провайдера → `aiErrorMessage`, 502; ключ ніколи не в логах/відповідях (див. `ai.md`).
- `GET /api/campaigns/[id]/scenario/summaries` (`requireDM`) — `{ [pageId]: { summary, version, stale, model, createdAt } }` однією вибіркою без тексту сторінок; `stale` порівнюється з `scenario_pages.version` (select лише `id, version`).
- Токени (`usage`) пишуться в рядок для прозорості вартості.

## Клієнт

Шар: `lib/api/scenario.ts` (`getScenarioSummaries`, `generateScenarioSummary`) → `lib/hooks/scenario` (`useScenarioSummaries`, `useGenerateScenarioSummary`, ключі `scenarioKeys.summaries`; експорт через barrel) → `components/scenario/ScenarioSummaryPanel.tsx`.
- Показ: DM-панель сторінки сценарію (згорнута секція) і панель вузла-сцени в графі (читання з того ж кешу).
- Стани: немає конспекту → «Згенерувати»; є → текст + «Оновити»; застарілий → позначка «застарілий» + «Оновити»; без AI-ключа → кнопка неактивна з підказкою; генерація → індикатор і блокування повторного натискання; помилка → текст помилки.
- Мутація інвалідує лише `summaries`. Egress: один GET на кампанію, `staleTime` 60 с, без поллінгу.
- i18n `uk`/`en` у відповідному namespace `messages/*/` (без кирилиці в коді); запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в обох `whatsNew.json`; hint/стаття довідки, ДМ-only.

## Заготовка для 3c

Чиста `summariesDigest(summaries, { maxChars })` в `lib/utils/scenario/summary/digest.ts`: впорядковує за `sortOrder` сторінок, бере `digest`, обрізає за бюджетом, позначає застарілі. У 3b лише експортується й тестується, у промпт не підключається.

## Тести

- `buildSummaryInput`: секрети включені й позначені; чипи → імена; обрізання за бюджетом із маркером; `allowedKeys` лише згадані.
- Схема: ліміти довжин; фільтр невідомих сутностей; пошкоджений JSON → «немає».
- Upsert: не перезаписує новішу версію; не вставляє для видаленої сторінки.
- Маршрут `POST`: 403 для гравця, 404/403 чужа сторінка, 503 без `AI_KEYS_SECRET`, 400 без ключа, ідемпотентність (модель не викликається вдруге), `force`, помилка провайдера → 502 без ключа у відповіді.
- `GET`: `stale` обчислюється, чужі кампанії не видно.
- `pickDmSmartTextModel`: tier smart, пропускає нечитабельний ключ.
- `summariesDigest`: порядок, бюджет, позначка застарілого.
- Хуки/компонент: стани панелі (happy-dom), кнопка неактивна без ключа.
- Живий прогін (Sonnet-субагент, prodcopy `localhost:54322`, ключ Gemini користувача, зменшені скріншоти): 3–4 сторінки HOMM5 із чипами; перевірити, що `entities` відповідають чипам, секрети потрапили в `secrets`, ідемпотентність, позначка «застарілий» після правки. Витрата токенів — повідомити заздалегідь.

## Поза межами

Масова генерація, автогенерація при правці, показ гравцям, підключення digest у промпт (3c), Obsidian-експорт (5), тест «чи ШІ радить краще» (відкладено до деплою всієї гілки).

## Документація

Оновити `docs/architecture/ai.md` (конспекти, smart-модель ДМа, ідемпотентність) і `docs/STATUS.md`; після мерджу `git mv` спеки/плану в `docs/archive/superpowers/`.
