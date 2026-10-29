import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { eventTextOf, rowLines } from "@/lib/utils/battle/log/__tests__/event-text";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const crit = () => {
  const attacker = makeParticipant({ id: "a" });

  const target = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

  return processAttack({ attacker, target, attack: sword, d20Roll: 20, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b1", rng: seq(0.55) });
};

describe("the attack log reads in the viewer's language", () => {
  it("a critical hit with its effect and damage: uk and en from the same event", () => {
    const { battleAction } = crit();

    const uk = eventTextOf(battleAction, "uk");

    const en = eventTextOf(battleAction, "en");

    expect(uk).toMatch(/a → e: \d+ шкоди\. Критичне влучання — /);
    expect(en).toMatch(/a → e: \d+ damage\. Critical hit — /);
    expect(en).not.toMatch(/battleLog\.|battleTerms\./);
    expect(battleAction.resultText).toBe("");
  });

  it("the damage table rows translate too", () => {
    const rows = crit().battleAction.actionDetails.damageRows ?? [];

    expect(rowLines(rows, "uk")[0]).toBe("Кубики 4");
    expect(rowLines(rows, "en")[0]).toBe("Dice 4");
    expect(rowLines(rows, "en").join(" ")).toContain("Strength");
  });
});
