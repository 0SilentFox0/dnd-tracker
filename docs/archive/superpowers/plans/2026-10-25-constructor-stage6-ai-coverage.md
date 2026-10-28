# Етап 6 — route → service → tool ledger

Дата: 2026-10-25. Початкові146 routes +6 session-review routes T4 (разом152). Інвентар поточного дерева; **початковий план; актуальні реалізації й activation — у checkpoint розділах нижче**. Дизайн: `../specs/2026-10-25-constructor-stage6-ai-design.md`; задачі T1–T20: `2026-10-25-constructor-stage6-ai.md`.

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
| `campaigns/[id]/ai/threads/[threadId]/chat` | GET, POST, DELETE | `../../../ai-handlers` | existing chat/run transport (T15, T17) | session UI; history/metadata без рекурсивного запуску моделі
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


## Checkpoint T12 —2026-10-26

`SHOW_ACTIONS` та `SHOW_ACTION_COVERAGE` закривають10 show/deck methods: get/command (усі native show/audio commands), list/get/create/save/scene/delete наборів, explicit generate і discard. HTTP та actor ділять command resolver/CAS і deck record writers; Campaign guard reentrant, media copying перед DB tx. Legacy slide proposals зберігають єдиний T6 writer; бібліотека треків — чинний T5 content adapter.

Fingerprint включає deck.updatedAt, slide set/order, bindings попри незмінний updatedAt, show/audio seq та refs. Видалення слайдів/заміна зображення/очищення полів дає human-only effect. Генерація always-human, explicitRequest та trusted caller.runId обов’язкові; model input не задає runId. Claim receipt started commit до мережі, durable result до finalize; save+final receipt atomic. Crash/unknown/cancel ніколи не запускають paid call повторно; підготовлений результат відновлює лише finalize. SDK image maxRetries=0. Cleanup після commit перевіряє owned path, decks/proposals/show/cover/next і незавершені external results; strict Storage failure не позначається успішним.

Докази: show-actions15/15, full1234files/7991testsPASS, real constructor5/5 single-connection (обидва URL guards, власні fixtures очищено; provider/Storage/Pusher mocked), tsc/lintPASS; build і точний commit — latest handoff/ledger. Signed media URLs приховані у tool read/preview.

T14 має додати SHOW_ACTIONS до combined catalog та розгалужити durable publish `{campaignId,show}` / media-cleanup `{campaignId,urls}` через publishShow/runShowMediaCleanup, зберігши handlers усіх попередніх доменів. Trusted runId має походити з transport run, не model payload. Native HTTP image endpoints та legacy tool не переводилися на новий transport; це T14. Каталог досі вимкнено; далі T13.


## Checkpoint T13 —2026-10-26

`HANDOFF_ACTIONS` і `HANDOFF_ACTION_COVERAGE` закривають24 чинні UI/session-only methods (17T13 +7 settings methodsT4). File selection, JSON import/preview/rights-confirm, AI mapping, credentials/API tokens/invite, slide/track uploads і власні player drafts мають allowlisted relative destinations та причини. Handoff не створює intent/receipt і не повідомляє про виконану мутацію; credentials/upload tickets/raw JSON не потрапляють до model history. Player draft endpoints не стають новими DM mutation tools.

`compendium.options/reports/entries` — session-only `content:write`, відповідно до чинних HTTP прав. Поточна DM membership і Task19 repository authorization перевіряються реально. Local options — bounded picker summaries за видом; reports — лише counts/ready flags і id/date; entries — лише metadata без автоматичних notes. Pagination default20/max20, offset≤100000, take≤21. Token повертає handoff; не виготовляється session actor.

Source-note текст відсутній у model-callable actions. `handoff.source-notes` веде у UI; `AssistantHandoff` має явний, початково порожній вибір. Session-only helper `readCompendiumSummary(...,"notes",{selectedKeys})` повертає лише1–5 явно вибраних власних джерел, до3000chars/notes, без raw columns, credentials або signed URLs. Відсутній/чужий вибір відхиляється. T16/T18 з’єднують цей явний UI selection з контекстом; автоматичного provider use у T13 немає.

Докази: усі6 named acceptance у handoffs12/12 + UI3/3; scoped46files/341PASS; full1236files/8006PASS без skip/fail; T13 real constructor3/3 та фінальна10-suite assistant DB regression47/47 PASS (включає T12 5/5 і попередні домени); tsc/lint/build exit0. Обидва DB URL guards, single connection і cleanup власних fixtures. Native compendium importer/preview-token/rights-confirmation contracts не змінено; існуючі HTTP/service/UI regressions виконано.

T14 має додати HANDOFF_ACTIONS і SHOW_ACTIONS до єдиного каталогу, зберегти read→handoff fallback та комбіновані durable handlers усіх доменів. Runtime route entries не активовано, legacy/model transport не перемикали. Зупинка перед T14; whole-stage independent review залишаєтьсяT20.


## Checkpoint T14 —2026-10-26

Єдиний executable catalog складає CONTENT/SCENARIO/CAMPAIGN/CHARACTER/CHARACTER_PROGRESSION/BATTLE/SHOW/HANDOFF_ACTIONS. Обидва model transports та session review використовують один default executor; другого business registry немає. Runtime coverage T5–T13 активовано (protected workflows — handoff); чотири T15 chat/run routes залишаються planned. Method→action coverage таблиці попередніх доменів збережено.

`assistant_capabilities/schema/read/action/status/reject`: scopes discovery та повторна live authorization, справжній session caller з null tokenId або verified MCP token id. Caller/scopes/internal preconditions не повертаються моделі. Read не виконує write, model confirm/apply/set-auto немає. Legacy content aliases й scenario edit йдуть у dispatcher/review; сценарій застосовується лише T6 writer у scoped tx, до confirm не створюється другий незалежно застосовний proposal. Session queue підхоплює старі proposals, actor не підміняється.

V2 contract: structured result/error, MCP isError лише для справжніх помилок; pending/handoff явно не виконані. Bounded path/offset projections з валідним JSON у24000chars, з урахуванням escaping; pending id/status/reviewUrl збережені. Status читає safe receipt після redaction preview. Signed URLs прибираються до pagination. Міграція контрактів — docs/architecture/ai.md та content-api.md.

Durable dispatch комбінує content invalidate/track cleanup, battle messages/left-active та show publish/media-cleanup через publishShow/runShowMediaCleanup; чинні scenario/campaign/character callbacks залишаються в after-commit chain. Strict publication failure не маскується success, completed effects не повторюються. External started/result і save+receipt atomicity з T12 збережено. Генерація завжди explicit+human+trusted run; T14 не створює run identity, тому canonical paid action і legacy slide generation fail closed. Native human UI generation збережена, T15 приховано не реалізовано.

Докази: усі6 named acceptance+registry21/21, додаткові legacy authorization/status/escaped projection/effect cases; scoped39files/286PASS; full1242files/8020PASS без skip/fail; real constructor10suites/48PASS (обидва URL guards, single connection, owned fixture cleanup, provider/Storage/Pusher mocks). Новий T14 real scenario test доводить один proposal/snapshot/write/receipt після confirm і відсутність доменного запису до нього. tsc/lint/buildPASS; у T14 немає schema/migration/env змін. Зупинка перед T15, whole-stage independent review — T20.


## Checkpoint T15 —2026-10-26: chat run/retry/cancel/recovery

Чотири T15 thread routes активовано в runtime ledger; `/chat` має POST submit, GET recovery (optional validated requestId) і DELETE cancellation. Session DM/owner перевіряється повторно. Новий model tool або другий run/business registry не додавався. T2 AssistantRun та Campaign→Thread locks забезпечують атомарний claim+user message; append seq серіалізується Thread lock. Stable requestId походить із client message id; trusted toolCallId+server runId дають стабільний ключ і для legacy aliases.

Єдиний abort обмежує model/tools270000ms і враховує client/server Stop; provider maxRetries0. Lease утримується300000ms навіть після terminal outcome, що записується в resultRefs через чинний T2 CHECK. Перед звільненням — reconciliation effects і перевірка executing/unknown. Невідоме не запускає другий зовнішній платний виклик і не звільняє claim. Retained request mapping і targeted recovery зберігають доступ до старого receipt після понад30новішихrun. GET/UI «Відновити стан» не виконують новий submit. Stop показує вже committed receipt та pending review link. Partial usage durable після кожного завершеного model step; unknown=null/partial, UI не вигадує0 чи грошову суму.

T14 каталог усіх доменів, scope filtering/revalidation, session tokenId:null/MCP verified token id, єдиний T6 writer та combined durable effects не замінені. Paid caller.runId лише із серверного claim; explicitRequest і human confirm, durable started/result та one-image/run збережені. Legacy slide consent не вгадується; compendium/source-note та player draft межі без змін. Жодного T16 контекстного розширення.

Докази: named6/6; scoped56files/344PASS; full1247files/8042PASS; усі11assistant DB suites53/53PASS; tsc/lint/buildPASS. Mocks на provider/Storage/Pusher; обидва URL guards, лише local constructor та cleanup owned fixtures. Schema/migrations/env без змін. Зупинка перед T16; whole-stage independent review —T20.


## T16 checkpoint —2026-10-26

Context activation: `buildInstructions` отримує справжній server AssistantCaller від runChat; live membership/session/thread ownership/policy перевіряються до контексту. Identity/scopes не беруться з focus чи model input і не серіалізуються. Capabilities domains походять із чинного єдиного каталогу. Campaign threads з null scenarioPageId збережені; default mode label зрозумілий поза сценарієм.

`AiFocus`/strict schema підтримують legacy pageId, scenario, character, battle, campaign. Nested reads завжди прив’язані до авторизованої кампанії; чужий/видалений focus явно недоступний, без fallback на іншу сторінку. DB infrastructure errors не маскуються як відсутня сутність. Character/battle focus містять лише summary; full reads — через чинні scoped tools.

`fitContext` рахує всі labels/separators/system/policy/standing/summaries/focus в40000chars. Required content не обрізається; безпечна413 до optional reads при переповненні. Optional summaries мають окремі caps, JSON pages/truncated/nextOffset, focus останній; standing instructions лишаються цілими. Signed URLs очищаються також у текстових блоках. Нема raw book/SRD/всіх боїв/compendium JSON/автоматичних notes. Live campaign rules — fresh parsed snapshot; focused active/completed battle — fresh persisted battle snapshot, prepared — campaign rules, як engine loadBattle. History/compaction не заміняє fresh reads перед write.

T13 notes helper використовується лише з окремим trusted `sourceNoteSelection:{source:"session-ui",selectedKeys}`; strict model/chat schemas відхиляють forged selected/selectedKeys. Helper зберігає session membership/ownership/1–5 selection/3000char bounds. UI/API selection wiring лишаєтьсяT18, workspace/queueT17 не додано. Token context не отримує session actor; MCP compendium лишається handoff. Player draft окремо.

Збережено T14 catalog/dispatcher/review/єдиний T6 writer, combined effects і T15 stable ids/lease270s+30s/cancellation/recovery/durable usage. Нема model confirm/apply/set-auto, автоматичної згоди на оплату чи нових effect handlers. Paid trusted runId/explicitRequest/human/one-image budget та durable external started/result не змінено.

Докази: named8/8, context14+prompt9PASS; final scoped60files/386PASS; full1248files/8056PASS; real constructor всі11assistant suites54/54PASS, включно з T16 foreign focus/selected notes/current policy/revoked membership. Обидва URL guards до writes; owned fixtures cleaned; зовнішні provider/Storage/Pusher mocked. tsc/buildPASS; lint0errors і один перевірений попередній warning constants/ai.ts:59. Schema/migrations/env без змін. STOP передT17; незалежний whole-stage reviewT20.


## T17 checkpoint —2026-10-26

T17 завершено локально: кампанійний workspace `/dm/assistant`, спільний responsive review у scenario-панелі, кампанійні треди з null scenarioPageId, серверна pending-черга20/max50, повний paginated diff і keyless confirm/reject/refine. MCP review URL відкриває точний intent; GET не запускає модель/стадіювання/запис. Persisted legacy linkage усуває дублікати, V2 errors/pending/handoff відображаються правдиво. Full1250files/8069testsPASS; scoped50files/332PASS; усі7namedT17PASS; real constructor11suites/54PASS; actual Chrome1440/390PASS (keyboard/focus/full diff/no overflow/keyless one-confirm). T18 ще не реалізовано; наступний крок — лишеT18, зупинка передT19. Whole-stage independent review —T20. Schema/migrations/env і T14–T16 guards/leases/effects без змін.

Review/list/detail/receipt читаються без AI key; legacy workspace projection додає лише safe canonical linkage і не стадіює intents. Session-only confirm/reject викликають чинний executor/T6 writer. Pending filter виконується до cursor pagination. Нові local UI routes — DM assistant page; credential/token endpoints не замінено. Докази й cold-import ruling — handoff/ledger.


## T18 checkpoint —2026-10-26

Owner thread/token execution policy, separate context disclosure/selection, editor flush and cache effects, recovery/usage UI implemented. Session-only routes: `POST /api/campaigns/[id]/ai/threads/[threadId]/context-preview` returns actual fitted block labels/counts/provider/model/history cap; `GET /api/campaigns/[id]/assistant/source-notes` returns paginated metadata only via existing T13 ownership/selection helper. Both are non-model handoffs/read routes in `lib/server/assistant/coverage.ts`; provider receives selected note text only after explicit UI selection and T13 validation (1–5 owned notes, ≤3000 chars each). Covered by context API/UI and local handoff integration tests.

`useAssistantEffects` reuses `invalidateCampaignQueries` and existing `battleKeys.active()` for safe affected refs. It adds no domain registry/writer. Editor flush is local UI state and blocks canonical and legacy apply on failure. Receipt IDs deduplicate invalidations across reconnect/remount. Conservative campaign-key invalidation can refetch more campaign data than exact refs need; it has no business side effect.

Named acceptance7/7; scoped69files/426PASS; full1254files/8095PASS; standalone legacy `useAiProposals`6/6PASS; local constructor assistant DB11suites/56PASS; tsc/lint/build exit0; real Chrome1440/390 passes all16 recorded assertions per viewport. Exact logs/screenshots and cold-import ruling in local ledger/handoff. Both DB URLs guarded before writes; own fixtures cleaned; provider/Storage/Pusher mocked. No schema/migration/env changes.

Separate non-AI invisibility request remains an audit item; partial static findings and four requested criteria are recorded in STATUS and constructor-handoff. No gameplay behavior was changed or runtime-tested in T17/T18.


## T19 checkpoint —2026-10-26

Added `execution.integration.test.ts` against the local `constructor` PostgreSQL with `connection_limit=1` and synthetic owned campaign/user/token/thread. The six named cases verify: concurrent confirmation produces one receipt/update; actual HTTP campaign PATCH competing with MCP preview yields stale rollback; changed character-log dependency makes delete stale; campaign cascade preserves owner-only tombstone receipt; revoked original MCP token blocks review confirmation; and crash after durable-effect delivery but before acknowledgement retries with the same key while domain mutation/receipt remain single. Character create replay asserts one character, one inventory row, zero duplicate character/inventory log rows. SRD spell/unit/artifact totals are captured before and after fixture cleanup and must match.

`assistant-check.ts --check-target` output is exactly `{"database":"constructor","local":true,"bothUrls":true}`. Read-only `prisma migrate status` reports41 migrations and schema up to date including `20261108000000_assistant_intents`; no deploy command or migration write was run. Full `assistant-check.ts --run` result: integration6/6, migration count41→41, owned fixture leftovers `[0,0,0,0,0]`, browser18/18 across1440/390, tsc exit0, ESLint changed files0 errors/0 warnings, unit target guard5/5. Providers/Pusher/runtime effects mocked; no Storage/Redis/provider call.

Browser bundles production `AssistantWorkspace`/`AssistantHandoff` into headless Chrome and checks9 cases at each viewport: content/rules, scenario/battle/slide, hero choices/resources/inventory, battle action/show, ordinary review, destructive detail, stale409, receipt recovery, compendium handoff. Pending review cases assert expected/actual deterministic HTTP200/409 and rendered receipt/stale outcome. The compendium case asserts a safe relative app link and zero mutation/confirm requests. Open is GET-only; MCP review is keyless; no overflow. Synthetic HTTP responses prove the real UI interaction boundary only; transaction/domain authority is proven separately by local PostgreSQL. Existing T18 browser evidence covers owner policy/auto and Stop/recovery affordances.


## T20 — актуальна прив’язка route → service → action → test

Початкова матриця вище лишається інвентарем кожного HTTP method/path; актуальний executable owner наведено тут. `coverage.test.ts` сканує всі `route.ts` під `campaigns`, `templates` і `ai/credentials`, порівнює кожен експортований method/path із `ASSISTANT_ROUTE_COVERAGE` та падає на `unmapped`, `removed` або `duplicate`. Він доводить повноту HTTP inventory, а не сам по собі доменний результат. Для доменних блоків точні рядки method/path/actionId/testId містяться у coverage arrays, указаних нижче; їхні owner-тести перевіряють відповідність реальним HTTP exports, action catalog і результатам.

| Route block / методи | Фактичний service та actionId | Точна method→action→test map | Тести / зафіксований результат |
|---|---|---|---|
| `campaigns/[id]/scenario/**` (GET/POST/PATCH/PUT/DELETE) | `lib/server/scenario/action-service.ts` через `runScenarioOperation`; ids `scenario.mentions`, `.list`, `.get`, `.search`, `.versions`, `.create`, `.meta`, `.save`, `.delete`, `.restore`, `.section.patch`, `.section.delete`, `.section.move`, `.row.delete`, `.row.move`; legacy `scenario.propose-edit` і `scenario.legacy-proposal` | `SCENARIO_ACTIONS` у `lib/server/assistant/actions/scenario.ts`; route inventory `ASSISTANT_ROUTE_COVERAGE` | `scenario-actions.test.ts`, `scenario-pages-api.test.ts`, `scenario-aux-api.test.ts`, `scenario-storage.integration.test.ts`; T19 DB evidence наведено вище |
| `campaigns`, `campaigns/[id]`, templates, campaign instructions/members/onboarding | `lib/server/campaigns/action-service.ts` через `runCampaignOperation`; ids `campaign.status`, `.instructions`, `.members`, `.templates`, `.onboarding`, `.settings`, `.instructions.set`, `.members.remove`, `.create`, `.clone`, `.template.save`, `.template.update`, `.delete` | `CAMPAIGN_ACTIONS` у `lib/server/assistant/actions/campaign.ts`; route inventory `ASSISTANT_ROUTE_COVERAGE` | `campaign-actions.test.ts`, `campaigns-api.test.ts`, `campaign-delete-api.test.ts`, `campaign-templates-api.test.ts`, `ai-settings-api.test.ts`, `campaign-storage.integration.test.ts` |
| Content resources/operations | чинні `lib/server/content` services; canonical resource/operation ids та aliases | `CONTENT_ACTION_COVERAGE` у `actions/content-coverage.ts`: кожний method/path має `actionId` і `testId`; resource methods походять із `CONTENT_RESOURCES`, operations — із `CONTENT_OPERATIONS` | `content-actions.test.ts`, `content-operations.test.ts`, `content-effects.test.ts`, HTTP regressions; `content-coverage.test.ts` звіряє map/catalog/routes |
| Characters і progression | чинні `lib/server/characters` services/handlers; ids `characters.*` | `CHARACTER_ACTION_COVERAGE` у `actions/character-coverage.ts` — 34 методи з конкретними `actionId` та `testId` | `character-coverage.test.ts` і suites із map; T19 local DB 6/6 загалом |
| Battles | `lib/server/battles/action-service.ts` + guarded battle pipeline; ids `battles.*` | `BATTLE_ACTION_COVERAGE` у `actions/battle-coverage.ts` — усі37 методів з `actionId` та `testId`; `battle-coverage.test.ts` звіряє route exports/catalog | `battle-actions.test.ts`, `battle-pipeline.test.ts`, HTTP battle regressions; DB cases у T10/T11/T19 checkpoints |
| Show/decks | чинні show command/deck services; ids `show.*` | `SHOW_ACTION_COVERAGE` у `actions/show-coverage.ts` — 10 методів з `actionId` та `testId` | `show-actions.test.ts`, HTTP `show-api.test.ts`/`decks-api.test.ts`, storage evidence у попередніх checkpoints |
| UI/session-only handoffs, credentials/tokens, compendium/import/upload | наявні native handlers; allowlisted `handoff.*` або read-only `compendium.*`; немає модельної доменної мутації | `HANDOFF_ACTION_COVERAGE` у `actions/handoff-coverage.ts`; context-preview/source-notes — explicit session adapter owners у `ASSISTANT_ROUTE_COVERAGE`, без tool action | `handoffs.test.ts`, `assistant-context-api.test.ts`, `assistant-mcp.test.ts`, T19 synthetic browser handoff case; зовнішні upload/provider не викликались |
| Chat/run, thread, review queue/policy/receipt | `lib/ai/chat/run-chat.ts`, `lib/server/assistant/http.ts`; chat застосовує єдиний executor/catalog. Model tools: `assistant_capabilities`, `assistant_schema`, `assistant_read`, `assistant_action`, `assistant_status`, `assistant_reject`; confirm/reject/policy — session routes | chat/recovery та session review methods — окремі рядки `ASSISTANT_ROUTE_COVERAGE`; tool names/scopes у `lib/ai/tools/assistant.ts` і `assistant-status.ts` | `assistant-mcp.test.ts`, `assistant-intents-api.test.ts`, `assistant-run-api.test.ts`, `assistant.test.ts`, `transport-catalog.test.ts`; T17/T18 browser checkpoints |
| Retention cron (T20 fix) | `GET /api/cron/assistant-cleanup` → `cleanupAssistantData`; поза initial campaign route inventory | protected route у `app/api/cron/assistant-cleanup/route.ts`, schedule у `vercel.json`; не model action | `assistant-cleanup-cron.test.ts` + `cleanup.test.ts`: 2 suites/6 cases PASS; missing/mismatch secret і cleanup error fail closed |

Результати метаданих не означають, що кожен HTTP метод виконується асистентом: read/model actions проходять scopes і actor checks; destructive/session-only/paid flows лишаються human-only або handoff. Foreign nested ids і legacy aliases проходять спільний dispatcher та доменні guards; credential/upload/import routes не є альтернативними writers. Coverage inventory доводить відсутність невласних/дубльованих route methods лише для перевірених campaign/template/credential roots; domain tests підтверджують action/service поведінку, але не є окремим behavior test для кожного наявного HTTP route. Це межа тестового доказу, не знайдений runtime дефект.

## T20 whole-stage independent review — 2026-10-26

Огляд охопив погоджений design spec, T1–T19 briefs/checkpoints, route/action coverage, handoff і локальний progress ledger; implementation commits етапу до `b4c77ae1` та окремий retention-fix diff. Перевірялися server authority, actor/scopes/identity, transaction/receipt/effect/idempotency/recovery, nested campaign refs, disclosure/provider boundaries, UI workflows, schema/migrations і наведені тестові докази.

Підтверджені retention-дефекти: (1) `cleanupAssistantData` мав лише unit caller, без production schedule/route; (2) його intent/receipt allowlists не включали terminal status `stale`, тож такі previews/payloads та completed receipts могли зберігатися безстроково. Мінімальні fixes: захищений Vercel Cron route + daily schedule + fail-closed `CRON_SECRET`; додати `stale` до 7-day intent redaction та 90-day receipt deletion, зберігши `effectsStatus: "complete"`. RED test показав обидва omissions (cleanup suite2/2 failed); GREEN cron+cleanup suites2/6 passed. Fix не змінював DB schema/migrations. `CRON_SECRET` заданий як sensitive Production env для `dnd-tracker`; deployment не робився, тож cleanup набуде чинності лише після наступного production deployment.

Coverage gap, не runtime defect: початковий T20 ledger подекуди посилався лише на планований adapter/task; actual owner modules, canonical action families, test IDs і результати зведено вище. HTTP inventory test доводить відсутність unmapped/duplicate method/path у своїй campaign/template/credential області; спеціалізовані domain tests перевіряють action maps там, де вони заведені. Це не замінює окремо позначених browser/DB/provider меж доказів.

Свіжий final reviewer після fixes підтвердив, що `stale` включено до 7-day intent redaction та 90-day receipt deletion зі збереженим complete-effects guard, а cron exact-Bearer/fail-closed/schedule межі відповідають контракту. Blocking/high-risk findings після fixes не лишилося. Coverage limit: загальний route inventory test охоплює тільки campaign/template/credential roots; доменні action maps/tests доповнюють його, але не доводять окремим behavior test кожен HTTP route. T19 browser HTTP boundary синтетичний; DB integration лише локальний. Review не перевіряв deployment чи фактичний cron invoke.

Retention fix commit: `41fb9760 fix(assistant): schedule retention cleanup`. T20 docs commit буде `docs(assistant): document stage 6 workflows and verification` після актуалізації останнього checkpoint.

Комбінований target command до знахідки `stale`: `pnpm exec vitest run --exclude '**/*.integration.test.ts' lib/server/assistant/__tests__ app/api/__tests__/assistant-cleanup-cron.test.ts app/api/__tests__/assistant-context-api.test.ts app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-mcp.test.ts app/api/__tests__/assistant-run-api.test.ts app/api/__tests__/ai-proposals-api.test.ts app/api/__tests__/ai-settings-api.test.ts app/api/__tests__/ai-threads-api.test.ts app/api/__tests__/scenario-pages-api.test.ts app/api/__tests__/scenario-aux-api.test.ts app/api/__tests__/campaigns-api.test.ts app/api/__tests__/campaign-delete-api.test.ts app/api/__tests__/campaign-templates-api.test.ts app/api/__tests__/battles-api.test.ts app/api/__tests__/show-api.test.ts app/api/__tests__/decks-api.test.ts app/api/__tests__/character-progression-api.test.ts app/api/__tests__/character-level-up-api.test.ts app/api/__tests__/character-notes-api.test.ts app/api/__tests__/content-token-needs.test.ts lib/ai/tools/__tests__` — 56 files/414 tests PASS; excluded DB integration tests. Після зміни terminal allowlists rerun impacted `pnpm exec vitest run app/api/__tests__/assistant-cleanup-cron.test.ts lib/server/assistant/__tests__/cleanup.test.ts` — 2 files/6 tests PASS. `pnpm exec tsc --noEmit` exit0; ESLint по `app/api/cron/assistant-cleanup/route.ts`, `app/api/__tests__/assistant-cleanup-cron.test.ts`, `lib/server/assistant/cleanup.ts`, `lib/server/assistant/__tests__/cleanup.test.ts` exit0; фінальний post-code-change `pnpm build` exit0, Next compile7.6s і static generation38/38; repeated Node `DEP0040 punycode` warnings, no build errors. `git diff --check` exit0. Ніяких assertion/timeout послаблень.

Не запускали production/prodcopy, HOMM gateway, DB writes, paid provider, Storage, Pusher або Redis; applied migrations не редагувалися. Свіжий final review та commit hashes зафіксувати після повторної незалежної перевірки фінального diff.
