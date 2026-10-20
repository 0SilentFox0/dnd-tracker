// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const impacts = vi.hoisted(() => ({ ids: new Set<string>() }));

vi.mock("@/lib/hooks/battle/useFxImpacts", () => ({
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

function sceneValue(participants: ReturnType<typeof p>[]) {
  return {
    battle: { initiativeOrder: participants, currentTurnIndex: 0, currentRound: 1, battleLog: [] } as unknown as BattleScene,
    viewer: { userId: "u", isDM: true, canSeeEnemyHp: true },
    effects: buildDisplayEffects(participants),
  } as unknown as BattleSceneValue;
}

function wrap(participants: ReturnType<typeof p>[]) {
  const value = sceneValue(participants);

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

    const { rerender, container } = render(<ParticipantDetails participant={p("a", 50)} />, { wrapper: Wrapper });

    rerender(<ParticipantDetails participant={p("a", 40)} />);

    const float = screen.getByText("−10");

    expect(float.className).toContain("animate-[hud-float");

    const anchor = container.querySelector('[data-fx-participant="a"]');

    expect(anchor?.getAttribute("data-fx-anchor")).toBe("detail");
  });

  it("shows no delta after switching to another participant", () => {
    impacts.ids.add("a");

    const Wrapper = wrap([p("a", 50), p("b", 30)]);

    const { rerender } = render(<ParticipantDetails participant={p("a", 50)} />, { wrapper: Wrapper });

    rerender(<ParticipantDetails participant={p("b", 30)} />);

    expect(screen.queryByText(/^[−+]\d+$/)).toBeNull();
  });

  it("does not float when another participant is hit while this tile is shown", () => {
    impacts.ids.add("b");

    const tree = (b: ReturnType<typeof p>) => (
      <TooltipProvider>
        <BattleSceneDataContext.Provider value={sceneValue([p("a", 50), b])}>
          <ParticipantDetails participant={p("a", 50)} />
        </BattleSceneDataContext.Provider>
      </TooltipProvider>
    );

    const { rerender } = render(tree(p("b", 30)));

    rerender(tree(p("b", 20)));

    expect(screen.queryByText(/^[−+]\d+$/)).toBeNull();
  });

  it("keeps the avatar zoom dialog open when the shown participant is hit", () => {
    impacts.ids.add("a");

    const withAvatar = (hp: number) => {
      const a = p("a", hp);

      return { ...a, basicInfo: { ...a.basicInfo, avatar: "/a.png" } };
    };

    const Wrapper = wrap([withAvatar(50)]);

    const { rerender } = render(<ParticipantDetails participant={withAvatar(50)} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /аватар у повний розмір/ }));

    const dialogs = () => document.querySelectorAll('[role="dialog"]').length;

    expect(dialogs()).toBeGreaterThan(0);

    rerender(<ParticipantDetails participant={withAvatar(40)} />);

    expect(screen.getByText("−10")).toBeTruthy();
    expect(dialogs()).toBeGreaterThan(0);
  });
});
