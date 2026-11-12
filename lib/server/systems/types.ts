import type { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

import type { SpellRequestData } from '@/lib/schemas/battles';
import type { AttackBody } from '@/lib/server/battles/mutations/attack/attack-mutation';
import type { CharacterOperation } from '@/lib/server/characters/operation-runner';
import type { ArtifactSetRowLike } from '@/lib/utils/abilities/build/collect';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import type { LegendaryActionBody } from '@/lib/utils/battle/actions/schema';
import type { getCharacterStats, UnitStats } from '@/lib/utils/battle/balance';
import type { CritResume } from '@/lib/utils/battle/crit-choice/types';
import type {
    BattleMutationContext,
    MutationResult,
    RunBattleMutationOptions,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import type {
    CampaignSpellContext,
    CharacterFromPrisma,
} from '@/lib/utils/battle/types/participant';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BranchLevel, branchLevels } from '@/lib/utils/skills/progression';
import type { BattleParticipant, EquippedArtifact } from '@/types/battle';
import type { SetProgress } from '@/types/characters';

export interface SystemSchemas {
    characteristics?: ZodType;
    unitCharacteristics?: ZodType;
    systemStats?: ZodType;
    /** Whole attack body in, the system's own slot out (or undefined); the legacy request shape is mapped here */
    attackInput?: ZodType<SystemSlot | undefined>;
    castInput?: ZodType<SystemSlot | undefined>;
}

export interface SystemOperation {
    operation: CharacterOperation;
    input: ZodType;
    /** Assistant: a read action (scope `characters:read`) that needs no confirmation */
    read?: true;
    /** Assistant: a write that is never auto-applied */
    confirm?: 'always';
}

export type SystemHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SystemHandlerCtx {
    campaignId: string;
    access: CampaignAccessResult;
    input: unknown;
    searchParams: URLSearchParams;
}

export interface SystemHandler {
    access: 'member' | 'dm';
    schema?: ZodType;
    /** `input` is the parsed body, the query result, or `{ query, body }` when both are set */
    query?: (searchParams: URLSearchParams) => unknown;
    handle(ctx: SystemHandlerCtx): Promise<Response>;
}

/** `{ operation }` is a key of the same module's `operations`; the character operation gates its own access */
export type SystemRouteTarget = { operation: string } | SystemHandler;

export type SystemRoute = Partial<Record<SystemHttpMethod, SystemRouteTarget>>;

export type SystemToolNote =
    | 'get_party'
    | 'read_character'
    | 'get_battle_state';

export interface SystemAi {
    promptLine?: string;
    toolNotes?: Partial<Record<SystemToolNote, string>>;
    heroSelect?: Record<string, true>;
    party?(
        campaignId: string,
        query: Record<string, unknown>
    ): Promise<Record<string, unknown>[]>;
    hero?(
        campaignId: string,
        row: Record<string, unknown>
    ): Promise<Record<string, unknown>>;
    participantView?(p: BattleParticipant): Record<string, unknown>;
    unitView?(row: { characteristics?: unknown }): Record<string, unknown>;
}

export interface SystemBalance {
    /** Hero numbers for the setup UI and the fair-scaling pass, from the participant built out of the character */
    heroPower(input: {
        built: BattleParticipant;
        character: { race: string; skillTreeProgress?: unknown };
        campaignContext: CampaignSpellContext | undefined;
    }): {
        levels: ReturnType<typeof branchLevels>;
        stats: ReturnType<typeof getCharacterStats>;
    };
    /** Library unit numbers; `base` is the d20 reading of the row, `built` the participant the unit would become */
    unitStats(base: UnitStats, built: BattleParticipant): UnitStats;
    /** Library units are built with the campaign rules before they are read */
    readsBuiltRules: boolean;
}

type Resumable<T> = (
    ctx: BattleMutationContext,
    request: T,
    resume: CritResume,
    replay?: { serverRolls?: boolean }
) => Promise<MutationResult>;

/** Core mutations a system operation replays; injected by the route layer so system code never imports the mutations back */
export interface BattleOperationDeps {
    attack: Resumable<AttackBody>;
    spell: Resumable<SpellRequestData>;
    /** Legendary and lair actions: they run the core summon and spell pipelines, which reach the registry */
    legendary(
        ctx: BattleMutationContext,
        request: LegendaryActionBody
    ): Promise<MutationResult>;
}

/** Route settings of a battle operation; `missing` is the API_ERRORS key answered when the battle's composition lacks it */
export type SystemBattleSettings = Omit<
    RunBattleMutationOptions<unknown>,
    'params' | 'schema' | 'mutate' | 'operation'
> & { missing: string };

export interface SystemBattleOperation {
    settings: SystemBattleSettings;
    load(deps: BattleOperationDeps): Promise<{
        schema: ZodType;
        mutate(
            ctx: BattleMutationContext,
            body: never
        ): MutationResult | Promise<MutationResult>;
    }>;
}

export type CharacterRefLoader = (input: {
    equipped: EquippedArtifact[];
    campaignId: string;
    context?: CampaignSpellContext;
}) => Promise<
    Partial<{
        completed: { sets: ArtifactSetRowLike[]; progress: SetProgress[] };
    }>
>;

export type ContextPreparer = (
    campaignId: string,
    context: CampaignSpellContext
) => Promise<void>;

export type LearnedSpellsLoader = (input: {
    character: CharacterFromPrisma;
    knownSpells: string[];
    context?: CampaignSpellContext;
}) => Promise<{
    knownSpells: string[];
    schoolMastery: Record<string, BranchLevel>;
}>;

export interface SystemParticipantServer {
    learnedSpells?: readonly LearnedSpellsLoader[];
    characterRefs?: readonly CharacterRefLoader[];
    prepareContext?: readonly ContextPreparer[];
}

/** Player-draft creation of a base whose characters are built by a creation flow instead of the d20 draft */
export interface SystemDrafts {
    create(
        request: Request,
        campaign: CampaignAccessResult['campaign'],
        access: CampaignAccessResult
    ): Promise<NextResponse>;
    update(
        request: Request,
        campaignId: string,
        characterId: string,
        access: CampaignAccessResult
    ): Promise<NextResponse>;
}

export interface SystemServer {
    schemas: SystemSchemas;
    /** Exclusive slot of a base; an addon never sets it */
    drafts?: SystemDrafts;
    participant?: SystemParticipantServer;
    balance: SystemBalance;
    operations?: Record<string, SystemOperation>;
    /** Battle operations the route layer resolves by name; the core settings (access, gates) stay with the route */
    battle?: Record<string, SystemBattleOperation>;
    /** Keys are old paths with `/` as `.`; the method picks the target */
    routes?: {
        campaign?: Record<string, SystemRoute>;
        character?: Record<string, SystemRoute>;
    };
    ai?: SystemAi;
}
