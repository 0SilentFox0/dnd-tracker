/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TargetSelectionDialog } from "@/components/battle/dialogs/TargetSelectionDialog";
import type { BattleParticipant } from "@/types/battle";

const goblin = {
  basicInfo: { id: "g1", name: "Гоблін", side: "enemy" },
  combatStats: { currentHp: 5, maxHp: 7, status: "active" },
} as unknown as BattleParticipant;

const orc = {
  basicInfo: { id: "o1", name: "Орк", side: "enemy" },
  combatStats: { currentHp: 9, maxHp: 15, status: "active" },
} as unknown as BattleParticipant;

describe("TargetSelectionDialog", () => {
  afterEach(cleanup);

  it("одна ціль: вибір одразу підтверджується без кнопки «Підтвердити»", () => {
    const onSelect = vi.fn();

    const onOpenChange = vi.fn();

    render(
      <TargetSelectionDialog
        open
        onOpenChange={onOpenChange}
        availableTargets={[goblin, orc]}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Гоблін"));

    expect(onSelect).toHaveBeenCalledWith(["g1"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("AOE: вибір не підтверджується, доки не натиснуто «Підтвердити»", () => {
    const onSelect = vi.fn();

    render(
      <TargetSelectionDialog
        open
        onOpenChange={vi.fn()}
        availableTargets={[goblin, orc]}
        isAOE
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Гоблін"));
    fireEvent.click(screen.getByText("Орк"));

    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Підтвердити (2)" }));

    expect(onSelect).toHaveBeenCalledWith(["g1", "o1"]);
  });
});
