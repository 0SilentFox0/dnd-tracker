import type { AbilityFlowSummary } from '@/lib/utils/abilities/segments';
import type { ItemGroupCardData } from '@/types/artifacts';
export interface ArtifactSetSummaryArtifact {
    id: string;
    name: string;
    slot: string;
    icon?: string | null;
}

export interface ArtifactSetRow {
    id: string;
    campaignId: string;
    name: string;
    description: string | null;
    setBonus: unknown;
    icon?: string | null;
    createdAt: string;
    artifacts?: ArtifactSetSummaryArtifact[];
    abilitySummary?: AbilityFlowSummary[];
}

export type ArtifactSetCardData = ItemGroupCardData;
