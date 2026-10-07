import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { abilityActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

const angel = resolved({
  id: "ang",
  name: "Ангел Хранитель",
  trigger: { event: "action" },
  condition: { type: "targetDead" },
  limits: { perBattle: 1 },
  effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 50 }, revive: true, target: "eventTarget" }],
});

const strike = resolved({ id: "st", name: "Удар", trigger: { event: "action" }, limits: { perBattle: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const base = participant("hero", { controlledBy: "user-1" }, {});

const hero: BattleParticipant = { ...base, battleData: { ...base.battleData, resolvedAbilities: [angel, strike] } };

const fallen = (): BattleParticipant => {
  const p = participant("ally", { side: ParticipantSide.ALLY, controlledBy: "user-2" }, {});

  return { ...p, combatStats: { ...p.combatStats, currentHp: 0, maxHp: 40, status: "dead" } } as BattleParticipant;
};

const run = (ps: BattleParticipant[], abilityKey: string, targetParticipantIds?: string[]) =>
  abilityActionMutation(context({ participants: ps }), { participantId: "hero", abilityKey, targetParticipantIds });

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe("abilityActionMutation", () => {
  it("consumes the main action and records the use", () => {
    const h = find(run([hero, goblin], strike.key).participants, "hero");

    expect(h.actionFlags.hasUsedAction).toBe(true);
    expect(h.combatStats.morale).toBe(1);
    expect(h.battleData.abilityUsage?.[strike.key].battle).toBe(1);
  });

  it("second action in the same turn is rejected", () => {
    const used = { ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: true } };

    expect(() => run([used, goblin], strike.key)).toThrow(expect.objectContaining({ code: "action_used" }));
  });

  it("respects the perBattle limit", () => {
    const spent = { ...hero, battleData: { ...hero.battleData, abilityUsage: { [strike.key]: { battle: 1, round: 1, turn: 1 } } } };

    expect(() => run([spent, goblin], strike.key)).toThrow(expect.objectContaining({ code: "ability_limit" }));
  });

  it("Ангел Хранитель revives a fallen ally at 50 %, a living target is rejected", () => {
    const out = run([hero, fallen()], angel.key, ["ally"]);

    expect(find(out.participants, "ally").combatStats).toMatchObject({ currentHp: 20, status: "active" });
    expect(find(out.participants, "hero").actionFlags.hasUsedAction).toBe(true);
    expect(() => run([hero, goblin], angel.key, ["gob"])).toThrow(expect.objectContaining({ code: "invalid_target" }));
  });

  it("bonus-action abilities are not usable as the main action", () => {
    const bonus = resolved({ id: "b", trigger: { event: "bonusAction" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const h = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [bonus] } };

    expect(() => run([h, goblin], bonus.key)).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });
});
