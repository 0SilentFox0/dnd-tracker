import { describe, expect, it } from "vitest";

import { pageFactsSchema } from "@/lib/schemas/scenario-index";

const valid = { sections: [{ id: "s", title: "T", played: false, refs: [{ type: "unit", id: "u", label: "", count: 1, secret: false }] }] };

describe("pageFactsSchema", () => {
  it("accepts valid facts", () => {
    expect(pageFactsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown ref type", () => {
    const bad = { sections: [{ ...valid.sections[0], refs: [{ ...valid.sections[0].refs[0], type: "wat" }] }] };

    expect(pageFactsSchema.safeParse(bad).success).toBe(false);
  });
});
