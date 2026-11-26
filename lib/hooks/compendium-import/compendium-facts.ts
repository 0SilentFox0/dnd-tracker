import type { CompendiumImportController } from './useCompendiumImport';

import { estimateRecords } from '@/lib/utils/compendium-import/categories';

export function compendiumFacts({
    root,
    categories,
    excludedChapters,
    preview,
}: CompendiumImportController['state']) {
    return {
        categories: categories.length,
        records: root ? estimateRecords(root, categories, excludedChapters) : 0,
        images: preview?.report.media?.queued ?? 0,
        blockers: preview?.report.counts.errors ?? 0,
    };
}
