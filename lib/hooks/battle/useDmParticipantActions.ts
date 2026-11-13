'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useBattleScene } from './useBattleScene';
import {
    type UnitControlRow,
    useUnitControlPanel,
} from './useUnitControlPanel';

import { BattleStatus } from '@/lib/constants/battle';
import { useConfirm } from '@/lib/hooks/common';
import { hasAnyCondition5e } from '@/lib/utils/battle/conditions';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export interface DmParticipantActions {
    onChangeHp: (p: BattleParticipant) => void;
    onTakeControl: (p: BattleParticipant | null) => void;
    onRemove: (p: BattleParticipant) => void;
    onToReserve?: (p: BattleParticipant) => void;
    onKill?: (p: BattleParticipant) => void;
    onConditions?: (p: BattleParticipant) => void;
    onToggleLair?: (p: BattleParticipant) => void;
    onLegendary?: (p: BattleParticipant) => void;
    conditionsEnabled?: boolean;
    onDone?: () => void;
    unitControl?: UnitControlRow;
}

interface Options {
    onChangeHp: (p: BattleParticipant) => void;
    onDone: () => void;
}

export function useDmParticipantActions({ onChangeHp, onDone }: Options) {
    const { battle, dmControl, actions } = useBattleScene();

    const t = useTranslations('battleDm.refresh');

    const confirm = useConfirm();

    const unitControl = useUnitControlPanel();

    const [conditionsId, setConditionsId] = useState<string | null>(null);

    const [legendaryId, setLegendaryId] = useState<string | null>(null);

    const isActive = battle.status === BattleStatus.ACTIVE;

    const update = (
        p: BattleParticipant,
        data:
            | { removeFromBattle: true }
            | { returnToReserve: true }
            | { kill: true }
    ) =>
        actions.updateParticipant.mutate({
            participantId: p.basicInfo.id,
            data,
        });

    const [orderOpen, setOrderOpen] = useState(false);

    const tInit = useTranslations('battleDm.initiative');

    const rollInitiative = async () => {
        const ok = await confirm({
            title: tInit('confirmTitle'),
            description: tInit('confirmDescription'),
            confirmLabel: tInit('confirm'),
        });

        if (ok) actions.initiativeRoll.mutate({});
    };

    const refreshSources = async () => {
        const ok = await confirm({
            title: t('title'),
            description: t('description'),
            confirmLabel: t('confirm'),
        });

        if (ok) actions.refreshSources.mutate({});
    };

    const row: DmParticipantActions = {
        onChangeHp,
        onTakeControl: (p) => dmControl.set(p?.basicInfo.id ?? null),
        onRemove: (p) => update(p, { removeFromBattle: true }),
        onToReserve: isActive
            ? (p) => update(p, { returnToReserve: true })
            : undefined,
        onConditions: isActive
            ? (p) => setConditionsId(p.basicInfo.id)
            : undefined,
        onToggleLair: isActive
            ? (p) =>
                  actions.updateParticipant.mutate({
                      participantId: p.basicInfo.id,
                      data: { lairActive: !p.battleData.lair?.active },
                  })
            : undefined,
        onLegendary: isActive
            ? (p) => setLegendaryId(p.basicInfo.id)
            : undefined,
        conditionsEnabled:
            (battle.rules
                ? (ruleSystemOf(battle.rules).conditionSet.enabled?.(
                      battle.rules
                  ) ?? false)
                : false) ||
            !!(battle.rules && ruleSystemOf(battle.rules).conditions) ||
            (battle.initiativeOrder ?? []).some(hasAnyCondition5e),
        onKill: isActive ? (p) => update(p, { kill: true }) : undefined,
        onDone,
        unitControl: unitControl.row,
    };

    const conditionsTarget = useMemo(
        () =>
            (battle.initiativeOrder ?? []).find(
                (p) => p.basicInfo.id === conditionsId
            ) ?? null,
        [battle.initiativeOrder, conditionsId]
    );

    const legendaryTarget = useMemo(
        () =>
            (battle.initiativeOrder ?? []).find(
                (p) => p.basicInfo.id === legendaryId
            ) ?? null,
        [battle.initiativeOrder, legendaryId]
    );

    return {
        row,
        conditions: {
            target: conditionsTarget,
            custom:
                battle.rules &&
                ruleSystemOf(battle.rules).conditionSet.custom?.(battle.rules),
            close: () => setConditionsId(null),
            submit: actions.conditions.mutate,
            isPending: actions.conditions.isPending,
        },
        systemConditions: {
            submit: actions.systemCondition.mutate,
            isPending: actions.systemCondition.isPending,
        },
        legendary: {
            target: legendaryTarget,
            close: () => setLegendaryId(null),
        },
        initiative: {
            roll: rollInitiative,
            isRolling: actions.initiativeRoll.isPending,
            orderTarget: orderOpen ? battle.initiativeOrder : null,
            openOrder: () => setOrderOpen(true),
            closeOrder: () => setOrderOpen(false),
            submitOrder: (order: string[]) =>
                actions.initiativeReorder.mutate({ order }),
            isReordering: actions.initiativeReorder.isPending,
        },
        refreshSources: {
            run: refreshSources,
            isPending: actions.refreshSources.isPending,
        },
        randomUnits: unitControl.random,
    };
}
