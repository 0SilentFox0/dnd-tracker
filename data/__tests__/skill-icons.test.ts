import { describe, expect, it } from "vitest";

import { BRANCH_ICONS, iconBucket, iconPublicUrl, SKILL_ICONS, SPELL_ICONS } from "@/data/skill-icons";

describe("skill icons map", () => {
  it("has no key collisions between skills and branches", () => {
    const overlap = Object.keys(SKILL_ICONS).filter((k) => k in BRANCH_ICONS);

    expect(overlap).toEqual([]);
  });

  it("uses only H5 wiki source files", () => {
    for (const file of [...Object.values(SKILL_ICONS), ...Object.values(BRANCH_ICONS)]) {
      expect(file).toMatch(/^H5[A-Za-z]+\.(png|PNG)$/);
    }
  });

  it("covers 8 branches × (branch + 3 levels)", () => {
    expect(Object.keys(BRANCH_ICONS)).toHaveLength(32);
  });

  it("has 28 racial icons from H5 racial skills in the skill bucket", () => {
    const racial = Object.entries(SKILL_ICONS).filter(([k]) => k.startsWith("racial-"));

    expect(racial).toHaveLength(28);

    for (const [key, file] of racial) {
      expect(file).toMatch(/^H5(Basic|Advanced|Expert|Ultimate)[A-Za-z]+\.png$/);
      expect(iconBucket(key)).toBe("skill-icons");
    }
  });

  it("builds a public storage url per bucket", () => {
    expect(iconBucket("attack")).toBe("main-skill-icons");
    expect(iconBucket("cleaving-strike")).toBe("skill-icons");
    expect(iconPublicUrl("https://x.supabase.co", "cleaving-strike")).toBe(
      "https://x.supabase.co/storage/v1/object/public/skill-icons/cleaving-strike.webp",
    );
  });

  it("serves spell icons from the spell-icons bucket, even when a skill shares the key", () => {
    expect(iconBucket("eternal-light")).toBe("skill-icons");
    expect(iconBucket("eternal-light", "spell")).toBe("spell-icons");
    expect(iconPublicUrl("https://x.supabase.co", "haste", "spell")).toBe("https://x.supabase.co/storage/v1/object/public/spell-icons/haste.webp");
    expect(Object.keys(SPELL_ICONS)).toHaveLength(50);
  });
});
