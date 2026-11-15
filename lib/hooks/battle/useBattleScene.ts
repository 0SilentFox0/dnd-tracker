'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { type DialogState, useAwaitingDmDialog } from './useAwaitingDmDialog';
import { useBattleActions } from './useBattleActions';
import { useBattleLogHistory } from './useBattleLogHistory';
import { useBattleToast } from './useBattleToast';
import { useDisplayEffectMap } from './useDisplayEffectMap';
import { useParticipantClick } from './useParticipantClick';
import { usePusherBattleSync } from './usePusherBattleSync';

import { BattleStatus } from '@/lib/constants/battle';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import type {
    BattleSceneData,
    BattleSceneValue,
} from '@/lib/hooks/battle/types';
import { useBattleMapEdges, useBattleMapTiles } from '@/lib/hooks/battle-maps';
import { battleQueryKey, useBattle } from '@/lib/hooks/battles';
import { usePlayerView } from '@/lib/hooks/common';
import { type AttackIntent, isIntentStale } from '@/lib/utils/battle/flows';
import type { MapAim, MapPick } from '@/lib/utils/battle/grid';
import {
    composeEffectiveMap,
    type LibraryEdges,
} from '@/lib/utils/battle/map-storage/effective-map';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import { deriveTileCells } from '@/lib/utils/battle/tiles/derive';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import { deriveScene, NO_ORDER } from '@/lib/utils/battle/view';
import type { BattleScene } from '@/types/api';
import type { BattleLogState, DmControl, ResultFx } from '@/types/battle-scene';

const TILE_PROPERTIES = Object.fromEntries(
    TILE_CATALOG.map((tile) => [tile.id, {
        blocks: tile.blocks,
        blocksSight: tile.blocksSight,
        footprint: tile.footprint,
    }])
);

function decodeTileLayers(
    encoded: Partial<Record<TileLayer, Record<string, string>>> | undefined
): TileLayerChunks {
    if (!encoded) return {};

    return Object.fromEntries(
        Object.entries(encoded).map(([layer, chunks]) => [
            layer,
            Object.fromEntries(
                Object.entries(chunks ?? {}).map(([key, data]) => [
                    key,
                    decodeTileChunk(data),
                ])
            ),
        ])
    ) as TileLayerChunks;
}

export const BattleSceneContext = createContext<BattleSceneValue | null>(null);

export const BattleSceneDataContext = createContext<BattleSceneData | null>(
    null
);

export function useBattleScene(): BattleSceneValue {
    const value = useContext(BattleSceneContext);

    if (!value) throw new Error('useBattleScene requires BattleSceneProvider');

    return value;
}

/** Без тостів, журналу, вибору й стану мутацій: компонент не перемальовується, поки не змінився бій. */
export function useBattleSceneData(): BattleSceneData {
    const value = useContext(BattleSceneDataContext);

    if (!value)
        throw new Error('useBattleSceneData requires BattleSceneProvider');

    return value;
}

export function useBattleSceneDataValue(
    value: BattleSceneValue
): BattleSceneData {
    const {
        campaignId,
        battleId,
        battle,
        viewer,
        turn,
        roster,
        awaiting,
        effects,
        dmControl,
        select,
        clickParticipant,
        readBattle,
    } = value;

    return useMemo(
        () => ({
            campaignId,
            battleId,
            battle,
            viewer,
            turn,
            roster,
            awaiting,
            effects,
            dmControl,
            select,
            clickParticipant,
            readBattle,
        }),
        [
            campaignId,
            battleId,
            battle,
            viewer,
            turn,
            roster,
            awaiting,
            effects,
            dmControl,
            select,
            clickParticipant,
            readBattle,
        ]
    );
}

export function useBattleSceneValue(
    campaignId: string,
    battleId: string,
    userId: string | null
) {
    const queryClient = useQueryClient();

    const t = useTranslations('battle.notify');

    const toast = useBattleToast();

    const { show } = toast;

    const [dmControlledId, setDmControlledId] = useState<string | null>(null);

    const [selectedId, select] = useState<string | null>(null);

    const [attackIntent, setAttackIntent] = useState<AttackIntent | null>(null);

    const clearAttackIntent = useCallback(() => setAttackIntent(null), []);

    const [mapAim, setMapAim] = useState<MapAim | null>(null);

    const [mapPick, setMapPick] = useState<MapPick | null>(null);

    const [attackReadyId, setAttackReady] = useState<string | null>(null);

    const [log, setLog] = useState<BattleLogState>({
        open: false,
        focus: null,
    });

    const openLog = useCallback((focus: number | null = null) => {
        select(null);
        setLog({ open: true, focus });
    }, []);

    const closeLog = useCallback(
        () => setLog({ open: false, focus: null }),
        []
    );

    const onTurnStarted = useCallback(
        (name?: string) => {
            show(name ? t('yourTurnNamed', { name }) : t('yourTurn'));
            navigator.vibrate?.(200);
        },
        [show, t]
    );

    const { data: isDM = false } = useQuery({
        queryKey: battleQueryKey(campaignId, battleId),
        queryFn: skipToken,
        select: (b: BattleScene) => b.isDM === true,
    });

    const { connectionState } = usePusherBattleSync(
        campaignId,
        battleId,
        userId,
        onTurnStarted,
        isDM
    );

    const { data: rawBattle, isLoading: isBattleLoading } = useBattle(
        campaignId,
        battleId,
        { pausePolling: connectionState === 'connected' }
    );

    const mapEdges = useBattleMapEdges(campaignId, rawBattle?.mapRef);

    const mapTiles = useBattleMapTiles(
        campaignId,
        rawBattle?.mapRef?.mapId,
        rawBattle?.mapRef?.version,
        !!rawBattle?.mapRef
    );

    const [heldEdges, setHeldEdges] = useState<LibraryEdges | undefined>();

    if (mapEdges.data && mapEdges.data !== heldEdges)
        setHeldEdges(mapEdges.data);

    const edges =
        mapEdges.data ??
        (rawBattle?.mapRef && mapEdges.isPending ? heldEdges : undefined);

    const tileChunks = useMemo(
        () => decodeTileLayers(mapTiles.data?.chunks),
        [mapTiles.data]
    );

    const decodedTileFields = useMemo(() => {
        if (!rawBattle?.map || !mapTiles.data) return null;

        return deriveTileCells(
            {
                chunks: tileChunks,
                cols: rawBattle.map.cols,
                rows: rawBattle.map.rows,
                version: mapTiles.data.version,
            },
            TILE_PROPERTIES
        );
    }, [mapTiles.data, rawBattle, tileChunks]);

    const isMapPending =
        !!rawBattle?.mapRef &&
        (!edges || (mapTiles.isPending && !mapTiles.isError));

    const isLoading = isBattleLoading || (isMapPending && !mapEdges.isError);

    const mapError = isMapPending ? mapEdges.error : null;

    const { refetch: refetchEdges } = mapEdges;

    const retry = useCallback(() => void refetchEdges(), [refetchEdges]);

    const battle = useMemo(() => {
        if (!rawBattle?.map || isMapPending) return rawBattle;

        const effective = composeEffectiveMap(
            rawBattle.map,
            rawBattle.mapState,
            edges
        );

        const blocked = decodedTileFields?.blocked;

        const map = blocked?.size
            ? {
                  ...effective,
                  blocked: [...new Set([...(effective.blocked ?? []), ...blocked])],
              }
            : effective;

        return map === rawBattle.map ? rawBattle : { ...rawBattle, map };
    }, [rawBattle, edges, isMapPending, decodedTileFields]);

    const actions = useBattleActions(campaignId, battleId, show);

    const readBattle = useCallback(
        () =>
            queryClient.getQueryData<BattleScene>(
                battleQueryKey(campaignId, battleId)
            ),
        [queryClient, campaignId, battleId]
    );

    const logHistory = useBattleLogHistory(
        campaignId,
        battleId,
        battle?.battleLog
    );

    const flag = usePlayerView({ kind: 'battle', id: battleId });

    const realIsDM = battle?.isDM === true;

    const playerViewOn = realIsDM && flag.enabled;

    const derived = useMemo(
        () =>
            battle
                ? deriveScene(battle, userId, dmControlledId, {
                      playerView: playerViewOn,
                  })
                : null,
        [battle, userId, dmControlledId, playerViewOn]
    );

    if (playerViewOn && (attackIntent || mapAim || mapPick || attackReadyId)) {
        setAttackIntent(null);
        setMapAim(null);
        setMapPick(null);
        setAttackReady(null);
    }

    const playerView = useMemo(
        () => ({
            available: realIsDM,
            enabled: playerViewOn,
            toggle: flag.toggle,
        }),
        [realIsDM, playerViewOn, flag.toggle]
    );

    const awaitingDm = useAwaitingDmDialog(
        !!derived?.viewer.isDM,
        derived?.awaiting ?? null
    );

    const [resultDismissed, setResultDismissed] = useState(false);

    const resultScreen: DialogState = {
        open: battle?.status === BattleStatus.COMPLETED && !resultDismissed,
        setOpen: (open) => setResultDismissed(!open),
    };

    const order = battle?.initiativeOrder;

    const effects = useDisplayEffectMap(order ?? NO_ORDER, battle?.rules);

    const dmControl = useMemo<DmControl>(
        () => ({ id: dmControlledId, set: setDmControlledId }),
        [dmControlledId]
    );

    const [resultFx, showResult] = useState<ResultFx | null>(null);

    const anyPending = Object.values(actions).some((m) => m.isPending);

    const attackReady =
        !!attackReadyId &&
        attackReadyId === derived?.turn.current?.basicInfo.id;

    const clickParticipant = useParticipantClick(
        battle && derived
            ? {
                  battle,
                  turn: derived.turn,
                  anyPending,
                  attackReady,
                  select,
                  requestAttack: setAttackIntent,
              }
            : null
    );

    if (
        attackIntent &&
        battle &&
        isIntentStale(attackIntent, {
            round: battle.currentRound,
            turnIndex: battle.currentTurnIndex,
        })
    )
        setAttackIntent(null);

    if (!battle || !derived || isMapPending)
        return { value: null, loading: isLoading, error: mapError, retry };

    const value: BattleSceneValue = {
        campaignId,
        battleId,
        battle,
        ...(mapTiles.data && {
            tileChunks,
            tileVersion: mapTiles.data.version,
        }),
        ...derived,
        effects,
        dialogs: { awaitingDm, resultScreen },
        connection: connectionState,
        dmControl,
        playerView,
        selectedId,
        select,
        clickParticipant,
        intents: {
            attack: attackIntent,
            requestAttack: setAttackIntent,
            clearAttack: clearAttackIntent,
            mapAim,
            setMapAim,
            mapPick,
            setMapPick,
            attackReady,
            setAttackReady,
        },
        toast,
        result: { fx: resultFx, show: showResult },
        log: { ...log, show: openLog, close: closeLog },
        readBattle,
        logHistory,
        actions,
        anyPending,
    };

    return { value, loading: isLoading, error: null, retry };
}
