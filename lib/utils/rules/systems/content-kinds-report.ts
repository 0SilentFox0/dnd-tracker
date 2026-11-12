import { parseRules } from '@/lib/utils/rules/schema';
import { contentKindsOf } from '@/lib/utils/rules/systems/catalog';

export interface ReportCampaign {
    id: string;
    rules: unknown;
}

export interface KindCount {
    campaignId: string;
    kind: string;
    count: number;
}

/** Rows that exist but whose kind is outside the campaign's composition (hidden by D15, never deleted) */
export function hiddenContentRows(
    campaigns: readonly ReportCampaign[],
    counts: readonly KindCount[]
): KindCount[] {
    const kinds = new Map(
        campaigns.map(({ id, rules }) => [
            id,
            contentKindsOf(parseRules(rules).system),
        ])
    );

    return counts.filter(
        (c) => c.count > 0 && !kinds.get(c.campaignId)?.has(c.kind)
    );
}
