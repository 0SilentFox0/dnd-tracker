# Slide show («Показ») and music

- `slide_decks`: DM decks, `slides JSONB`. PUT with `expectedUpdatedAt` → 409 on a stale editor.
- `campaign_shows`: one row per campaign, **never deleted** — `seq`/`audio.seq` only grow, otherwise open pages would drop a restarted show as «old».
- Pure commands in `lib/utils/show/show-command.ts` (on top of `applyAudioCommand`), routes `app/api/campaigns/[id]/{decks,show}`, Pusher `private-show-<campaignId>` / `show-state`. Players get only the current slide + `nextImageUrl`.
- Images go to bucket `scene-slides` (client resizes to WebP ≤ 2560 px, signed upload).
- The music player is host-agnostic (`AudioHost` in `lib/hooks/audio`, components in `components/audio`): battle and show each pass their own host.
- **Заглушка:** `campaign_shows.cover` (знімок обраного слайда без треку, задається на рівні кампанії) і `curtain`. Команди `curtain {on?}` (без `on` — перемикання), `setCover`, `clearCover`; що бачать гравці — `lib/utils/show/player-view.ts`. Під `curtain` гравці бачать заглушку, позиція в наборі й музика не скидаються; будь-яке перемикання слайда знімає `curtain`, `end` зберігає `cover`. Без показу гравці теж бачать заглушку, а не «ДМ ще не почав показ». Знімок не оновлюється при редагуванні набору.
- **Керування для ДМ:** `ShowTransport` (‹ n/m ›, заглушка, завершити) і `ShowDeckStrip` (набір, спершу набори сцени; стрічка слайдів; ☆ — зробити заглушкою) спільні для `/show` і панелі сценарію. Клавіші (`useShowKeys`): ←/→, `B` — заглушка; сценарій додає `N` — наступний рядок через `extraKeys` (літери за `e.code`, бо українська розкладка). У рядку сценарію `current` — показ стоїть на слайді, `active` — і гравці його бачать.
- **Сценарій:** прив'язки рядка (мініатюра слайда, бій зі статусом) стоять над текстом; слайд показується кнопкою або подвійним кліком по рядку. Плеєр у панелі сценарію плаває над нею (`AudioDock corner`), а не займає місце.
