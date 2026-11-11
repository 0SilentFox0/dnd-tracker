import { beforeEach, describe, expect, it, vi } from "vitest";

const exportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/templates/export-campaign", () => ({ exportCampaign: exportMock }));

import { clearBundleCache } from "@/lib/server/templates/bundle-cache";
import { localizedExport } from "@/lib/server/templates/localized-export";

const db = {} as never;

const empty = { spells: [], units: [], races: [], classes: [], feats: [], careers: [], backgrounds: [], mainSkills: [], skills: [], spellGroups: [], artifacts: [], artifactSets: [], tracks: [], skillTrees: [], rules: null };

const bundleWith = (spells: Record<string, unknown>[]) => ({ ...empty, spells });

const tr = { "spells/bless/name": { text: "Благословення", en: "Bless" } };

beforeEach(() => {
  clearBundleCache();
  exportMock.mockReset();
});

describe("localizedExport", () => {
  it("returns the raw bundle without a dictionary, even when rows lack slugs", async () => {
    const raw = bundleWith([{ name: "Bless" }]);

    exportMock.mockResolvedValue(raw);

    expect(await localizedExport(db, "s", 1, {})).toBe(raw);
  });

  it("re-exports once and succeeds when slugs appear", async () => {
    exportMock.mockResolvedValueOnce(bundleWith([{ name: "Bless" }])).mockResolvedValueOnce(bundleWith([{ name: "Bless", slug: "bless" }]));

    const out = await localizedExport(db, "s", 1, tr);

    expect(exportMock).toHaveBeenCalledTimes(2);
    expect(out.spells[0].name).toBe("Благословення");
  });

  it("fails closed with TEMPLATE_NOT_READY (409) when slugs are still missing", async () => {
    exportMock.mockResolvedValue(bundleWith([{ name: "Bless" }]));

    await expect(localizedExport(db, "s", 1, tr)).rejects.toMatchObject({ status: 409, message: "errors.templateNotReady" });
    expect(exportMock).toHaveBeenCalledTimes(2);
  });

  it("does not re-export when every row has a slug", async () => {
    exportMock.mockResolvedValue(bundleWith([{ name: "Bless", slug: "bless" }]));

    await localizedExport(db, "s", 1, tr);

    expect(exportMock).toHaveBeenCalledTimes(1);
  });
});
