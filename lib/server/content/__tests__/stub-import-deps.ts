import type { ImportDeps } from "@/lib/server/content/import/import-content";

type Stub = Pick<ImportDeps, "resource" | "loadNames"> & Partial<ImportDeps>;

export const stubImportDeps = (stub: Stub): ImportDeps => ({
  loadKeys: async (c, k) => (await stub.loadNames(c, k)).map((r) => ({ ...r, slug: null })),
  writeSlug: async () => undefined,
  ...stub,
});
