import type { CreateCharacterInput } from './create-character-schema';
import type { UpdateCharacterInput } from './update-character-schema';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError, parseInput } from '@/lib/server/content/errors';
import { systemServerOf } from '@/lib/server/systems/registry';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems';
import type { SystemData } from '@/lib/utils/rules/systems/slot';
import {
    foreignColumnsOf,
    statColumnFillOf,
    statColumnsOf,
} from '@/lib/utils/rules/systems/stats';

const omit = <T extends object>(data: T, keys: readonly string[]): T =>
    Object.fromEntries(
        Object.entries(data).filter(([k]) => !keys.includes(k))
    ) as T;

const classMissing = (
    data: CreateCharacterInput | UpdateCharacterInput,
    mode: 'create' | 'update'
) =>
    !data.classes?.length &&
    (mode === 'create' ? !data.class : data.class === '');

export function parseSystemData(
    rules: Ruleset,
    value: SystemData,
    key: 'characteristics' | 'unitCharacteristics' = 'characteristics'
): SystemData {
    const schema = systemServerOf(rules).schemas[key];

    return schema ? (parseInput(schema, value) as SystemData) : value;
}

export function normalizeCharacterInput<
    T extends CreateCharacterInput | UpdateCharacterInput,
>(
    system: RuleSystemDefinition,
    data: T,
    rules: Ruleset,
    mode: 'create' | 'update'
): T {
    if (
        mode === 'create' &&
        system.lineage &&
        !(data as CreateCharacterInput).race
    )
        throw new ContentError(API_ERRORS.RACE_REQUIRED, 400);

    if (statColumnsOf(system).has('classes') && classMissing(data, mode))
        throw new ContentError(API_ERRORS.HERO_CLASS_REQUIRED, 400);

    const owned = omit(data, foreignColumnsOf(system));

    if (!system.characteristics.persisted)
        return omit(owned, ['characteristics']);

    if (mode === 'update')
        return {
            ...owned,
            ...(data.characteristics && {
                characteristics: parseSystemData(rules, data.characteristics),
            }),
        };

    if (!data.characteristics)
        throw new ContentError(API_ERRORS.CHARACTERISTICS_REQUIRED, 400);

    const parsed = parseSystemData(rules, data.characteristics);

    const characteristics = system.characteristics.initial?.(parsed) ?? parsed;

    return { ...owned, characteristics, ...statColumnFillOf(system, rules) };
}
