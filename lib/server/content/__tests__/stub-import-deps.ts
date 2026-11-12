import type { ImportDeps } from '@/lib/server/content/import/import-content';
import type { IdName } from '@/types/common';
import type { ImportKind } from '@/types/content-import';

type Stub = Pick<ImportDeps, 'resource'> & {
    loadNames: (campaignId: string, kind: ImportKind) => Promise<IdName[]>;
} & Partial<ImportDeps>;

export const stubImportDeps = ({ loadNames, ...stub }: Stub): ImportDeps => ({
    loadKeys: async (c, k) =>
        (await loadNames(c, k)).map((r) => ({ ...r, slug: null })),
    writeSlug: async () => undefined,
    ...stub,
});
