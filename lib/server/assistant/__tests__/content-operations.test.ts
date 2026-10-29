import { describe, expect, it, vi } from "vitest";

import { executorDatabase } from "./fixtures/executor-db";

import { createContentOperationActions } from "@/lib/server/assistant/actions/content-operations";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", tokenId: null, threadId: "thread", locale: "uk" as const };

function fixture() {
  const { db, state } = executorDatabase();

  let writes = 0;

  let source = [{ scope: "units", key: "u", name: "Юніт", status: "new", before: null, after: { name: "Юніт", raceId: "race" } }, { scope: "races", key: "race", name: "Раса", status: "new", before: null, after: { name: "Раса" } }];

  const actions = createContentOperationActions({
    guard: async (_id, fn) => fn(), snapshot: async () => ({ references: [] }),
    sourcePreview: async () => ({ sourceId: "source", items: source, autoAdded: source.slice(1), credits: { before: null, after: "Attribution" } }),
    invoke: async (id, _actor, input) => {
      if (id === "content.import") { const value = input as { body: { dryRun: boolean } };

 if (!value.body.dryRun) writes++;

 return { dryRun: value.body.dryRun, counts: { created: 1, updated: 0, skipped: 0, error: 1 }, results: [{ row: 1, status: "created", issues: [] }, { row: 2, status: "error", issues: [{ level: "error", message: "Ручне поле" }] }] }; }

      writes++;

 return { ok: true };
    },
  });

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog(actions) });

  return { actions, db, state, executor, writes: () => writes, deleteSource: () => { source = [{ ...source[0], status: "deletedInSource", before: { name: "Було", raceId: "race" } as never, after: null as never }]; } };
}

describe("shared CONTENT_OPERATIONS adapters", () => {
  it("every existing operation has a callable action with its existing schema", () => {
    const { actions } = fixture();

    const catalog = createActionCatalog(actions);

    for (const op of Object.values(CONTENT_OPERATIONS)) expect(catalog.getAction(op.id).need).toEqual(op.need);
    expect(catalog.getAction("spells.delete-by-level").input.safeParse({ body: { level: -1 } }).success).toBe(false);
    expect(catalog.getAction("abilities.get").input.safeParse({ kind: "other", ownerId: "x" }).success).toBe(false);
  });

  it("syncClosureIncludedInPreview: exact dependency patches and credits are visible", async () => {
    const { executor, state } = fixture();

    const result = await executor.dispatchAction(caller, { actionId: "source.apply", requestId: "sync", input: { body: { apply: [{ scope: "units", key: "u", sourceHash: "h", status: "new" }] } } });

    if (result.kind !== "pending") throw new Error("review required");

    const preview = state.intents.get(result.intent.id)?.preview as { changes: unknown[]; targets: unknown[] };

    expect(preview.targets).toEqual(expect.arrayContaining([expect.objectContaining({ id: "race", name: "Раса" })]));
    expect(preview.changes).toEqual(expect.arrayContaining([expect.objectContaining({ path: "credits", before: null, after: "Attribution" }), expect.objectContaining({ after: { name: "Раса" } })]));
  });

  it("syncDeletionInAutoStillHuman", async () => {
    const f = fixture();

 f.deleteSource();
    f.db.aiThread.findFirst = vi.fn(async () => ({ executionMode: "auto" })) as never;
    expect(await f.executor.dispatchAction(caller, { actionId: "source.apply", requestId: "sync", input: { body: { apply: [{ scope: "units", key: "u", sourceHash: null, status: "deletedInSource" }] } } })).toMatchObject({ kind: "pending" });
    expect(f.writes()).toBe(0);
  });

  it("importPartialReportNotAtomicSuccess: preserves row errors and explicit warning", async () => {
    const f = fixture();

    f.db.aiThread.findFirst = vi.fn(async () => ({ executionMode: "auto" })) as never;

    const result = await f.executor.dispatchAction(caller, { actionId: "content.import", requestId: "import", input: { kind: "units", body: { rows: [{ name: "Гоблін" }, {}] } } });

    expect(result).toMatchObject({ kind: "result", result: { data: { counts: { created: 1, error: 1 }, results: [expect.anything(), { row: 2, status: "error", issues: expect.anything() }] }, warnings: ["assistant.warnings.importPartialDone"] } });
    expect(f.writes()).toBe(1);
  });

  it("dryRun remains a read with no intent or content writes", async () => {
    const f = fixture();

    expect(await f.executor.dispatchAction(caller, { actionId: "content.import-preview", requestId: "preview", input: { kind: "units", body: { rows: [{ name: "Гоблін" }] } } })).toMatchObject({ kind: "result", result: { data: { dryRun: true } } });
    expect(f.state.intents.size).toBe(0); expect(f.writes()).toBe(0);
  });

  it("manualFieldsRemainManual: importer preview does not invent additionalSpells or equipment", async () => {
    const f = fixture();

    const pending = await f.executor.dispatchAction(caller, { actionId: "content.import", requestId: "manual", input: { kind: "backgrounds", body: { rows: [{ name: "Тло", additionalSpells: { known: ["wish"] }, equipment: ["gold"] }] } } });

    if (pending.kind !== "pending") throw new Error("review required");

    expect(f.writes()).toBe(0);

    const preview = f.state.intents.get(pending.intent.id)?.preview as { warnings: string[] };

    expect(preview.warnings.join(" ")).toContain("assistant.warnings.manualSetup");
  });
});

it("auxiliary target ownership is checked before any intent is saved", async () => {
  const { db, state } = executorDatabase();

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog(createContentOperationActions({ guard: async (_id, fn) => fn(), snapshot: async () => ({ tables: { skills: [] } }) })) });

  await expect(executor.dispatchAction(caller, { actionId: "skills.duplicate", requestId: "foreign", input: { skillId: "foreign" } })).rejects.toMatchObject({ status: 404 });
  expect(state.intents.size).toBe(0);
});

it("reorder preview shows each existing order and rejects a partial id list", async () => {
  const { db, state } = executorDatabase();

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog(createContentOperationActions({ guard: async (_id, fn) => fn(), snapshot: async () => ({ tables: { tracks: [{ id: "a", title: "A", sortOrder: 0 }, { id: "b", title: "B", sortOrder: 1 }] } }) })) });

  await expect(executor.dispatchAction(caller, { actionId: "tracks.reorder", requestId: "partial", input: { body: { ids: ["a"] } } })).rejects.toMatchObject({ status: 400 });

  const pending = await executor.dispatchAction(caller, { actionId: "tracks.reorder", requestId: "order", input: { body: { ids: ["b", "a"] } } });

  if (pending.kind !== "pending") throw new Error("review required");

  expect(state.intents.get(pending.intent.id)?.preview).toMatchObject({ changes: expect.arrayContaining([expect.objectContaining({ target: { domain: "tracks", id: "b", name: "B" }, path: "sortOrder", before: 1, after: 0 })]) });
});
