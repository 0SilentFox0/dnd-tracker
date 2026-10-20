import { afterEach, describe, expect, it, vi } from "vitest";

import { perTick, prune } from "@/components/battle/fx/runtime/geometry";
import { glowPulse } from "@/components/battle/fx/runtime/motion";

afterEach(() => vi.restoreAllMocks());

describe("perTick", () => {
  it("runs n times on a 60 Hz frame and twice as often on a 30 Hz one", () => {
    const count = (n: number, dt: number) => {
      let c = 0;

      perTick(n, dt, () => c++);

      return c;
    };

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(count(3, 1 / 60)).toBe(3);
    expect(count(3, 1 / 30)).toBe(6);
  });

  it("keeps the average rate at 120 Hz by running the remainder at random", () => {
    let c = 0;

    for (let i = 0; i < 2000; i++) perTick(1, 1 / 120, () => c++);

    expect(c).toBeGreaterThan(850);
    expect(c).toBeLessThan(1150);
  });
});

describe("prune", () => {
  it("drops rejected items in place, keeping order", () => {
    const list = [1, 2, 3, 4, 5];

    const same = list;

    prune(list, (n) => n % 2 === 1);

    expect(list).toBe(same);
    expect(list).toEqual([1, 3, 5]);
  });
});

describe("glowPulse", () => {
  it("peaks once with the glow and returns to none", () => {
    expect(glowPulse("#6fe07a", { brightness: 1.3, peak: 0.25 })).toEqual([{ filter: "none" }, { filter: "brightness(1.3) drop-shadow(0 0 6px #6fe07a)", offset: 0.25 }, { filter: "none" }]);
    expect(glowPulse("#7fe88a", { brightness: 1.25, saturate: 1.2, peak: 0.3, blur: 5 })[1].filter).toBe("brightness(1.25) saturate(1.2) drop-shadow(0 0 5px #7fe88a)");
  });
});
