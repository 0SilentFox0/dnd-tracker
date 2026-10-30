import { describe, expect, it } from "vitest";

import { findMentions } from "@/lib/utils/scenario/mentions";
import { wrapMentions } from "@/lib/utils/scenario/wrap-mentions";
import type { RichDoc, RichNode } from "@/types/scenario";

const target = { id: "a1", type: "acquaintance" } as const;

const p = (...content: RichNode[]): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content }] });

const text = (t: string, marks?: RichNode["marks"]): RichNode => ({ type: "text", text: t, ...(marks && { marks }) });

const chips = (d: RichDoc) => (d.content[0].content ?? []).filter((n) => n.type === "mention");

describe("wrapMentions", () => {
  it("wraps every case form, keeping the matched spelling as the label", () => {
    const { doc, count } = wrapMentions(p(text("Беатріс сказала Беатрісі: привіт.")), ["Беатріс", "Беатрісі"], target);

    expect(count).toBe(2);
    expect(chips(doc).map((n) => n.attrs)).toEqual([{ id: "a1", label: "Беатріс", type: "acquaintance" }, { id: "a1", label: "Беатрісі", type: "acquaintance" }]);
    expect(doc.content[0].content?.map((n) => n.text ?? `[${n.attrs?.label}]`).join("")).toBe("[Беатріс] сказала [Беатрісі]: привіт.");
  });

  it("does not match inside a longer word or touch an existing chip", () => {
    const existing: RichNode = { type: "mention", attrs: { id: "x", label: "Беатріс", type: "character" } };

    const src = p(existing, text(" і Беатрісою, Небеатріс"));

    const { doc, count } = wrapMentions(src, ["Беатріс"], target);

    expect(count).toBe(0);
    expect(doc).toBe(src);
  });

  it("wraps inside secret text and keeps the secret mark on the chip", () => {
    const { doc } = wrapMentions(p(text("Це секрет про Беатріс", [{ type: "secret" }])), ["Беатріс"], target);

    expect(chips(doc)[0].marks).toEqual([{ type: "secret" }]);
    expect(doc.content[0].content?.[0].marks).toEqual([{ type: "secret" }]);
  });

  it("does not wrap mid-word across adjacent text nodes", () => {
    const { count } = wrapMentions(p(text("Супер", [{ type: "bold" }]), text("Беатріс"), text("ка", [{ type: "italic" }])), ["Беатріс"], target);

    expect(count).toBe(0);
  });

  it("wraps at a node edge when the neighbour is not a word character", () => {
    const { count } = wrapMentions(p(text("Хто: ", [{ type: "bold" }]), text("Беатріс"), text(", привіт", [{ type: "italic" }])), ["Беатріс"], target);

    expect(count).toBe(1);
  });

  it("prefers the longest form and walks nested nodes", () => {
    const doc: RichDoc = { type: "doc", content: [{ type: "callout", content: [{ type: "paragraph", content: [text("Беатріс Грей прийшла")] }] }] };

    const out = wrapMentions(doc, ["Беатріс", "Беатріс Грей"], target);

    expect(out.count).toBe(1);
    expect(out.doc.content[0].content?.[0].content?.[0].attrs?.label).toBe("Беатріс Грей");
  });

  it("re-running over its own result finds nothing new (findMentions marks them inMention)", () => {
    const first = wrapMentions(p(text("Беатріс і Беатрісі")), ["Беатріс", "Беатрісі"], target);

    expect(wrapMentions(first.doc, ["Беатріс", "Беатрісі"], target).count).toBe(0);

    const content = { legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: first.doc, notes: p() }] }] };

    expect(findMentions(content as never, "Беатріс").every((h) => h.inMention)).toBe(true);
  });

  it("does not wrap a name glued to a bold word, like findMentions", () => {
    const src = p(text("Super", [{ type: "bold" }]), text("Beatrice"));

    expect(wrapMentions(src, ["Beatrice"], target).count).toBe(0);
    expect(findMentions({ legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: src, notes: p() }] }] } as never, "Beatrice")).toHaveLength(0);
  });

  it("wraps a name split by markup into one chip with the common marks", () => {
    const { doc, count } = wrapMentions(p(text("Hi "), text("Bea"), text("trice", [{ type: "bold" }]), text("!")), ["Beatrice"], target);

    expect(count).toBe(1);
    expect(chips(doc)[0]).toEqual({ type: "mention", attrs: { id: "a1", label: "Beatrice", type: "acquaintance" } });
    expect(doc.content[0].content?.map((n) => n.text ?? `[${n.attrs?.label}]`).join("")).toBe("Hi [Beatrice]!");
  });

  it("keeps the secret mark when the name is split inside a secret", () => {
    const secret: RichNode["marks"] = [{ type: "secret" }];

    const { doc } = wrapMentions(p(text("Бе", secret), text("атріс", [{ type: "secret" }, { type: "bold" }])), ["Беатріс"], target);

    expect(chips(doc)).toHaveLength(1);
    expect(chips(doc)[0].marks).toEqual([{ type: "secret" }]);
  });

  it("capitalised forms match only capitalised occurrences", () => {
    const src = p(text("Віра пішла. віра в богів. БЕАТРІС"));

    const cap = wrapMentions(src, ["Віра"], target);

    expect(cap.count).toBe(1);
    expect(chips(cap.doc)[0].attrs?.label).toBe("Віра");
    expect(wrapMentions(src, ["віра"], target).count).toBe(2);
    expect(wrapMentions(p(text("БЕАТРІС кричить")), ["Беатріс"], target).count).toBe(1);
  });
});
