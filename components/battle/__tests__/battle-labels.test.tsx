/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionButtonsPanel } from "@/components/battle/ActionButtonsPanel";
import { TurnStartScreen } from "@/components/battle/views/TurnStartScreen";
import type { BattleParticipant } from "@/types/battle";

const participant = {
  basicInfo: { id: "p1", name: "Арвен", side: "ally" },
  abilities: {},
  combatStats: { currentHp: 10, maxHp: 10, armorClass: 12, status: "active" },
  spellcasting: { spellSlots: {}, knownSpells: [] },
  battleData: { attacks: [], activeSkills: [], activeEffects: [] },
  actionFlags: {
    hasUsedAction: false,
    hasUsedBonusAction: false,
    hasUsedReaction: false,
    hasExtraTurn: false,
  },
} as unknown as BattleParticipant;

describe("українські підписи в бою", () => {
  afterEach(cleanup);

  it("кнопка пропуску ходу і стан бонусної дії — українською", () => {
    render(
      <ActionButtonsPanel
        participant={participant}
        bonusActions={[]}
        onMeleeAttack={vi.fn()}
        onRangedAttack={vi.fn()}
        onSpell={vi.fn()}
        onBonusAction={vi.fn()}
        onSkipTurn={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Пропустити хід/ })).toBeInTheDocument();
    expect(screen.getByText("Немає бонусних дій")).toBeInTheDocument();
  });

  it("екран початку ходу пропонує почати саме хід", () => {
    render(<TurnStartScreen participant={participant} onStartTurn={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Почати хід/i })).toBeInTheDocument();
  });
});
