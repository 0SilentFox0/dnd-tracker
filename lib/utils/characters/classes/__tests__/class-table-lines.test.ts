import { describe, expect, it } from "vitest";

import { classTableLines } from "@/lib/utils/characters/classes/columns";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const barbarian = { id: "b", name: "Barbarian", columns: [{ key: "rages", label: "Rages", values: Array.from({ length: 20 }, (_, i) => (i >= 2 ? "3" : "2")) }] } as unknown as GameClassData;

describe("classTableLines", () => {
  it("one line per resolved class; unknown classes skipped", () => {
    const entries: ResolvedClassEntry[] = [
      { classId: "b", level: 5, class: barbarian, subclass: null },
      { classId: "x", level: 2, class: null, subclass: null },
    ];

    expect(classTableLines(entries)).toEqual(["Barbarian 5 · Rages 3"]);
  });
});
