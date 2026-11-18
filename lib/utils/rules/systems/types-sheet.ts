import type { Prisma } from '@prisma/client';

import type { AbilityKey } from '@/lib/constants/abilities';
import type { CharacterSystemColumn } from '@/lib/constants/stat-columns';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { CharacterSheet } from '@/types/characters';
import type { ResolvedClassEntry } from '@/types/classes';

export type LevelResetColumns = Prisma.CharacterUncheckedUpdateInput;

export type LevelResetPart = (change: {
    from: number;
    to: number;
}) => LevelResetColumns;

export interface StatColumnsPart {
    /** Columns this layer reads and writes; input for columns no layer owns is dropped */
    owns: readonly CharacterSystemColumn[];
    /** Create-time values for non-null columns the composition does not own */
    fill?(rules: Ruleset): Partial<Record<CharacterSystemColumn, unknown>>;
}

export interface SheetBlockCtx {
    participant: BattleParticipant;
    character: Record<AbilityKey, number> & {
        savingThrows: unknown;
        skills: unknown;
    };
    rules: Ruleset;
    classes?: ResolvedClassEntry[] | null;
    choices?: { skills: ReadonlySet<string>; expertise: ReadonlySet<string> };
}

export type SheetBlockPart = Partial<
    Pick<
        CharacterSheet,
        | 'abilities'
        | 'proficiency'
        | 'armorClass'
        | 'saves'
        | 'skills'
        | 'passives'
        | 'hitDice'
    >
>;

export type SheetBlock = (ctx: SheetBlockCtx) => SheetBlockPart;

export interface ActionDetailsView {
    hideNumbers: boolean;
    hideActor: boolean;
}
