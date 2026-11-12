import type { DefenseKind, HitLocation } from '../combat/constants';

export interface PercentileAttackDetails {
    roll: number;
    target: number;
    sl: number;
    netSl: number;
    location: HitLocation;
    doubles: boolean;
    defender?: { kind: DefenseKind; roll: number; sl: number; target: number };
    momentumUsed?: boolean;
    /** Opposed melee test; survives the privacy strip of `defender`. */
    opposed?: boolean;
    fortune?: { kind: 'reroll' | 'sl'; firstRoll?: number };
}

export interface PercentileCastDetails {
    roll: number;
    target: number;
    sl: number;
    cn: number;
    channelled: number;
    armourSl: number;
    doubles: boolean;
    outcome: 'critical' | 'success' | 'failure' | 'fumble';
    overcastSteps: number;
    miscast: 'minor' | 'major' | 'wrath' | null;
    fortune?: { kind: 'reroll' | 'sl'; firstRoll?: number };
}
