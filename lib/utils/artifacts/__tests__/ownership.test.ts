import { describe, expect, it } from "vitest";

import { findHolder, planTransfer, TransferError } from "@/lib/utils/artifacts/ownership";

const inv = (characterId: string, equipped: Record<string, string>) => ({ characterId, equipped });

describe("findHolder", () => {
  it("знаходить героя, що носить артефакт", () => {
    expect(findHolder([inv("a", { helmet: "h1" }), inv("b", { boots: "b1" })], "b1")).toBe("b");
  });

  it("ігнорує героя-виняток і повертає null, якщо ніхто не носить", () => {
    expect(findHolder([inv("a", { helmet: "h1" })], "h1", "a")).toBeNull();
    expect(findHolder([inv("a", {})], "x")).toBeNull();
  });
});

describe("planTransfer", () => {
  it("вільний слот — артефакт переходить, у відправника слот порожній", () => {
    const plan = planTransfer({ from: inv("a", { helmet: "h1", boots: "b1" }), to: inv("b", {}), slot: "helmet" });

    expect(plan).toEqual({ ok: true, artifactId: "h1", swappedArtifactId: null, fromEquipped: { boots: "b1" }, toEquipped: { helmet: "h1" } });
  });

  it("зайнятий слот — обмін", () => {
    const plan = planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("b", { helmet: "h2", cape: "c1" }), slot: "helmet" });

    expect(plan).toEqual({ ok: true, artifactId: "h1", swappedArtifactId: "h2", fromEquipped: { helmet: "h2" }, toEquipped: { helmet: "h1", cape: "c1" } });
  });

  it("порожній слот, сам собі, невідомий слот — помилки", () => {
    expect(planTransfer({ from: inv("a", {}), to: inv("b", {}), slot: "helmet" })).toEqual({ ok: false, error: TransferError.EMPTY_SLOT });
    expect(planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("a", {}), slot: "helmet" })).toEqual({ ok: false, error: TransferError.SAME_CHARACTER });
    expect(planTransfer({ from: inv("a", { helmet: "h1" }), to: inv("b", {}), slot: "tail" })).toEqual({ ok: false, error: TransferError.UNKNOWN_SLOT });
  });
});
