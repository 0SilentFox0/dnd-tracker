# Саундборд

DM-панель швидких звуків: один дотик відтворює ефект у всіх гравців кампанії. Дизайн — [soundboard design](../superpowers/specs/2026-11-19-soundboard-design.md).

## Дані

- Таблиця `campaign_sounds` (`campaignId` cascade, `name`, `url`, `durationMs`, `volume`, `color`, `icon`, `sortOrder`; індекс `(campaignId, sortOrder)`), RLS увімкнено. Звуки належать кампанії, шарів контенту немає.
- `Campaign.hiddenBuiltinSounds String[]` — приховані вбудовані звуки; видалити вбудований не можна.
- Файли власних звуків — bucket `soundboard` (`SOUNDBOARD_BUCKET`), створюється ліниво через `ensureBucket`; завантаження через signed upload (спільні `lib/supabase/audio-upload.ts` і `lib/api/upload-audio-file.ts` з battle-music).

## Вбудований реєстр

`BUILTIN_SOUNDS` у `lib/constants/soundboard.ts`: `{ id: "builtin:<slug>", nameKey, icon, url: "/sfx/<slug>.mp3" }`. Файли лежать у `public/sfx/`, джерело й ліцензія кожного — `public/sfx/LICENSE.md` (лише CC0). Назви — ключі `soundboard.builtin.<slug>` в `messages/{uk,en}/soundboard.json`; реєстр, файли й ключі мають збігатися.

## Потік події

1. ДМ натискає пад → `POST /api/campaigns/[id]/sounds/play` `{ soundId, nonce }` (лише ДМ, rate limit `PLAY_RATE_LIMIT`).
2. Сервер перевіряє, що звук існує, і публікує `soundboard-play` `{ soundId, nonce, volume }` без URL і назв (`lib/server/soundboard/publish-play.ts`) у канал показу й, якщо є активний бій, у канал бою.
3. Клієнт бере URL зі свого кешу (реєстр + `GET sounds`), дедуплікує за `nonce` (LRU `NONCE_LRU`), грає через один `AudioContext` (до `MAX_VOICES` голосів).

Обробники підписані в наявних sync-хуках (`usePusherBattleSync`, `usePusherShowSync`), а не в окремому каналі: сторінка вже має підключення, нова підписка додала б з'єднання й egress. Подія не змінює `campaign_shows.seq` і `battle.version`.

## Ефемерність і ліміти

Пропущену подію не відтворюємо. Ліміти: `MAX_SOUNDS_PER_CAMPAIGN` 60, `MAX_SOUND_BYTES` 1 МБ, `MAX_SOUND_SECONDS` 10, формати mp3/m4a; клієнт гасить подвійний клік за `PAD_GUARD_MS`. Прев'ю «Тільки мені» не розсилається.
