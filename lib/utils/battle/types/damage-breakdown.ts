import type { Ruleset } from '@/lib/utils/rules';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { DamageRow, DamageStep } from '@/types/battle-actions';
import type { LogLine } from '@/types/text';

export interface DamageBreakdownResult {
    breakdown: DamageRow[];
    totalDamage: number;
    targetBreakdown: LogLine[];
    finalDamage: number;
    steps: DamageStep[];
}

export interface ComputeDamageBreakdownParams {
    attacker: BattleParticipant;
    target: BattleParticipant;
    attack: BattleAttack;
    damageRolls: number[];
    allParticipants: BattleParticipant[];
    isCritical?: boolean;
    rules: Ruleset;
}
