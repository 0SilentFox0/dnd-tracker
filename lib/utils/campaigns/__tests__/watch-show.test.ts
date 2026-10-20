import { describe, expect, it } from "vitest";

import { pickWatchShow } from "../watch-show";

describe("pickWatchShow", () => {
  const shows = [{ campaignId: "a" }, { campaignId: "b" }];

  it("спершу поточна кампанія, інакше перша; на сторінці показу — нічого", () => {
    expect(pickWatchShow(shows, "/campaigns/b/dm/units")).toEqual({ campaignId: "b" });
    expect(pickWatchShow(shows, "/campaigns")).toEqual({ campaignId: "a" });
    expect(pickWatchShow(shows, "/campaigns/b/show")).toBeNull();
    expect(pickWatchShow([], "/campaigns/b")).toBeNull();
  });
});
