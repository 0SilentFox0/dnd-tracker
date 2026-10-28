import { describe, expect, it } from "vitest";

import { createClassSchema, updateClassSchema } from "@/lib/schemas/classes";

const values = Array.from({ length: 20 }, (_, i) => String(i + 1));

describe("class columns schema", () => {
  it("create defaults columns to [] and accepts a pool column", () => {
    expect(createClassSchema.parse({ name: "Monk" }).columns).toEqual([]);
    expect(createClassSchema.safeParse({ name: "Monk", columns: [{ key: "focus-points", label: "Focus Points", values, pool: { rest: "short" } }] }).success).toBe(true);
  });

  it("rejects bad keys, wrong cell count, too many columns, duplicates", () => {
    expect(createClassSchema.safeParse({ name: "X", columns: [{ key: "Focus Points", label: "F", values }] }).success).toBe(false);
    expect(createClassSchema.safeParse({ name: "X", columns: [{ key: "f", label: "F", values: values.slice(1) }] }).success).toBe(false);
    expect(createClassSchema.safeParse({ name: "X", columns: Array.from({ length: 13 }, (_, i) => ({ key: `c${i}`, label: "C", values })) }).success).toBe(false);

    const dup = createClassSchema.safeParse({ name: "X", columns: [{ key: "f", label: "F", values }, { key: "f", label: "G", values }] });

    expect(dup.success).toBe(false);
    expect(dup.error?.issues[0]).toMatchObject({ path: ["columns", 1, "key"] });
  });

  it("update: columns optional", () => {
    expect(updateClassSchema.safeParse({ name: "Monk" }).success).toBe(true);
    expect(updateClassSchema.parse({ name: "Monk" }).columns).toBeUndefined();
  });
});
