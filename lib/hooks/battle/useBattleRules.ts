'use client';

import { useMemo } from 'react';

import { useBattleSceneData } from './useBattleScene';

import { NO_ACTION_ECONOMY } from '@/lib/utils/battle/actions/access';
import { distanceOf } from '@/lib/utils/battle/grid/cell-feet';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
export function useBattleRules() {
    const { battle } = useBattleSceneData();

    const { rules, system } = battle;

    return useMemo(() => {
        const def = ruleSystemOf(rules);

        const { combat, progression, spells, magic } = def;

        return {
            dice: combat.dice,
            attackDice: magic.attackDice,
            serverJudged: combat.judge === 'server',
            actionEconomy: combat.actionEconomy ?? NO_ACTION_ECONOMY,
            spells,
            tested: !!magic.tested,
            distance: distanceOf(rules),
            hpTerm: progression.hpTerm,
            systemKey: rules.system.key,
            sceneState: system,
        };
    }, [rules, system]);
}
