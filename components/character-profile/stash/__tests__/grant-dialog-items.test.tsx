// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("@/lib/hooks/characters", () => ({
  useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }),
  useFreeArtifacts: () => ({
    isLoading: false,
    data: [
      { id: "ls", name: "Longsword", icon: null, rarity: "common", slot: "weapon", gear: true },
      { id: "gs", name: "Greatsword", icon: null, rarity: "common", slot: "weapon", gear: true },
      { id: "ft", name: "Flame Tongue", icon: null, rarity: "rare", slot: "weapon", property: { nameTemplate: "Flame Tongue {base}", bases: ["ls", "gs"] } },
      { id: "pot", name: "Potion of Healing", icon: null, rarity: "common", slot: "item", consumable: true },
    ],
  }),
}));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

import { GrantArtifactDialog } from "../GrantArtifactDialog";

afterEach(() => {
  cleanup();
  h.mutateAsync.mockClear();
});

const open = () => {
  mockMatchMedia(false);
  render(<GrantArtifactDialog open onOpenChange={vi.fn()} />);
};

describe("GrantArtifactDialog: magic items", () => {
  it("a property asks for a base, previews the composed name and grants with baseId", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /Flame Tongue/ }));

    expect(screen.getByText("База для «Flame Tongue»")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Пошук бази"), { target: { value: "great" } });

    expect(screen.queryByRole("button", { name: /^Longsword/ })).toBeNull();
    expect(screen.getByText("Flame Tongue Greatsword · Рідкісний")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Greatsword/ }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "ft", baseId: "gs" }));
  });

  it("a consumable asks for a quantity", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /Potion of Healing/ }));
    fireEvent.change(screen.getByLabelText("Кількість"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Видати" }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "pot", quantity: 3 }));
  });

  it("plain gear is granted in one click", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /^Longsword/ }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "ls" }));
  });
});
