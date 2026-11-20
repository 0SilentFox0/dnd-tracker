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
    /** Situational SL that shaped the test, canon combat modifiers */
    mods?: { key: string; sl: number }[];
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
    /** Critical Casting bonus picked by the caster, canon5e (p235) */
    critBonus?: 'criticalDamage' | 'totalPower' | 'unstoppableForce';
    /** An ingredient lowers the miscast one step instead of cancelling it, canon5e (p235) */
    stepAvert?: true;
    /** Prayer overcast bonuses (range, targets, duration) the core has no target for, canon5e (p217-222) */
    prayerOvercast?: {
        steps: number;
        bonus: Partial<
            Record<'rangeYards' | 'targets' | 'durationRounds', number>
        >;
    };
    fortune?: {
        kind: 'reroll' | 'sl' | 'notFail';
        firstRoll?: number;
        rolls?: number[];
        spent?: number;
    };
}
