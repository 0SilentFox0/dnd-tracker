# Scenario index (stage 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DM-only derived scenario index (scene → entity edges, scene order, participants, linked battles) served by an API and a hook.

**Architecture:** Pure `extractPageFacts` (content → per-section refs) and `buildScenarioIndex` (facts → graph). A lazy cache table `scenario_page_index` keyed by `(pageId, version)` is refreshed on read for stale pages only; nothing writes it from scenario write paths. Route → `lib/api` → hook.

**Tech Stack:** Next.js 16 route handlers, Prisma 6 (+ one raw upsert), Zod, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-scenario-index-design.md`

## Global Constraints

- Migration is expand-only and the new table gets `ENABLE ROW LEVEL SECURITY`; migration folder name is hand-written `20261113000000_scenario_page_index` (existing latest is `20261112000000_fk_indexes`; `migrate dev` would pick an earlier date and break ordering).
- Imports use `@/…` only; barrels per domain (`lib/hooks/scenario/index.ts`); query keys only via `scenarioKeys`.
- Route stays thin (`requireDM`, `handleApiError`); components/app never import `@/lib/api/*`.
- Tests sit in sibling `__tests__/`; tests with a DOM are not needed here. Integration tests are `*.integration.test.ts`, guarded by `isLocalDevDatabaseEnv` (see `lib/server/compendium-import/__tests__/subclass-reimport.integration.test.ts`) and run with `pnpm test:integration <file>`.
- No comments restating code; one compact "why" line at most. Ukrainian only in docs; code identifiers English; no Cyrillic in code (ESLint).
- While working: `pnpm test:related <files>` and `pnpm exec eslint --fix <touched files>`; never repo-wide lint/full suite (controller runs them once before merge).
- Egress: facts are cached per page; `content` is read only for stale pages, in batches of 20.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Chip with unknown `type` or non-string `id` (malformed/AI-written) → skipped, no throw (Task 1 test).
- Corrupt page `content` JSON → `readContent` yields empty content → empty facts, no throw (Task 3 test).
- Same entity secret and non-secret in one section → `secret=false` (Task 1 test).
- Page deleted between the summaries read and the content read → page silently skipped (Task 3 test).
- Older build racing a newer one must not overwrite newer facts (`WHERE version < EXCLUDED.version`; Task 3 test).
- Empty campaign (no pages) → empty index with zero counts (Tasks 2, 3).

## Setup (once, by the controller before Task 1)

In `/Users/silentfox/Work/dnd-tracker-scenario-index`: `pnpm install --frozen-lockfile`; copy `.env.local` from `/Users/silentfox/Work/dnd-tracker/.env.local` (local DB `localhost:54322/prodcopy`; never point at prod). Check `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` before heavy runs.

## File Structure

- Create `lib/utils/scenario/index/extract.ts` — `extractPageFacts`.
- Create `lib/utils/scenario/index/build.ts` — `buildScenarioIndex`.
- Create `lib/schemas/scenario-index.ts` — `pageFactsSchema` (guards cached JSON).
- Modify `types/scenario.ts` — index types (spec section «Дані»).
- Modify `lib/utils/scenario/doc.ts` — export `isSecret`.
- Modify `prisma/schema.prisma` + create migration — `ScenarioPageIndex`.
- Create `lib/server/scenario/index-store.ts` — `loadScenarioIndex`.
- Create `app/api/campaigns/[id]/scenario/index/{route.ts,index-handler.ts}`.
- Modify `lib/api/scenario.ts`, `lib/hooks/scenario/keys.ts`, create `lib/hooks/scenario/useScenarioIndex.ts`, modify `lib/hooks/scenario/index.ts`.
- Docs: `docs/architecture/ai.md` (new short section «Індекс сценарію»), `docs/STATUS.md` row.

---

### Task 1: Types + `extractPageFacts`

**Files:**
- Modify: `types/scenario.ts` (append types), `lib/utils/scenario/doc.ts` (`export const isSecret`)
- Create: `lib/utils/scenario/index/extract.ts`
- Test: `lib/utils/scenario/index/__tests__/extract.test.ts`

**Interfaces:**
- Produces (types, exactly as in the spec): `IndexRef`, `PageFacts`, `IndexEntityNode`, `IndexSceneNode`, `IndexEdge`, `ScenarioIndex`.
- Produces: `extractPageFacts(content: ScenarioContent): PageFacts`.

- [ ] **Step 1: Append the types from the spec section «Дані» to `types/scenario.ts` and export `isSecret` in `doc.ts`.**

- [ ] **Step 2: Write failing tests** (`extract.test.ts`; build docs by hand: `const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content })`, `mention = (type, id, label, marks?) => ({ type: "mention", attrs: { type, id, label }, marks })`, paragraph wrapper `{ type: "paragraph", content: [...] }`). Cases:
  - chip in `story` and in `notes` of different rows → one ref with `count: 2`, label from chip.
  - chip nested in list/table cell/callout → found.
  - secret: chip with `marks: [{ type: "secret" }]` → `secret: true`; chip inside a paragraph whose text node marks do not matter but whose parent node has the secret mark → `secret: true`; same entity once secret and once plain in one section → `secret: false`.
  - row `battleId: "b1"` → ref `{ type: "battle", id: "b1", label: "", count: 1, secret: false }`; row `marker: { mapId, markerId: "m1" }` and section `marker` → `marker` refs (counts add up per section).
  - malformed chips (`attrs.type: "wat"`, `attrs.id: 5`, no attrs) skipped.
  - empty content → `{ sections: [] }`; section without chips → section present with `refs: []`; section `played`/`title` carried.

- [ ] **Step 3: Run** `pnpm test:run lib/utils/scenario/index/__tests__/extract.test.ts` → FAIL.

- [ ] **Step 4: Implement `extract.ts`**

```ts
import { MENTION_TYPES } from "@/lib/constants/scenario";
import { isSecret } from "@/lib/utils/scenario/doc";
import type { IndexRef, MentionType, PageFacts, RichDoc, RichNode, ScenarioContent } from "@/types/scenario";

const isMentionType = (v: unknown): v is MentionType => (MENTION_TYPES as readonly unknown[]).includes(v);

type Acc = Map<string, IndexRef>;

function add(acc: Acc, type: MentionType, id: string, label: string, secret: boolean) {
  const key = `${type}:${id}`;
  const ref = acc.get(key);

  if (ref) {
    ref.count += 1;
    ref.secret = ref.secret && secret;
    if (!ref.label) ref.label = label;
  } else acc.set(key, { type, id, label, count: 1, secret });
}

function walk(node: RichNode, inherited: boolean, acc: Acc) {
  const secret = inherited || isSecret(node);

  if (node.type === "mention") {
    const { type, id, label } = node.attrs ?? {};

    if (isMentionType(type) && typeof id === "string" && id) add(acc, type, id, typeof label === "string" ? label : "", secret);
  }

  node.content?.forEach((child) => walk(child, secret, acc));
}

const walkDoc = (doc: RichDoc, acc: Acc) => doc.content.forEach((n) => walk(n, false, acc));

export function extractPageFacts(content: ScenarioContent): PageFacts {
  return {
    sections: content.sections.map((section) => {
      const acc: Acc = new Map();

      if (section.marker) add(acc, "marker", section.marker.markerId, "", false);

      for (const row of section.rows) {
        walkDoc(row.story, acc);
        walkDoc(row.notes, acc);
        if (row.battleId) add(acc, "battle", row.battleId, "", false);
        if (row.marker) add(acc, "marker", row.marker.markerId, "", false);
      }

      return { id: section.id, title: section.title, played: section.played, refs: [...acc.values()] };
    }),
  };
}
```

- [ ] **Step 5: Run the test → PASS; `pnpm exec eslint --fix` on touched files.**

- [ ] **Step 6: Commit** `feat(scenario-index): page facts extraction`.

---

### Task 2: `buildScenarioIndex` + facts schema

**Files:**
- Create: `lib/utils/scenario/index/build.ts`, `lib/schemas/scenario-index.ts`
- Test: `lib/utils/scenario/index/__tests__/build.test.ts`, `lib/schemas/__tests__/scenario-index.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `ScenarioPageSummary`.
- Produces:
  - `buildScenarioIndex(input: { pages: ScenarioPageSummary[]; facts: Map<string, PageFacts>; resolved: Map<string, { label: string }> }): ScenarioIndex` — `resolved` keys are `${type}:${id}` (exported helper `entityKey(type, id)`).
  - `pageFactsSchema` (zod) matching `PageFacts`; `.safeParse` is how the store validates cached JSON.

- [ ] **Step 1: Failing tests** (`build.test.ts`), cases:
  - empty `pages` → `{ scenes: [], entities: [], edges: [], counts: { scenes: 0, entities: 0, edges: 0, byType: {}, missing: 0 } }`.
  - two scenes with `sortOrder` 2 and 1 → `scenes[0]` is the second; `order` = position; sections copied from facts without `refs`; page without facts → `sections: []`.
  - entity mentioned in two scenes and in two sections of one scene → one entity node `degree: 2`, `sceneIds` both; edge per (scene, entity) with `count` summed, `sectionIds` listing sections, `secret` true only if every section ref secret.
  - ordering: entities by `degree desc`, then `label` (localeCompare), then `id`; same inputs in shuffled order give deep-equal output.
  - `resolved` has the entity → `label` from resolved, `missing: false`; absent → `missing: true`, label falls back to first non-empty chip label else `""`; `counts.missing` and `counts.byType` correct.
  - `schemas` test: valid facts parse; wrong type for `refs[].type` fails.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement.**

```ts
export const entityKey = (type: MentionType, id: string) => `${type}:${id}`;
```
Algorithm: sort pages by `(sortOrder, title)`; for each scene build edges by iterating its facts sections, aggregating by `entityKey` (sum `count`, collect `sectionIds`, `secret = every`); build entity map accumulating `sceneIds` (distinct) and first label; entities sorted as specified; `counts.byType` counts entities per type; `edges` ordered by scene order then entity order of first appearance (deterministic). `pageFactsSchema`: `z.object({ sections: z.array(z.object({ id: z.string(), title: z.string(), played: z.boolean(), refs: z.array(z.object({ type: z.enum(MENTION_TYPES), id: z.string(), label: z.string(), count: z.number().int().positive(), secret: z.boolean() })) })) })` (check `MENTION_TYPES` is a const tuple usable by `z.enum`; the existing `lib/schemas/scenario.ts` shows how it is done there — reuse that enum if it exports one).

- [ ] **Step 4: Tests pass, eslint, commit** `feat(scenario-index): build index graph`.

*(Batch 1 = Tasks 1–2, one Sonnet implementer.)*

---

### Task 3: Table, migration, `loadScenarioIndex`

**Files:**
- Modify: `prisma/schema.prisma` (model + back-relation `pageIndex ScenarioPageIndex?` on `ScenarioPage`)
- Create: `prisma/migrations/20261113000000_scenario_page_index/migration.sql`, `lib/server/scenario/index-store.ts`
- Test: `lib/server/scenario/__tests__/index-store.integration.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2; `listPages`, `readContent` from `page-store.ts`; `ACTIVE_CHARACTER`.
- Produces: `loadScenarioIndex(campaignId: string): Promise<ScenarioIndex>`.

- [ ] **Step 1: Schema.** Model as in the spec but `updatedAt DateTime @default(now())` (no `@updatedAt`: the raw upsert sets it, and Prisma bump is not involved). Migration SQL (hand-written):

```sql
CREATE TABLE "scenario_page_index" (
    "pageId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "facts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_page_index_pkey" PRIMARY KEY ("pageId")
);
CREATE INDEX "scenario_page_index_campaignId_idx" ON "scenario_page_index"("campaignId");
ALTER TABLE "scenario_page_index" ADD CONSTRAINT "scenario_page_index_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "scenario_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scenario_page_index" ENABLE ROW LEVEL SECURITY;
```
Apply locally with `pnpm exec prisma migrate deploy` then `pnpm exec prisma generate`; verify `pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` shows no drift (adjust if the flag set differs in this Prisma version). Check the `updated-at-audit` test still passes (`pnpm test:related prisma/schema.prisma` or run that single test).

- [ ] **Step 2: Failing integration test** (pattern from `subclass-reimport.integration.test.ts`: local-db guard, create user + campaign via `createCampaignFromBundle`, cleanup in `afterAll`). Cases, each with a short scenario page created via `prisma.scenarioPage.create` with `content` containing chips:
  - campaign with no pages → empty index.
  - page without chips → one scene, no entities/edges.
  - chip on a deleted entity (acquaintance created then deleted) → entity `missing: true`.
  - live entity (acquaintance, unit or character) → `missing: false`, label from DB name.
  - first load writes a `scenario_page_index` row at the page's `version`; second load with spies/`prisma.scenarioPage.findMany` counting shows `content` is not re-read (assert by calling `loadScenarioIndex` after manually setting `facts` in the row to a sentinel valid facts object at the current version → the result reflects the sentinel, proving the cache is used); bump `version` (+ change content) → recompute.
  - corrupt cached `facts` (invalid JSON shape) at current version → treated as stale and rebuilt.
  - corrupt page `content` (`{ sections: "nope" }`) → empty facts, no throw.
  - deleting the page removes its index row (cascade).
  - a page of another campaign never appears.
  - guard: with a cached row at version 5, an upsert call with version 3 leaves it unchanged (test through an exported-for-test `upsertFacts`, or by direct raw call of the same SQL — export `upsertPageFacts` from the store).

- [ ] **Step 3: Implement `index-store.ts`.** Shape:

```ts
import "server-only";

const BATCH = 20;

export async function upsertPageFacts(pageId: string, campaignId: string, version: number, facts: PageFacts) {
  await prisma.$executeRaw`INSERT INTO scenario_page_index ("pageId", "campaignId", version, facts, "updatedAt")
    VALUES (${pageId}, ${campaignId}, ${version}, ${JSON.stringify(facts)}::jsonb, now())
    ON CONFLICT ("pageId") DO UPDATE SET version = EXCLUDED.version, facts = EXCLUDED.facts, "updatedAt" = now()
    WHERE scenario_page_index.version < EXCLUDED.version`;
}
```
`loadScenarioIndex`: (1) `pages = await listPages(campaignId)`; (2) cached rows `prisma.scenarioPageIndex.findMany({ where: { campaignId }, select: { pageId, version, facts } })`, keep a row only if `row.version === page.version` and `pageFactsSchema.safeParse(row.facts).success`; (3) stale ids chunked by `BATCH`, `prisma.scenarioPage.findMany({ where: { id: { in: chunk }, campaignId }, select: { id: true, version: true, content: true } })` (use the row's own `version` for the upsert, keep facts in the in-memory map; a page missing from the result is skipped); facts = `extractPageFacts(readContent(row.content))`; (4) `resolveEntities(campaignId, facts)`: collect ids per type from all facts, one `findMany` per non-empty type selecting `{ id, name }` — unit/artifact/spell/acquaintance/battleScene by `{ id: { in }, campaignId }`, character with `...ACTIVE_CHARACTER`, worldMarker with `{ id: { in }, map: { campaignId } }`; return `Map<entityKey, { label: name }>`; (5) `buildScenarioIndex`. Pages whose version in the summaries list is older than the one just read: use the facts as read (build still keyed by page id).

- [ ] **Step 4: Run** `pnpm test:integration lib/server/scenario/__tests__/index-store.integration.test.ts` → PASS (requires local DB up; if it is not, controller starts it, do not point at anything remote). eslint, commit `feat(scenario-index): lazy page index table and loader`.

---

### Task 4: Route, API wrapper, hook, docs

**Files:**
- Create: `app/api/campaigns/[id]/scenario/index/route.ts`, `app/api/campaigns/[id]/scenario/index/index-handler.ts`, `lib/hooks/scenario/useScenarioIndex.ts`
- Modify: `lib/api/scenario.ts`, `lib/hooks/scenario/keys.ts`, `lib/hooks/scenario/index.ts`, `docs/architecture/ai.md`, `docs/STATUS.md`
- Test: handler test next to the closest existing scenario handler test (find with `find app/api/campaigns -path "*scenario*" -name "*.test.ts"` and copy its mocking style); `lib/api` wrapper needs no test beyond what neighbors have.

**Interfaces:**
- Consumes: `loadScenarioIndex`, `ScenarioIndex`.
- Produces: `GET /api/campaigns/[id]/scenario/index` → `ScenarioIndex`; `getScenarioIndex(campaignId)`; `scenarioKeys.index(campaignId)`; `useScenarioIndex(campaignId)`.

- [ ] **Step 1: Failing handler test:** non-DM → the `requireDM` response is returned untouched (403) and `loadScenarioIndex` not called; DM → 200 with the loader result; loader throws → `handleApiError` response.

- [ ] **Step 2: Implement.**
  - `index-handler.ts` follows `search-handler.ts` (`requireDM`, `NextResponse.json(await loadScenarioIndex(campaignId))`, `handleApiError(error, { action: "get scenario index" })`); `route.ts` follows `search/route.ts`.
  - `lib/api/scenario.ts`: `export const getScenarioIndex = (campaignId: string) => campaignGet<ScenarioIndex>(campaignId, "/scenario/index", { cache: "no-store" });`
  - keys: `index: (campaignId: string) => ["scenario-index", campaignId] as const`.
  - hook (mirror `useScenarioPages`): `useQuery<ScenarioIndex>({ queryKey: scenarioKeys.index(campaignId), queryFn: () => getScenarioIndex(campaignId), staleTime: 60_000 })`; export from `lib/hooks/scenario/index.ts` (import the new type from `@/types/scenario`).
  - Docs: `ai.md` section «Індекс сценарію (3a)»: table `scenario_page_index`, лінивий перерахунок за `version`, формат, лише ДМ, межі (чіпи й `battleId`/`marker`; звичайний текст не індексується), 3b/3c/4 споживають цей індекс. `STATUS.md`: рядок про 3a (гілка `feat/scenario-index`, у worktree, не змерджено). No `whats-new` entry (no user-facing screen in 3a).

- [ ] **Step 3: `pnpm test:related` on all touched files + eslint on them; commit** `feat(scenario-index): DM API, hook and docs`.

*(Batch 2 = Tasks 3–4, one Sonnet implementer after batch 1 lands.)*

## Final steps (controller)

One Opus review of the branch diff; `/simplify` (1–2 agents); then, once, `ps` check → `pnpm test:run` and repo-wide `pnpm lint`. Merge/push only with the user's permission.
