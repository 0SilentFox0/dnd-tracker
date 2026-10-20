import { describe, expect, it } from "vitest";

import { pickJoinBattle } from "@/lib/utils/campaigns/join-battle";

const a = { id: "b1", campaignId: "c1" };

const b = { id: "b2", campaignId: "c2" };

describe("pickJoinBattle", () => {
  it("немає активних боїв — null", () => {
    expect(pickJoinBattle([], "/campaigns")).toBeNull();
  });

  it("поза кампанією — перший активний бій", () => {
    expect(pickJoinBattle([a, b], "/campaigns")).toBe(a);
  });

  it("у кампанії — її бій має пріоритет", () => {
    expect(pickJoinBattle([a, b], "/campaigns/c2/dm/units")).toBe(b);
  });

  it("на сторінці цього бою — null", () => {
    expect(pickJoinBattle([a, b], "/campaigns/c1/battles/b1")).toBeNull();
  });

  it("у кампанії без активного бою — бій іншої кампанії", () => {
    expect(pickJoinBattle([b], "/campaigns/c1")).toBe(b);
  });
});
