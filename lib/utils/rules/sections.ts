import type { z } from 'zod';

import { isRecord } from '@/lib/utils/common/is-record';
import { type Composition } from '@/lib/utils/rules/systems/catalog';
import {
    CompositionError,
    compositionOrder,
} from '@/lib/utils/rules/systems/compose';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

export interface RulesItem<T = unknown> {
    schema: z.ZodType<T>;
    default: T;
    /** Old value of another shape → the current one; `undefined` means "cannot read it" */
    upgrade?(legacy: unknown): T | undefined;
}

export interface RulesSection {
    /** Module id or "core" */
    owner: string;
    items: Record<string, RulesItem>;
    /** Must tolerate missing items: it also runs on patches */
    refine?(value: Record<string, unknown>): boolean;
    refineMessage?: string;
    mechanic: boolean;
    playerHidden?: true;
}

export type SectionMap = Record<string, RulesSection>;

export interface SectionsContribution {
    sections?: SectionMap;
    /** Items a module adds to a section owned by another module */
    extend?: Record<string, Record<string, RulesItem>>;
}

export const extendSection = (
    section: RulesSection,
    items: Record<string, RulesItem>,
    by?: string
): RulesSection => {
    const clash = Object.keys(items).find((k) =>
        Object.hasOwn(section.items, k)
    );

    if (clash)
        throw new CompositionError(
            `${by ?? 'extension'}: path ${clash} is already in a section owned by ${section.owner}`
        );

    return { ...section, items: { ...section.items, ...items } };
};

type Metas = readonly SystemMeta[];

export function mergeContributions(
    order: readonly {
        id: string;
        contribution: SectionsContribution | undefined;
    }[]
): SectionMap {
    const out: SectionMap = {};

    const extensions: {
        id: string;
        section: string;
        items: Record<string, RulesItem>;
    }[] = [];

    for (const { id, contribution } of order) {
        for (const [name, section] of Object.entries(
            contribution?.sections ?? {}
        )) {
            if (Object.hasOwn(out, name))
                throw new CompositionError(
                    `${id}: section "${name}" is already owned by ${out[name].owner}`
                );

            out[name] = section;
        }

        for (const [section, items] of Object.entries(
            contribution?.extend ?? {}
        ))
            extensions.push({ id, section, items });
    }

    for (const { id, section, items } of extensions) {
        if (!Object.hasOwn(out, section))
            throw new CompositionError(
                `${id}: extends missing section "${section}"`
            );

        out[section] = extendSection(out[section], items, id);
    }

    return out;
}

const caches = new WeakMap<object, Map<string, SectionMap>>();

export function sectionsOf(
    composition: Composition,
    contributions: Readonly<Record<string, SectionsContribution>>,
    core: SectionsContribution,
    metas: Metas = SYSTEM_META
): SectionMap {
    const cacheable = metas === SYSTEM_META;

    const key = `${composition.base}+${composition.modules.join(',')}`;

    const cache = caches.get(contributions) ?? new Map<string, SectionMap>();

    caches.set(contributions, cache);

    const hit = cacheable ? cache.get(key) : undefined;

    if (hit) return hit;

    const ids = [
        composition.base,
        ...compositionOrder(composition.base, composition.modules, metas),
    ];

    const sections = mergeContributions([
        { id: 'core', contribution: core },
        ...ids.map((id) => ({ id, contribution: contributions[id] })),
    ]);

    if (cacheable) cache.set(key, sections);

    return sections;
}

export const rulePaths = (sections: SectionMap): string[] =>
    Object.entries(sections).flatMap(([name, section]) =>
        Object.keys(section.items).map((item) => `${name}.${item}`)
    );

const splitPath = (path: string): string[] => path.split('.');

export function getRule(rules: unknown, path: string): unknown {
    let at: unknown = rules;

    for (const part of splitPath(path)) {
        if (!isRecord(at)) return undefined;

        at = at[part];
    }

    return at;
}

export function setRule<T extends Record<string, unknown>>(
    patch: T,
    path: string,
    value: unknown
): T {
    const walk = (node: unknown, parts: string[]): Record<string, unknown> => {
        const base = isRecord(node) ? node : {};

        const [head, ...rest] = parts;

        return {
            ...base,
            [head]: rest.length === 0 ? value : walk(base[head], rest),
        };
    };

    return walk(patch, splitPath(path)) as T;
}

/** Items of a legacy strict-object section, with defaults taken from DEFAULT_RULES */
export function itemsFromShape(
    shape: Record<string, z.ZodType>,
    defaults: Record<string, unknown>,
    keys: readonly string[] = Object.keys(shape)
): Record<string, RulesItem> {
    return Object.fromEntries(
        keys.map((key) => [
            key,
            { schema: shape[key], default: defaults[key] } satisfies RulesItem,
        ])
    );
}

export function parseSection(
    section: RulesSection,
    raw: unknown
): Record<string, unknown> {
    const obj = isRecord(raw) ? raw : {};

    const defaults = defaultsOf(section);

    const out: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(section.items)) {
        const value = parseItem(item, obj[key]);

        if (value !== undefined) out[key] = value;
    }

    return section.refine && !section.refine(out) ? defaults : out;
}

export function parseItem(item: RulesItem, raw: unknown): unknown {
    const parsed = item.schema.safeParse(raw);

    if (parsed.success) return parsed.data;

    const upgraded = item.upgrade?.(raw);

    if (upgraded !== undefined) {
        const again = item.schema.safeParse(upgraded);

        if (again.success) return again.data;
    }

    return item.default;
}

export function defaultsOf(section: RulesSection): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(section.items)
            .filter(([, item]) => item.default !== undefined)
            .map(([key, item]) => [key, item.default])
    );
}
