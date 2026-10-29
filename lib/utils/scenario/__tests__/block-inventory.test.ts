import { describe, expect, it, vi } from "vitest";

import { describeLost } from "../block-inventory";

import { getTranslator } from "@/lib/i18n/translator";

vi.unmock("@/lib/i18n/translator");

describe("describeLost", () => {
  it.each([
    ["uk", "3 виноски, 1 секрет"],
    ["en", "3 callouts, 1 secret"],
  ] as const)("plural forms in %s", async (locale, text) => {
    const t = await getTranslator(locale, "assistant");

    expect(describeLost({ callout: 3, secret: 1 }, (kind, count) => t(`blocks.${kind}`, { count }))).toBe(text);
  });

  it("uk plural categories", async () => {
    const t = await getTranslator("uk", "assistant");

    const label = (count: number) => describeLost({ callout: count }, (kind, n) => t(`blocks.${kind}`, { count: n }));

    expect([1, 2, 5, 11, 21].map(label)).toEqual(["1 виноску", "2 виноски", "5 виносок", "11 виносок", "21 виноску"]);
  });
});
