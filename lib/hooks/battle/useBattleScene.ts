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
import { useBattleSceneMap } from './useBattleSceneMap';
import { useBattleToast } from './useBattleToast';
import { useDisplayEffectMap } from './useDisplayEffectMap';
import { useParticipantClick } from './useParticipantClick';
import { usePusherBattleSync } from './usePusherBattleSync';

import { BattleStatus } from '@/lib/constants/battle';
import type {
    BattleSceneData,
    BattleSceneValue,
} from '@/lib/hooks/battle/types';
import { battleQueryKey, useBattle } from '@/lib/hooks/battles';
import { usePlayerView } from '@/lib/hooks/common';
import { type AttackIntent, isIntentStale } from '@/lib/utils/battle/flows';
import type { MapAim, MapPick } from '@/lib/utils/battle/grid';
import { deriveScene, NO_ORDER } from '@/lib/utils/battle/view';
import type { BattleScene } from '@/types/api';
import type { BattleLogState, DmControl, ResultFx } from '@/types/battle-scene';
export const BattleSceneContext = createContext<BattleSceneValue | null>(null);

export const BattleSceneDataContext = createContext<BattleSceneData | null>(
    null
);

export function useBattleScene(): BattleSceneValue {
    const value = useContext(BattleSceneContext);

    if (!value) throw new Error('useBattleScene requires BattleSceneProvider');

    return value;
}

export function useBattleSceneData(): BattleSceneData {
    const value = useContext(BattleSceneDataContext);

    if (!value)
        throw new Error('useBattleSceneData requires BattleSceneProvider');

    return value;
}
export { useBattleSceneDataValue } from './useBattleSceneDataValue';

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

    const [spellBookIntent, setSpellBookIntent] = useState<number | null>(null);

    const clearSpellBookIntent = useCallback(
        () => setSpellBookIntent(null),
        []
    );

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

    const sceneMap = useBattleSceneMap(campaignId, rawBattle);

    const {
        battle,
        isMapPending,
        loading: isMapLoading,
        error: mapError,
        retry,
        tiles,
    } = sceneMap;

    const isLoading = isBattleLoading || isMapLoading;

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

    if (
        playerViewOn &&
        (attackIntent ||
            spellBookIntent !== null ||
            mapAim ||
            mapPick ||
            attackReadyId)
    ) {
        setAttackIntent(null);
        setSpellBookIntent(null);
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
        ...(tiles && {
            tileChunks: tiles.chunks,
            tileVersion: tiles.version,
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
            spellBook: spellBookIntent,
            requestSpellBook: setSpellBookIntent,
            clearSpellBook: clearSpellBookIntent,
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
