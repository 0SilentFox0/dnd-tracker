import type { DefenseKind, HitSpot } from '../combat/constants';

export interface PercentileAttackDetails {
    roll: number;
    target: number;
    sl: number;
    netSl: number;
    location: HitSpot;
    doubles: boolean;
    /** A failed test that rolled a double (p165) or hit Dangerous (p305) */
    fumble?: true;
    defender?: { kind: DefenseKind; roll: number; sl: number; target: number };
    momentumUsed?: boolean;
    /** Personal Momentum acted as Advantage on the test (canon5e, p168) */
    momentumAdvantage?: true;
    /** Opposed melee test; survives the privacy strip of `defender`. */
    opposed?: boolean;
    /** Cancelled by the defender's Fate (How Did That Miss) */
    negated?: true;
    fortune?: {
        kind: 'reroll' | 'sl' | 'advantage' | 'notFail';
        firstRoll?: number;
        rolls?: number[];
        spent?: number;
    };
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
    fortune?: {
        kind: 'reroll' | 'sl' | 'notFail';
        firstRoll?: number;
        rolls?: number[];
        spent?: number;
    };
}
