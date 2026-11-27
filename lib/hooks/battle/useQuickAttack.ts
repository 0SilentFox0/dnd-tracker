'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useModeView } from './modes/useModeView';
import { isTargetableForViewer } from './useAttackTargets';
import type { useAttackWizard } from './useAttackWizard';
import { useBattleScene } from './useBattleScene';

import { AttackType } from '@/lib/constants/battle';
import { isAttackable } from '@/lib/utils/abilities/engine/core/participants';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { forcedFor } from '@/lib/utils/battle/flows/forced-for';
import {
    attackReachError,
    pickAttack,
} from '@/lib/utils/battle/grid/attack-reach';
import { lineOfFire } from '@/lib/utils/battle/grid/line-of-fire';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';

interface Selection {
    targetId: string | null;
    attackId?: string;
}

export type QuickAttackModel = ReturnType<typeof useQuickAttack>;

export function useQuickAttack(
    wizard: ReturnType<typeof useAttackWizard>,
    attacker: BattleParticipant | null,
    ready: boolean
) {
    const { battle, select } = useBattleScene();

    const [sel, setSel] = useState<Selection | null>(null);

    const { state, view, actions } = wizard;

    const { visible } = useModeView();

    const order = (battle.initiativeOrder ?? []).filter(
        (p) => !p.battleData.reserved
    );

    const { map = null, rules } = battle;

    const live = ready || state.quick;

    if (sel && !live) setSel(null);

    const mainPool = view.pools.main;

    const targets =
        sel && live && attacker
            ? order.filter(
                  (p) =>
                      isTargetableForViewer(p, visible) &&
                      isHostile(map, attacker, p) &&
                      isAttackable(p) &&
                      pickAttack(map, order, attacker, mainPool, p, rules)
                          .attack !== null
              )
            : [];

    const latest = useRef({ quick: state.quick, close: actions.close });

    useEffect(() => {
        latest.current = { quick: state.quick, close: actions.close };
    });

    const targetId =
        sel?.targetId ??
        (targets.length === 1 ? targets[0].basicInfo.id : null);

    const target = targets.find((p) => p.basicInfo.id === targetId);

    const weapons =
        target && attacker
            ? mainPool.map((attack) => {
                  const reason = attackReachError(
                      map,
                      order,
                      attacker,
                      attack,
                      [target],
                      rules
                  );

                  return { attack, reason, reachable: reason === null };
              })
            : [];

    const defaultId = (() => {
        if (!target || !attacker) return undefined;

        const { attack } = pickAttack(
            map,
            order,
            attacker,
            mainPool,
            target,
            rules
        );

        return attack ? (attack.id ?? attack.name) : undefined;
    })();

    const isReachable = (id?: string) =>
        !!id &&
        weapons.some(
            (w) => w.reachable && (w.attack.id ?? w.attack.name) === id
        );

    const attackId = isReachable(sel?.attackId)
        ? sel?.attackId
        : isReachable(defaultId)
          ? defaultId
          : undefined;

    const chosen = weapons.find(
        (w) => (w.attack.id ?? w.attack.name) === attackId
    )?.attack;

    const forced =
        attacker && target && chosen
            ? forcedFor(attacker, target, chosen, {
                  order,
                  round: battle.currentRound,
                  map,
                  rules,
              })
            : undefined;

    const cover =
        !!attacker &&
        !!target &&
        !!map &&
        !!chosen &&
        attackKindOf(chosen.type) === AttackType.RANGED &&
        lineOfFire(
            map,
            order.filter((p) => p === attacker || visible(p)),
            attacker,
            target
        ).blocked;

    const begin = useCallback(
        (targetId?: string, attackId?: string) => {
            if (latest.current.quick) latest.current.close();

            setSel({ targetId: targetId ?? null, attackId });

            if (targetId) select(targetId);
        },
        [select]
    );

    const sending = state.quick && state.step === 'submitting';

    return {
        open: sel !== null && live,
        begin,
        view: {
            targets,
            target,
            weapons,
            attackId,
            forced,
            cover,
            counter: view.counter,
            status: sending
                ? state.waitingCrit
                    ? ('waitingDm' as const)
                    : ('sending' as const)
                : ('idle' as const),
            error: state.quick && !sending ? state.error : undefined,
        },
        actions: {
            pickTarget: (id: string) => begin(id),
            pickWeapon: (id: string) =>
                setSel((s) => s && { ...s, attackId: id }),
            attack: () => {
                if (!target) return;

                if (chosen && !actions.quickAllowed(chosen)) setSel(null);

                actions.quick(target.basicInfo.id, attackId);
            },
            wizard: () => {
                actions.open(target?.basicInfo.id, attackId);
                setSel(null);
            },
            close: () => {
                setSel(null);
                actions.close();
            },
        },
    };
}
