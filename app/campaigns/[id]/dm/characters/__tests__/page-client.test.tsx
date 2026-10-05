// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const deleteAllCharacters = vi.fn(async () => ({}));

vi.mock("@/lib/api/characters", () => ({
  getCharacters: vi.fn(async () => [
    { id: "ch1", name: "Арвен", type: "player", race: "Ельф", class: "Лучник", level: 3, strength: 10, armorClass: 14, initiative: 2, experience: 0, avatar: null },
    { id: "ch2", name: "Борин", type: "npc_hero", race: "Гном", class: "Воїн", level: 4, strength: 14, armorClass: 16, initiative: 1, experience: 0, avatar: null },
  ]),
  deleteAllCharacters: (...a: unknown[]) => deleteAllCharacters(...(a as [])),
  deleteCharacter: vi.fn(),
  levelUpCharacter: vi.fn(),
}));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));

import { DMCharactersClient } from "@/app/campaigns/[id]/dm/characters/page-client";

const renderIt = () =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DMCharactersClient campaignId="c1" />
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  deleteAllCharacters.mockReset();
});

describe("DMCharactersClient delete all", () => {
  it("deletes everyone after confirm", async () => {
    deleteAllCharacters.mockResolvedValue({});
    renderIt();
    fireEvent.click(await screen.findByRole("button", { name: /Видалити всіх/ }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Видалити всіх" }));
    await vi.waitFor(() => expect(deleteAllCharacters).toHaveBeenCalledWith("c1"));
  });

  it("keeps the dialog open with the server error", async () => {
    deleteAllCharacters.mockRejectedValue(new Error("Збій"));
    renderIt();
    fireEvent.click(await screen.findByRole("button", { name: /Видалити всіх/ }));

    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Видалити всіх" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Збій");
  });
});
