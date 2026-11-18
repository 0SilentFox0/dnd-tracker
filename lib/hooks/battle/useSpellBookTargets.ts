'use client';

import { type Dispatch, useMemo } from 'react';

import { useModeView } from './modes/useModeView';
import { useBattleScene } from './useBattleScene';
import { useSpellMapTargeting } from './useSpellMapTargeting';

import {
    spellAimTargets,
    type SpellFlowAction,
    type SpellFlowState,
    spellTargetCandidates,
    spellTargetInRange,
    withAllTargets,
    withChainTargets,
    withLiveAimTargets,
} from '@/lib/utils/battle/flows';
import { isOnMap, sightedTargets } from '@/lib/utils/battle/grid';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import {
    skillAllTargets,
    spellChain,
} from '@/lib/utils/battle/spell/spell-targeting';
import { matchesTargetFilter } from '@/lib/utils/battle/spell/target-filter';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

export function useSpellBookTargets(
    caster: BattleParticipant | null,
    flow: SpellFlowState,
    dispatch: Dispatch<SpellFlowAction>
) {
    const scene = useBattleScene();

    const order = scene.battle.initiativeOrder;

    const map = scene.battle.map ?? null;

    const { visible } = useModeView();

    const pickSide =
        flow.pick?.targetMode === 'template'
            ? undefined
            : flow.pick?.targetSide;

    const targets = useMemo(
        () =>
            spellTargetCandidates(order, caster, pickSide, map).filter(visible),
        [order, caster, pickSide, map, visible]
    );

    const filteredOut = (t: BattleParticipant) =>
        !matchesTargetFilter(
            t,
            flow.pick?.filter,
            {
                spellLevel: flow.pick?.level ?? 0,
                castLevel: flow.pick?.castLevel,
            },
            scene.battle.rules
        );

    const inRange = (t: BattleParticipant) =>
        spellTargetInRange(
            map,
            caster,
            t,
            flow.pick?.range,
            scene.battle.rules
        ) && !filteredOut(t);

    const aimPick =
        flow.pick?.targetMode === 'template' ? flow.pick : undefined;

    const touchedAt = (cell: GridPoint | null | undefined) => {
        const aim =
            aimPick?.template?.shape === 'emanation'
                ? caster?.battleData.position
                : cell;

        return map && caster && aimPick && aim
            ? spellAimTargets(
                  {
                      map,
                      participants: order,
                      caster,
                      rules: scene.battle.rules,
                  },
                  aimPick,
                  aim
              )
            : [];
    };

    const onMap = !!map && !!caster && isOnMap(caster);

    // fallen units leave the map: resurrection picks its target from the dialog list
    const mapTargeting =
        flow.step === 'targets' && onMap && flow.pick?.targetSide !== 'dead';

    const mapCandidates = useMemo(() => targets.filter(isOnMap), [targets]);

    const hover = useSpellMapTargeting(flow, dispatch, {
        caster,
        order,
        map,
        rules: scene.battle.rules,
        active: mapTargeting,
        candidates: mapCandidates,
        inRange,
        filteredOut,
        setMapAim: scene.intents.setMapAim,
        setMapPick: scene.intents.setMapPick,
    });

    const aimPreviewAt = (cell: GridPoint) => ({
        targets: touchedAt(cell)
            .filter(visible)
            .map((p) => ({
                participant: p,
                ally: !!caster && !isHostile(map, caster, p),
            })),
    });

    const chainFirst = flow.pick?.chain
        ? order.find((p) => p.basicInfo.id === flow.targetIds[0])
        : undefined;

    const chain =
        caster && chainFirst && flow.pick?.chain
            ? spellChain(
                  { participants: order, caster },
                  flow.pick.chain,
                  chainFirst,
                  map
              )
            : [];

    const allSide =
        flow.pick?.targetMode === 'all' &&
        caster &&
        (flow.pick.targetSide === 'ally' || flow.pick.targetSide === 'enemy')
            ? sightedTargets(
                  map,
                  order,
                  caster,
                  skillAllTargets(order, caster, flow.pick.targetSide, map)
              )
            : [];

    // measured from the point, not the id at click time: moving before the cast changes who is hit
    const state = withAllTargets(
        withChainTargets(
            withLiveAimTargets(
                flow,
                touchedAt(flow.aim).map((p) => p.basicInfo.id)
            ),
            chain.map((p) => p.basicInfo.id)
        ),
        allSide
    );

    return {
        targets,
        onMap,
        inRange,
        filteredOut,
        hover,
        aimPreviewAt,
        mapTargeting,
        chain: chain.filter(visible),
        state,
    };
}
