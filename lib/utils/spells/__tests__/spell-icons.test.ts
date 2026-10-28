import { Moon, Shell } from "lucide-react";
import { describe, expect, it } from "vitest";

import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";

describe("getSpellGroupIcon", () => {
  it("maps the icon key", () => expect(getSpellGroupIcon({ icon: "moon" })).toBe(Moon));

  it("unknown or missing key → Shell", () => {
    expect(getSpellGroupIcon({ icon: "skull" })).toBe(Shell);
    expect(getSpellGroupIcon(undefined)).toBe(Shell);
  });
});
