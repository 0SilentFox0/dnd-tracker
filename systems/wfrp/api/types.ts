import type { PurchaseRequest } from '../rules/advancement/plan';
import type {
    Characteristics,
    LedgerEntry,
} from '../rules/characteristics/keys';
import type { SpeciesProfile } from '../rules/creation';

import type { GoalKind } from '@/lib/constants/characters';

export interface WfrpDraftIdentityInput {
    name: string;
    alignment?: string;
    background?: string;
    avatar?: string;
    goals?: Array<{ text: string; kind: GoalKind }>;
}

export interface WfrpDraftInput extends WfrpDraftIdentityInput {
    speciesId: string;
    career: { mode: 'rolled' | 'choice' | 'free'; careerId: string };
    stats:
        | { mode: 'rolled'; rolls: number[] }
        | { mode: 'rearranged'; rolls: number[]; arranged: number[] }
        | { mode: 'free'; points: number[] };
    talents: string[];
}

export type AdvanceBody = PurchaseRequest;

export type CareerResult = { characteristics: Characteristics };

export type AdvanceResult = {
    characteristics: Characteristics;
    experience: number;
    available: number;
    entry: LedgerEntry;
};

export interface RaceProfileItem {
    raceId: string;
    profile: SpeciesProfile;
}
