# Сценарій кампанії — етап 1: редактор (дизайн)

## Context

Зараз сценарій кампанії HoMM5 живе в окремих артефактах claude.ai: індекс, 4 сцени, 6 біографій героїв. Мета — новий пункт меню DM «Сценарій» у застосунку: редактор сценарію з виглядом як в артефактах, тулбаром для тексту, нотатками DM і корисними для DM фічами. Біографії мають інтегруватися у вкладку «Історія» персонажа й відкриватися гравцю частинами в міру проходження сценарію.

Етап 2 (окрема специфікація, пізніше): AI-асистент. Ключ зберігається на сервері зашифрованим, провайдер на вибір (Claude / ChatGPT / Gemini). Етап 1 лише закладає під нього модель даних з адресованими id розділів і рядків.

**Рішення користувача:** два етапи. Імпорт готових артефактів скриптом. Біографії відкриваються за прогресом сценарію і вручну. Фічі першого етапу: режим гри з прогресом, @-посилання на сутності, версії, пошук.

## Структура, як в артефакті (взято з «Монастиря Світла»)

Сторінка: заголовок, підзаголовок, легенда, розділи з якорями (верхня навігація). Розділ складається з рядків, у рядку дві колонки:
- **story** — абзаци, h3, «читати вголос» (`.read`), репліка (`.say`), маркери-врізки з тегом;
- **notes** — нотатки DM на полях, з позначкою «секрет».

Типи маркерів: choice, shadow, check, event, artifact, token. Інлайн-елементи: bold, italic, secret, зелена/червона крапка жетона, таблиця в нотатках. Є перемикач «Сховати нотатки».

## Підхід (рекомендований): структура наша, текст на Tiptap

- **Структура** (сторінка → розділи → рядки) — наш JSON з id. По ньому навігація, прогрес, прив'язка біографій, а в етапі 2 — адресні правки AI.
- **Вміст** кожної колонки рядка — документ Tiptap (ProseMirror JSON) з кастомними вузлами: `readAloud`, `say`, `callout{kind, tag}`, `token{color}`, `mention{type,id,label}` і маркою `secret`. Таблиці через `@tiptap/extension-table`.
- **Режим перегляду** (гра, гравець) рендериться нашим React-рендером із JSON, без Tiptap у бандлі. Tiptap вантажиться лише в режимі редагування через `next/dynamic`.
- **Відкинуті варіанти:**
  - один великий документ Tiptap — гірша адресація для прогресу й AI;
  - свій блоковий редактор на textarea з міні-розміткою (як BiographyEditor) — немає WYSIWYG і тулбара.

## Модель даних (міграція expand-only, RLS увімкнено)

- **`scenario_pages`**:
  - `id`, `campaignId` (FK cascade);
  - `kind` ∈ `scene | hero | note`;
  - `arc` String? — групування в індексі («Арка перша…», «Особисті арки», «Фінал»);
  - `title`, `subtitle?`, `status` ∈ `draft | ready | personal`, `sortOrder`;
  - `characterId?` — для `hero`, FK SetNull;
  - `content JSONB` — `{ legend[], sections[{ id, title, played: bool, rows[{ id, story: Doc, notes: Doc }] }] }`;
  - `searchText` text — plain-текст для пошуку, рахується на сервері при збереженні;
  - `version` Int — оптимістичний лок; `updatedAt`.
- **`scenario_page_versions`**: `id`, `pageId` (cascade), `content`, `createdAt`, `createdBy`. Знімок пишеться при збереженні, не частіше ніж раз на 10 хв на сторінку, і перед кожним відкатом. Зберігаються останні 50.
- **Для `hero`**: розділ = глава біографії з полями:
  - `reveal: { mode: 'manual' | 'afterSection', pageId?, sectionId? }`;
  - `revealedAt?`.

  Розділ стає видимим гравцю, коли є `revealedAt` або зіграно цільовий розділ.
- Zod-схеми `lib/schemas/scenario.ts` (структура + allowlist вузлів і марок Tiptap). Типи в `types/scenario.ts`.

## Сервер / API (за шаблоном music: `requireDM`, `parseBody`, `handleApiError`)

- `app/api/campaigns/[id]/scenario/route.ts` — GET: список сторінок без `content`, тобто індекс; POST: створити сторінку.
- `scenario/[pageId]/route.ts` — GET / PUT з `expectedVersion` (на 409 — тост і перезавантаження) / DELETE.
- `scenario/[pageId]/versions` — GET список, POST `{versionId}` для відкату.
- `scenario/search?q=` — ILIKE по `searchText`, відповідь: сторінка + розділ + фрагмент.
- `scenario/[pageId]/sections/[sectionId]/played` і `/reveal` — PATCH-перемикачі для режиму гри без пересилання всього `content`, бо egress обмежений.
- **Видимість для гравця**: `lib/server/scenario/player-story.ts` на сервері будує відкриті глави hero-сторінки персонажа. Колонка `notes` і всі фрагменти з маркою `secret` вирізаються на сервері, клієнтське приховування тут неприпустиме. Результат додається в `sheet.story.chapters` у `lib/utils/characters/sheet/build-sheet.ts` (`readCharacterSheet`). Доступ: власник персонажа і DM.
- Логіка (обхід дерева, `searchText`, strip секретів, обчислення reveal) — чисті функції в `lib/utils/scenario/` з тестами.

## Клієнт

- `lib/api/scenario.ts` побудований на `createCampaignCrudApi` (`lib/api/client.ts`).
- Хуки в `lib/hooks/scenario/`, ключі в `keys.ts`:
  - `useScenarioPages`;
  - `useScenarioPage`;
  - `useSaveScenarioPage` — автозбереження з debounce 1.5 с і `expectedVersion`;
  - `useScenarioVersions`;
  - `useScenarioSearch`;
  - `useSectionProgress`;
  - `useMentionSources` — перевикористовує наявні хуки units/artifacts/characters/spells/battles.
- Сторінки (сервер: `requireCampaignDM` + `PrefetchedQuery`):
  - `app/campaigns/[id]/dm/scenario/page.tsx` — індекс як в артефакті: арки, сцени зі статусом, блок «Герої», пошук, «Нова сторінка»;
  - `dm/scenario/[pageId]/page.tsx` — сторінка сцени з режимами **Гра** (перегляд, «Сховати нотатки», якорі, кнопка «Зіграно» на розділі) та **Редагування**.
- `components/scenario/`:
  - `ScenarioBook` — обгортка `.scenario-book`: Alegreya / Alegreya Sans через `next/font`, токени кольорів артефакту, світла й темна палітри;
  - `ScenarioRenderer` — JSON → React;
  - `editor/` — Tiptap-розширення, `ScenarioToolbar` (B/I, h3, читати вголос, репліка, маркер за типом, жетон, секрет, таблиця, @-посилання, undo/redo), редактор розділів і рядків (додати, видалити, перемістити, налаштування reveal для hero);
  - `VersionsDialog` (`ResponsiveDialog`).
- @-посилання: Tiptap Mention + suggestion. У перегляді — чип з `HoverCard` і переходом до сутності (юніт, артефакт, персонаж, бій).
- Меню:
  - пункт у `components/layout/Header.tsx`;
  - плитка в `app/campaigns/[id]/page.tsx` (іконка `ScrollText`);
  - фон у `DM_SECTIONS` в `components/layout/screen-background.tsx`. Сам «аркуш» книги непрозорий, як в артефакті.
- **Гравець**: `components/character-profile/StoryTab.tsx` під наявною біографією показує відкриті глави через `ScenarioRenderer` у HUD-стилі.
- **DM**: на hero-сторінці в редакторі кнопка «Відкрити гравцеві» на главі.

## Імпорт

Скрипт `scripts/import/scenario-from-artifacts.ts` (tsx, `pnpm import-scenario`):
- читає збережені HTML артефактів (вивантажу їх через Artifact read у локальну тимчасову теку поза git, бо там секрети сюжету);
- розбирає їх через `node-html-parser` (devDependency) у структуру + Tiptap JSON, мапінг класів `.read`, `.say`, `.mark.*`, `.notes`, `.secret`, `.g`/`.r`;
- створює сторінки в кампанії, прив'язує hero-сторінки до персонажів за ім'ям;
- ідемпотентний: upsert за `(campaignId, title)`.

Спершу проганяється на prodcopy, потім на проді з `--env-file=.env.production-db.local`.

## Тестування

- **Vitest**:
  - `lib/utils/scenario`: strip секретів, reveal, `searchText`, Zod allowlist;
  - парсер імпорту на фрагменті «Монастиря Світла»;
  - route-тести: 403 для не-DM, 409 версії, гравець не отримує `notes` і `secret`;
  - happy-dom тест `ScenarioRenderer` і `StoryTab`.
- `pnpm lint`, `pnpm test:run`, `pnpm build`.
- **Браузер**, локальний dev на prodcopy:
  - DM створює й редагує сцену, тулбар, @-посилання, автозбереження, відкат версії, пошук;
  - режим гри: зіграно → глава Ізабель відкрилася;
  - вхід гравцем: «Історія» показує лише відкрите, без секретів;
  - мобільна ширина.

## Уточнення

- **Індекс** не зберігається окремо. Його будують зі списку сторінок: сцени (`kind=scene`) групуються за `arc` у порядку `sortOrder`, герої (`kind=hero`) йдуть окремим блоком. Номер сцени — її позиція серед сцен.
- **`kind=note`** — вільна сторінка DM (світ, НІП, хронологія): та сама структура, у індексі окремий блок «Нотатки».
- **Легенда** — масив `{ kind, label }`, де `kind` — колір маркера (`read | choice | token | artifact | shadow | check | notes`). У перегляді її рендер такий самий, як в артефакті.
- **Callout kinds:** `choice | shadow | check | event | artifact | token`; `tag` — короткий заголовок маркера.
- **Mention types:** `unit | artifact | character | spell | battle`. Лейбл зберігається у вузлі, тож видалена сутність показується як некликабельний текст.
- **Біографія персонажа:** `Character.background` лишається як є (вступ, який редагується в профілі). Відкриті глави hero-сторінки показуються під ним у «Історії». Гравець бачить лише колонку story відкритих глав без секретних фрагментів. Колонку notes бачить тільки DM.
- **«Зіграно» на сцені** не пише версію: PATCH змінює лише прапорець розділу й підвищує `version`.
- **Видалення сторінки** — через `useConfirm`. Версії видаляються каскадно.
- **Розмір:** PUT приймає `content` до 512 KB; більший — 413 з українським текстом помилки.
- **Помилки:** формат `{ error }` з `lib/constants/api-errors.ts`. Якщо автозбереження впало, у тулбарі з'являється «Не збережено» з кнопкою «Повторити», а локальні зміни не губляться.

## Поза межами етапу 1

AI-асистент і зберігання ключів (етап 2), зображення у тексті, спільне редагування в реальному часі, експорт у PDF (для друку вистачить `@media print`, як в артефакті).

## Подальші кроки

1. Ти переглядаєш цю специфікацію.
2. План через `writing-plans`. Виконання — SDD з sonnet-імплементерами й одним фінальним opus-рев'ю.
