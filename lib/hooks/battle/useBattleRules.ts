'use client';

import { useMemo } from 'react';

import { useBattleSceneData } from './useBattleScene';

import { distanceOf } from '@/lib/utils/battle/grid/cell-feet';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';
export function useBattleRules() {
    const { battle } = useBattleSceneData();

    const { rules, system } = battle;

    return useMemo(() => {
        const def = ruleSystemOf(rules);

        const { combat, progression, spells, magic } = def;

        return {
            dice: combat.dice,
            serverJudged: combat.judge === 'server',
            actionEconomy: combat.actionEconomy,
            d20Stats: statColumnsOf(def).has('armorClass'),
            spells,
            tested: !!magic.tested,
            distance: distanceOf(rules),
            hpTerm: progression.hpTerm,
            systemKey: rules.system.key,
            sceneState: system,
        };
    }, [rules, system]);
}
