// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemsTab } from "../ItemsTab";
import { ProfileProvider } from "../ProfileContext";
import { sheetFixture } from "./sheet-fixture";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }) }));
vi.mock("../TransferArtifactDialog", () => ({ TransferArtifactDialog: () => null }));

const sheet: CharacterSheet = {
  ...sheetFixture,
  viewer: { isDM: false, isOwner: true },
  items: {
    grid: { weapon: { id: "ls+ft", name: "Flame Tongue Longsword", icon: null, slot: "weapon", rarity: "rare", description: null, effects: [], attunement: "required" } },
    artifacts: [
      { id: "ls+ft", name: "Flame Tongue Longsword", icon: null, slot: "weapon", rarity: "rare", description: null, effects: [], attunement: "required" },
      { id: "ring", name: "Ring of Protection", icon: null, slot: "ring", rarity: "rare", description: null, effects: [], attunement: "attuned", carried: true },
    ],
    sets: [],
    attunement: { used: 1, limit: 3 },
  },
};

afterEach(cleanup);

describe("ItemsTab: attunement", () => {
  it("counter, badges, attune from the dialog; carried items cannot be unequipped", async () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={sheet} canEdit={false}>
        <ItemsTab />
      </ProfileProvider>,
    );

    expect(screen.getByText("Налаштування 1/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Зброя: Flame Tongue Longsword" }));
    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "attune", ref: "ls+ft" }));

    cleanup();
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={sheet} canEdit={false}>
        <ItemsTab />
      </ProfileProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ring of Protection/ }));

    expect(screen.getAllByText("Носиться").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Зняти в підсумок" })).toBeNull();
    expect(screen.getByRole("button", { name: "Зняти налаштування" })).toBeTruthy();
  });
});
