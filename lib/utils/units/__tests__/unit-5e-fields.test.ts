import { describe, expect, it } from "vitest";

import { importUnitSchema } from "@/lib/schemas/units";
import { toUnitCreateData } from "@/lib/utils/units/import-units";
import { toUnit } from "@/lib/utils/units/to-unit";
import { applyChallenge, buildUnitFormData, emptyUnitFormDefaults } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

describe("unit 5e fields through form, toUnit, import", () => {
  it("toUnit віддає поля 5e і чистить рятівні кидки", () => {
    const unit = toUnit({ id: "u1", campaignId: "c1", name: "Огр", raceId: null, attacks: [], immunities: [], knownSpells: [], abilities: [], cr: 2, xp: null, multiattack: 2, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: ["strength", "x"] } as never);

    expect(unit).toMatchObject({ cr: 2, xp: null, multiattack: 2, saveProficiencies: ["strength"] });
  });

  it("форма: дефолти HOMM; юніт без полів 5e читається як HOMM", () => {
    expect(emptyUnitFormDefaults()).toMatchObject({ cr: null, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] });
    expect(buildUnitFormData({ id: "u1", name: "Гоблін", attacks: [] } as unknown as Unit)).toMatchObject({ cr: null, multiattack: 1, saveProficiencies: [] });
  });

  it("applyChallenge підставляє майстерність з CR; зняття CR майстерність не чіпає", () => {
    expect(applyChallenge(9)).toEqual({ cr: 9, proficiencyBonus: 4 });
    expect(applyChallenge(null)).toEqual({ cr: null });
  });

  it("імпорт переносить поля 5e у рядок", () => {
    const row = importUnitSchema.parse({ name: "Огр", cr: 2, legendaryActions: 1 });

    expect(toUnitCreateData("c1", row, null)).toMatchObject({ cr: 2, xp: null, multiattack: 1, legendaryActions: 1, legendaryResistances: 0, saveProficiencies: [] });
  });
});
