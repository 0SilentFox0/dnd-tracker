// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { DmQuickActionsPanel } from "@/components/battle/dm/DmQuickActionsPanel";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

vi.unmock("next-intl");

afterEach(cleanup);

const dialogs = { log: { open: false, setOpen: vi.fn(), show: vi.fn() }, addParticipant: { open: false, setOpen: vi.fn(), show: vi.fn() }, hp: { target: null, show: vi.fn(), close: vi.fn() } };

const panel = { open: true, onOpenChange: vi.fn() };

describe("DmQuickActionsPanel: initiative", () => {
  it("DM rolls after confirmation", async () => {
    const { wrapper, value, confirm } = fakeScene({ isDM: true });

    render(<DmQuickActionsPanel dialogs={dialogs} onOpenCastSpell={vi.fn()} panel={panel} />, { wrapper });

    fireEvent.click(screen.getByText("Кинути ініціативу"));

    await waitFor(() => expect(value.actions.initiativeRoll.mutate).toHaveBeenCalledWith({}));
    expect(confirm).toHaveBeenCalled();
  });

  it("declined confirm does not roll; order tile opens the editor and applies", async () => {
    const { wrapper, value } = fakeScene({ isDM: true, confirmAnswer: false });

    render(<DmQuickActionsPanel dialogs={dialogs} onOpenCastSpell={vi.fn()} panel={panel} />, { wrapper });

    fireEvent.click(screen.getByText("Кинути ініціативу"));
    await Promise.resolve();

    expect(value.actions.initiativeRoll.mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Порядок ініціативи"));
    fireEvent.click(screen.getAllByRole("button", { name: /^Нижче: / })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Застосувати" }));

    expect(value.actions.initiativeReorder.mutate).toHaveBeenCalledWith({ order: ["gob", "me", "ally"] });
  });

  it("player sees no controls", () => {
    const { wrapper } = fakeScene({ isDM: false });

    render(<DmQuickActionsPanel dialogs={dialogs} onOpenCastSpell={vi.fn()} panel={panel} />, { wrapper });

    expect(screen.queryByText("Кинути ініціативу")).toBeNull();
  });
});
