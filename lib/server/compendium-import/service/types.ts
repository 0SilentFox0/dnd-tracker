import { z } from 'zod';

import { type MediaReportState } from '../media/queue';
import { type PlanContext, type PlannedWrite } from '../plan';
import {
    type AdaptedEntry,
    type AdaptOptions,
    type ImportIssue,
    TARGET_KINDS,
    type TargetKind,
} from '../types';

import type { Actor } from '@/lib/utils/api/actor';
import {
    COMPENDIUM_LIMITS,
    CompendiumError,
    type JsonRecord,
} from '@/lib/utils/compendium-import/parse';
import { RulesetPatchSchema } from '@/lib/utils/rules/schema';

const CLASSES_SECTION = 'classes';

export const CLASSES_RULE_PATH = `rules.${CLASSES_SECTION}`;

export interface DependencyChoice {
    refKey: string;
    templateId: string;
    kind: TargetKind;
    localId: string;
    edition: 'classic' | 'one' | 'unknown';
}
export interface ImportInput extends AdaptOptions {
    json: string;
    bindings?: Record<string, { kind: TargetKind; id: string }>;
    overwriteKeys?: string[];
    excludedKeys?: string[];
    dependencies?: DependencyChoice[];
    allowMixedEdition?: boolean;
    rulesPatch?: JsonRecord;
}

const targetKind = z.enum(TARGET_KINDS);

const safeKey = z
    .string()
    .max(2000)
    .refine((s) => !['__proto__', 'constructor', 'prototype'].includes(s));

const boundedRecord = <T extends z.ZodType>(schema: T) =>
    z.record(safeKey, schema).refine((v) => Object.keys(v).length <= 2000);

export const ImportInputSchema = z.strictObject({
    json: z.string().max(COMPENDIUM_LIMITS.bytes),
    categories: z.array(z.string().min(1).max(100)).max(100).optional(),
    sourceBindings: boundedRecord(z.string().min(1).max(128)).optional(),
    bindings: boundedRecord(
        z.strictObject({ kind: targetKind, id: z.string().min(1).max(100) })
    ).optional(),
    overwriteKeys: z.array(safeKey).max(2000).optional(),
    excludedKeys: z.array(safeKey).max(2000).optional(),
    excludedPaths: z
        .array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*\[\d+\]$/))
        .max(2000)
        .optional(),
    dependencies: z
        .array(
            z.strictObject({
                refKey: safeKey,
                templateId: z.string().min(1).max(100),
                kind: targetKind,
                localId: z.string().min(1).max(100),
                edition: z.enum(['classic', 'one', 'unknown']),
            })
        )
        .max(2000)
        .optional(),
    allowMixedEdition: z.boolean().optional(),
    rulesPatch: RulesetPatchSchema.optional(),
});

export function validatedInput(input: ImportInput): ImportInput {
    const parsed = ImportInputSchema.safeParse(input);

    if (!parsed.success) throw new CompendiumError('INVALID_INPUT');

    return parsed.data;
}

export interface CompendiumReport {
    adapterVersion: string;
    runId?: string;
    counts: {
        created: number;
        updated: number;
        unchanged: number;
        errors: number;
    };
    rows: Array<{
        canonicalKey: string;
        kind: TargetKind;
        targetId: string;
        status: string;
        coverage: 'native' | 'partial' | 'manual';
        issues: ImportIssue[];
    }>;
    nextActions: ImportIssue[];
    recommendedRulesPatch?: JsonRecord;
    readyToImport: boolean;
    readyToPlay: boolean;
    sources: JsonRecord[];
    editionSummary: Record<string, number>;
    countsByCategory: Record<
        string,
        { present: number; mapped: number; partial: number; skipped: number }
    >;
    issueCounts: Record<string, number>;
    omittedIssues: number;
    media?: MediaReportState;
}
export interface RepositoryContext extends PlanContext {
    extraEntries?: AdaptedEntry[];
    hasCharacters?: boolean;
    classesEnabled?: boolean;
    hasClasses?: boolean;
    customConditionKeys?: string[];
    /** Content kinds of the campaign composition; absent means all of them */
    activeKinds?: ReadonlySet<string>;
}
export interface ImportRepository {
    authorize(actor: Actor): Promise<void>;
    loadContext(
        actor: Actor,
        input: ImportInput,
        entries?: AdaptedEntry[]
    ): Promise<RepositoryContext>;
    findRun(
        actor: Actor,
        key: string
    ): Promise<{ requestHash: string; report: CompendiumReport } | undefined>;
    transaction<T>(
        actor: Actor,
        callback: (repository: ImportRepository) => Promise<T>
    ): Promise<T>;
    write(actor: Actor, row: PlannedWrite): Promise<string>;
    saveEntry(actor: Actor, row: PlannedWrite): Promise<void>;
    saveSources(actor: Actor, sources: JsonRecord[]): Promise<void>;
    saveRun(
        actor: Actor,
        key: string,
        requestHash: string,
        report: CompendiumReport
    ): Promise<void>;
    applyRules?(actor: Actor, patch: JsonRecord): Promise<void>;
}
