// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/spells/useSpells", () => ({
  useSpells: () => ({ data: [{ id: "a", name: "Fire Bolt", level: 0, groupId: null, lists: ["Wizard", "Sorcerer"] }, { id: "b", name: "Cure Wounds", level: 1, groupId: null, lists: ["Cleric"] }, { id: "c", name: "Old", level: 1, groupId: null }], isLoading: false }),
  useSpellGroups: () => ({ data: [] }),
  useRemoveSpellFromGroup: () => ({ mutate: vi.fn() }),
  useMoveSpellToGroup: () => ({ mutate: vi.fn() }),
  useDeleteAllSpells: () => ({ mutateAsync: vi.fn() }),
}));

import { useSpellsList } from "@/lib/hooks/spells/useSpellsList";

describe("useSpellsList: list filter", () => {
  it("tags are sorted, filtering narrows the groups", () => {
    const { result } = renderHook(() => useSpellsList("c1"));

    expect(result.current.listFilter.tags).toEqual(["Cleric", "Sorcerer", "Wizard"]);

    const count = () => result.current.view.groups.flatMap(([, levels]) => levels.flatMap(([, list]) => list)).length;

    expect(count()).toBe(3);

    act(() => result.current.listFilter.set("Cleric"));

    expect(count()).toBe(1);
  });
});
