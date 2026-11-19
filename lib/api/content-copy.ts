import { campaignGet, campaignPost } from '@/lib/api/client';
import type { IdName } from '@/types/common';
import type {
    ContentCopyKind,
    CopyRequest,
    CopyResult,
} from '@/types/content-copy';

export const contentCopyApi = {
    options: (campaignId: string, kind: ContentCopyKind) =>
        campaignGet<{ items: IdName[]; campaigns: IdName[] }>(
            campaignId,
            `/content-copy?kind=${encodeURIComponent(kind)}`
        ),
    campaigns: (campaignId: string) =>
        campaignGet<{ campaigns: IdName[] }>(
            campaignId,
            '/content-copy?campaignsOnly=1'
        ),
    copy: (campaignId: string, body: CopyRequest) =>
        campaignPost<CopyResult>(campaignId, '/content-copy', body),
};
