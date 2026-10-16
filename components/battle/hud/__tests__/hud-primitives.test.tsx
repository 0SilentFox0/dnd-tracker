// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { EffectLine, HealthBar, SlotGrid } from "@/components/battle/hud";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect } from "@/types/battle";

const withTips = (ui: ReactNode) => <TooltipProvider>{ui}</TooltipProvider>;

const fx = (name: string, type: ActiveEffect["type"], duration = 2): ActiveEffect =>
  ({ id: name, name, type, duration, appliedAt: { round: 1, timestamp: new Date() }, effects: [] }) as ActiveEffect;

describe("примітиви HUD", () => {
  it("ефекти: два показано, решта — +N; раунди поруч з назвою", () => {
    render(withTips(<EffectLine effects={[fx("Отрута", "debuff"), fx("Щит віри", "buff", 1), fx("Лють", "buff", 3)]} />));

    expect(screen.getByText("Отрута")).toBeTruthy();
    expect(screen.getByText("Щит віри")).toBeTruthy();
    expect(screen.queryByText("Лють")).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("+N — справжня кнопка, що розгортає всі ефекти", () => {
    const { container } = render(withTips(<EffectLine effects={[fx("Отрута", "debuff"), fx("Щит віри", "buff", 1), fx("Лють", "buff", 3)]} />));

    expect(within(container).getByText("+1").tagName).toBe("BUTTON");

    fireEvent.click(within(container).getByText("+1"));

    expect(within(container).getByText("Лють")).toBeTruthy();

    fireEvent.click(within(container).getByText("згорнути"));

    expect(within(container).queryByText("Лють")).toBeNull();
  });

  it("HP ворога без точних чисел — стан словом, без «/»", () => {
    const b = createMockParticipant();

    const enemy = { ...b, basicInfo: { ...b.basicInfo, side: ParticipantSide.ENEMY }, combatStats: { ...b.combatStats, currentHp: 9, maxHp: 40 } };

    const { container } = render(<HealthBar participant={enemy} exact={false} />);

    expect(screen.getByText("при смерті")).toBeTruthy();
    expect(container.textContent).not.toContain("/");
  });

  it("слоти: п'ять кіл римськими, порожнє коло — без кристалів", () => {
    const b = createMockParticipant();

    render(<SlotGrid participant={{ ...b, spellcasting: { ...b.spellcasting, spellSlots: { "1": { max: 3, current: 2 } } } }} />);

    for (const r of ["I", "II", "III", "IV", "V"]) expect(screen.getByText(r)).toBeTruthy();
    expect(screen.getByLabelText("I коло: 2 з 3")).toBeTruthy();
  });
});
