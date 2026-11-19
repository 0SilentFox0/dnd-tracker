import type { CriticalEffect } from '@/lib/constants/critical-effects';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { DamageRow } from '@/types/battle-actions';
import type { LogLine } from '@/types/text';

export interface AttackRollResult {
    isHit: boolean;
    isCritical: boolean;
    isCriticalFail: boolean;
    totalAttackValue: number;
    attackBonus: number;
    criticalEffect?: CriticalEffect;
    advantageUsed: boolean;
    chosenD20: number;
    secondRoll?: {
        mode: 'advantage' | 'disadvantage';
        value: number;
        serverRolled: boolean;
        manual?: boolean;
    };
    /** d20 never writes these three */
    system?: SystemSlot;
    margin?: number;
    location?: string;
    riderBonus?: number;
}

export interface AttackResult {
    attackRoll: AttackRollResult;
    damageResult?: {
        totalDamage: number;
        finalDamage: number;
        breakdown: DamageRow[];
        resistanceBreakdown: LogLine[];
    };
    targetHpChange: {
        oldHp: number;
        newHp: number;
        oldTempHp: number;
        newTempHp: number;
    };
    criticalEffectApplied?: CriticalEffect;
}
