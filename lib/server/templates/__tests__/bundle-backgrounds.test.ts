import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, BundleSchema, emptyBundle } from "../bundle";
import { remapIds } from "../remap-ids";

describe("background bundle", () => {
  it("places backgrounds after feats and declares origin dependency", () => {
    const keys = BUNDLE_TABLES.map((t) => t.key);

    expect(keys.indexOf("backgrounds")).toBe(keys.indexOf("feats") + 1);
    expect(BUNDLE_TABLES.find((t) => t.key === "backgrounds")?.fks).toMatchObject({ originFeatId: "feats" });
  });
  it("accepts older bundles and remaps the origin reference", () => {
    const old = { ...emptyBundle() } as Record<string, unknown>;

    delete old.backgrounds;
    expect(BundleSchema.parse(old).backgrounds).toEqual([]);
    expect(remapIds({ originFeatId: "feat-a" }, new Map([["feat-a", "feat-b"]]))).toEqual({ originFeatId: "feat-b" });
  });
});

import { importBundle } from "../import-bundle";
import { createFakeDb } from "./fake-db";

const id = (s: string) => "c" + s.repeat(24);

it("clones backgrounds with local origin and spell references", async () => {
  const { db, store } = createFakeDb();

  const bundle = emptyBundle();

  bundle.feats = [{ id: id("f"), name: "Alert", type: "origin" }];
  bundle.backgrounds = [{ id: id("b"), name: "Sage", originFeatId: id("f"), choices: [] }];

  const { idMap } = await importBundle(db, bundle, "target");

  expect(store.get("background")![0]).toMatchObject({ originFeatId: idMap.get(id("f")), campaignId: "target" });
});
it.each(["missing", "general"])("rejects invalid %s origin references before any writes", async (kind) => {
  const { db, store } = createFakeDb();

  const bundle = emptyBundle();

  bundle.feats = kind === "general" ? [{ id: id("f"), name: "General", type: "general" }] : [];
  bundle.backgrounds = [{ id: id("b"), name: "Sage", originFeatId: id("f"), choices: [] }];
  await expect(importBundle(db, bundle, "target")).rejects.toThrow(/origin|походження/i);
  expect(store.get("background")).toEqual([]);
});
