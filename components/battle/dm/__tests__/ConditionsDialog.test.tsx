// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { hero } from "@/app/api/__tests__/battles/fixtures";
import { ConditionsDialog } from "@/components/battle/dm/ConditionsDialog";
import { applyCondition5e,CONDITION_5E_KEYS } from "@/lib/utils/battle/conditions";

afterEach(cleanup);

describe("ConditionsDialog", () => {
  it("рендерить усі стани з описом", () => {
    render(<ConditionsDialog participant={hero} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getAllByRole("radio")).toHaveLength(CONDITION_5E_KEYS.length);
    expect(screen.getByText("Повалений")).toBeTruthy();
    expect(screen.getByText(/Недолік на власні атаки/)).toBeTruthy();
  });

  it("«Накласти» викликає onSubmit з apply", () => {
    const onSubmit = vi.fn();

    render(<ConditionsDialog participant={hero} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("Повалений"));
    fireEvent.change(screen.getByLabelText(/Раунди/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Накласти" }));

    expect(onSubmit).toHaveBeenCalledWith({ action: "apply", participantId: "hero", condition: "prone", rounds: 3 });
  });

  it("поточний стан має «Зняти»", () => {
    const onSubmit = vi.fn();

    const [afflicted] = applyCondition5e([hero], "hero", { key: "prone", rounds: 2, source: undefined, sourceName: "ДМ", timedKey: "t", round: 1 }).participants;

    render(<ConditionsDialog participant={afflicted} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Зняти" }));

    expect(onSubmit).toHaveBeenCalledWith({ action: "remove", participantId: "hero", condition: "prone" });
  });

  it("новий стан з'являється в «Поточні стани» без перевідкриття", () => {
    const { rerender } = render(<ConditionsDialog participant={hero} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.queryByText("Поточні стани")).toBeNull();

    const [afflicted] = applyCondition5e([hero], "hero", { key: "prone", rounds: 2, source: undefined, sourceName: "ДМ", timedKey: "t", round: 1 }).participants;

    rerender(<ConditionsDialog participant={afflicted} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText("Поточні стани")).toBeTruthy();
  });
});
