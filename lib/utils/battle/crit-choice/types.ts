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

export interface NegateInfo {
    holder: BattleParticipant;
    actorId: string;
    /** i18n key of the price shown to the holder */
    cost: string;
}

/** Offers the holder to cancel a hit at a price; the answer arrives through the replay */
export type NegatePicker = (info: NegateInfo) => boolean;

export interface NegateOffer {
    key: string;
    holderId: string;
    actorId: string;
    cost: string;
}

export type CritPicker = {
    (info: CritTriggerInfo): CriticalEffect | undefined;
    rider?: RiderPicker;
    negate?: NegatePicker;
};

export interface PendingCritChoice {
    action: 'attack' | 'spell';
    actorId: string;
    triggers: CritTrigger[];
    riders?: RiderOffer[];
    negations?: NegateOffer[];
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
    negateChoices?: Record<string, boolean>;
}
