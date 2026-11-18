import { array, str } from '../shared';
import type { SpellCast } from '../spell-cast';
import {
    IMMOBILIZING,
    MOVE_TRIGGER,
    SELF_CONDITION,
    SHAPE_TEXT,
    SIGNAL_TEXT,
    TARGET_CONDITION,
} from './patterns';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import type { Translator } from '@/lib/i18n/translator';
import { allConditionKeys } from '@/lib/utils/rules/systems/lookup';
import { type SpellFacts } from '@/lib/utils/spells/derive/mechanics';

export const tags = (raw: string, name: string): string[] => [
    ...new Set(
        [...raw.matchAll(new RegExp(`\\{@${name} ([^}|]*)`, 'g'))].map((m) =>
            m[1].trim()
        )
    ),
];

const strings = (v: unknown): string[] => array(v).map(str).filter(Boolean);

const isCondition = (c: string): boolean => allConditionKeys().includes(c);

export type CustomKeys = ReadonlyMap<string, string>;

type DerivedCondition = NonNullable<SpellFacts['condition']>;

const resolveCondition = (
    c: string,
    custom: CustomKeys
): DerivedCondition | null =>
    isCondition(c)
        ? c
        : ((custom.get(c) as DerivedCondition | undefined) ?? null);

export function conditionOf(
    row: Record<string, unknown>,
    raw: string,
    text: string,
    hasSave: boolean,
    custom: CustomKeys
): { condition: DerivedCondition | null; beneficial: boolean } {
    const inflicted = strings(row.conditionInflict).map((c) => c.toLowerCase());

    const only =
        inflicted.length === 1 ? resolveCondition(inflicted[0], custom) : null;

    if (only) return { condition: only, beneficial: false };

    const self = SELF_CONDITION.exec(raw)?.[1]?.toLowerCase();

    const selfCondition = self ? resolveCondition(self, custom) : null;

    if (selfCondition) return { condition: selfCondition, beneficial: true };

    if (hasSave && IMMOBILIZING.test(text))
        return { condition: 'immobilized', beneficial: false };

    const target = hasSave
        ? TARGET_CONDITION.exec(raw)?.[1]?.toLowerCase()
        : undefined;

    return {
        condition: target ? resolveCondition(target, custom) : null,
        beneficial: false,
    };
}

export function shape(
    text: string,
    cast: SpellCast
): Pick<SpellFacts, 'shape_type' | 'shape_size'> {
    if (cast.facts.shape_type)
        return {
            shape_type: cast.facts.shape_type,
            shape_size: cast.facts.shape_size,
        };

    const m = SHAPE_TEXT.exec(text);

    if (!m) return { shape_type: null, shape_size: null };

    if (m[2])
        return {
            shape_type:
                m[2].toLowerCase() === 'cylinder'
                    ? 'sphere'
                    : m[2].toLowerCase(),
            shape_size: Number(m[1]),
        };

    return { shape_type: 'line', shape_size: Number(m[3] ?? m[4] ?? m[5]) };
}

export interface SpellInput {
    t: Translator;
    row: Record<string, unknown>;
    text: string;
    higher: string;
    cast: SpellCast;
    raw: string;
    misc: string[];
    damageTypes: string[];
    ability: string | null;
    spellAttack: boolean;
    moveTrigger: boolean;
    triggerText: string;
    unknownConditions: string[];
    signals: boolean;
    rowCombat: boolean;
    customConditions: CustomKeys;
}

export const RESIST_KEYS = ['damageImmune', 'damageResist', 'damageVulnerable'];

export const hasAny = (row: Record<string, unknown>, keys: string[]) =>
    keys.some((k) => array(row[k]).length > 0);

export function readSpellInput(
    row: Record<string, unknown>,
    text: string,
    higher: string,
    cast: SpellCast,
    t: Translator,
    customConditions: CustomKeys
): SpellInput {
    const raw = JSON.stringify(row.entries ?? []);

    const damageTypes = strings(row.damageInflict);

    const ability =
        strings(row.savingThrow).find((a) =>
            (ABILITY_KEYS as readonly string[]).includes(a)
        ) ?? null;

    const spellAttack = array(row.spellAttack).length > 0;

    let moveTrigger = false;

    const triggerText = text
        .replace(/[^.]*repeat the saving throw[^.]*\./gi, '')
        .replace(MOVE_TRIGGER, (clause) => {
            if (/damage|saving throw|\bcondition\b/i.test(clause))
                return clause;

            moveTrigger = true;

            return '';
        });

    const unknownConditions = [
        ...tags(raw, 'condition'),
        ...strings(row.conditionInflict),
    ]
        .map((c) => c.toLowerCase())
        .filter((c) => !resolveCondition(c, customConditions));

    const rowCombat =
        damageTypes.length > 0 ||
        spellAttack ||
        strings(row.conditionInflict).length > 0 ||
        hasAny(row, [...RESIST_KEYS, 'conditionImmune']);

    const signals = hasSignals(rowCombat, ability, text, raw);

    return {
        t,
        row,
        text,
        higher,
        cast,
        raw,
        misc: strings(row.miscTags),
        damageTypes,
        ability,
        spellAttack,
        moveTrigger,
        triggerText,
        unknownConditions,
        signals,
        rowCombat,
        customConditions,
    };
}

export const hasSignals = (
    rowCombat: boolean,
    ability: string | null,
    t: string,
    r: string
) =>
    rowCombat ||
    ability !== null ||
    tags(r, 'damage').length > 0 ||
    tags(r, 'condition').length > 0 ||
    SIGNAL_TEXT.test(t);
