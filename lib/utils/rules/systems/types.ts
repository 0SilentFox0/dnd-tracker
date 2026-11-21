import type { SystemData, SystemSlot } from './slot';
import type { RuleSystemCombat } from './types-combat';
import type {
    RuleSystemConditions,
    RuleSystemConditionSet,
} from './types-conditions';
import type { RuleSystemMagic } from './types-magic';
import type { RuleSystemParticipant } from './types-participant';
import type {
    LevelResetPart,
    SheetBlock,
    StatColumnsPart,
} from './types-sheet';

import type { Coin } from '@/lib/constants/inventory';
import type { Translator } from '@/lib/i18n/translator';
import type { Recipe } from '@/lib/utils/abilities/templates/types';
import type { ExtractedAttack } from '@/lib/utils/battle/types/participant';
import type { ChoiceGroup } from '@/lib/utils/characters/choices/selections';
import type { HpBreakdownLine } from '@/lib/utils/characters/hero-hp';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';
import type {
    CharacterResources,
    SheetRollBody,
    SheetRollResult,
} from '@/types/characters';
import type { FeatData } from '@/types/choices';
import type { ResolvedClassEntry } from '@/types/classes';

export interface CharacterHpInput {
    level: number;
    constitution: number;
    archetype?: string | null;
}

export interface SheetBlockInput {
    characteristics: unknown;
    resources: CharacterResources;
    participant?: BattleParticipant;
}

export interface SheetTestInput {
    participant: BattleParticipant;
    character: { characteristics?: unknown };
    body: SheetRollBody;
    rules: Ruleset;
    rng: Rng;
    inspiration: boolean;
    t: Translator;
    presetRoll?: number;
}

/** `resourcesAfter` holds the absolute resource values the roll leaves (Fortune/Fate spend); the handler writes them under lock */
export type SheetTestResult = SheetRollResult & {
    resourcesAfter?: Pick<CharacterResources, 'fortune' | 'fate'>;
};

export type SystemInputCtx =
    | { kind: 'attack'; actor: BattleParticipant; targetCount: number }
    | {
          kind: 'cast';
          actor: BattleParticipant;
          /** A cast outside the cost rules (DM-granted) */
          free: boolean;
          tested: boolean;
      };

export interface RuleSystemDefinition {
    key: string;
    participant?: RuleSystemParticipant;
    progression: {
        levels: boolean;
        maxHp(input: {
            character: CharacterHpInput;
            entries?: readonly ResolvedClassEntry[] | null;
            characteristics: unknown;
            rules: Ruleset;
        }): { total: number; breakdown: HpBreakdownLine[] };
        hpTerm: 'hp' | 'wounds';
        /** Proficiency bonus of a level; none means the system has no such bonus */
        proficiency?(level: number, rules: Ruleset): number;
        /** Columns a level change resets; parts of the composition are merged */
        levelResets?: readonly LevelResetPart[];
        /** Whether the rules switch classes on; absent means the system has none */
        classes?(rules: Ruleset): boolean;
        /** Hero initiative range of the sheet; absent means no sheet field */
        initiativeRange?(rules: Ruleset): { min: number; max: number };
    };
    stats?: { columns: readonly StatColumnsPart[] };
    sheet?: { blocks: readonly SheetBlock[] };
    characteristics: {
        /** The `characteristics` column carries system data (otherwise it is dropped on write) */
        persisted: boolean;
        /** Statblock columns that move into `characteristics`; reads come only from `characteristics` (a missing key takes the column default), writes leave the columns to DB defaults */
        columnView?: {
            columns: readonly string[];
            read(row: { characteristics?: unknown }): Record<string, number>;
            write(
                cols: Partial<Record<string, number>>,
                prev: unknown
            ): SystemData;
        };
        defaults(): SystemData | undefined;
        isEmpty(value: unknown): boolean;
        sheetBlock(input: SheetBlockInput): SystemSlot | undefined;
        /** Merges an incoming edit into the stored value; throws ContentError on a conflict */
        reconcile?(
            stored: unknown,
            incoming: unknown,
            ctx: { isDM: boolean; baseline?: unknown }
        ): unknown;
        /** Drops server-owned fields from the blob of a newly created character */
        initial?(value: SystemData): SystemData;
        redact?(
            value: unknown,
            viewer: { isDM: boolean; isOwner: boolean }
        ): unknown;
    };
    resources?: {
        limits?(row: { characteristics?: unknown }): {
            fateMax?: number;
            fateLimit?: number;
        };
        seed?(characteristics: unknown): Partial<CharacterResources>;
    };
    sheetTest: {
        accepts(body: { kind: string }): boolean;
        roll(input: SheetTestInput): SheetTestResult;
    };
    rest: {
        kinds: boolean;
        onSession?(
            resources: CharacterResources,
            characteristics: unknown
        ): CharacterResources;
    };
    combat: RuleSystemCombat;
    conditionSet: RuleSystemConditionSet;
    conditions?: RuleSystemConditions;
    magic: RuleSystemMagic;
    advancement?: RuleSystemAdvancement;
    equipment?: RuleSystemEquipment;
    traits?: RuleSystemTraits;
    currency?: RuleSystemCurrency;
    /** Presence flags: the UI shows the tab; the handlers live in the system */
    downtime?: true;
    corruption?: true;
    identity: { alignments: boolean };
    creation?: true;
    lineage: boolean;
    attacks: boolean;
    spells: boolean;
    items: boolean;
    inventory: boolean;
}

export interface ArmourGear {
    ap: Record<string, number>;
    armourOnly?: Record<string, number>;
    /** AP of metal armour per location */
    metalAp?: Record<string, number>;
    flexible?: boolean;
    /** AP of the worn pieces that carry a system-defined mark, per mark and location */
    marks?: Record<string, Record<string, number>>;
    /** Overburden tier of the carried load, 0 = none */
    burden?: number;
    /** Shield rating carried, 0 = none */
    shield?: number;
    /** SL lost per skill key from worn armour, negative values */
    testPenalty?: Record<string, number>;
}

export interface UnitBuild {
    fields: SystemSlot;
    attacks: ExtractedAttack[];
}

export interface RuleSystemTraits {
    recipes: readonly Recipe[];
    unitBuild(
        row: { id: string; characteristics?: unknown },
        abilities: readonly ResolvedAbility[],
        rules?: Ruleset
    ): UnitBuild;
}

export interface RuleSystemAdvancement {
    talentsOf(row: { characteristics?: unknown }): Record<string, number>;
    talentGroups(
        talents: Record<string, number>,
        featsById: Record<string, FeatData>
    ): ChoiceGroup[];
}

export type ApplyDamageConsequences =
    typeof import('@/lib/utils/battle/damage/consequences').applyDamageConsequences;

export interface RuleSystemCurrency {
    coins: readonly Coin[];
    value: Record<Coin, number>;
    labelKeys: Record<Coin, string>;
}

export interface RuleSystemEquipment {
    /** `rules` lets a system drop gear data the edition does not use */
    armourAp(
        equipped: { slot: string; systemStats: unknown }[],
        rules?: Ruleset
    ): ArmourGear;
    /** Overburden tier from everything the character carries, 0 = none */
    burden?(input: {
        rows: {
            id?: string;
            slot: string;
            systemStats: unknown;
            carried?: true;
        }[];
        specials: {
            artifactId?: string;
            systemStats: unknown;
            quantity: number;
        }[];
        coins: number;
        characteristics: unknown;
        rules: Ruleset;
    }): number;
}

export type * from './types-actions';
export type * from './types-combat';
export type * from './types-conditions';
export type * from './types-magic';
export type * from './types-participant';
export type * from './types-sheet';
export type * from './types-turn';
