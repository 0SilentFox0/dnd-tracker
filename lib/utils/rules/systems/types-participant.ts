import type { UnitFromPrisma } from '@/lib/utils/battle/types/participant';
import type { Ruleset } from '@/lib/utils/rules/schema';
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

export interface RuleSystemParticipant {
    fromCharacter?: readonly ParticipantPart<CharacterPartRow>[];
    fromUnit?: readonly ParticipantPart<UnitPartRow>[];
    fromStored?: readonly StoredPart[];
    persist?: readonly PersistPart[];
}
