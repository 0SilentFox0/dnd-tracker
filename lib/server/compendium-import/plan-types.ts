import type { AdaptedEntry, Edition, ImportIssue } from './types';

import type { JsonRecord } from '@/lib/utils/compendium-import/parse';

export const ADAPTER_VERSION = '5etools-2';
export interface ExistingEntry {
    key: string;
    edition?: Edition;
    localId: string;
    body: JsonRecord;
    baseline: JsonRecord;
    missing?: boolean;
    kind?: AdaptedEntry['kind'];
}
export interface PlanContext {
    campaignId: string;
    allowMixedEdition?: boolean;
    existing: ExistingEntry[];
    bindings?: Record<string, ExistingEntry>;
    overwriteKeys?: readonly string[];
    excludedKeys?: readonly string[];
    occupiedNames?: Record<string, Array<{ id: string; name: string }>>;
    settingsHash?: string;
}
export interface PlannedWrite extends AdaptedEntry {
    provenance?: boolean;
    localId: string;
    operation: 'create' | 'update' | 'unchanged';
    nested?: boolean;
    baseline?: JsonRecord;
    resolvedBindings?: Record<
        string,
        { kind: AdaptedEntry['kind']; id: string }
    >;
}
export interface ImportPlan {
    writes: PlannedWrite[];
    errors: ImportIssue[];
    warnings: ImportIssue[];
    hash: string;
}


export interface PlanState {
    excludedPaths: string[];
    context: PlanContext;
    writes: PlannedWrite[];
    errors: ImportIssue[];
    entries: AdaptedEntry[];
    byKey: Map<string, AdaptedEntry>;
    existing: Map<string, ExistingEntry>;
    ids: Map<string, string>;
    states: Map<string, 'visiting' | 'done'>;
    planned: Map<string, PlannedWrite>;
    usedNames: Map<string, Set<string>>;
    visit: (key: string) => void;
}

export type Resolved = { localId: string; body: JsonRecord; key: string };

