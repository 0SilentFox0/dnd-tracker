import { describe, expect, it, vi } from "vitest";

import { createCritGate } from "../gate";

import { AttackType,ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { calculateAttackRoll } from "@/lib/utils/battle/attack/roll";
import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";
import { mulberry32 } from "@/lib/utils/common/rng";
import type { BattleAttack } from "@/types/battle";

const info = { source: "attack", kind: "success", actorId: "a", targetId: "t" } as const;

describe("createCritGate", () => {
  it("нумерує ключі тригерів одного актора й цілі", () => {
    const gate = createCritGate({ rng: mulberry32(1) });

    gate.pick(info);
    gate.pick(info);

    expect(gate.triggers.map((t) => t.key)).toEqual(["attack:a:t:0", "attack:a:t:1"]);
  });

  it("повертає обраний ефект, без вибору - випадковий", () => {
    const target = critEffectsFor("attack", "success")[2];

    const chosen = createCritGate({ rng: mulberry32(1), choices: { "attack:a:t:0": target.id } });

    expect(chosen.pick(info)).toBe(target);

    const random = createCritGate({ rng: mulberry32(1) });

    expect(critEffectsFor("attack", "success")).toContain(random.pick(info));
  });

  it("потік rng не залежить від вибору", () => {
    const withChoice = createCritGate({ rng: mulberry32(7), choices: { "attack:a:t:0": critEffectsFor("attack", "success")[1].id } });

    const without = createCritGate({ rng: mulberry32(7) });

    for (let i = 0; i < 3; i++) {
      withChoice.pick(info);
      without.pick(info);
    }

    expect(withChoice.rng()).toBe(without.rng());
  });
});

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

describe("crit picker plumbing", () => {
  const attacker = makeParticipant({ id: "a", side: ParticipantSide.ALLY, hp: 30, maxHp: 30 });

  it("calculateAttackRoll кличе picker на 20 і 1, не кличе на 10", () => {
    const crit = vi.fn(() => critEffectsFor("attack", "success")[0]);

    calculateAttackRoll(attacker, sword, 20, undefined, undefined, { targetId: "t", crit });
    expect(crit).toHaveBeenLastCalledWith({ source: "attack", kind: "success", actorId: "a", targetId: "t" });

    calculateAttackRoll(attacker, sword, 1, undefined, undefined, { targetId: "t", crit });
    expect(crit).toHaveBeenLastCalledWith({ source: "attack", kind: "fail", actorId: "a", targetId: "t" });

    crit.mockClear();
    calculateAttackRoll(attacker, sword, 10, undefined, undefined, { targetId: "t", crit });
    expect(crit).not.toHaveBeenCalled();
  });

  it("відсіч з нат. 1 передає picker", () => {
    const unit = (id: string, side: ParticipantSide) => {
      const p = makeParticipant({ id, side, hp: 30, maxHp: 30 });

      return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, battleData: { ...p.battleData, attacks: [sword] } };
    };

    const crit = vi.fn(() => critEffectsFor("attack", "fail")[0]);

    resolveRetaliation({
      participants: [unit("a", ParticipantSide.ALLY), unit("d", ParticipantSide.ENEMY)],
      attackerId: "a",
      defenderId: "d",
      attack: sword,
      attackRoll: { isCriticalFail: false },
      round: 1,
      battleId: "b1",
      rng: seq(0, 0.5, 0.5, 0.5),
      crit,
    });

    expect(crit).toHaveBeenCalledWith({ source: "attack", kind: "fail", actorId: "d", targetId: "a" });
  });
});
