import { z } from 'zod';

import { ALL_SECTIONS, systemIssues } from './section-registry';
import {
    type Ruleset,
    sectionSchemas,
    UNKNOWN_SYSTEM_MESSAGE,
} from './section-shapes';
import {
    parseSection,
    RulesMergeError,
    type RulesSection,
    type SectionMap,
} from './sections';

import { isRecord } from '@/lib/utils/common/is-record';
import { MODULE_ID_RE, moduleCatalog } from '@/lib/utils/rules/systems/catalog';
import { validateComposition } from '@/lib/utils/rules/systems/compose';

export type { Ruleset };

const UNKNOWN_MODULE_MESSAGE = 'rules.validation.unknownModule';

const INVALID_COMPOSITION_MESSAGE = 'rules.validation.invalidComposition';

const objectOfSection = (section: RulesSection) =>
    z
        .strictObject(
            Object.fromEntries(
                Object.entries(section.items).map(([key, item]) => [
                    key,
                    item.default === undefined
                        ? item.schema
                        : item.schema.default(item.default as never),
                ])
            )
        )
        .prefault({});

const sectionEntries = Object.entries(ALL_SECTIONS).filter(
    ([name]) => name !== 'system'
);

const rulesetSchema = z
    .object({
        ...Object.fromEntries(
            sectionEntries.map(([name, section]) => [
                name,
                objectOfSection(section),
            ])
        ),
        system: sectionSchemas.system,
    })
    .superRefine((value, ctx) => {
        const r = value as Record<string, Record<string, unknown>>;

        for (const [name, section] of sectionEntries) {
            if (section.refine && !section.refine(r[name]))
                ctx.addIssue({
                    code: 'custom',
                    message:
                        section.refineMessage ?? 'rules.validation.invalidSection',
                    path: [name],
                });
        }

        for (const issue of systemIssues(value.system)) {
            if (issue.code !== 'unknownKey')
                ctx.addIssue({
                    code: 'custom',
                    message:
                        issue.code === 'unknownModule'
                            ? UNKNOWN_MODULE_MESSAGE
                            : INVALID_COMPOSITION_MESSAGE,
                    path: ['system', 'modules'],
                });
        }
    });

/** Built from the section registry, so the static type comes from `Ruleset` */
export const RulesetSchema = rulesetSchema as unknown as z.ZodType<Ruleset>;

const warnedModules = new Set<string>();

function warnDroppedModules(system: {
    key: string;
    modules?: readonly string[];
}) {
    const id = `${system.key}:${(system.modules ?? []).join(',')}`;

    if (warnedModules.has(id)) return;

    warnedModules.add(id);
    console.warn(`rules.system.modules ignored: ${id}`);
}

export class RulesSystemError extends Error {
    readonly messageKey = UNKNOWN_SYSTEM_MESSAGE;

    constructor() {
        super(UNKNOWN_SYSTEM_MESSAGE);
        this.name = 'RulesSystemError';
    }
}

export function parseRules(raw: unknown): Ruleset {
    const obj = isRecord(raw) ? raw : {};

    const system = sectionSchemas.system.safeParse(obj.system);

    if (!system.success) throw new RulesSystemError();

    const rules = Object.fromEntries(
        Object.entries(ALL_SECTIONS)
            .filter(([name]) => name !== 'system')
            .map(([name, section]) => [name, parseSection(section, obj[name])])
    ) as Omit<Ruleset, 'system'>;

    if (validateComposition(system.data).length === 0)
        return { ...rules, system: system.data };

    warnDroppedModules(system.data);

    return { ...rules, system: { key: system.data.key } };
}

export type SafeParsedRules =
    | { ok: true; rules: Ruleset }
    | { ok: false; error: typeof UNKNOWN_SYSTEM_MESSAGE };

export function safeParseRules(raw: unknown): SafeParsedRules {
    try {
        return { ok: true, rules: parseRulesCached(raw) };
    } catch (error) {
        if (error instanceof RulesSystemError)
            return { ok: false, error: UNKNOWN_SYSTEM_MESSAGE };

        throw error;
    }
}

const RULES_CACHE_LIMIT = 50;

const rulesCache = new Map<string, Ruleset>();

export function parseRulesCached(raw: unknown): Ruleset {
    const key = JSON.stringify(raw ?? null);

    const hit = rulesCache.get(key);

    if (hit) {
        rulesCache.delete(key);
        rulesCache.set(key, hit);

        return hit;
    }

    const parsed = parseRules(raw);

    rulesCache.set(key, parsed);

    if (rulesCache.size > RULES_CACHE_LIMIT)
        rulesCache.delete(rulesCache.keys().next().value as string);

    return parsed;
}

type PatchOf<K extends keyof Ruleset> = {
    [F in keyof Ruleset[K]]?: Ruleset[K][F];
};

export type RulesetPatch = Omit<
    { [K in keyof Ruleset]?: PatchOf<K> },
    'system'
> & {
    system?: { key?: string; modules?: string[] };
    removeCustomConditions?: string[];
    confirm?: true;
};

const patchOfSection = (section: RulesSection) => {
    const object = z.strictObject(
        Object.fromEntries(
            Object.entries(section.items).map(([key, item]) => [
                key,
                item.schema.optional(),
            ])
        )
    );

    const { refine } = section;

    return refine
        ? object.refine((value) => refine(value), {
              message:
                  section.refineMessage ?? 'rules.validation.invalidSection',
          })
        : object;
};

export function rulesetPatchSchemaFor(
    sections: SectionMap
): z.ZodType<RulesetPatch> {
    const shape: Record<string, z.ZodType> = Object.fromEntries(
        Object.entries(sections).map(([name, section]) => [
            name,
            patchOfSection(section).optional(),
        ])
    );

    if (sections.system)
        shape.system = z
            .strictObject({
                key: sections.system.items.key.schema.optional(),
                modules: z
                    .array(z.string().regex(MODULE_ID_RE))
                    .max(32)
                    .describe(
                        `Complete list of enabled add-on module ids; allowed: ${moduleCatalog()
                            .addons.map((a) => a.id)
                            .join(', ')}`
                    )
                    .optional(),
            })
            .optional();

    shape.confirm = z.literal(true).optional();

    for (const section of Object.values(sections))
        Object.assign(shape, section.patchExtras);

    return z.strictObject(shape) as unknown as z.ZodType<RulesetPatch>;
}

export const RulesetPatchSchema = rulesetPatchSchemaFor(ALL_SECTIONS);

export type MergeRulesResult =
    | { ok: true; rules: Ruleset; stored?: Record<string, unknown> }
    | { ok: false; issues: z.core.$ZodIssue[] };

type MergePatch = Record<
    string,
    Record<string, unknown> | string[] | true | undefined
> & { removeCustomConditions?: string[]; confirm?: true };

function writeOverRaw(
    raw: unknown,
    next: Record<string, Record<string, unknown>>,
    patch: Record<string, unknown>,
    opts: {
        touched: Record<string, readonly string[]>;
        keyChanged: boolean;
        patchHasModules: boolean;
    }
): Record<string, unknown> {
    const stored: Record<string, unknown> = isRecord(raw) ? { ...raw } : {};

    const names = new Set([
        ...Object.entries(patch)
            .filter(([, body]) => isRecord(body))
            .map(([name]) => name),
        ...Object.keys(opts.touched),
    ]);

    for (const name of names) {
        const body = patch[name];

        const section = isRecord(stored[name]) ? { ...stored[name] } : {};

        const keys = new Set([
            ...(isRecord(body) ? Object.keys(body) : []),
            ...(opts.touched[name] ?? []),
        ]);

        for (const key of keys) {
            const value = next[name]?.[key];

            if (value === undefined) delete section[key];
            else section[key] = value;
        }

        stored[name] = section;
    }

    const system: Record<string, unknown> = {
        ...(isRecord(stored.system) ? stored.system : {}),
        key: next.system.key,
    };

    if (opts.keyChanged && !opts.patchHasModules) delete system.modules;

    stored.system = system;

    return stored;
}

/** `raw` is the stored JSON: with it the result also carries `stored`, the raw JSON with the patch written over it (unknown and inactive sections stay) */
export function mergeRules(
    current: Ruleset,
    patch: MergePatch,
    raw?: unknown
): MergeRulesResult {
    const sections = patch as Record<
        string,
        Record<string, unknown> | undefined
    >;

    const touched: Record<string, readonly string[]> = {};

    let next: Record<string, Record<string, unknown>>;

    try {
        next = Object.fromEntries(
            (Object.keys(current) as (keyof Ruleset)[]).map((k) => {
                const merge = ALL_SECTIONS[k]?.merge;

                if (!merge) return [k, { ...current[k], ...(sections[k] ?? {}) }];

                const merged = merge(
                    current[k] as Record<string, unknown>,
                    sections[k] ?? {},
                    patch
                );

                if (merged.touched?.length) touched[k] = merged.touched;

                return [k, merged.next];
            })
        );
    } catch (e) {
        if (e instanceof RulesMergeError)
            return { ok: false, issues: [e.issue] };

        throw e;
    }

    const newKey = sections.system?.key;

    const keyChanged =
        typeof newKey === 'string' && newKey !== current.system.key;

    const patchModules = Array.isArray(sections.system?.modules)
        ? (sections.system.modules as string[])
        : undefined;

    if (keyChanged)
        next.system = {
            key: newKey,
            ...(patchModules && { modules: patchModules }),
        };

    const parsed = RulesetSchema.safeParse(next);

    if (!parsed.success) return { ok: false, issues: parsed.error.issues };

    if (raw === undefined) return { ok: true, rules: parsed.data };

    return {
        ok: true,
        rules: parsed.data,
        stored: writeOverRaw(
            raw,
            next,
            patch as Record<string, unknown>,
            {
                touched,
                keyChanged,
                patchHasModules: !!patchModules,
            }
        ),
    };
}
