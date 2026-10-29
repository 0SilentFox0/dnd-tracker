# Знайомства + сповіщення «нове» — дизайн

Дата: 2026-10-28. Гілка: `feat/acquaintances`.

## Мета

1. **Знайомства** — плитка кампанії, де зберігаються повні NPC і **мікро-NPC** (ім'я, аватарка, опис, журнал взаємодій) у контексті гри гравців. DM вирішує, чи плитка доступна гравцям.
2. **Сповіщення «нове»** — тости й золотистий піл «new», коли гравець отримав рівень / предмет / заклинання / знайомство.

Дві незалежні підсистеми, два плани: **B (сповіщення)** першим, **A (знайомства)** використовує B.

## Рішення (узгоджено з користувачем)

- Повний NPC відкривається так само, як мікро-NPC: виділення в тексті сценарію + секція зіграна.
- Одиниця розкриття — **секція** (`ScenarioSection.played`), без нових прапорців на рядках.
- Запис журналу прив'язаний до секції, видимий коли її зіграно.
- Нотатки гравців: автор + DM бачать; інші гравці — ні.
- Сповіщення: Pusher (live) + таблиця `player_notifications` (непрочитані при вході). Тост закривається/ігнорується без впливу на «прочитано»; піл гасне при відкритті таба/сторінки.
- Лише гравцям (не DM). Один кампанійний перемикач `acquaintancesEnabled` у DM.

## Що перевикористовуємо

- `lib/utils/scenario/reveal.ts` — стиль правила розкриття, `section.played`.
- Mention-механізм сценарію (`MENTION_TYPES`, `mention-href.ts`, `MarkerChip`) — новий тип `acquaintance`.
- `lib/pusher/*` (`safe-trigger`, `channels`), модель `usePusherBattleSync` для інвалідації запитів.
- `PrefetchedQuery`, `HudPage`/`HudCard`, `useSearch`/`SearchInput`, `QueryState`, `ResponsiveDialog`, `useConfirm`, `parseBody`/`loadOwned`/`requireDM`/`requireCampaignAccess`.
- Наявний щоденний cron (`cleanupAssistantData`) — прибирання старих сповіщень.
- Нове, бо немає аналога: `ToastHost` (у проєкті нема toast-компонента), `NewPill`, таблиці знайомств і сповіщень.

## Дані

Усі таблиці: `ENABLE ROW LEVEL SECURITY` (перевіряє `migrations-rls.test.ts`), міграції expand-only.

- `acquaintances`: `id`, `campaignId`, `kind` (`micro`|`character`), `characterId?`, `name`, `avatarUrl?`, `description`, `sourcePageId`, `sourceSectionId`, `createdAt`, `updatedAt`. Для `character` ім'я/аватар/опис беруться з персонажа.
- `acquaintance_entries`: `id`, `acquaintanceId`, `pageId`, `sectionId`, `text`, `sortOrder`, `createdAt`.
- `acquaintance_notes`: `id`, `acquaintanceId`, `authorUserId`, `text`, `createdAt`, `updatedAt`.
- `player_notifications`: `id`, `userId`, `campaignId`, `type` (`level`|`item`|`spell`|`acquaintance`), `refId`, `href`, `createdAt`, `readAt?`.
- `Campaign.acquaintancesEnabled Boolean @default(false)`.

## Правило видимості (чиста функція в `lib/utils/acquaintances/`)

Гравець бачить знайомство, якщо `acquaintancesEnabled` і секція `sourceSectionId` зіграна. Запис журналу — якщо зіграна його секція. DM бачить усе (приховане з позначкою). Фільтр — на сервері. Вимкнений перемикач → 403 для гравців.

Розкриття відбувається в мутації «позначити секцію зіграною»: після неї сервер створює `player_notifications` для кожного гравця кампанії (знайомства, що розкрились, і нові записи журналу).

## Частина B — сповіщення

- `lib/server/notifications/notifyPlayers` — запис у БД + Pusher-подія на приватний канал користувача; без Pusher лишається полінг. Викликається з наявних точок: підвищення рівня, видача/передача артефакту (отримувач), додавання заклинання, розкриття знайомства. Точні місця — на етапі плану (шукати спільну точку, не дублювати).
- Клієнт: `lib/api/notifications.ts`, `lib/hooks/notifications/` (`keys.ts`, `useNotifications`, `useMarkRead`), Pusher лише інвалідує ключ.
- `ToastHost` + `useToasts`: іконка типу, текст, посилання `href`, закрити; автозникнення. Прочитаним стає лише при відкритті цільового місця (`POST …/notifications/read` за типом/`refId`). Повторно в сесії не показується (`sessionStorage`).
- `NewPill`: золотистий, на плитках кампанії та на елементах (новий предмет, нове знайомство). Рахується з непрочитаних подій.
- Retention: прочитані видаляються через 30 днів (у наявному cron).

## Частина A — знайомства

- **Редактор (DM):** кнопка «Знайомство» у панелі `components/scenario/editor` над виділеним текстом → mention-вузол `acquaintance` → сайдбар: ім'я, опис, аватарка, або вибір повного NPC; журнал із кнопкою «Додати запис» (секція за замовчуванням — поточна). `sourceSectionId` фіксується при створенні; повторна згадка вставляє наявний чип. Видалення чипа не видаляє знайомство; видалення лише явно з `useConfirm`.
- **Таб:** `app/campaigns/[id]/acquaintances` (server page + `PrefetchedQuery`, клієнт `HudPage`/`HudCard`, `useSearch`). Картка: аватар, ім'я, опис, журнал, власна нотатка гравця (DM бачить усі нотатки з іменами авторів).
- **Налаштування DM:** перемикач «Знайомства доступні гравцям».
- Шари: `route.ts` тонкі + handler-файли, Zod-схеми, `lib/api/acquaintances.ts`, `lib/hooks/acquaintances/`, `lib/utils/acquaintances/`.
- Onboarding: запис у `lib/onboarding/whats-new.ts` + довідкова стаття.

## Тести

- Правило видимості (секція зіграна, перемикач, DM/гравець).
- Мутація розкриття створює сповіщення для всіх гравців, без дублів.
- Доступ до нотаток: автор і DM так, інший гравець ні.
- `notifyPlayers`, mark-read, retention.
- Компонентні: `ToastHost`, `NewPill`.
- `migrations-rls.test.ts` для нових таблиць.

## Поза межами

Окремий журнал для DM-приватних записів, ручне розкриття знайомства поза сценарієм, сповіщення для DM, нові типи подій понад чотири (додаються реєстром пізніше).

## Етапи

1. **B**: схема `player_notifications`, `notifyPlayers`, API, хуки, `ToastHost`, `NewPill`, підключення рівня/предмета/заклинання.
2. **A**: схема знайомств, mention-тип і тулза, таб, нотатки, перемикач, розкриття + подія, whats-new/help, docs (`docs/architecture/acquaintances.md`, `STATUS.md`).
