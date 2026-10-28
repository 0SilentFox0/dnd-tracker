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

  it("невідомий ключ (новіший реліз, відкат) не ламає читання — іконка стає автоматичною", () => {
    const parsed = scenarioContentSchema.safeParse(content("bogus"));

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.sections[0].icon).toBeUndefined();
  });
});
