// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "./sheet-fixture";

import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { TransferArtifactDialog } from "@/components/character-profile/TransferArtifactDialog";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { RosterHero, SheetArtifact } from "@/types/characters";

const mocks = vi.hoisted(() => ({ roster: { data: [] as RosterHero[], isLoading: false }, mutateAsync: vi.fn() }));

vi.mock("@/lib/hooks/characters", () => ({
  useCharacterRoster: () => mocks.roster,
  useTransferArtifact: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

const hero = (id: string, name: string, equipped: RosterHero["equipped"] = {}): RosterHero => ({ id, name, avatar: null, type: "player" as RosterHero["type"], equipped });

const artifact = { id: "h1", name: "Шолом Світла", slot: "helmet", effects: [] } as unknown as SheetArtifact;

const renderIt = () =>
  renderWithConfirm(
    <ProfileContext.Provider value={{ campaignId: "camp", characterId: "a", sheet: sheetFixture, canEdit: true }}>
      <TransferArtifactDialog artifact={artifact} source={{ slot: "helmet" }} open onOpenChange={vi.fn()} />
    </ProfileContext.Provider>,
  );

describe("TransferArtifactDialog", () => {
  afterEach(() => {
    cleanup();
    mocks.mutateAsync.mockReset();
  });

  it("показує інших героїв і обмін", () => {
    mocks.roster.data = [hero("a", "Ліра"), hero("b", "Боромир"), hero("c", "Гімлі", { helmet: { id: "h2", name: "Шолом Ночі" } })];
    renderIt();

    expect(screen.getByText("Боромир")).toBeTruthy();
    expect(screen.getByText("Гімлі")).toBeTruthy();
    expect(screen.queryByText("Ліра")).toBeNull();
    expect(screen.getAllByText("у підсумок")).toHaveLength(2);
  });

  it("клік і підтвердження викликає передачу", async () => {
    mocks.roster.data = [hero("a", "Ліра"), hero("b", "Боромир")];
    mocks.mutateAsync.mockResolvedValue({});
    renderIt();

    fireEvent.click(screen.getByText("Боромир"));
    fireEvent.click(await screen.findByRole("button", { name: "Передати" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ slot: "helmet", toCharacterId: "b" }));
  });

  it("без інших героїв — порожній стан", () => {
    mocks.roster.data = [hero("a", "Ліра")];
    renderIt();

    expect(screen.getByText("Немає інших героїв у кампанії")).toBeTruthy();
  });
});
