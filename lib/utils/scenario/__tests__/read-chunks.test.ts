import { describe, expect, it } from "vitest";

import { buildLayout, chunkContentMarkdown, contentToMarkdown, outlineContent } from "@/lib/utils/scenario/read-chunks";
import type { ScenarioContent } from "@/types/scenario";

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const row = (id: string, story: string, notes = "") => ({ id, story: p(story), notes: p(notes) });

const content = (sections: { id: string; rows: ReturnType<typeof row>[] }[]): ScenarioContent => ({ legend: [], sections: sections.map((s) => ({ ...s, title: `Розділ ${s.id}`, played: false })) });

const walk = (c: ScenarioContent, limit: number, sectionId?: string) => {
  const parts: string[] = [];

  let offset: number | null = 0;

  let guard = 0;

  while (offset !== null && guard++ < 1000) {
    const r = chunkContentMarkdown("T", c, { offset, limit, sectionId });

    parts.push(r.text);
    offset = r.nextOffset;
  }

  return parts;
};

const big = content([
  { id: "s1", rows: Array.from({ length: 6 }, (_, i) => row(`r${i}`, "а".repeat(100), "б".repeat(40))) },
  { id: "s2", rows: Array.from({ length: 4 }, (_, i) => row(`q${i}`, "в".repeat(100))) },
  { id: "s3", rows: [] },
]);

describe("chunkContentMarkdown", () => {
  it("малий вміст — одна порція без маркера", () => {
    const r = chunkContentMarkdown("T", big, { limit: 100_000 });

    expect(r.nextOffset).toBeNull();
    expect(r.text).toBe(contentToMarkdown("T", big));
    expect(r.total).toBe(r.text.length);
  });

  it("ріже по межі рядка, останній рядок порції — [next offset N of TOTAL], порції зшиваються без втрат", () => {
    const full = contentToMarkdown("T", big);

    const chunks = walk(big, 500);

    expect(chunks.length).toBeGreaterThan(2);

    chunks.slice(0, -1).forEach((c) => {
      expect(c.split("\n").pop()).toMatch(new RegExp(`^\\[next offset \\d+ of ${full.length}\\]$`));
      expect(c.length).toBeLessThanOrEqual(500 + 40);
      expect(c).not.toContain("[row split]");
    });

    const bodies = chunks.map((c) => c.replace(/\n\n\[next offset \d+ of \d+\]$/, ""));

    expect(bodies.join("\n\n")).toBe(full);
    chunks.slice(1).forEach((c) => expect(c.startsWith("### Row") || c.startsWith("## ")).toBe(true));
  });

  it("offset за кінцем — повідомлення без nextOffset", () => {
    const r = chunkContentMarkdown("T", big, { offset: 10_000_000, limit: 500 });

    expect(r.nextOffset).toBeNull();
    expect(r.text).toContain("past the end");
  });

  it("рядок більший за ліміт — порції [row split], текст зшивається", () => {
    const c = content([{ id: "s1", rows: [row("r1", "а".repeat(50)), row("r2", "ж".repeat(1200)), row("r3", "кінець")] }]);

    const chunks = walk(c, 400);

    expect(chunks.filter((x) => x.startsWith("[row split]")).length).toBeGreaterThanOrEqual(2);

    const stitched = chunks.map((x) => x.replace(/^\[row split\]\n/, "").replace(/\n\n\[next offset \d+ of \d+\]$/, ""));

    const full = contentToMarkdown("T", c);

    expect(stitched.reduce((acc, b, i) => acc + (chunks[i - 1]?.includes("[row split]") ? "" : i ? "\n\n" : "") + b, "")).toBe(full);
  });

  it("sectionId обмежує порції одним розділом", () => {
    const chunks = walk(big, 300, "s2");

    expect(chunks.join("")).not.toContain("Розділ s1");
    expect(chunks.join("")).toContain("Row q0");
  });

  it("не розрізає сурогатну пару при row split", () => {
    const c = content([{ id: "s1", rows: [row("r1", "🎲".repeat(300))] }]);

    const r = chunkContentMarkdown("T", c, { limit: 150 });

    expect(r.text).not.toMatch(/[\ud800-\udbff](\n|$)/);
  });

  it("розкладка: початки рядків вказують на їхній заголовок", () => {
    const { markdown, sections } = buildLayout("T", big);

    sections[0].rows.forEach((r) => expect(markdown.slice(r.start).startsWith(`### Row ${r.id}`)).toBe(true));
  });
});

describe("outlineContent", () => {
  const scene = content(Array.from({ length: 20 }, (_, s) => ({ id: `s${s}`, rows: Array.from({ length: 25 }, (_, i) => row(`r${s}_${i}`, "Довгий текст сцени ".repeat(10), "нотатки ".repeat(5))) })));

  it("сцена 100k символів — аутлайн ≤ 4000", () => {
    expect(contentToMarkdown("Сцена", scene).length).toBeGreaterThan(100_000);

    const out = outlineContent("Сцена", scene);

    expect(out.length).toBeLessThanOrEqual(4000);
    expect(out).toContain("[s0]");
    expect(out).toContain("[s19]");
  });

  it("мала сцена — рядки з розмірами, початком тексту й офсетами", () => {
    const out = outlineContent("М", content([{ id: "s1", rows: [row("r1", "Дзвони обриваються", "DC 12")] }]));

    expect(out).toContain("## [s1]");
    expect(out).toMatch(/- r1 @\d+ s18 n5: Дзвони обриваються/);
  });
});
