import { describe, expect, it } from "vitest";

import { resolveLocale } from "../resolve-locale";

describe("resolveLocale", () => {
  it.each([
    [{ cookie: "en" }, "en"],
    [{ cookie: "uk", acceptLanguage: "en" }, "uk"],
    [{ cookie: "fr", acceptLanguage: "en" }, "en"],
    [{ cookie: "", acceptLanguage: "en" }, "en"],
    [{ cookie: "<script>" }, "uk"],
    [{ acceptLanguage: "en-GB,en;q=0.9,uk;q=0.8" }, "en"],
    [{ acceptLanguage: "uk;q=0.5,en;q=0.9" }, "en"],
    [{ acceptLanguage: "de,*" }, "uk"],
    [{ acceptLanguage: "en;q=0" }, "uk"],
    [{ acceptLanguage: "en;q=abc" }, "uk"],
    [{}, "uk"],
  ])("%j -> %s", (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});
