import 'server-only';
import { loadKeys } from '@/lib/server/content/import/slug';
import type { IdName } from '@/types/common';
import type { ImportKind } from '@/types/content-import';

export const loadNames = (
    campaignId: string,
    kind: ImportKind
): Promise<IdName[]> => loadKeys(campaignId, kind);
