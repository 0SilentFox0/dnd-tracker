import { escapeRe } from './mentions';
import { wrapDoc } from './wrap-mentions';

import type {
    MentionOption,
    MentionType,
    RichDoc,
    ScenarioContent,
} from '@/types/scenario';

export const AUTO_MENTION_TYPES = [
    'unit',
    'artifact',
    'character',
    'acquaintance',
] as const satisfies readonly MentionType[];

const MIN_NAME = 3;

const MAX_ENDING = 3;

const DROP_MIN_WORD = 4;

const DROPPABLE = /[аяоеєйь]$/u;

const BEFORE = '(?<![\\p{L}\\p{N}_@])';

const AFTER = '(?![\\p{L}\\p{N}_])';

type AutoEntry = { option: MentionOption; nameLen: number; full: RegExp };

export interface AutoMentionIndex {
    re: RegExp;
    tailRe: RegExp;
    entries: AutoEntry[];
}

const isAutoType = (t: MentionType) =>
    (AUTO_MENTION_TYPES as readonly MentionType[]).includes(t);

const letters = (s: string) => Array.from(s).length;

const sameName = (name: string, text: string) =>
    name.toLowerCase() === text.replace(/[\s\u00a0]+/gu, ' ').toLowerCase();

function wordPattern(word: string): string {
    const stem =
        letters(word) >= DROP_MIN_WORD && DROPPABLE.test(word)
            ? Array.from(word).slice(0, -1).join('')
            : word;

    return `${escapeRe(stem)}\\p{L}{0,${MAX_ENDING}}`;
}

// only the first letter of the phrase is case-insensitive
function namePattern(name: string): string {
    const body = name.split(/\s+/u).map(wordPattern).join('[\\s\\u00a0]+');

    const [first, ...rest] = Array.from(body);

    const upper = first.toUpperCase();

    const lower = first.toLowerCase();

    return upper === lower ? body : `[${upper}${lower}]${rest.join('')}`;
}

export function buildAutoMentionIndex(
    options: MentionOption[]
): AutoMentionIndex | null {
    const byName = new Map<string, MentionOption[]>();

    for (const o of options) {
        const name = o.label.trim().replace(/\s+/gu, ' ');

        if (!isAutoType(o.type) || letters(name) < MIN_NAME) continue;

        const key = name.toLowerCase();

        byName.set(key, [...(byName.get(key) ?? []), { ...o, label: name }]);
    }

    const entries: AutoEntry[] = [...byName.values()]
        .filter((group) => new Set(group.map((o) => o.id)).size === 1)
        .map(([option]) => ({
            option,
            nameLen: letters(option.label),
            full: new RegExp(`^(?:${namePattern(option.label)})$`, 'u'),
        }))
        .sort((a, b) => b.nameLen - a.nameLen);

    if (!entries.length) return null;

    const alts = entries.map((e) => namePattern(e.option.label)).join('|');

    return {
        re: new RegExp(`${BEFORE}(?:${alts})${AFTER}`, 'gu'),
        tailRe: new RegExp(`${BEFORE}(?:${alts})$`, 'u'),
        entries,
    };
}

export function resolveAutoMention(
    index: AutoMentionIndex,
    text: string
): MentionOption | null {
    const hits = index.entries.filter((e) => e.full.test(text));

    const exact = hits.filter((e) => sameName(e.option.label, text));

    if (exact.length === 1) return exact[0].option;

    const best = Math.max(...hits.map((e) => e.nameLen));

    const top = hits.filter((e) => e.nameLen === best);

    return top.length === 1 ? top[0].option : null;
}

export function findAutoMentionAtEnd(
    index: AutoMentionIndex,
    textBefore: string
): { from: number; text: string; option: MentionOption } | null {
    const m = index.tailRe.exec(textBefore);

    if (!m) return null;

    const option = resolveAutoMention(index, m[0]);

    return option ? { from: m.index, text: m[0], option } : null;
}

export function autoTagDoc(
    doc: RichDoc,
    index: AutoMentionIndex
): { doc: RichDoc; count: number } {
    return wrapDoc(doc, index.re, (m) => {
        const o = resolveAutoMention(index, m);

        return o && { id: o.id, type: o.type };
    });
}

export function autoTagContent(
    content: ScenarioContent,
    index: AutoMentionIndex
): { content: ScenarioContent; count: number } {
    let count = 0;

    const tagged = (doc: RichDoc) => {
        const r = autoTagDoc(doc, index);

        count += r.count;

        return r.doc;
    };

    const sections = content.sections.map((s) => ({
        ...s,
        rows: s.rows.map((r) => ({
            ...r,
            story: tagged(r.story),
            notes: tagged(r.notes),
        })),
    }));

    return count
        ? { content: { ...content, sections }, count }
        : { content, count };
}
