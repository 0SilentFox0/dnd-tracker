import type { CritKind, CritSource } from './catalog';

import type { CriticalEffect } from '@/lib/constants/critical-effects';
import type { BattleParticipant } from '@/types/battle';

export interface CritTriggerInfo {
    source: CritSource;
    kind: CritKind;
    actorId: string;
    targetId: string;
}

export interface CritTrigger extends CritTriggerInfo {
    key: string;
}

export interface RiderInfo {
    holder: BattleParticipant;
    kind: 'attack' | 'save';
    total: number;
    needed: number;
    targetId?: string;
}

export interface RiderResult {
    bonus: number;
    die: number;
}

/** Offers a held d20 die after a failed test it could flip; the holder's choice arrives through the replay */
export type RiderPicker = (info: RiderInfo) => RiderResult | undefined;

export interface RiderOffer {
    key: string;
    holderId: string;
    kind: RiderInfo['kind'];
    die: number;
    total: number;
}

export type CritPicker = {
    (info: CritTriggerInfo): CriticalEffect | undefined;
    rider?: RiderPicker;
};

export interface PendingCritChoice {
    action: 'attack' | 'spell';
    actorId: string;
    triggers: CritTrigger[];
    riders?: RiderOffer[];
}

export interface CritPendingHidden {
    request: unknown;
    seed: number;
    serverRolls?: boolean;
    userId: string;
    isDM: boolean;
}

export interface CritResume {
    seed: number;
    choices: Record<string, number>;
    riderChoices?: Record<string, boolean>;
}
