import { describe, expect, it } from "vitest";

import { formatCoins, gainCoins, spendCoins, toCopper } from "@/lib/utils/inventory/money";

const p = (gp: number, sp: number, cp: number) => ({ gp, sp, cp });

describe("spendCoins", () => {
  it("pays with the named coin first", () => {
    expect(spendCoins(p(10, 5, 5), 3, "gp")).toEqual(p(7, 5, 5));
  });

  it("uses smaller coins when the named coin runs out", () => {
    expect(spendCoins(p(0, 20, 0), 1, "gp")).toEqual(p(0, 10, 0));
  });

  it("breaks the smallest bigger coin and returns change", () => {
    expect(spendCoins(p(1, 0, 0), 5, "cp")).toEqual(p(0, 9, 5));
    expect(spendCoins(p(1, 1, 0), 5, "cp")).toEqual(p(1, 0, 5));
  });

  it("returns null when total is not enough", () => {
    expect(spendCoins(p(0, 9, 9), 1, "gp")).toBeNull();
  });

  it("never produces negative counts and preserves total", () => {
    const before = p(3, 7, 2);

    const after = spendCoins(before, 46, "cp")!;

    expect(Object.values(after).every((n) => n >= 0)).toBe(true);
    expect(toCopper(after)).toBe(toCopper(before) - 46);
  });
});

describe("gainCoins / formatCoins", () => {
  it("adds without converting", () => {
    expect(gainCoins(p(1, 0, 0), 25, "sp")).toEqual(p(1, 25, 0));
  });

  it("formats signed deltas", () => {
    expect(formatCoins({ gp: -50 })).toBe("−50 зм");
    expect(formatCoins({ gp: 1, cp: 5 })).toBe("+1 зм +5 мм");
  });
});
