import type { Glossary, PackHooks } from '../systems/types';
import { checkTranslation, type TranslationIssue } from './i18n-validate';
import { buildNameMap, fixItalicNames } from './names';

import type {
    KeyedString,
    TranslationsV2,
} from '@/lib/utils/templates/i18n/keys';

export type Phase = 'A' | 'B';

const PHASE_A_KINDS: readonly string[] = [
    'races',
    'feats',
    'backgrounds',
    'classes',
    'careers',
];

export const inPhase = (entry: KeyedString, phase: Phase) => {
    const a = entry.cls === 'n' || PHASE_A_KINDS.includes(entry.kind);

    return phase === 'A' ? a : !a;
};

export const missing = (entries: KeyedString[], tr: TranslationsV2) =>
    entries.filter((e) => !Object.hasOwn(tr, e.key));

export function planBatches(
    entries: KeyedString[],
    maxChars: number
): KeyedString[][] {
    const batches: KeyedString[][] = [];

    let size = 0;

    for (const entry of entries) {
        if (
            batches.length === 0 ||
            (size + entry.en.length > maxChars && size > 0)
        ) {
            batches.push([]);
            size = 0;
        }

        batches[batches.length - 1].push(entry);
        size += entry.en.length;
    }

    return batches;
}

export interface AppliedLine {
    key: string;
    text: string;
}

export interface Rejected extends AppliedLine {
    issues: Array<TranslationIssue | 'unknown'>;
}

export function mergeApplied(
    existing: TranslationsV2,
    lines: AppliedLine[],
    catalog: KeyedString[],
    glossary: Glossary = {},
    normalize?: PackHooks['normalizeTranslation']
): { merged: TranslationsV2; accepted: number; rejected: Rejected[] } {
    const byKey = new Map(catalog.map((e) => [e.key, e]));

    const merged = { ...existing };

    const names = buildNameMap(catalog, existing);

    const rejected: Rejected[] = [];

    let accepted = 0;

    for (const line of lines) {
        const entry = byKey.get(line.key);

        const fixed = entry
            ? fixItalicNames(entry.en, line.text, names)
            : line.text;

        const text =
            entry && normalize ? normalize(entry, fixed, glossary) : fixed;

        const issues = entry
            ? checkTranslation(entry.en, text)
            : (['unknown'] as Rejected['issues']);

        if (issues.length > 0) rejected.push({ ...line, issues });
        else if (entry) {
            merged[line.key] = { text, en: entry.en };
            accepted += 1;
        }
    }

    return { merged, accepted, rejected };
}
