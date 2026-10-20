import { describe, expect, it } from "vitest";

import { fitWithin } from "../fit-image";

describe("fitWithin", () => {
  it("зменшує за довшою стороною, менші не збільшує", () => {
    expect(fitWithin({ width: 5120, height: 2880 }, 2560)).toEqual({ width: 2560, height: 1440 });
    expect(fitWithin({ width: 1000, height: 4000 }, 2560)).toEqual({ width: 640, height: 2560 });
    expect(fitWithin({ width: 800, height: 600 }, 2560)).toEqual({ width: 800, height: 600 });
  });
});
