import type { UnitFromPrisma } from '@/lib/utils/battle/types/participant';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';
import type {
    CharacterResources,
    StoredCharacterState,
} from '@/types/characters';

export interface ParticipantRefs {
    [key: string]: unknown;
}

export interface CharacterPartRow {
    level: number;
    archetype?: string | null;
}

export type UnitPartRow = UnitFromPrisma;

export interface ParticipantPartCtx<R> {
    row: R;
    rules: Ruleset;
    refs: ParticipantRefs;
}

/** A builder step: base first, then modules; runs before passives are baked */
export type ParticipantPart<R> = (
    p: BattleParticipant,
    ctx: ParticipantPartCtx<R>
) => BattleParticipant;

export interface StoredPartCtx {
    stored: StoredCharacterState;
    rules: Ruleset;
}

/** What the saved sheet puts into a participant at battle start */
export type StoredPart = (
    p: BattleParticipant,
    ctx: StoredPartCtx
) => BattleParticipant;

export interface PersistOutcome {
    resources: CharacterResources;
    /** The sheet's inspiration was spent in this battle */
    clearInspiration?: true;
}

/** What a participant writes back to the sheet when the battle ends */
export type PersistPart = (
    ctx: { participant: BattleParticipant; rules: Ruleset },
    acc: PersistOutcome
) => PersistOutcome;

/** Upgrade-on-read/backfill: rewrites a stored `battleData` from an older state shape to the current one */
export type StateUpgrade = (
    battleData: BattleParticipant['battleData']
) => BattleParticipant['battleData'];

export type SlotScope = 'abilities' | 'battle';

/** What a viewer without exact stats may see of a participant's own slot; `slot.ext` is already gone and slots of other keys pass through */
export type SlotRedactor = (slot: SystemSlot, scope: SlotScope) => SystemSlot;

export interface RuleSystemParticipant {
    redactSlot?: readonly SlotRedactor[];
    upgradeState?: readonly StateUpgrade[];
    fromCharacter?: readonly ParticipantPart<CharacterPartRow>[];
    fromUnit?: readonly ParticipantPart<UnitPartRow>[];
    fromStored?: readonly StoredPart[];
    persist?: readonly PersistPart[];
}
