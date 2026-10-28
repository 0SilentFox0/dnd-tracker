import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { executorDatabase } from "./fixtures/executor-db";

import { createContentActions } from "@/lib/server/assistant/actions/content";
import { dispatchContentAlias } from "@/lib/server/assistant/actions/content-aliases";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", tokenId: null, threadId: "thread" };

function fixture() {
  const { db, state } = executorDatabase();

  const rows: Record<string, unknown>[] = [];

  const references: Record<string, unknown>[] = [];

  const resource: AnyContentResource = {
    ...CONTENT_RESOURCES.units,
    schemas: { create: z.object({ name: z.string().min(1) }), update: z.object({ name: z.string().optional() }) },
    invalidates: [],
    find: async (actor, id) => rows.find((r) => r.id === id && r.campaignId === actor.campaignId) ?? null,
    list: async () => { throw new Error("cached lists are not authoritative"); },
    create: async (actor, input) => { const row = { id: `unit-${++state.counter}`, campaignId: actor.campaignId, ...input };

 rows.push(row);

 return row; },
    update: async (_actor, row, patch) => Object.assign(row, patch),
    remove: async (_actor, row) => { rows.splice(rows.indexOf(row), 1); },
    removeAll: async () => { const count = rows.length;

 rows.length = 0;

 return count; },
    toItem: undefined,
  };

  const actions = createContentActions({
    resources: { units: resource },
    guard: async (_campaignId, callback) => callback(),
    snapshot: async () => ({ rows: structuredClone(rows), references: structuredClone(references) }),
  });

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog(actions) });

  return { db, state, rows, references, actions, executor };
}

const request = { actionId: "content.units.create", requestId: "request", input: { data: { name: "Гоблін" } } };

describe("content action review policy", () => {
  it("all12KindsUseExistingResource: existing schemas reject invalid create before intent", async () => {
    const actions = createContentActions({ snapshot: async () => ({}) });

    const catalog = createActionCatalog(actions);

    expect(Object.keys(CONTENT_RESOURCES)).toHaveLength(12);
    for (const kind of Object.keys(CONTENT_RESOURCES)) {
      const action = catalog.getAction(`content.${kind}.create`);

      expect(action.input.safeParse({ data: { name: "" } }).success).toBe(false);
      expect(catalog.getAction(`content.${kind}.get`).effect).toBe("read");
    }
  });

  it("legacyCreateReturnsPending: review writes no content before confirmation", async () => {
    const { executor, rows, state } = fixture();

    expect(await dispatchContentAlias(executor.dispatchAction, caller, "content_create", { kind: "units", data: { name: "Гоблін" } }, "request")).toMatchObject({ kind: "pending", intent: { actionId: "content.units.create" } });
    expect(rows).toEqual([]);
    expect(state.receipts.size).toBe(0);
  });

  it("autoCreatesOnce: retries return receipt with no duplicate row", async () => {
    const { executor, db, rows } = fixture();

    db.aiThread.findFirst = vi.fn(async () => ({ executionMode: "auto" })) as never;

    const first = await executor.dispatchAction(caller, request);

    expect(first).toMatchObject({ kind: "result", result: { data: { name: "Гоблін" }, affected: [{ domain: "units", id: "unit-1", name: "Гоблін" }] } });
    expect(await executor.dispatchAction(caller, request)).toEqual(first);
    expect(rows).toHaveLength(1);
  });

  it("deleteAllRequiresSessionHuman: auto token only prepares; session confirmation deletes", async () => {
    const { executor, db, rows } = fixture();

    rows.push({ id: "u", campaignId: "campaign", name: "Юніт" });
    db.apiToken.findUnique = vi.fn(async () => ({ id: "token", userId: "dm", campaignId: "campaign", scopes: ["content:write"], revokedAt: null, executionMode: "auto" })) as never;

    const tokenCaller: AssistantCaller = { ...caller, actor: { ...caller.actor, via: "token", scopes: ["content:write"] }, channel: "mcp", tokenId: "token", threadId: null };

    const pending = await executor.dispatchAction(tokenCaller, { actionId: "content.units.delete-all", requestId: "delete", input: {} });

    if (pending.kind !== "pending") throw new Error("human review required");

    expect(rows).toHaveLength(1);
    await expect(executor.confirmIntent(tokenCaller.actor, pending.intent.id)).rejects.toMatchObject({ status: 403 });
    expect(await executor.confirmIntent(caller.actor, pending.intent.id)).toMatchObject({ status: "applied" });
    expect(rows).toHaveLength(0);
  });

  it("newReferenceAfterPreviewIsStale: newly added inventory/Choice ref prevents delete", async () => {
    const { executor, rows, references, state } = fixture();

    rows.push({ id: "u", campaignId: "campaign", name: "Юніт" });

    const pending = await executor.dispatchAction(caller, { actionId: "content.units.delete", requestId: "delete", input: { id: "u" } });

    if (pending.kind !== "pending") throw new Error("review required");

    references.push({ id: "inventory", items: ["u"], choices: { selected: ["u"] } });
    await expect(executor.confirmIntent(caller.actor, pending.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(rows).toHaveLength(1);
    expect(state.receipts.size).toBe(0);
  });

  it("foreign id is rejected before creating a proposal", async () => {
    const { executor, rows, state } = fixture();

    rows.push({ id: "foreign", campaignId: "other", name: "Чужий" });
    await expect(executor.dispatchAction(caller, { actionId: "content.units.update", requestId: "bad", input: { id: "foreign", patch: { name: "Зміна" } } })).rejects.toMatchObject({ status: 404 });
    expect(state.intents.size).toBe(0);
  });

  it("preview records the exact validated patch and current before", async () => {
    const { executor, rows, state } = fixture();

    rows.push({ id: "u", campaignId: "campaign", name: "Було" });

    const pending = await executor.dispatchAction(caller, { actionId: "content.units.update", requestId: "patch", input: { id: "u", patch: { name: "Стало", unknown: "ignored" } } });

    if (pending.kind !== "pending") throw new Error("review required");

    expect(state.intents.get(pending.intent.id)?.preview).toMatchObject({ changes: expect.arrayContaining([expect.objectContaining({ path: "name", before: "Було", after: "Стало" })]) });
    await executor.confirmIntent(caller.actor, pending.intent.id);
    expect(rows[0]).toMatchObject({ name: "Стало" });
    expect(rows[0]).not.toHaveProperty("unknown");
  });
});

it("deletion preview shows dependency data rather than only hashing it", async () => {
  const { executor, rows, references, state } = fixture();

  rows.push({ id: "u", campaignId: "campaign", name: "Юніт" });
  references.push({ id: "i", items: ["u"] });

  const pending = await executor.dispatchAction(caller, { actionId: "content.units.delete", requestId: "refs", input: { id: "u" } });

  if (pending.kind !== "pending") throw new Error("review required");

  expect(state.intents.get(pending.intent.id)?.preview).toMatchObject({ changes: expect.arrayContaining([expect.objectContaining({ path: "$dependencies", before: expect.objectContaining({ references: [{ id: "i", items: ["u"] }] }) })]) });
});

it("spell-group deletion exposes the exact SetNull cascade", async () => {
  const group = { id: "group", name: "Школа", campaignId: "campaign" };

  const resource = { ...CONTENT_RESOURCES["spell-groups"], find: async () => group } as AnyContentResource;

  const action = createActionCatalog(createContentActions({ resources: { "spell-groups": resource }, guard: async (_id, fn) => fn(), snapshot: async () => ({ tables: { spellGroups: [group], spells: [{ id: "spell", name: "Магія", groupId: "group" }] } }) })).getAction("content.spell-groups.delete");

  if (action.effect !== "write") throw new Error("write required");

  expect(await action.prepare(caller, { id: "group" })).toMatchObject({ changes: expect.arrayContaining([expect.objectContaining({ target: { domain: "spells", id: "spell", name: "Магія" }, path: "groupId", before: "group", after: null })]) });
});

it("read aliases use the same catalog without creating intents", async () => {
  const { db, state } = executorDatabase();

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog(createContentActions()) });

  const kinds = await dispatchContentAlias(executor.dispatchAction, caller, "content_kinds", {}, "kinds");

  expect(kinds).toMatchObject({ kind: "result", result: { data: { kinds: expect.arrayContaining([expect.objectContaining({ kind: "backgrounds" }), expect.objectContaining({ kind: "tracks" })]) } } });
  expect(await dispatchContentAlias(executor.dispatchAction, caller, "content_schema", { kind: "rules" }, "schema")).toMatchObject({ kind: "result" });
  expect(state.intents.size).toBe(0);
});

it("media alias hands off to the existing campaign editor without an intent", async () => {
  const { db, state } = executorDatabase();

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog(createContentActions()) });

  expect(await dispatchContentAlias(executor.dispatchAction, caller, "content_create", { kind: "artifacts", data: { name: "Меч", icon: "data:image/png;base64,eA==" } }, "media")).toEqual({ kind: "handoff", href: "/campaigns/campaign/dm/artifacts", reason: expect.any(String) });
  expect(state.intents.size).toBe(0);
});

it("a target removed after preview marks the intent stale", async () => {
  const { executor, rows, state } = fixture();

  rows.push({ id: "u", campaignId: "campaign", name: "Юніт" });

  const pending = await executor.dispatchAction(caller, { actionId: "content.units.update", requestId: "gone", input: { id: "u", patch: { name: "Зміна" } } });

  if (pending.kind !== "pending") throw new Error("review required");

  rows.length = 0;
  await expect(executor.confirmIntent(caller.actor, pending.intent.id)).rejects.toMatchObject({ status: 409 });
  expect(state.intents.get(pending.intent.id)?.status).toBe("stale");
  expect(state.receipts.size).toBe(0);
});

it("every Task5 route method resolves to a real content action", async () => {
  const { CONTENT_ACTION_COVERAGE } = await import("@/lib/server/assistant/actions/content-coverage");

  const { ASSISTANT_ROUTE_COVERAGE } = await import("@/lib/server/assistant/__tests__/helpers/coverage");

  const catalog = createActionCatalog(createContentActions());

  for (const entry of ASSISTANT_ROUTE_COVERAGE.filter((row) => row.task === 5)) {
    for (const method of entry.methods) {
      const mapping = CONTENT_ACTION_COVERAGE.find((row) => row.route === entry.route && row.method === method);

      expect(mapping, `${method} ${entry.route}`).toBeDefined();
      expect(catalog.getAction(mapping!.actionId).id).toBe(mapping!.actionId);
      expect(mapping!.testId).toMatch(/content-(actions|operations)/);
    }
  }
});
