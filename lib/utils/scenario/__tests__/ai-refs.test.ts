import { describe, expect, it } from "vitest";

import { hasRefPlaceholder, refPlaceholder, substituteRefs } from "@/lib/utils/scenario/ai-refs";
import type { ScenarioAiOp } from "@/types/ai";
import type { RichDoc } from "@/types/scenario";

const doc = (id: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "mention", attrs: { id, label: "B", type: "acquaintance" } }] }] });

const op = (id: string): ScenarioAiOp => ({ op: "replaceRow", sectionId: "s", rowId: "r", story: doc(id), before: { story: doc("x"), notes: doc("y") } });

describe("ref placeholders", () => {
  it("substitutes known refs in story/notes and leaves other ids alone", () => {
    const [out] = substituteRefs([op(refPlaceholder("b"))], new Map([["b", "real"]]));

    expect(out.op === "replaceRow" && out.story?.content[0].content?.[0].attrs?.id).toBe("real");
    expect(out.op === "replaceRow" && out.before.story.content[0].content?.[0].attrs?.id).toBe("x");
  });

  it("detects leftovers", () => {
    expect(hasRefPlaceholder([op("@ref:b")])).toBe(true);
    expect(hasRefPlaceholder([op("real")])).toBe(false);
    expect(hasRefPlaceholder(substituteRefs([op("@ref:b")], new Map()))).toBe(true);
  });
});
