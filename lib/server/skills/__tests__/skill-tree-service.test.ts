import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  mainSkill: { findMany: vi.fn() },
  skill: { findMany: vi.fn() },
  skillTree: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { readSkillTree, saveSkillTree } from "@/lib/server/skills/skill-tree-service";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "token" as const, scopes: ["content:write" as const] };

describe("skill-tree-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (fn) => fn({ ...db, $queryRaw: async () => [{ id: "c1" }] }));
    db.mainSkill.findMany.mockResolvedValue([]);
    db.skill.findMany.mockResolvedValue([]);
  });

  it("невалідне дерево → ContentError 400 з issues", async () => {
    const skills = { id: "t", race: "Люди", mainSkills: [{ id: "x", levels: [] }] };

    await expect(saveSkillTree(actor, { race: "Люди", skills })).rejects.toMatchObject({ status: 400, issues: expect.any(Array) });
    expect(db.skillTree.create).not.toHaveBeenCalled();
  });

  it("раси ще немає → створює дерево і повертає рядок", async () => {
    db.skillTree.findFirst.mockResolvedValue(null);
    db.skillTree.create.mockResolvedValue({ id: "new" });
    db.skillTree.update.mockImplementation(async ({ where }) => ({ id: where.id, race: "Люди", skills: {} }));

    const saved = await saveSkillTree(actor, { treeId: "t1", race: "Люди", skills: {} });

    expect(db.skillTree.findFirst).toHaveBeenCalledTimes(2);
    expect(db.skillTree.create).toHaveBeenCalledWith({ data: { campaignId: "c1", race: "Люди", skills: {} } });
    expect(saved.id).toBe("new");
  });

  it("readSkillTree шукає за { campaignId, race }", async () => {
    db.skillTree.findFirst.mockResolvedValue(null);

    await expect(readSkillTree(actor, "Люди")).resolves.toBeNull();
    expect(db.skillTree.findFirst).toHaveBeenCalledWith({ where: { campaignId: "c1", race: "Люди" } });
  });

  it("токен із content:read не може зберегти (assertCan у сервісі)", async () => {
    const reader = { ...actor, scopes: ["content:read" as const] };

    await expect(saveSkillTree(reader, { race: "Люди", skills: { mainSkills: [] } })).rejects.toMatchObject({ status: 403 });
    expect(db.skillTree.create).not.toHaveBeenCalled();
  });

  it("не-DM не зберігає дерева", async () => {
    await expect(saveSkillTree({ ...actor, isDM: false, via: "session", scopes: null }, { race: "Люди", skills: { mainSkills: [] } })).rejects.toMatchObject({ status: 403 });
  });
});

it("saving an existing tree reads and writes inside the shared campaign lock", async () => {
  const { currentContentWrite } = await import("@/lib/server/content/write-context");

  db.mainSkill.findMany.mockResolvedValue([]); db.skill.findMany.mockResolvedValue([]);
  db.skillTree.findFirst.mockResolvedValue({ id: "tree", campaignId: "c1", race: "Люди", skills: {} });
  db.skillTree.update.mockImplementation(async () => ({ id: "tree", race: currentContentWrite()?.campaignId ?? "unlocked", skills: {} }));
  db.$transaction.mockImplementation(async (fn) => fn({ ...db, $queryRaw: async () => [{ id: "c1" }] }));
  expect(await saveSkillTree(actor, { race: "Люди", skills: {} })).toMatchObject({ race: "c1" });
});
