// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/hud/fonts", () => ({ hudFontClassName: "" }));

import { EffectLine, HealthBar, SlotGrid } from "@/components/battle/hud";
import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect } from "@/types/battle";

const fx = (name: string, type: ActiveEffect["type"], duration = 2): ActiveEffect =>
  ({ id: name, name, type, duration, appliedAt: { round: 1, timestamp: new Date() }, effects: [] }) as ActiveEffect;

describe("примітиви HUD", () => {
  it("ефекти: два показано, решта — +N; раунди поруч з назвою", () => {
    render(<EffectLine effects={[fx("Отрута", "debuff"), fx("Щит віри", "buff", 1), fx("Лють", "buff", 3)]} />);

    expect(screen.getByText("Отрута")).toBeTruthy();
    expect(screen.getByText("Щит віри")).toBeTruthy();
    expect(screen.queryByText("Лють")).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
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
