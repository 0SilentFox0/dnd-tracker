import { describe, expect, it } from "vitest";

import { summaryInputHash } from "../hash";

import type { RichDoc, ScenarioContent } from "@/types/scenario";

const doc = (text: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const page = (o: { title?: string; story?: string; notes?: string; played?: boolean } = {}) => ({
  title: o.title ?? "Cave",
  kind: "scene",
  arc: null,
  content: { legend: [], sections: [{ id: "s1", title: "Entrance", played: o.played ?? false, rows: [{ id: "r1", story: doc(o.story ?? "story"), notes: doc(o.notes ?? "notes") }] }] } as unknown as ScenarioContent,
});

describe("summaryInputHash", () => {
  it("ignores the played flag", () => {
    expect(summaryInputHash(page({ played: true }))).toBe(summaryInputHash(page({ played: false })));
  });

  it.each([{ story: "other" }, { notes: "other" }, { title: "Other" }])("changes with %o", (change) => {
    expect(summaryInputHash(page(change))).not.toBe(summaryInputHash(page()));
  });
});
