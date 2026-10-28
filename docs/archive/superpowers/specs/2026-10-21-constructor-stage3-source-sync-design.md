# Конструктор кампаній — етап 3: оновлення з джерела (дизайн)

Загальний спек епіку: `2026-10-20-campaign-constructor-design.md` (пункт 3 дорожньої карти).

## Мета

ДМ створив кампанію з шаблону й щось у ній змінив. Автор шаблону тим часом теж вносить зміни: виправляє заклинання, додає юнітів, видаляє зайве. ДМ відкриває «Оновлення з шаблону» і бачить, що нове, що змінилося і що видалено, а також де зміни шаблону конфліктують з його власними. Далі він вибірково приймає зміни, а його правки без явної згоди не перезаписуються.

Та сама операція працює і в інший бік, для підтримки офіційних шаблонів. Офіційний шаблон HOMM5 має `createdFromId` = жива кампанія HOMM5, тож адмін править живу кампанію, оновлює з неї шаблон, а ДМ потім оновлюють свої кампанії з шаблону.

Критерії успіху:
- після застосування прийняті записи збігаються з джерелом;
- посилання не рвуться (скіли й заклинання героїв, `knownSpells`, дерева, юніти в боях);
- повторна перевірка не показує прийнятих і проігнорованих пунктів;
- `assertNoLeak` проходить.

## Рішення з брейншторму (2026-10-21)

- **Джерело** — лише `campaign.createdFromId`. Його пише тільки сервер: клон шаблону, «Зберегти як шаблон», скрипт офіційних шаблонів. JSON-імпорт його не ставить. `sourceId` з тіла запиту чи з файлу ніколи не довіряємо.
- **Гранулярність** — по запису: галочка на кожній сутності, «вибрати все» в групі. Конфлікт розв'язується або взяттям версії джерела цілком, або збереженням своєї. Змінені поля показуються лише для інформації.
- **Видалене в джерелі** — пропонується з вимкненою галочкою і попередженням «використовується: …».
- **«Ігнорувати»** — явна дія: запам'ятовує версію джерела, і пункт з'явиться знову лише тоді, коли джерело зміниться ще раз. Просто не вибрана зміна з'являтиметься знову.
- **Обсяг** — 10 таблиць бандла, правила кампанії (по механіках), налаштування кампанії, повернення видаленого локально, а також REST/OpenAPI/MCP.
- **Стан синхронізації** — окрема таблиця з baseline на кампанію (підхід A). Варіант «рядок на сутність» відкинуто, бо він потребує хуків у всіх шляхах видалення. Варіант «лише `sourceHash` на рядках» не дає ні «ігнорувати», ні «видалено локально».

## Що вже є і використовується

- `lib/server/templates/`:
  - `exportCampaign` — рядки за `BUNDLE_TABLES.columns`;
  - `remapIds` — точна заміна id у будь-якому значенні;
  - `collectKeysAndStrings`, `assertNoLeak`;
  - `newContentId`;
  - `BUNDLE_TABLES` — порядок FK, `fks`, `nullableJson`;
  - `pick`, `delegateOf`.
- `importBundle` уже ставить `sourceId` = id джерела і `sourceHash = hashJson(clean)`, де `clean = pick(row, columns)` — рядок у просторі id джерела, включно з `id`.
- `createCampaignFromBundle` (`lib/server/campaigns/create-campaign.ts`) — єдиний шлях клонування: створення з шаблону, «Зберегти як шаблон», скрипт офіційних шаблонів і JSON-імпорт.
- `loadTemplateForUser` — правило доступу до шаблону (офіційний або DM-член).
- `lib/utils/battle/store/stable-json` — `hashJson`.
- `parseRules` (`lib/utils/rules/schema.ts`) і `MECHANIC_REGISTRY` — ключі механік.
- Сервіс контенту (`lib/server/content/service.ts`, `assertCan`, `CONTENT_RESOURCES[].remove`), `CONTENT_OPERATIONS` + `operationRoute`, MCP-інструменти в `lib/ai/tools/content.ts`.
- `lib/server/skills/skill-tree-service.ts` — збереження дерева з перенесенням прогресу персонажів.
- `invalidateReference` (`lib/cache`) — скидання кешу довідників.

Нове: таблиця стану, модуль `lib/server/templates/sync/`, дві операції, два MCP-інструменти, діалог.

## 1. Дані

Міграція тільки розширює схему і вмикає RLS:

```prisma
model CampaignSourceSync {
  campaignId       String   @id
  sourceCampaignId String
  baseline         Json     // { settings?: hash, rules: { [mechanic]: hash }, tables: { [BundleTable]: { [sourceId]: hash } } }
  ignored          Json     @default("{}") // та сама форма; значення — хеш джерела або "deleted"
  syncedAt         DateTime @default(now())
  campaign         Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  @@map("campaign_source_syncs")
}
```

- **Baseline** — версія джерела, з якою кампанія востаннє синхронізувалася. Записується:
  - у `createCampaignFromBundle`, коли передано `createdFromId` і бандл, у тій самій транзакції (хеші — ті самі `hashJson(clean)`, що пише `importBundle`; `importBundle` повертає їх разом з `idMap`);
  - після кожного apply, лише для прийнятих пунктів;
  - після «Ігнорувати» змінюється тільки `ignored`.
- **Кампанія без запису** (створена до етапу 3): diff будує тимчасовий baseline з `sourceId`/`sourceHash` рядків, а правила й налаштування бере з поточних значень джерела, тобто вважає їх синхронізованими. Видалене локально до цього моменту показується як «нове в джерелі». На prod таких кампаній немає, бо клонування ще не злите.
- На рядках контенту `sourceId` лишається зв'язком «мій запис ↔ запис джерела». `sourceHash` оновлюється разом з baseline. Джерело правди — baseline, а `sourceHash` потрібен лише для запасного шляху вище.

## 2. Ядро — `lib/server/templates/sync/`

### 2.1 Класифікатор (чиста функція, `classify.ts`)

Для кожного ключа `(table, sourceId)` є три хеші:
- `S` — поточний рядок джерела;
- `B` — baseline;
- `L` — локальний рядок у просторі id джерела.

Ключі беруться з об'єднання трьох множин: рядки джерела, baseline і локальні рядки з `sourceId`.

| S | B | L | Статус | Галочка за замовчуванням |
|---|---|---|---|---|
| = B | є | будь-яке | немає змін (не показується) | — |
| ≠ B | є | = B | `updated` | так |
| ≠ B | є | ≠ B | `conflict` | ні («лишити свою») |
| є | немає | немає | `new` | так |
| є | немає | є | `conflict` (зв'язок без baseline, різні версії) або «немає змін», якщо `L = S` | ні |
| є | є | немає | `deletedLocally` — лише якщо `S ≠ B` | ні |
| немає | є/немає | є | `deletedInSource` | ні |
| немає | є | немає | немає змін (видалено з обох боків) — прибрати з baseline під час наступного apply | — |

- Пункт ховається, якщо `ignored[key] === S`, або для `deletedInSource` — якщо `ignored[key] === "deleted"`.
- Правила: ключ = механіка з `MECHANIC_REGISTRY`, значення = `parseRules(...)[механіка]`, таблиця статусів та сама. Налаштування — один ключ `settings`.
- `L` рахується так: локальний `pick(row, columns)` проходить `remapIds` з оберненою мапою `localId → sourceId` (лише рядки з `sourceId`) і хешується `hashJson`. Посилання на власні записи ДМ (без `sourceId`) лишаються локальними id, тож хеш відрізняється і запис коректно вважається зміненим.

### 2.2 `computeSourceDiff(db, actor)` → `SourceDiff`

1. Кампанія і `createdFromId`. Немає джерела → `ContentError` 404 «Кампанію створено не з шаблону». Джерело видалене → 404 «Джерело недоступне».
2. Доступ до джерела — `assertCanReadSource(userId, source)`: джерело — офіційний шаблон, або актор є DM-членом джерела (кампанії чи шаблону). Інакше 403. Для токена перевіряється `userId` власника токена.
3. `exportCampaign(source)`, `exportCampaign(target)` (лише колонки бандла), baseline з `campaign_source_syncs` або запасний.
4. Класифікація.
5. Відповідь без повних рядків, щоб берегти egress:

```ts
type SourceDiffItem = {
  scope: BundleTable | "rules" | "settings";
  key: string;            // sourceId, ключ механіки або "settings"
  localId: string | null;
  name: string;           // name/title рядка (джерела або локального), для правил — label механіки
  status: "new" | "updated" | "conflict" | "deletedInSource" | "deletedLocally";
  changedFields: string[];  // колонки, де джерело ≠ локальне (у просторі id джерела)
  sourceHash: string | null; // S; null для deletedInSource
  requires: Array<{ scope: BundleTable; key: string; name: string }>; // id джерела з рядка, яких локально немає
  usage?: { characters: number; content: number }; // лише для deletedInSource
};
type SourceDiff = { source: { id: string; name: string; kind: string }; syncedAt: string | null; items: SourceDiffItem[] };
```

- `requires` = (`collectKeysAndStrings(sourceRow)` ∩ id джерела) мінус ті, що мають локальну пару.
- `usage`: `content` — скільки інших рядків цілі посилаються на запис (з уже завантажених рядків); `characters` — скільки персонажів кампанії містять його id (рядок персонажа + `characterSkills`, обхід `collectKeysAndStrings`). Персонажі запитуються лише тоді, коли є `deletedInSource`.

### 2.3 `applySourceChanges(db, actor, { apply, ignore })`

Одна транзакція, `timeout: 60_000` (як у `createCampaignFromBundle`).

1. Повторно рахує diff усередині транзакції. Якщо пункт `apply` має інший `sourceHash`, ніж поточний `S`, або пункту більше немає — 409 `SOURCE_CHANGED` («Шаблон змінився — оновіть перегляд»).
2. Замикання залежностей: `requires` усіх вибраних пунктів додаються як `new` або `deletedLocally`, рекурсивно. Відповідь повертає їх у `autoAdded`.
3. Мапа id: `sourceId → localId` для наявних пар, `newContentId()` для рядків, що створюються.
4. Для `new`/`deletedLocally`/`updated`/`conflict`:
   - рядок джерела: `pick` → `remapIds(row, map)`;
   - FK на рядок джерела без пари (не вибраний і не залежність, тобто неможливо після кроку 2) → `null` з попередженням, як в `importBundle`;
   - створення: `createMany` по `BUNDLE_TABLES` у порядку FK з `campaignId`, `sourceId`, `sourceHash = S`;
   - оновлення: `update({ where: { id: localId, campaignId } })` з усіма колонками, крім `id`, плюс `sourceHash = S`;
   - **дерева скілів** (`skillTrees`) оновлюються прямим `update`: після `remapIds` JSON `id` дерева дорівнює локальному id рядка, тож переносити ключ прогресу персонажів (`skill-tree-service`) не потрібно;
5. Для `deletedInSource` — `deleteMany({ id, campaignId })` у зворотному порядку FK, як у `remove` ресурсів (каскади й `SetNull` задає схема БД); файли треків у Storage не видаляються.
6. Правила: прийняті механіки записуються в `campaigns.rules` (значення джерела для механіки). Налаштування — чотири поля кампанії.
7. `assertNoLeak(змінені рядки, id джерела без локальних пар)`: жоден id джерела не має лишитися в цілі, крім тих, що збігаються з локальними (`sourceId` у колонці `sourceId` в перевірку не входить).
8. Baseline: для прийнятих пунктів `B = S`; для видалених — ключ прибирається; ключі «видалено з обох боків» прибираються. `ignore`: `ignored[key] = S` або `"deleted"`. `syncedAt = now()`. Якщо запису немає — створюється з запасного baseline плюс прийнятих змін.
9. Після транзакції — `invalidateReference` для всіх видів кампанії.

Відповідь: `{ applied: number; ignored: number; autoAdded: Item[]; warnings: string[] }`.

## 3. API, права, MCP

- `CONTENT_OPERATIONS`:
  - `source.diff` — `GET /source-sync`, `NEED.read("dm")`, `response: "object"`, тег «Кампанія»;
  - `source.apply` — `POST /source-sync`, `NEED.write`, тіло `sourceSyncApplySchema`, `errors: [409]`.
- Тіло:

```ts
{
  apply: Array<{ scope, key, sourceHash: string | null }>,  // max 5000
  ignore: Array<{ scope, key, sourceHash: string | null }>,
}
```

- `app/api/campaigns/[id]/source-sync/route.ts` — однорядкові `operationRoute`.
- Сервісні функції `getSourceDiff(actor)` / `applySource(actor, body)` у `lib/server/templates/sync/service.ts` викликають `assertCan` і `assertCanReadSource`.
- MCP:
  - `source_diff` (`content:read`), необов'язковий фільтр `scope`;
  - `source_apply` (`content:write`).
  - Diff компактний. Якщо JSON перевищує `AI_LIMITS.toolResultChars`, інструмент радить фільтр `scope`.
- Тексти помилок — у `lib/constants/api-errors.ts`.
- OpenAPI підхоплює операції з реєстру автоматично; тест документа звіряє `route.ts`.

## 4. UI

- Кнопку «Оновлення з шаблону» (на шаблоні — «Оновлення з джерела») бачить лише ДМ при `createdFromId`:
  - у `CampaignSettingsDialog`;
  - у банері шаблону.
- Diff запитується лише після відкриття діалогу. Фонового опитування й лічильника на кнопці немає (egress).
- `SourceSyncDialog` (`components/campaigns/templates/`), `ResponsiveDialog hud`:
  - заголовок: «Джерело: <назва>», «Остання синхронізація: <дата>»;
  - групи за `scope` (`HudSection`): «Правила», «Налаштування», далі таблиці в порядку бандла з людськими назвами;
  - пункт:
    - галочка, назва, бейдж статусу (нове / оновлено / конфлікт / видалено в шаблоні / видалено у вас);
    - `changedFields` дрібним текстом;
    - для `deletedInSource` — «використовується: …»;
    - для конфлікту — підказка «зняти галочку = лишити свою версію»;
  - галочки за замовчуванням — за таблицею 2.1; «Вибрати все» в кожній групі;
  - під списком — «Також буде додано: …», якщо вибрані пункти мають `requires`, яких не вибрано;
  - порожній стан: «Усе синхронізовано» (`EmptyState`);
  - футер (`ActionBar`): «Ігнорувати вибране», «Застосувати (N)»; 409 → повідомлення і перезапит diff;
  - після успіху — `useNotify` зі звітом, інвалідація запитів контенту кампанії і правил.
- Шари:
  - `lib/api/source-sync.ts` (`getSourceDiff`, `applySourceChanges`);
  - `lib/hooks/campaigns/useSourceSync.ts` (`useSourceDiff` з `enabled` при відкритті, `useApplySourceChanges`), ключі в `lib/hooks/campaigns/keys.ts`;
  - типи — `types/campaigns.ts`.

## 5. Частини виконання

- **3a — ядро й API:** міграція, baseline у `createCampaignFromBundle`, класифікатор, diff/apply/ignore, операції REST/OpenAPI, MCP-інструменти, тести. Перевірка на `constructor`:
  - шаблон HOMM5 ← жива HOMM5;
  - кампанія ← шаблон;
  - `battle-sweep` на оновленій кампанії;
  - MCP з тестовим токеном.
- **3b — UI:** діалог, хуки, кнопки, браузер (десктоп + мобільний).

Після обох частин: `/simplify`, документація (`docs/architecture/content-api.md` + розділ про шаблони, `docs/STATUS.md`), хендоф, пам'ять.

## Тести

- `lib/server/templates/sync/__tests__/classify.test.ts` — кожен рядок таблиці 2.1, ignore (хеш і `"deleted"`), правила по механіках, `L` з посиланням на власний запис ДМ.
- Інтеграційні з БД `constructor`, за зразком наявних тестів шаблонів (`app/api/__tests__/campaign-templates-api.test.ts`):
  - клон → у джерелі оновити заклинання, додати юніт з новою расою, видалити артефакт; локально змінити інше заклинання й видалити скіл → diff дає очікувані статуси й `requires`;
  - apply всього вибраного → повторний diff порожній, id наявних записів не змінилися, `knownSpells` юніта вказує на локальні id, `assertNoLeak` проходить;
  - конфлікт: «лишити свою» → запис не змінено, пункт з'являється знову; «ігнорувати» → зникає до наступної зміни джерела;
  - 409 на застарілому `sourceHash`; 403 на чужому приватному джерелі; 404 для кампанії без `createdFromId`;
  - кампанія без запису `campaign_source_syncs` → запасний baseline.
- Тест реєстру й OpenAPI (наявні) підхоплюють нові операції.
- Повний `pnpm test:run`, `pnpm lint`, `pnpm build` наприкінці частини.

## Обмеження

- Міграції тільки розширюють схему; RLS на новій таблиці (`prisma/__tests__/migrations-rls.test.ts`).
- Apply ніколи не пише в іншу кампанію, крім цільової: пошук завжди `{ id, campaignId }`, `assertNoLeak` обов'язковий.
- Ідентифікатори наявних записів не змінюються. Персонажі, бої і сценарій не входять в оновлення.
- Активні бої не змінюються: правила в них заморожені; контент підтягується лише наявним `refresh-sources`.
- Ассети Storage не копіюються й не видаляються: URL спільні.
- Злиття в `main` і prod — лише після всього епіку (етапи 1–6).

## Поза обсягом

- Оновлення з довільного шаблону чи JSON-файлу (зіставлення за назвами).
- Злиття по полях усередині запису.
- Автоматичні сповіщення ДМ про нові версії шаблону.
- Push змін з кампанії в шаблон (робиться як «оновлення з джерела» на самому шаблоні).
