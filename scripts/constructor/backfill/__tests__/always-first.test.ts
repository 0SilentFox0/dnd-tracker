import { describe, expect, it } from "vitest";

import { ALWAYS_FIRST_ABILITY, isAlwaysFirstName, withAlwaysFirst } from "../always-first";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

describe("always-first backfill", () => {
  it("is a valid ability", () => expect(() => AbilitySchema.parse(ALWAYS_FIRST_ABILITY)).not.toThrow());

  it("matches the old hardcoded names", () => {
    expect(isAlwaysFirstName("Файдаен")).toBe(true);
    expect(isAlwaysFirstName("Iven the Bold")).toBe(true);
    expect(isAlwaysFirstName("Годрік")).toBe(false);
  });

  it("is idempotent", () => {
    const once = withAlwaysFirst([]);

    const twice = withAlwaysFirst(once.abilities);

    expect(once.changed).toBe(true);
    expect(twice.changed).toBe(false);
    expect(twice.abilities).toHaveLength(1);
  });

  it("treats an existing passive +999 initiative as satisfied", () => {
    const swift = [{ id: "ivan-swift", name: "x", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: 999, target: "self" }] }];

    const result = withAlwaysFirst(swift);

    expect(result.changed).toBe(false);
    expect(result.abilities).toEqual(swift);
  });

  it("keeps invalid existing entries untouched", () => {
    const raw = [{ id: "bad", extra: true }];

    const result = withAlwaysFirst(raw);

    expect((result.abilities as unknown[])[0]).toEqual(raw[0]);
    expect(result.changed).toBe(true);
  });
});
