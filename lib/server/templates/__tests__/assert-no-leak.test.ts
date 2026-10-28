import { describe, expect, it } from "vitest";

import { assertNoLeak, findForeignContentIds } from "../assert-no-leak";
import { TemplateLeakError } from "../bundle";
import { createFakeDb } from "./fake-db";

const OLD = "c" + "o".repeat(24);

describe("assertNoLeak", () => {
  it("passes on clean rows", () => {
    expect(() => assertNoLeak([{ id: "cnew", name: "x", abilities: [] }], new Set([OLD]))).not.toThrow();
  });

  it("throws when a json value keeps a source id", () => {
    expect(() => assertNoLeak([{ id: "cnew", spellEffects: [{ unitId: OLD }] }], new Set([OLD]))).toThrow(TemplateLeakError);
  });

  it("throws when a json key is a source id", () => {
    expect(() => assertNoLeak([{ id: "cnew", skills: { [OLD]: 1 } }], new Set([OLD]))).toThrow(TemplateLeakError);
  });
});

describe("findForeignContentIds", () => {
  it("returns existing ids that are not own", async () => {
    const { db, store } = createFakeDb();

    store.get("unit")!.push({ id: OLD, campaignId: "other" });

    expect(await findForeignContentIds(db, new Set([OLD, "plain"]), new Set())).toEqual([OLD]);
    expect(await findForeignContentIds(db, new Set([OLD]), new Set([OLD]))).toEqual([]);
  });
});
