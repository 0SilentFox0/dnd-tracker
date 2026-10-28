import { describe, expect, it } from "vitest";

import { remapCompendiumSection } from "../bundle";

describe("compendium provenance in campaign bundles", () => {
  it("remaps local references but preserves external identity and attribution", () => {
    const section = { formatVersion: 1 as const, sources: [{ sourceJson: "test", metadata: { authors: ["Synthetic Author"] } }], pages: [], entries: [{ canonicalKey: '[1,"feat","test","one","gift",[]]', kind: "feats" as const, localId: "old", edition: "one", sourceJson: "Test", originalName: "Gift", adapterVersion: "5etools-1", inputHash: "hash", baseline: { name: "Gift", choices: [{ spellId: "old-spell" }] }, notes: "Synthetic note", locator: [], issues: [], bindings: {}, attribution: { page: 3 } }] };

    const next = remapCompendiumSection(section, new Map([["old", "new"], ["old-spell", "new-spell"]]));

    expect(next.entries[0].localId).toBe("new");
    expect(next.entries[0].baseline).toMatchObject({ choices: [{ spellId: "new-spell" }] });
    expect(next.entries[0].canonicalKey).toBe(section.entries[0].canonicalKey);
    expect(next.sources[0].metadata).toEqual(section.sources[0].metadata);
    expect(next.entries[0].attribution).toEqual({ page: 3 });
  });

  it("refuses dangling provenance rather than attaching it to foreign content", () => {
    expect(() => remapCompendiumSection({ formatVersion: 1, sources: [], pages: [], entries: [{ canonicalKey: "key", kind: "feats", localId: "foreign", edition: "one", sourceJson: "S", originalName: "N", adapterVersion: "1", inputHash: "hash", baseline: {}, notes: "", locator: [], issues: [], bindings: {}, attribution: {} }] }, new Map())).toThrow(/TARGET/);
  });
});
