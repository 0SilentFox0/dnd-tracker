import { describe, expect, it } from "vitest";

import { acquaintanceMentionIds, addedMentionCount, hasRefPlaceholder, refPlaceholder, substituteRefs } from "@/lib/utils/scenario/ai-refs";
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

describe("acquaintanceMentionIds", () => {
  const chip = (id: string) => ({ type: "mention", attrs: { id, label: "X", type: "acquaintance" } });

  const d = (...ids: string[]) => ({ type: "doc", content: [{ type: "paragraph", content: ids.map(chip) }] }) as never;

  it("collects only chips new relative to the replaced content", () => {
    expect(acquaintanceMentionIds([{ op: "replaceRow", sectionId: "s", rowId: "r", story: d("old", "new"), before: { story: d("old"), notes: d() } }])).toEqual(["new"]);
  });

  it("collects chips of inserted rows and added sections", () => {
    const row = { id: "r", story: d("a"), notes: d("b") };

    expect(acquaintanceMentionIds([{ op: "insertRow", sectionId: "s", afterRowId: null, row }, { op: "addSection", afterSectionId: null, section: { id: "n", title: "N", played: false, rows: [{ id: "q", story: d("c"), notes: d() }] } }]).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("addedMentionCount", () => {
  const text = (t: string) => ({ type: "text", text: t });

  const chip = (label: string) => ({ type: "mention", attrs: { id: label, label, type: "acquaintance" } });

  const d = (...nodes: unknown[]) => ({ type: "doc", content: [{ type: "paragraph", content: nodes }] }) as never;

  it("counts chips when the text is unchanged", () => {
    expect(addedMentionCount(d(text("Бі і Бі")), d(chip("Бі"), text(" і "), chip("Бі")))).toBe(2);
  });

  it("returns null when the text changed", () => {
    expect(addedMentionCount(d(text("Бі")), d(chip("Бі"), text("!")))).toBeNull();
  });

  it("returns null for an identical doc", () => {
    expect(addedMentionCount(d(chip("Бі")), d(chip("Бі")))).toBeNull();
  });
});
