// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "@/components/character-profile/__tests__/sheet-fixture";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const view = {
  purse: { gp: 1, sp: 2, cp: 3 },
  items: [{ id: "p1", name: "Зілля", quantity: 2, consumable: true }],
  artifacts: [{ id: "r1", name: "Перстень", icon: null, rarity: null, slot: "ring", description: null }],
};

vi.mock("@/lib/api/inventory", () => ({
  getStash: vi.fn(),
  postStashAction: vi.fn(),
}));

import { getStash, postStashAction } from "@/lib/api/inventory";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { useInventory } from "@/lib/hooks/characters";

function setup(sheet = sheetFixture) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ConfirmProvider>{children}</ConfirmProvider>
    </QueryClientProvider>
  );

  return { qc, ...renderHook(() => useInventory("c", "ch", sheet), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMatchMedia(false);
  vi.mocked(getStash).mockResolvedValue(view);
  vi.mocked(postStashAction).mockResolvedValue(view);
});

describe("useInventory", () => {
  it("equipment: 9 клітинок у порядку сітки, броня заповнена", () => {
    const { result } = setup();

    expect(result.current.equipment.map((c) => c.key)).toEqual(ARTIFACT_GRID_9.map((c) => c.key));
    expect(result.current.equipment.find((c) => c.key === "armor")?.artifact?.id).toBe("a1");
  });

  it("equip і unequip шлють відповідні дії", async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.backpack?.query.data).toBeDefined());
    await act(() => result.current.actions.equip("r1"));

    expect(postStashAction).toHaveBeenCalledWith("c", "ch", { action: "equip", artifactId: "r1" });

    await act(() => result.current.actions.unequip("armor"));

    expect(postStashAction).toHaveBeenCalledWith("c", "ch", { action: "stash", slot: "armor" });
  });

  it("drop: неприйнятний слот не шле, прийнятний екіпірує, drag скидається", async () => {
    const { result } = setup();

    act(() => result.current.drag.set({ from: "backpack", artifactId: "r1", slotType: "ring" }));
    await act(() => result.current.actions.drop({ kind: "slot", slot: "helmet" }));

    expect(postStashAction).not.toHaveBeenCalled();
    expect(result.current.drag.value).toBeNull();

    act(() => result.current.drag.set({ from: "backpack", artifactId: "r1", slotType: "ring" }));
    await act(() => result.current.actions.drop({ kind: "slot", slot: "ring1" }));

    expect(postStashAction).toHaveBeenCalledWith("c", "ch", { action: "equip", artifactId: "r1" });
  });

  it("use шле useItem", async () => {
    const { result } = setup();

    await act(() => result.current.actions.use("p1"));

    expect(postStashAction).toHaveBeenCalledWith("c", "ch", { action: "useItem", itemId: "p1" });
  });

  it("стале виділення стає null", async () => {
    const { result, qc } = setup();

    await waitFor(() => expect(result.current.backpack?.query.data).toBeDefined());
    act(() => result.current.selection.set({ kind: "item", id: "p1" }));

    expect(result.current.selection.value).toMatchObject({ kind: "item", item: { id: "p1" } });

    act(() => qc.setQueryData(["character-stash", "c", "ch"], { ...view, items: [] }));
    await waitFor(() => expect(result.current.selection.value).toBeNull());
  });

  it("на схваленні рюкзака немає і дії ігноруються", async () => {
    const { result } = setup(withSheet({ review: { pending: true, note: null } }));

    await act(() => result.current.actions.equip("r1"));

    expect(getStash).not.toHaveBeenCalled();
    expect(result.current.backpack).toBeNull();
    expect(result.current.access.canAct).toBe(false);
    expect(postStashAction).not.toHaveBeenCalled();
  });

  it("чужий перегляд: без дій і без клітинки add", async () => {
    const { result } = setup(withSheet({ viewer: { isDM: false, isOwner: false } }));

    await waitFor(() => expect(result.current.backpack?.query.data).toBeDefined());
    await act(() => result.current.actions.use("p1"));

    expect(result.current.access.canAct).toBe(false);
    expect(result.current.backpack?.cells.some((c) => c.kind === "add")).toBe(false);
    expect(postStashAction).not.toHaveBeenCalled();
  });
});
