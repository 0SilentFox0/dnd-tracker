import { afterEach, describe, expect, it, vi } from "vitest";

import { adaptCompendium } from "../adapt";
import { renderEntryBlocks } from "../entries";
import { mediaIdOf } from "../media/types";
import { buildImportPlan } from "../plan";

import { scenarioContentSchema } from "@/lib/schemas/scenario";

const img = (url: string, extra: object = {}) => ({ type: "image", href: { type: "external", url }, ...extra });

const A = "https://a.test/a.png";

const B = "https://a.test/b.png";

describe("renderEntryBlocks", () => {
  it("keeps text-image-text order and merges adjacent text", () => {
    const { blocks } = renderEntryBlocks(["one", "two", img(A, { title: "Cap", credit: "By X" }), "three"]);

    expect(blocks).toEqual([{ text: "one\ntwo" }, { image: { url: A, alt: "Cap", caption: "By X", path: "entries[2]" } }, { text: "three" }]);
  });

  it("expands a gallery into one block per image", () => {
    const { blocks } = renderEntryBlocks([{ type: "gallery", images: [img(A), img(B)] }]);

    expect(blocks.map((b) => ("image" in b ? b.image.url : ""))).toEqual([A, B]);
  });

  it("finds images in nested entries and lists", () => {
    const { blocks } = renderEntryBlocks([{ type: "entries", name: "N", entries: ["t", { type: "list", items: ["x", img(A)] }] }]);

    expect(blocks.some((b) => "image" in b)).toBe(true);
  });

  it("marks invalid urls with a skip reason", () => {
    const { blocks } = renderEntryBlocks([img("http://a.test/a.png"), { type: "image", href: { type: "internal", path: "x.png" } }]);

    expect(blocks.map((b) => ("image" in b ? b.image.skip : ""))).toEqual(["MEDIA_HTTPS_ONLY", "MEDIA_INTERNAL_PATH"]);
  });
});

const source = { name: "Test Book", source: "Test", edition: "one" };

const chapter = (entries: unknown[]) => adaptCompendium({ _meta: { sources: [{ json: "Test" }] }, book: [{ ...source, id: "bk", contents: [] }], bookData: [{ id: "bk", source: "Test", data: [{ name: "Ch", entries }] }] }, { categories: ["book"] }).entries.find((e) => e.kind === "scenarioPages")!;

describe("materialPage images", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("emits image nodes without src and matching media refs", () => {
    const page = chapter(["Before", img(A, { title: "T" }), "After"]);

    const notes = (page.body.content as { sections: Array<{ rows: Array<{ notes: { content: Array<{ type: string; attrs?: Record<string, unknown> }> } }> }> }).sections[0].rows[0].notes.content;

    expect(notes.map((n) => n.type)).toEqual(["paragraph", "image", "paragraph"]);
    expect(notes[1].attrs).toEqual({ mediaId: mediaIdOf(A), alt: "T", caption: "T" });
    expect(notes[1].attrs).not.toHaveProperty("src");
    expect(page.media).toMatchObject([{ role: "inline", url: A, mediaId: mediaIdOf(A) }]);
    expect(scenarioContentSchema.safeParse(page.body.content).success).toBe(true);
  });

  it("drops the node but keeps a skip ref for an invalid url", () => {
    const page = chapter([img("http://a.test/a.png")]);

    expect(JSON.stringify(page.body.content)).not.toContain('"image"');
    expect(page.media).toMatchObject([{ role: "inline", skip: "MEDIA_HTTPS_ONLY" }]);
  });

  it("is unchanged on reimport when the stored node got a src, and keeps src when text changes", () => {
    const first = buildImportPlan(adaptCompendium({ _meta: { sources: [{ json: "Test" }] }, book: [{ ...source, id: "bk", contents: [] }], bookData: [{ id: "bk", source: "Test", data: [{ name: "Ch", entries: ["Before", img(A)] }] }] }, { categories: ["book"] }), { campaignId: "c", existing: [] }).writes[0];

    const stored = structuredClone(first.body) as { content: { sections: Array<{ rows: Array<{ notes: { content: Array<{ type: string; attrs?: Record<string, unknown> }> } }> }> } };

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");

    const src = `https://proj.supabase.co/storage/v1/object/public/compendium-media/c/${mediaIdOf(A)}.webp`;

    stored.content.sections[0].rows[0].notes.content[1].attrs!.src = src;

    const existing = [{ key: first.key, localId: first.localId, body: stored as never, baseline: first.baseline! }];

    const run = (entries: unknown[]) => buildImportPlan(adaptCompendium({ _meta: { sources: [{ json: "Test" }] }, book: [{ ...source, id: "bk", contents: [] }], bookData: [{ id: "bk", source: "Test", data: [{ name: "Ch", entries }] }] }, { categories: ["book"] }), { campaignId: "c", existing }).writes[0];

    expect(run(["Before", img(A)]).operation).toBe("unchanged");

    const changed = run(["Before edited", img(A)]);

    expect(changed.operation).toBe("update");
    expect(JSON.stringify(changed.body.content)).toContain(src);
  });
});
