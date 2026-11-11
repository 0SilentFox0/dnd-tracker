import { describe, expect, it } from "vitest";

import { CharacteristicsSchema } from "../characteristics/schema";
import { onSession } from "../session";

const fate = (n: number) => CharacteristicsSchema.parse({ fate: n });

describe("onSession", () => {
  it("restores fortune to fate", () => {
    expect(onSession({ hp: 3, fortune: 0 }, fate(2))).toEqual({ hp: 3, fortune: 2 });
  });

  it("keeps fortune 0 when fate is 0", () => {
    expect(onSession({ hp: 3, fortune: 1 }, fate(0))).toEqual({ hp: 3, fortune: 0 });
  });
});
