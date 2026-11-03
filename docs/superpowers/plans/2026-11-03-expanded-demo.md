# Expanded Demo Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors explore every relevant campaign screen in the shared demo, inspect demo characters and NPCs, use the standard battle experience, and see the four requested maps while protecting seeded campaign data from edits.

**Architecture:** Reuse regular DM dashboard definitions and add explicit read-only behavior to demo routes/pages that currently expose mutations. Render battles through the regular client while retaining the server guard against persistent demo battle writes. Store map assets under `public/example-demo/maps` and reference them from the existing demo seed.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma seed script, existing campaign dashboard and battle components.

**Spec:** `docs/superpowers/specs/2026-11-03-expanded-demo-design.md`

## Global Constraints

- The demo remains view-only for campaign content; no edit, create, or delete controls/actions.
- Demo battles render through the standard battle page and preparation UI; persistent demo battle mutations remain rejected.
- The four supplied images are downloaded locally and used by demo world maps and location maps.
- Do not run the demo seed against a remote database.

## Review Focus

- A direct URL to a create/edit route must not allow demo data mutation; resolve by enforcing demo checks on relevant pages and mutation endpoints.
- Demo characters and NPCs must be reachable from dashboard and detail links; resolve by reviewing both index and detail navigation.
- Demo battle reads must still provide the data required by the standard battle client; resolve by following its existing fetch and access path.
- Image hosts may return unusual content or dimensions; resolve by validating downloaded file types and deriving map dimensions from actual assets.
- Campaign visibility rules may hide a library that exists for other campaigns; resolve by making demo visibility explicit and consistent across dashboard and route guards.

---

### Task 1: Expose the full demo campaign dashboard

**Files:**
- Modify: `lib/constants/campaign-dashboard.ts`
- Modify: `components/campaigns/dashboard/DashboardGroups.tsx`
- Review: `app/campaigns/[id]/page.tsx`

- [x] Replace the small `DEMO_DASHBOARD_SECTIONS` subset with the complete applicable screen list derived from existing DM sections, including `characters`, `acquaintances`, `info`, and every library key.
- [x] Ensure grouping for demo uses DM grouping even though demo viewers are not DMs, so libraries and hero screens appear in their expected sections.
- [x] Preserve campaign-specific visibility requirements where needed; explicitly include all demo libraries requested.

### Task 2: Make surfaced demo screens read-only and browseable

**Files:**
- Modify as needed: `app/campaigns/[id]/dm/{units,spells,artifacts,skills,skill-trees,races,classes,backgrounds,feats,characters,show,world}/**`
- Modify as needed: related `components/*` list/detail clients to accept a `canEdit`/read-only prop.
- Review: `app/campaigns/[id]/acquaintances/**`, `app/campaigns/[id]/info/**`, scenario, graph, music, battles.
- Modify: relevant server mutation handlers only where direct demo mutations are currently accepted.

- [x] Audit each surfaced page for add, edit, duplicate, reorder, delete, and bulk mutation affordances; verify the pages already guarded for demo remain viewable.
- [x] Add server-derived demo read-only props to list and detail pages; hide mutation controls while retaining search, filters, and detail navigation where supported.
- [x] Prevent direct create/edit route access from rendering mutation forms for the demo; these routes remain DM-only and redirect to the campaign dashboard.
- [x] Ensure all relevant mutation API/server actions reject demo campaign writes, including requests that bypass the UI.
- [x] Keep NPC acquaintance pages and seeded demo character details viewable without edit actions.

### Task 3: Use the standard battle experience in demo

**Files:**
- Modify: `app/campaigns/[id]/battles/[battleId]/page.tsx`
- Modify: `app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx`
- Review: `components/battle/demo/DemoBattleSandbox.tsx`, battle API read and mutation access logic.

- [x] Remove the `DemoBattleSandbox` branch so demo battles load through `StandardBattlePageClient` and the standard preparation screen.
- [x] Let the standard preparation screen display the seeded encounter roster. Keep persistent demo battle writes disabled to protect the shared seeded encounter.

### Task 4: Replace demo map assets

**Files:**
- Add: `public/example-demo/maps/{world,alderwake,grove,vault}.jpg` (or `.webp` if conversion is needed to preserve supported local formats)
- Modify: `scripts/seed/seed-example-demo.ts`
- Review: `public/example-demo/maps/*.svg`, `lib/constants/storage.ts`

- [x] Download the global map URL to `world` and the three location URLs, in the order supplied, to `alderwake`, `grove`, and `vault`.
- [x] Validate that each downloaded asset is an image and record its actual dimensions.
- [x] Update `MAPS` references and seeded world map dimensions to match the downloaded images; retain marker associations and battle map relationships.
- [x] Confirm local map paths remain accepted by storage validation and can be loaded by campaign map screens.

### Task 5: Review the complete demo experience

**Files:**
- Review all files changed in Tasks 1–4.

- [x] Inspect the dashboard destinations and representative demo list/detail pages to confirm every requested area is viewable and no campaign content mutation affordance remains.
- [x] Inspect the battle route wiring and confirm demo no longer selects the sandbox component.
- [x] Confirm all four image files are valid local assets and all seed paths match them.
- [x] Run TypeScript and ESLint checks on changed code; do not seed a remote database.
