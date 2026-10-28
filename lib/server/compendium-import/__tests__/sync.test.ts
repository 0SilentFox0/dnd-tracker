import { describe, expect, it, vi } from "vitest";

import { syncCompendiumProvenance } from "../sync";

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
});
