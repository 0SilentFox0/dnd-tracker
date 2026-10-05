// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as treesApi from "@/lib/api/skill-trees";
import { useSkillTreeEditor } from "@/lib/hooks/skills";
import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/api/skill-trees");
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [{ id: "r1", name: "Ельф", availableSkills: ["attack"] }] }) }));
vi.mock("@/lib/hooks/skills/useMainSkills", () => ({ useMainSkills: () => ({ data: [{ id: "attack", name: "Напад", color: "red" }, { id: "defense", name: "Захист", color: "blue" }] }) }));
vi.mock("@/lib/hooks/skills/useSkills", () => ({ useSkills: () => ({ data: [{ id: "o1", name: "Кровопуск", mainSkillId: "attack" }, { id: "o2", name: "Шквал", mainSkillId: "attack" }] }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn(), useConfirm: () => vi.fn(async () => true) }));

afterEach(cleanup);

const rowWith = (outer: string[]) => ({ id: "row", campaignId: "c", race: "Ельф", createdAt: "", skills: buildTreeJson({ id: "row", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer }] }) });

function setup() {
  const qc = new QueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, ...renderHook(() => useSkillTreeEditor("c"), { wrapper }) };
}

describe("useSkillTreeEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("рефетч зі зміненим деревом не перезаписує незбережені правки", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith(["o1"])] as never);

    const { qc, result } = setup();

    await waitFor(() => expect(result.current.tree?.grid.get("attack")?.outer[0]).toBe("o1"));

    act(() => result.current.actions.setCell({ kind: "slot", branchId: "attack", circle: "outer", index: 1 }, "o2"));

    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith(["o1", "o1-changed-on-server"])] as never);
    await act(() => qc.invalidateQueries({ queryKey: ["skill-trees", "c"] }));
    await waitFor(() => expect(vi.mocked(treesApi.getSkillTrees)).toHaveBeenCalledTimes(2));

    expect(result.current.tree?.grid.get("attack")?.outer).toEqual(["o1", "o2", null]);
    expect(result.current.dirty).toBe(true);
  });

  it("без дерева — стартові гілки з race.availableSkills, збереження з id \"new\"", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([] as never);
    vi.mocked(treesApi.updateSkillTree).mockResolvedValue({ id: "row", race: "Ельф", skills: buildTreeJson({ id: "row", race: "Ельф", branches: [] }) });

    const { result } = setup();

    await waitFor(() => expect(result.current.tree?.branches.map((b) => b.id)).toEqual(["attack"]));

    await act(() => result.current.actions.save());

    expect(vi.mocked(treesApi.updateSkillTree).mock.calls[0][0]).toMatchObject({ campaignId: "c", treeId: "new", race: "Ельф" });
  });

  it("дубль скіла дає помилку й блокує save", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith(["o1"])] as never);

    const { result } = setup();

    await waitFor(() => expect(result.current.tree).not.toBeNull());

    act(() => result.current.actions.setCell({ kind: "level", branchId: "attack", level: "basic" }, "o1"));

    expect(result.current.errors).toContainEqual({ code: "duplicateSkill", ref: "o1" });

    await act(() => result.current.actions.save());
    expect(treesApi.updateSkillTree).not.toHaveBeenCalled();
  });

  it("add / move / remove гілки", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith([])] as never);

    const { result } = setup();

    await waitFor(() => expect(result.current.availableBranches.map((b) => b.id)).toEqual(["defense"]));

    act(() => result.current.actions.addBranch("defense"));
    act(() => result.current.actions.moveBranch("defense", -1));
    expect(result.current.tree?.branches.map((b) => b.id)).toEqual(["defense", "attack"]);

    act(() => result.current.actions.removeBranch("attack"));
    expect(result.current.tree?.branches.map((b) => b.id)).toEqual(["defense"]);
  });
});
