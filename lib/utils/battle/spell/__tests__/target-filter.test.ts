import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { movementBudget } from "@/lib/utils/battle/grid/path";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import { refreshFromSource } from "@/lib/utils/battle/participant/refresh-from-source";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { matchesTargetFilter } from "@/lib/utils/battle/spell/target-filter";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { SpellTargetingSchema } from "@/lib/utils/spells/model/schema";

const foe = (id: string, abilities: { creatureType?: string; cr?: number }, fly?: number) => {
  const p = makeParticipant({ id, side: ParticipantSide.ENEMY });

  return { ...p, abilities: { ...p.abilities, ...abilities }, battleData: { ...p.battleData, ...(fly && { movement: { fly } }) } };
};

const level = { spellLevel: 4 };

describe("matchesTargetFilter", () => {
  const filter = { creatureTypes: ["Beast"], maxCr: 2, maxCrPerLevel: 1 };

  it("beast maxCr 2 rejects CR 3 and a unit without type or CR", () => {
    expect(matchesTargetFilter(foe("a", { creatureType: "beast", cr: 2 }), filter, level)).toBe(true);
    expect(matchesTargetFilter(foe("b", { creatureType: "beast", cr: 3 }), filter, level)).toBe(false);
    expect(matchesTargetFilter(foe("c", {}), filter, level)).toBe(false);
    expect(matchesTargetFilter(foe("d", { creatureType: "beast" }), filter, level)).toBe(false);
    expect(matchesTargetFilter(foe("e", { creatureType: "undead", cr: 1 }), filter, level)).toBe(false);
  });

  it("one slot above lets CR 3 through", () => {
    const cr3 = foe("b", { creatureType: " BEAST ", cr: 3 });

    expect(matchesTargetFilter(cr3, filter, { spellLevel: 4, castLevel: 5 })).toBe(true);
    expect(matchesTargetFilter(cr3, filter, { spellLevel: 4, castLevel: 4 })).toBe(false);
  });

  it("fly movement rejects a walker", () => {
    expect(matchesTargetFilter(foe("w", {}), { movement: "fly" }, level)).toBe(false);
    expect(matchesTargetFilter(foe("f", {}, 30), { movement: "fly" }, level)).toBe(true);
  });

  it("no filter passes everyone", () => {
    expect(matchesTargetFilter(foe("w", {}), undefined, level)).toBe(true);
  });
});

describe("resolveSpellTargets with filter", () => {
  const caster = makeParticipant({ id: "c" });

  const targeting = SpellTargetingSchema.parse({ kind: "enemy", filter: { creatureTypes: ["beast"], maxCr: 2 } });

  const spell = { id: "s", groupId: null, level: 4 };

  it("a picked target that fails the filter is an error", () => {
    const ok = foe("a", { creatureType: "beast", cr: 1 });

    const bad = foe("b", { creatureType: "beast", cr: 5 });

    expect(resolveSpellTargets([caster, ok, bad], caster, spell, targeting, ["a"])).toMatchObject({ ok: true, targetIds: ["a"] });
    expect(resolveSpellTargets([caster, ok, bad], caster, spell, targeting, ["b"])).toMatchObject({ ok: false });
  });
});

describe("modifyStat atLeast for armor and speed", () => {
  const withEffect = (stat: "armor" | "speed", atLeast: number) => {
    const p = makeParticipant({ id: "a" });

    return { ...p, battleData: { ...p.battleData, activeEffects: [makeEffect("e", { abilityEffects: [{ kind: "modifyStat", stat, atLeast, duration: { rounds: 3 } }] })] } };
  };

  it("armor 20 lifts 15 and does not lower 21", () => {
    const p = withEffect("armor", 20);

    expect(statWithModifiers([p], "a", "armor", 15)).toBe(20);
    expect(statWithModifiers([p], "a", "armor", 21)).toBe(21);
  });

  it("speed at least 60 raises the movement budget", () => {
    const p = withEffect("speed", 60);

    expect(movementBudget({ ...p, combatStats: { ...p.combatStats, speed: 30 } })).toBe(12);
  });

  it("schema: armor/speed atLeast needs a duration, abilities stay capped at 30", () => {
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "armor", atLeast: 20, duration: { rounds: 3 } }).success).toBe(true);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "speed", atLeast: 60 }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 40 }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 19 }).success).toBe(true);
  });
});

describe("abilities.cr in the snapshot", () => {
  const unit = (cr?: number) =>
    ({
      id: "u1", campaignId: "c1", name: "Звір", race: "", raceId: null, level: 1, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 12, initiative: 0, speed: 30, maxHp: 7, proficiencyBonus: 2, attacks: [], specialAbilities: [], knownSpells: [], immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [], ...(cr !== undefined && { cr }),
    }) as unknown as UnitFromPrisma;

  it("monster CR is written and refreshed; a unit without CR has none", async () => {
    const monster = await createBattleParticipantFromUnit(unit(0.5), "b", ParticipantSide.ENEMY, 1);

    expect(monster.abilities.cr).toBe(0.5);

    const plain = await createBattleParticipantFromUnit(unit(), "b", ParticipantSide.ENEMY, 1);

    expect(plain.abilities.cr).toBeUndefined();
    expect(refreshFromSource(plain, monster).abilities.cr).toBe(0.5);
  });
});
