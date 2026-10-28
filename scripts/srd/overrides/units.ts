import type { UnitRow } from "../lib/types";

export const UNIT_OVERRIDES: Record<string, Partial<Pick<UnitRow, "multiattack" | "legendaryActions" | "legendaryResistances" | "constitution" | "charisma" | "saveProficiencies">>> = {
  // «as many Bite attacks as it has heads» — starts with five heads
  "srd-2024_hydra": { multiattack: 5 },
  // Open5e carries Con 0 / Cha −3 with a +30 Con save; SRD 5.2 has Con 11, Cha 4 and no save proficiencies
  "srd-2024_octopus": { constitution: 11, charisma: 4, saveProficiencies: [] },
};
