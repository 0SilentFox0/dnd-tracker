import { describe, expect, it } from "vitest";

import { fillImageSources } from "../fill-image-sources";

import type { RichNode, ScenarioContent } from "@/types/scenario";

const A = "a".repeat(24), B = "b".repeat(24);

const img = (mediaId: string, src?: string): RichNode => ({ type: "image", attrs: { mediaId, ...(src && { src }) } });

const page = (story: RichNode[], notes: RichNode[] = []): ScenarioContent => ({ legend: [], sections: [{ id: "s", title: "S", played: false, rows: [{ id: "r", story: { type: "doc", content: story }, notes: { type: "doc", content: notes } }] }] });

const stories = (c: ScenarioContent) => c.sections[0].rows[0].story.content;

describe("fillImageSources", () => {
  it("sets src only on image nodes without src", () => {
    const out = fillImageSources(page([img(A), img(B, "https://x.supabase.co/keep.png")]), new Map([[A, "https://x.supabase.co/a.webp"], [B, "https://x.supabase.co/b.webp"]]));

    expect(stories(out.content).map((n) => n.attrs?.src)).toEqual(["https://x.supabase.co/a.webp", "https://x.supabase.co/keep.png"]);
    expect(out.changed).toBe(true);
    expect([...out.found].sort()).toEqual([A, B]);
  });

  it("reaches nodes nested in lists/tables and notes, and does not mutate the input", () => {
    const input = page([{ type: "bulletList", content: [{ type: "listItem", content: [img(A)] }] }, { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [img(B)] }] }] }], [img(A)]);

    const snapshot = structuredClone(input);

    const out = fillImageSources(input, new Map([[A, "https://x.supabase.co/a.webp"], [B, "https://x.supabase.co/b.webp"]]));

    expect(JSON.stringify(out.content).match(/https:\/\/x\.supabase\.co\/a\.webp/g)).toHaveLength(2);
    expect(JSON.stringify(out.content)).toContain("b.webp");
    expect(input).toEqual(snapshot);
  });

  it("reports unchanged when nothing matches and found ids when src already present", () => {
    const out = fillImageSources(page([img(A, "https://x.supabase.co/a.webp")]), new Map([[A, "https://x.supabase.co/other.webp"], [B, "https://x.supabase.co/b.webp"]]));

    expect(out.changed).toBe(false);
    expect([...out.found]).toEqual([A]);
  });
});
