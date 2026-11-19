import { BattleStatus } from '@/lib/constants/battle';
import { CampaignRole, isDemoKind } from '@/lib/constants/campaigns';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { storedRecord, storedRecordList } from '@/lib/schemas/stored-json';
import { getPinnedGeometry } from '@/lib/server/battle-maps/library-service';
import { getPinnedTileChunks } from '@/lib/server/battle-maps/tiles-service';
import { pendingFromStored } from '@/lib/utils/battle/crit-choice/pending';
import { composeEffectiveMap } from '@/lib/utils/battle/map-storage/effective-map';
import { BattleMapVersionMissingError } from '@/lib/utils/battle/store/errors';
import { snapshotCache } from '@/lib/utils/battle/store/snapshot-cache';
import {
    participantSnapshotSchema,
    participantStateSchema,
} from '@/lib/utils/battle/store/snapshot-schema';
import { rowToMapState } from '@/lib/utils/battle/store/snapshot-state';
import { joinParticipant } from '@/lib/utils/battle/store/split-participant';
import type {
    BattleDb,
    BattleSceneState,
    LoadedBattle,
    ParticipantColumns,
} from '@/lib/utils/battle/store/types';
import {
    deriveTileCells,
    type TileLayerChunks,
} from '@/lib/utils/battle/tiles/derive';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import { parseRulesCached } from '@/lib/utils/rules/schema';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleAudioState } from '@/types/audio';
import type {
    BattleParticipant,
    BattlePreparationParticipant,
} from '@/types/battle';
import type {
    BattleMapConfig,
    BattleMapRef,
    BattleMapState,
    MapBase,
} from '@/types/battle-grid';

type ParticipantRow = ParticipantColumns & {
    battleId: string;
    snapshot: unknown;
    state: unknown;
    snapshotHash: string;
};

const TILE_PROPERTIES = Object.fromEntries(
    TILE_CATALOG.map((tile) => [
        tile.id,
        {
            blocks: tile.blocks,
            blocksSight: tile.blocksSight,
            footprint: tile.footprint,
        },
    ])
);

const sceneStateSchema = storedRecord<SystemSlot>();

/** A malformed slot is dropped (the legacy column still applies) instead of failing the whole battle load */
function sceneStateOf(raw: unknown): SystemSlot | undefined {
    if (!raw) return undefined;

    const parsed = sceneStateSchema.safeParse(raw);

    if (parsed.success) return parsed.data;

    console.error('battle scene system_state ignored: not a record');

    return undefined;
}

function rowToParticipant(row: ParticipantRow): BattleParticipant {
    const { battleId, snapshot, state, snapshotHash, ...columns } = row;

    return joinParticipant(
        {
            columns,
            snapshot: participantSnapshotSchema.parse(snapshot),
            state: participantStateSchema.parse(state),
            snapshotHash,
        },
        battleId
    );
}

const PARTICIPANT_ROW_SELECT = {
    id: true,
    battleId: true,
    sourceType: true,
    sourceId: true,
    side: true,
    controlledBy: true,
    orderIndex: true,
    isPending: true,
    extraTurnOf: true,
    currentHp: true,
    tempHp: true,
    maxHp: true,
    morale: true,
    status: true,
    initiative: true,
    hasUsedAction: true,
    hasUsedBonusAction: true,
    hasUsedReaction: true,
    hasExtraTurn: true,
    state: true,
    snapshotHash: true,
} as const;

/** Snapshots (the bulk of a battle row set) rarely change between actions: only cache misses are read. */
async function withSnapshots(
    db: BattleDb,
    rows: Array<Omit<ParticipantRow, 'snapshot'>>
): Promise<ParticipantRow[]> {
    const known = new Map(
        rows.map((r) => [r.id, snapshotCache.get(r.snapshotHash)])
    );

    const hashes = new Map(rows.map((r) => [r.id, r.snapshotHash]));

    const missing = rows
        .filter((r) => known.get(r.id) === undefined)
        .map((r) => r.id);

    const fetched = missing.length
        ? await db.battleParticipant.findMany({
              where: { id: { in: missing } },
              select: { id: true, snapshot: true, snapshotHash: true },
          })
        : [];

    for (const f of fetched) {
        snapshotCache.remember(f.snapshotHash, f.snapshot);
        known.set(f.id, participantSnapshotSchema.parse(f.snapshot));
        hashes.set(f.id, f.snapshotHash);
    }

    // a participant deleted between the two reads is dropped, like a row the scene query missed
    return rows.flatMap((r) => {
        const snapshot = known.get(r.id);

        return snapshot === undefined
            ? []
            : [
                  {
                      ...r,
                      snapshot,
                      snapshotHash: hashes.get(r.id) ?? r.snapshotHash,
                  },
              ];
    });
}

async function loadCampaignRules(
    db: BattleDb,
    args: { battleId: string; campaignId: string }
): Promise<unknown> {
    const row = await db.battleScene.findFirst({
        where: { id: args.battleId, campaignId: args.campaignId },
        select: { campaign: { select: { rules: true } } },
    });

    return row?.campaign.rules;
}

async function effectiveMapOf(
    base: BattleMapConfig | null,
    ref: BattleMapRef | null,
    state: BattleMapState | null
): Promise<BattleMapConfig | null> {
    if (!base) return null;

    if (!ref) return composeEffectiveMap(base, state);

    const [library, encodedTiles] = await Promise.all([
        getPinnedGeometry(ref.mapId, ref.version),
        getPinnedTileChunks(ref.mapId, ref.version),
    ]);

    if (!library || encodedTiles === null)
        throw new BattleMapVersionMissingError(ref.mapId, ref.version);

    const chunks = Object.fromEntries(
        Object.entries(encodedTiles).map(([layer, records]) => [
            layer,
            Object.fromEntries(
                Object.entries(records ?? {}).map(([key, data]) => [
                    key,
                    decodeTileChunk(data),
                ])
            ),
        ])
    ) as TileLayerChunks;

    const derived = deriveTileCells(
        {
            chunks,
            cols: base.cols,
            rows: base.rows,
            version: ref.version,
        },
        TILE_PROPERTIES
    );

    const effective = composeEffectiveMap(base, state, library);

    return derived.blocked.size
        ? {
              ...effective,
              blocked: [
                  ...new Set([
                      ...(effective.blocked ?? []),
                      ...derived.blocked,
                  ]),
              ],
          }
        : effective;
}

export async function loadBattle(
    db: BattleDb,
    args: { battleId: string; campaignId: string; userId: string }
): Promise<(LoadedBattle & { isMember: boolean }) | null> {
    const row = await db.battleScene.findFirst({
        where: { id: args.battleId, campaignId: args.campaignId },
        select: {
            id: true,
            campaignId: true,
            ownerUserId: true,
            name: true,
            description: true,
            status: true,
            currentRound: true,
            currentTurnIndex: true,
            version: true,
            eventSeq: true,
            pendingCritChoice: true,
            systemState: true,
            map: true,
            mapId: true,
            mapVersion: true,
            mapState: {
                select: { removedEdges: true, doors: true, fog: true },
            },
            audio: true,
            rules: true,
            startedAt: true,
            turnStartedAt: true,
            turnTimerSeconds: true,
            completedAt: true,
            createdAt: true,
            participants: true,
            battleParticipants: {
                orderBy: { orderIndex: 'asc' },
                select: PARTICIPANT_ROW_SELECT,
            },
            campaign: {
                select: {
                    kind: true,
                    friendlyFire: true,
                    critChoiceByDm: true,
                    dmUserId: true,
                    members: {
                        where: { userId: args.userId },
                        select: { role: true },
                    },
                },
            },
        },
    });

    if (!row) return null;

    const storedSceneState = sceneStateOf(row.systemState);

    const scene: BattleSceneState = {
        id: row.id,
        campaignId: row.campaignId,
        status: row.status as BattleStatus,
        round: row.currentRound,
        turnIndex: row.currentTurnIndex,
        version: row.version,
        eventSeq: row.eventSeq,
        pendingChoice: pendingFromStored(row.pendingCritChoice),
        ...(storedSceneState && { sceneState: storedSceneState }),
        startedAt: row.startedAt,
        turnStartedAt: row.turnStartedAt,
        completedAt: row.completedAt,
    };

    const membership = row.campaign.members[0];

    const ownsDemoCopy =
        isDemoKind(row.campaign.kind) && row.ownerUserId === args.userId;

    const mapRef =
        row.mapId && row.mapVersion !== null
            ? { mapId: row.mapId, version: row.mapVersion }
            : null;

    const mapState = rowToMapState(row.mapState);

    const stored = (row.map ?? null) as BattleMapConfig | null;

    const [rawRules, withSnap, map] = await Promise.all([
        row.status !== BattleStatus.PREPARED && row.rules
            ? row.rules
            : loadCampaignRules(db, args),
        withSnapshots(db, row.battleParticipants),
        effectiveMapOf(stored, mapRef, mapState),
    ]);

    const rules = parseRulesCached(rawRules);

    const all = withSnap.map((p) => ({
        isPending: p.isPending,
        participant: rowToParticipant(p),
    }));

    const mapBase: MapBase | null =
        stored && !mapRef
            ? {
                  ...(stored.walls && { walls: stored.walls }),
                  ...(stored.bars && { bars: stored.bars }),
              }
            : null;

    return {
        scene,
        meta: {
            name: row.name,
            description: row.description,
            setup: storedRecordList<BattlePreparationParticipant>().parse(
                row.participants
            ),
            friendlyFire: row.campaign.friendlyFire ?? false,
            rules,
            critChoiceByDm: row.campaign.critChoiceByDm,
            dmUserId: row.campaign.dmUserId,
            map,
            mapRef,
            mapState,
            mapBase,
            audio: (row.audio ?? null) as BattleAudioState | null,
            turnTimerSeconds: row.turnTimerSeconds,
            createdAt: row.createdAt,
        },
        participants: all.filter((p) => !p.isPending).map((p) => p.participant),
        pending: all.filter((p) => p.isPending).map((p) => p.participant),
        // A demo visitor gets the standard battle controls, while campaign content
        // writes remain protected by their separate DM/member authorization.
        isDM: membership?.role === CampaignRole.DM || ownsDemoCopy,
        isMember: Boolean(membership) || ownsDemoCopy,
        isDemo: isDemoKind(row.campaign.kind),
    };
}

export async function loadBattleAccess(
    db: BattleDb,
    args: { battleId: string; campaignId: string; userId: string }
): Promise<{
    version: number;
    isMember: boolean;
    isDM: boolean;
    isDemo: boolean;
} | null> {
    const row = await db.battleScene.findFirst({
        where: { id: args.battleId, campaignId: args.campaignId },
        select: {
            version: true,
            ownerUserId: true,
            campaign: {
                select: {
                    kind: true,
                    members: {
                        where: { userId: args.userId },
                        select: { role: true },
                    },
                },
            },
        },
    });

    if (!row) return null;

    const membership = row.campaign.members[0];

    const isDemo = isDemoKind(row.campaign.kind);

    const ownsDemoCopy = isDemo && row.ownerUserId === args.userId;

    return {
        version: row.version,
        isMember: Boolean(membership) || ownsDemoCopy,
        isDM: membership?.role === CampaignRole.DM || ownsDemoCopy,
        isDemo,
    };
}
