'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { inPlay } from '@/lib/utils/abilities/engine/core/participants';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import { frenzyOp, intimidateOp, passionOp } from '@/systems/wfrp/api/battle';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { wfrpState } from '@/systems/wfrp/rules/state';
import { isFrenzied } from '@/systems/wfrp/rules/traits/frenzy';
import {
    animosityDue,
    groupLabel,
    hatesTarget,
} from '@/systems/wfrp/rules/traits/passions';
import type { BattleParticipant } from '@/types/battle';

export interface PsychologyPanel {
    canFrenzy: boolean;
    frenzy(): void;
    vent: { key: string; group: string }[];
    release: { key: string; group: string; passion: string }[];
    intimidate: { id: string; name: string }[];
    ventAnimosity(): void;
    releasePassion(key: string): void;
    intimidateFoe(targetId: string): void;
    isPending: boolean;
}

/** Null outside canon5e, off the hero's own turn, or when nothing psychological is available. */
export function usePsychologyPanel(
    hero: BattleParticipant
): PsychologyPanel | null {
    const { battle, turn, viewer, actions } = useBattleScene();

    const participantId = hero.basicInfo.id;

    if (
        editionOf(battle.rules).psychologyModel !== 'extended' ||
        turn.current?.basicInfo.id !== participantId ||
        !inPlay(hero)
    )
        return null;

    const order = battle.initiativeOrder;

    const foes = order.filter(
        (o) =>
            o.basicInfo.id !== participantId &&
            inPlay(o) &&
            isHostile(battle.map, hero, o)
    );

    const canFrenzy =
        !isFrenzied(hero) &&
        wfrpState(hero).frenzyTried !== battle.currentRound &&
        foes.length > 0;

    const vent = animosityDue(order, hero, battle.map).map((e) => ({
        ...e,
        group: groupLabel(e.group),
    }));

    const release = viewer.isDM
        ? Object.entries(wfrpState(hero).compelled ?? {}).map(([key, e]) => ({
              key,
              group: groupLabel(e.group),
              passion: e.kind ?? 'hatred',
          }))
        : [];

    const intimidate = hero.actionFlags.hasUsedAction
        ? []
        : foes
              .filter((f) => !hatesTarget(f, hero))
              .map((f) => ({ id: f.basicInfo.id, name: f.basicInfo.name }));

    if (!canFrenzy && !vent.length && !release.length && !intimidate.length)
        return null;

    return {
        canFrenzy,
        frenzy: () =>
            actions.system.mutate(frenzyOp({ participantId, serverRoll: true })),
        vent,
        release,
        intimidate,
        ventAnimosity: () =>
            actions.system.mutate(passionOp({ participantId, mode: 'vent' })),
        releasePassion: (key) =>
            actions.system.mutate(
                passionOp({ participantId, mode: 'release', key })
            ),
        intimidateFoe: (targetId) =>
            actions.system.mutate(
                intimidateOp({ participantId, targetId, serverRoll: true })
            ),
        isPending:
            isSystemActionPending(actions.system, 'frenzy') ||
            isSystemActionPending(actions.system, 'passion') ||
            isSystemActionPending(actions.system, 'intimidate'),
    };
}
