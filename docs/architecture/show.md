# Slide show («Показ») and music

- `slide_decks`: DM decks, `slides JSONB`. PUT with `expectedUpdatedAt` → 409 on a stale editor.
- `campaign_shows`: one row per campaign, **never deleted** — `seq`/`audio.seq` only grow, otherwise open pages would drop a restarted show as «old».
- Pure commands in `lib/utils/show/show-command.ts` (on top of `applyAudioCommand`), routes `app/api/campaigns/[id]/{decks,show}`, Pusher `private-show-<campaignId>` / `show-state`. Players get only the current slide + `nextImageUrl`.
- Images go to bucket `scene-slides` (client resizes to WebP ≤ 2560 px, signed upload).
- The music player is host-agnostic (`AudioHost` in `lib/hooks/audio`, components in `components/audio`): battle and show each pass their own host.
