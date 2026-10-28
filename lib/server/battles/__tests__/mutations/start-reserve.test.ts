import { describe, expect, it } from "vitest";

import { participant } from "./fixtures";

import { isReservedSlot, partitionReserve } from "@/lib/server/battles/mutations/start/start-reserve";

describe("start reserve", () => {
  it("резерв — останні reserved екземплярів запису", () => {
    const entry = { quantity: 5, reserved: 2 };

    expect([0, 1, 2, 3, 4].map((i) => isReservedSlot(entry, i))).toEqual([false, false, false, true, true]);
  });

  it("герой із reserved 1 — у резерві; reserved більше за quantity обрізається", () => {
    expect(isReservedSlot({ reserved: 1 }, 0)).toBe(true);
    expect(isReservedSlot({}, 0)).toBe(false);
    expect(isReservedSlot({ quantity: 2, reserved: 9 }, 0)).toBe(true);
  });

  it("partitionReserve позначає резерв і зберігає множники балансу", () => {
    const scaled = participant("w2", {}, { battleData: { ...participant("x").battleData, hpMultiplier: 1.4 } });

    const { field, reserve } = partitionReserve([{ reserved: false }, { reserved: true }], [participant("w1"), scaled]);

    expect(field.map((p) => p.basicInfo.id)).toEqual(["w1"]);
    expect(reserve[0].battleData).toMatchObject({ reserved: true, hpMultiplier: 1.4 });
  });
});
