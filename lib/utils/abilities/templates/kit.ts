import type {
    ParamDef,
    Recipe,
    RecipeContext,
    RecipeScope,
    RecipeValues,
} from './types';

import { DAMAGE_ELEMENT_OPTIONS } from '@/lib/constants/damage';
import { newEffect } from '@/lib/utils/abilities/editor';
import type { Effect, EffectKind, Trigger } from '@/lib/utils/abilities/schema';
import { SPELL_EFFECT_TRIGGER } from '@/lib/utils/spells/editor/spell-only';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';

export const PASSIVE: Trigger = { event: 'passive' };

export const range = (from: number, to: number, step = 1) =>
    Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) =>
        String(from + i * step)
    );

const DAMAGE_TYPES = DAMAGE_ELEMENT_OPTIONS.map((o) => o.value);

export const fx = (
    kind: EffectKind,
    trigger: Trigger,
    patch: Record<string, unknown> = {}
) => {
    const effect: Record<string, unknown> = {
        ...newEffect(kind, trigger),
        ...patch,
    };

    for (const key of Object.keys(effect))
        if (effect[key] === undefined) delete effect[key];

    return effect as Effect;
};

export const num = (
    key: string,
    def: number,
    min: number,
    max: number
): ParamDef => ({ key, kind: 'number', default: def, min, max });

export const dice = (def: string): ParamDef => ({
    key: 'dice',
    kind: 'dice',
    default: def,
});

export const damageType = (def: string): ParamDef => ({
    key: 'damageType',
    kind: 'damageType',
    default: def,
    options: DAMAGE_TYPES,
});

export const rounds = (def: number) => num('rounds', def, 1, 10);

export function ability(
    trigger: Trigger,
    effects: Effect[],
    limits?: { perBattle: number }
) {
    return (_v: RecipeValues, ctx: RecipeContext) => ({
        ability: {
            name: ctx.name,
            trigger,
            ...(limits ? { limits } : {}),
            effects,
        },
    });
}

export function dual(
    make: (v: RecipeValues, trigger: Trigger) => Effect[],
    opts: { concentration?: boolean } = {}
): Recipe['build'] {
    return (v, ctx) => {
        if (ctx.scope === 'spell')
            return {
                spell: make(v, SPELL_EFFECT_TRIGGER) as SpellEffect[],
                ...(opts.concentration ? { concentration: true } : {}),
            };

        return {
            ability: {
                name: ctx.name,
                trigger: SPELL_EFFECT_TRIGGER,
                limits: { perBattle: 1 },
                effects: make(v, SPELL_EFFECT_TRIGGER),
            },
        };
    };
}

export const both: readonly RecipeScope[] = ['ability', 'spell'];
