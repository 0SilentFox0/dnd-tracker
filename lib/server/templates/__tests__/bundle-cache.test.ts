import { beforeEach, describe, expect, it, vi } from "vitest";

const exportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/templates/export-campaign", () => ({ exportCampaign: exportMock }));

import { cachedExport, clearBundleCache } from "@/lib/server/templates/bundle-cache";

const db = {} as never;

beforeEach(() => {
  clearBundleCache();
  exportMock.mockReset();
  exportMock.mockImplementation(async (_db, id: string) => ({ id }));
});

describe("cachedExport", () => {
  it("does not hit the database again for the same source version", async () => {
    const a = await cachedExport(db, "s1", 3);

    const b = await cachedExport(db, "s1", 3);

    expect(b).toBe(a);
    expect(exportMock).toHaveBeenCalledTimes(1);
  });

  it("re-exports when the version changes", async () => {
    await cachedExport(db, "s1", 3);
    await cachedExport(db, "s1", 4);

    expect(exportMock).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight export between concurrent callers", async () => {
    await Promise.all([cachedExport(db, "s1", 1), cachedExport(db, "s1", 1)]);

    expect(exportMock).toHaveBeenCalledTimes(1);
  });

  it("evicts the least recently used entry beyond four", async () => {
    for (const v of [1, 2, 3, 4]) await cachedExport(db, "s", v);

    await cachedExport(db, "s", 1);
    await cachedExport(db, "s", 5);
    exportMock.mockClear();

    await cachedExport(db, "s", 1);
    await cachedExport(db, "s", 2);

    expect(exportMock.mock.calls.map((c) => c[1])).toEqual(["s"]);
    expect(exportMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    exportMock.mockRejectedValueOnce(new Error("boom"));

    await expect(cachedExport(db, "s1", 1)).rejects.toThrow("boom");
    await expect(cachedExport(db, "s1", 1)).resolves.toEqual({ id: "s1" });
  });
});
