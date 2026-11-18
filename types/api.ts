import type { z } from 'zod';

import type { GroupedSkillPayload } from './hooks';

import { BattleStatus, type CombatStatusType } from '@/lib/constants/battle';
import { type CampaignRoleValue } from '@/lib/constants/campaigns';
import type {
    abilityActionSchema,
    attackBodyInputSchema,
    auraZoneSchema,
    bonusActionSchema,
    castSpellInputSchema,
    critChoiceSchema,
    mapBackgroundBodySchema,
    mapDoorToggleSchema,
    mapEdgeRemoveSchema,
    mapFogSchema,
    mapMotionSchema,
    mapTerrainSchema,
    mapUpdateSchema,
    mapWallsSchema,
    mapWeatherSchema,
    mazeActionSchema,
    mazeMarkSchema,
    moveSchema,
    patchParticipantSchema,
} from '@/lib/schemas/battles';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleAudioState } from '@/types/audio';
import type {
    BattleMapConfig,
    BattleMapRef,
    BattleMapState,
    MapStateDelta,
    MazeConfig,
    TerrainDiff,
} from '@/types/battle-grid';

// Skills API
export type SkillPayload = GroupedSkillPayload;

export interface SkillUpdatePayload {
    basicInfo?: {
        name?: string;
        description?: string;
        icon?: string | null;
        races?: string[];
        isRacial?: boolean;
    };
    spellData?: {
        spellId?: string | null;
        spellGroupId?: string | null;
    };
    mainSkillData?: {
        mainSkillId?: string | null;
    };
}

// Battles API
import type { MapModeKey } from '@/lib/utils/battle/modes';
import type { BattleKnowledge } from '@/lib/utils/battle/view/knowledge';
import type {
    BattleParticipant,
    BattlePreparationParticipant,
} from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';

export interface BattleScene {
    id: string;
    campaignId: string;
    name: string;
    description?: string;
    status: BattleStatus;
    participants: BattlePreparationParticipant[];
    currentRound: number;
    currentTurnIndex: number;
    initiativeOrder: BattleParticipant[];
    /** The server projected enemy stats for this viewer: exact numbers are never in the cache */
    redacted?: true;
    rules: Ruleset;
    pendingSummons?: BattleParticipant[];
    battleLog: BattleAction[];
    createdAt: string;
    startedAt?: string;
    turnTimerSeconds?: number | null;
    turnStartedAt?: string;
    completedAt?: string;
    campaign?: {
        id: string;
        friendlyFire: boolean;
    };
    userRole?: CampaignRoleValue;
    isDM?: boolean;
    version?: number;
    battleLogMode?: 'append';
    battleLogCancelledFrom?: number;
    /** Public part of a pause the system is waiting on; its shape belongs to the system */
    pendingChoice?: unknown;
    system?: SystemSlot;
    map?: BattleMapConfig | null;
    mapRef?: BattleMapRef;
    mapState?: BattleMapState;
    audio?: BattleAudioState | null;
    knowledge?: BattleKnowledge;
}

export type BattleParticipantPatch = { id: string } & {
    [K in keyof BattleParticipant]?: Partial<BattleParticipant[K]>;
};

export interface EdgeDiff {
    add: string[];
    remove: string[];
}

export interface ClientBattleDelta {
    battleId: string;
    version: number;
    scene: {
        status: BattleScene['status'];
        round: number;
        turnIndex: number;
        pendingChoice: unknown;
        system?: SystemSlot | null;
        startedAt?: string | null;
        turnStartedAt?: string | null;
        completedAt?: string | null;
        map?: BattleMapConfig | null;
        terrain?: TerrainDiff;
        walls?: EdgeDiff;
        bars?: EdgeDiff;
        mapState?: MapStateDelta;
        mapRef?: BattleMapRef;
        maze?: Partial<Omit<MazeConfig, 'walls'>>;
    } & Partial<Record<Exclude<MapModeKey, 'maze'>, unknown>>;
    upserted: BattleParticipant[];
    patched?: BattleParticipantPatch[];
    removed: string[];
    order?: string[];
    pending?: BattleParticipant[];
    setup?: BattlePreparationParticipant[];
    log: BattleAction[];
    cancelledFrom?: number;
    knowledge?: BattleKnowledge;
    redacted?: true;
}

export interface BattleEventsPage {
    events: BattleAction[];
    hasMore: boolean;
}

export interface BattleSummaryHero {
    participantId: string;
    name: string;
    avatar?: string;
    damageDealt: number;
    healingDone: number;
    kills: number;
    damageTaken: number;
    status: CombatStatusType;
}

export interface BattleSummary {
    outcome: 'victory' | 'defeat' | null;
    rounds: number;
    heroes: BattleSummaryHero[];
}

export interface BattleVersion {
    version: number;
}

export interface BattleRefetchSignal {
    battleId: string;
    version: number;
    refetch: true;
    redacted?: true;
}

export interface BattleMutationResponse<R = Record<string, unknown>> {
    delta: ClientBattleDelta;
    response?: R;
}

export type AttackData = Omit<
    z.input<typeof attackBodyInputSchema>,
    'damageRolls'
> & { damageRolls: number[] };

export type CritChoiceData = z.infer<typeof critChoiceSchema>;

export type BonusActionData = z.infer<typeof bonusActionSchema>;

export type AuraZoneData = z.infer<typeof auraZoneSchema>;

export type MoveParticipantData = z.infer<typeof moveSchema>;

export type MapTerrainData = z.infer<typeof mapTerrainSchema>;

export interface MapTerrainResponse {
    skipped: string[];
}

export type MazeActionData = z.infer<typeof mazeActionSchema>;

export type MazeMarkData = z.infer<typeof mazeMarkSchema>;

export type MapBackgroundData = z.infer<typeof mapBackgroundBodySchema>;

export type MapWallsData = z.infer<typeof mapWallsSchema>;

export type MapEdgeRemoveData = z.infer<typeof mapEdgeRemoveSchema>;

export type MapFogData = z.infer<typeof mapFogSchema>;

export type MapDoorToggleData = z.infer<typeof mapDoorToggleSchema>;

export type MapUpdateData = z.infer<typeof mapUpdateSchema>;

export type MapWeatherData = z.infer<typeof mapWeatherSchema>;

export type MapMotionData = z.infer<typeof mapMotionSchema>;

export type AbilityActionData = z.infer<typeof abilityActionSchema>;

export type PatchParticipantData = z.infer<typeof patchParticipantSchema>;

export type ChannelData = {
    participantId: string;
    roll?: number;
    serverRoll?: true;
};

export type SpellCastData = Omit<
    z.input<typeof castSpellInputSchema>,
    'targetIds' | 'diceRolls'
> & { targetIds: string[]; diceRolls: number[] };

// Skill Trees API

export type CampaignRouteContext = { params: Promise<{ id: string }> };

export type CharacterRouteContext = {
    params: Promise<{ id: string; characterId: string }>;
};
