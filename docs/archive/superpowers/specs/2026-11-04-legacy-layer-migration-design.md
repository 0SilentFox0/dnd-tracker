# Шари контенту, Part 5: перенесення legacy-клонів на шари

**Дата:** 2026-11-04 · **Гілка:** `feat/legacy-layer-migration` · **План:** `docs/superpowers/plans/2026-11-04-legacy-layer-migration.md`

Попередні частини: план `docs/superpowers/plans/2026-11-03-content-layers.md` (Parts 1–4), [content-api.md](../../architecture/content-api.md) — розділи «Публікація версії шаблону», «Створення кампанії без копіювання», «Sync поверх шарів», «Кеші шару та FK».

## 1. Мета й межі

Наявні клони шаблонів (legacy: `baseSourceId = null`, усі рядки 13 контентних таблиць — локальні копії з `sourceId`/`sourceHash` і baseline у `campaign_source_syncs`) переводяться на шари: незмінені копії видаляються й читаються з `*_base`, змінені лишаються override-ами, власні рядки DM — локальними. Видимий контент кампанії, її посилання та стан sync після міграції мають бути тими самими (з точністю до id і явно перелічених винятків, §7.3).

**Поза обсягом:** HOMM5 (`cmuylhk0c0001ia06lg5eommv`) — не має джерела, лишається повністю локальною назавжди (нічого не мігрується, див. §3); шаблони (`kind = template`), зокрема «Heroes»; видалення шляху бандла/`baseline`/`fallbackBaseline` з коду (первісний пункт Part 5 «прибрати copy-on-clone»): HOMM5 і клони неопублікованих джерел лишаються на копійному sync, тож цей код потрібен і далі — окремий Part 6, коли legacy-клонів з джерелом не залишиться.

**Повторне використання:** `loadSyncContext` + `classify` (стан legacy-sync і baseline з fallback), `classifyLayered`/`loadLayeredContext` (стан після), `rowHash`, `pick`, `toPrismaJson`, `BUNDLE_TABLES`, `remapIds` (основа нового `remapDeep`), `latestPublishedVersion`, `bumpContentVersion`, `bypassLayer`, `lockCampaignRow`, `pendingKey`, `isCanonicalSrdTemplate`/`translationsFor`, `hashJson` (для `snapshotHash`), `notificationHref`, `assertSeedTarget`, `singleConnectionDatabaseUrl`, `scripts/db/backup-database.sh`. Нове: лише планувальник/виконавець міграції, реєстр посилань, верифікатор і CLI.

## 2. Модель перетворення

### 2.1 Яку версію закріплювати

`baseVersion = latestPublishedVersion(S)` (остання публікація джерела `S = createdFromId`).

Чому не «версія, з якою клон синхронізувався»: legacy-baseline — це хеші **неопублікованих** станів шаблону на момент клонування/останнього apply; у `*_base` існують лише версії від першої публікації (SRD: одна, v2437), тож старішої версії для закріплення немає. Відхилення клону від останньої версії зберігається не версією, а override-ами з `sourceHash` = baseline (див. 2.3): рядки, які шаблон змінив після останнього sync клону, лишаються з контентом DM і показуються як `updated`/`conflict` — так само, як зараз. Нічого не застосовується автоматично.

**Передумова:** джерело повністю опубліковане — `S.contentVersion === latestPublishedVersion(S)` **і** `rowHash` кожного рядка `cachedExport(S)` дорівнює хешу відкритого базового рядка (той самий критерій, що в `publishTemplateVersion`). Інакше legacy-sync (порівнює з поточним експортом) і шаровий (з опублікованою версією) дали б різні статуси. Порушення → `SOURCE_UNPUBLISHED_CHANGES` (оператор спершу публікує шаблон).

### 2.2 Карта id

`M: localId → sourceId` для кожного збереженого рядка з `sourceId` (після усунення дублікатів, 2.4). У шаровій кампанії override експонується під базовим id (`expose`), тож публічний id змінюється і для видалених, і для override-рядків — тому `M` охоплює обидва випадки й застосовується до всіх посилань (§4). Рядки з `sourceId = null` id не змінюють.

Локальний хеш рядка `Lh = rowHash(remapDeep(pick(row, t.columns), M), t)` — у просторі id джерела, як у legacy `classifyTable` (`remapIds(…, index.localToSource)`). Базовий хеш `Bh = rowHash(baseRow@v, t)`, baseline `b = ctx.baseline.tables[t][k]` (з `loadSyncContext`: `campaign_source_syncs`, або fallback із `sourceHash` рядків, якщо стану немає чи він від іншого джерела).

### 2.3 Таблиця рішень (на рядок, `k` = `sourceId`)

| Вхід | Рішення | Збережений стан після | Статус шарового sync (= legacy) |
|---|---|---|---|
| `k ∈ Base@v`, `Lh = Bh` | **base-ref**: видалити локальну копію | — | немає |
| `k ∈ Base@v`, `Lh ≠ Bh`, `b` є | **override** | рядок з колишнім локальним `id`, `sourceId = k`, стовпці перемаплені, `sourceHash = b` | `pairStatus(Bh, b, Lh)`: `updated` (DM не чіпав, шаблон змінив), `conflict` (обидва), немає (лише DM) |
| `k ∈ Base@v`, `Lh ≠ Bh`, `b` немає | **override**, `sourceHash = LEGACY_UNKNOWN_HASH` (`"legacy:unknown"`) | як вище | `conflict` (legacy: `b === undefined` → conflict; без сентинела шаровий `?? b` дав би «немає») |
| `k ∉ Base@v` | **orphan override**, `sourceHash = b ?? LEGACY_UNKNOWN_HASH` | як вище | `deletedInSource` |
| `sourceId = null` | **local** | стовпці перемаплені, id той самий | — |
| `k ∈ Base@v` без локального рядка, `b` є | **hide** (DM видалив) | `campaign_content_hides` | немає (див. 7.3) |
| `k ∈ Base@v` без локального рядка, `b` немає | **hide + pending** | hide + `ignored.tables[t]["pending:k"] = Bh` (+ наявний `ignored[k]`, якщо DM ігнорував) | `new` (з прапорцем `ignored`, якщо був) |

Legacy-рядок `deletedLocally` з `s ≠ b` (DM видалив, шаблон потім змінив) після міграції невидимий: шаровий sync класифікує лише рядки, змінені після `baseVersion`. Це єдина свідома втрата (§7.3).

### 2.4 Аномалії

- **Дублікати `sourceId`** (два рядки з тим самим `k`): у `M` іде рядок з `Lh = Bh`, інакше найстаріший за `createdAt`; решта стають **local** (`sourceId = null`, id той самий) + попередження в звіті. Шар очікує один override на базовий id.
- **Колізія id**: id збереженого рядка, що лишається, ∈ `Base@v` → блокер `ID_COLLISION`.
- `sourceId`, що не відповідає `CONTENT_ID_RE`, → рядок стає local + попередження.

### 2.5 Стан кампанії після

`campaigns`: `baseSourceId = S`, `baseVersion = v`, `createdFromId` без змін, `contentVersion` +1 (один `bumpContentVersion`). `campaign_source_syncs`: `ignored` = legacy `ignored` (ключі вже в просторі id джерела) + pending-маркери, `sourceVersion = v`, `syncedAt` без змін; `baseline` не чіпається (шаровий шлях його не читає; повний стан до — у pre-image, §6).

## 3. Хто мігрує (eligibility)

`checkEligibility` повертає першу причину відмови; кампанія з відмовою не отримує жодного запису.

| Код | Умова |
|---|---|
| `ALREADY_LAYERED` | `baseSourceId != null` (ідемпотентність) |
| `PROTECTED` | id у `PROTECTED_CAMPAIGN_IDS` (HOMM5) — жорсткий список, незалежний від решти перевірок |
| `IS_TEMPLATE` | `kind = template` (публікація шарового шаблону заборонена — `TEMPLATE_PUBLISH_LAYERED`) |
| `NO_SOURCE` | `createdFromId = null` (HOMM5 і JSON-імпорти) |
| `SOURCE_MISSING` / `SOURCE_NOT_TEMPLATE` | джерела немає / це кампанія (клон клону) |
| `SOURCE_LAYERED` | у джерела є `baseSourceId` |
| `SOURCE_NOT_PUBLISHED` | `latestPublishedVersion(S) = null` (напр. «Heroes») |
| `SOURCE_UNPUBLISHED_CHANGES` | 2.1, передумова |
| `LOCALIZED_CONTENT` | джерело — канонічний SRD, а `translationsFor(campaign.locale ?? "en")` непорожній (рядки клону перекладені, база — англійська; шар ще не локалізує) |
| `HAS_DERIVED_CAMPAIGNS` | є кампанії з `createdFromId = C`: їхні `sourceId` вказують на локальні id C, які зникнуть |
| `ACTIVE_BATTLE` | є `battle_scenes.status = active` (стан бою містить id у складених ключах; DM має завершити бій) |

Блокери з плану/перевірки: `ID_COLLISION`, `RESIDUAL_REFS`, `VERIFY_MISMATCH` (§4.3, §7). Попередження (не блокують): дублікати, `SYNC_STATE_FALLBACK` (baseline з `sourceHash`), `PENDING_RULES_SETTINGS` (див. 7.3), кількість складених залишків в історії.

## 4. Посилання на id (FK і JSON)

### 4.1 Принцип

Після `20261121000001_content_base` FK між контентом і посилальниками в БД немає (зокрема `characters.backgroundId`, `character_skills.skillTreeId`), тож видалення локальних рядків нічого не каскадить і не блокує. Посилання переписуються явно:

- `remapDeep(value, M)` — як `remapIds` (точні рядки, `itemRef` `base:prop:param`, вкладений JSON `itemStats.value`) **плюс ключі об'єктів** (`characters.skillTreeProgress` ключується id дерева; `remapIds` ключі не чіпає). Cuid глобально унікальні, тож заміна точних збігів безпечна.
- Складені рядки (`${unit.id}-${n}-${ts}` — id учасника бою, `rider-…`, `zone-…`) **не** переписуються: це непрозорі id екземплярів, код їх не розбирає назад (перевірено grep).

### 4.2 Реєстр посилальників (вичерпний за схемою)

`lib/server/templates/legacy-migration/referrers.ts`, `REFERRERS: Record<ModelName, Referrer>`; тест паритету через `Prisma.dmmf` падає, якщо модель зі схеми не класифікована (нова модель з'явиться — тест змусить вирішити). Режими: `content` (план 2.3), `remap` (переписати перелічені стовпці), `history` (не переписується, лише скан залишків — історія/журнали, великі), `none` (немає id контенту, лише скан), `global` (не належить кампанії).

| Модель | Область | Режим | Стовпці |
|---|---|---|---|
| 13 контентних (`SpellGroup` … `CampaignTrack`) | `campaignId` | `content` | усі `t.columns`; FK-скаляри `spells.groupId/summonUnitId`, `units.raceId`, `artifacts.setId`, `skills.spellId/spellGroupId/mainSkillId/spellNewSpellId/grantedSpellId`, `main_skills.spellGroupId`, `backgrounds.originFeatId` + JSON (`knownSpells`, `abilities`, `choices`, `spellcasting`, `raceModifiers`, `modifiers`, `skill_trees.skills` …) |
| `Campaign` (сам рядок) | `id` | `remap` | `rules` |
| `Character` | `campaignId` | `remap` | `backgroundId`, `personalSkillId`, `knownSpells`, `classes`, `feats`, `raceChoices`, `backgroundChoices`, `backgroundFeatPicks`, `skillTreeProgress` (ключі), `resources`, `spellSlots`, `proficiencies`, `skills`, `savingThrows`, `immunities`, `languages`, `goals` (`race`/`class`/`subclass` — назви, не id) |
| `CharacterInventory` | `character.campaignId` | `remap` | `equipped`, `backpack`, `items`, `stash`, `attuned` |
| `CharacterSkills` | `character.campaignId` | `remap` | `skillTreeId`, `unlockedSkills` |
| `InventoryLog`, `CharacterLog` | `campaignId` | `remap` | `delta` / `data` (невеликі; історія показує предмети/заклинання за id) |
| `BattleScene` (`prepared`) | `campaignId` | `remap` | `participants`, `map`, `audio`, `rules`, `pendingMoraleCheck`, `pendingCritChoice` |
| `BattleParticipant` (бої `prepared`) | `battle.campaignId` | `remap` | `sourceId` (коли `sourceType` = юніт), `snapshot` → **`snapshotHash = hashJson(snapshot)`**, `state` |
| `BattleScene`/`BattleParticipant` (`completed`), `BattleEvent`, `BattleSnapshot` | через бій | `history` | — |
| `CampaignShow` | `campaignId` | `remap` | `audio`, `battle`, `slide`, `cover`, `world` |
| `SlideDeck` | `campaignId` | `remap` | `slides` |
| `ScenarioPage` | `campaignId` | `remap` | `content` (версію сторінки не бампати — зміст той самий) |
| `ScenarioPageIndex` | `campaignId` | `remap` | `facts` |
| `ScenarioPageVersion`, `ScenarioPageSummary` | через сторінку | `history` | — |
| `CompendiumEntry` | `campaignId` | `remap` | `localId`, `bindings`, `baseline`, `locator` |
| `CompendiumImportRun` | `campaignId` | `history` | (`report.media` з id цілей: незавершена черга медіа дасть `MEDIA_TARGET_GONE`; у звіті) |
| `CompendiumSource` | `campaignId` | `none` | |
| `PlayerNotification` | `campaignId` | `remap` | `refId` (`item`/`spell` — id артефакту/заклинання) + `href = notificationHref(campaignId, type, refId)` |
| `AiProposal` (`pending`) | `campaignId` | `remap` | `ops` |
| `AiProposal` (інші), `AiThread`, `AiMessage`, `AssistantIntent`, `AssistantReceipt`, `AssistantRun` | | `history` | pending-інтенти стають stale через бамп `contentVersion` (fingerprint), не переписуються |
| `CampaignSourceSync` | `campaignId` | особливий | `ignored`, `sourceVersion` (2.5) |
| `CampaignContentHide` | `campaignId` | особливий | вставки (2.3) |
| `CampaignMember`, `ApiToken`, `CharacterToken`, `World*`, `Acquaintance*` | | `none` | |
| `User`, `AiCredential`, `UserOnboardingFlag`, `StatusEffect`, `*Base` | | `global` | |
| Інші кампанії з `createdFromId = C` | | блокер `HAS_DERIVED_CAMPAIGNS` | |

### 4.3 Скан залишків (незалежний від реєстру)

Після переписування (усередині транзакції) для кожної моделі з режимом ≠ `global` читаються рядки кампанії (`bypassLayer`), `JSON.stringify(row)` → усі токени `/c[a-z0-9]{24}/g` → перетин з `removed = keys(M)` (старі id, що більше не експонуються). Кожен збіг класифікується:

- **exact** (токен = весь рядок-значення) у моделі `remap`/`content`/`none` → блокер `RESIDUAL_REFS` (реєстр щось пропустив: додати стовпець, а не ігнорувати);
- **composite** (токен усередині довшого рядка) або будь-який збіг у `history` → у звіт (лічильник за моделлю/стовпцем), не блокує.

Так повнота перевіряється даними, а не лише ручним переліком.

## 5. Атомарність, блокування, кеші

### 5.1 Одна транзакція на кампанію

Проміжний стан видимий і зламаний (кампанія з `baseSourceId`, але старими посиланнями або навпаки), тож міграція кампанії — одна інтерактивна транзакція: план, запис, перевірка (§7.1) і commit лише за успішної перевірки; будь-яка помилка → rollback, нуль змін. Машина станів/таблиця прогресу не потрібна: ідемпотентність дає `ALREADY_LAYERED`, перерваний запуск просто повторюється.

Оцінка для клону ≈ 2 430 рядків (prodcopy): контентні таблиці переписуються пакетно — на таблицю `deleteMany` збережених рядків кампанії + `createMany` фінального набору (override-и й local зі своїми id, `createdAt`/`updatedAt` зберігаються, `toPrismaJson`) чанками по 200 → ≈ 13×2–4 запитів; hides — `createMany` чанками; посилальники — `update` лише змінених рядків (десятки–сотні); читання ≈ 3.6 тис. рядків двічі (план і перевірка). Очікувано < 30 с; опції `{ timeout: 120_000, maxWait: 10_000 }` як у `publishTemplate`. Якщо репетиція на prodcopy покаже > 60 с — питання 3 (§10).

Порядок у транзакції:
1. `lockCampaignRow(tx, C, "update")` (`FOR UPDATE` блокує всі `withCampaignContentWrite`/`withCampaignRuntimeWrite` цієї кампанії) і `SELECT … FOR UPDATE` рядків посилальників режиму `remap` (персонажі, інвентарі, `character_skills`, `prepared`-бої та їх учасники, показ, деки, сторінки, компендіум, сповіщення) — щоб не було lost update між читанням і записом.
2. Повторна eligibility під блокуванням (стан міг змінитись після dry-run).
3. Завантаження: стан legacy-sync (`loadSyncContext` + `classify` — для паритету), збережені рядки, `Base@v`, посилальники.
4. План (чиста функція) → блокери → abort.
5. Pre-image (§6) записується у файл **до** запису в БД.
6. Запис: контентні таблиці (`bypassLayer`), hides, `campaign_source_syncs`, посилальники, `campaigns.update({ baseSourceId, baseVersion })` через розширений клієнт (гілка `Campaign` у `contentLayer` сама скидає кеш шару й memo транзакції — інакше перевірка всередині tx бачила б кампанію «plain») і `markContentDirty()`: транзакція йде всередині `runContentWriteContext`, який робить рівно один бамп `contentVersion` наприкінці.
7. Перевірка §7.1 через **розширений** клієнт (читання шару) + скан §4.3 → невдача = throw → rollback.

Скрипт працює через `DATABASE_URL=$DIRECT_URL` (довга інтерактивна транзакція, не pooler).

### 5.2 Кеші інших інстансів

- **`plain` LRU (`lib/db/layer/cache.ts`) — зміна коду обов'язкова.** Зараз «кампанія без бази» кешується назавжди (`baseSourceId never changes after create`). Інстанс Vercel, що вже обслуговував legacy-кампанію, після міграції читав би лише збережені рядки — увесь базовий контент зник би до перезапуску інстансу. Рішення: позначка `plain` отримує TTL `PLAIN_TTL_MS = 60_000` (зберігається час позначки; прострочена → свіжий PK-запит). Ціна — один PK-запит на кампанію на інстанс на хвилину. Деплой цієї зміни — до будь-якої міграції на проді.
- **Next data cache довідників** (`unstable_cache`, тег на кампанію, `REFERENCE_REVALIDATE_SECONDS = 300`): скрипт не може викликати `revalidateTag` (див. `db-deploy.md`, STATUS «прод 2026-11-04»). Рішення: міграція кампанії — у тихе вікно (немає гри), після commit — пауза ≥ 6 хв (300 с + TTL `plain`) перед перевіркою в браузері; гравцям — перезавантажити вкладки (TanStack). Застарілий список зі старими id не псує даних: PATCH/DELETE за старим id → 404, `assertCampaignRefs` відхиляє старі id.
- `contentVersion` +1 інвалідовує overlay-кеш (ключ містить `contentVersion`) і робить stale pending-інтенти асистента.

### 5.3 Що міграція ніколи не робить

Не викликає `resource.remove`/`removeAll` (вони скидають `detachRefs` і видаляють файли треків), не видаляє файли зі Storage (контракт `ICON_BUCKETS`), не пише в `*_base` і в джерело, не змінює інші кампанії.

## 6. Відкат

1. **Обов'язково перед кожним `--apply` на проді:** `BACKUP_DATABASE_URL="$DIRECT_URL" scripts/db/backup-database.sh` (дамп у `.migration-backup/`). Це запасний шлях на випадок пошкодження поза кампанією.
2. **Pre-image на кампанію (рішення: так, файлом, не таблицею).** Перед записом скрипт пише `.migration-backup/legacy-layer/<campaignId>-<ts>.json.gz` (тека в `.gitignore`): рядок кампанії (`baseSourceId`, `baseVersion`, `contentVersion`), рядок `campaign_source_syncs`, усі збережені рядки 13 таблиць, для посилальників — `{ model, pk, column, before }` лише змінених клітинок, план (`M`, рішення, hides) і `contentVersion` після міграції. ≈ 1 МБ стиснуто. `--undo <file>` в одній транзакції під тим самим блокуванням: відмова, якщо `contentVersion` кампанії ≠ записаному після міграції (були контентні записи) або якщо поточне значення хоч однієї переписаної клітинки посилальника ≠ очікуваному після-значенню (гравець щось змінив) — з переліком конфліктів; інакше видаляє збережені рядки й hides кампанії, вставляє рядки з pre-image з їхніми id, відновлює клітинки, `campaign_source_syncs`, `baseSourceId/baseVersion = null`, `contentVersion` +1.
   - Чому не таблиця в БД: міграція схеми, зайвий обсяг (ліміт free tier) і egress; файл потрібен лише в перші години після міграції, коли повернення ще безпечне.
   - Чому не лише pg_dump: відновлення дампа — для всієї БД і стирає записи інших кампаній після бекапу.
3. Після `--undo` кампанія знову legacy; `plain`-позначки інстансів з'являться самі (свіжий PK-запит), Next-кеш — те саме вікно 6 хв.

## 7. Перевірка

### 7.1 Компаратор (усередині `--apply`, і `--verify <pre-image>` після commit)

- **Еквівалентність видимого контенту:** для кожної `t ∈ BUNDLE_TABLES` до міграції — `findMany({ where: { campaignId } })` (кампанія ще plain) → `remapDeep(·, M)` → `pick(·, t.columns)`; після — те саме читання через шар, без remap. Множини id мають збігатися, а для кожного id — `rowHash`; розбіжність → `{ table, id, changedFields }` (`changed` з `classify.ts`). Не порівнюються `campaignId`, `createdAt`, `updatedAt`, `sourceId`, `sourceHash` (базові рядки мають `createdAt` = час публікації: список рас, відсортований за `createdAt`, змінить порядок — відоме обмеження Part 4). Нормалізація: посилання, що до міграції ні на що не вказувало (висяче), прирівнюється до `null` на обох боках (`nullHiddenRefs` шару читає посилання на прихований рядок як `null`).
- **Лічильники:** `count` кожної таблиці через шар до/після рівні.
- **Посилання:** скан §4.3 без exact-залишків; кожен токен з `values(M)`, знайдений у посилальниках `remap`, має бути експонованим id у читанні після.
- **Паритет sync:** legacy `classify` (лише табличні scope) до vs `classifyLayered(loadLayeredContext(...))` після: множини `(scope, key, status, ignored)` для `new`/`updated`/`conflict`/`deletedInSource` мають збігатися; зникнення `deletedLocally` і пунктів `rules`/`settings` — дозволена різниця (у звіт, §7.3).
- Будь-яка розбіжність (крім дозволених) → `VERIFY_MISMATCH`, rollback.

### 7.2 Dry-run і звіт

`--dry-run` (типово) — лише читання, без транзакції із записом: eligibility + план + оцінка залишків (скан до переписування рахує, скільки exact-збігів `removed` є в стовпцях, яких реєстр не переписує). Звіт на кампанію (текст + `--json <file>`):

```
<name> <id> source=<S> v=<v> status=eligible|<REASON>
table        stored  base-ref  override(upd/conf/own/orphan)  local  hide(+pending)
spells        498      470        20 (12/3/4/1)                8      12 (+5)
...
referrers: characters 4 (knownSpells 31, classes 2), inventories 3, characterSkills 2, preparedBattles 1, notifications 7, ...
residual exact (blocker): none | <model.column ×n>
history/composite: battleEvents 412, completedBattles 9, aiMessages 3
warnings: DUPLICATE_SOURCE_ID ×1, SYNC_STATE_FALLBACK, PENDING_RULES_SETTINGS ×2
```

`--all` (лише з dry-run) — звіт по всіх кампаніях, згрупований за причиною. Повторний dry-run після apply → `ALREADY_LAYERED`.

### 7.3 Дозволені відмінності (явно в звіті)

1. Пункти sync `rules`/`settings` (і compendium) не показуються: шаровий sync їх поки не порівнює (content-api.md, «Sync поверх шарів»). Звіт: `PENDING_RULES_SETTINGS ×n` — рішення, чи мігрувати таку кампанію, за користувачем (§10, п. 2).
2. Видимий legacy `deletedLocally` (`s ≠ b`) зникає: рядок лишається прихованим.
3. Порядок списків за `createdAt` для базових рядків.
4. Історія (`history`) і складені id зі старими id: журнал бою/завершені бої можуть не знайти юніт/заклинання за старим id.

### 7.4 Репетиція на локальній БД

Docker `dnd-tracker-wfrp-db-1`, порт 54322, БД `prodcopy` (свіжа копія проду: `scripts/db/prodcopy-db.sh` після бекапу) — креденшали в `.env.local`; `layers4` — для перевірок Part 4. Кроки: `prisma migrate deploy` → переконатися, що SRD опублікований на тій самій версії, що на проді → `--all --dry-run` → `--apply` по одній кампанії → `--verify` → локальний `pnpm dev` на prodcopy й браузерна перевірка (книга магії, лист героя з `knownSpells`/класом/рисами, інвентар, дерево скілів, старт підготовленого бою, діалог sync — ті самі пункти, що до міграції) → `--undo` однієї кампанії й порівняння з pre-image (кругова перевірка) → заміряти тривалість транзакції.

### 7.5 Порядок на проді

Лише після деплою коду (TTL `plain`) і успішної репетиції, кожен крок — з окремого «так» користувача:
1. Бекап; `--all --dry-run` на проді (лише читання) → звіт користувачу.
2. Перша кампанія — найменш цінна з eligible (напр. `qqq`, якщо вона eligible): тихе вікно → бекап → `--apply` → 6 хв → браузер → `--verify`.
3. Далі по одній кампанії, кожна зі свіжим бекапом.
4. HOMM5 — ніколи: `NO_SOURCE` + `PROTECTED`. Якщо колись знадобиться (наприклад, через публікацію «Heroes» як бази), це окремий дизайн і окреме «так».

## 8. Інтерфейс скрипта

`pnpm constructor:legacy-layers` → `tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/legacy-layers.ts`

```
legacy-layers (--campaign <id> | --all) [--dry-run] [--json <file>] [--allow-remote]
legacy-layers --campaign <id> --apply [--allow-remote]
legacy-layers --verify <pre-image.json.gz> [--allow-remote]
legacy-layers --undo <pre-image.json.gz> [--allow-remote]
```

- Типовий режим — dry-run; `--apply` приймає рівно одну `--campaign` (одна кампанія за запуск), `--all` — лише з dry-run.
- `assertSeedTarget(DATABASE_URL, --allow-remote)`; для віддаленої БД запускати з `DATABASE_URL="$DIRECT_URL"` (як у STATUS «прод 2026-11-04»).
- Коди виходу: 0 — успіх (dry-run: звіт надруковано), 1 — блокер/невдала перевірка/конфлікт undo, 2 — неправильні аргументи.
- Скрипт не викликає `revalidateTag` (не працює поза Next) — друкує нагадування про вікно 6 хв.

## 9. Файли

Нове (`lib/server/templates/legacy-migration/`, без `server-only`, як `sync/`):

| Файл | Вміст |
|---|---|
| `types.ts` | `IneligibleReason`, `RowDecision`, `MigrationPlan`, `MigrationReport`, `PreImage` |
| `remap.ts` | `remapDeep(value, map)`, `cuidTokens(text)` |
| `referrers.ts` | `REFERRERS`, `GLOBAL_MODELS`, `referrerRows(db, model, campaignId)` |
| `eligibility.ts` | `checkEligibility(db, campaignId)`, `PROTECTED_CAMPAIGN_IDS` |
| `plan.ts` | `planLegacyMigration(input): MigrationPlan` (чиста) |
| `load.ts` | `loadMigrationInput(db, campaignId, sourceId, version)` |
| `execute.ts` | `writeMigration(tx, plan, input)` |
| `verify.ts` | `readExposed`, `compareExposed`, `scanResiduals`, `syncParity` |
| `preimage.ts` | `buildPreImage`, `writePreImage`, `readPreImage`, `undoMigration` |
| `service.ts` | `dryRunCampaign`, `migrateCampaign`, `verifyFromPreImage` |

Змінене: `lib/db/layer/cache.ts` (TTL `plain`), `lib/db/content-layer.ts` (коментар), `package.json`, `docs/architecture/content-api.md` (розділ «Міграція legacy-клонів»), `docs/STATUS.md`.

Тести: `__tests__/remap.test.ts`, `referrers-parity.test.ts`, `eligibility.test.ts`, `plan.test.ts` (таблиця 2.3 повністю), `lib/db/__tests__/content-layer.test.ts` (TTL), `__tests__/legacy-migration.integration.test.ts` (локальна БД, `vitest.integration.config.mts`, `isLocalDevDatabaseEnv`-guard, унікальний маркер, прибирання).

## 10. Відкриті питання

1. **«Heroes» і HOMM-клони.** Клони «Heroes» (якщо такі є на проді) отримають `SOURCE_NOT_PUBLISHED`. Публікувати «Heroes», щоб їх перенести, — окреме рішення користувача (публікація змінює лише `*_base`, але робить шаблон джерелом шарів для нових кампаній).
2. **Кампанії з непоказаними оновленнями правил/налаштувань** (`PENDING_RULES_SETTINGS`): мігрувати з попередженням (пропозиція) чи спершу дати DM застосувати/проігнорувати їх у legacy-sync?
3. **Тривалість транзакції на проді** з машини користувача через `DIRECT_URL` невідома; якщо репетиція покаже > 60 с — запускати з ближчого до `eu-central-1` середовища або переписати посилальники одним `UPDATE … FROM (VALUES …)` (як `save-battle.ts`).
4. **Кеш довідників 300 с** прийнято як тихе вікно; якщо користувач хоче миттєве оновлення — потрібен окремий захищений роут інвалідації (поза цим планом).
