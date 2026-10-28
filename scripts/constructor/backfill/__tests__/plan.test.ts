import { describe, expect, it } from "vitest";

import { type CampaignRows, planBackfill } from "../plan";

const empty: CampaignRows = { spells: [], spellGroups: [], mainSkills: [], races: [], units: [], personalSkills: [] };

describe("planBackfill", () => {
  it("fills empty fields by name", () => {
    const { changes } = planBackfill({
      ...empty,
      spells: [{ id: "s", name: "Рій ос", fx: null }],
      spellGroups: [{ id: "g", name: "Темрява", color: null, icon: null }],
      mainSkills: [{ id: "m", name: "Магія Світла", role: null }],
      races: [{ id: "r", name: "Elf", abilities: [], passiveAbility: "Імунітет до вогню" }],
      units: [{ id: "u", name: "Файдаен", abilities: [] }],
    });

    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "spell", id: "s" }),
      expect.objectContaining({ table: "spellGroup", id: "g", data: { color: "#7a1fe6", icon: "moon" } }),
      expect.objectContaining({ table: "mainSkill", id: "m", data: { role: "magic" } }),
      expect.objectContaining({ table: "race", id: "r" }),
      expect.objectContaining({ table: "unit", id: "u" }),
    ]));
  });

  it("race gets elf eye AND immunities in one change (abilities merged, immunity computed from the original row)", () => {
    const { changes } = planBackfill({ ...empty, races: [{ id: "r", name: "Elf", abilities: [], passiveAbility: "Імунітет до вогню" }] });

    const race = changes.filter((c) => c.table === "race");

    expect(race).toHaveLength(1);
    expect((race[0].data as { abilities: unknown[] }).abilities).toHaveLength(2);
  });

  it("never overwrites filled fields and is idempotent", () => {
    const rows: CampaignRows = {
      ...empty,
      spells: [{ id: "s", name: "Рій ос", fx: { archetype: "bolt" } }],
      spellGroups: [{ id: "g", name: "Темрява", color: "#000000", icon: "sun" }],
      mainSkills: [{ id: "m", name: "Магія Світла", role: "attack" }],
    };

    expect(planBackfill(rows).changes).toEqual([]);
  });

  it("unknown names produce no changes", () => {
    expect(planBackfill({ ...empty, spells: [{ id: "s", name: "Новий спел", fx: null }] }).changes).toEqual([]);
  });

  it("warns about always-first heroes without a personal skill", () => {
    const { warnings } = planBackfill({ ...empty, charactersWithoutPersonalSkill: ["Айвен", "Інший"] });

    expect(warnings).toEqual(["Герой Айвен: немає персонального скіла — додайте здібність вручну"]);
  });

  it("keeps an invalid existing ability and unknown keys when appending", () => {
    const existing = [{ id: "bad", custom: 1 }];

    const { changes } = planBackfill({ ...empty, units: [{ id: "u", name: "Файдаен", abilities: existing }] });

    expect((changes[0] as { data: { abilities: unknown[] } }).data.abilities[0]).toEqual(existing[0]);
  });

  it("warns instead of writing when abilities is not an array", () => {
    const { changes, warnings } = planBackfill({ ...empty, units: [{ id: "u", name: "Файдаен", abilities: null }] });

    expect(changes).toEqual([]);
    expect(warnings).toHaveLength(1);
  });
});
