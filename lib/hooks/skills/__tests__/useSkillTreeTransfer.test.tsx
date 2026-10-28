// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSkillTreeTransfer } from "@/lib/hooks/skills/useSkillTreeTransfer";
import { SKILL_TREE_FILE_FORMAT } from "@/lib/utils/skills/tree-transfer";

const state = vi.hoisted(() => ({ trees: [] as Array<{ id: string; race: string; skills: unknown }> }));

const save = vi.hoisted(() => vi.fn(async () => ({})));

const notify = vi.hoisted(() => vi.fn(async () => {}));

const confirm = vi.hoisted(() => vi.fn(async () => true));

const downloadText = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/skills/useSkillTrees", () => ({ useSkillTrees: () => ({ data: state.trees }), useSaveSkillTree: () => ({ mutateAsync: save, isPending: false }) }));
vi.mock("@/lib/hooks/skills/useMainSkills", () => ({ useMainSkills: () => ({ data: [{ id: "M1", name: "Напад" }] }) }));
vi.mock("@/lib/hooks/skills/useSkills", () => ({ useSkills: () => ({ data: [{ id: "S1", name: "Удар" }] }) }));
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [{ id: "r1", name: "Ельфи" }] }) }));
vi.mock("@/lib/hooks/spells", () => ({ useSpellGroups: () => ({ data: [] }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => notify, useConfirm: () => confirm }));
vi.mock("@/lib/utils/common/download-text", () => ({ downloadText }));

const fileOf = (data: unknown) => new File([JSON.stringify(data)], "trees.json");

const ELVES = { format: SKILL_TREE_FILE_FORMAT, race: "ельфи", skills: { mainSkills: [{ id: "m1" }], ultimateSkill: { id: "s1" } }, names: { m1: { name: "Напад", kind: "mainSkill" }, s1: { name: "Удар", kind: "skill" } } };

describe("useSkillTreeTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.trees = [];
  });

  afterEach(cleanup);

  it("імпорт: зберігає дерево з локальними id, про відсутню расу повідомляє", async () => {
    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf([ELVES, { ...ELVES, race: "Гноми" }])));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ treeId: "new", race: "Ельфи", skills: { mainSkills: [{ id: "M1" }], ultimateSkill: { id: "S1" } } });
    expect(notify).toHaveBeenCalledWith("Збережено дерева: Ельфи; Гноми: Раси «Гноми» немає в кампанії");
  });

  it("наявне дерево раси оновлюється за його id", async () => {
    state.trees = [{ id: "t1", race: "Ельфи", skills: {} }];

    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf(ELVES)));

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("Ельфи"), destructive: true }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ treeId: "t1" }));
  });

  it("відмова у підтвердженні — нічого не зберігається", async () => {
    state.trees = [{ id: "t1", race: "Ельфи", skills: {} }];
    confirm.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf(ELVES)));

    expect(save).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("нове дерево зберігається без підтвердження", async () => {
    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf(ELVES)));

    expect(confirm).not.toHaveBeenCalled();
  });

  it("сміття у файлі — повідомлення без збереження", async () => {
    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf({ race: "Ельфи" })));

    expect(save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith("Файл не схожий на експорт дерев скілів");
  });

  it("експорт усіх дерев з назвами", () => {
    state.trees = [{ id: "t1", race: "Ельфи", skills: { mainSkills: [{ id: "M1" }] } }];

    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    act(() => result.current.actions.exportAll());

    const [fileName, json, type] = downloadText.mock.calls[0] as [string, string, string];

    expect([fileName, type]).toEqual(["skill-trees.json", "application/json"]);
    expect(JSON.parse(json)).toEqual([{ format: SKILL_TREE_FILE_FORMAT, race: "Ельфи", skills: { mainSkills: [{ id: "M1" }] }, names: { M1: { name: "Напад", kind: "mainSkill" } } }]);
  });
});
