import {
    AttackType,
    type BattleStatus,
    ParticipantSide,
    type ParticipantSourceTypeValue,
} from '@/lib/constants/battle';
import type { SpellFx } from '@/lib/utils/battle/fx';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
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
    kind: 'attack' | 'damage' | 'heal' | 'save' | 'morale' | 'initiative';
    rollerId: string;
    targetId?: string;
    dice: RolledDie[];
}

/**
 * Детальна дія в бою (BattleAction)
 * Кожна дія записується для історії та можливості відміни
 */
export interface BattleAction {
    id: string; // унікальний ідентифікатор
    battleId: string; // ID битви
    round: number; // в якому раунді
    actionIndex: number; // порядковий номер дії (для відміни)
    timestamp: Date; // час виконання
    actorId: string; // ID учасника що виконав дію
    actorName: string; // ім'я актора
    actorSide: ParticipantSide;
    actionType:
        | 'attack'
        | 'spell'
        | 'bonus_action'
        | 'ability'
        | 'end_turn'
        | 'skip_turn'
        | 'morale_skip'
        | 'retaliation';
    targets: Array<{
        participantId: string;
        participantName: string;
    }>;
    actionDetails: {
        /** Лише в записі про завершення бою: бік союзників виграв чи програв */
        battleResult?: 'victory' | 'defeat';
        /** Службові записи лабіринту: «op» — зміна лабіринту ДМом, «reshuffle» — перетасовка (у журналі не показується нікому), «spotted» — герой помітив ворога */
        mazeEvent?: 'op' | 'reshuffle' | 'spotted';
        // Для атак:
        weaponName?: string;
        /** Тип атаки: melee / ranged */
        attackKind?: AttackType;
        /** Стрибок ланцюгового пострілу: від кого летить снаряд */
        chainFromId?: string;
        attackRoll?: number;
        attackBonus?: number;
        totalAttackValue?: number;
        targetAC?: number;
        isHit?: boolean;
        isCritical?: boolean;
        isCriticalFail?: boolean;
        /** Другий d20 (перевага/недолік) і кубик, що пішов у розрахунок */
        secondRoll?: {
            mode: 'advantage' | 'disadvantage';
            value: number;
            serverRolled: boolean;
        };
        chosenD20?: number;
        system?: SystemSlot;
        // Для урону:
        damageRolls?: Array<{
            dice: string;
            results: number[];
            total: number;
            damageType: string;
        }>;
        totalDamage?: number;
        damageBreakdown?: string; // детальний опис урону (legacy: розбирається регексами)
        damageRows?: DamageRow[];
        damageSteps?: Record<string, DamageStep[]>;
        // Для заклинань:
        spellId?: string;
        spellName?: string;
        spellFx?: SpellFx;
        spellLevel?: number;
        castLevel?: number;
        spellSlotUsed?: number;
        /** Приклик юніта після касту */
        summonedUnitTemplateId?: string;
        summonedParticipantId?: string;
        // Для saving throws:
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
            ac: number;
            hit: boolean;
            crit: boolean;
        }>;
        // Для лікування:
        healingRolls?: Array<{
            dice: string;
            results: number[];
            total: number;
        }>;
        totalHealing?: number;
        // Для ефектів:
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
        // Для пасивок:
        triggeredAbilities?: Array<{
            id: string;
            name: string;
        }>;
        // Для модифікаторів:
        appliedModifiers?: Array<{
            type: string;
            value: number;
            source: string;
        }>;
        // Для перевірки моралі:
        d10Roll?: number;
        morale?: number;
        /** Кожен кубик дії гравця/ДМа (розмір і грань) — для 3D-анімації кидка в усіх клієнтів */
        diceRolls?: DiceRollGroup[];
        // Для бонусної дії (скіл):
        skillId?: string;
        skillName?: string;
        // Критичний ефект (Natural 20/1):
        criticalEffect?: {
            id: number;
            /** Legacy events carry the text; new ones only `source`/`flavorIndex` (text from battleTerms.crits) */
            name?: string;
            description?: string;
            type: 'success' | 'fail';
            flavor?: string;
            source?: 'attack' | 'save';
            flavorIndex?: number;
        };
    };
    /** Legacy text log ("a | b"); events written by the structured log have "" and `log` */
    resultText: string;
    log?: LogLine[];
    hpChanges: Array<{
        participantId: string;
        participantName: string;
        oldHp: number;
        newHp: number;
        change: number; // позитивне = урон, негативне = лікування
    }>;
    isCancelled: boolean; // чи була відмінена дія
    cancelledAt?: Date; // коли відмінена
    /** Стан бою перед цією дією (для rollback) */
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
