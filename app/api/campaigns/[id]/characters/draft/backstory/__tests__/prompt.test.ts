import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale: vi.fn() }));

import { buildBackstoryPrompt } from "../generate-backstory";

const data = { name: "Ash", race: "Elves", archetype: "mage" as const, class: "Mage" };

describe("buildBackstoryPrompt", () => {
  it("asks for the author's language and keeps the archetype key", () => {
    expect(buildBackstoryPrompt(data, "en")).toContain("Write in English");
    expect(buildBackstoryPrompt(data, "uk")).toContain("Write in Ukrainian");
    expect(buildBackstoryPrompt(data, "en")).toContain('archetype "mage"');
  });

  it("is free of Cyrillic", () => {
    expect(buildBackstoryPrompt({ ...data, background: "draft" }, "uk")).not.toMatch(/\p{Script=Cyrillic}/u);
  });
});
