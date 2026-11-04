# Player view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Plan is lean by design: signatures, decisions and test cases; follow neighbouring code for style.

**Goal:** A DM-local, per-window "player view" for battle and show: a pure visualization for a projector. In it there is no control at all (no DM panels, no action/turn/dice buttons, nothing that mutates state); only the mode indicator with exit, map pan/zoom and view-only selection remain. The DM works in another window in the normal mode.

**Architecture:** A per-window flag on `sessionStorage` (`usePlayerView(scope)`). Battle: `deriveScene(..., opts)` gets `playerView` (forces `isDM=false`, ignores `dmControlledId`) and a new `viewer.readOnly` that every interactive branch (hero actions, map click handlers, dialogs, dice) respects. Show: `ShowPageClient` computes `effectiveDM = isDM && !playerView` and `readOnly`. One shared toggle component plus a `P` hotkey listener.

**Tech Stack:** Next.js 16, TypeScript strict, next-intl, Vitest (happy-dom for UI). No server, DB or API changes.

**Spec:** `docs/superpowers/specs/2026-11-04-player-view-design.md`

**Spec amendment (user clarification, committed in `aa4e1c1f0`):** the spec said "DM sees what a player sees, incl. `DiceRoller`" and only talked about hiding DM elements. The user clarified: the mode has NO control whatsoever. Spec items 5-6, Show, Tests and Edge cases were corrected (`DiceRoller` hidden, `readOnly` introduced, "zero controls" tests). This plan follows the corrected spec.

Work in a worktree `../dnd-tracker-playerview` on branch `feat/player-view` from main (superpowers:using-git-worktrees). Tests while working: `pnpm test:related <files>` / `pnpm test:run <file>`; `pnpm exec eslint --fix <touched files>`; full suite and repo lint once at the end (see CLAUDE.md Testing). Executors: Sonnet; final review: Opus.

## Global Constraints

- Client-only: no server/API/DB/Prisma/Pusher changes; no new dependency.
- Components/`app/**` never import `@/lib/api/*` or call `fetch`; logic in hooks (`lib/hooks/<domain>`, import from barrels); pure logic in `lib/utils/...`.
- Cyrillic forbidden in code: texts are keys in `messages/{uk,en}/*.json` (`battle.playerView.*`, `show.playerView.*`); key-parity tests must pass.
- `import/no-cycle` on; `@/` aliases only.
- Comments minimal (one compact line, only for non-obvious why).
- Every task ends with one commit whose message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Mode never mutates anything: no handler reachable in the mode may call a mutation hook (tests mock actions and assert zero calls).

## Review Focus

- **Zero control in the mode (user requirement).** In a DM session with the mode on: no DM panel, no turn/action/dice buttons, no map click-to-act, no token action menu, no `DiceRoller`, no choice dialogs; only indicator, fullscreen/pan/zoom/view-only selection. Tasks 3, 5, 6, 7.
- DM-only text never in DOM (`data-tour` selectors plus `innerHTML` vs message values). Task 7.
- Indicator and `P` always work for the real DM in both states (button reads `battle.isDM`/`isDM`, not `viewer`); never shown to players. Tasks 2, 4, 5, 6.
- Per-window: `storage` events from another window do not change state; `localStorage` is never touched. Task 1.
- First frame: no flash of DM UI before the flag is read. Task 2/5.
- Hotkey `P`: ignored in inputs/contenteditable/dialogs, no modifiers, uses `e.code`; no clash (spec: `KeyP` is free). Task 2.
- Maze mode and demo tours/onboarding targets for `battle.dm-*` behave without the targets. Tasks 6, 8.

---

### Task 1: Session flag storage and `usePlayerView`

**Files:**
- Modify: `lib/hooks/common/storage-value.ts` (parametrise storage), `lib/hooks/common/index.ts` if it barrels
- Create: `lib/hooks/common/usePlayerView.ts` (or `lib/hooks/battle/` + show wrapper; place by where `useFxEnabled` lives: grep first), export from barrel
- Test: `lib/hooks/common/__tests__/storage-value.test.ts` (extend), `…/usePlayerView.test.ts` (`// @vitest-environment happy-dom`)

**Interfaces:**
```ts
export function createSessionFlag(key: string): StorageValue<boolean>   // sessionStorage, no `storage` subscription
export type PlayerViewScope = { kind: "battle"; id: string } | { kind: "show"; id: string }
export function usePlayerView(scope: PlayerViewScope | null): { enabled: boolean; toggle(): void; set(v: boolean): void }
```
Keys: `player-view:<battleId>`, `player-view:show:<campaignId>`; cache one store per key (module `Map`).

Decisions: `createSessionFlag` reuses the `StorageValue` shape and the flag codec of `createStorageFlag`; prefer a `storage: "local" | "session"` option in `createStorageValue` (no `storage` listener for session) over a copy, keep default `local`. `scope === null` (non-DM) → always `false`, no storage access.

- [ ] **Step 1 (verify, then note in the commit body):** open `storage-value.ts` and `useFxEnabled`; confirm the codec/flag helpers and that existing callers stay untouched by the option.
- [ ] **Step 2: Failing tests:** persists in `sessionStorage` not `localStorage`; key per entity (two ids independent, battle vs show key); `storage` event dispatched on window does not change state; storage throwing (getItem/setItem) → `false`, no crash, in-memory toggle still works; `scope: null` → `false`, no storage reads; existing `createStorageValue` tests still pass.
- [ ] **Step 3:** run → FAIL. **Step 4: Implement.** **Step 5:** `pnpm test:related lib/hooks/common/storage-value.ts` → PASS; eslint on touched files.
- [ ] **Step 6: Commit** `feat(player-view): per-window session flag and usePlayerView hook`.

---

### Task 2: Shared toggle button and `P` hotkey

**Files:**
- Create: `components/common/PlayerViewToggle.tsx`, `lib/hooks/common/usePlayerViewKey.ts` (export both from barrels)
- Modify: `messages/{uk,en}/battle.json`, `messages/{uk,en}/show.json` (keys for label/aria/hotkey hint; follow the namespace of neighbouring FX/fullscreen button labels)
- Test: `components/common/__tests__/PlayerViewToggle.test.tsx`, `lib/hooks/common/__tests__/usePlayerViewKey.test.ts` (happy-dom)

**Interfaces:**
```tsx
export function PlayerViewToggle(props: { enabled: boolean; onToggle(): void; labels: { on: string; off: string }; className?: string }): JSX.Element
export function usePlayerViewKey(onToggle: () => void, active: boolean): void   // window keydown, KeyP
```
Decisions: icon button with `aria-pressed`, `title` showing the hotkey; styling follows the FX button in `BattleTopBar` and `FullscreenButton` in the show page. `usePlayerViewKey`: listener on `window`, independent of `useShowKeys`/`control`; skip when `e.repeat`, any modifier, target matches `input, textarea, select, [contenteditable]`, or `document.querySelector('[role="dialog"]')` exists (copy the `TYPING`/`DIALOG` helpers from `lib/hooks/show/useShowKeys.ts`; extract them to a shared util if cheap, else import); use `e.code === "KeyP"`.

- [ ] **Step 1 (verify first, record in commit body):** `rg "KeyP|code === \"KeyP\"" app components lib` to reconfirm no clash with battle/show keys; open `useShowKeys.ts` for the guards.
- [ ] **Step 2: Failing tests:** button reflects `aria-pressed`, click calls `onToggle`; `P` toggles; Ukrainian layout (`code: "KeyP"`, `key: "з"`) toggles; ignored in `input`/`textarea`/`contenteditable`; ignored when a `[role="dialog"]` is in DOM; ignored with ctrl/meta/alt and on `repeat`; `active=false` → no listener.
- [ ] **Step 3:** run → FAIL. **Step 4: Implement** + add i18n keys in both locales. **Step 5:** tests + i18n parity PASS; eslint.
- [ ] **Step 6: Commit** `feat(player-view): toggle button and P hotkey`.

---

### Task 3: Battle engine — `deriveScene` option and `readOnly`

**Files:**
- Modify: `lib/utils/battle/view/derive-scene.ts` (+ the scene/viewer types it returns), `lib/utils/battle/view/derive-turn.ts` if `deriveTurn` needs the flag, `lib/hooks/battle/useBattleSceneValue.ts` (accept `playerView`, pass `dmControlledId = null` when set)
- Test: `lib/utils/battle/view/__tests__/derive-scene*.test.ts` (extend)

**Interfaces:**
```ts
deriveScene(battle, userId, dmControlledId, opts?: { playerView?: boolean })
// viewer: { isDM: boolean; readOnly: boolean; ... }   readOnly === opts.playerView === true
```
Decisions: with `playerView`: `isDM=false`, `dmControlledId` ignored, `readOnly=true`, and `turn.isMyTurn=false`, no `controlled` hero even when `controlledBy === userId` (DM with own hero; spec edge case), `roster.reserve` empty, `canSeeExactStats`/`sanitizeLogEntry` run as for a player. `readOnly` is the single flag later tasks consume.

- [ ] **Step 1 (verify first, record):** read `derive-scene.ts`, `derive-turn.ts`, `visibility.ts`; run `rg "battle\.isDM|\.isDM" components lib/hooks app` and list every client read of `battle.isDM` outside `deriveScene` (spec says none) and every `isMyTurn`/`controlledBy === userId` consumer; write the findings into the Task 5 checklist (below) if anything differs.
- [ ] **Step 2: Failing tests (DM user + `playerView: true`):** `viewer.isDM === false`, `viewer.readOnly === true`; `roster.reserve` empty; `turn.isMyTurn === false` even on a turn of the DM's own hero; `dmControlledId` set → ignored; enemy stats and log are sanitized like for a player (use the existing player fixtures); without the option behaviour is unchanged (existing tests green); `knowledge` absent → no crash, observed traits empty.
- [ ] **Step 3:** run → FAIL. **Step 4: Implement.** **Step 5:** `pnpm test:related lib/utils/battle/view/derive-scene.ts lib/hooks/battle/useBattleSceneValue.ts` → PASS; eslint.
- [ ] **Step 6: Commit** `feat(player-view): deriveScene playerView option and readOnly viewer`.

---

### Task 4: Battle wiring — toggle in `BattleTopBar`, first frame

**Files:**
- Modify: `components/battle/scene/BattleSceneProvider.tsx` (read `usePlayerView({kind:"battle", id})` only when `battle.isDM`, pass to `useBattleSceneValue`, expose `playerView: { enabled; toggle }` and `realIsDM` in the scene value or a small context), `components/battle/scene/BattleTopBar.tsx` (render `PlayerViewToggle` when `realIsDM`, in both states; mobile layout: next to the FX button, check no overlap at 360px), `components/battle/scene/BattleScreen.tsx` (`usePlayerViewKey`)
- Test: `components/battle/scene/__tests__/screen*.test.tsx` (extend with the toggle), happy-dom

Decisions: the toggle reads the real role from `battle.isDM` (not `viewer`). First frame: until `useHydrated()` is true and the flag is read, DM-only UI must not flash; the DM sees the normal view on the server HTML (server cannot know the flag), so for a DM render the battle chrome after hydration only if the flag is on (i.e. while `!hydrated && battle.isDM` render the same shell as player view or a neutral skeleton): decide by checking what the page already does for hydration (`rg useHydrated components/battle`); record the decision in the commit body.

- [ ] **Step 1: Failing tests:** DM sees the toggle in both states, `aria-pressed` follows; player session never renders it; pressing `P` flips the mode; after toggling on, `viewer.isDM`-gated nodes (`DmPanel` data-tour) disappear and the toggle is still there; flag in `sessionStorage` survives a re-mount.
- [ ] **Step 2:** run → FAIL. **Step 3: Implement.** **Step 4:** tests + `pnpm test:related` on touched files PASS; eslint.
- [ ] **Step 5: Commit** `feat(player-view): battle toggle and forced player scene`.

---

### Task 5: Battle — zero controls under `readOnly`

**Files:** determined by the audit (Step 1). Expected: `components/battle/**` hero action panels/dock, token menus, `lib/hooks/battle/*` (`useMapPlacing`, `useAbilityMapAim`, `useSpellMapTargeting`, `useMapTerrainTool`, `useMapWeatherTool`, `useMazeTools`, `useBattleMapScene` click handlers), dialogs (`CritChoiceDialog`, `DmRevivePrompt`, `useAwaitingDmDialog`, `useDownedHeroPrompt`, `AwaitingDmBanner`, `CritChoiceWaitingBanner`), `BattlePreparationView`, `BattleResultScreen`, `DiceRoller`-like battle dice, reaction/morale prompts.
- Test: one DOM test `components/battle/scene/__tests__/screen-player-view.test.tsx` plus unit tests next to each changed hook.

- [ ] **Step 1 (audit first, write the result as a table in the commit body):** list every interactive element/handler reachable in a battle scene for a player: buttons (`rg "<button|onClick|onPointer" components/battle`), map click/hover-to-act hooks, dialogs that open by event, keyboard handlers (`Escape` hooks are harmless). Classify each: *view-only* (keep: map pan/zoom, selecting a token/participant to inspect, tooltips, log scroll, fullscreen) or *mutating/acting* (remove or no-op under `viewer.readOnly`). Verify the previously unchecked spec items here: hidden participants (`invisible`/`hidden`) in client data; `BattlePreparationView` (start button) and result-screen exit; Radix dialogs with `open={false}` leaving no DM text (`CritChoiceDialog`); maze mode (`useMazeView`/`useMazeTools`: "as hero" view and DM tools via `viewer.isDM`).
- [ ] **Step 2: Failing tests (DM session, mode on, actions mocked):** no hero action panel / end-turn / attack / spell / dice buttons; clicking tokens and map cells calls no action (spy count 0) but selection for viewing works; placement/aim/terrain/weather tools are inactive; no choice/revive/awaiting dialogs open even when their trigger state is true (e.g. awaiting-DM, downed hero); `BattlePreparationView` has no start button; result screen has no exit/action button except the indicator; the only `button`s in the scene belong to an allow-list (indicator, fullscreen, FX, map zoom/pan, inspect selection) asserted by `data-` attribute or role names.
- [ ] **Step 3:** run → FAIL. **Step 4: Implement** the minimal guards: prefer gating at the source (`readOnly` into the hook that owns the handler, or not rendering the control) over scattered checks; handlers become no-ops. **Step 5:** `pnpm test:related` on all touched files PASS; eslint on touched files.
- [ ] **Step 6: Commit** `feat(player-view): battle scene is view-only under readOnly`.

---

### Task 6: Show page — effective role, `readOnly`, toggle

**Files:**
- Modify: `app/campaigns/[id]/show/page-client.tsx`, `components/show/*` as the audit dictates (`ShowStage`, `ShowWorldStage`, `ShowBattleCall`, `ShowDeckStrip`, `PuzzleStage`), `lib/hooks/show/useShowKeys.ts` only if needed (it already gets `null`)
- Test: `app/campaigns/[id]/show/__tests__/page-client*.test.tsx` (find the nearest; create if absent), happy-dom

Decisions: `const playerView = usePlayerView(isDM ? {kind:"show", id: campaignId} : null)`; `effectiveDM = isDM && !playerView.enabled`; `readOnly = isDM && playerView.enabled`. All props/hooks (`useShowKeys`, `useShowAudioHost`, `ShowStage isDM`, `ShowControlPanel`) read `effectiveDM`; `DiceRoller` renders only when `!isDM` (unchanged: never for a real DM, so it is absent in the mode, per the corrected spec); `readOnly` is passed to stage components that have interaction (puzzle answers etc.). Toggle + `usePlayerViewKey` next to `FullscreenButton`, only when `isDM`, active in both states. Audio: DM audio host must be off in the mode (or the playback source of the DM window would duplicate; confirm with `useShowAudioHost` semantics: in the mode the window behaves like a player listener).

- [ ] **Step 1 (verify first, record):** read `ShowBattleCall`, `ShowStage`, `ShowWorldStage`, `ShowDeckStrip`, `PuzzleStage` (spec: only reviewed via report); list `isDM`/interactive branches (buttons, click handlers, `KeyQ/KeyE` puzzle keys); check hidden slides/notes are not in `ShowState` client data; confirm `ScenarioShowDock` is not rendered on `/show` and needs no change; check `useShowAudioHost` behaviour for `isDM=false` vs the DM window.
- [ ] **Step 2: Failing tests (`isDM=true`):** mode off → `ShowControlPanel` present, no `DiceRoller`; mode on → no `ShowControlPanel`, no DM hints, no `DiceRoller`, no DM audio controls (`music.transport`/`music.playlist` absent), no puzzle/answer controls, buttons limited to the allow-list (indicator, fullscreen, view navigation); `P` toggles; toggle present in both states; non-DM never sees it; keys `ArrowLeft/Right/B/N` do nothing in the mode (control `null`); mocked show mutations never called.
- [ ] **Step 3:** run → FAIL. **Step 4: Implement.** **Step 5:** `pnpm test:related` PASS; eslint.
- [ ] **Step 6: Commit** `feat(player-view): show page player view`.

---

### Task 7: "No DM text, no controls" guarantee tests and guard

**Files:**
- Create: `components/battle/scene/__tests__/player-view-guarantee.test.tsx`, `app/campaigns/[id]/show/__tests__/player-view-guarantee.test.tsx`, `lib/utils/battle/view/__tests__/no-direct-isdm.test.ts` (guard)
- Test helper: `lib/test-utils/...` only if the existing screen test setup can't be reused

- [ ] **Step 1: Failing tests (battle, DM session, mode on):** (a) `querySelectorAll('[data-tour^="battle.dm"], [data-tour="battle.reset"], [data-tour="battle.next-turn"], [data-tour="battle.start"], [data-tour="music.transport"], [data-tour="music.playlist"]')` empty; (b) `innerHTML` contains no value from `messages/uk/battleDm.json` and the DM keys of `show.json` (list built from the JSON at test time; skip empty/very short values and shared words by an explicit allow-list kept in the test); (c) no DM `aria-label`; (d) interaction allow-list: all `button`s match the allow-list (shared with Task 5). Same for the show page (DM keys of `show.json`).
- [ ] **Step 2: Guard test** (decision for the spec's "open for plan": grep-test, not ESLint, because it is cheap and the allowed set is tiny): scans `components`, `lib/hooks`, `app` (excluding `__tests__` and `lib/server`, `lib/utils/api`) for `battle.isDM`/`\.isDM` reads of a raw battle object, fails with file:line unless in an allow-list (`derive-scene.ts`, the `BattleSceneProvider`/`BattleTopBar` real-role reads from Task 4). Failure message tells to use `viewer.isDM`/`viewer.readOnly`.
- [ ] **Step 3:** run → FAIL/PASS as appropriate; fix gaps found (feed back into Tasks 5-6 files). **Step 4:** tests PASS; eslint.
- [ ] **Step 5: Commit** `test(player-view): no DM text and no controls guarantee, isDM read guard`.

---

### Task 8: Tours, onboarding, i18n, docs, final checks

**Files:**
- Modify: `lib/onboarding/*` / demo tours that target `battle.dm-*`, `battle.reset`, `battle.next-turn`, `battle.start`, `music.*` (check behaviour when the mode hides them), `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json` (entry `playerView`), hint for the toggle (`OnboardingHint`, DM only; skip in the mode), `docs/architecture/battle.md` ("Player UI logic"), `docs/architecture/show.md`, `docs/STATUS.md`
- Test: onboarding/tour tests, i18n parity

- [ ] **Step 1 (verify first, record):** `rg "battle\.dm-|battle\.reset|battle\.next-turn|battle\.start|music\.(transport|playlist)" lib/onboarding lib/demo* app components`; check how the tour engine behaves when a target is missing (skip/timeout) and whether a tour can start in the mode (tour starts from the DM UI; ensure the mode does not break it: e.g. turning the mode off when a tour starts, or tour waits). Check mobile placement of the toggle at 360px for battle and show (verify by reading layout classes; browser check is optional and goes to a Sonnet subagent if the user asks).
- [ ] **Step 2: Failing tests** for any tour/hint behaviour changed (hint hidden in the mode; tour not stuck on a missing target).
- [ ] **Step 3: Implement**; add whats-new entry + keys in both locales (mention that "enemy observed traits may be incomplete because the DM has no `knowledge`", spec edge case); update the docs, including the client-only/not-a-security-boundary note (`pendingSummons`, `damageBreakdown` are in the network payload).
- [ ] **Step 4:** `pnpm test:related` on touched files PASS; once: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`, then full `pnpm test:run` and repo `pnpm lint`; `/simplify` on the branch diff; final Opus review.
- [ ] **Step 5: Commit** `docs(player-view): architecture, whats-new, tours`; merge to main per the repo flow (`git mv` spec and plan to `docs/archive/superpowers/` in the merge commit; no push without the user).

## Self-Review notes

- Spec coverage: per-window flag (T1), button + `P` (T2), `deriveScene` forcing and hero-owner edge case (T3), battle toggle and first frame (T4), no-controls requirement (T5, T6, T7), show (T6), guard and DOM guarantee (T7), tours/i18n/docs (T8).
- User clarification covered in the plan: mode = pure visualization; `readOnly` (T3) consumed by T5/T6; `DiceRoller` hidden (T6); spec amended in `aa4e1c1f0`.
- Spec "unverified" items are explicit first steps: hidden participants/slides, show stage components, tours/DM targets, closed Radix dialogs, mobile toggle placement, maze mode (T5 Step 1, T6 Step 1, T8 Step 1); `isMyTurn` consumers (T3 Step 1).
- Spec "open for plan" resolved: first frame (T4 decision), session flag via a `storage` option on `createStorageValue` (T1), grep-test guard (T7), tours (T8).
- Names: `usePlayerView`, `createSessionFlag`, `PlayerViewToggle`, `usePlayerViewKey`, `viewer.readOnly`, `effectiveDM`.
