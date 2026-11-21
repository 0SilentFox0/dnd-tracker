# Поширення патчів шаблону на кампанії — дизайн + план

Дата: 2026-11-20. Статус: дизайн, нічого не реалізовано. Виконавець: Sonnet (3–4 dispatch'і), фінальне рев'ю — Opus.

Вимога власника: зміни шаблону автоматично доходять до всіх кампаній, створених із нього; у кампанії один чекбокс «автоматично / мануально». Auto застосовує одразу. Manual надсилає ДМу-власнику сповіщення про патч, і він сам вирішує, чи приймати зміни.

## 0. Що вже є (reuse)

| Що | Де | Як використовуємо |
|---|---|---|
| Версія шаблону = публікація | `publishTemplateVersion` (`lib/server/templates/publish.ts`), `publishTemplate` (`publish-service.ts`), `latestPublishedVersion` | «Патч» = одна публікація з `version`. Тригер вішаємо після коміту `publishTemplate`. |
| Кампанія читає шар на `baseVersion` | `Campaign.baseSourceId/baseVersion`, `layerOf` (`sync/layered.ts`) | Застосувати патч означає просунути `baseVersion`. Самі рядки не копіюються. |
| Безпечне застосування | `applySafeSourceChanges` → `applyLayered(…, 'safe')` (`sync/apply.ts`, `sync/layered-apply.ts`) | Ядро auto-режиму. Бере лише `new`/`updated` (`SYNC_DEFAULT_ON`). `conflict`, `deletedInSource` і `deletedLocally` фіксує `keepUnselected` (override на старому baseline або hide + `pending:`). |
| Сервісна обгортка apply | `runApply` (`sync/service.ts`): `withCampaignContentWrite` + `lock: 'no-key-update'` + `invalidateAllReference` | Для auto викликаємо від системного актора (див. §3). |
| Ручний UI | `SourceSyncDialog`, `SourceSyncButton`, `SourceUpdateTile`, `useSourceSync`, `useApplySafeSourceChanges` | Manual веде сюди, нового діалогу не робимо. |
| Плитка «Шаблон оновлено» | `sourceUpdateState`, `readDmDashboard` (`lib/server/campaigns/dashboard.ts`) | Розширюємо: саммарі, «пропустити версію», стан auto. |
| Сповіщення + Pusher | `PlayerNotification`, `notifyPlayers` (`lib/server/notifications/notify.ts`), `NOTIFICATIONS_CHANGED_EVENT`, `NotificationsHost`, cleanup 30 днів | Нові типи сповіщень для ДМа. Окремої таблиці для сповіщень не робимо. |
| Крон | `app/api/cron/assistant-cleanup` (`CRON_SECRET`), `vercel.json` `crons` | Новий щоденний крон як страховка (backstop). |
| Прапорці кампанії | `Campaign.critChoiceByDm`/`mapLibraryEnabled` + `Checkbox` у `CampaignSettingsDialog` + `useUpdateCampaign` + `lib/schemas/campaigns.ts` | Чекбокс робимо за тим самим шаблоном. |
| Rules-класифікація (legacy) | `classify.ts` (rules per mechanic, `pairStatus`), `campaign_source_syncs.baseline.rules` | Переносимо на шари в §6. |

Нове потрібне для чотирьох речей: снапшот публікації (саммарі + правила), лог авто-застосувань, механізм propagate/revert і чекбокс.

## 1. Модель

### Режим

`Campaign.templateAutoUpdate Boolean` — чекбокс «Автоматично застосовувати оновлення шаблону». `true` = auto, `false` = manual. Enum не робимо: власник просив саме чекбокс, і третього режиму не передбачено.

Дефолт (рекомендація):
- **auto** для кампаній, де шаблон офіційний (`isOfficialTemplate`) або власник шаблону = `dmUserId` кампанії. Так власник отримує те, що просив, а safe-apply ніколи не перезаписує локальних правок (§3).
- **manual**, якщо шаблон публічний і належить іншому автору: чужий автор не може мовчки міняти контент чужої гри.
- Дефолт обчислюється в `createCampaignFromBundle` під час create/clone. Для наявних кампаній — одноразовий скрипт-бекфіл за тим самим правилом. Колонка в міграції має `DEFAULT false`, тож до бекфілу нічого не змінюється.

### Схема (expand-only, одна міграція `…_template_patch_propagation`)

```prisma
model Campaign {
  // …
  templateAutoUpdate     Boolean @default(false)   // per-campaign mode
  templateSkippedVersion Int?                      // manual "skip this version": tile hidden while latest <= this
  publishedVersion       Int?                      // only on kind=template: newest published version (denormalized latestPublishedVersion)
  @@index([baseSourceId, baseVersion])
}

model TemplatePublication {            // @@map("template_publications")
  templateId  String
  version     Int
  added       Int
  changed     Int
  removed     Int
  tables      Json      // { [BundleTable]: { added, changed, removed } } — notification/tile summary
  rules       Json      // rules snapshot at this version (bundle.rules)
  rulesHashes Json      // { [mechanic]: hash } — rules baseline on layers (§6)
  publishedAt DateTime  @default(now())
  @@id([templateId, version])
}

model CampaignTemplatePatch {          // @@map("campaign_template_patches") — auto-apply log
  id          String   @id @default(cuid())
  campaignId  String   // FK Cascade
  templateId  String
  fromVersion Int
  toVersion   Int
  status      String   // 'applied' | 'failed' | 'reverted'
  applied     Int      @default(0)
  kept        Int      @default(0)   // conflict/deleted pinned by keepUnselected
  created     Json     @default("{}") // { overrides: {table: id[]}, hides: {table: key[]}, pending: key[], rulesBefore: {mechanic: value} }
  error       String?  // i18n key, never a raw message
  createdAt   DateTime @default(now())
  @@index([campaignId, createdAt])
}
```

- `ENABLE ROW LEVEL SECURITY` на обох нових таблицях (політик немає, доступ лише через Prisma з service-ролі, як в інших таблицях).
- `publishedVersion` заповнює бекфіл-скрипт `scripts/templates/backfill-published-version.ts` (dry-run → `--apply`, `--allow-remote`). Для кожного шаблону він пише `latestPublishedVersion` і рядок `template_publications` з поточними `rules` і нулями в лічильниках. Поки поле `null`, код відкочується до `latestPublishedVersion`, тож бекфіл не блокує деплой.

### Що таке «патч»

Патч — це `(templateId, version)` з `template_publications`. Кампанія «відстає», якщо `baseVersion < template.publishedVersion`. Між `baseVersion` і останньою версією може лежати кілька публікацій. Застосування завжди переводить кампанію одразу на останню версію (так уже працює `applyLayered`). Саммарі для сповіщення й плитки — сума `tables` по відрізку `(baseVersion, latest]`, наприклад «+3 заклинання, ~5 юнітів, −1 артефакт, правила: 2 механіки». Точний per-item diff, як і зараз, дає `getSourceDiff` при відкритті діалогу.

Черги немає: стан «що треба застосувати» виводиться з `baseVersion < publishedVersion`. Така модель ідемпотентна й сама себе відновлює, а всі тригери нижче лише прискорюють застосування.

## 2. Тригер

`lib/server/templates/patches/propagate.ts`:

```ts
export async function propagateTemplatePatch(templateId: string, opts?: { budgetMs?: number }): Promise<PropagateReport>
export async function pendingAutoCampaigns(templateId?: string, limit?: number): Promise<string[]>   // auto && baseVersion < t.publishedVersion
export async function applyTemplatePatch(campaignId: string, mode: 'auto'): Promise<PatchOutcome>     // §3
export async function notifyTemplatePatch(templateId: string, version: number): Promise<number>      // manual campaigns, §4
type PatchOutcome = { status: 'applied' | 'deferred' | 'noop' | 'failed'; applied?: number; kept?: number }
```

1. **After-hook.** `publishTemplate`: коли `result.added+changed+removed > 0`, у транзакції публікації пишемо `template_publications` і `campaigns.publishedVersion`. Після коміту `after(() => propagateTemplatePatch(id, { budgetMs: 40_000 }))`. Auto-кампанії обробляються послідовно, кожна у **своїй** транзакції (`withCampaignContentWrite`, `lock: 'no-key-update'`, timeout 60 с), щоб збій однієї не відкочував решту. Manual-кампанії отримують `notifyTemplatePatch` одним пакетом.
2. **Лінивий тригер.** `readDmDashboard`: якщо кампанія auto, відстає і в ній немає активного бою, ставимо `after(() => applyTemplatePatch(id,'auto'))`. Так добираються відкладені (бій) і ті, що не влізли в бюджет. Write робимо лише в `after()`: відповідь показує поточний стан, наступний перехід — вже новий.
3. **Крон-страховка.** `GET /api/cron/template-patches` (`CRON_SECRET`, як у `assistant-cleanup`), раз на добу `30 3 * * *`. Бере `pendingAutoCampaigns(undefined, 50)` і застосовує з бюджетом.
4. (Опційно, D2) після завершення бою (`finish`/`victory` мутація) ставимо `after(applyTemplatePatch)` для цієї кампанії.

- **Ідемпотентність.** Повторний виклик на кампанії, що вже на останній версії, дає `noop`. Його виявляє перевірка `baseVersion` **під lock'ом**, а не з кешу. Два паралельні виклики серіалізує `no-key-update`. Другий бачить нову `baseVersion` і повертає `noop`. Лог пишеться лише для `applied`/`failed`.
- **Активний бій.** Якщо в кампанії є бій зі статусом `BattleStatus.ACTIVE`, повертаємо `deferred` без запису в лог. Перевірку робимо всередині транзакції після lock'а. Бої `prepared` не блокують: учасники знімаються snapshot'ом на старті. Плитка показує «Оновлення буде застосовано після бою».
- **Повторні збої.** Якщо для того самого `toVersion` уже є 3 записи `failed`, auto пропускає кампанію й надсилає ДМу manual-сповіщення (тип `template-patch`), щоб він вирішив вручну.
- **Egress і навантаження.** Шаровий apply читає лише рядки, змінені після `baseVersion`, і overrides. Рядки не копіюються: просування `baseVersion` — це один UPDATE плюс записи `keepUnselected`. Pusher іде лише ДМу на notify-канал, гравцям нічого. Інвалідація — `invalidateAllReference(campaignId)` після коміту: клієнти перечитують дані лише коли їх відкривають. Запит відсталих — self-join `campaigns c JOIN campaigns t ON t.id = c.base_source_id`, індекс `(base_source_id, base_version)`. Порядок — `updatedAt desc`, тобто активні кампанії першими. `after()` обмежений бюджетом, решту добирають лінивий тригер і крон.
- **Хто поза обсягом.** Кампанії без бази (HOMM5, клони неопублікованих джерел, SRD-оверлей `uk`) лишаються на наявній плитці і в цьому механізмі не беруть участі. Згодом їх можна підключити, але auto там означав би копійний apply без простого відкату.

## 3. Auto

`applyTemplatePatch(campaignId, 'auto')` в одній транзакції кампанії:

1. Взяти lock і `layerOf`. Без шару → `noop`. `baseVersion >= publishedVersion` → `noop`. Активний бій → `deferred`.
2. Викликати `applyLayered(tx, id, layer, 'safe', SYSTEM_ACCESS)`, де `SYSTEM_ACCESS = { userId: campaign.dmUserId }`. Доступ до джерела перевіряється від імені ДМа: якщо шаблон став приватним, auto падає з `failed` і `error = 'templatePatch.sourceUnavailable'`.
3. Правила оновлюються за §6, лише механіки зі статусом `updated`.
4. Записати `CampaignTemplatePatch { status: 'applied', fromVersion, toVersion, applied, kept, created }` і надіслати сповіщення `template-patch-applied` ДМу (refId `${templateId}:${toVersion}`).

Межі safe-apply:
- Локальне не перезаписується. Застосовуються лише `new` і `updated`, де локальний рядок = baseline (`pairStatus`). `conflict` (є власний override) і `deletedInSource` лишаються як були: `keepUnselected` пінить їх override'ом на старому baseline, тож ДМ далі бачить їх у «Переглянути зміни». `deletedLocally` (hide) лишається прихованим.
- Override, видалений у safe-apply, завжди дорівнював старому baseline (`pairStatus` → `updated`), тобто зміст при відкаті не губиться.
- `created` у лозі заповнюється з `applyLayered`. Щоб його отримати, `applyLayered` має повертати `{ result, writes }`: id override'ів/hide'ів/`pending:`-маркерів, які створив `keepUnselected`. Для цього потрібна невелика зміна сигнатури внутрішнього `keepUnselected` (тип `LayeredWrites`). Публічний `SourceApplyResult` лишається як є.

**Відкат (мінімальний).** Операція `source.revert-patch` (`POST /api/campaigns/[id]/source-sync/revert`, `NEED.writeAll`, лише сесія ДМа-власника) з тілом `{ patchId }`. Відкотити можна лише **останній** `applied`-запис і лише поки `campaign.baseVersion === toVersion`. Інакше 409 `templatePatch.revertStale`. Кроки:
1. Видалити override'и з `created.overrides`, чий `sourceHash` не змінився (ДМ їх не редагував). Видалити hide'и з `created.hides` і `pending:`-маркери.
2. Повернути механіки правил з `rulesBefore`, якщо поточне значення досі дорівнює застосованому.
3. Встановити `baseVersion = fromVersion` і `templateSkippedVersion = toVersion`, щоб auto одразу не застосував патч знову.
4. Перевести запис у `status = 'reverted'`.

Повного знімка БД не робимо: шар сам по собі є знімком, бо стара версія лежить у `*_base` (`validTo`).

## 4. Manual

- `notifyTemplatePatch` пише `PlayerNotification { userId: dmUserId, type: 'template-patch', refId: '${templateId}:${version}', href: '/campaigns/${id}?sourceSync=open' }` через `notifyPlayers`. Pusher-подія та сама. Unique `(userId,type,refId)` не дає дублікатів. Попередні непрочитані `template-patch` цієї кампанії при новій версії видаляються, щоб лишалось одне «є оновлення».
- Кампанія з `templateSkippedVersion >= version` сповіщення не отримує.
- **Дашборд.** `SourceUpdateTile` показує саммарі (§1), кнопки «Застосувати безпечні» (наявна), «Переглянути зміни» (наявний `SourceSyncDialog`) і нову «Пропустити цю версію». Остання — операція `source.skip-version` (`POST …/source-sync/skip`, `{ version }`), яка пише `templateSkippedVersion = version` і позначає сповіщення прочитаним. `sourceUpdateState` повертає `hasUpdates = latest > max(baseVersion, skipped ?? 0)`.
- **Що означає «пропустити».** Кампанія лишається на старому `baseVersion`, відхилений контент не з'являється. Наступна публікація знову покаже плитку з **усіма** змінами з `baseVersion`, включно з пропущеними. Тобто «пропустити» означає «не нагадувати про цю версію», а не «назавжди відмовитись від цих рядків». Назавжди відмовитись від конкретних рядків можна через «Ігнорувати» в діалозі (наявний `ignored`).
- `?sourceSync=open` на дашборді відкриває `SourceSyncDialog`. `NotificationsHost` отримує іконки для двох нових типів.
- Email у MVP не робимо. Resend налаштований, але продуктових листів ще немає. Розсилку варто додати разом з налаштуваннями пошти користувача (окрема фіча).

## 5. UI і права

- `CampaignSettingsDialog`: `Checkbox` «Автоматично застосовувати оновлення шаблону» з підписом «Безпечні зміни застосовуються одразу; ваші правки не перезаписуються; останнє оновлення можна відкотити». Показується лише коли `campaign.baseSourceId` і користувач — `dmUserId`.
- `lib/schemas/campaigns.ts`: поле `templateAutoUpdate` в update-схемі. У route, крім `requireDM`, перевіряємо `campaign.dmUserId === userId` (403). Якщо в кампанії кілька ДМ-ролей, міняти режим може лише власник. Застосувати, пропустити чи відкотити може будь-який ДМ із `content:write`, як і наявний sync.
- `SourceUpdateTile` в auto-режимі після застосування показує «Оновлено до vN: +a ~c −r; K змін чекають на вас (конфлікти)» з кнопкою «Відкотити» (лише для останнього запису). У стані `deferred` показує «застосується після бою».
- Шари: `lib/api/source-sync.ts` (+`skipVersion`, `revertPatch`) → `lib/hooks/campaigns/useSourceSync.ts` (+`useSkipTemplateVersion`, `useRevertTemplatePatch`) → компоненти. Ключі запитів — лише з `keys.ts`.
- i18n: `messages/{uk,en}/campaigns.json` (чекбокс, плитка, кнопки), `notifications` (2 типи), `errors` (`templatePatch.*`). Кирилиці в коді немає.
- Онбординг: запис `WHATS_NEW` `2026-11-2x-template-auto-updates` + `whatsNew.<id>` в обох мовах. Help-абзац у наявній статті про шаблони або новий slug `template-updates`. Hint `dm.template-auto-update` біля чекбокса (новий екран не з'являється, тож hint опційний).
- Сторінка шаблону після «Опублікувати версію» показує тост «Опубліковано vN; X кампаній оновиться автоматично, Y отримають сповіщення» (лічильники з `propagate`, синхронно рахуються лише цифри).

## 6. Правила / налаштування / credits / компендіум

Зараз шари їх не синхронізують. А основний сценарій власника (Grim, STATUS п.5 — «оновлює `rules.json`») змінює саме **правила**. Без правил фіча для нього майже нічого не дасть.

- **У MVP входять правила по механіках.**
  - Джерело — снапшот `template_publications.rules` на останній версії, не живі `rules` шаблону, бо там можуть бути неопубліковані правки.
  - Baseline — `campaign_source_syncs.baseline.rules[mechanic]` (колонка вже є). Для шарових кампаній рядок `campaign_source_syncs` створюється ліниво.
  - Початкове значення для нових кампаній береться з `rulesHashes` публікації `baseVersion`. Для старих кампаній baseline відсутній, і тоді `pairStatus(s, undefined, l)` дає `conflict`, тобто такі механіки йдуть лише вручну і нічого не перезаписується.
  - Класифікацію беремо з `classify.ts` (rules), підставляючи снапшот. Пункти мають scope `rules` у `buildLayeredDiff`/`applyLayered`.
  - Baseline механіки просувається лише коли її застосували або явно проігнорували. Так незастосований конфлікт не зникає після просування `baseVersion`.
- **Поза MVP:** налаштування (`settingsOf` — DM-преференції кампанії, їх не синхронізуємо в принципі), credits (атрибуція фіксується на створенні; можна додати пізніше одним полем) і компендіум (сторінки зі зв'язками на сценарій, окремий епік).

## 7. Файли й розбивка на dispatch'і (Sonnet)

**D1 — БД + публікація.** Міграція з §1 (+RLS, індекс). Prisma-моделі. `publishTemplateVersion` повертає `tables` і rules-снапшот. `publishTemplate` пише `template_publications` і `publishedVersion`. Бекфіл-скрипт. `sourceUpdateState` враховує `publishedVersion ?? latestPublishedVersion` і `templateSkippedVersion`, а також повертає саммарі. `createCampaignFromBundle` ставить дефолт `templateAutoUpdate` і rules-baseline.
Файли: `prisma/schema/core.prisma`, `prisma/migrations/…`, `lib/server/templates/{publish,publish-service}.ts`, `lib/server/campaigns/{dashboard,create-campaign}.ts`, `scripts/templates/backfill-published-version.ts`.

**D2 — двигун.** `lib/server/templates/patches/{propagate,apply-auto,revert,notify,summary}.ts`. `applyLayered` повертає `writes`. Операції `source.skip-version` і `source.revert-patch` (registry + `operationRoute`). Крон-роут + `vercel.json`. Лінивий тригер у `readDmDashboard`. Нові `NOTIFICATION_TYPES` і `notificationHref`.

**D3 — правила на шарах.** §6: класифікація й apply rules для шарових кампаній, baseline у `campaign_source_syncs`, `rulesBefore` у лозі auto.

**D4 — UI + тексти.** Чекбокс, плитка (саммарі/skip/revert/deferred), `?sourceSync=open`, тост публікації, іконки сповіщень, i18n uk/en, whatsNew, help/hint. Оновлення `docs/architecture/content-api.md` (новий розділ «Поширення патчів») і `docs/STATUS.md`.

D1 і D2 виконуються послідовно. D3 можна паралельно з D2 після D1. D4 — останнім. Тести агенти пишуть, але не запускають. Один повний прогін у кінці, потім live-run на dev-стенді: шаблон → 2 кампанії (auto/manual) → правка → publish → перевірка обох.

## 8. Тест-кейси

- publish без змін: `template_publications` не пишеться, propagate не викликається.
- publish зі змінами: рядок `template_publications` з правильними `tables`; `publishedVersion = version`.
- auto, лише `new`/`updated`: `baseVersion` → latest, лог `applied` з правильними `applied`/`kept`, сповіщення `template-patch-applied` ДМу.
- auto з локальним override, змінений upstream (`conflict`): override не змінився, рядок лишився в diff, `kept ≥ 1`.
- auto з `deletedInSource` без override: рядок і далі видимий (пін), у diff — `deletedInSource`.
- auto з hide (`deletedLocally`): рядок лишається прихованим.
- auto при `ACTIVE`-бою: `deferred`, `baseVersion` не змінився, лог порожній. Після завершення бою лінивий тригер застосовує.
- Два паралельні `applyTemplatePatch`: один `applied`, другий `noop`, один запис у лозі.
- Повторний propagate після успіху: усі `noop`.
- 3× `failed` на тій самій версії: auto пропускає кампанію, ДМ отримує manual-сповіщення.
- Шаблон став приватним: `failed` з `templatePatch.sourceUnavailable`, без часткових записів.
- manual: сповіщення одне на кампанію (unique), друга публікація замінює попереднє непрочитане, контент не змінився.
- skip-version: плитка прихована. Наступна публікація показує плитку з diff від старого `baseVersion`.
- revert останнього патча: `baseVersion = fromVersion`, створені override'и/hide'и прибрані, `templateSkippedVersion = toVersion`, auto не застосовує повторно. Override, відредагований ДМом після патча, не видаляється.
- revert не останнього запису або після ручного apply: 409 `templatePatch.revertStale`.
- Правила: механіка змінена в шаблоні й не змінена локально → auto застосовує. Змінена локально → `conflict`, не перезаписана. Стара кампанія без baseline → `conflict`. Неопубліковані правки rules шаблону в кампанію не потрапляють.
- Права: не-власник ДМ міняє `templateAutoUpdate` → 403. Гравець → 403. Чекбокс не показано без `baseSourceId`.
- Крон: без/з неправильним `CRON_SECRET` → 401. Береться не більше `limit`.
- Кампанія без бази (HOMM5): у `pendingAutoCampaigns` не потрапляє, плитка працює як раніше.
- i18n: ключі є в обох мовах, тест скелета help проходить.

## 9. Ризики

- **Час після публікації.** На великій кількості кампаній `after()` не встигне в бюджет. Це нормально: решту доберуть лінивий тригер і крон. Але DM-шаблон із сотнями кампаній оновлюватиметься до доби. Варто заміряти `applyLayered` на prodcopy SRD-клоні.
- **Неочікувані зміни для ДМа.** Auto змінює контент кампанії, коли ДМ про це не просив. Пом'якшення: лише safe, сповіщення з саммарі, відкат останнього патча, бій не чіпається.
- **`applyLayered('safe')` не перевіряє `needsBlockedDependency`, як це робить legacy.** На шарах це менш небезпечно, бо `nullHiddenRefs` обнуляє посилання на приховане. Проте треба тест: новий рядок посилається на рядок, прихований ДМом.
- **Ріст override'ів від пінів.** Кожен auto-патч з конфліктами додає піни на старому baseline. Їх небагато (лише conflict/deletedInSource), прибирає їх ручний sync.
- **Активні гравці під час патча (поза боєм).** Гравець, що редагує персонажа з заклинаннями, які змінюються, побачить нові дані після refetch. Конфлікту запису немає, бо персонажі не синхронізуються.
- **Rules-снапшот для старих публікацій.** До бекфілу його немає, тому старі кампанії отримують `conflict` по всіх змінених механіках. Це безпечно, але ДМ побачить «багато ручних».

**Залежність від Grim.** Механізм не залежить від того, чи опубліковано Grim на проді: він працює для будь-якого шаблону, що публікується. Але цінність для Grim з'явиться лише якщо Grim-кампанії на проді **шарові** (створені з опублікованої версії). Перепублікацію Grim (STATUS п.5) краще робити **після** деплою D1–D3, тоді правки rules дійдуть до кампаній самі. Якщо Grim опублікують раніше, ДМам доведеться синхронізувати вручну, як зараз.

## 10. Питання до власника

1. **Дефолт режиму.** Пропоную auto для офіційних і власних шаблонів, manual для чужих публічних. Наявні кампанії переводяться бекфілом за тим самим правилом. Чи наявні кампанії мають отримати auto без згоди їх ДМів?
2. **Правила в MVP** (§6, D3): це +1 dispatch. Без них для Grim фіча майже нічого не дає. Включаємо?
3. **«Пропустити цю версію»:** чи влаштовує семантика «не нагадувати про цю версію; наступна публікація покаже й пропущене»? Альтернатива — «назавжди ігнорувати всі рядки патча», але вона накопичує ignore-маркери.
4. **Відкат:** чи достатньо відкату лише останнього авто-патча?

## Рішення власника (2026-11-21)
- Усі наявні кампанії отримують усі зміни патча — і правила, і контент — без згоди ДМів: продукт у тестуванні, реальних клієнтів немає, тож дія безпечна. Правила входять у MVP.
- Чекбокс `auto|manual` лишається для подальших патчів; режим для наявних кампаній на момент першого патча — auto.
- Відкрито (опитування триває): семантика «пропустити версію» і обсяг відкату.
