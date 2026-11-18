import { useMemo } from 'react';

import type { useBattleScene } from './useBattleScene';

import type { AttackFlowState } from '@/lib/utils/battle/flows';
import { strikeDamageSteps } from '@/lib/utils/battle/view';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { DamageStep } from '@/types/battle-actions';

export function useAttackSteps({
    attacker,
    attack,
    state,
    cover,
    scene,
}: {
    attacker: BattleParticipant | null;
    attack: BattleAttack | null;
    state: AttackFlowState;
    cover: Set<string>;
    scene: ReturnType<typeof useBattleScene>;
}) {
    const order = scene.battle.initiativeOrder;

    const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

    const steps = useMemo<DamageStep[][]>(() => {
        if (!attacker || !attack || state.step !== 'summary') return [];

        return state.strikes
            .filter((s) => s.outcome === 'hit' || s.outcome === 'crit')
            .map((s) => {
                const target = byId(s.targetId);

                if (!target) return [];

                return strikeDamageSteps({
                    attacker,
                    target,
                    attack,
                    damage: s.damage,
                    isCritical: s.outcome === 'crit',
                    blockedByCover: cover.has(s.targetId),
                    battle: {
                        initiativeOrder: order,
                        rules: scene.battle.rules,
                        battleLog: scene.battle.battleLog,
                        knowledge: scene.battle.knowledge,
                    },
                    viewer: scene.viewer,
                });
            });
        // byId читає order, який уже в deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        attacker,
        attack,
        state.step,
        state.strikes,
        order,
        scene.battle.rules,
        scene.battle.battleLog,
        scene.battle.knowledge,
        scene.viewer,
        cover,
    ]);

    const estimate = steps.reduce(
        (sum, list) => sum + (list.at(-1)?.after ?? 0),
        0
    );

    return { steps, estimate };
}
