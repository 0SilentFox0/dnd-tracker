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
}));
vi.mock("@/lib/hooks/units", () => ({ useUnits: vi.fn(() => ({ data: [] })) }));

import { AddParticipantDialog } from "@/components/battle/dm/dialogs/AddParticipantDialog";
import { useCharacters } from "@/lib/hooks/characters";
import { useUnits } from "@/lib/hooks/units";

afterEach(cleanup);

describe("AddParticipantDialog", () => {
  it("закритий діалог не вантажить героїв і юнітів", () => {
    render(<AddParticipantDialog open={false} onOpenChange={vi.fn()} campaignId="c" onAdd={vi.fn()} />);

    expect(useCharacters).toHaveBeenLastCalledWith("c", { compact: true, enabled: false });
    expect(useUnits).toHaveBeenLastCalledWith("c", undefined, { enabled: false });
  });

  it("відкритий — вантажить", () => {
    render(<AddParticipantDialog open onOpenChange={vi.fn()} campaignId="c" onAdd={vi.fn()} />);

    expect(useCharacters).toHaveBeenLastCalledWith("c", { compact: true, enabled: true });
    expect(useUnits).toHaveBeenLastCalledWith("c", undefined, { enabled: true });
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
});
