import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const tx = {
  characterInventory: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
  artifact: { findFirst: vi.fn(), findMany: vi.fn() },
  campaign: { findUnique: vi.fn() },
};

vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn() }, $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }));
vi.mock("@/lib/server/artifacts/lock", () => ({ lockCampaignArtifacts: vi.fn() }));
vi.mock("@/lib/server/inventory/log", () => ({ writeInventoryLog: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "u", isDM: true, campaign: { rules: {} } })) }));
vi.mock("@/lib/utils/api/load-owned", () => ({ loadOwned: vi.fn(async () => ({ id: "c" })) }));

import { updateInventory } from "../update-inventory";

describe("DM grid swap", () => {
  it("displacing an item already in the stash → 409, nothing written", async () => {
    tx.characterInventory.findUnique.mockResolvedValue({ equipped: { weapon: "dg" }, stash: ["dg", "ls"] });

    const res = await updateInventory(new Request("http://x", { method: "PATCH", body: JSON.stringify({ equipSlot: { slot: "weapon", artifactId: "ls" } }) }), "camp", "c");

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(409);
    expect(tx.characterInventory.upsert).not.toHaveBeenCalled();
  });
});
