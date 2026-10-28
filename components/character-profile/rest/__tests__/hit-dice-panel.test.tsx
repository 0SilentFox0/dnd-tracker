// components/character-profile/rest/__tests__/hit-dice-panel.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { HitDicePanel } from "../HitDicePanel";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet, SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ spend: { mutateAsync: vi.fn(async () => ({ roll: 6, healed: 8 })), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useSpendHitDie: () => h.spend }));

const rest = (over: Partial<SheetRest> = {}): SheetRest => ({
  persist: true, hp: { current: 10, max: 30, temp: 0 }, dead: false, exhaustion: 0, shortRestOpen: true,
  hitDice: [{ classId: "fig", name: "Воїн", die: 10, total: 3, spent: 1 }], charges: [], inspiration: null, xp: null, ...over,
});

const show = (r: SheetRest, viewer: CharacterSheet["viewer"] = { isDM: false, isOwner: true }) =>
  renderWithConfirm(
    <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, viewer, rest: r }} canEdit={false}>
      <HitDicePanel />
    </ProfileProvider>,
  );

describe("HitDicePanel", () => {
  afterEach(cleanup);

  it("spend button in the short rest window", () => {
    show(rest());

    expect(screen.getByText(/витрачено 1 \/ 3/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Витратити" }));

    expect(h.spend.mutateAsync).toHaveBeenCalledWith("fig");
  });

  it("no button outside the window, when all spent, or for a stranger", () => {
    show(rest({ shortRestOpen: false }));
    expect(screen.queryByRole("button", { name: "Витратити" })).toBeNull();
    cleanup();

    show(rest({ hitDice: [{ classId: "fig", name: "Воїн", die: 10, total: 3, spent: 3 }] }));
    expect(screen.queryByRole("button", { name: "Витратити" })).toBeNull();
    cleanup();

    show(rest(), { isDM: false, isOwner: false });
    expect(screen.queryByRole("button", { name: "Витратити" })).toBeNull();
  });

  it("renders nothing without persisted resources", () => {
    show(rest({ persist: false, hitDice: [] }));

    expect(screen.queryByLabelText("Кістки хітів")).toBeNull();
  });
});
