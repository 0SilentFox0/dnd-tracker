import { describe, expect, it } from "vitest";

import { FeatPrerequisiteSchema } from "@/lib/schemas/choices";
import { createClassSchema } from "@/lib/schemas/classes";
import { createSpellSchema } from "@/lib/schemas/spells";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { classFeatureAbilities } from "@/lib/utils/abilities/read";
import { castSpell } from "@/lib/utils/battle/spell/cast";
import { assertManualActivation } from "@/lib/utils/spells/model/execution";
import { readSpellDefinition, spellDefinitionColumns } from "@/lib/utils/spells/model/read";

describe("imported manual domain contracts", () => {
  it("requires an explicit complete mechanical edit before enabling an imported manual spell", () => {
    expect(() => assertManualActivation("manual", { executionMode: "native", name: "Rename" })).toThrow();
    expect(() => assertManualActivation("manual", { name: "Rename" })).not.toThrow();
    expect(() => assertManualActivation("manual", { executionMode: "native", dice: 0, cost: "action", targeting: { kind: "self" }, resolution: { kind: "auto" }, spellEffects: [] })).not.toThrow();
  });
  it("preserves descriptive features and manual prerequisites", () => {
    const parsed = createClassSchema.parse({ name: "Synthetic", features: [{ level: 1, description: "Handle manually", abilities: [] }] });

    expect(classFeatureAbilities(parsed.features)[0]).toHaveProperty("description", "Handle manually");
    expect(FeatPrerequisiteSchema.parse({ manualText: ["DM must check"] })).toHaveProperty("manualText", ["DM must check"]);
  });

  it("preserves manual execution through schema and rule snapshot roundtrips", () => {
    const row = createSpellSchema.parse({ name: "Synthetic", executionMode: "manual" });

    expect(row).toHaveProperty("executionMode", "manual");

    const definition = readSpellDefinition({ id: "s", ...row });

    expect(definition).toHaveProperty("executionMode", "manual");
    expect(spellDefinitionColumns(definition)).toHaveProperty("executionMode", "manual");
  });

  it.each([false, true])("blocks manual casts before slots, actions, unhide or effects (DM=%s)", (isDMCast) => {
    const caster = makeParticipant({ id: "c" });

    caster.spellcasting.spellSlots = { "1": { current: 2, max: 2 } };

    const before = structuredClone(caster);

    const definition = readSpellDefinition({ id: "s", executionMode: "manual" } as Parameters<typeof readSpellDefinition>[0]);

    const result = castSpell({ caster, spell: { id: "s", name: "Manual", level: 1, groupId: null, definition }, targetIds: ["c"], allParticipants: [caster], currentRound: 1, battleId: "b", diceRolls: [], isDMCast });

    expect(result.success).toBe(false);
    expect(result.casterUpdated).toEqual(before);
    expect(result.allParticipantsUpdated).toEqual([before]);
    expect(JSON.stringify(result.messages)).toContain("battleActions.reject.manualSpell");
  });
});
