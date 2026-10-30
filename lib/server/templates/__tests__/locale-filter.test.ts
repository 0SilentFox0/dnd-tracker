import { describe, expect, it } from "vitest";

import { templateLocaleWhere } from "@/lib/server/templates/locale-filter";

describe("templateLocaleWhere", () => {
  it("en включає рядки без locale, інша мова — точний збіг", () => {
    expect(templateLocaleWhere()).toEqual({ OR: [{ locale: null }, { locale: "en" }] });
    expect(templateLocaleWhere("uk")).toEqual({ locale: "uk" });
  });
});
