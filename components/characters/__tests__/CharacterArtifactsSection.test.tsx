// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const renderIt = () =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <CharacterArtifactsSection campaignId="c" characterId="ch" equipped={{ armor: "a1" }} artifacts={[{ id: "a1", name: "кольчуга", slot: "armor", icon: null }]} onEquippedChange={vi.fn()} />
    </QueryClientProvider>,
  );

describe("CharacterArtifactsSection", () => {
  afterEach(cleanup);

  it("лише сітка: вдягнена річ з літерою, порожні слоти, без книги й сетів", () => {
    renderIt();

    expect(screen.getByTitle("Броня: кольчуга")).toHaveTextContent("К");
    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /Книга заклинань/ })).toBeNull();
    expect(screen.queryByText("Повні сети артефактів")).toBeNull();
  });
});
