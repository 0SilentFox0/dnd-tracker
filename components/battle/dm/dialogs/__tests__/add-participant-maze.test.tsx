// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", () => ({ useCharacters: vi.fn(() => ({ data: [{ id: "h1", name: "Фрейда" }] })) }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <option disabled>{children}</option>,
}));
vi.mock("@/lib/hooks/units", () => ({
  useUnitPicker: vi.fn(() => ({ raceOptions: [], raceKey: "r1", selectRace: vi.fn(), tiers: [{ level: 1, units: [{ id: "u1", name: "Біс" }] }], unitId: "u1", setUnitId: vi.fn(), reset: vi.fn() })),
}));

import { AddParticipantDialog } from "@/components/battle/dm/dialogs/AddParticipantDialog";

afterEach(cleanup);

describe("AddParticipantDialog у лабіринті", () => {
  it("юніт не додається одразу, а переходить у вибір клітинки", () => {
    const onAdd = vi.fn();

    const onPlace = vi.fn();

    const onOpenChange = vi.fn();

    render(<AddParticipantDialog open onOpenChange={onOpenChange} campaignId="c" onAdd={onAdd} onPlace={onPlace} />);

    fireEvent.change(screen.getAllByTestId("select")[1], { target: { value: "unit" } });
    fireEvent.click(screen.getByRole("button", { name: "Вибрати клітинку" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(onPlace).toHaveBeenCalledWith(expect.objectContaining({ sourceId: "u1", type: "unit", quantity: 1 }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("герой і юніт у резерв додаються як завжди", () => {
    const onAdd = vi.fn();

    const onPlace = vi.fn();

    render(<AddParticipantDialog open onOpenChange={vi.fn()} campaignId="c" onAdd={onAdd} onPlace={onPlace} />);

    fireEvent.change(screen.getAllByTestId("select")[2], { target: { value: "h1" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    fireEvent.change(screen.getAllByTestId("select")[1], { target: { value: "unit" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    expect(onPlace).not.toHaveBeenCalled();
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: "u1", reserved: true }));
  });
});
