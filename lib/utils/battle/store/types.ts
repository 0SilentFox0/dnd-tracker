import type { PrismaClient } from '@prisma/client';

import type { BattleStatus } from '@/lib/constants/battle';
import type { Locale } from '@/lib/i18n/config';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { AbilityUsageCounter } from '@/types/abilities';
import type { BattleAudioState } from '@/types/audio';
import type {
    AirborneState,
    BattleParticipant,
    BattlePreparationParticipant,
    IngredientStock,
} from '@/types/battle';
import type {
    BattleMapConfig,
    BattleMapRef,
    BattleMapState,
    Direction8,
    GridPoint,
    MapBase,
    PendingHit,
} from '@/types/battle-grid';

/** A pause the system raised for a decision: `shown` goes to clients, `hidden` stays on the server */
export interface PendingChoice {
    shown: unknown;
    hidden: unknown;
}

export interface BattleSceneState {
    id: string;
    campaignId: string;
    status: BattleStatus;
    round: number;
    turnIndex: number;
    version: number;
    eventSeq: number;
    pendingMoraleCheck: unknown | null;
    pendingChoice: PendingChoice | null;
    sceneState?: SystemSlot;
    startedAt: Date | null;
    turnStartedAt?: Date | null;
    completedAt: Date | null;
}

export interface ParticipantColumns {
    id: string;
    sourceType: string;
    sourceId: string;
    side: string;
    controlledBy: string;
    orderIndex: number;
    isPending: boolean;
    extraTurnOf: string | null;
    currentHp: number;
    tempHp: number;
    maxHp: number;
    morale: number;
    status: string;
    initiative: number;
    hasUsedAction: boolean;
    hasUsedBonusAction: boolean;
    hasUsedReaction: boolean;
    hasExtraTurn: boolean;
}

export type ParticipantSnapshot = Record<string, unknown>;

export interface ParticipantState {
    activeEffects: unknown[];
    abilityUsage?: Record<string, AbilityUsageCounter>;
    pendingExtraActions?: number;
    position?: GridPoint;
    movementUsed?: number;
    turnStartPosition?: GridPoint;
    returnedThisTurn?: boolean;
    airborne?: AirborneState;
    hazardHitRound?: number;
    zoneHits?: Record<string, number>;
    pendingHits?: PendingHit[];
    dying?: true;
    dormant?: boolean;
    facing?: Direction8;
    escaped?: boolean;
    mazeWakeRound?: number;
    ingredientStock?: IngredientStock;
    ammo?: Record<string, number>;
    reload?: Record<string, number>;
    system?: SystemSlot;
    spellSlotsCurrent: Record<string, number>;
}

export interface StoredParticipant {
    columns: ParticipantColumns;
    snapshot: ParticipantSnapshot;
    state: ParticipantState;
    snapshotHash: string;
}

export interface NewBattleEvent {
    type: string;
    round: number;
    actorId?: string | null;
    targets?: unknown[];
    details?: Record<string, unknown>;
    hpChanges?: unknown[];
    resultText: string;
}

export interface StoredBattleEvent
    extends Required<Omit<NewBattleEvent, 'actorId'>> {
    seq: number;
    actorId: string | null;
}

export interface BattleMeta {
    name: string;
    description: string | null;
    setup: BattlePreparationParticipant[];
    friendlyFire: boolean;
    rules: Ruleset;
    critChoiceByDm: boolean;
    /** effective map: library edges of the pinned version minus removed edges */
    map: BattleMapConfig | null;
    mapRef?: BattleMapRef | null;
    mapState?: BattleMapState | null;
    /** stored own walls/bars of an inline map: `map` has the removed edges already subtracted */
    mapBase?: MapBase | null;
    audio?: BattleAudioState | null;
    turnTimerSeconds?: number | null;
    createdAt: Date;
}

export type HistoryChange = { cancelFromSeq: number } | { clear: true };

export interface LoadedBattle {
    scene: BattleSceneState;
    meta: BattleMeta;
    participants: BattleParticipant[];
    pending: BattleParticipant[];
    isDM: boolean;
    isDemo?: boolean;
}

export type ScenePatch = Partial<
    Pick<
        BattleSceneState,
        | 'status'
        | 'round'
        | 'turnIndex'
        | 'pendingMoraleCheck'
        | 'pendingChoice'
        | 'startedAt'
        | 'completedAt'
    >
> & {
    map?: BattleMapConfig | null;
    mapState?: BattleMapState | null;
    /** map-update: re-pin the battle to another library version */
    mapRef?: BattleMapRef;
    rules?: Ruleset;
    sceneState?: SystemSlot | null;
};

export interface BattleMutationOutcome {
    scene?: ScenePatch;
    participants: BattleParticipant[];
    pending: BattleParticipant[];
    events: NewBattleEvent[];
    history?: HistoryChange;
    /** the mutation deliberately changed the turn order (initiative roll / manual reorder) */
    reordered?: boolean;
}

export interface BattleDelta {
    battleId: string;
    version: number;
    scene: Pick<
        BattleSceneState,
        | 'status'
        | 'round'
        | 'turnIndex'
        | 'pendingMoraleCheck'
        | 'pendingChoice'
        | 'turnStartedAt'
    > & { sceneState?: SystemSlot };
    upserted: BattleParticipant[];
    /** нові учасники й ті, чий знімок змінився */
    fullIds: string[];
    removed: string[];
    events: StoredBattleEvent[];
}

export type BattleWrite = { logLocale: Locale };

export type BattleDb = Pick<
    PrismaClient,
    | 'battleScene'
    | 'battleParticipant'
    | 'battleEvent'
    | 'battleSnapshot'
    | '$transaction'
    | '$queryRaw'
    | '$executeRaw'
>;
