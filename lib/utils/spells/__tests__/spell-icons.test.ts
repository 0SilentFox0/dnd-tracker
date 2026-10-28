import { DoorOpen, Eye, Flame, Heart, Moon, Shell, Shield, Skull, Sparkles, Sun, Tornado, VenetianMask } from "lucide-react";
import { describe, expect, it } from "vitest";

import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";

describe("getSpellGroupIcon", () => {
  it("maps the icon key", () => expect(getSpellGroupIcon({ icon: "moon" })).toBe(Moon));

  it("unknown or missing key → Shell", () => {
    expect(getSpellGroupIcon({ icon: "nope" })).toBe(Shell);
    expect(getSpellGroupIcon(undefined)).toBe(Shell);
  });
});

describe("school icon keys", () => {
  it("keeps the 5 HOMM5 keys first and unchanged, adds 7 SRD keys", () => {
    expect(SPELL_GROUP_ICON_KEYS.slice(0, 5)).toEqual(["moon", "flame", "sparkles", "sun", "shell"]);
    expect(SPELL_GROUP_ICON_KEYS.slice(5)).toEqual(["shield", "portal", "eye", "heart", "mask", "skull", "vortex"]);
  });

  it("maps every key to its lucide icon; unknown → Shell", () => {
    const expected = { moon: Moon, flame: Flame, sparkles: Sparkles, sun: Sun, shell: Shell, shield: Shield, portal: DoorOpen, eye: Eye, heart: Heart, mask: VenetianMask, skull: Skull, vortex: Tornado };

    for (const [key, icon] of Object.entries(expected)) expect(getSpellGroupIcon({ icon: key })).toBe(icon);

    expect(getSpellGroupIcon({ icon: "nope" })).toBe(Shell);
  });
});
