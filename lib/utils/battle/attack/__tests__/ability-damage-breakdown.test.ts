import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { rowLines } from "@/lib/utils/battle/log/__tests__/event-text";

const dagger = { id: "dg", name: "Кинджал", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d4", damageType: "piercing" };

const sneak = resolved({ name: "Sneak Attack", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dealDamage", amount: 7, target: "eventTarget" }] });

describe("додаткова шкода вмінь при влучанні (Sneak Attack)", () => {
  const run = () => {
    const base = makeParticipant({ id: "r", abilities: [sneak] });

    const rogue = { ...base, battleData: { ...base.battleData, attacks: [dagger] } };

    const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

    const r = processAttack({ attacker: rogue, target, attack: dagger, d20Roll: 15, damageRolls: [3], allParticipants: [rogue, target], currentRound: 1, battleId: "b1", rng: seq(0.5) });

    return { r, hp: r.allParticipantsUpdated?.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp ?? 0 };
  };

  it("виводиться окремим рядком і входить у суму та hpChanges", () => {
    const { r, hp } = run();

    const dealt = 50 - hp;

    expect(dealt).toBeGreaterThan(7);

    const d = r.battleAction.actionDetails;

    expect(rowLines(d?.damageRows ?? [])).toContain("Sneak Attack: +7");
    expect(d?.totalDamage).toBe(dealt);
    expect(r.battleAction.hpChanges.find((c) => c.participantId === "t")?.change).toBe(dealt);
    expect(r.damage?.finalDamage).toBe(dealt);
  });
});
