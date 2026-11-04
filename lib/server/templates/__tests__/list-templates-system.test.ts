import { beforeEach, describe, expect, it, vi } from "vitest";

import { listTemplates } from "../list-templates";

import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findMany: (...args: unknown[]) => findMany(...args) } } }));

const row = (id: string, rules: unknown) => ({ id, name: id, description: null, visibility: "private", kind: "template", credits: null, locale: null, templateKey: null, rules, _count: {} });

beforeEach(() => findMany.mockReset());

describe("listTemplates system badge", () => {
  it("derives the system from stored rules", async () => {
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row("grim", WFRP_RULES), row("old5e", { classes: { enabled: true } }), row("plain", {})]);

    const { mine } = await listTemplates("u");

    expect(mine.map((c) => [c.id, c.system])).toEqual([["grim", "wfrp"], ["old5e", "dnd5e"], ["plain", "homm"]]);
    expect(mine[0]).not.toHaveProperty("rules");
  });
});
