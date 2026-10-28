import { describe, expect, it, vi } from "vitest";

import { writeCharacterLog } from "@/lib/server/characters/log";

describe("writeCharacterLog", () => {
  it("writes all entries in one createMany", async () => {
    const tx = { characterLog: { createMany: vi.fn(async () => ({ count: 2 })) } };

    await writeCharacterLog(tx as never, [
      { campaignId: "c", characterId: "a", actorUserId: "u", kind: "xp", data: { amount: 10 } },
      { campaignId: "c", characterId: "b", actorUserId: null, kind: "battle_result", data: {} },
    ]);

    expect(tx.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "a", kind: "xp", data: { amount: 10 } }), expect.objectContaining({ characterId: "b", actorUserId: null })] });
  });

  it("skips the query for an empty list", async () => {
    const tx = { characterLog: { createMany: vi.fn() } };

    await writeCharacterLog(tx as never, []);

    expect(tx.characterLog.createMany).not.toHaveBeenCalled();
  });
});
