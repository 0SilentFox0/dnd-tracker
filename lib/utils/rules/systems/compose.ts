import {
    type Composition,
    composition,
    type CompositionIssue,
    kindOf,
    moduleMetaOf,
    type SystemSelection,
    unknownIds,
} from './catalog';
import { SYSTEM_META, type SystemMeta } from './meta';
import type { RuleSystemDefinition } from './types';

type Metas = readonly SystemMeta[];

export class CompositionError extends Error {}

export function compositionOrder(
    base: string,
    modules: readonly string[],
    metas: Metas = SYSTEM_META
): string[] {
    const active = new Set(modules);

    const before = new Map<string, Set<string>>();

    for (const id of active) {
        const meta = moduleMetaOf(id, metas);

        const deps = [...(meta?.requires ?? []), ...(meta?.after ?? [])].filter(
            (d) => d !== base && active.has(d)
        );

        before.set(id, new Set(deps));
    }

    const order: string[] = [];

    const pending = new Set(active);

    while (pending.size > 0) {
        const ready = [...pending]
            .filter((id) =>
                [...(before.get(id) ?? [])].every((d) => !pending.has(d))
            )
            .sort();

        if (ready.length === 0)
            throw new CompositionError(
                `Module dependency cycle: ${[...pending].sort().join(', ')}`
            );

        order.push(ready[0]);
        pending.delete(ready[0]);
    }

    return order;
}

export function validateComposition(
    system: SystemSelection,
    metas: Metas = SYSTEM_META
): CompositionIssue[] {
    const unknown = unknownIds(system, metas);

    if (unknown.length > 0) return unknown;

    const { base, modules }: Composition = composition(system, metas);

    const activeIds = new Set([base, ...modules]);

    const issues: CompositionIssue[] = [];

    const claimants = new Map<string, string[]>();

    const conflictPairs = new Set<string>();

    for (const id of modules) {
        const meta = moduleMetaOf(id, metas);

        if (!meta) continue;

        const bases = (meta.requires ?? []).filter((r) => {
            const required = moduleMetaOf(r, metas);

            return !!required && kindOf(required) === 'base';
        });

        if (bases.length > 0 && !bases.includes(base))
            issues.push({ code: 'wrongBase', module: id, detail: base });

        for (const req of meta.requires ?? []) {
            if (!activeIds.has(req) && !bases.includes(req))
                issues.push({
                    code: 'missingRequires',
                    module: id,
                    detail: req,
                });
        }

        for (const other of meta.conflicts ?? []) {
            const pair = [id, other].sort().join('|');

            if (activeIds.has(other) && !conflictPairs.has(pair)) {
                conflictPairs.add(pair);
                issues.push({ code: 'conflict', module: id, detail: other });
            }
        }

        for (const slot of meta.claims ?? [])
            claimants.set(slot, [...(claimants.get(slot) ?? []), id]);
    }

    for (const [slot, ids] of claimants)
        if (ids.length > 1)
            issues.push({
                code: 'duplicateClaim',
                module: slot,
                detail: ids.sort().join(','),
            });

    for (const [slot, ids] of claimants) {
        for (const [inner, innerIds] of claimants) {
            if (!inner.startsWith(`${slot}.`)) continue;

            const owners = [...new Set([...ids, ...innerIds])];

            if (owners.length > 1)
                issues.push({
                    code: 'duplicateClaim',
                    module: slot,
                    detail: owners.sort().join(','),
                });
        }
    }

    try {
        compositionOrder(base, modules, metas);
    } catch {
        issues.push({ code: 'cycle' });
    }

    return issues;
}

export type DeepPartial<T> = T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly U[]
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

export type AddonBuilder<T> = (prev: T) => DeepPartial<T>;

export interface Addon<T> {
    id: string;
    claims?: readonly string[];
    build: AddonBuilder<T>;
}

export interface FieldKinds {
    /** Whole objects replaced only through `claims` */
    groups?: readonly string[];
    /** Objects where a shared key is a collision */
    dictionaries?: readonly string[];
}

export const defineAddon = <T = RuleSystemDefinition>(
    build: AddonBuilder<T>
): AddonBuilder<T> => build;

export const SYSTEM_FIELD_KINDS: FieldKinds = {
    groups: ['magic', 'conditions'],
};

const isPlain = (v: unknown): v is Record<string, unknown> => {
    if (typeof v !== 'object' || v === null || '$$typeof' in v) return false;

    const proto = Object.getPrototypeOf(v);

    return proto === Object.prototype || proto === null;
};

const claimed = (claims: readonly string[], path: string): boolean =>
    claims.some((c) => c === path || path.startsWith(`${c}.`));

function merge(
    prev: Record<string, unknown>,
    part: Record<string, unknown>,
    path: string,
    ctx: { id: string; claims: readonly string[]; kinds: FieldKinds }
): Record<string, unknown> {
    const out = { ...prev };

    for (const [key, value] of Object.entries(part)) {
        if (value === undefined) continue;

        const at = path ? `${path}.${key}` : key;

        const current = prev[key];

        if (value === current) continue;

        if (current === undefined) out[key] = value;
        else if (Array.isArray(current) && Array.isArray(value))
            out[key] = [...current, ...value];
        else if (
            isPlain(current) &&
            isPlain(value) &&
            !ctx.kinds.groups?.includes(at)
        ) {
            if (ctx.kinds.dictionaries?.includes(at)) {
                const clash = Object.keys(value).find((k) =>
                    Object.hasOwn(current, k)
                );

                if (clash)
                    throw new CompositionError(
                        `${ctx.id}: duplicate key "${clash}" in ${at}`
                    );

                out[key] = { ...current, ...value };
            } else out[key] = merge(current, value, at, ctx);
        } else if (value !== current) {
            if (!claimed(ctx.claims, at))
                throw new CompositionError(
                    `${ctx.id}: replaces ${at} without a claim`
                );

            out[key] = value;
        }
    }

    return out;
}

export function composeParts<T extends object>(
    base: T,
    addons: readonly Addon<T>[],
    kinds: FieldKinds = {}
): T {
    let acc = base;

    for (const addon of addons) {
        const part = addon.build(acc);

        acc = merge(
            acc as Record<string, unknown>,
            part as Record<string, unknown>,
            '',
            { id: addon.id, claims: addon.claims ?? [], kinds }
        ) as T;
    }

    return acc;
}

export const composeSystem = (
    base: RuleSystemDefinition,
    addons: readonly Addon<RuleSystemDefinition>[]
): RuleSystemDefinition => composeParts(base, addons, SYSTEM_FIELD_KINDS);

export const extendSystem = (
    base: RuleSystemDefinition,
    build: AddonBuilder<RuleSystemDefinition>
): RuleSystemDefinition => composeSystem(base, [{ id: 'extension', build }]);

export const compositionKey = (system: SystemSelection): string => {
    const { base, modules } = composition(system);

    return `${system.key}:${base}+${modules.join(',')}`;
};

export function composeCached<T>(
    cache: Map<string, T>,
    system: SystemSelection,
    make: (c: Composition) => T
): T {
    const key = compositionKey(system);

    const hit = cache.get(key);

    if (hit) return hit;

    const made = make(composition(system));

    cache.set(key, made);

    return made;
}
