import { describe, expect, it, vi } from "vitest";

import { lockCharacters } from "@/lib/server/characters/lock";

describe("lockCharacters", () => {
  it("returns parsed resources and experience per id", async () => {
    const tx = { $queryRaw: vi.fn(async () => [{ id: "a", resources: { hp: 3, junk: 1 }, experience: 40 }]) };

    const map = await lockCharacters(tx as never, ["a"]);

    expect(map.get("a")).toEqual({ id: "a", resources: { hp: 3 }, experience: 40 });
  });

  it("no ids → no query", async () => {
    const tx = { $queryRaw: vi.fn() };

    expect((await lockCharacters(tx as never, [])).size).toBe(0);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
