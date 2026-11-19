import {
    AttackType,
    type BattleStatus,
    ParticipantSide,
    type ParticipantSourceTypeValue,
} from '@/lib/constants/battle';
import type { SpellFx } from '@/lib/utils/battle/fx';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { ModuleVocabId } from '@/lib/utils/rules/systems/vocab';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface DamageRow {
    label: LogLine;
    source?: LogLine;
    value?: string;
    tone: 'step' | 'total' | 'rule' | 'note';
}

export interface DamageStep {
    label: LogLine;
    side: 'attacker' | 'target';
    kind: 'dice' | 'flat' | 'percent' | 'multiplier' | 'immunity';
    value: number;
    after: number;
    icon?: string | null;
}

export type DieSides = 4 | 6 | 8 | 10 | 12 | 20;

export interface RolledDie {
    sides: DieSides;
    value: number;
    chosen?: boolean;
    server?: boolean;
}

export interface DiceRollGroup {
    kind:
        | 'attack'
        | 'damage'
        | 'heal'
        | 'save'
        | 'initiative'
        | ModuleVocabId<'rollKinds'>;
    rollerId: string;
    targetId?: string;
    dice: RolledDie[];
}

export interface BattleAction {
    id: string;
    battleId: string;
    round: number;
    actionIndex: number;
    timestamp: Date;
    actorId: string;
    actorName: string;
    actorSide: ParticipantSide;
    actionType:
        | 'attack'
        | 'spell'
        | 'bonus_action'
        | 'ability'
        | 'end_turn'
        | 'skip_turn'
        | ModuleVocabId<'actionTypes'>;
    targets: Array<{
        participantId: string;
        participantName: string;
    }>;
    actionDetails: {
        battleResult?: 'victory' | 'defeat';
        mazeEvent?: 'op' | 'reshuffle' | 'spotted';
        weaponName?: string;
        attackKind?: AttackType;
        chainFromId?: string;
        attackRoll?: number;
        attackBonus?: number;
        totalAttackValue?: number;
        targetAC?: number;
        isHit?: boolean;
        isCritical?: boolean;
        isCriticalFail?: boolean;
        secondRoll?: {
            mode: 'advantage' | 'disadvantage';
            value: number;
            serverRolled: boolean;
        };
        chosenD20?: number;
        system?: SystemSlot;
        damageRolls?: Array<{
            dice: string;
            results: number[];
            total: number;
            damageType: string;
        }>;
        totalDamage?: number;
        damageBreakdown?: string;
        damageRows?: DamageRow[];
        damageSteps?: Record<string, DamageStep[]>;
        spellId?: string;
        countered?: true;
        spellName?: string;
        spellFx?: SpellFx;
        spellLevel?: number;
        castLevel?: number;
        spellSlotUsed?: number;
        summonedUnitTemplateId?: string;
        summonedParticipantId?: string;
        savingThrows?: Array<{
            participantId: string;
            ability: string;
            roll: number;
            result: 'success' | 'fail';
            mode?: 'advantage' | 'disadvantage';
            rolls?: number[];
            autoFail?: boolean;
        }>;
        spellAttacks?: Array<{
            participantId: string;
            roll: number;
            total: number;
            ac?: number;
            hit: boolean;
            crit: boolean;
        }>;
        healingRolls?: Array<{
            dice: string;
            results: number[];
            total: number;
        }>;
        totalHealing?: number;
        appliedEffects?: Array<{
            id: string;
            name: LogLine;
            duration: number;
            type?: 'buff' | 'debuff' | 'condition';
            targetId?: string;
        }>;
        spellDamageType?: string;
        spellTargeting?: string;
        aimCell?: GridPoint;
        hazard?: { label: LogLine; damageType: string; damage: number };
        spellEffectKinds?: string[];
        triggeredAbilities?: Array<{
            id: string;
            name: string;
        }>;
        appliedModifiers?: Array<{
            type: string;
            value: number;
            source: string;
        }>;
        d10Roll?: number;
        diceRolls?: DiceRollGroup[];
        skillId?: string;
        skillName?: string;
        criticalEffect?: {
            id: number;
            name?: string;
            description?: string;
            type: 'success' | 'fail';
            flavor?: string;
            source?: 'attack' | 'save';
            flavorIndex?: number;
        };
    } & { [K in ModuleVocabId<'combatStats'>]?: number };
    /** Legacy text log ("a | b"); events written by the structured log have "" and `log` */
    resultText: string;
    log?: LogLine[];
    hpChanges: Array<{
        participantId: string;
        participantName: string;
        oldHp: number;
        newHp: number;
        change: number;
    }>;
    isCancelled: boolean;
    cancelledAt?: Date;
    stateBefore?: {
        initiativeOrder: BattleParticipant[];
        currentTurnIndex: number;
        currentRound: number;
    };
}

export type AddParticipantData = {
    sourceId: string;
    type: ParticipantSourceTypeValue;
    side: ParticipantSide;
    quantity?: number;
    reserved?: boolean;
    position?: GridPoint;
};

export interface BattleBrief {
    id: string;
    name: string;
    status: BattleStatus;
}
