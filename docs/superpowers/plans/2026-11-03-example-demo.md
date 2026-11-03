# Example Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every signed-in account direct access to one read-only, fully populated 5e Demo campaign with battles that reset on each open.

**Architecture:** Mark one campaign with a dedicated `kind=demo` value and expose it from the campaign list without creating membership rows or campaign copies. Allow authenticated read access to its prepared content, keep all content writes DM-only, and render battle interactions from client-only state initialized from the prepared encounter. Seed the stable campaign and its related scenario, NPC, world-map, battle and music records idempotently.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, React client state, existing campaign/scenario/world/battle APIs and UI, existing MCP endpoint (`mcp-handler`).

**Spec:** `docs/superpowers/specs/2026-11-03-example-demo-design.md`

## Global Constraints

- There is one Demo campaign record and one shared set of campaign content records.
- Demo access requires a signed-in account; no per-user campaign or membership creation.
- Campaign content cannot be created, edited, or deleted from Demo.
- Battle HP, turn, effects, and result are client-only and reset when the encounter is opened again.
- MCP must allow only the intended read access and must not expose a write path for Demo.
- The one-shot text is original and map credits/terms are recorded for every external asset.

## Review Focus

- Guest access must not be inferred as DM access; all existing `requireDM` paths must keep denying Demo writes.
- Demo deep links and page reads must work without a `CampaignMember` row, while unrelated campaigns still require membership.
- Reloading/reopening either encounter must use its authored initial state, not prior client state or persisted battle state.
- Labyrinth encounter setup must retain its maze mode and map structure through the read path.
- MCP token scopes must not turn a Demo read into an edit or mutation capability.

---

### Task 1: Add direct Demo discovery and read access

**Files:**
- Modify: `lib/constants/campaigns.ts`
- Modify: `lib/utils/api/api-auth.ts`
- Modify: `lib/server/campaigns/access.ts`
- Modify: `app/campaigns/page.tsx`
- Modify: `app/campaigns/[id]/page.tsx`
- Modify: `components/campaigns/dashboard/DashboardGroups.tsx`
- Modify: `messages/uk/campaigns.json`, `messages/en/campaigns.json`, `messages/uk/dashboard.json`, `messages/en/dashboard.json`

**Interfaces:**
- Add `CampaignKind.DEMO = "demo"`.
- Add a dedicated Demo access result/flag; do not represent a Demo visitor as a database member or DM.
- Continue to return 403 from `requireDM` for Demo.

- [x] Add the Demo campaign card/link to `/campaigns` using `kind=demo` and link directly to `/campaigns/[id]`.
- [x] Let authenticated read-page access resolve Demo without membership, with `isDM=false`; preserve current membership checks for other campaign kinds.
- [x] Hide DM-only and membership-management actions on the Demo dashboard; show the Demo read-only notice and its adventure links.
- [x] Check affected server-page flows for `/scenario`, `/graph`, `/world`, `/music`, and `/battles` and ensure only read pages accept Demo access.

### Task 2: Keep Demo writes closed, including MCP

**Files:**
- Modify: `lib/utils/api/api-auth.ts`
- Modify: write handlers in `lib/server/battles/http.ts`, `lib/server/battles/run-mutation.ts`, and route handlers that use `requireDM`/campaign authorization
- Modify: `app/api/mcp/route.ts`
- Modify: `lib/ai/tools/index.ts` or a focused MCP tool-filter helper

**Interfaces:**
- Add a Demo-aware MCP tool selector that removes all tools with a write scope for Demo while retaining authorized read tools.
- Keep HTTP write guards server-side; hiding UI controls alone is insufficient.

- [x] Trace and classify every campaign content write, scenario edit, world-map edit, music edit, show edit, and battle mutation; confirm they reject Demo without writing.
- [x] Ensure prepared battle reads remain available to Demo but battle mutation routes cannot persist data for it.
- [x] Filter MCP tools for a Demo-bound token by allowed read scopes, even if that token carries broader scopes.
- [x] Preserve normal behavior for non-Demo campaigns and tokens.

### Task 3: Build a client-only battle sandbox

**Files:**
- Create: `components/battle/demo/DemoBattleSandbox.tsx`
- Modify: `lib/hooks/battle/useBattleMapPlayground.ts`
- Modify: `components/battle/map/BattleMap.tsx` only if a read-only presentation prop is needed
- Modify: the battle encounter page/read view to select the Demo sandbox

**Interfaces:**
- `DemoBattleSandbox` receives a prepared encounter snapshot (initial map, participants, and `standard | maze` mode) and keeps all interaction state in React memory.
- Initialize from the prepared snapshot on mount; no fetch mutation, local storage, or server persistence.

- [x] Adapt the existing map playground hook to initialize from an encounter map/participant snapshot while retaining local movement, targeting, turn, and reset interactions.
- [x] Show the encounter's authored battle name and map; support maze-mode controls/markers from the stored maze encounter.
- [x] Reset local participant HP, positions, turn, mode, and log when opening/reopening the encounter.
- [x] Keep the standard battle and labyrinth battle distinct and discoverable from their scenario rows.

### Task 4: Seed the single complete 5e Demo

**Files:**
- Create: `scripts/seed/seed-example-demo.ts`
- Create: `data/example-demo-content.ts`
- Create: `data/example-demo/` adventure text and asset-credit manifest
- Reuse: campaign-related Prisma models; keep all map assets local to avoid cloud storage writes
- Modify: package script in `package.json`

**Interfaces:**
- Seed command accepts an explicit owner user ID and upserts one `kind=demo` campaign; repeated runs update its content rather than create another campaign.
- Content builder defines one root map with exactly three location markers and two zones, plus one child map for each location.

- [x] Write original 5e one-shot material based on the approved adventure hook; include the puzzle, NPCs, scene flow, GM notes, and linked battle rows.
- [x] Add one atmosphere YouTube track and record adventure/map attribution and source links in campaign credits.
- [x] Create original, reusable SVG maps for the global map and each location; record their CC BY 4.0 terms and keep the assets app-local so seeding never writes to cloud storage.
- [x] Seed exactly two prepared encounters: a standard fight and a labyrinth-mode fight, each linked from a scenario row and mapped to the correct location.
- [x] Populate the showcase scene using every currently supported scenario editor option (all row/section controls, rich-text nodes and marks, callouts, mentions, tables/lists, links to music and a battle); ensure the scenario graph and separate GM summary page are populated.
- [x] Verify idempotence by running the seed in a local database twice and confirming it leaves exactly one Demo campaign and one set of related rows.

### Task 5: Check the MCP endpoint and end-to-end Demo behavior

**Files:**
- Review/modify: `app/api/mcp/route.ts`, `lib/ai/tools/index.ts`, and the Demo access helpers from Tasks 1–2
- Use: MCP endpoint `/api/mcp`

- [x] Start the local app with a local database and issue MCP `initialize` and `tools/list` requests with a Demo-bound token.
- [x] Confirm authorized reads can inspect the Demo campaign/scenario and that content-write, scenario-write, battle-write, and assistant mutation tools are absent or rejected.
- [x] Verify the snapshot hook resets local participant HP, positions, turn, mode, and log; the Demo pipeline rejects battle writes before persistence. The session-authenticated browser reopen flow was not available in this local environment.
- [x] Verify the local seed has three location markers, two zones, and three child maps; the scenario graph and GM notes are populated.
- [x] Preserve normal campaign authorization through non-Demo actor and campaign-access regression tests.

