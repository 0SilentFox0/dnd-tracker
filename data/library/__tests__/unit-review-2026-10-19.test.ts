import { describe, expect, it } from "vitest";

import { UNITS } from "@/data/library/units";

const unit = (key: string) => {
  const u = UNITS.find((x) => x.key === key);

  if (!u) throw new Error(key);

  return u;
};

const abilityNames = (key: string) => unit(key).abilities.map((a) => a.name);

describe("огляд юнітів 2026-10-19 — дані", () => {
  it("заклинання", () => {
    expect(unit("dark-elves-shadow-witch").spellKeys).toEqual(["weakness", "slow", "frailty", "plague"]);
    expect(unit("dark-elves-shadow-matriarch").spellKeys).toEqual(["weakness", "slow", "frailty", "plague", "confusion", "suffering", "sorrow"]);
    expect(unit("mages-mage").spellKeys).toEqual(["eldritch-arrow", "stone-spikes", "ice-bolt", "lightning-bolt", "summon-air-elemental"]);
    expect(unit("mages-archmage").spellKeys).toEqual(["fireball", "fire-wall", "circle-of-winter", "chain-lightning", "meteor-shower", "cleansing"]);
    expect(unit("demons-cave-demon").spellKeys).toEqual(["fireball", "frailty"]);
    expect(unit("demons-cave-lord").spellKeys).toEqual(["fireball", "frailty", "meteor-shower"]);
    expect(unit("elves-druid").spellKeys).toEqual(["lightning-bolt", "stone-spikes"]);
    expect(unit("elves-elder-druid").spellKeys).toEqual(["lightning-bolt", "stone-spikes", "stoneskin"]);
    expect(unit("dwarves-flame-priest").spellKeys).toEqual(["ice-bolt", "lightning-bolt", "fireball", "fire-wall"]);
    expect(unit("dwarves-arkat-priest").spellKeys).toContain("evasion");
  });

  it("здібності", () => {
    expect(abilityNames("elves-forest-ranger")).toEqual(["Приголомшливий постріл"]);
    expect(abilityNames("elves-wild-ent")).toContain("Сплутування");
    expect(abilityNames("mages-archmage")).toContain("Енергетичний канал");
    for (const key of ["necromancers-skeleton", "necromancers-skeleton-archer", "necromancers-skeleton-warrior"]) expect(abilityNames(key)).not.toContain("Кістяне тіло");
    expect(abilityNames("necromancers-skeleton-warrior")).toContain("Великий щит");
    expect(abilityNames("humans-defender-of-faith")).toEqual(["Подвійна відсіч"]);
  });
});
