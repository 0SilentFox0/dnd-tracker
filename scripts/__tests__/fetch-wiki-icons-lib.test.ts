import { describe, expect, it } from "vitest";

import { chunk, parseImageInfo, planDownloads } from "../fetch-wiki-icons-lib";

describe("fetch-wiki-icons lib", () => {
  it("skips keys whose file already exists", () => {
    const all = planDownloads(new Set());

    const some = planDownloads(new Set(["skill-icons/cleaving-strike.png"]));

    expect(all.length - some.length).toBe(1);
    expect(some.find((d) => d.key === "cleaving-strike")).toBeUndefined();
  });

  it("puts branch keys in main-skill-icons", () => {
    expect(planDownloads(new Set()).find((d) => d.key === "ranged-expert")?.dir).toBe("main-skill-icons");
  });

  it("maps normalized wiki titles back to urls", () => {
    const json = {
      query: {
        normalized: [{ from: "File:H5StunningBlow.PNG", to: "File:H5StunningBlow.PNG" }],
        pages: {
          "1": { title: "File:H5StunningBlow.PNG", imageinfo: [{ url: "https://static.wikia.nocookie.net/a.PNG" }] },
          "-1": { title: "File:H5Missing.png", missing: "" },
        },
      },
    };

    expect(parseImageInfo(json)).toEqual({ "H5StunningBlow.PNG": "https://static.wikia.nocookie.net/a.PNG" });
  });

  it("chunks by 50", () => {
    expect(chunk(Array.from({ length: 101 }, (_, i) => i), 50).map((c) => c.length)).toEqual([50, 50, 1]);
  });
});
