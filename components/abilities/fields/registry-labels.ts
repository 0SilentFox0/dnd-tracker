import type { Translator } from '@/lib/i18n/translator';
import type {
    FieldMeta,
    LocalizedFieldMeta,
} from '@/lib/utils/abilities/registry/fields';
import { allConditionKeys } from '@/lib/utils/rules/systems/lookup';

const SET_PREFIX: Record<string, string> = {
    stat: 'stats',
    'filter.kind': 'damageFilters',
    target: 'targets',
};

export const optionSetKey = (field: string) =>
    SET_PREFIX[field] ?? `options.${field}`;

// the owner key (`effects.dot`, `flags.sense`, …) overrides the shared label only where the text differs
const pick = (own: Translator, ownKey: string, shared: Translator, key: string) =>
    own.has(ownKey) ? own(ownKey) : shared(key);

// `flags.*` owners live in abilityEditor, the other owners in abilityRegistry
const ownerTranslator = (tr: Translator, te: Translator, owner: string) =>
    owner.startsWith('flags.') ? te : tr;

export const fieldLabel = (
    tr: Translator,
    te: Translator,
    owner: string,
    name: string
) =>
    pick(
        ownerTranslator(tr, te, owner),
        `${owner}.fields.${name}`,
        te,
        `fields.${name}`
    );

export const optionLabel = (
    tr: Translator,
    te: Translator,
    owner: string,
    field: string,
    value: string
) =>
    pick(
        ownerTranslator(tr, te, owner),
        `${owner}.${optionSetKey(field)}.${value}`,
        tr,
        `${optionSetKey(field)}.${value}`
    );

export function localizeField(
    tr: Translator,
    te: Translator,
    owner: string,
    meta: FieldMeta | LocalizedFieldMeta
): LocalizedFieldMeta {
    return {
        ...meta,
        label: fieldLabel(tr, te, owner, meta.name),
        options: meta.options?.map((o) => ({
            value: o.value,
            label: optionLabel(tr, te, owner, meta.name, o.value),
            ...(meta.name === 'condition' && {
                group: te(
                    `optionGroups.${allConditionKeys().includes(o.value) ? 'conditionsStandard' : 'mechanicalConditions'}`
                ),
            }),
        })),
    };
}
