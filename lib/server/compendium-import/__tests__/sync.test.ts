import { describe, expect, it, vi } from "vitest";

import { syncCompendiumProvenance } from "../sync";

import { createContentOperationActions } from "@/lib/server/assistant/actions/content-operations";
import { runContentWriteContext } from "@/lib/server/content/write-context";

describe("provenance accompanying native source sync", () => {
  const section = { formatVersion: 1 as const, sources: [], pages: [], entries: [{ canonicalKey: "external-key", kind: "feats" as const, localId: "source-row", edition: "one", sourceJson: "S", originalName: "Gift", adapterVersion: "1", inputHash: "h", baseline: { name: "Gift" }, notes: "Note", locator: [], issues: [], bindings: {}, attribution: {} }] };

  it("uses mapped local ID and preserves canonical identity", async () => {
    const upsert = vi.fn();

    const db = { compendiumEntry: { findUnique: async () => null, upsert }, compendiumSource: { upsert: vi.fn() } };

    await syncCompendiumProvenance(db as never, section, "target", new Map([["source-row", "local-row"]]), new Set(["source-row"]));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ campaignId: "target", localId: "local-row", canonicalKey: "external-key" }) }));
  });

  it("blocks binding the same external identity to another native row", async () => {
    const db = { compendiumEntry: { findUnique: async () => ({ localId: "other-row" }), upsert: vi.fn() }, compendiumSource: { upsert: vi.fn() } };

    await expect(syncCompendiumProvenance(db as never, section, "target", new Map([["source-row", "local-row"]]), new Set(["source-row"]))).rejects.toThrow(/PROVENANCE_CONFLICT/);
    expect(db.compendiumEntry.upsert).not.toHaveBeenCalled();
  });

  it("does not sync ScenarioPage entries, notes or unrelated source metadata", async () => {
    const upsert = vi.fn();

    const sourceUpsert = vi.fn();

    const db = { compendiumEntry: { findUnique: async () => null, upsert }, compendiumSource: { upsert: sourceUpsert } };

    await syncCompendiumProvenance(db as never, { ...section, entries: [{ ...section.entries[0], kind: "scenarioPages", notes: "Synthetic DM-only note" }], pages: [], sources: [{ sourceJson: "S", metadata: {} }] }, "target", new Map([["source-row", "local-row"]]), new Set(["source-row"]));
    expect(upsert).not.toHaveBeenCalled();
    expect(sourceUpsert).not.toHaveBeenCalled();
  });

  it("checks all selected provenance conflicts before the first upsert", async () => {
    const upsert = vi.fn();

    const sourceUpsert = vi.fn();

    const db = { compendiumEntry: { findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ localId: "foreign-local" }), upsert }, compendiumSource: { upsert: sourceUpsert } };

    await expect(syncCompendiumProvenance(db as never, { ...section, entries: [...section.entries, { ...section.entries[0], canonicalKey: "second-key", localId: "second-source" }] }, "target", new Map([["source-row", "local-row"], ["second-source", "second-local"]]), new Set(["source-row", "second-source"]))).rejects.toMatchObject({ code: "PROVENANCE_CONFLICT" });
    expect(upsert).not.toHaveBeenCalled();
    expect(sourceUpsert).not.toHaveBeenCalled();
  });
});

it("assistant source preview preserves FOR SHARE NOWAIT and refuses a busy source before invoke", async () => {
  const busy = Object.assign(new Error("Synthetic source lock conflict"), { code: "P2010", meta: { code: "55P03" } });

  const query = vi.fn(async (_query: TemplateStringsArray, _source: string) => { throw busy; });

  const invoke = vi.fn();

  const db = { campaign: { findUnique: vi.fn(async () => ({ createdFromId: "source" })) }, $queryRaw: query };

  const action = createContentOperationActions({ guard: async (_id, callback) => callback(), snapshot: async () => ({}), invoke }).find(action => action.id === "source.apply");

  if (!action || action.effect !== "write") throw Error("Missing source.apply prepare");

  const prepare = action.prepare;

  const caller = { actor: { campaignId: "target", userId: "dm", isDM: true, via: "session" as const, scopes: null }, channel: "chat" as const, tokenId: null, threadId: "thread" };

  await expect(runContentWriteContext("target", db, () => prepare(caller, { body: { apply: [], ignore: [] } }))).rejects.toBe(busy);
  expect(query).toHaveBeenCalledExactlyOnceWith(expect.any(Array), "source");
  expect(query.mock.calls[0][0].join("?")).toBe("SELECT id FROM campaigns WHERE id = ? FOR SHARE NOWAIT");
  expect(invoke).not.toHaveBeenCalled();
});
