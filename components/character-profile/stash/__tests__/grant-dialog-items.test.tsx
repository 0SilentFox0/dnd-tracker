// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("@/lib/hooks/characters/useStash", () => ({
  useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }),
  useFreeArtifacts: () => ({
    isLoading: false,
    data: [
      { id: "ls", name: "Longsword", icon: null, rarity: "common", slot: "weapon", gear: true },
      { id: "gs", name: "Greatsword", icon: null, rarity: "common", slot: "weapon", gear: true },
      { id: "ft", name: "Flame Tongue", icon: null, rarity: "rare", slot: "weapon", property: { nameTemplate: "Flame Tongue {base}", bases: ["ls", "gs"] } },
      { id: "pot", name: "Spell Scroll", icon: null, rarity: "common", slot: "item", consumable: true, spells: [{ spellId: "spell-light", label: "Light", castLevel: 1 }] },
      { id: "res", name: "Armor of Resistance ({param})", icon: null, rarity: "rare", slot: "armor", gear: true, parameter: { kind: "damageType", options: [{ key: "fire", label: "Fire" }, { key: "cold", label: "Cold" }] } },
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

    expect(screen.getByText('inventory.grant.baseTitle {"name":"Flame Tongue"}')).toBeTruthy();

    fireEvent.change(screen.getByLabelText("inventory.grant.baseSearch"), { target: { value: "great" } });

    expect(screen.queryByRole("button", { name: /^Longsword/ })).toBeNull();
    expect(screen.getByText("Flame Tongue Greatsword · artifacts.rarity.rare")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Greatsword/ }));

    fireEvent.click(screen.getByRole("button", { name: "inventory.grant.submit" }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "ft", baseId: "gs" }));
  });

  it("a scroll asks for a spell and quantity and explains DM eligibility", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /Spell Scroll/ }));

    expect(screen.getByText("inventory.grant.spellNote")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("inventory.grant.spell"), { target: { value: "spell-light" } });
    fireEvent.change(screen.getByLabelText("inventory.grant.quantity"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "inventory.grant.submit" }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "pot", quantity: 3, spellId: "spell-light" }));
  });

  it("asks for a typed item parameter and sends the selected key", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /Armor of Resistance/ }));
    fireEvent.change(screen.getByLabelText("inventory.grant.parameter"), { target: { value: "fire" } });
    fireEvent.click(screen.getByRole("button", { name: "inventory.grant.submit" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "res", parameter: "fire" }));
  });

  it("plain gear is granted in one click", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /^Longsword/ }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "ls" }));
  });
});
