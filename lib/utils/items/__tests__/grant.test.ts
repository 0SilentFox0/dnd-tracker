import { describe, expect, it } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { planGrant } from "@/lib/utils/items/grant";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";

const row = (id: string, name: string, slot: string, item?: ItemStats, description?: string) => ({ id, name, slot, description: description ?? null, modifiers: [...(slot === "weapon" ? weaponStatsColumns({ damageDice: "1d8" }).modifiers : []), ...(item ? itemStatsColumns(item).modifiers : [])] });

const rows = new Map(
  [
    row("ls", "Longsword", "weapon", { unique: false }),
    row("ft", "Flame Tongue", "weapon", { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }),
    row("ring", "Ring", "ring", { unique: false }),
    row("pot", "Potion of Healing", "item", { unique: false, consumable: true, spells: [{ spellId: "spell-fire", cost: 1, castLevel: 3, dc: 15 }] }, "Regain 2d4 + 2 HP."),
    row("homm", "Меч", "weapon"),
    row("resistance", "Armor of Resistance ({param})", "armor", { unique: false, parameter: { kind: "damageType", options: [{ key: "fire", label: "Fire" }] } }),
  ].map((r) => [r.id, r]),
);

describe("planGrant", () => {
  it("plain artifact → stash ref", () => {
    expect(planGrant({ artifactId: "homm" }, rows)).toEqual({ ok: true, plan: { kind: "stash", ref: "homm", name: "Меч" } });
  });

  it("property: needs a matching base", () => {
    expect(planGrant({ artifactId: "ft" }, rows)).toEqual({ ok: false, error: "ITEM_PROPERTY_NEEDS_BASE" });
    expect(planGrant({ artifactId: "ft", baseId: "ring" }, rows)).toEqual({ ok: false, error: "ITEM_BASE_MISMATCH" });
    expect(planGrant({ artifactId: "ft", baseId: "gone" }, rows)).toEqual({ ok: false, error: "ITEM_BASE_MISMATCH" });
    expect(planGrant({ artifactId: "ft", baseId: "ls" }, rows)).toEqual({ ok: true, plan: { kind: "stash", ref: "ls+ft", name: "Flame Tongue Longsword" } });
  });

  it("baseId for a non-property is a mismatch; unknown artifact → not found", () => {
    expect(planGrant({ artifactId: "homm", baseId: "ls" }, rows)).toEqual({ ok: false, error: "ITEM_BASE_MISMATCH" });
    expect(planGrant({ artifactId: "nope" }, rows)).toEqual({ ok: false, error: "ARTIFACT_NOT_FOUND" });
  });

  it("parameter selection is required and validated before making a full ref", () => {
    expect(planGrant({ artifactId: "resistance" }, rows)).toEqual({ ok: false, error: "ITEM_PARAMETER_REQUIRED" });
    expect(planGrant({ artifactId: "resistance", parameter: "cold" }, rows)).toEqual({ ok: false, error: "ITEM_PARAMETER_INVALID" });
    expect(planGrant({ artifactId: "resistance", parameter: "fire" }, rows)).toEqual({ ok: true, plan: { kind: "stash", ref: "resistance~fire", name: "Armor of Resistance (fire)" } });
  });

  it("consumable → quantity (default 1, clamped 1–99)", () => {
    expect(planGrant({ artifactId: "pot", quantity: 2 }, rows)).toEqual({ ok: false, error: "ITEM_SPELL_REQUIRED" });
    expect(planGrant({ artifactId: "pot", quantity: 2, spellId: "spell-other" }, rows)).toEqual({ ok: false, error: "ITEM_SPELL_INVALID" });
    expect(planGrant({ artifactId: "pot", quantity: 2, spellId: "spell-fire" }, rows)).toEqual({ ok: true, plan: { kind: "consumable", artifactId: "pot", name: "Potion of Healing", description: "Regain 2d4 + 2 HP.", quantity: 2, spellId: "spell-fire" } });
    expect(planGrant({ artifactId: "pot", spellId: "spell-fire" }, rows)).toMatchObject({ ok: true, plan: { quantity: 1 } });
    expect(planGrant({ artifactId: "pot", quantity: 500, spellId: "spell-fire" }, rows)).toMatchObject({ ok: true, plan: { quantity: 99 } });
  });
});
