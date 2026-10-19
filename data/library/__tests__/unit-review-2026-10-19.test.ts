import { describe, expect, it } from "vitest";

import { UNITS } from "@/data/library/units";
import { onslaught } from "@/data/library/units/mages";
import { AbilitySchema } from "@/lib/utils/abilities/schema";

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
    for (const key of ["dark-elves-blood-maiden", "dark-elves-blood-fury", "dark-elves-blood-sister"]) expect(abilityNames(key)).toContain("Удар і повернення");
    expect(abilityNames("elves-wind-dancer")).toEqual(["Танець вітру"]);
    expect(abilityNames("elves-light-unicorn")).toEqual(["Аура опору магії", "Світле відлуння"]);
    expect(abilityNames("elves-wild-ent")).toContain("Сплутування");
    expect(abilityNames("mages-archmage")).toContain("Енергетичний канал");
    for (const key of ["necromancers-skeleton", "necromancers-skeleton-archer", "necromancers-skeleton-warrior"]) expect(abilityNames(key)).not.toContain("Кістяне тіло");
    expect(abilityNames("necromancers-skeleton-warrior")).toContain("Великий щит");
    expect(abilityNames("humans-defender-of-faith")).toEqual(["Подвійна відсіч"]);
    expect(abilityNames("mages-rakshasa-kshatriya")).toContain("Натиск");
    expect(abilityNames("mages-elemental-gargoyle")).toEqual(["Механізм", "Аура стихій"]);
    expect(abilityNames("mages-magnetic-golem")).toContain("Магнітне поле");
    for (const key of ["mages-elemental-gargoyle", "mages-magnetic-golem"]) for (const a of unit(key).abilities) expect(AbilitySchema.safeParse(a).success).toBe(true);
    expect(abilityNames("dark-elves-shadow-mistress")).toEqual(["Тіньове прокляття"]);
    expect(unit("dark-elves-shadow-mistress").spellKeys).toEqual(["suffering"]);
    expect(AbilitySchema.safeParse(onslaught).success).toBe(true);
  });
});
