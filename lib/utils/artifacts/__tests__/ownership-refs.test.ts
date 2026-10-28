import { describe, expect, it } from "vitest";

import { findHolder, uniqueConflict } from "@/lib/utils/artifacts/ownership";

const inv = (characterId: string, equipped: Record<string, string>, stash: string[] = []) => ({ characterId, equipped, stash });

const gear = new Set(["dagger", "ls", "ft"]);

const isUnique = (id: string) => !gear.has(id);

describe("findHolder with refs", () => {
  it("non-unique items are never held; properties are not unique", () => {
    expect(findHolder([inv("a", { weapon: "dagger" })], "dagger", undefined, isUnique)).toBeNull();
    expect(findHolder([inv("a", { weapon: "ls+ft" })], "ls+ft", undefined, isUnique)).toBeNull();
  });

  it("a unique HOMM base inside a composed ref stays one per campaign", () => {
    expect(findHolder([inv("a", { weapon: "homm+ft" })], "homm", undefined, isUnique)).toBe("a");
    expect(findHolder([inv("a", {}, ["homm"])], "homm+ft", undefined, isUnique)).toBe("a");
    expect(findHolder([inv("a", {}, ["homm"])], "homm+ft", "a", isUnique)).toBeNull();
  });

  it("default (no checker) = everything unique, as before", () => {
    expect(findHolder([inv("a", { weapon: "dagger" })], "dagger")).toBe("a");
  });
});

describe("uniqueConflict", () => {
  it("duplicates allowed only for non-unique refs", () => {
    expect(uniqueConflict(["dagger", "dagger"], isUnique)).toBe(false);
    expect(uniqueConflict(["homm", "homm"], isUnique)).toBe(true);
    expect(uniqueConflict(["homm+ft", "homm"], isUnique)).toBe(true);
    expect(uniqueConflict(["ls+ft", "ls+ft"], isUnique)).toBe(false);
    expect(uniqueConflict(["a", "a"])).toBe(true);
  });
});
