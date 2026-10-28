import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { ConditionSchema } from "@/lib/utils/abilities/schema";

const owner = makeParticipant({ id: "a" });

const dragon = makeParticipant({ id: "dragon" });

dragon.abilities.creatureType = "Dragon";

const undead = makeParticipant({ id: "undead" });

undead.abilities.creatureType = "undead";

const unknown = makeParticipant({ id: "unknown" });

const participants = [owner, dragon, undead, unknown];

describe("targetCreatureType", () => {
  it("uses the current damage target for passive creature bonuses", () => {
    const caster = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, condition: { type: "targetCreatureType", types: ["dragon"] }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: 2 }] })] });

    const ps = [caster, dragon, undead];

    expect(collectModifiers(ps, "a", { damage: { kind: "melee", targetId: "dragon" } }).flat).toBe(2);
    expect(collectModifiers(ps, "a", { damage: { kind: "melee", targetId: "undead" } }).flat).toBe(0);
    expect(collectModifiers(ps, "a", { damage: { kind: "melee" } }).flat).toBe(0);
  });

  it("filters every target of one area event", () => {
    const ability = resolved({ trigger: { event: "spellCast", phase: "after", role: "caster" }, condition: { type: "targetCreatureType", types: ["dragon"] }, effects: [{ kind: "dealDamage", amount: 3, damageType: "radiant", target: "eventTarget" }] });

    const caster = makeParticipant({ id: "a", abilities: [ability] });

    const before = [caster, dragon, undead, unknown];

    const out = runAbilities(before, { type: "spellCast", phase: "after", actorId: "a", targetIds: ["dragon", "undead", "unknown"] }, { round: 1, rng: () => 0.5 });

    expect(out.participants.slice(1).map((p, i) => before[i + 1].combatStats.currentHp - p.combatStats.currentHp)).toEqual([3, 0, 0]);
  });
  it("validates and matches each current target, never the caster or an unknown type", () => {
    const parsed = ConditionSchema.safeParse({ type: "targetCreatureType", types: ["dragon"] });

    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    const results = [dragon, undead, unknown].map((target) => evaluateCondition(parsed.data, {
      owner, participants, event: { type: "hit", actorId: "a", targetId: target.basicInfo.id, attackKind: "melee", damage: 1 },
    }));

    expect(results).toEqual([true, false, false]);
    expect(evaluateCondition(parsed.data, { owner: dragon, participants, event: null })).toBe(false);
  });
});
