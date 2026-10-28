import { describe, expect, it } from "vitest";

import { type Bundle, BUNDLE_TABLES, BundleSchema, emptyBundle } from "../bundle";

import { SYNC_SCOPE_LABELS, SYNC_TABLE_SCOPES } from "@/lib/constants/source-sync";

describe("bundle: feats table", () => {
  it("feats right after classes, sync scope labelled", () => {
    const keys = BUNDLE_TABLES.map((t) => t.key);

    expect(keys.indexOf("feats")).toBe(keys.indexOf("classes") + 1);
    expect(BUNDLE_TABLES.find((t) => t.key === "feats")).toMatchObject({ model: "Feat", delegate: "feat" });
    expect(SYNC_TABLE_SCOPES).toContain("feats");
    expect(SYNC_SCOPE_LABELS.feats).toBe("Риси");
  });

  it("an older bundle without feats still parses", () => {
    const old: Record<string, unknown> = { ...emptyBundle() };

    delete old.feats;

    expect((BundleSchema.parse(old) as Bundle).feats).toEqual([]);
  });
});
