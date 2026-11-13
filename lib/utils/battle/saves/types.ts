import type { AbilityKey } from '@/lib/constants/abilities';
import type { DndSkill } from '@/lib/constants/skills';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { GameClassData } from '@/types/classes';
import type { LogLine } from '@/types/text';

export type D20Mode = 'advantage' | 'disadvantage' | 'normal';

export type SaveRollMode = D20Mode;

export interface SaveRollInput {
    target: BattleParticipant;
    ability: AbilityKey;
    dc?: number;
    participants: BattleParticipant[];
    rules: Ruleset;
    rng: () => number;
    presetRoll?: number;
    vsSpell?: boolean;
    advantage?: boolean;
}

export interface SaveRollResult {
    roll: number;
    rolls: number[];
    mod: number;
    bonus: number;
    total: number;
    success: boolean;
    mode: SaveRollMode;
    autoFail: boolean;
}

export interface SaveResolution<T> {
    result: T;
    participant: BattleParticipant;
    message: LogLine | null;
}

export type CheckSubject = { skill: DndSkill } | { ability: AbilityKey };

export interface CheckRollInput {
    actor: BattleParticipant;
    subject: CheckSubject;
    participants: BattleParticipant[];
    rules: Ruleset;
    rng: () => number;
    presetRoll?: number;
    advantage?: boolean;
}

export interface CheckRollResult {
    roll: number;
    rolls: number[];
    mod: number;
    bonus: number;
    total: number;
    mode: D20Mode;
}

/** Saving throws the engine asks of a system: zones, effects, spells, maneuvers */
export interface RuleSystemSaves {
    roll(input: SaveRollInput): SaveRollResult;
    /** A failed save the target may still turn into a success (legendary resistance) */
    resolve<T extends { success: boolean }>(
        participant: BattleParticipant,
        result: T
    ): SaveResolution<T>;
    bestAbility(
        target: BattleParticipant,
        pair: [AbilityKey, AbilityKey],
        participants: BattleParticipant[],
        rules: Ruleset
    ): AbilityKey;
    evasion: {
        has(
            participants: BattleParticipant[],
            target: BattleParticipant
        ): boolean;
        factor(success: boolean, evasive: boolean): number;
    };
    /** End-of-turn saves of effects that end on a success */
    rollEnds(
        p: BattleParticipant,
        participants: BattleParticipant[],
        rules: Ruleset,
        rng: () => number
    ): { participant: BattleParticipant; messages: LogLine[] };
}

/** Armour/weapon lists a participant is trained in, built from classes and granted flags */
export interface RuleSystemProficiency {
    fromClasses(
        classes: readonly (
            | Pick<GameClassData, 'proficiencies' | 'multiclassProficiencies'>
            | null
            | undefined
        )[]
    ): { armor: string[]; weapons: string[] } | undefined;
    withGranted(p: BattleParticipant): BattleParticipant;
}
