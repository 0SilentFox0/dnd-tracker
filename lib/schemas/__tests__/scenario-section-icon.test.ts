import { describe, expect, it } from "vitest";

import { scenarioContentSchema } from "@/lib/schemas/scenario";

const content = (icon?: unknown) => ({
  legend: [],
  sections: [{ id: "s1", title: "1.0", played: false, rows: [], ...(icon === undefined ? {} : { icon }) }],
});

describe("sectionSchema.icon", () => {
  it("приймає відомий ключ і відсутність поля", () => {
    expect(scenarioContentSchema.safeParse(content("battle")).success).toBe(true);
    expect(scenarioContentSchema.safeParse(content()).success).toBe(true);
  });

  it("відхиляє невідомий ключ", () => {
    expect(scenarioContentSchema.safeParse(content("bogus")).success).toBe(false);
  });
});
