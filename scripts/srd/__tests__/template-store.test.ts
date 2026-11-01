import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeTemplateStore } from "../lib/template-store";

import { EMPTY_5E_TEMPLATE_NAME, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";

const findFirst = vi.fn();

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findFirst: (...args: unknown[]) => findFirst(...args), findMany: (...args: unknown[]) => findMany(...args) } } }));
vi.mock("@/lib/server/campaigns/create-campaign", () => ({ createCampaignFromBundle: vi.fn() }));

beforeEach(() => { findFirst.mockReset(); findMany.mockReset(); });

describe("template store source selection", () => {
  it("rejects duplicate English SRD candidates instead of reseeding an arbitrary source", async () => {
    findFirst.mockResolvedValue({ id: "first", dmUserId: "owner" });
    findMany.mockResolvedValue([{ id: "first", dmUserId: "owner" }, { id: "second", dmUserId: "owner" }]);
    await expect(makeTemplateStore(SRD_TEMPLATE_NAME).findTemplate()).rejects.toThrow(/canonical|канонічн/i);
  });

  it("preserves the existing English SRD id and null-locale lookup", async () => {
    findFirst.mockResolvedValue({ id: "existing", dmUserId: "owner" });
    findMany.mockResolvedValue([{ id: "existing", dmUserId: "owner" }]);
    expect(await makeTemplateStore(SRD_TEMPLATE_NAME).findTemplate()).toEqual({ id: "existing", dmUserId: "owner" });
  });

  it("does not adopt an official same-name source with another template key", async () => {
    // This stub executes the identity/locale part of the emitted query, so a
    // name-only fallback really selects the unrelated row and fails this test.
    const rows = [{ id: "unrelated", dmUserId: "owner", name: SRD_TEMPLATE_NAME, templateKey: "another-source", locale: "en", kind: "template", visibility: "official" }];

    type Where = Record<string, unknown> & { AND?: Where[]; OR?: Where[] };

    const matches = (row: (typeof rows)[number], where: Where): boolean => Object.entries(where).every(([key, value]) => {
      if (key === "AND") return (value as Where[]).every((condition) => matches(row, condition));

      if (key === "OR") return (value as Where[]).some((condition) => matches(row, condition));

      return row[key as keyof typeof row] === value;
    });

    findMany.mockImplementation(async ({ where }: { where: Where }) => rows.filter((row) => matches(row, where)));
    expect(await makeTemplateStore(SRD_TEMPLATE_NAME).findTemplate()).toBeNull();
  });

  it("keeps empty-5e and other locale callers on their existing name/locale lookup", async () => {
    findFirst.mockResolvedValue({ id: "empty", dmUserId: "owner" });
    expect(await makeTemplateStore(EMPTY_5E_TEMPLATE_NAME).findTemplate()).toEqual({ id: "empty", dmUserId: "owner" });
    expect(findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { name: EMPTY_5E_TEMPLATE_NAME, kind: "template", visibility: "official", OR: [{ locale: null }, { locale: "en" }] } }));
    await makeTemplateStore("Other", "uk").findTemplate();
    expect(findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { name: "Other", kind: "template", visibility: "official", locale: "uk" } }));
  });
});
