import { describe, expect, it } from "vitest";

import { extractAttacksFromCharacter } from "../extract-attacks";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";

const row = (id: string, name: string, stats: Parameters<typeof weaponStatsColumns>[0], item?: ItemStats) => {
  const cols = weaponStatsColumns(stats);

  return { id, name, slot: "weapon", bonuses: cols.bonuses, modifiers: [...cols.modifiers, ...(item ? itemStatsColumns(item).modifiers : [])], abilities: [] };
};

const ROWS = Object.fromEntries(
  [
    row("ls", "Longsword", { damageDice: "1d8", attackType: "melee" }, { unique: false }),
    row("dg", "Dagger", { damageDice: "1d4", traits: ["light", "finesse"] }, { unique: false }),
    row("w2", "Weapon +2", { attackBonus: 2, damageBonus: 2 }, { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "{base} (+2)" } }),
    row("ft", "Flame Tongue", {}, { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }),
  ].map((r) => [r.id, r]),
) as never;

const character = (equipped: Record<string, string>) => ({ id: "c", campaignId: "camp", inventory: { equipped } }) as never;

describe("extractAttacksFromCharacter: item refs", () => {
  it("Longsword (+2): composed attack with attack and damage bonuses", async () => {
    const attacks = await extractAttacksFromCharacter(character({ weapon: "ls+w2" }), ROWS, undefined, { fiveE: true });

    expect(attacks.find((a) => a.id === "ls+w2")).toMatchObject({ name: "Longsword (+2)", attackBonus: 2, damageBonus: 2, damageDice: "1d8" });
  });

  it("two identical daggers: main hand and off hand", async () => {
    const attacks = await extractAttacksFromCharacter(character({ weapon: "dg", shield: "dg" }), ROWS, undefined, { fiveE: true });

    expect(attacks.filter((a) => a.name === "Dagger").map((a) => a.id)).toEqual(["dg", "dg:off"]);
  });

  it("unknown ref is skipped; plain HOMM weapon has no damageBonus", async () => {
    const attacks = await extractAttacksFromCharacter(character({ weapon: "ls+gone" }), ROWS, undefined, { fiveE: true });

    expect(attacks.some((a) => a.id === "ls+gone")).toBe(false);
    expect((await extractAttacksFromCharacter(character({ weapon: "ls" }), ROWS)).find((a) => a.id === "ls")).not.toHaveProperty("damageBonus");
  });

  it("unattuned composed item with items enabled keeps base stats only", async () => {
    const off = await extractAttacksFromCharacter(character({ weapon: "ls+ft" }), ROWS, undefined, { fiveE: true, items: { enabled: true, attuned: [] } });

    expect(off.find((a) => a.id === "ls+ft")).toMatchObject({ name: "Flame Tongue Longsword", damageDice: "1d8" });
  });
});
