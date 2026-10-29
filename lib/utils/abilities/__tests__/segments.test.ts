import { describe, expect, it } from "vitest";

import { renderSegment, renderSegments, seg } from "../segments";

import type { Translator } from "@/lib/i18n/translator";

const MESSAGES: Record<string, string> = {
  plain: "просто",
  num: "{n} разів",
  wrap: "({inner})",
  list: "[{items}]",
};

const t = ((key: string, values?: Record<string, string | number>) => (MESSAGES[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(values?.[k]))) as Translator;

describe("renderSegment", () => {
  it("renders a plain key", () => {
    expect(renderSegment(t, seg("plain"))).toBe("просто");
  });

  it("passes numeric params", () => {
    expect(renderSegment(t, seg("num", { n: 5 }))).toBe("5 разів");
  });

  it("renders a nested segment param", () => {
    expect(renderSegment(t, seg("wrap", { inner: seg("num", { n: 2 }) }))).toBe("(2 разів)");
  });

  it("joins a segment array with comma", () => {
    expect(renderSegment(t, seg("list", { items: [seg("plain"), seg("num", { n: 1 })] }))).toBe("[просто, 1 разів]");
  });

  it("joins with a custom separator", () => {
    expect(renderSegment(t, seg("list", { items: { join: " / ", items: [seg("plain"), seg("plain")] } }))).toBe("[просто / просто]");
  });

  it("falls back to the key when missing", () => {
    expect(renderSegment(t, seg("missing.key"))).toContain("missing.key");
  });

  it("renders a list", () => {
    expect(renderSegments(t, [seg("plain"), seg("num", { n: 3 })])).toEqual(["просто", "3 разів"]);
  });
});
