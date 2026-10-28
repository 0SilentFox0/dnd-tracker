// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { updateInventory } from "@/lib/api/inventory";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: false } } }) }));

vi.mock("@/lib/api/inventory", () => ({ updateInventory: vi.fn() }));

const onEquippedChange = vi.fn();

const renderIt = (holders?: Record<string, string>) =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <CharacterArtifactsSection campaignId="c" characterId="ch" equipped={{ armor: "a1", range_weapon: "r1" }} artifacts={[{ id: "a1", name: "кольчуга", slot: "armor", icon: null }, { id: "a2", name: "панцир", slot: "armor", icon: null }, { id: "r1", name: "лук", slot: "range_weapon", icon: null }]} holders={holders} onEquippedChange={onEquippedChange} />
    </QueryClientProvider>,
  );

describe("CharacterArtifactsSection", () => {
  afterEach(cleanup);

  it("shows a parameterized equipped item through the canonical resolver", () => {
    renderWithConfirm(<QueryClientProvider client={new QueryClient()}><CharacterArtifactsSection campaignId="c" characterId="ch" equipped={{ armor: "resist~fire" }} artifacts={[{ id: "resist", name: "Armor ({param})", slot: "armor", ...itemStatsColumns({ parameter: { kind: "damageType", options: [{ key: "fire", label: "Fire" }] } }) }]} onEquippedChange={onEquippedChange} /></QueryClientProvider>);
    expect(screen.getByTitle("Броня: Armor (fire)")).toBeTruthy();
  });

  it("лише сітка: вдягнена річ з літерою, порожні слоти, без книги й сетів", () => {
    renderIt();

    expect(screen.getByTitle("Броня: кольчуга")).toHaveTextContent("К");
    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /Книга заклинань/ })).toBeNull();
    expect(screen.queryByText("Повні сети артефактів")).toBeNull();
  });

  it("артефакт іншого героя неактивний з підписом власника", async () => {
    renderIt({ a2: "Боромир" });

    fireEvent.keyDown(screen.getByTitle("Броня: кольчуга"), { key: "Enter" });

    expect(await screen.findByText("у Боромир")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /панцир/ }).getAttribute("data-disabled")).not.toBeNull();
  });

  it("надсилає equipSlot і оновлює стан з відповіді сервера", async () => {
    vi.mocked(updateInventory).mockResolvedValue({ equipped: { armor: "a2", cape: "c9" } } as never);
    renderIt();

    fireEvent.keyDown(screen.getByTitle("Броня: кольчуга"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: /панцир/ }));

    await waitFor(() => expect(onEquippedChange).toHaveBeenCalledWith({ armor: "a2", cape: "c9" }));
    expect(updateInventory).toHaveBeenCalledWith("c", "ch", { equipSlot: { slot: "armor", artifactId: "a2" } });
  });

  it("артефакт, уже вдягнений в іншому слоті цього героя, неактивний", async () => {
    renderIt();

    fireEvent.keyDown(screen.getByTitle("Зброя"), { key: "Enter" });

    expect(await screen.findByText("вже вдягнено")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /лук/ }).getAttribute("data-disabled")).not.toBeNull();
  });
});
