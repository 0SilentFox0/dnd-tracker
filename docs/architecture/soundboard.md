# Саундборд

DM-панель швидких звуків: один дотик відтворює ефект у всіх гравців кампанії. Дизайн — [soundboard design](../superpowers/specs/2026-11-19-soundboard-design.md), бібліотека й пресети — [sound library design](../superpowers/specs/2026-11-19-sound-library-presets-design.md).

## Дані

- `sound_library_items` — бібліотека **акаунта** ДМ (`userId` cascade, `name?`, `icon`, `color?`, `volume`, `url`, `durationMs`, `source` = `upload|record|link`, `sourceUrl?`; індекс `(userId, createdAt)`), RLS увімкнено. Спільна для всіх кампаній ДМ.
- `sound_presets` — `userId`, `name`, `slots Json` (рівно 9 елементів: `soundId | null`), `sortOrder`; індекс `(userId, sortOrder)`, RLS. FK на слоти немає: видалення звуку в транзакції замінює його `null` у всіх пресетах акаунта.
- `soundId` — id рядка бібліотеки або `builtin:<slug>`. Ліміти: `MAX_LIBRARY_SOUNDS` 100, `MAX_PRESETS` 30, `PRESET_SLOTS` 9.
- Стартові пресети «Бій» і «Атмосфера» (`STARTER_PRESETS`, назви — ключі `soundboard.starter.*`) створюються один раз на акаунт при першому `GET`: маркер — прапорець `sound-presets-seeded` у `user_onboarding_flags` (видалення останнього пресета їх не повертає); дешева перевірка маркера йде до advisory lock `sound-presets:<userId>`.
- Файли — bucket `soundboard` (`SOUNDBOARD_BUCKET`), створюється ліниво через `ensureBucket`; signed upload через `lib/supabase/audio-upload.ts` і `lib/api/upload-audio-file.ts` (спільні з battle-music). Стара `campaign_sounds` і `Campaign.hiddenBuiltinSounds` прибрані з Prisma-схеми, але ще є в БД (див. нижче).

## Вбудований реєстр

`BUILTIN_SOUNDS` у `lib/constants/soundboard.ts`: `{ id: "builtin:<slug>", nameKey, icon, url: "/sfx/<slug>.mp3" }`. Файли — `public/sfx/`, джерела й ліцензії — `public/sfx/LICENSE.md` (лише CC0). Назви — ключі `soundboard.builtin.<slug>`; реєстр, файли й ключі мають збігатися. Вбудовані лише для читання.

## Маршрути

Усі під `requireAuth`, у межах `userId` (`lib/server/soundboard/{library-store,preset-store}.ts`, тонкі `route.ts`):

- `GET/POST /api/sound-library`, `PATCH/DELETE /api/sound-library/[id]`;
- `POST /api/sound-library/upload-url` (підписане завантаження), `POST /api/sound-library/import` (посилання), `POST /api/sound-library/discard` (прибрати завантажений, але незбережений файл);
- `GET/POST /api/sound-presets`, `PATCH/DELETE /api/sound-presets/[id]`, `PUT /api/sound-presets/order`.

Слот приймає лише id звуку цього акаунта або відомий builtin (`PRESET_SLOT_INVALID`).

## Джерела звуку

- **Файл** і **запис з мікрофона** (`MediaRecorder`, автостоп 10 с, webm/opus; кнопка ховається, якщо API немає): клієнт → signed URL → bucket → `POST /api/sound-library`. Тривалість клієнт отримує через `decodeDurationMs` (читає публічний URL bucket — потрібен CORS).
- **Посилання**: `import-link.ts` сервер сам качає файл у наш bucket. Завантаження через `safeFetchBuffer` (`lib/utils/api/safe-fetch.ts`): лише `https`, IP прив'язується до перевіреного резолву (без вікна DNS-rebinding), відхилення приватних/loopback/link-local/metadata адрес, до 3 редиректів (кожен перевіряється), таймаут 8 с, потік з лімітом 1 МБ, тип за magic bytes (`sniff-audio.ts`), тривалість ≤ 10 с. Сирий текст чужого сервера не показуємо — лише ключі `SOUND_LINK_*`.

## Потік події

1. ДМ натискає пад → `POST /api/campaigns/[id]/sounds/play` `{ soundId, nonce }` (лише ДМ, rate limit `PLAY_RATE_LIMIT`); звук має бути бібліотекою цього ДМ або builtin.
2. Сервер публікує `soundboard-play` `{ soundId, nonce, volume, url? }` (`publish-play.ts`) у канал показу й, якщо є бій, у канал бою. `url` несе кастомний звук, щоб гравцям не потрібен був доступ до бібліотеки ДМ; builtin URL клієнт бере з реєстру.
3. Клієнт дедуплікує за `nonce` (LRU `NONCE_LRU`), грає через один `AudioContext` (до `MAX_VOICES`).

Обробники — у наявних sync-хуках (`usePusherBattleSync`, `usePusherShowSync`), без окремого каналу (egress). Подія не змінює `campaign_shows.seq` і `battle.version`.

## Панель і пресет

`SoundboardPanel`: вибір пресету зверху, сітка 3×3, гарячі клавіші 1–9, режим «Замінити слот» (`SoundSlotDialog`, посилання в бібліотеку `/library/sounds`). Останній вибраний пресет кампанії — `localStorage` `soundboard.preset.<campaignId>` (`useActivePreset`), без серверного стану. Сторінка бібліотеки (`app/library/sounds`) — плитки звуків і редактор пресетів.

## Ефемерність і ліміти

Пропущену подію не відтворюємо. `MAX_SOUND_BYTES` 1 МБ, `MAX_SOUND_SECONDS` 10; клієнт гасить подвійний клік за `PAD_GUARD_MS`. Прев'ю «Тільки мені» не розсилається.

## Відкладена міграція видалення (contract)

Міграцію `20261210000001_drop_campaign_sounds` зняли з гілки: contract-крок має йти окремим деплоєм після того, як жоден читач не лишився (`.claude/rules/db-deploy.md`). Додати окремим комітом після першого деплою бібліотеки:

```sql
DROP TABLE "campaign_sounds";

ALTER TABLE "campaigns" DROP COLUMN "hidden_builtin_sounds";
```

Початковий коміт видалення: 99bb03985.
