import {
    WFRP_CONDITION_KEYS,
    WFRP_CONDITION_REGISTRY,
    wfrpConditionEffectKey,
    type WfrpConditionKey,
    wfrpConditionMarker,
} from './catalog';

import type { SystemConditionLevel } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

export function conditionLevel(
    p: BattleParticipant,
    key: WfrpConditionKey
): number {
    const def = WFRP_CONDITION_REGISTRY[key];

    const effectKey = wfrpConditionEffectKey(key);

    const marker = wfrpConditionMarker(key);

    const sum = p.battleData.activeEffects.reduce(
        (acc, e) =>
            e.abilityKey === effectKey
                ? acc + (e.effects.find((x) => x.type === marker)?.value ?? 0)
                : acc,
        0
    );

    return def.leveled ? Math.min(sum, def.leveled.max) : Math.min(sum, 1);
}

export function wfrpConditions(p: BattleParticipant): SystemConditionLevel[] {
    return WFRP_CONDITION_KEYS.flatMap((key) => {
        const level = conditionLevel(p, key);

        return level > 0
            ? [{ key, level, effectKey: wfrpConditionEffectKey(key) }]
            : [];
    });
}
