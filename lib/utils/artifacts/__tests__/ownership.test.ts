import { describe, expect, it } from "vitest";

import { findHolder, planTransfer, TransferError } from "@/lib/utils/artifacts/ownership";

const inv = (characterId: string, equipped: Record<string, string>, stash: string[] = []) => ({ characterId, equipped, stash });

describe("findHolder", () => {
  it("знаходить героя, що носить артефакт", () => {
    expect(findHolder([inv("a", { helmet: "h1" }), inv("b", { boots: "b1" })], "b1")).toBe("b");
  });

  it("знаходить героя, у якого артефакт у сховку", () => {
    expect(findHolder([inv("a", {}), inv("b", {}, ["s1"])], "s1")).toBe("b");
  });

  it("ігнорує героя-виняток і повертає null, якщо ніхто не тримає", () => {
    expect(findHolder([inv("a", { helmet: "h1" })], "h1", "a")).toBeNull();
    expect(findHolder([inv("a", {})], "x")).toBeNull();
  });
});

describe("planTransfer", () => {
  it("зі слота — відправник втрачає слот, отримувач бере у сховок", () => {
    const plan = planTransfer({ from: inv("a", { helmet: "h1", boots: "b1" }), to: inv("b", {}, ["x"]), source: { slot: "helmet" } });

    expect(plan).toEqual({ ok: true, artifactId: "h1", fromEquipped: { boots: "b1" }, fromStash: [], toStash: ["x", "h1"] });
  });

  it("зі сховку — прибирається зі сховку відправника", () => {
    const plan = planTransfer({ from: inv("a", { boots: "b1" }, ["s1", "s2"]), to: inv("b", {}), source: { artifactId: "s1" } });

    expect(plan).toEqual({ ok: true, artifactId: "s1", fromEquipped: { boots: "b1" }, fromStash: ["s2"], toStash: ["s1"] });
  });

  it("помилки", () => {
    expect(planTransfer({ from: inv("a", {}), to: inv("b", {}), source: { slot: "helmet" } })).toEqual({ ok: false, error: TransferError.EMPTY_SLOT });
    expect(planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("a", {}), source: { slot: "helmet" } })).toEqual({
      ok: false,
      error: TransferError.SAME_CHARACTER,
    });
    expect(planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("b", {}), source: { slot: "tail" } })).toEqual({
      ok: false,
      error: TransferError.UNKNOWN_SLOT,
    });
    expect(planTransfer({ from: inv("a", {}), to: inv("b", {}), source: { artifactId: "zz" } })).toEqual({ ok: false, error: TransferError.NOT_IN_STASH });
  });
});
