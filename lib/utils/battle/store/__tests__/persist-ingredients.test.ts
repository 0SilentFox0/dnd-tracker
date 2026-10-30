import { describe, expect, it, vi } from "vitest";

import { persistIngredients, spendCp } from "../persist-ingredients";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { IngredientStock } from "@/types/battle";

vi.mock("@/lib/server/artifacts/lock", () => ({ lockCampaignArtifacts: vi.fn() }));

const on = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true } };

const hero = (id: string, stock?: IngredientStock) => {
  const p = makeParticipant({ id });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.CHARACTER, sourceId: id }, battleData: { ...p.battleData, ingredientStock: stock } };
};

const item = (id: string, quantity: number) => ({ id, name: id, quantity });

function makeTx(inventories: Array<{ characterId: string; items: unknown; gold: number; silver: number; copper: number }>) {
  const tx = {
    $executeRaw: vi.fn(),
    campaign: { findUnique: vi.fn().mockResolvedValue({ dmUserId: "dm" }) },
    characterInventory: { findMany: vi.fn().mockResolvedValue(inventories), update: vi.fn() },
    inventoryLog: { createMany: vi.fn() },
  };

  return tx;
}

describe("spendCp", () => {
  it("never goes negative and takes everything when short", () => {
    expect(spendCp({ gold: 0, silver: 5, copper: 20 }, 100)).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it("pays from gold first and breaks change", () => {
    expect(spendCp({ gold: 3, silver: 0, copper: 0 }, 150)).toEqual({ gold: 1, silver: 5, copper: 0 });
    expect(spendCp({ gold: 2, silver: 3, copper: 4 }, 100)).toEqual({ gold: 1, silver: 3, copper: 4 });
  });

  it("zero spend is a no-op", () => {
    expect(spendCp({ gold: 1, silver: 2, copper: 3 }, 0)).toEqual({ gold: 1, silver: 2, copper: 3 });
  });
});

describe("persistIngredients", () => {
  const stock = (used: number, usedCp: number): IngredientStock => ({ items: [{ id: "d", key: "diamond", name: "Diamond", worthGp: 50, qty: 2, used }], purseCp: 1000, usedCp });

  it("decrements items, removes at zero, spends purse and logs", async () => {
    const tx = makeTx([
      { characterId: "a", items: [item("d", 2)], gold: 10, silver: 0, copper: 0 },
      { characterId: "b", items: [item("d", 1)], gold: 100, silver: 0, copper: 0 },
    ]);

    await persistIngredients(tx as never, { campaignId: "c", rules: on }, [hero("a", stock(1, 0)), hero("b", { ...stock(1, 5000), items: [{ ...stock(1, 0).items[0], qty: 1 }] })]);

    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "a" }, data: expect.objectContaining({ items: [expect.objectContaining({ id: "d", quantity: 1 })], gold: 10 }) });
    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "b" }, data: expect.objectContaining({ items: [], gold: 50 }) });

    const logs = tx.inventoryLog.createMany.mock.calls[0][0].data;

    expect(logs.map((l: { kind: string; characterId: string }) => [l.characterId, l.kind])).toEqual([
      ["a", "item_use"],
      ["b", "item_use"],
      ["b", "money_spend"],
    ]);
    expect(logs[0]).toMatchObject({ actorUserId: "dm", delta: { item: "d", qty: -1 } });
    expect(logs[2].delta).toEqual({ gp: -50, sp: 0, cp: 0 });
  });

  it("ignores heroes without usage or stock", async () => {
    const tx = makeTx([]);

    await persistIngredients(tx as never, { campaignId: "c", rules: on }, [hero("a", stock(0, 0)), hero("b")]);

    expect(tx.characterInventory.findMany).not.toHaveBeenCalled();
    expect(tx.characterInventory.update).not.toHaveBeenCalled();
  });

  it("writes nothing when persistResources is off", async () => {
    const tx = makeTx([{ characterId: "a", items: [item("d", 2)], gold: 10, silver: 0, copper: 0 }]);

    await persistIngredients(tx as never, { campaignId: "c", rules: DEFAULT_RULES }, [hero("a", stock(1, 0))]);

    expect(tx.characterInventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryLog.createMany).not.toHaveBeenCalled();
  });
});
