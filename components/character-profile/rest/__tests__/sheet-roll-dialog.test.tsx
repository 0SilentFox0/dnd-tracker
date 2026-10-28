// components/character-profile/rest/__tests__/sheet-roll-dialog.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { SheetRollDialog } from "../SheetRollDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ roll: { mutateAsync: vi.fn(async () => ({ label: "Скритність", rolls: [11, 20], roll: 20, mod: 4, bonus: 2, total: 26, mode: "advantage", autoFail: false, inspirationUsed: true })), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useSheetRoll: () => h.roll }));
vi.mock("@/components/battle/fx/dice/DiceStage", () => ({ DiceStage: () => null }));

const rest: SheetRest = { persist: false, hp: null, dead: false, exhaustion: 0, shortRestOpen: false, hitDice: [], charges: [], inspiration: true, xp: null };

describe("SheetRollDialog", () => {
  afterEach(cleanup);

  it("rolls on the server with inspiration and shows the total", async () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest }} canEdit={false}>
        <SheetRollDialog request={{ label: "Скритність", subject: { kind: "check", skill: "stealth" } }} onClose={() => {}} />
      </ProfileProvider>,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Натхнення" }));
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));

    await waitFor(() => expect(screen.getByText("26")).toBeTruthy());
    expect(h.roll.mutateAsync).toHaveBeenCalledWith({ kind: "check", skill: "stealth", useInspiration: true });
  });

  it("does not resend inspiration on a second throw after it was spent", async () => {
    mockMatchMedia(false);
    h.roll.mutateAsync.mockClear();
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest }} canEdit={false}>
        <SheetRollDialog request={{ label: "Скритність", subject: { kind: "check", skill: "stealth" } }} onClose={() => {}} />
      </ProfileProvider>,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Натхнення" }));
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));
    await waitFor(() => expect(screen.getByText("26")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));

    await waitFor(() => expect(h.roll.mutateAsync).toHaveBeenCalledTimes(2));
    expect(h.roll.mutateAsync).toHaveBeenLastCalledWith({ kind: "check", skill: "stealth" });
  });
});
