# Scenario summaries (stage 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A DM generates, on request, an LLM summary of a scenario page (overview, key events, hidden layer, entity keys, one-line digest), stored per `(pageId, version)`, DM-only, stale-but-visible.

**Architecture:** Separate table `scenario_page_summaries` + raw-SQL upsert (same pattern as `upsertPageFacts`); pure input builder and digest in `lib/utils/scenario/summary/`; thin `POST …/scenario/[pageId]/summary` and `GET …/scenario/summaries` on `guarded`/`aiGuard`; client `lib/api` → hooks → `ScenarioSummaryPanel`, mounted on the DM page view and the graph inspector (scene nodes).

**Tech Stack:** Next.js 16, Prisma 6, Zod, AI SDK 7 `generateObject`, TanStack Query, next-intl.

**Spec:** `docs/archive/superpowers/specs/2026-10-30-scenario-summaries-design.md`

## Reuse (checked against code)

- Page text: `docToMarkdown` (`lib/utils/scenario/markdown.ts`) already emits `||secret||` and chips as `[@Label](type:id)`; `contentToMarkdown` is NOT reused (it adds row ids and `[sectionId]` noise). `buildSummaryInput` composes `docToMarkdown` per row.
- Allowed entities: `extractPageFacts(content)` (`lib/utils/scenario/index/extract`) already yields `refs {type,id,label,secret}` per section → `allowedKeys` via `entityKey`. `resolveEntities` is not needed (labels come from chips) and stays private.
- `pickDmTextModel` → shared private `pickDmModel(campaignId, tier)` in `lib/ai/dm-model.ts`; add `pickDmSmartTextModel`. `readDmAiAvailability` unchanged; add `readDmSmartAvailability` (same file, shared tier helper) for the GET `available` flag.
- Guard: `guardDraftAi` is for players → not used. Use `guarded` (`lib/ai/guarded.ts`) + `aiGuard` (exported from `app/api/campaigns/[id]/ai/ai-handlers.ts`: 503 without `AI_KEYS_SECRET`, then `requireDM`) for POST; `requireDM` for GET. `loadOwned`, `parseBody`, `checkRateLimit`/`rateLimitResponse`, `aiErrorMessage`, `getRequestLocale`/`languageName` as in `generate-backstory.ts`.
- Error texts: `API_ERRORS.AI_KEY_MISSING` (no key, 400), `AI_RATE_LIMIT`; only one new key `AI_SUMMARY_EMPTY`.
- Upsert pattern: copy `upsertPageFacts` SQL shape (own helper in `summary-store.ts`; not generalized, different columns).
- Client: `scenarioKeys` factory, `campaignGet`/post wrappers in `lib/api/scenario.ts`, `useScenarioIndex` as hook template, `GraphInspector` slot.

## Global Constraints

- Layering: component never imports `@/lib/api/*` or calls `fetch`; hooks import from folder barrels; query keys only via `scenarioKeys`.
- No Cyrillic in code (ESLint); texts in `messages/{uk,en}/*.json`; server returns keys (`API_ERRORS`).
- Minimal comments. No repo-wide `pnpm lint`/`pnpm test:run`: use `pnpm test:related <files>` and `pnpm exec eslint --fix <touched files>`.
- Migration expand-only + `ENABLE ROW LEVEL SECURITY`; apply locally only (`pnpm exec prisma migrate dev --name scenario_page_summaries`). Nothing to prod.
- Provider key never in logs/responses/errors. Log only `error.name`/status like `generate-backstory.ts`.
- Egress: one GET per campaign, `staleTime` 60 s, no polling.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Page with no text at all: no model call, 400 `AI_SUMMARY_EMPTY` (Task 4).
2. Model returns entity keys not on the page / duplicates: filtered to `allowedKeys`, deduped (Task 2).
3. Page deleted during generation: upsert inserts nothing, request still answers, no FK error (Task 1).
4. Page edited during generation: stored under the old `version`, shows as stale; a newer stored row is never overwritten (Task 1, 4).
5. Corrupt/legacy `summary` JSON in DB: treated as "no summary", GET does not 500 (Task 1).
6. Player or other-campaign DM requesting either route: 403/404, never sees summary text (Task 4).
7. Oversized page: truncated by section with `[truncated]` marker, `truncated: true` in response (Task 2).

---

### Task 1: Table, schema, store

**Files:**
- Modify: `prisma/schema.prisma` (model `ScenarioPageSummary` → `scenario_page_summaries`; add `summary ScenarioPageSummary?` relation on `ScenarioPage`); migration via `prisma migrate dev` + append `ALTER TABLE "scenario_page_summaries" ENABLE ROW LEVEL SECURITY;` to the generated SQL before applying (or a follow-up statement in the same migration file)
- Create: `lib/schemas/scenario-summary.ts`, `lib/server/scenario/summary-store.ts`
- Modify: `types/scenario.ts` (types), `lib/constants/ai.ts` (`AI_LIMITS.summaryInputChars: 30_000`, `AI_RATE_LIMITS.summary: { limit: 10, windowSeconds: 600 }`)
- Test: `lib/schemas/__tests__/scenario-summary.test.ts`, `lib/server/scenario/__tests__/summary-store.test.ts` (copy the DB-test style of `index-store` tests; skip if they mock prisma — mirror whatever they do)

**Interfaces — Produces:**
```ts
// lib/schemas/scenario-summary.ts
export const SUMMARY_LIMITS = { overview: 600, events: 8, event: 160, secrets: 5, secret: 200, entities: 20, digest: 300 } as const;
export const pageSummarySchema: z.ZodObject<{ overview; events; secrets; entities; digest }>;
export type PageSummary = z.infer<typeof pageSummarySchema>;
// types/scenario.ts
export interface ScenarioSummaryEntry { summary: PageSummary; version: number; stale: boolean; model: string; createdAt: string }
export interface ScenarioSummaries { available: boolean; summaries: Record<string, ScenarioSummaryEntry> }
export interface GeneratedSummary { summary: PageSummary; version: number; stale: false; truncated: boolean }
// summary-store.ts
export async function upsertSummary(row: { pageId: string; campaignId: string; version: number; summary: PageSummary; provider: string; model: string; inputTokens: number | null; outputTokens: number | null }): Promise<void>;
export async function loadSummaryRow(pageId: string): Promise<{ version: number; summary: PageSummary; model: string; createdAt: Date } | null>; // safeParse, corrupt → null
export async function loadSummaries(campaignId: string): Promise<{ summaries: Record<string, Omit<ScenarioSummaryEntry, "createdAt"> & { createdAt: string }> }>; // joins scenario_pages (id, version) for stale = row.version < page.version; corrupt rows skipped
```
Use `pageSummarySchema` with `.max()` on every string/array so `generateObject` is constrained and DB reads re-validate.

- [ ] **Step 1:** Write schema tests: accepts a valid object; rejects `overview` 601 chars, 9 events, 6 secrets, 21 entities, digest 301; `safeParse` of `{}` fails.
- [ ] **Step 2:** Implement schema, constants, types. Run `pnpm test:run lib/schemas/__tests__/scenario-summary.test.ts`.
- [ ] **Step 3:** Prisma model + migration (+ RLS). Fields: `pageId @id`, `campaignId` (`@@index`), `version Int`, `summary Json`, `provider`, `model`, `inputTokens Int?`, `outputTokens Int?`, `createdAt @default(now())`, `updatedAt @default(now())`, relation `onDelete: Cascade`. Raw SQL `updatedAt` is set explicitly (`now()`), following `scenario_page_index`.
- [ ] **Step 4:** Store tests: upsert inserts; older `version` does not overwrite newer; equal version overwrites (regenerate/force); nonexistent page inserts nothing and does not throw; `loadSummaryRow` returns null for corrupt JSON; `loadSummaries` computes `stale` (summary v1, page v2 → true), scopes by `campaignId`, skips corrupt rows.
- [ ] **Step 5:** Implement store (upsert SQL = `upsertPageFacts` shape with `INSERT … SELECT … FROM scenario_pages WHERE id = ${pageId}` and `ON CONFLICT ("pageId") DO UPDATE … WHERE scenario_page_summaries.version <= EXCLUDED.version`). Run tests + `pnpm exec eslint --fix` on touched files.
- [ ] **Step 6:** Commit `feat(scenario-summaries): table, schema and store`.

### Task 2: Pure input builder, entity filter, digest

**Files:**
- Create: `lib/utils/scenario/summary/input.ts`, `lib/utils/scenario/summary/digest.ts`
- Test: `lib/utils/scenario/summary/__tests__/input.test.ts`, `…/digest.test.ts`

**Interfaces — Consumes:** `docToMarkdown`, `extractPageFacts`, `entityKey`, `PageSummary`, `ScenarioContent`.
**Produces:**
```ts
export interface SummaryInputPage { title: string; kind: string; arc: string | null; content: ScenarioContent }
export function buildSummaryInput(page: SummaryInputPage, maxChars: number): { prompt: string; allowedKeys: Set<string>; truncated: boolean; empty: boolean };
export function filterSummaryEntities(summary: PageSummary, allowed: Set<string>): PageSummary; // drop unknown, dedupe, keep order
export function summariesDigest(items: { title: string; sortOrder: number; digest: string; stale: boolean }[], opts: { maxChars: number }): string;
```
Decisions:
- Prompt layout: header (`Title / kind / arc`), `Allowed entities:` lines `type:id — label`, then per section `## <title>` (+ ` (played)`), per row `Story:` / `DM notes:` markdown (skip `—` empties), with a fixed preface line stating `||text||` is hidden from players. Instruction text (what to produce, language) is NOT in `buildSummaryInput`; the handler prepends it (needs locale).
- `empty` = no non-empty row text in any section.
- Budget: sections appended in order while total ≤ `maxChars`; the first section that overflows is cut to remaining space + `\n[truncated]`, later sections dropped, `truncated: true`. `allowedKeys` = refs from `extractPageFacts` (all sections, regardless of truncation is acceptable but only list those in included sections — implement via facts of included sections).
- `summariesDigest`: sort by `sortOrder`, line `- <title>: <digest>` plus ` (stale)` when stale; stop before exceeding `maxChars` (never cut mid-line); `""` for empty list.

- [ ] **Step 1:** Tests for `buildSummaryInput`: secret text appears wrapped in `||…||` and the preface mentions hidden; chip becomes `[@Name](unit:id)` and `unit:id — Name` is in the allowed list; two chips of the same entity listed once; empty page → `empty: true`; budget 200 on a long page → `truncated: true`, prompt contains `[truncated]`, length ≤ budget + marker, `allowedKeys` excludes entities only in dropped sections.
- [ ] **Step 2:** Tests for `filterSummaryEntities` (unknown dropped, duplicates removed) and `summariesDigest` (ordering by sortOrder, stale marker, budget stops at line boundary, empty).
- [ ] **Step 3:** Implement both. Run `pnpm test:related lib/utils/scenario/summary/input.ts lib/utils/scenario/summary/digest.ts`, eslint.
- [ ] **Step 4:** Commit `feat(scenario-summaries): input builder, entity filter, digest`.

### Task 3: DM smart model picker

**Files:**
- Modify: `lib/ai/dm-model.ts`
- Test: extend the existing `lib/ai/__tests__/dm-model*.test.ts` if present, else create `lib/ai/__tests__/dm-model.test.ts` (mock `loadApiKey`, prisma, `createModel` the way sibling AI tests do)

**Interfaces — Produces:**
```ts
export async function pickDmSmartTextModel(campaignId: string): Promise<{ model: LanguageModel; provider: AiProvider; modelId: string } | null>;
export async function readDmSmartAvailability(campaignId: string): Promise<boolean>;
```
Decision: private `pickDmModel(campaignId, tier)` returns `{ model, provider, modelId } | null`; `pickDmTextModel` becomes `(await pickDmModel(id, "fast"))?.model ?? null` (behavior and existing tests unchanged). Availability helper shares a private `dmKeyedProviders(campaignId)` with `readDmAiAvailability`'s query logic only if that does not change `readDmAiAvailability`'s query count; otherwise duplicate the 3-line check.

- [ ] **Step 1:** Tests: picks the `smart` model id of the first provider with a key; skips a provider whose key throws `AiKeyUnreadableError` and uses the next; no DM / no keys → null; `pickDmTextModel` still picks `fast`; `readDmSmartAvailability` true only when a keyed provider has a smart model.
- [ ] **Step 2:** Implement; run the dm-model tests plus `pnpm test:related lib/ai/dm-model.ts` (covers the existing backstory/player callers); eslint.
- [ ] **Step 3:** Commit `feat(ai): pickDmSmartTextModel`.

### Task 4: Routes and handlers

**Files:**
- Create: `app/api/campaigns/[id]/scenario/[pageId]/summary/route.ts` (`export const maxDuration = 120`; `POST` only), `…/summary/summary-handler.ts`, `app/api/campaigns/[id]/scenario/summaries/route.ts` + `summaries-handler.ts`
- Modify: `lib/constants/api-errors.ts` (`AI_SUMMARY_EMPTY: "errors.aiSummaryEmpty"`), `messages/{uk,en}/errors.json` (key `aiSummaryEmpty`), `lib/schemas/scenario-summary.ts` (`generateSummaryBodySchema = z.object({ force: z.boolean().optional() })`)
- Test: `app/api/campaigns/[id]/scenario/[pageId]/summary/__tests__/summary-handler.test.ts`, `…/scenario/summaries/__tests__/summaries-handler.test.ts` (mock `ai`'s `generateObject`, `dm-model`, auth, prisma like the backstory/ai-handler tests)

**Interfaces — Consumes:** Tasks 1–3 (`upsertSummary`, `loadSummaryRow`, `loadSummaries`, `buildSummaryInput`, `filterSummaryEntities`, `pickDmSmartTextModel`, `readDmSmartAvailability`, `pageSummarySchema`).
**Produces:** `POST` → `200 GeneratedSummary`; `GET` → `200 ScenarioSummaries`.

POST flow (`guarded("generate scenario summary", () => aiGuard(campaignId), run)`):
1. `parseBody(generateSummaryBodySchema, req)` (empty body allowed → treat missing body as `{}`: check how `parseBody` treats empty; if it 400s, read with try and default `{}`).
2. Load page `{ id, campaignId, version, title, kind, arc, content }` via `loadOwned(prisma.scenarioPage.findUnique(...), campaignId)`; `readContent(row.content)`.
3. `loadSummaryRow`; if row exists with `row.version === page.version` and no `force` → return it `{ summary, version, stale: false, truncated: false }` (no limit check, no model call).
4. `checkRateLimit({ userId, scope: "scenario-summary", battleId: campaignId, ...AI_RATE_LIMITS.summary, memoryFallback: true })`.
5. `buildSummaryInput(page, AI_LIMITS.summaryInputChars)`; `empty` → 400 `AI_SUMMARY_EMPTY` before the model.
6. `pickDmSmartTextModel` null → `errorResponse(API_ERRORS.AI_KEY_MISSING, 400)`.
7. `generateObject({ model, schema: pageSummarySchema, prompt: instruction + input.prompt, abortSignal: req.signal })`; instruction (English) says: write in `languageName(locale)`; `overview`/`events` for the DM; `secrets` = the hidden layer; `entities` only keys from the allowed list; `digest` one line usable as context for an assistant. Catch → `console.error("[ai summary]", APICallError.isInstance(e) ? e.statusCode : e instanceof Error ? e.name : "unknown")`, `errorResponse(aiErrorMessage(e), 502)`.
8. `filterSummaryEntities`, `upsertSummary({ version: page.version (read before generation), provider, model: modelId, inputTokens: usage.inputTokens ?? null, outputTokens: usage.outputTokens ?? null })`, respond `{ summary, version: page.version, stale: false, truncated }`.

GET: `requireDM` then `NextResponse.json({ available: await readDmSmartAvailability(campaignId), ...(await loadSummaries(campaignId)) })` with private no-store headers (`PRIVATE_NO_STORE_HEADERS`).

- [ ] **Step 1:** POST tests: player → 403; page of another campaign → 403/404; no `AI_KEYS_SECRET` → 503; no key → 400 `AI_KEY_MISSING`; empty page → 400 `AI_SUMMARY_EMPTY` and `generateObject` not called; success stores row and unknown entity keys are dropped from response; second POST at same version → `generateObject` called once total; `force: true` → called again; provider error → 502 and response JSON/console never contains the key string used in the mock; page version bumped between read and store (mock) → row saved with old version.
- [ ] **Step 2:** GET tests: player → 403; returns `available` flag and `stale` entries; other campaign's rows absent.
- [ ] **Step 3:** Implement handlers/routes/constants/messages. Run `pnpm test:related` on the two handlers and eslint on touched files.
- [ ] **Step 4:** Commit `feat(scenario-summaries): generate and list summary routes`.

### Task 5: Client layer, panel, mounting

**Files:**
- Modify: `lib/api/scenario.ts` (`getScenarioSummaries`, `generateScenarioSummary`), `lib/hooks/scenario/keys.ts` (`summaries: (campaignId) => ["scenario-summaries", campaignId] as const`), `lib/hooks/scenario/index.ts`, `components/scenario/index.ts`, `components/scenario/graph/GraphInspector.tsx` + `ScenarioGraphView.tsx` (slot for scene nodes), `app/campaigns/[id]/dm/scenario/[pageId]/page-client.tsx` (collapsed section under the page header), `messages/{uk,en}/scenario.json` (`summary.*`)
- Create: `lib/hooks/scenario/useScenarioSummaries.ts`, `lib/hooks/scenario/useGenerateScenarioSummary.ts`, `components/scenario/ScenarioSummaryPanel.tsx`
- Test: `lib/hooks/scenario/__tests__/useScenarioSummaries.test.ts`, `components/scenario/__tests__/ScenarioSummaryPanel.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces — Produces:**
```ts
useScenarioSummaries(campaignId: string): UseQueryResult<ScenarioSummaries>; // staleTime 60_000
useGenerateScenarioSummary(campaignId: string): { generate: (pageId: string, force?: boolean) => void; pendingPageId: string | null; error: string | null }; // onSuccess invalidates only scenarioKeys.summaries(campaignId); useMutation grouped-object style like sibling hooks
<ScenarioSummaryPanel campaignId pageId />  // reads cache via useScenarioSummaries; no props about data
```
Panel states: loading skeleton / no summary → «Generate» / summary → overview, events list, secrets list (labelled hidden layer, lock icon), «Refresh» / `stale` badge + «Refresh» / `available === false` → buttons disabled with hint text / generating → spinner and disabled button / error text. Entity keys are not rendered raw in the panel.
Mounting: in the page-client as a collapsed `<details>`-style section (use the existing collapsible primitive in `components/ui` if present); in the graph inspector as a `children` slot rendered by `ScenarioGraphView` only for `node.kind === "scene"`.

- [ ] **Step 1:** Hook test: `useScenarioSummaries` calls the API with the campaign id; after `generate` succeeds only the summaries key is invalidated (spy on `invalidateQueries`).
- [ ] **Step 2:** Panel tests (mock hooks): no summary shows Generate; summary shows overview/events/secrets; stale shows badge; `available:false` disables the button and shows the hint; pending disables the button; error text shown.
- [ ] **Step 3:** Implement api wrappers, keys, hooks, barrel exports (hooks to the folder barrel; `useRecipeValues`-style exceptions N/A), panel, i18n uk/en, mounts. Run `pnpm test:related` on touched files; eslint.
- [ ] **Step 4:** Commit `feat(scenario-summaries): summary panel on page and graph`.

### Task 6: Onboarding, docs, digest export check

**Files:**
- Modify: `lib/onboarding/whats-new.ts` (`{ id: "2026-10-30-scenario-summaries", date: "2026-10-30", audience: "dm", href: "/help/dm-scenario-show" }` at the top), `messages/{uk,en}/whatsNew.json` (`2026-10-30-scenario-summaries.title/body`), `lib/onboarding/hints.ts` (`dm.summaries`, `audience: "dm"`, `helpSlug: "dm-scenario-show"`) + hint texts in the same `messages/*/onboarding.json` section where `dm.graph` lives, help article: new section in `dm-scenario-show` (`lib/onboarding/help/dm.ts` + `messages/*/help.json`, next free `sN`), `docs/architecture/ai.md` (new section «Конспекти сцен (етап 3b)»: table, smart model of the DM, idempotence per version, stale computed, secrets in input, digest ready for 3c), `docs/STATUS.md`
- Test: existing onboarding tests (`lib/onboarding/__tests__`) must keep passing — they check key parity between locales and hint/help references.

- [ ] **Step 1:** Add entries and texts (uk and en), docs sections. Place the hint where the panel is rendered if hints are mounted per component (mirror how `dm.graph` is mounted); otherwise registry-only.
- [ ] **Step 2:** `pnpm test:related lib/onboarding/whats-new.ts lib/onboarding/hints.ts` and the i18n key tests for touched `messages` files; eslint on touched TS files.
- [ ] **Step 3:** Commit `feat(scenario-summaries): whats-new, hint, help and docs`.

## After tasks (controller, not implementer)

1. Announce a token estimate (3–4 HOMM5 pages, smart model, ~30k input chars max each) and wait for the user's go before the live run.
2. Live run: Sonnet subagent on local prodcopy (`localhost:54322`, DB `prodcopy`, user's Gemini key from settings, never logged), scaled screenshots; check: entities match chips, secrets land in `secrets`, second click does not call the model, stale badge after an edit; remove test data afterwards.
3. One final Opus review of the branch diff; fix findings.
4. `/simplify` with 1 agent on the branch diff; update `docs/architecture/ai.md`, `docs/STATUS.md`; report. No push/merge without the user's word. Full lint/test run is deferred to the end of the whole epic.

## Self-review

- Spec coverage: table+RLS (T1), format (T1), input/budget/truncated/secrets (T2), pick smart (T3), POST/GET/idempotence/force/races/errors/tokens (T4), client states/egress/i18n (T5), onboarding/docs (T6), digest stub (T2), live run and review (after tasks).
- Deviations from spec (deliberate): `GET` returns `{ available, summaries }` (needed for the disabled-button state without a second endpoint); entity labels come from chips via `extractPageFacts` instead of `resolveEntities`, so `index-store.ts` is untouched; the cached return (same version, no `force`) happens before the rate limit, not after it as in the spec.
