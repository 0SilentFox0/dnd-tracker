import { describe, expect, it } from "vitest";

import { applyClassChoices } from "../convert/class-choices";
import { convertClasses } from "../convert/classes";
import { convertFeats } from "../convert/feats";
import { applyRaceChoices } from "../convert/race-choices";
import { convertRaces } from "../convert/races";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

const data = loadOpen5e(FIXTURE_4F4_DIR);

const classes = applyClassChoices(convertClasses(data));

const choices = (name: string) => classes.find((c) => c.name === name)?.features.flatMap((f) => f.choices ?? []) ?? [];

describe("SRD hero spell grants", () => {
  it("Magic Initiate grants its level-one spell once per long rest with slot access", () => {
    expect(convertFeats(data).find((f) => f.name === "Magic Initiate")?.choices.find((c) => c.id === "level-one-spell")?.grant).toMatchObject({ uses: 1, rest: "long", castLevel: 1, via: "slotOrGrant" });
  });
  it("Mystic Arcanum supplies separate choices at levels 11/13/15/17", () => {
    expect(choices("Warlock").filter((c) => c.id.startsWith("mystic-arcanum")).map((c) => [c.level, c.spells?.minLevel, c.spells?.maxLevel, c.grant])).toEqual([6, 7, 8, 9].map((level, i) => [11 + i * 2, level, level, { uses: 1, rest: "long", castLevel: level, via: "grant" }]));
  });
  it("Signature Spells grants two level-three spells with separate short rest limits", () => {
    expect(choices("Wizard").find((c) => c.id.startsWith("signature-spells"))).toMatchObject({ count: 2, spells: { minLevel: 3, maxLevel: 3 }, grant: { uses: 1, rest: "short", castLevel: 3, via: "slotOrGrant" } });
  });
  it("lineage leveled spells gain free long-rest casts while cantrips remain ordinary", () => {
    const wood = applyRaceChoices(convertRaces(data), data).find((r) => r.name === "Elf")?.choices?.flatMap((c) => c.options ?? []).find((o) => o.id === "wood-elf");

    expect(wood?.spells?.[0].grant).toBeUndefined();
    expect(wood?.spells?.[1].grant).toMatchObject({ uses: 1, rest: "long", castLevel: 1, via: "slotOrGrant" });
  });
});
