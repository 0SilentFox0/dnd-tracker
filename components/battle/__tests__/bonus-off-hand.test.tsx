// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { BonusActionPicker } from "@/components/battle/wizards/BonusActionPicker";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleParticipant } from "@/types/battle";

const OFF = { id: "dagger-off", name: "Кинджал", type: "melee", attackBonus: 3, damageDice: "1d4", damageType: "piercing", hand: "off", traits: ["light"] };

function hero(me: BattleParticipant, over: { model?: "5e"; light?: boolean; bonusUsed?: boolean; off?: boolean }): BattleParticipant {
  return {
    ...me,
    abilities: { ...me.abilities, ...(over.model && { damageModel: over.model }) },
    actionFlags: { ...me.actionFlags, hasUsedBonusAction: !!over.bonusUsed },
    battleData: { ...me.battleData, attackedWithLight: over.light, attacks: over.off === false ? me.battleData.attacks : [...me.battleData.attacks, OFF as never] },
  };
}

describe("Атака другою рукою в бонусних діях", () => {
  afterEach(cleanup);

  const show = (over: Parameters<typeof hero>[1]) => {
    const { wrapper, me } = fakeScene();

    const onOffHand = vi.fn();

    render(<BonusActionPicker participant={hero(me, over)} open onOpenChange={() => {}} onDone={() => {}} onOffHand={onOffHand} />, { wrapper });

    return { onOffHand, item: screen.queryByRole("button", { name: /Атака другою рукою/ }) };
  };

  it("є, коли 5e, атака hand off, легка атака цього ходу і бонус вільний", () => {
    const { item, onOffHand } = show({ model: "5e", light: true });

    expect(item).toBeTruthy();
    fireEvent.click(item as HTMLElement);
    expect(onOffHand).toHaveBeenCalled();
  });

  it.each([
    ["без легкої атаки", { model: "5e" as const, light: false }],
    ["бонус витрачено", { model: "5e" as const, light: true, bonusUsed: true }],
    ["немає атаки hand off", { model: "5e" as const, light: true, off: false }],
    ["герой HOMM", { light: true }],
  ])("немає: %s", (_n, over) => {
    expect(show(over).item).toBeNull();
  });
});
