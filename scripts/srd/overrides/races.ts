import type { AbilityCore } from "../lib/abilities";

const darkvision = (range: number): AbilityCore => ({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "sense", sense: "darkvision", range }] });

export const RACE_OVERRIDES: Record<string, AbilityCore> = {
  "srd-2024_dwarf_dwarven-resilience": { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "poison", percent: 50 }] },
  "srd-2024_dwarf_dwarven-toughness": { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] },
  "srd-2024_gnome_gnomish-cunning": { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: ["intelligence", "wisdom", "charisma"] }] },
  "srd-2024_goliath_speed": { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] },
  "srd-2024_orc_relentless-endurance": { trigger: { event: "lethalDamage" }, limits: { perRest: { rest: "long", uses: 1 } }, effects: [{ kind: "heal", amount: 1, revive: true }] },
  "srd-2024_dragonborn_darkvision": darkvision(60),
  "srd-2024_dwarf_darkvision": darkvision(120),
  "srd-2024_elf_darkvision": darkvision(60),
  "srd-2024_gnome_darkvision": darkvision(60),
  "srd-2024_orc_darkvision": darkvision(120),
  "srd-2024_tiefling_darkvision": darkvision(60),
  "srd-2024_dwarf_stonecunning": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "flag", flag: "sense", sense: "tremorsense", range: 60, duration: { rounds: 99 }, target: "self" }] },
  // the Temporary Hit Points (= proficiency bonus) have no effect kind yet: the DM grants them
  "srd-2024_orc_adrenaline-rush": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "short", uses: { formula: "prof" } } },
    effects: [{ kind: "modifyStat", stat: "speed", percent: 100, until: "turnEnd", duration: { rounds: 1 }, target: "self" }, { kind: "note", text: "Temporary Hit Points = Proficiency Bonus" }],
  },
};
