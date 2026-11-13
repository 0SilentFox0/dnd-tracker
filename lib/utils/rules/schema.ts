import { z } from 'zod';

import { DEFAULT_RULES } from './defaults';
import { ALL_SECTIONS, systemIssues } from './section-registry';
import {
    CRITICALS_ORDER_MESSAGE,
    INITIATIVE_ORDER_MESSAGE,
    type Ruleset,
    sectionSchemas,
    UNKNOWN_SYSTEM_MESSAGE,
} from './section-shapes';
import {
    defaultsOf,
    parseSection,
    type RulesSection,
    type SectionMap,
} from './sections';

import { CUSTOM_CONDITION_KEY_RE } from '@/lib/utils/abilities/schema/kinds';
import { isRecord } from '@/lib/utils/common/is-record';
import { MODULE_ID_RE, moduleCatalog } from '@/lib/utils/rules/systems/catalog';
import { validateComposition } from '@/lib/utils/rules/systems/compose';

export type { Ruleset };

const UNKNOWN_MODULE_MESSAGE = 'rules.validation.unknownModule';

const INVALID_COMPOSITION_MESSAGE = 'rules.validation.invalidComposition';

type Optional<F extends z.ZodType> = undefined extends z.output<F> ? F : never;

type WithDefaults<S extends Record<string, z.ZodType>> = {
    [K in keyof S]: S[K] extends Optional<S[K]> ? S[K] : z.ZodDefault<S[K]>;
};

function withDefaults<S extends Record<string, z.ZodType>>(
    section: z.ZodObject<S>,
    defaults: {
        [K in keyof S as S[K] extends Optional<S[K]>
            ? never
            : K]: z.core.util.NoUndefined<z.output<S[K]>>;
    }
) {
    const fields = Object.entries(section.shape) as [keyof S, S[keyof S]][];

    const shape = Object.fromEntries(
        fields.map(([key, field]) => [
            key,
            key in defaults
                ? field.default(
                      (defaults as unknown as Record<keyof S, never>)[key]
                  )
                : field,
        ])
    ) as WithDefaults<S>;

    return z.strictObject(shape);
}

const sections = {
    morale: withDefaults(sectionSchemas.morale, DEFAULT_RULES.morale),
    criticals: withDefaults(sectionSchemas.criticals, DEFAULT_RULES.criticals),
    formulas: withDefaults(sectionSchemas.formulas, DEFAULT_RULES.formulas),
    heroScaling: withDefaults(
        sectionSchemas.heroScaling,
        DEFAULT_RULES.heroScaling
    ),
    initiative: withDefaults(
        sectionSchemas.initiative,
        DEFAULT_RULES.initiative
    ),
    defaultAttacks: withDefaults(
        sectionSchemas.defaultAttacks,
        DEFAULT_RULES.defaultAttacks
    ),
    saves: withDefaults(sectionSchemas.saves, DEFAULT_RULES.saves),
    deathSaves: withDefaults(
        sectionSchemas.deathSaves,
        DEFAULT_RULES.deathSaves
    ),
    concentration: withDefaults(
        sectionSchemas.concentration,
        DEFAULT_RULES.concentration
    ),
    conditions: withDefaults(
        sectionSchemas.conditions,
        DEFAULT_RULES.conditions
    ),
    actions: withDefaults(sectionSchemas.actions, DEFAULT_RULES.actions),
    classes: withDefaults(sectionSchemas.classes, DEFAULT_RULES.classes),
    outOfCombat: withDefaults(
        sectionSchemas.outOfCombat,
        DEFAULT_RULES.outOfCombat
    ),
    encounters: withDefaults(
        sectionSchemas.encounters,
        DEFAULT_RULES.encounters
    ),
    items: withDefaults(sectionSchemas.items, DEFAULT_RULES.items),
    spellIngredients: withDefaults(
        sectionSchemas.spellIngredients,
        DEFAULT_RULES.spellIngredients
    ),
    advancement: withDefaults(
        sectionSchemas.advancement,
        defaultsOf(ALL_SECTIONS.advancement) as Ruleset['advancement']
    ),
    tables: withDefaults(sectionSchemas.tables, DEFAULT_RULES.tables),
};

const criticalsOrdered = (v: { critOn: number; fumbleOn: number }) =>
    v.fumbleOn < v.critOn;

const initiativeOrdered = (v: { heroMin?: number; heroMax?: number }) =>
    v.heroMin === undefined ||
    v.heroMax === undefined ||
    v.heroMin <= v.heroMax;

export const RulesetSchema = z
    .object({
        morale: sections.morale.prefault({}),
        criticals: sections.criticals.prefault({}),
        formulas: sections.formulas.prefault({}),
        heroScaling: sections.heroScaling.prefault({}),
        initiative: sections.initiative.prefault({}),
        defaultAttacks: sections.defaultAttacks.prefault({}),
        saves: sections.saves.prefault({}),
        deathSaves: sections.deathSaves.prefault({}),
        concentration: sections.concentration.prefault({}),
        conditions: sections.conditions.prefault({}),
        actions: sections.actions.prefault({}),
        classes: sections.classes.prefault({}),
        outOfCombat: sections.outOfCombat.prefault({}),
        encounters: sections.encounters.prefault({}),
        items: sections.items.prefault({}),
        spellIngredients: sections.spellIngredients.prefault({}),
        advancement: sections.advancement.prefault({}),
        tables: sections.tables.prefault({}),
        system: sectionSchemas.system,
    })
    .refine((r) => initiativeOrdered(r.initiative), {
        message: INITIATIVE_ORDER_MESSAGE,
        path: ['initiative'],
    })
    .refine((r) => criticalsOrdered(r.criticals), {
        message: CRITICALS_ORDER_MESSAGE,
        path: ['criticals'],
    })
    .superRefine((r, ctx) => {
        for (const issue of systemIssues(r.system)) {
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

    if (sections.conditions?.items.custom)
        shape.removeCustomConditions = z
            .array(z.string().regex(CUSTOM_CONDITION_KEY_RE))
            .min(1)
            .max(50)
            .optional();

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
        removedCustom: boolean;
        keyChanged: boolean;
        patchHasModules: boolean;
    }
): Record<string, unknown> {
    const stored: Record<string, unknown> = isRecord(raw) ? { ...raw } : {};

    for (const [name, body] of Object.entries(patch)) {
        if (!isRecord(body)) continue;

        const section = isRecord(stored[name]) ? { ...stored[name] } : {};

        for (const key of Object.keys(body)) {
            const value = next[name]?.[key];

            if (value === undefined || (name === 'tables' && value === null))
                delete section[key];
            else section[key] = value;
        }

        stored[name] = section;
    }

    if (opts.removedCustom)
        stored.conditions = {
            ...(isRecord(stored.conditions) ? stored.conditions : {}),
            custom: next.conditions?.custom,
        };

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
    const removed = new Set(patch.removeCustomConditions ?? []);

    const sections = patch as Record<
        string,
        Record<string, unknown> | undefined
    >;

    const conflict = (
        Array.isArray(sections.conditions?.custom)
            ? (sections.conditions.custom as unknown[])
            : []
    ).find((c) => isRecord(c) && removed.has(String(c.key)));

    if (conflict)
        return {
            ok: false,
            issues: [
                {
                    code: 'custom',
                    message: 'validation.rulesCustomConflict',
                    path: ['removeCustomConditions'],
                    input: patch.removeCustomConditions,
                },
            ],
        };

    const next = Object.fromEntries(
        (Object.keys(current) as (keyof Ruleset)[]).map((k) => [
            k,
            { ...current[k], ...(sections[k] ?? {}) },
        ])
    );

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

    if (isRecord(sections.tables))
        next.tables = Object.fromEntries(
            Object.entries(next.tables).filter(([, rows]) => rows !== null)
        );

    const groupPatch = sections.encounters?.unitGroups;

    if (isRecord(groupPatch)) {
        const unitGroups = { ...current.encounters.unitGroups };

        for (const [key, appearance] of Object.entries(groupPatch)) {
            if (isRecord(appearance))
                unitGroups[key] = { ...unitGroups[key], ...appearance };
        }

        next.encounters = { ...next.encounters, unitGroups };
    }

    const patchedCustom = sections.conditions?.custom;

    if (Array.isArray(patchedCustom)) {
        const keyOf = (c: unknown) => (isRecord(c) ? c.key : undefined);

        const incoming = new Set(patchedCustom.map(keyOf));

        next.conditions = {
            ...next.conditions,
            custom: [
                ...(current.conditions.custom ?? []).filter(
                    (c) => !incoming.has(c.key)
                ),
                ...patchedCustom,
            ],
        };
    }

    if (removed.size)
        next.conditions = {
            ...next.conditions,
            custom: (
                (next.conditions as Ruleset['conditions']).custom ?? []
            ).filter((c) => !removed.has(c.key)),
        };

    const parsed = RulesetSchema.safeParse(next);

    if (!parsed.success) return { ok: false, issues: parsed.error.issues };

    if (raw === undefined) return { ok: true, rules: parsed.data };

    return {
        ok: true,
        rules: parsed.data,
        stored: writeOverRaw(
            raw,
            next as Record<string, Record<string, unknown>>,
            patch as Record<string, unknown>,
            {
                removedCustom: removed.size > 0,
                keyChanged,
                patchHasModules: !!patchModules,
            }
        ),
    };
}
