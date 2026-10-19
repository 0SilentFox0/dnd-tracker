// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const impacts = vi.hoisted(() => ({ ids: new Set<string>() }));

vi.mock("@/lib/hooks/battle/useFxImpact", () => ({
  useFxImpacts: () => (id: string) => (impacts.ids.has(id) ? { element: "physical", kind: "damage", delayMs: 0 } : null),
}));

import { ParticipantDetails } from "@/components/battle/participants/ParticipantDetails";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneDataContext, type BattleSceneValue } from "@/lib/hooks/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { buildDisplayEffects } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";

const p = (id: string, hp: number) => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name: id, side: ParticipantSide.ALLY, controlledBy: "u" },
    combatStats: { ...b.combatStats, currentHp: hp, maxHp: 50, armorClass: 15, status: "active" as const },
  };
};

function wrap(participants: ReturnType<typeof p>[]) {
  const value = {
    battle: { initiativeOrder: participants, currentTurnIndex: 0, currentRound: 1, battleLog: [] } as unknown as BattleScene,
    viewer: { userId: "u", isDM: true, canSeeEnemyHp: true },
    effects: buildDisplayEffects(participants),
  } as unknown as BattleSceneValue;

  return function Wrapper({ children }: { children: ReactNode }) {
    return <TooltipProvider><BattleSceneDataContext.Provider value={value}>{children}</BattleSceneDataContext.Provider></TooltipProvider>;
  };
}

afterEach(() => {
  cleanup();
  impacts.ids.clear();
});

describe("ParticipantDetails hit fx", () => {
  it("floats the delta and anchors the portrait", () => {
    impacts.ids.add("a");

    const Wrapper = wrap([p("a", 50)]);

    const { rerender, container } = render(<ParticipantDetails key="a" participant={p("a", 50)} />, { wrapper: Wrapper });

    rerender(<ParticipantDetails key="a" participant={p("a", 40)} />);

    const float = screen.getByText("−10");

    expect(float.className).toContain("animate-[hud-float");

    const anchor = container.querySelector('[data-fx-participant="a"]');

    expect(anchor?.getAttribute("data-fx-anchor")).toBe("detail");
  });

  it("shows no delta after switching to another participant", () => {
    impacts.ids.add("a");

    const Wrapper = wrap([p("a", 50), p("b", 30)]);

    const { rerender } = render(<ParticipantDetails key="a" participant={p("a", 50)} />, { wrapper: Wrapper });

    rerender(<ParticipantDetails key="b" participant={p("b", 30)} />);

    expect(screen.queryByText(/^[−+]\d+$/)).toBeNull();
  });
});
