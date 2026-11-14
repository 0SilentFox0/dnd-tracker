import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { actorSystem } from '@/lib/server/content/kind-active';
import {
    effectKey,
    type EffectOwnership,
    isEffectInComposition,
} from '@/lib/utils/abilities/registry/effects/ownership';
import { SYSTEM_EFFECT_OWNERSHIP } from '@/lib/utils/abilities/registry/effects/system-rows';
import {
    isCustomConditionKey,
    isMechanicalConditionKey,
} from '@/lib/utils/abilities/schema/kinds';
import type { Actor } from '@/lib/utils/api/actor';
import {
    composition,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';

interface EffectNode {
    kind: string;
    flag?: unknown;
    condition?: unknown;
    conditions?: unknown;
    options?: readonly EffectNode[];
}

type EffectOwner = { effects: readonly EffectNode[] };

const flatten = (effects: readonly EffectNode[]): EffectNode[] =>
    effects.flatMap((e) => [
        e,
        ...(Array.isArray(e.options) ? flatten(e.options) : []),
    ]);

/** Rows saved before a module was dropped keep their effects: an update rejects only keys the stored row does not already carry. */
export const storedEffectOwners = (json: unknown): EffectOwner[] =>
    Array.isArray(json)
        ? json.filter(
              (a): a is EffectOwner =>
                  typeof a === 'object' &&
                  a !== null &&
                  Array.isArray((a as EffectOwner).effects)
          )
        : [];

const IMMUNITY_TRAIT_KEYS = ['fear', 'berserk', 'charm'];

const conditionKeysOf = (e: EffectNode): string[] => {
    if (e.kind === 'applyCondition')
        return typeof e.condition === 'string' ? [e.condition] : [];

    return e.kind === 'flag' &&
        e.flag === 'conditionImmunity' &&
        Array.isArray(e.conditions)
        ? e.conditions.filter(
              (c): c is string =>
                  typeof c === 'string' && !IMMUNITY_TRAIT_KEYS.includes(c)
          )
        : [];
};

const isForeignCondition = (key: string, standard: readonly string[]) =>
    !isCustomConditionKey(key) &&
    !isMechanicalConditionKey(key) &&
    !standard.includes(key);

/** 5etools sources are inherently 5e: conditions foreign to the campaign system are dropped (not failed) and counted */
export function dropForeignConditions<T extends EffectOwner>(
    system: SystemSelection,
    abilities: readonly T[] | undefined
): { abilities: T[] | undefined; dropped: number } {
    if (!abilities?.length) return { abilities: abilities as T[] | undefined, dropped: 0 };

    const standard = ruleSystemOf({ system }).conditionSet.keys;

    let dropped = 0;

    const clean = (effects: readonly EffectNode[]): EffectNode[] =>
        effects.flatMap((e) => {
            const options = Array.isArray(e.options)
                ? clean(e.options)
                : undefined;

            const node = options ? { ...e, options } : e;

            if (e.kind === 'applyCondition') {
                const keys = conditionKeysOf(e);

                if (keys.some((k) => isForeignCondition(k, standard))) {
                    dropped += 1;

                    return [];
                }

                return [node];
            }

            if (
                e.kind === 'flag' &&
                e.flag === 'conditionImmunity' &&
                Array.isArray(e.conditions)
            ) {
                const all = e.conditions as unknown[];

                const kept = all.filter(
                    (c) =>
                        typeof c !== 'string' ||
                        IMMUNITY_TRAIT_KEYS.includes(c) ||
                        !isForeignCondition(c, standard)
                );

                dropped += all.length - kept.length;

                return kept.length ? [{ ...node, conditions: kept }] : [];
            }

            return [node];
        });

    return {
        abilities: abilities.map((a) => ({
            ...a,
            effects: clean(a.effects),
        })),
        dropped,
    };
}

export function assertEffectsInComposition(
    system: SystemSelection,
    abilities: readonly EffectOwner[] | undefined,
    existing: readonly EffectOwner[] = [],
    own: EffectOwnership = SYSTEM_EFFECT_OWNERSHIP
): void {
    if (!abilities?.length) return;

    const c = composition(system);

    const kept = new Set(
        existing.flatMap((a) => flatten(a.effects).map(effectKey))
    );

    if (
        abilities.some((a) =>
            flatten(a.effects).some(
                (e) =>
                    !isEffectInComposition(e, c, own) && !kept.has(effectKey(e))
            )
        )
    )
        throw new ContentError(API_ERRORS.EFFECT_OUTSIDE_COMPOSITION, 422);

    const standard = ruleSystemOf({ system }).conditionSet.keys;

    const keptConditions = new Set(
        existing.flatMap((a) => flatten(a.effects).flatMap(conditionKeysOf))
    );

    if (
        abilities.some((a) =>
            flatten(a.effects).some((e) =>
                conditionKeysOf(e).some(
                    (key) =>
                        isForeignCondition(key, standard) &&
                        !keptConditions.has(key)
                )
            )
        )
    )
        throw new ContentError(API_ERRORS.CONDITION_UNKNOWN, 422);
}

/** Resource writes outside units: the rule system comes from the campaign the row is written to, loaded once per actor. */
export async function assertCampaignEffects(
    actor: Actor,
    abilities: readonly EffectOwner[] | undefined,
    existing: readonly EffectOwner[] = []
): Promise<void> {
    if (!abilities?.length) return;

    assertEffectsInComposition(await actorSystem(actor), abilities, existing);
}
