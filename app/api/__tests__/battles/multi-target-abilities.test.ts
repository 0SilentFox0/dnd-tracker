import { describe, expect, it } from "vitest";

import { context, participant } from "./fixtures";

import { bonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { calculateAttackRoll } from "@/lib/utils/battle/attack/roll";
import { toggleAbilityTarget } from "@/lib/utils/battle/validation/ability-targets";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const hunt = resolved({
  id: "hunt",
  name: "Полювання",
  trigger: { event: "bonusAction" },
  maxTargets: 3,
  effects: [{ kind: "flag", flag: "advantageForAttackers", duration: { rounds: 1 }, target: "eventTarget" }],
});

const base = participant("hero", { controlledBy: "user-1" }, {});

const hero: BattleParticipant = { ...base, battleData: { ...base.battleData, resolvedAbilities: [hunt] } };

const foes = ["f1", "f2", "f3", "f4"].map((id) => participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm" }, {}));

const run = (ids: string[]) => bonusActionMutation(context({ participants: [hero, ...foes] }), { participantId: "hero", abilityKey: hunt.key, targetParticipantIds: ids });

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

describe("multi-target abilities", () => {
  it("marks up to maxTargets enemies; legacy single target still accepted", () => {
    const out = run(["f1", "f2", "f3"]);

    for (const id of ["f1", "f2", "f3"]) expect(out.participants.find((p) => p.basicInfo.id === id)?.battleData.activeEffects).toHaveLength(1);

    expect(out.participants.find((p) => p.basicInfo.id === "f4")?.battleData.activeEffects).toHaveLength(0);

    const single = bonusActionMutation(context({ participants: [hero, ...foes] }), { participantId: "hero", abilityKey: hunt.key, targetParticipantId: "f1" });

    expect(single.participants.find((p) => p.basicInfo.id === "f1")?.battleData.activeEffects).toHaveLength(1);
  });

  it("4 targets or an unknown target is rejected", () => {
    expect(() => run(["f1", "f2", "f3", "f4"])).toThrow(expect.objectContaining({ code: "invalid_target" }));
    expect(() => run(["nobody"])).toThrow(expect.objectContaining({ code: "invalid_target" }));
  });

  it("attackers of a marked enemy get advantage; disadvantage cancels it", () => {
    const marked = run(["f1"]).participants;

    const target = marked.find((p) => p.basicInfo.id === "f1") as BattleParticipant;

    const ally = participant("ally", { side: ParticipantSide.ALLY }, {});

    const roll = (attacker: BattleParticipant) => calculateAttackRoll(attacker, sword, 5, 17, 3, { participants: marked, targetId: "f1", rng: seq(0) });

    expect(target.battleData.activeEffects).toHaveLength(1);
    expect(roll(ally).advantageUsed).toBe(true);

    const slowed = { ...ally, battleData: { ...ally.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "disadvantage" }] })] } };

    expect(roll(slowed).advantageUsed).toBe(false);
  });

  it("duplicate ids count as one target", () => {
    const out = run(["f1", "f1", "f1", "f1"]);

    expect(out.participants.find((p) => p.basicInfo.id === "f1")?.battleData.activeEffects).toHaveLength(1);
  });

  it("toggleAbilityTarget caps the selection", () => {
    expect(toggleAbilityTarget(["a", "b"], "c", 2)).toEqual(["a", "b"]);
    expect(toggleAbilityTarget(["a", "b"], "a", 2)).toEqual(["b"]);
  });
});
