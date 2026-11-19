import type { AttackRollResult } from './attack';
import type { CastableSpell } from './spell-process';

import type { CriticalEffect } from '@/lib/constants/critical-effects';
import type { SummonRequest } from '@/lib/utils/abilities/engine/core/types';
import type { StrikeRiderEffect } from '@/lib/utils/abilities/schema';
import type { CritPicker } from '@/lib/utils/battle/crit-choice/types';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleAction, DamageRow } from '@/types/battle-actions';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface ProcessAttackParams {
    attacker: BattleParticipant;
    target: BattleParticipant;
    attack: BattleAttack;
    d20Roll: number;
    advantageRoll?: number;
    disadvantageRoll?: number;
    rollMode?: 'normal' | 'advantage' | 'disadvantage';
    inspiration?: boolean;
    damageRolls: number[];
    allParticipants: BattleParticipant[];
    currentRound: number;
    battleId: string;
    damageMultiplier?: number;
    bonusPercent?: number;
    bonusLabel?: LogLine;
    actionSpent?: boolean;
    offHand?: boolean;
    /** The ability modifier is left out of the damage unless it is negative (Cleave) */
    noAbilityMod?: boolean;
    cunningStrike?: StrikeRiderEffect[];
    system?: SystemSlot;
    obstacle?: boolean;
    rng?: () => number;
    sceneState?: SystemSlot;
    crit?: CritPicker;
    recordDice?: boolean;
    serverRolled?: { d20?: boolean; damageFrom?: number };
    map?: BattleMapConfig | null;
    rules: Ruleset;
    hitSpells?: ReadonlyMap<string, CastableSpell>;
}

export interface ProcessAttackResult {
    success: boolean;
    attackRoll: AttackRollResult;
    damage?: {
        totalDamage: number;
        finalDamage: number;
        breakdown: DamageRow[];
        resistanceBreakdown: LogLine[];
        additionalDamageBreakdown: LogLine[];
    };
    targetUpdated: BattleParticipant;
    attackerUpdated: BattleParticipant;
    allParticipantsUpdated?: BattleParticipant[];
    criticalEffectApplied?: CriticalEffect;
    battleAction: BattleAction;
    summons: SummonRequest[];
    sceneState?: SystemSlot;
}
