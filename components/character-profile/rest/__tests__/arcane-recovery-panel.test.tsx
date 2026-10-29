// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { ArcaneRecoveryPanel } from "../ArcaneRecoveryPanel";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet, SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ post: vi.fn(async () => ({ resources: {} })) }));

vi.mock("@/lib/api/characters", async (orig) => ({ ...(await orig<object>()), postArcaneRecovery: h.post }));

const offer = { budget: 3, maxSlotLevel: 5, used: false, slots: [{ level: 1, spent: 2 }, { level: 2, spent: 1 }] };

const rest = (over: Partial<SheetRest> = {}): SheetRest => ({
  persist: true, hp: null, dead: false, exhaustion: 0, shortRestOpen: true, hitDice: [], charges: [], arcaneRecovery: offer, inspiration: null, xp: null, ...over,
});

const show = (r: SheetRest, viewer: CharacterSheet["viewer"] = { isDM: false, isOwner: true }) =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, viewer, rest: r }} canEdit={false}>
        <ArcaneRecoveryPanel />
      </ProfileProvider>
    </QueryClientProvider>,
  );

describe("ArcaneRecoveryPanel", () => {
  afterEach(cleanup);

  it("picks slots within the budget and submits them", async () => {
    show(rest());

    const more = (level: number) => screen.getByRole("button", { name: `rest.arcane.more {"level":${level}}` }) as HTMLButtonElement;

    fireEvent.click(more(2));
    fireEvent.click(more(1));

    expect(screen.getByText('rest.arcane.budget {"total":3,"budget":3}')).toBeTruthy();
    expect(more(1).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "rest.arcane.restore" }));

    await waitFor(() => expect(h.post).toHaveBeenCalledWith("c", "ch", { "1": 1, "2": 1 }));
  });

  it("submit is disabled with nothing picked", () => {
    show(rest());

    expect((screen.getByRole("button", { name: "rest.arcane.restore" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the used note instead of the picker", () => {
    show(rest({ arcaneRecovery: { ...offer, used: true } }));

    expect(screen.getByText("rest.arcane.used")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "rest.arcane.restore" })).toBeNull();
  });

  it("hidden outside the short rest window, for a stranger and without the feature", () => {
    show(rest({ shortRestOpen: false }));
    expect(screen.queryByLabelText("rest.arcane.aria")).toBeNull();
    cleanup();

    show(rest(), { isDM: false, isOwner: false });
    expect(screen.queryByLabelText("rest.arcane.aria")).toBeNull();
    cleanup();

    show(rest({ arcaneRecovery: null }));
    expect(screen.queryByLabelText("rest.arcane.aria")).toBeNull();
  });
});
