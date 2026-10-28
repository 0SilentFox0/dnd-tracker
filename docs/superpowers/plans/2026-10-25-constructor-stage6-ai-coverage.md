# Етап 6 — route → service → tool ledger

Дата: 2026-10-25. Початкові146 routes +6 session-review routes T4 (разом152). Інвентар поточного дерева; **плановане покриття, не реалізація**. Дизайн: `../specs/2026-10-25-constructor-stage6-ai-design.md`; задачі T1–T20: `2026-10-25-constructor-stage6-ai.md`.

Кожний рядок охоплює всі явно експортовані HTTP methods цього route. Для collection/item factories methods зчитані з destructuring. Existing handler — поточна точка входу, не дозвіл викликати cookie-bound handler із MCP. Target adapter викликає спільний service після винесення за потреби. Читання позначаються read, mutations — review/auto або human. Runtime ledger T1 розгортає рядок у записи method+path+actionId+schema+need+test.

Політики: read — без intent; review/auto — звичайна зміна; human — завжди підтвердження; UI — захищений handoff, без секретів/байтів у моделі. Delete/reset/rollback у будь-якому рядку завжди human. Scoped token ніколи не виконує session-only напряму.

| Route (`app/api/…/route.ts`) | Methods | Чинний handler/service | Планований адаптер / задача | Policy |
|---|---|---|---|---|
| `campaigns/[id]/assistant/intents` | GET | `lib/server/assistant/http.ts` | session review (T4), `assistant-intents-api.test.ts` | session-DM; mutation same-origin; receipt tombstone лише original author |
| `campaigns/[id]/assistant/intents/[intentId]` | GET | `lib/server/assistant/http.ts` | session review (T4), `assistant-intents-api.test.ts` | session-DM; mutation same-origin; receipt tombstone лише original author |
| `campaigns/[id]/assistant/intents/[intentId]/confirm` | POST | `lib/server/assistant/http.ts` | session review (T4), `assistant-intents-api.test.ts` | session-DM; mutation same-origin; receipt tombstone лише original author |
| `campaigns/[id]/assistant/intents/[intentId]/reject` | POST | `lib/server/assistant/http.ts` | session review (T4), `assistant-intents-api.test.ts` | session-DM; mutation same-origin; receipt tombstone лише original author |
| `campaigns/[id]/assistant/intents/[intentId]/receipt` | GET | `lib/server/assistant/http.ts` | session review (T4), `assistant-intents-api.test.ts` | session-DM; mutation same-origin; receipt tombstone лише original author |
| `campaigns/[id]/assistant/policy` | PUT | `lib/server/assistant/http.ts` | session review (T4), `assistant-intents-api.test.ts` | session-DM; mutation same-origin; receipt tombstone лише original author |
| `ai/credentials/[provider]` | DELETE, PATCH, PUT | `../credential-handlers` | handoffs/settings (T4, T13) | UI; безпечні summaries → read
| `ai/credentials` | GET | `./credential-handlers` | handoffs/settings (T4, T13) | UI; безпечні summaries → read
| `campaigns/[id]/abilities/[kind]/[ownerId]` | GET | `app/api/campaigns/[id]/abilities/[kind]/[ownerId]/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/abilities/sources` | GET | `app/api/campaigns/[id]/abilities/sources/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/ai/proposals/[proposalId]/apply` | POST | `../../../ai-handlers` | legacy-proposals (T6, T18) | GET: read; apply: session human; reject: author
| `campaigns/[id]/ai/proposals/[proposalId]/reject` | POST | `../../../ai-handlers` | legacy-proposals (T6, T18) | GET: read; apply: session human; reject: author
| `campaigns/[id]/ai/proposals` | GET | `../ai-handlers` | legacy-proposals (T6, T18) | GET: read; apply: session human; reject: author
| `campaigns/[id]/ai/settings` | GET, PUT | `../ai-handlers` | campaign instructions (T7, T16) | GET: read; PUT: review/auto; не execution policy
| `campaigns/[id]/ai/threads/[threadId]/chat` | POST | `../../../ai-handlers` | existing chat/run transport (T15, T17) | session UI; history/metadata без рекурсивного запуску моделі
| `campaigns/[id]/ai/threads/[threadId]/messages` | GET | `../../../ai-handlers` | existing chat/run transport (T15, T17) | session UI; history/metadata без рекурсивного запуску моделі
| `campaigns/[id]/ai/threads/[threadId]` | DELETE, PATCH | `../../ai-handlers` | existing chat/run transport (T15, T17) | session UI; history/metadata без рекурсивного запуску моделі
| `campaigns/[id]/ai/threads` | GET, POST | `../ai-handlers` | existing chat/run transport (T15, T17) | session UI; history/metadata без рекурсивного запуску моделі
| `campaigns/[id]/api-tokens/[tokenId]` | DELETE | `../token-handlers` | handoffs/settings (T4, T13) | UI; безпечні summaries → read
| `campaigns/[id]/api-tokens` | GET, POST | `./token-handlers` | handoffs/settings (T4, T13) | UI; безпечні summaries → read
| `campaigns/[id]/artifact-sets/[setId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/artifact-sets` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/artifact-sets` | GET, POST | `@/lib/server/content/resources/artifact-sets` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/artifacts/[artifactId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/artifacts` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/artifacts` | DELETE, GET, POST | `@/lib/server/content/resources/artifacts` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/backgrounds/[backgroundId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/backgrounds` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/backgrounds` | GET, POST | `@/lib/server/content/resources/backgrounds` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/battles/[battleId]/ability-action` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.ability-action`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/add-participant` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.add-participant`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/attack` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.attack`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/audio` | GET, POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: GET→`battles.audio.get`, POST→`battles.audio`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/aura-zone` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.aura-zone`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/bonus-action` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.bonus-action`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/complete` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.complete`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/conditions` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.conditions`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/core-action` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.core-action`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/events` | GET | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: GET→`battles.events`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/map-terrain` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.map-terrain`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/map-weather` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.map-weather`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/maze` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.maze`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/maze-mark` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.maze-mark`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/morale-check` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.morale-check`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/move` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.move`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/next-turn` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.next-turn`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/participants/[participantId]` | PATCH | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: PATCH→`battles.participants.patch`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/refresh-sources` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.refresh-sources`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/reset` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.reset`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/reveal-participant` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.reveal-participant`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/rollback` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.rollback`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]` | DELETE, GET, PATCH | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: DELETE→`battles.delete`, GET→`battles.get/version`, PATCH→`battles.patch`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/scale-units` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.scale-units`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/spell` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.spell`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/start` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.start`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/summary` | GET | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: GET→`battles.summary`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/[battleId]/unit-control` | POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: POST→`battles.unit-control`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles/balance` | GET, POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: GET→`battles.balance.get`, POST→`battles.balance`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/battles` | DELETE, GET, POST | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: DELETE→`battles.clear-history`, GET→`battles.list`, POST→`battles.create`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/[id]/characters/[characterId]/artifacts/transfer` | POST | `app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/choices` | PUT | `./choices-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/draft` | PATCH | `app/api/campaigns/[id]/characters/[characterId]/draft/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/characters/[characterId]/goals` | PUT | `app/api/campaigns/[id]/characters/[characterId]/goals/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters/[characterId]/hit-dice` | POST | `./hit-die-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/inspiration` | POST | `app/api/campaigns/[id]/characters/[characterId]/inspiration/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/inventory` | GET, PATCH | `app/api/campaigns/[id]/characters/[characterId]/inventory/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/level-up` | POST | `app/api/campaigns/[id]/characters/[characterId]/level-up/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/log` | GET | `app/api/campaigns/[id]/characters/[characterId]/log/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/notes` | PUT | `app/api/campaigns/[id]/characters/[characterId]/notes/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters/[characterId]/progression/learn` | POST | `../progression-action-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/progression/reset` | POST | `../progression-action-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/progression` | GET | `./get-progression-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/progression/seen-level` | POST | `../progression-action-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/progression/unlearn` | POST | `../progression-action-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/resources` | PATCH | `./resources-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/review` | POST | `app/api/campaigns/[id]/characters/[characterId]/review/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters/[characterId]/roll` | POST | `./roll-handler` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]` | DELETE, GET, PATCH | `app/api/campaigns/[id]/characters/[characterId]/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters/[characterId]/sheet` | GET | `app/api/campaigns/[id]/characters/[characterId]/sheet/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/stash/free-artifacts` | GET | `app/api/campaigns/[id]/characters/[characterId]/stash/free-artifacts/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/stash/log` | GET | `app/api/campaigns/[id]/characters/[characterId]/stash/log/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/stash` | GET, POST | `app/api/campaigns/[id]/characters/[characterId]/stash/route.ts (route-local)` | characters (T9) | read; review/auto; reset → human |
| `campaigns/[id]/characters/[characterId]/tokens/[tokenId]` | DELETE | `app/api/campaigns/[id]/characters/[characterId]/tokens/[tokenId]/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters/[characterId]/tokens` | POST | `app/api/campaigns/[id]/characters/[characterId]/tokens/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters/draft/avatar` | POST | `app/api/campaigns/[id]/characters/draft/avatar/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/characters/draft/backstory` | GET, POST | `app/api/campaigns/[id]/characters/draft/backstory/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/characters/draft/portraits` | GET | `app/api/campaigns/[id]/characters/draft/portraits/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/characters/draft` | POST | `app/api/campaigns/[id]/characters/draft/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/characters/roster` | GET | `app/api/campaigns/[id]/characters/roster/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/characters` | DELETE, GET, POST | `app/api/campaigns/[id]/characters/route.ts (route-local)` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/classes/[classId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/classes` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/classes` | GET, POST | `@/lib/server/content/resources/classes` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/compendium/confirm` | POST | `app/api/campaigns/[id]/compendium/confirm/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/compendium/entries` | GET | `app/api/campaigns/[id]/compendium/entries/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/compendium/options` | GET | `app/api/campaigns/[id]/compendium/options/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/compendium/preview` | POST | `app/api/campaigns/[id]/compendium/preview/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/compendium/reports` | GET | `app/api/campaigns/[id]/compendium/reports/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/content-export/[kind]` | GET | `app/api/campaigns/[id]/content-export/[kind]/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/content-import/[kind]/ai-map` | GET, POST | `app/api/campaigns/[id]/content-import/[kind]/ai-map/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/content-import/[kind]/example.csv` | GET | `app/api/campaigns/[id]/content-import/[kind]/example.csv/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/content-import/[kind]` | POST | `app/api/campaigns/[id]/content-import/[kind]/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/decks/[deckId]` | DELETE, GET, PATCH, PUT | `../deck-handlers` | show/decks (T12) | read; review/auto; delete → human; generation explicit |
| `campaigns/[id]/decks/generate-image` | POST | `../../ai/ai-handlers` | show/decks (T12) | read; review/auto; delete → human; generation explicit |
| `campaigns/[id]/decks/generated-image` | DELETE | `../../ai/ai-handlers` | show/decks (T12) | read; review/auto; delete → human; generation explicit |
| `campaigns/[id]/decks` | GET, POST | `./deck-handlers` | show/decks (T12) | read; review/auto; delete → human; generation explicit |
| `campaigns/[id]/decks/upload-url` | POST | `../deck-handlers` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/experience` | POST | `./experience-handler` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]/export` | GET | `@/lib/server/templates/export-campaign` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/feats/[featId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/feats` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/feats` | GET, POST | `@/lib/server/content/resources/feats` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/main-skills/[mainSkillId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/main-skills` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/main-skills` | GET, POST | `@/lib/server/content/resources/main-skills` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/members/[memberId]` | DELETE | `app/api/campaigns/[id]/members/[memberId]/route.ts (route-local)` | campaign/templates (T7) | read; review/auto; delete/access → human |
| `campaigns/[id]/members` | GET | `app/api/campaigns/[id]/members/route.ts (route-local)` | campaign/templates (T7) | read; review/auto; delete/access → human |
| `campaigns/[id]/onboarding` | GET | `app/api/campaigns/[id]/onboarding/route.ts (route-local)` | campaign/templates (T7) | read; review/auto; delete/access → human |
| `campaigns/[id]/races/[raceId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/races` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/races` | GET, POST | `@/lib/server/content/resources/races` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/rest` | POST | `./rest-handler` | characters (T8, T9) | read; review/auto; delete → human |
| `campaigns/[id]` | DELETE, GET, PATCH | `app/api/campaigns/[id]/route.ts (route-local)` | campaign/templates (T7) | read; review/auto; delete/access → human |
| `campaigns/[id]/rules` | GET, PATCH | `@/lib/server/campaigns/rules` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/save-as-template` | POST | `@/lib/server/campaigns/create-campaign, @/lib/server/templates/export-campaign` | campaign/templates (T7) | read; review/auto; delete/access → human |
| `campaigns/[id]/scenario/[pageId]` | DELETE, GET, PATCH, PUT | `./page-handlers` | scenario + legacy proposals (T6) | read; review/auto; delete/restore → human |
| `campaigns/[id]/scenario/[pageId]/sections/[sectionId]` | PATCH | `./section-handler` | scenario + legacy proposals (T6) | read; review/auto; delete/restore → human |
| `campaigns/[id]/scenario/[pageId]/versions` | GET, POST | `./versions-handlers` | scenario + legacy proposals (T6) | read; review/auto; delete/restore → human |
| `campaigns/[id]/scenario/mentions` | GET | `./mentions-handler` | scenario + legacy proposals (T6) | read; review/auto; delete/restore → human |
| `campaigns/[id]/scenario` | GET, POST | `./scenario-handlers` | scenario + legacy proposals (T6) | read; review/auto; delete/restore → human |
| `campaigns/[id]/scenario/search` | GET | `./search-handler` | scenario + legacy proposals (T6) | read; review/auto; delete/restore → human |
| `campaigns/[id]/show` | GET, POST | `./show-handler` | show/decks (T12) | read; review/auto; delete → human; generation explicit |
| `campaigns/[id]/skill-trees/[treeId]` | PATCH | `@/lib/server/skills/skill-tree-service` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/skill-trees` | GET | `@/lib/server/skills/skill-tree-service` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/skills/[skillId]/duplicate` | POST | `app/api/campaigns/[id]/skills/[skillId]/duplicate/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/skills/[skillId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/skills` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/skills` | DELETE, GET, POST | `@/lib/server/content/resources/skills` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/source-sync` | GET, POST | `@/lib/server/templates/sync/service` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/[spellId]/remove-from-group` | POST | `app/api/campaigns/[id]/spells/[spellId]/remove-from-group/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/[spellId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/spells` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/delete-all` | DELETE | `@/lib/server/content/resources/spells` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/delete-by-level` | DELETE | `app/api/campaigns/[id]/spells/delete-by-level/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/groups/[groupId]/remove-all-spells` | POST | `app/api/campaigns/[id]/spells/groups/[groupId]/remove-all-spells/route.ts (route-local)` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/groups/[groupId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/spell-groups` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells/groups` | GET, POST | `@/lib/server/content/resources/spell-groups` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/spells` | DELETE, GET, POST | `@/lib/server/content/resources/spells` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/tracks/[trackId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/tracks` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/tracks/order` | PUT | `../track-handlers` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/tracks` | GET, POST | `@/lib/server/content/resources/tracks` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/tracks/upload-url` | POST | `../track-handlers` | handoffs (T13) | UI; reports/options → read |
| `campaigns/[id]/units/[unitId]` | DELETE, GET, PATCH | `@/lib/server/content/resources/units` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/units/delete-all` | DELETE | `@/lib/server/content/resources/units` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/units/import` | POST | `@/lib/server/campaigns/campaign-refs` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/[id]/units` | DELETE, GET, POST | `@/lib/server/content/resources/units` | content (T5) | read; review/auto; delete/clear → human |
| `campaigns/active-battles` | GET | `battles/action-service` + T10 pipeline/shared record arm | T11 implemented: GET→`battles.active`; `battle-actions`/HTTP tests; activation T14 | read; review/auto; delete/reset/rollback → human |
| `campaigns/import` | POST | `@/lib/server/campaigns/create-campaign` | handoffs (T13) | UI; reports/options → read |
| `campaigns/join` | POST | `app/api/campaigns/join/route.ts (route-local)` | handoffs (T13) | UI; reports/options → read |
| `campaigns` | GET, POST | `@/lib/server/campaigns/create-campaign, @/lib/server/templates/bundle, @/lib/server/templates/export-campaign` | campaign/templates (T7) | read; review/auto; delete/access → human |
| `templates` | GET | `@/lib/server/templates/list-templates` | campaign/templates (T7) | read; review/auto; delete/access → human |

## Повнота та заборонені розширення

- Усі перелічені routes мають бути класифіковані у T1; новий/видалений method змушує coverage test оновити ledger. Для aliases допустимий один actionId, але кожний route має явне посилання.
- `campaigns/join` — учасницька дія входу, не привілей ДМ додавати будь-якого користувача. Лише UI handoff. Player draft генератори не стають інструментами нового асистента; чинні DM-операції створення/review персонажа покриті окремо.
- API-токени/credentials/invite secrets не повертаються моделі. MCP бачить лише безпечні summaries/посилання.
- Локальні display-only дії (друк, вибір файлу, анімація кубиків, зміна ширини панелі) — local UI; серверний ігровий кидок покриває T9/T11.
- Template list/admin routes охоплюються з чинними admin checks; токен не отримує доступу до інших кампаній через створений шаблон.
- `additionalSpells` manual, gear/gold manual, ScenarioPage source-sync unsupported; compendium raw JSON залишається у чинному UI.

## Checkpoint T6/T7 —2026-10-25

Нижче — реалізовані server adapters; це **не активація модельного transport**. Початкова route-матриця вище зберігає історію планування. T14 підключає повний каталог і legacy aliases; T20 закриває всю матрицю.

| Операції | Спільний service / action | Докази |
|---|---|---|
| scenario pages/meta/content/section/row/version/search/mentions | `scenario/action-service.ts`, `actions/scenario.ts` | `scenario-actions`, `scenario-pages-api`, `scenario-aux-api`, `scenario-storage.integration` |
| legacy list/apply/reject і one-to-one linkage | `ai/proposals.ts`, `assistant/legacy-proposals.ts`, `actions/legacy-proposal.ts` | `legacy-proposals`, `ai-proposals-api`, `proposals`, `proposals-slide`, real race/stale/reject integration |
| campaign settings/delete/members/template save | `campaigns/action-service.ts`, `actions/campaign.ts`; HTTP delegates | `campaign-actions`, `campaign-delete-api`, `campaigns-api`, `members-join-api`, `campaign-templates-api` |
| instructions/create/clone/template update/list/onboarding | чинні settings/createCampaign/exportCampaign/importBundle/listTemplates/facts + campaign adapter | `ai-settings-api`, `create-campaign`, `campaign-actions`, `campaign-storage.integration` |
| campaign.export | єдиний canonical CONTENT_ACTIONS id; content:read збережено, browser-download handoff | combined catalog uniqueness + handoff regression; HTTP download незмінний |

Повна scenario.save завжди human; played=false — erase-progress. Delete/member access/template visibility — human; lifecycle create/clone/save/update/delete — sessionOnly відповідно до adapter needs. Invite/credential mutations лишаються existing UI/T13. Raw bundles, invite codes, account emails і token grants не входять у нові tool results. Real constructor9/9 та scoped153PASS — overlapping evidence, не новий full-suite coverage claim.


## Checkpoint T8/T9 —2026-10-25

`CHARACTER_ACTIONS` / `runCharacterOperation` та `CHARACTER_PROGRESSION_ACTIONS` / `runCharacterProgression` реалізовано над спільними чинними handlers. Повна method→action→test прив’язка34 методів: `lib/server/assistant/actions/character-coverage.ts`; `character-coverage.test.ts` звіряє її з route ledger, реальними HTTP exports і єдиним каталогом. Модельний каталог залишається вимкненим до T14.

| HTTP можливості | Канонічні characters actions | Докази |
|---|---|---|
| create/list/roster/get/patch/delete/delete-all | create/list/roster/get/patch/delete/delete-all | character-actions, current HTTP regression, character-storage.integration |
| controlledBy/review/private notes/goals/ігрові жетони | patch/review/notes/goals/tokens.create/tokens.delete | character-actions, character-draft/notes/goals/tokens-api; creator audit і owner-only notes збережено |
| HOMM +5e level-up, Choices/Picks/ASI | level-up/choices | current class/choice HTTP tests, real5e ASI receipt+log once, stale after level/content change |
| HP/resources/charges/inspiration/hit dice/rest/XP | resources/inspiration/hit-dice/rest/experience | current resources/rest/experience tests, real active-battle409 і repeated XP/rest once |
| inventory/stash/transfer/attunement | inventory/inventory.patch/stash/stash.apply/transfer | inventory/stash/transfer HTTP regression, real transfer once, both before states, foreign nested item ref deny |
| sheet/progression/character+inventory logs/free artifacts | sheet/progression/progression.learn/unlearn/reset/seen-level/log/stash.log/stash.free-artifacts | current read/progression regressions, pure-read real DB case |
| кидок з листа | roll, обов’язковий `mode: server` | explicit-mode schema, real receipt/result/log once; серверна чинна формула, без вигаданого результату |

Delete-all preview називає лише персонажів типу «Гравець»; його чинний NPC/status filter не змінено. Generic patch/goals і Choices/resources/inventory/stash replacements консервативно always-human; reset/unlearn — erase-progress. Ownership, private notes, current DM membership, active-battle guards, sorted character locks і журнали збережено. Read inventory у tool не створює відсутній рядок; native HTTP контракт лишився чинним. Reference cache обходиться лише у scoped write context, де потрібні актуальні довідники.

`additionalSpells` не автоматизовано, спорядження/гроші передісторії вручну. Нові зовнішні аватари — чинний редактор; HTTP media preparation перед lock, у model intent немає зовнішнього upload/download. Ігрові жетони не пов’язані з ApiToken. Invite secrets не входять у get/receipts; level-up tool не повертає чужих private notes. Нові cascade dependencies героя (журнали, жетони, skills, story refs) входять у fingerprint.

Фінальні докази — ledger та checkpoint handoff:433 scopedPASS,13/13 real constructor (single connection), tsc/lint/buildPASS. Після уточнення користувача «потрібно пофіксити все» усі38 baseline-падінь і timeout cases виправлено комітом `ef815923`: спільний scoped DB double з реальним campaign guard та ізольована підготовка cold imports. Фінальний повний suite:1231/1231files,7943/7943tests PASS, без skip/fail; scoped fixture/MCP/FX91/91, lint/tsc PASS. Попередні червоні записи лишаються лише історією діагностики в ledger. Незалежне whole-stage review та транспорт/UI — наступні задачі, не покриття T8/T9.

## Checkpoint T10 —2026-10-25

Реалізація `c24c7e2a`, BASE `c0d587cd`:24 чинні pipeline routes мають спільні operation definitions зі схемами/access/status/mode/rate rules і mutation; HTTP та actor викликають той самий guarded core. Імена операцій явні. Actor не підміняє membership/isDM; доступ повторно перевіряється перед save. Placement/victory/turn order/delta/events збережено; HTTP отримує чинний delta response, actor — безпечні operation/battleId/version refs.

`battle-pipeline.test.ts`:10 cases, зокрема всі6 named acceptance T10, schema/rate/scope/fake-DM/context і real next-turn parity. `battle-pipeline-storage.integration.test.ts`:2/2 real constructor single-connection; SQL fault після battle save відкочує save+receipt, успішний retry/confirm once публікує після commit; HTTP stale409. Обидва URL перевірено до записів, власні fixtures очищено. Scoped60files/462PASS; усі5 pipeline test files із brief виконано. Full suite1232files/7953testsPASS без skip/fail; lint33files, tsc і build exit0.

Це покриття pipeline, а не завершення T11: battle CRUD/list/reads/balance/audio і action catalog/policy/dice adapters ще pending. Runtime route coverage entries не активовано. T14 має встановити разом каталог/transport та durable effect dispatch (`publish.battleMessages`, `invalidate.battleLeftActive`), зберігши handlers попередніх доменів. Зупинка перед T11; T20 whole-stage review ще не виконано. Schema/migrations та HOMM-шлюз не чіпалися.

## Checkpoint T11 —2026-10-25

Усі37 battle route methods мають точний action/test owner у `BATTLE_ACTION_COVERAGE`; `ledgerEveryBattleEndpointCovered` звіряє companion/runtime ledger, реальні exports та каталог. `BATTLE_ACTIONS` містить38 read/write definitions і UI handoff `battles.map-background`. `get/version`, list/active (поточна actor-кампанія), events/summary/balance/audio reads доступні ДМ; чинні HTTP member/DM distinctions збережено.

Усі записи адаптерів входять через `executeBattleOperation`:24 бойові definitions з T10 та shared guarded record arm для create/patch/delete/clear-history/audio. HTTP CRUD/audio використовують той самий record writer під Campaign lock; audio лишає battle.version незмінним та перевіряє власний seq. Guarded save, turn/status/mode/awaiting/schema/rate checks, delta/events і scoped intent transaction збережено. HTTP external background preparation відбувається до DB lock; assistant приймає збережені фони або веде в чинний UI.

T11:15 adapter tests (усі7 named acceptance),75files/603 scoped PASS;6/6 real constructor single-connection PASS (URL guards до writes, cleanup власних fixtures): server dice/event retry, SQL fault rollback save+receipt, create idempotency, human-only destructive policy, turn/HTTP stale, audio seq stale, усі read/balance adapters, delete/clear receipts. Повний suite1233files/7971tests PASS, без skip/fail. tsc/lint/build evidence — останній T11 handoff/ledger.

Runtime activation досі T14. Додати `BATTLE_ACTIONS` і зберегти combined durable handlers: publish `{battleMessages}` для бойових delta/audio, invalidate `{campaignId,battleId,battleLeftActive:true}` для complete/reset/delete/clear. Не замінювати handlers content/scenario/campaign/characters. Нема T12 чи HOMM-шлюзу; whole-stage review — T20.
