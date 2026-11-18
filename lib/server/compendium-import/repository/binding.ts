import { matchCampaignRows, pendingRefs } from '../auto-bind';
import { buildDependencyClosure } from '../dependencies';
import { digest } from '../identity';
import type { ExistingEntry } from '../plan';
import type { DependencyChoice, ImportRepository } from '../service';
import type { TargetKind } from '../types';
import {
    addOfficialTemplateChoices,
    loadNames,
    loadRows,
    loadTemplateSnapshots,
    nativeBody,
} from './load';

import 'server-only';
import { prisma } from '@/lib/db';
import { asRecord } from '@/lib/utils/common/json';
import {
    CompendiumError,
    type JsonRecord,
} from '@/lib/utils/compendium-import/parse';

const entryRefKey = (kind: string, id: string) => `${kind}:${id}`;

export const sourceFields = new Set([
    'json',
    'abbreviation',
    'full',
    'authors',
    'convertedBy',
    'version',
    'dateReleased',
    'url',
    'color',
    'partnered',
]);

type LoadContextInput = Parameters<ImportRepository['loadContext']>[1];
type Provenance = Awaited<ReturnType<typeof loadProvenance>>;
type BoundEntry = (
    key: string,
    kind: TargetKind,
    localId: string,
    raw: JsonRecord
) => ExistingEntry;

export const loadProvenance = (campaignId: string) =>
    prisma.compendiumEntry.findMany({
        where: { campaignId },
        orderBy: { canonicalKey: 'asc' },
        select: {
            canonicalKey: true,
            kind: true,
            localId: true,
            edition: true,
            baseline: true,
            bindings: true,
        },
    });

export const bindingRefs = (entry: Provenance[number]) =>
    Object.values(asRecord(entry.bindings))
        .map(asRecord)
        .filter((b) => typeof b.kind === 'string' && typeof b.id === 'string')
        .map((b) => ({
            kind: b.kind as TargetKind,
            id: b.id as string,
        }));

export function existingEntriesOf(
    provenance: Provenance,
    rows: Awaited<ReturnType<typeof loadRows>>
): ExistingEntry[] {
    return provenance.map((entry) => {
        const raw = rows.get(entry.kind as TargetKind)?.get(entry.localId);

        return {
            key: entry.canonicalKey,
            kind: entry.kind as TargetKind,
            edition: entry.edition as 'classic' | 'one' | 'unknown',
            localId: entry.localId,
            baseline: asRecord(entry.baseline),
            body: raw ? nativeBody(entry.kind as TargetKind, raw) : {},
            missing: !raw,
        };
    });
}

export function boundEntryFactory(existing: ExistingEntry[]): BoundEntry {
    const existingByRef = new Map(
        existing.map((e) => [entryRefKey(e.kind ?? '', e.localId), e] as const)
    );

    return (key, kind, localId, raw) => {
        const body = nativeBody(kind, raw);

        const found = existingByRef.get(entryRefKey(kind, localId));

        return {
            ...found,
            key: found?.key ?? key,
            kind,
            localId,
            body,
            baseline: body,
        };
    };
}

export function explicitBindings(
    provenance: Provenance,
    input: LoadContextInput,
    rows: Awaited<ReturnType<typeof loadRows>>,
    boundEntry: BoundEntry
) {
    const bindings: Record<string, ExistingEntry> = Object.create(null);

    for (const entry of provenance)
        for (const [key, rawBinding] of Object.entries(
            asRecord(entry.bindings)
        )) {
            const binding = asRecord(rawBinding);

            if (
                typeof binding.kind !== 'string' ||
                typeof binding.id !== 'string'
            )
                continue;

            const kind = binding.kind as TargetKind;

            const raw = rows.get(kind)?.get(binding.id);

            if (!raw) continue;

            bindings[key] = boundEntry(key, kind, binding.id, raw);
        }

    for (const [key, binding] of Object.entries(input.bindings ?? {})) {
        const raw = rows.get(binding.kind)?.get(binding.id);

        if (!raw) throw new CompendiumError('BINDING_WRONG_CAMPAIGN', key);

        bindings[key] = boundEntry(key, binding.kind, binding.id, raw);
    }

    return bindings;
}

export async function autoBindDependencies(args: {
    campaignId: string;
    input: LoadContextInput;
    adaptedEntries: Parameters<typeof pendingRefs>[0];
    provenance: Provenance;
    existing: ExistingEntry[];
    occupiedNames: Awaited<ReturnType<typeof loadNames>>;
    bindings: Record<string, ExistingEntry>;
    boundEntry: BoundEntry;
}) {
    const {
        campaignId,
        input,
        adaptedEntries,
        provenance,
        existing,
        occupiedNames,
        bindings,
        boundEntry,
    } = args;

    const explicit = new Set((input.dependencies ?? []).map((d) => d.refKey));

    const pending = pendingRefs(
        adaptedEntries.filter((e) => !input.excludedKeys?.includes(e.key)),
        (key) =>
            key in bindings ||
            explicit.has(key) ||
            existing.some((e) => e.key === key)
    );

    const imported = new Set(provenance.map((e) => `${e.kind}:${e.localId}`));

    const matched = matchCampaignRows(pending, occupiedNames, (kind, id) =>
        imported.has(`${kind}:${id}`)
    );

    const autoRows = await loadRows(
        campaignId,
        matched.map((m) => ({ kind: m.kind, id: m.row.id }))
    );

    for (const m of matched) {
        const raw = autoRows.get(m.kind)?.get(m.row.id);

        if (raw) bindings[m.key] = boundEntry(m.key, m.kind, m.row.id, raw);
    }

    const choices: DependencyChoice[] = [...(input.dependencies ?? [])];

    const stillPending = pending.filter((p) => !(p.key in bindings));

    if (stillPending.length)
        await addOfficialTemplateChoices(
            choices,
            stillPending,
            input.allowMixedEdition
        );

    const templates = await loadTemplateSnapshots(choices);

    const dependencies = buildDependencyClosure(
        templates,
        choices,
        input.allowMixedEdition
    );

    for (const [refKey, key] of Object.entries(dependencies.aliases)) {
        const entry = dependencies.entries.find((e) => e.key === key)!;

        const localId =
            existing.find((e) => e.key === key && !e.missing)?.localId ??
            `c${digest([campaignId, key]).slice(0, 24)}`;

        bindings[refKey] = {
            key,
            edition: entry.edition,
            kind: entry.kind,
            localId,
            body: entry.body,
            baseline: entry.body,
        };
    }

    return dependencies.entries;
}
