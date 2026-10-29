import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { makeEffect, makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { hasLegendaryActions, legendaryAbilities, legendaryBadge, legendaryBlocker, legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import { resetTurnState } from "@/lib/utils/battle/turn/turn-state";
import type { BattleParticipant } from "@/types/battle";

const wing = resolved({ id: "wing", name: "Крила", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const dragon = (actionsLeft = 3, resistLeft = 1): BattleParticipant => {
  const p = makeParticipant({ id: "d", abilities: [wing] });

  return { ...p, battleData: { ...p.battleData, legendary: { actions: 3, actionsLeft, resistLeft } } };
};

const other = makeParticipant({ id: "o" });

describe("legendary options", () => {
  it("вартість і список легендарних вмінь", () => {
    expect(legendaryCostOf(wing)).toBe(2);
    expect(legendaryAbilities(dragon()).map((a) => a.id)).toEqual(["wing"]);
    expect(hasLegendaryActions(dragon())).toBe(true);
    expect(hasLegendaryActions(other)).toBe(false);
  });

  it("блокування: немає дій, свій хід, недієздатний, мертвий, резерв, бюджет", () => {
    expect(textOf(legendaryBlocker(other, undefined)!)).toBe("У учасника немає легендарних дій");
    expect(textOf(legendaryBlocker(dragon(), dragon())!)).toBe("Легендарна дія — лише поза своїм ходом");

    const stunned = { ...dragon(), battleData: { ...dragon().battleData, activeEffects: [makeEffect("s", { type: "condition", effects: [{ type: "incapacitated", value: 1 }] })] } };

    expect(textOf(legendaryBlocker(stunned, other)!)).toBe("Недієздатний учасник не може діяти");
    expect(textOf(legendaryBlocker({ ...dragon(), combatStats: { ...dragon().combatStats, currentHp: 0, status: "dead" } }, other)!)).toBe("Недієздатний учасник не може діяти");
    expect(textOf(legendaryBlocker({ ...dragon(), battleData: { ...dragon().battleData, reserved: true } }, other)!)).toBe("Недієздатний учасник не може діяти");
    expect(textOf(legendaryBlocker(dragon(1), other, 2)!)).toBe("Не вистачає легендарних дій (1 з 2)");
    expect(legendaryBlocker(dragon(), other, 2)).toBeNull();
  });

  it("витрата, підпис, відновлення лише на початку власного ходу", () => {
    const spent = spendLegendary(dragon(), 2);

    expect(spent.battleData.legendary?.actionsLeft).toBe(1);
    expect(textOf(legendaryBadge(spent)!)).toBe("Леґ. дії 1/3 · Леґ. опір 1");
    expect(legendaryBadge(other)).toBeNull();
    expect(resetTurnState(spent).legendary).toEqual({ actions: 3, actionsLeft: 3, resistLeft: 1 });
    expect(resetTurnState(other)).not.toHaveProperty("legendary");
  });
});
