import type { SystemConditionLevel } from '@/lib/utils/rules/systems/types';
import type { ActiveEffect } from '@/types/battle';

export type DisplayEffect = ActiveEffect & { level?: number };

/** Effects of one system condition fold into the first of them, carrying the summed level. */
export function collapseSystemConditions(
    effects: ActiveEffect[],
    levels: SystemConditionLevel[]
): DisplayEffect[] {
    if (levels.length === 0) return effects;

    const byEffectKey = new Map(levels.map((l) => [l.effectKey, l.level]));

    const seen = new Set<string>();

    return effects.flatMap((e): DisplayEffect[] => {
        const level =
            e.abilityKey === undefined
                ? undefined
                : byEffectKey.get(e.abilityKey);

        if (level === undefined) return [e];

        if (seen.has(e.abilityKey as string)) return [];

        seen.add(e.abilityKey as string);

        return [{ ...e, level }];
    });
}
