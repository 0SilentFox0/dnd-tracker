import { describe, expect, it } from "vitest";

import { type DigestPage, pageLine } from "@/lib/utils/scenario/digest/build-lines";
import { scenarioDigest } from "@/lib/utils/scenario/digest/scenario-digest";

const mk = (i: number, over: Partial<DigestPage> = {}): DigestPage => ({
  id: `p${i}`,
  title: `Page ${i}`,
  arc: "Arc",
  sortOrder: i,
  llm: null,
  sections: [{ title: "Sec", played: i % 2 === 0, lead: "Some lead text here" }],
  entities: ["Alpha", "Beta"],
  ...over,
});

const join = (pages: DigestPage[], level: 0 | 1 | 2 | 3) => pages.map((p) => pageLine(p, level)).join("\n");

describe("scenarioDigest", () => {
  it("returns empty string for no pages", () => {
    expect(scenarioDigest([], { maxChars: 4000 })).toBe("");
  });

  it("single page uses full level when it fits", () => {
    expect(scenarioDigest([mk(0)], { maxChars: 4000 })).toBe(pageLine(mk(0), 0));
  });

  it("sorts by sortOrder", () => {
    const out = scenarioDigest([mk(2), mk(0), mk(1)], { maxChars: 4000 });

    expect(out.split("\n").map((l) => l.slice(0, 8))).toEqual(["- Page 0", "- Page 1", "- Page 2"]);
  });

  it("degrades level by level on 10 pages", () => {
    const pages = Array.from({ length: 10 }, (_, i) => mk(i));

    for (const level of [0, 1, 2, 3] as const) {
      const text = join(pages, level);

      expect(scenarioDigest(pages, { maxChars: text.length })).toBe(text);
    }
  });

  it("just below a level drops to the next one", () => {
    const pages = Array.from({ length: 10 }, (_, i) => mk(i));

    expect(scenarioDigest(pages, { maxChars: join(pages, 0).length - 1 })).toBe(join(pages, 1));
  });

  it("200 pages stay within maxChars with an omitted marker", () => {
    const pages = Array.from({ length: 200 }, (_, i) => mk(i));

    const out = scenarioDigest(pages, { maxChars: 4000 });

    expect(out.length).toBeLessThanOrEqual(4000);
    expect(out).toMatch(/- … \d+ more pages omitted$/);
    expect(out.startsWith(pageLine(pages[0], 3))).toBe(true);
  });

  it("llm summary overrides and carries stale", () => {
    const out = scenarioDigest([mk(0, { llm: { digest: "Sum", stale: true } }), mk(1)], { maxChars: 4000 });

    expect(out.split("\n")[0]).toBe("- Page 0 [p0]: Sum (stale)");
  });
});
