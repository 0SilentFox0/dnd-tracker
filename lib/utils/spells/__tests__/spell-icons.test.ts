import { Moon, Shell } from "lucide-react";
import { describe, expect, it } from "vitest";

import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";

describe("getSpellGroupIcon", () => {
  it("відома група — свій значок", () => {
    expect(getSpellGroupIcon("Dark")).toBe(Moon);
  });

  it("невідома група і «Без групи» — Shell, щоб не плутати з Summ (Sparkles)", () => {
    expect(getSpellGroupIcon("Без групи")).toBe(Shell);
    expect(getSpellGroupIcon("Щось нове")).toBe(Shell);
  });
});
