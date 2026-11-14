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

const conditionKeyOf = (e: EffectNode): string | undefined =>
    e.kind === 'applyCondition' && typeof e.condition === 'string'
        ? e.condition
        : undefined;

const isForeignCondition = (key: string, standard: readonly string[]) =>
    !isCustomConditionKey(key) &&
    !isMechanicalConditionKey(key) &&
    !standard.includes(key);

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
        existing.flatMap((a) => flatten(a.effects).map(conditionKeyOf))
    );

    if (
        abilities.some((a) =>
            flatten(a.effects).some((e) => {
                const key = conditionKeyOf(e);

                return (
                    key !== undefined &&
                    isForeignCondition(key, standard) &&
                    !keptConditions.has(key)
                );
            })
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
