// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const deleteAllCharacters = vi.fn(async () => ({}));

const getCharacters = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "ch1", name: "Арвен", type: "player", race: "Ельф", class: "Лучник", level: 3, strength: 10, armorClass: 14, initiative: 2, experience: 0, avatar: null },
    { id: "ch2", name: "Борин", type: "npc_hero", race: "Гном", class: "Воїн", level: 4, strength: 14, armorClass: 16, initiative: 1, experience: 0, avatar: null },
  ]),
);

vi.mock("@/lib/api/characters", () => ({
  getCharacters: (...a: unknown[]) => getCharacters(...(a as [])),
  deleteAllCharacters: (...a: unknown[]) => deleteAllCharacters(...(a as [])),
  deleteCharacter: vi.fn(),
  levelUpCharacter: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));

import { DMCharactersClient } from "@/app/campaigns/[id]/dm/characters/page-client";

const renderIt = (type?: "player" | "npc_hero") =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DMCharactersClient campaignId="c1" type={type} maxLevel={4} />
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  deleteAllCharacters.mockReset();
  getCharacters.mockClear();
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

describe("DMCharactersClient tabs", () => {
  it("NPC-герої: запит з type, активна вкладка, «Створити» передає тип", async () => {
    renderIt("npc_hero");

    await screen.findByText("Борин");

    expect(getCharacters).toHaveBeenCalledWith("c1", { type: "npc_hero" });
    expect(screen.getByRole("link", { name: "NPC-герої" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Усі" })).toHaveAttribute("href", "/campaigns/c1/dm/characters");
    expect(screen.getByRole("link", { name: "Гравці" })).toHaveAttribute("href", "/campaigns/c1/dm/characters?type=player");
    expect(screen.getByRole("link", { name: /Створити персонажа/ })).toHaveAttribute("href", "/campaigns/c1/dm/characters/new?type=npc_hero");
  });

  it("без type — усі персонажі, активна «Усі»", async () => {
    renderIt();

    await screen.findByText("Арвен");

    expect(getCharacters).toHaveBeenLastCalledWith("c1", undefined);
    expect(screen.getByRole("link", { name: "Усі" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Створити персонажа/ })).toHaveAttribute("href", "/campaigns/c1/dm/characters/new");
  });
});

describe("DMCharactersClient level up", () => {
  const openMenu = async (name: string) => {
    const card = (await screen.findByText(name)).closest(".space-y-3") as HTMLElement;

    fireEvent.pointerDown(within(card).getByRole("button", { name: "Дії персонажа" }), { button: 0, ctrlKey: false, pointerType: "mouse" });

    return screen.findByRole("menu");
  };

  it("«Підняти рівень» лише нижче максимального рівня кампанії", async () => {
    renderIt();

    expect(within(await openMenu("Арвен")).getByRole("menuitem", { name: /Підняти рівень/ })).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    expect(within(await openMenu("Борин")).queryByRole("menuitem", { name: /Підняти рівень/ })).toBeNull();
  });
});
