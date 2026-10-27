import { describe, expect, it } from "vitest";

import { buildBackpackCells, dropAction, slotAccepts } from "../backpack";

import type { SpecialItem, StashArtifact } from "@/types/inventory";

const artifact = (id: string, slot = "ring"): StashArtifact => ({ id, name: id, icon: null, rarity: null, slot, description: null });

const item = (id: string): SpecialItem => ({ id, name: id, quantity: 1, consumable: false });

const kinds = (cells: { kind: string }[]) => cells.map((c) => c.kind);

describe("buildBackpackCells", () => {
  it("порожній view дає мінімум рядів порожніх клітинок", () => {
    const cells = buildBackpackCells({ artifacts: [], items: [] }, { columns: 5, minRows: 3, withAdd: false });

    expect(cells).toHaveLength(15);
    expect(cells.every((c) => c.kind === "empty")).toBe(true);
    expect(cells[3]).toEqual({ kind: "empty", key: "empty-3" });
  });

  it("артефакти, потім предмети, потім порожні", () => {
    const cells = buildBackpackCells({ artifacts: [artifact("a"), artifact("b")], items: [item("i")] }, { columns: 5, minRows: 3, withAdd: false });

    expect(cells).toHaveLength(15);
    expect(kinds(cells).slice(0, 4)).toEqual(["artifact", "artifact", "item", "empty"]);
  });

  it("клітинка add остання", () => {
    const cells = buildBackpackCells({ artifacts: [artifact("a"), artifact("b")], items: [item("i")] }, { columns: 5, minRows: 3, withAdd: true });

    expect(cells).toHaveLength(15);
    expect(cells[14]).toEqual({ kind: "add", key: "add" });
    expect(cells.filter((c) => c.kind === "empty")).toHaveLength(11);
  });

  it("зростає повним рядом, коли вміст не вміщається", () => {
    const artifacts = Array.from({ length: 15 }, (_, i) => artifact(`a${i}`));

    const cells = buildBackpackCells({ artifacts, items: [] }, { columns: 5, minRows: 3, withAdd: true });

    expect(cells).toHaveLength(20);
    expect(cells[14].kind).toBe("artifact");
    expect(cells[19].kind).toBe("add");
  });

  it("без add і без зайвого вмісту довжина точна", () => {
    const items = Array.from({ length: 18 }, (_, i) => item(`i${i}`));

    expect(buildBackpackCells({ artifacts: [], items }, { columns: 6, minRows: 3, withAdd: false })).toHaveLength(18);
  });
});

describe("slotAccepts / dropAction", () => {
  const ring = { from: "backpack", artifactId: "r", slotType: "ring" } as const;

  it("slotAccepts звіряє тип слота", () => {
    expect(slotAccepts({ from: "backpack", artifactId: "x", slotType: "amulet" }, "necklace")).toBe(true);
    expect(slotAccepts({ from: "backpack", artifactId: "x", slotType: "cloak" }, "cape")).toBe(true);
    expect(slotAccepts({ from: "backpack", artifactId: "x", slotType: "amulet" }, "ring1")).toBe(false);
    expect(slotAccepts({ from: "slot", slot: "cape" }, "cape")).toBe(false);
  });

  it("рюкзак на відповідний слот екіпірує", () => {
    expect(dropAction(ring, { kind: "slot", slot: "ring1" })).toEqual({ action: "equip", artifactId: "r" });
  });

  it("невідповідний слот і предмет ігноруються", () => {
    expect(dropAction(ring, { kind: "slot", slot: "helmet" })).toBeNull();

    for (const slot of ["ring1", "helmet", "necklace", "range_weapon", "armor", "shield", "weapon", "boots", "cape"] as const) {
      expect(dropAction({ from: "backpack", artifactId: "p", slotType: "item" }, { kind: "slot", slot })).toBeNull();
    }
  });

  it("слот у рюкзак знімає, інше ігнорується", () => {
    expect(dropAction({ from: "slot", slot: "cape" }, { kind: "backpack" })).toEqual({ action: "stash", slot: "cape" });
    expect(dropAction({ from: "slot", slot: "cape" }, { kind: "slot", slot: "cape" })).toBeNull();
    expect(dropAction(ring, { kind: "backpack" })).toBeNull();
  });
});
