import { describe, expect, it, vi } from "vitest";

import { listTemplates } from "@/lib/server/templates/list-templates";

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findMany: (...args: unknown[]) => findMany(...args) } } }));

describe("listTemplates", () => {
  it("віддає locale і templateKey у картках і просить їх у select", async () => {
    findMany.mockResolvedValue([{ id: "t1", name: "5e SRD 5.2", description: null, visibility: "official", credits: null, locale: "uk", templateKey: "srd-5.2", _count: { units: 2 } }]);

    const { official } = await listTemplates("u1");

    expect(official[0]).toMatchObject({ id: "t1", locale: "uk", templateKey: "srd-5.2", counts: { units: 2 } });
    expect(findMany.mock.calls[0][0].select).toMatchObject({ locale: true, templateKey: true });
  });
});
