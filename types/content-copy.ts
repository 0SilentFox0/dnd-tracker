import type { ContentKind } from '@/lib/constants/content-kinds';

export type CopyItem = { kind: ContentKind; ids: string[] };

export type CopyTargets = { campaignIds: string[] } | { all: true };

export type CopyRequest = {
    items: CopyItem[];
    targets: CopyTargets;
    dryRun?: boolean;
};

export type CopyRowRef = { kind: string; id: string; name: string };

export type CopyTargetReport = {
    campaignId: string;
    name: string;
    status: 'ok' | 'partial' | 'failed';
    created: CopyRowRef[];
    reused: CopyRowRef[];
    skipped: Array<{ kind: string; name: string; reason: string }>;
    error?: string;
};

export type CopyResult = { targets: CopyTargetReport[] };
