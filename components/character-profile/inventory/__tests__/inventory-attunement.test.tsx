// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";

import { InventoryTab } from "@/components/character-profile/inventory/InventoryTab";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";
import type { StashArtifact } from "@/types/inventory";

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn(), useStash: vi.fn(), classes: false }));

vi.mock("@/lib/hooks/notifications", () => ({ useSeenOnOpen: () => new Set<string>(), useNotifications: () => ({ data: undefined }) }));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: mocks.classes } } }) }));

vi.mock("@/lib/hooks/characters/useStash", async (orig) => ({
  ...(await orig<object>()),
  useStash: mocks.useStash,
  useStashAction: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
  useInventoryLog: () => ({ data: { pages: [] }, isPending: false }),
  useFreeArtifacts: () => ({ data: [] }),
}));

const art = (id: string, over: Partial<StashArtifact> = {}): StashArtifact => ({ id, name: id, icon: null, rarity: null, slot: "ring", description: null, ...over });

const setStash = (artifacts: StashArtifact[]) =>
  mocks.useStash.mockReturnValue({ data: { purse: { gp: 0, sp: 0, cp: 0 }, items: [], artifacts }, isPending: false, isError: false, error: null, refetch: vi.fn() });

const sheet: CharacterSheet = {
  ...sheetFixture,
  viewer: { isDM: false, isOwner: true },
  items: {
    grid: { weapon: { id: "ls+ft", name: "Flame Tongue Longsword", icon: null, slot: "weapon", rarity: "rare", description: null, effects: [], attunement: "required" } },
    artifacts: [],
    sets: [],
    attunement: { used: 1, limit: 3 },
  },
};

const renderTab = (over: Partial<CharacterSheet> = {}) =>
  renderWithConfirm(
    <ProfileContext.Provider value={{ campaignId: "camp", characterId: "lira", sheet: { ...sheet, ...over }, canEdit: false }}>
      <InventoryTab />
    </ProfileContext.Provider>,
  );

describe("InventoryTab: attunement, charges, off hand", () => {
  beforeEach(() => {
    mocks.mutateAsync.mockResolvedValue({});
    mocks.classes = false;
    mockMatchMedia(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("counter and attune from an equipped item", async () => {
    setStash([]);
    renderTab();

    expect(screen.getByText("Налаштування 1/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Зброя: Flame Tongue Longsword" }));
    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "attune", ref: "ls+ft" }));
  });

  it("carried equipped item cannot be unequipped, can be unattuned and transferred by id", () => {
    setStash([]);
    renderTab({
      items: { ...sheet.items, grid: { ring1: { id: "ring", name: "Ring of Protection", icon: null, slot: "ring", rarity: null, description: null, effects: [], attunement: "attuned", carried: true } } },
    });

    fireEvent.click(screen.getByLabelText(/Ring of Protection/));

    expect(screen.getByText("Носиться")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Зняти" })).toBeNull();
    expect(screen.getByRole("button", { name: "Зняти налаштування" })).toBeTruthy();
  });

  it("backpack badges and attune actions", async () => {
    setStash([art("ring", { attunement: "required", carried: true, charges: { max: 3, left: 2, rest: null } })]);
    renderTab();

    fireEvent.click(screen.getByLabelText("ring"));

    for (const t of ["Носиться", "Не діє без налаштування", "Заряди 2/3"]) expect(screen.getByText(t)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "attune", ref: "ring" }));
  });

  it("«У другу руку» only for a light weapon with classes enabled", async () => {
    setStash([art("dagger", { slot: "weapon", light: true })]);
    renderTab();
    fireEvent.click(screen.getByLabelText("dagger"));

    expect(screen.queryByRole("button", { name: "У другу руку" })).toBeNull();

    cleanup();
    mocks.classes = true;
    renderTab();
    fireEvent.click(screen.getByLabelText("dagger"));
    fireEvent.click(screen.getByRole("button", { name: "У другу руку" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "equip", artifactId: "dagger", slot: "shield" }));
  });
});
