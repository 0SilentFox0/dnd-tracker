# Demo Visual Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seven user-started, bilingual visual tours and a completion menu exclusively to the demo campaign.

**Architecture:** Use React Joyride in a client coordinator mounted by the server-guarded demo campaign layout. Store completed tour IDs in existing per-user onboarding flags, expose a compact launcher on the demo dashboard, and put stable target attributes on the relevant campaign screens.

**Tech Stack:** Next.js App Router, React, TypeScript, React Joyride, existing onboarding flags and next-intl messages.

**Spec:** `docs/superpowers/specs/2026-11-03-demo-visual-onboarding-design.md`

## Global Constraints

- The demo remains view-only for campaign content; no edit, create, or delete controls/actions.
- Provide all tour titles, descriptions, and controls in Ukrainian and English using the active app locale.
- All onboarding UI and behavior is exclusive to demo campaigns.
- Mark a tour complete only after its last step; skipped tours remain incomplete and can be replayed.
- Do not add a database table.

## Review Focus

- Non-demo campaign pages must never mount the tour coordinator or show its menu. Review server-side `isDemo` gating in the campaign layout and dashboard.
- A step whose target is absent must not trap or crash a tour. Review conditional pages and target availability at each step.
- Route changes during a tour must preserve the active tour and reach the next target. Review Joyride callback and router coordination.
- Completion must survive reloads and must not be recorded on skip/close. Review the existing onboarding flags cache/API and completion callback.
- Every visible tour string and navigation control must resolve in both locales. Review `messages/en` and `messages/uk` together.

---

### Task 1: Register tour progress and translations

**Files:**
- Modify: `lib/onboarding/flag-keys.ts`
- Modify: `lib/schemas/onboarding.ts`
- Modify: `messages/en/onboarding.json`
- Modify: `messages/uk/onboarding.json`
- Create: `lib/onboarding/demo-tours.ts`

**Interfaces:**
- Produce `DEMO_TOURS`, a typed list of seven tour IDs (`dashboard`, `scenario`, `show`, `world`, `music`, `libraries`, `battle`) with campaign-relative route paths and translation keys.
- Produce `demoTourFlagKey(id: DemoTourId): string`; extend the existing allow-list to accept only those seven `demo-tour:<id>` flags.

- [ ] Add the seven typed tour definitions, each with a start path and localizable step keys.
- [ ] Add English and Ukrainian names, step copy, and Joyride control labels under `onboarding.demoTours`.
- [ ] Extend the flag schema to accept only the seven known demo tour completion keys.
- [ ] Review key types and translations together to ensure all seven flows have both locales.

### Task 2: Add demo-only route-aware tour coordinator

**Files:**
- Modify: `app/campaigns/[id]/layout.tsx`
- Create: `components/onboarding/DemoTourCoordinator.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- `DemoTourCoordinator({ campaignId }: { campaignId: string })` owns the active `DemoTourId`, translates steps, coordinates Next.js route changes, and writes completion flags through the existing onboarding API.
- `useDemoTour(): { startTour(id: DemoTourId): void; activeTour: DemoTourId | null }` is the context hook consumed by the launcher menu.
- Mount only after server-side campaign access confirms `isDemo`.

- [ ] Add React Joyride dependency and mount the coordinator only for demo campaigns in the persistent campaign layout.
- [ ] Implement start, back, next, skip, and close handling; on route-changing steps navigate to the next route and wait for its target before advancing.
- [ ] Persist only successful final-step completion with the `demo-tour:` flag and allow restarting completed tours.
- [ ] Ensure unavailable targets are skipped or ended cleanly without marking a tour complete.

### Task 3: Add the demo tour launcher menu

**Files:**
- Modify: `app/campaigns/[id]/page.tsx`
- Create: `components/onboarding/DemoTourMenu.tsx`

**Interfaces:**
- `DemoTourMenu({ campaignId }: { campaignId: string })` renders the seven tour entries, reads progress from the existing onboarding flags hook, and calls the coordinator start function.

- [ ] Add a compact panel to the demo dashboard only, with a button per tour and a visible completed state.
- [ ] Start the selected flow from its defined path; show an in-progress/loading state while navigation starts.
- [ ] Keep the panel absent from every non-demo dashboard.

### Task 4: Add stable visual targets to the seven flows

**Files:**
- Modify: `components/campaigns/dashboard/DashboardGroups.tsx`
- Modify: relevant scenario, show, world, music, library, and battle page/client components under `app/campaigns/[id]/**`

**Interfaces:**
- Each tour step targets a unique `data-tour="<tour-id>.<step-id>"` element; tour definitions refer to those exact values.

- [ ] Add targets for dashboard navigation/search; scenario index and scenario play controls; slide decks and presentation controls; global map controls; music playback and groups; library browsing/search/detail navigation; and battle controls/status.
- [ ] Ensure targets point to user-facing read-only or interactive controls available in the demo and do not expose write-only controls.
- [ ] Add route transition steps where required to show a complete flow while keeping each of the seven flows independently launchable.

### Task 5: Review implementation against the spec

**Files:**
- Review all files modified in Tasks 1–4.

- [ ] Review server `isDemo` gating for the coordinator and menu, and confirm completion flags are written only at successful tour completion.
- [ ] Manually walk all seven tours in Ukrainian and English, including skip, close, replay, page navigation, and browser reload after completion.
- [ ] Review the changed diff and confirm no non-demo screens, write behavior, or unrelated onboarding flows changed.
