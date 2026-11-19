import type { Segment } from '@/lib/utils/abilities/segments';
import type {
    SkillRadius,
    SpellChain,
} from '@/lib/utils/battle/spell/spell-targeting';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { SpellTargetFilter } from '@/lib/utils/spells/model/schema';
import type { GridPoint, SpellTemplate } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export type SpellTargetMode = 'none' | 'single' | 'multi' | 'all' | 'template';

export interface SpellPick {
    spellId: string;
    level: number;
    targetMode: SpellTargetMode;
    targetSide?: 'ally' | 'enemy' | 'dead';
    maxTargets?: number;
    template?: SpellTemplate;
    range?: number;
    zone?: boolean;
    skillRadius?: SkillRadius;
    chain?: SpellChain;
    filter?: SpellTargetFilter;
    castLevel?: number;
    options?: Segment[][];
    /** the caster also picks a unit form or a spell from the library */
    choice?:
        | { kind: 'unit'; creatureType: string }
        | { kind: 'spell'; maxLevel: number; onOption?: number };
    inputDice?: { label: string; max: number; sides: number };
    inline?: { spellId: string; grantKey: string };
    needsSaves: boolean;
    needsAttackRolls?: boolean;
    /** the system rolls a casting test: the rolls step needs a test roll */
    castTest?: boolean;
    diceSlots: number[];
}

export interface SlotOption {
    key: string;
    label: LogLine;
    castLevel: number;
    left: number;
}

export interface SpellFlowState {
    step:
        | 'closed'
        | 'book'
        | 'spell'
        | 'targets'
        | 'rolls'
        | 'summary'
        | 'submitting'
        | 'result';
    casterId?: string;
    level: number;
    levelPinned?: boolean;
    pick?: SpellPick;
    targetIds: string[];
    aim?: GridPoint;
    saves: Record<string, number>;
    attacks: Record<string, number>;
    slotKey?: string;
    grantKey?: string;
    castLevel?: number;
    optionIndex?: number;
    pickedId?: string;
    inputCount?: number;
    damage: (number | undefined)[];
    /** casting test: manual roll (and the second one some systems ask for) or the server roll */
    castRoll?: number;
    castSecond?: number;
    castServer?: boolean;
    castSystem?: SystemSlot;
    /** optional-ingredient systems: spend an ingredient to cancel a miscast */
    useIngredient?: boolean;
    error?: LogLine;
    waitingCrit?: boolean;
}

export type SpellFlowAction =
    | { type: 'OPEN'; casterId: string; level: number; levels?: number[] }
    | { type: 'SPELLS_LOADED'; levels: number[] }
    | { type: 'SET_LEVEL'; level: number }
    | {
          type: 'PICK';
          pick: SpellPick;
          slotKey?: string;
          grantKey?: string;
          castLevel?: number;
      }
    | { type: 'SET_SLOT'; slotKey: string; pick: SpellPick }
    | {
          type: 'SET_GRANT';
          grantKey: string;
          pick: SpellPick;
          castLevel?: number;
      }
    | { type: 'SET_CAST_LEVEL'; castLevel: number; pick: SpellPick }
    | { type: 'SET_OPTION'; index: number }
    | { type: 'SET_PICKED'; id: string | undefined }
    | { type: 'SET_INPUT'; count: number }
    | { type: 'SET_ATTACK'; id: string; value: number | undefined }
    | { type: 'TO_TARGETS' }
    | { type: 'TOGGLE_TARGET'; id: string }
    | { type: 'PICK_TARGET'; id: string }
    | { type: 'SET_AIM'; aim: GridPoint; targetIds: string[] }
    | { type: 'CONFIRM_TARGETS' }
    | { type: 'SET_SAVE'; id: string; value: number | undefined }
    | { type: 'SET_DAMAGE'; index: number; value: number | undefined }
    | { type: 'SET_CAST_ROLL'; roll?: number; second?: number }
    | { type: 'SET_CAST_INGREDIENT'; value: boolean }
    | { type: 'SET_CAST_SYSTEM'; value: SystemSlot | null }
    | { type: 'TO_SUMMARY' }
    | { type: 'BACK' }
    | { type: 'SUBMIT' }
    | { type: 'WAIT_CRIT' }
    | { type: 'SUCCESS' }
    | { type: 'FAIL'; error: LogLine }
    | { type: 'CLOSE' };

export interface SpellWidening {
    badge: LogLine;
    note: LogLine;
}
