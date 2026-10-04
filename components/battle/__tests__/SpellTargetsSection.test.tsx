/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellTargetsSection } from "@/components/battle/dialogs/spell-dialog/SpellTargetsSection";
import type { BattleParticipant } from "@/types/battle";

const goblin = {
  basicInfo: { id: "g1", name: "Гоблін", side: "enemy" },
  combatStats: { currentHp: 5, maxHp: 7 },
} as unknown as BattleParticipant;

describe("SpellTargetsSection", () => {
  afterEach(cleanup);

  it("натискання на ім'я цілі перемикає вибір (весь рядок — зона дотику)", () => {
    const onTargetToggle = vi.fn();

    render(
      <SpellTargetsSection
        targetSelectionKind="multi"
        selectedTargets={[]}
        availableTargets={[goblin]}
        isDM={false}
        canSeeEnemyHp={false}
        onTargetToggle={onTargetToggle}
      />,
    );

    fireEvent.click(screen.getByText("Гоблін"));

    expect(onTargetToggle).toHaveBeenCalledWith("g1", true);
  });
});
