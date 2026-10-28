import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }) } }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));

const state = vi.hoisted(() => ({ rows: new Map<string, Record<string, unknown>>(), seq: 0 }));

vi.mock("@/lib/server/content/resources", async () => {
  const { defineResource } = await import("@/lib/server/content/define-resource");

  const thing = defineResource<Record<string, unknown>, { name: string; level?: number }, { name?: string }>({
    kind: "units",
    listFields: ["raceId", "level", "maxHp", "armorClass"],
    idParam: "unitId",
    label: "Юніти",
    description: "Тест",
    path: "/units",
    schemas: { create: z.object({ name: z.string().min(2), level: z.number().optional() }), update: z.object({ name: z.string().min(2).optional() }) },
    access: { list: "member", item: "member" },
    invalidates: [],
    notFound: "Юніта не знайдено",
    list: async () => [...state.rows.values()],
    find: async (actor, id) => {
      const row = state.rows.get(id);

      return row && row.campaignId === actor.campaignId ? row : null;
    },
    create: async (actor, input) => {
      const row = { id: `n${++state.seq}`, campaignId: actor.campaignId, ...input };

      state.rows.set(row.id, row);

      return row;
    },
    update: async (_a, existing, input) => {
      const row = { ...existing, ...input };

      state.rows.set(existing.id as string, row);

      return row;
    },
    remove: async (_a, existing) => {
      state.rows.delete(existing.id as string);
    },
  });

  return { CONTENT_RESOURCES: { units: thing } };
});

const sync = vi.hoisted(() => ({ diff: vi.fn(), apply: vi.fn() }));

const skillTree = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));

vi.mock("@/lib/server/skills/skill-tree-service", () => ({ readSkillTree: skillTree.read, saveSkillTree: skillTree.save }));
vi.mock("@/lib/server/templates/sync/service", () => ({ getSourceDiff: sync.diff, applySource: sync.apply }));
vi.mock("@/lib/server/campaigns/rules", () => ({ readCampaignRules: vi.fn(async () => ({ r: 1 })), updateCampaignRules: vi.fn(async (_c: string, p: unknown) => p) }));

import { toolsFor } from "@/lib/ai/tools";
import { contentCreateTool, contentGetTool, contentKindsTool, contentListTool, contentUpdateTool, getSkillTreeTool, saveSkillTreeTool, sourceApplyTool, sourceDiffTool, updateRulesTool } from "@/lib/ai/tools/content";
import { runTool } from "@/lib/ai/tools/define";
import { AI_LIMITS } from "@/lib/constants/ai";
import { ContentError } from "@/lib/server/content/errors";

const ctx = { campaignId: "c1", userId: "u1", scopes: ["content:write"] as const, threadId: null };

const unitRow = (i: number) => ({
  id: `u${i}`,
  campaignId: "c1",
  name: `Юніт номер ${i}`,
  raceId: "race-1",
  level: 1 + (i % 10),
  maxHp: 100 + i,
  armorClass: 15,
  strength: 10,
  attacks: [{ name: "Удар", damage: "1d8", bonus: 5 }],
  abilitySummary: "x".repeat(200),
});

describe("content tools", () => {
  beforeEach(() => {
    state.rows.clear();
    state.seq = 0;
    vi.clearAllMocks();
  });

  it("content_kinds перелічує види й extra", async () => {
    const out = JSON.parse(await runTool(contentKindsTool, ctx, {}));

    expect(out.kinds[0]).toMatchObject({ kind: "units", label: "Юніти", ops: ["list", "get", "create", "update", "delete"] });
    expect(out.extra).toEqual(["abilities", "rules", "skill-tree"]);
  });

  it("content_list: 150 юнітів → 50 за раз, total=150, без обрізання", async () => {
    for (let i = 0; i < 150; i++) state.rows.set(`u${i}`, unitRow(i));

    const text = await runTool(contentListTool, ctx, { kind: "units", limit: 50 });

    expect(text).not.toContain("[обрізано]");

    const out = JSON.parse(text);

    expect(out.total).toBe(150);
    expect(out.items).toHaveLength(50);
    expect(Object.keys(out.items[0]).sort()).toEqual(["armorClass", "id", "level", "maxHp", "name", "raceId"]);
    expect(text.length).toBeLessThan(24_000);
  });

  it("content_list offset дає наступну сторінку", async () => {
    for (let i = 0; i < 150; i++) state.rows.set(`u${i}`, unitRow(i));

    const out = JSON.parse(await runTool(contentListTool, ctx, { kind: "units", limit: 50, offset: 50 }));

    expect(out.items[0].id).toBe("u50");
  });

  it("content_create: ContentError з issues → текст із шляхами полів", async () => {
    const text = await runTool(contentCreateTool, ctx, { kind: "units", data: { name: "" } });

    expect(text).toMatch(/^Помилка:/);
    expect(text).toContain("name:");
  });

  it("content_create → get → update через сервіс", async () => {
    const created = JSON.parse(await runTool(contentCreateTool, ctx, { kind: "units", data: { name: "Гоблін" } }));

    expect(JSON.parse(await runTool(contentGetTool, ctx, { kind: "units", id: created.id })).name).toBe("Гоблін");

    const updated = JSON.parse(await runTool(contentUpdateTool, ctx, { kind: "units", id: created.id, patch: { name: "Орк" } }));

    expect(updated.name).toBe("Орк");
  });

  it("content_get чужої кампанії → «не знайдено» текстом", async () => {
    state.rows.set("x", { id: "x", campaignId: "other", name: "Чужий" });

    expect(await runTool(contentGetTool, ctx, { kind: "units", id: "x" })).toBe("Помилка: Юніта не знайдено");
  });

  it("content_create з токеном content:read → помилка прав текстом; в реєстрі невидимий", async () => {
    const text = await runTool(contentCreateTool, { ...ctx, scopes: ["content:read"] }, { kind: "units", data: { name: "Гоблін" } });

    expect(text).toMatch(/^Помилка:/);
    expect(state.rows.size).toBe(0);
    expect(toolsFor(["content:read"]).map((t) => t.name)).not.toContain("content_create");
    expect(toolsFor(["content:read"]).map((t) => t.name)).toContain("content_list");
  });

  it("update_rules: невалідний патч → текст", async () => {
    const text = await runTool(updateRulesTool, ctx, { patch: { morale: { cap: 99 } } });

    expect(text).toMatch(/^Помилка:/);
    expect(text).toContain("morale.cap");
  });

  it("get_skill_tree без дерева → текст", async () => {
    skillTree.read.mockResolvedValue(null);

    expect(await runTool(getSkillTreeTool, ctx, { race: "Люди" })).toContain("ще немає");
  });

  it("save_skill_tree з невалідним деревом → текст зі списком помилок", async () => {
    skillTree.save.mockRejectedValue(new ContentError("Некоректне дерево", 400, [{ code: "duplicateSkill", ref: "o1" }]));

    const text = await runTool(saveSkillTreeTool, ctx, { race: "Люди", skills: { mainSkills: [{ id: "m1" }] } });

    expect(text).toContain("Некоректне дерево");
    expect(text).toContain("- (корінь): code=duplicateSkill, ref=o1");
  });

  it("save_skill_tree: skills без mainSkills → текст, дерево не зберігається", async () => {
    skillTree.save.mockClear();

    const text = await runTool(saveSkillTreeTool, ctx, { race: "Люди", skills: {} });

    expect(text).toMatch(/^Помилка:/);
    expect(text).toContain("skills.mainSkills");
    expect(skillTree.save).not.toHaveBeenCalled();
  });

  it("save_skill_tree: порожній mainSkills / форма { tree } → текст, не зберігається", async () => {
    skillTree.save.mockClear();

    expect(await runTool(saveSkillTreeTool, ctx, { race: "Люди", skills: { mainSkills: [] } })).toMatch(/^Помилка:/);
    expect(await runTool(saveSkillTreeTool, ctx, { race: "Люди", tree: {} })).toContain("skills");
    expect(skillTree.save).not.toHaveBeenCalled();
  });

  it("save_skill_tree: валідне дерево → { id, race, skills }", async () => {
    skillTree.save.mockResolvedValue({ id: "t1", race: "Люди", skills: { mainSkills: [{ id: "m1" }] } });

    const text = await runTool(saveSkillTreeTool, ctx, { race: "Люди", skills: { mainSkills: [{ id: "m1", name: "Бій", color: "red" }] } });

    expect(JSON.parse(text)).toEqual({ id: "t1", race: "Люди", skills: { mainSkills: [{ id: "m1" }] } });
  });

  it("не-ContentError → загальний текст без сирого повідомлення, помилка в лозі", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    skillTree.read.mockRejectedValue(new Error("Invalid prisma.invocation secret"));

    const text = await runTool(getSkillTreeTool, ctx, { race: "Люди" });

    expect(text).toMatch(/^Помилка:/);
    expect(text).not.toContain("prisma");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("source_diff для content:read, source_apply лише для content:write", () => {
    expect(toolsFor(["content:read"]).map((t) => t.name)).toContain("source_diff");
    expect(toolsFor(["content:read"]).map((t) => t.name)).not.toContain("source_apply");
    expect(toolsFor(["content:write"]).map((t) => t.name)).toContain("source_apply");
  });

  it("source_diff: малий результат повертається як є", async () => {
    sync.diff.mockResolvedValue({ source: { id: "s", name: "S", kind: "template" }, syncedAt: null, items: [{ scope: "units", key: "a" }] });

    expect(JSON.parse(await runTool(sourceDiffTool, ctx, {})).items).toHaveLength(1);
  });

  it("source_diff: великий scope гортається сторінками в межах ліміту", async () => {
    const items = Array.from({ length: 400 }, (_, i) => ({ scope: i % 4 ? "units" : "spells", key: `k${i}`, name: "x".repeat(80), changedFields: ["a", "b"] }));

    sync.diff.mockResolvedValue({ source: { id: "s", name: "S", kind: "template" }, syncedAt: null, items });

    const seen: string[] = [];

    let offset = 0;

    for (let guard = 0; guard < 50; guard++) {
      const text = await runTool(sourceDiffTool, ctx, { offset });

      expect(text.length).toBeLessThanOrEqual(AI_LIMITS.toolResultChars);

      const page = JSON.parse(text);

      expect(page).toMatchObject({ total: 400, counts: { spells: 100, units: 300 } });
      seen.push(...page.items.map((i: { key: string }) => i.key));

      if (page.nextOffset === null) break;

      expect(page.nextOffset).toBeGreaterThan(offset);
      offset = page.nextOffset;
    }

    expect(seen).toEqual(items.map((i) => i.key));
  });

  it("source_diff: scope перевіряється, offset/limit обмежують сторінку", async () => {
    sync.diff.mockResolvedValue({ source: { id: "s", name: "S", kind: "template" }, syncedAt: null, items: Array.from({ length: 5 }, (_, i) => ({ scope: "units", key: `k${i}` })) });

    expect(await runTool(sourceDiffTool, ctx, { scope: "bogus" })).toMatch(/^Помилка:/);

    const page = JSON.parse(await runTool(sourceDiffTool, ctx, { scope: "units", offset: 1, limit: 2 }));

    expect(page.items.map((i: { key: string }) => i.key)).toEqual(["k1", "k2"]);
    expect(page.nextOffset).toBe(3);
    expect(sync.diff).toHaveBeenLastCalledWith(expect.anything(), "units");
  });

  it("source_apply: невалідне тіло → текст помилки, сервіс не викликається", async () => {
    const text = await runTool(sourceApplyTool, ctx, { apply: [{ scope: "units" }] });

    expect(text).toMatch(/^Помилка:/);
    expect(sync.apply).not.toHaveBeenCalled();
  });

  it("source_apply: валідне тіло передається в сервіс", async () => {
    sync.apply.mockResolvedValue({ applied: 1, ignored: 0, autoAdded: [], warnings: [] });

    const out = JSON.parse(await runTool(sourceApplyTool, ctx, { apply: [{ scope: "units", key: "a", sourceHash: "h", status: "new" }] }));

    expect(out.applied).toBe(1);
    expect(sync.apply.mock.calls[0][1]).toEqual({ apply: [{ scope: "units", key: "a", sourceHash: "h", status: "new" }], ignore: [] });
  });
});
