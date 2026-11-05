# План: слайд лише для визначених героїв

Spec: `docs/superpowers/specs/2026-11-05-slide-audience-design.md` (відповіді на питання: так / так / так).

## Задачі

1. **Типи, схема, міграція.** `types/show.ts`: `Slide.audience?`, `SlideTrailEntry`, `ShowState.trail?`. `lib/constants/show.ts`: `AUDIENCE_MAX`, `TRAIL_MAX`. `lib/schemas/show.ts`: `audience` + refine для пазла. `prisma/schema.prisma` `CampaignShow.trail Json?` + міграція `ALTER TABLE campaign_shows ADD COLUMN trail JSONB`. `show-store.ts`: `trail` у `SHOW_SELECT`/`toShowState`/`writeShowState`.
2. **Команди.** `show-command.ts`: `nextTrail(prevTrail, slide)` (дедуп, компактація, `TRAIL_MAX`), `open`→`[target]`, `end`→`[]`, `next/prev`→push; `slideAt.nextImageUrl` лише для публічного; `setCover` → `SHOW_COVER_RESTRICTED`; `refreshShowSlide` оновлює останній запис; `sameSlide` з `audience`. Тести в `show-command.test.ts`.
3. **Вигляд гравця.** `player-view.ts`: `playerShowView(show, heroIds)`, `isRestricted(show)`, `toClientShow(show)` (знімає `trail`). Тести в `player-view.test.ts`.
4. **Сервер.** `show-store.ts` `publishShow`: thin `{campaignId, seq}` якщо `isRestricted`, інакше `toClientShow`. `read-show.ts`: ДМ → `toClientShow`; гравець → `playerShowView` (hero ids через `activePlayerHeroes` лише коли `isRestricted`). `show-handler.ts`, `puzzle-handler.ts`: відповіді через `toClientShow`/`playerShowView`. Перевірити `deck-handlers`, `action-service`, `runtime-effects` (trail у JSON ефекту). Тест `GET /show` без витоку.
5. **Клієнт.** `types/show.ts` `ShowEvent.show?` optional; `usePusherShowSync`: thin-подія з більшим `seq` → invalidate `showKeys.state`. Тест.
6. **UI.** `SlideDialog` секція «Бачать герої» (`useCharacterRoster`, лише PLAYER), без секції для пазла; `ShowDeckStrip` 🔒 + прибрати ☆ для обмежених; тексти `messages/{uk,en}/{show,errors,validation}.json`, `whats-new` + `whatsNew.<id>`. Компонентні тести.
7. **Завершення.** Повний suite + repo-wide lint один раз, `/simplify`, `show.md`, `STATUS.md`. Не мерджити без «так».
