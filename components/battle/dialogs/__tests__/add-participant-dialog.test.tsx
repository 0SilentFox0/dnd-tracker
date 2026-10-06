// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", () => ({ useCharacters: vi.fn(() => ({ data: [] })) }));
vi.mock("@/lib/hooks/units", () => ({ useUnits: vi.fn(() => ({ data: [] })) }));

import { AddParticipantDialog } from "@/components/battle/dialogs/AddParticipantDialog";
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
});
