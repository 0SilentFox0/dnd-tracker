import { describe, expect, it } from "vitest";

import { ELF_EYE_ABILITY, isElfRaceName, withElfEye } from "../elf-eye";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

describe("elf-eye backfill", () => {
  it("is a valid ability", () => expect(() => AbilitySchema.parse(ELF_EYE_ABILITY)).not.toThrow());

  it("matches elf race names", () => {
    expect(isElfRaceName("Elf")).toBe(true);
    expect(isElfRaceName("High Elf")).toBe(true);
    expect(isElfRaceName("Dark elves")).toBe(false);
    expect(isElfRaceName("Ельфи")).toBe(false);
    expect(isElfRaceName("Лісові ельфи")).toBe(false);
    expect(isElfRaceName("Гноми")).toBe(false);
  });

  it("is idempotent", () => {
    const once = withElfEye([]);

    const twice = withElfEye(once.abilities);

    expect(once.changed).toBe(true);
    expect(twice.changed).toBe(false);
    expect(twice.abilities).toHaveLength(1);
  });

  it("appends to the raw array, keeping invalid entries and unknown keys", () => {
    const raw = [{ id: "bad", nope: 1 }, { id: "ok", custom: "x", trigger: { event: "passive" }, effects: [] }];

    const result = withElfEye(raw);

    expect(result.changed).toBe(true);
    expect((result.abilities as unknown[]).slice(0, 2)).toEqual(raw);
    expect(result.abilities).toHaveLength(3);
  });

  it("does not write over a non-array", () => {
    const result = withElfEye({ weird: true });

    expect(result.changed).toBe(false);
    expect(result.warning).toBeTruthy();
  });
});
