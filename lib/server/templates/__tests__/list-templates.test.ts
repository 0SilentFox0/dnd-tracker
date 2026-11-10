import { beforeEach, describe, expect, it, vi } from "vitest";

import { GRIM_TEMPLATE_NAME, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { listTemplates } from "@/lib/server/templates/list-templates";

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findMany: (...args: unknown[]) => findMany(...args) } } }));

describe("listTemplates", () => {
  beforeEach(() => findMany.mockReset());

  it("віддає locale і templateKey у картках і просить їх у select", async () => {
    findMany.mockResolvedValue([{ id: "t1", name: "5e SRD 5.2", description: null, visibility: "official", credits: null, locale: "uk", templateKey: "srd-5.2", _count: { units: 2 } }]);

    const { official } = await listTemplates("u1");

    expect(official[0]).toMatchObject({ id: "t1", locale: "uk", templateKey: "srd-5.2", counts: { units: 2 } });
    expect(findMany.mock.calls[0][0].select).toMatchObject({ locale: true, templateKey: true });
  });

  const srd = (id: string, locale: string | null) => ({ id, kind: "template", name: SRD_TEMPLATE_NAME, description: null, visibility: "official", credits: "CC-BY", locale, templateKey: SRD_TEMPLATE_NAME, _count: { classes: 12 } });

  it("lists one canonical SRD with both content languages and preserves private same-key templates", async () => {
    findMany.mockResolvedValueOnce([srd("english", null), srd("legacy", "uk")]).mockResolvedValueOnce([{ ...srd("private", "uk"), visibility: "private" }]);

    const result = await listTemplates("owner");

    expect(result.official).toEqual([expect.objectContaining({ id: "english", availableLocales: ["en", "uk"], counts: { classes: 12 } })]);
    expect(result.mine).toEqual([expect.objectContaining({ id: "private", locale: "uk" })]);
    expect(result.mine[0]).not.toHaveProperty("availableLocales");
    expect(findMany.mock.calls[0][0].select).toMatchObject({ kind: true, visibility: true });
  });

  it("rejects ambiguous canonical SRD sources rather than silently grouping them", async () => {
    findMany.mockResolvedValueOnce([srd("english", "en"), srd("old-english", null)]).mockResolvedValueOnce([]);
    await expect(listTemplates("owner")).rejects.toMatchObject({ status: 409 });
  });

  const grim = (id: string, locale: string | null) => ({ ...srd(id, locale), name: GRIM_TEMPLATE_NAME, templateKey: GRIM_TEMPLATE_NAME, _count: { careers: 3 } });

  it("offers both content languages for the canonical Grim", async () => {
    findMany.mockResolvedValueOnce([grim("grim", "en")]).mockResolvedValueOnce([]);
    expect((await listTemplates("owner")).official[0]).toMatchObject({ id: "grim", availableLocales: ["en", "uk"] });
  });

  it("rejects two canonical Grim sources but allows one SRD plus one Grim", async () => {
    findMany.mockResolvedValueOnce([grim("a", "en"), grim("b", null)]).mockResolvedValueOnce([]);
    await expect(listTemplates("owner")).rejects.toMatchObject({ status: 409 });
    findMany.mockResolvedValueOnce([srd("srd", "en"), grim("grim", "en")]).mockResolvedValueOnce([]);
    expect((await listTemplates("owner")).official).toHaveLength(2);
  });
});
