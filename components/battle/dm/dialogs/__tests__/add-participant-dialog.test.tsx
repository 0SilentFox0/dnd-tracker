// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", () => ({ useCharacters: vi.fn(() => ({ data: [] })) }));
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

const picker = (over: Record<string, unknown> = {}) => ({
  raceOptions: [{ key: "r1", label: "Демони", count: 2 }],
  raceKey: "",
  selectRace: vi.fn(),
  tiers: [],
  unitId: "",
  setUnitId: vi.fn(),
  reset: vi.fn(),
  ...over,
});

vi.mock("@/lib/hooks/units", () => ({ useUnitPicker: vi.fn(() => picker()) }));

import { AddParticipantDialog } from "@/components/battle/dm/dialogs/AddParticipantDialog";
import { useCharacters } from "@/lib/hooks/characters";
import { useUnitPicker } from "@/lib/hooks/units";

afterEach(cleanup);

describe("AddParticipantDialog", () => {
  it("закритий діалог не вантажить героїв і юнітів", () => {
    render(<AddParticipantDialog open={false} onOpenChange={vi.fn()} campaignId="c" onAdd={vi.fn()} />);

    expect(useCharacters).toHaveBeenLastCalledWith("c", { compact: true, enabled: false });
    expect(useUnitPicker).toHaveBeenLastCalledWith("c", false);
  });

  it("відкритий — вантажить", () => {
    render(<AddParticipantDialog open onOpenChange={vi.fn()} campaignId="c" onAdd={vi.fn()} />);

    expect(useCharacters).toHaveBeenLastCalledWith("c", { compact: true, enabled: true });
    expect(useUnitPicker).toHaveBeenLastCalledWith("c", true);
  });

  it("галочка «У резерв» передає reserved у onAdd", () => {
    vi.mocked(useCharacters).mockReturnValue({ data: [{ id: "h1", name: "Фрейда" }] } as never);

    const onAdd = vi.fn();

    render(<AddParticipantDialog open onOpenChange={vi.fn()} campaignId="c" onAdd={onAdd} />);

    fireEvent.change(screen.getAllByTestId("select")[2], { target: { value: "h1" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ sourceId: "h1", reserved: true }));
  });

  it("юніти обраної раси згруповані за рівнями", () => {
    vi.mocked(useUnitPicker).mockReturnValue(
      picker({
        raceKey: "r1",
        unitId: "u2",
        tiers: [
          { level: 1, units: [{ id: "u1", name: "Біс" }] },
          { level: 4, units: [{ id: "u2", name: "Суккуб" }] },
        ],
      }) as never,
    );

    const onAdd = vi.fn();

    render(<AddParticipantDialog open onOpenChange={vi.fn()} campaignId="c" onAdd={onAdd} />);

    fireEvent.change(screen.getAllByTestId("select")[1], { target: { value: "unit" } });

    const labels = screen.getAllByRole("option").map((o) => o.textContent);

    expect(labels).toEqual(expect.arrayContaining(["Демони (2)", "Рівень 1", "Біс", "Рівень 4", "Суккуб"]));
    expect(labels.indexOf("Рівень 4")).toBeLessThan(labels.indexOf("Суккуб"));

    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ sourceId: "u2", type: "unit" }));
  });
});
