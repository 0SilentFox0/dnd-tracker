import type { SystemSlot } from './slot';
import type { ApplyDamageConsequences } from './types';
import type { SystemConditionResult } from './types-conditions';

import type { AbilityKey } from '@/lib/constants/abilities';
import type { D20Mode } from '@/lib/utils/battle/saves/types';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    SpellMagic,
    SpellMagicKind,
} from '@/lib/utils/spells/model/schema';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface CastTestCtx {
    caster: BattleParticipant;
    spell: CastableSpell;
    magic: SpellMagic;
    rules: Ruleset;
    rng: Rng;
    presetRoll?: number;
    /** The system's own input of the request, parsed by `SystemServer.schemas.castInput` */
    system?: SystemSlot;
}

export interface CastTestResult {
    success: boolean;
    margin: number;
    overcastSteps: number;
    miscast: string | null;
    details: SystemSlot;
    lines: LogLine[];
    /** Applied by the pipeline to the up-to-date caster (spent resources, banked state) */
    casterUpdate?: (p: BattleParticipant) => BattleParticipant;
}

export type CastResourceGate =
    | { ok: true; castLevel?: number }
    | { ok: false; error: string };

export interface CastResourceChoice {
    level: number;
    /** The caster's explicit choice of the resource; absent: the default one */
    slotKey?: string;
}

/** What a cast spends (spell slots); a system without one lets every cast through */
export interface RuleSystemMagicResource {
    /** The caster chooses which slot to cast from (a request's `slotKey` is validated only for these); others spend the default one */
    picksSlot(caster: BattleParticipant): boolean;
    /** `castLevel` is set when the choice raises the cast above the spell's level */
    canCast(
        caster: BattleParticipant,
        choice: CastResourceChoice
    ): CastResourceGate;
    spend(
        caster: BattleParticipant,
        choice: CastResourceChoice
    ): BattleParticipant;
}

/** Casting-test magic: the cast is a roll with a miscast, not a spent resource */
export interface RuleSystemTestedMagic {
    /** Ingredients are optional: spending one cancels the miscast instead of gating the cast */
    ingredients?: 'avertMiscast';
    /** Drops the miscast of a cast that used an ingredient */
    avertMiscast(
        cast: CastTestResult,
        who: { name: string; spell: string }
    ): CastTestResult;
    castTest(ctx: CastTestCtx): CastTestResult;
    /** Numbers a caster sees before rolling: casting and channelling targets, banked SL and armour penalty */
    castPreview(
        caster: BattleParticipant,
        kind?: SpellMagicKind,
        rules?: Ruleset
    ): {
        target: number;
        channelTarget: number;
        channelled: number;
        armourSl: number;
    };
    channel(
        p: BattleParticipant,
        ctx: { rules: Ruleset; rng: Rng; presetRoll?: number }
    ): {
        participant: BattleParticipant;
        lines: LogLine[];
        miscast: 'minor' | 'major' | null;
    };
    miscast(
        ps: BattleParticipant[],
        casterId: string,
        kind: string,
        ctx: {
            round: number;
            rng: Rng;
            rules: Ruleset;
            applyDamage: ApplyDamageConsequences;
            presetRoll?: number;
        }
    ): SystemConditionResult;
    attribute(
        ps: BattleParticipant[],
        targetIds: string[],
        magic: SpellMagic,
        round: number,
        rules?: Ruleset
    ): SystemConditionResult;
    /** Token badge for banked channelling */
    badge(p: BattleParticipant): ActiveEffect | null;
}

export interface SustainResult {
    participants: BattleParticipant[];
    messages: LogLine[];
}

/** Binds the duration of a spell's effects, objects, zones and grants to its caster (5e concentration) */
export interface RuleSystemSustain {
    /** The cast has to be held: the rule is on and the spell asks for it */
    holds(rules: Ruleset, spell: { concentration?: boolean }): boolean;
    holding(p: BattleParticipant): boolean;
    /** Replaces what the caster held before */
    begin(
        ps: BattleParticipant[],
        hold: {
            casterId: string;
            castId: string;
            spellName: string;
            rounds: number;
            round?: number;
        }
    ): SustainResult;
    /** Ends the held cast with everything bound to it */
    drop(
        ps: BattleParticipant[],
        casterId: string,
        reason: LogLine
    ): SustainResult;
    /** Binds the effects the cast just added to the caster's hold */
    tag(
        before: BattleParticipant[],
        after: BattleParticipant[],
        tag: NonNullable<ActiveEffect['concentrationOf']>,
        abilityKey: string
    ): BattleParticipant[];
    /** A zone, object, form or grant bound to a hold is alive while the hold is; an untagged one always is */
    anchorLive(
        ps: BattleParticipant[],
        tag: NonNullable<ActiveEffect['concentrationOf']> | undefined
    ): boolean;
    /** Ends a hold the caster can no longer keep because an effect bars spellcasting */
    dropBarred?(ps: BattleParticipant[], rules: Ruleset): SustainResult;
    /** Ends a hold whose effects, zones, objects and grants are all gone */
    dropOrphaned(
        ps: BattleParticipant[],
        map?: BattleMapConfig | null,
        round?: number
    ): SustainResult;
}

export interface SpellAttackRollCtx {
    mode: D20Mode;
    rng: () => number;
    /** A roll the player already made */
    presetRoll?: number;
    /** Roll bonus and target armor class */
    bonus: number;
    ac: number;
    /** Roll at or above which the hit is critical, and at or below which it always misses */
    critOn: number;
    fumbleOn: number;
}

export interface SpellAttackRoll {
    roll: number;
    rolls: number[];
    crit: boolean;
    fumble: boolean;
    hit: boolean;
}

export interface RuleSystemMagic {
    resource?: RuleSystemMagicResource;
    /** Attack roll of a spell against a target; absent means the base has none and a spell with an attack hits without a roll */
    attackRoll?(ctx: SpellAttackRollCtx): SpellAttackRoll;
    /** Natural result of a save roll that decides it outright; null for any other roll */
    saveCrit?(roll: number): 'success' | 'fail' | null;
    /** Die size the client rolls for a spell attack; absent means the client rolls none */
    attackDice?: number;
    sustain: RuleSystemSustain;
    /** Base of a spell save DC from the campaign rules; absent means the section default */
    saveDcBase?(rules: Ruleset): number;
    /** Save DC of a spell; `ability` overrides the caster's spellcasting ability; undefined = no save exists */
    saveDc(
        caster: BattleParticipant,
        ability: AbilityKey | undefined,
        base: number
    ): number | undefined;
    upcast: { steps(spellLevel: number, castLevel: number): number };
    /** Ability modifier added to a spell's damage when the spell asks for it; none means no modifier */
    spellAbilityMod?(
        caster: BattleParticipant
    ): { mod: number; label: string } | null;
    /** Attack roll bonus of a spell (`weapon`: the spell makes a weapon attack); absent means the caster's own stored bonus or 0 */
    spellAttackBonus?(caster: BattleParticipant, weapon: boolean): number;
    /** Dice of a spell for this caster; null means the caster is not covered and the default dice apply */
    casterDice?(
        caster: BattleParticipant,
        spell: {
            dice: number;
            level?: number;
            dieSides?: number | null;
            upcastDice?: number | null;
            fixedDice?: boolean;
        },
        castLevel?: number
    ): { count: number; sides: number } | null;
    tested?: RuleSystemTestedMagic;
    /** Derived save DC and attack bonus of a caster; none means the system has no such derivation */
    spellcasting?(
        input: SpellcastingInput
    ): { saveDC: number; attackBonus: number } | null;
}

export interface SpellcastingInput {
    level: number;
    ability: string | null | undefined;
    scores: Record<AbilityKey, number>;
    rules: Ruleset;
}
