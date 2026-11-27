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

// real Ukrainian case endings only, so a longer unrelated word is not read as a form of a short name
const ENDINGS =
    /(?:ами|ями|ові|еві|єві|ом|ем|єм|ою|ею|єю|ів|їв|ей|ам|ям|ах|ях|ми|[аяуюоеєіїиьймх])?/u;

const CLUSTER = /\P{M}\p{M}*/gu;

const WORD = /[\p{L}\p{N}_]+/gu;

const WORD_CHAR = /[\p{L}\p{N}_]/u;

const LETTER = /\p{L}/u;

const APOSTROPHE = /['’]/u;

// an apostrophe between letters belongs to the word (Ukrainian spelling)
const AFTER = "(?![\\p{L}\\p{N}_]|['’]\\p{L})";

const PREFIX = 3;

const SPAN_SLACK = 8;

type AutoEntry = {
    option: MentionOption;
    nameLen: number;
    full: RegExp;
    sticky: RegExp;
};

export interface AutoMentionIndex {
    byPrefix: Map<string, AutoEntry[]>;
    maxSpan: number;
}

export type AutoMatch = { index: number; text: string; option: MentionOption };

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

    return `${escapeRe(stem)}${ENDINGS.source}`;
}

// only the first letter of the phrase is case-insensitive
function namePattern(name: string): string {
    const body = name.split(/\s+/u).map(wordPattern).join('[\\s\\u00a0]+');

    const [first, ...rest] = Array.from(body);

    const upper = first.toUpperCase();

    const lower = first.toLowerCase();

    return upper === lower ? body : `[${upper}${lower}]${rest.join('')}`;
}

const prefixKey = (s: string) =>
    (s.match(/^[\p{L}\p{N}_]+/u)?.[0] ?? '').slice(0, PREFIX).toLowerCase();

export function buildAutoMentionIndex(
    options: MentionOption[]
): AutoMentionIndex | null {
    const byName = new Map<string, MentionOption[]>();

    for (const o of options) {
        const name = o.label.normalize('NFC').trim().replace(/\s+/gu, ' ');

        if (!isAutoType(o.type) || letters(name) < MIN_NAME) continue;

        const key = name.toLowerCase();

        byName.set(key, [...(byName.get(key) ?? []), { ...o, label: name }]);
    }

    const byPrefix = new Map<string, AutoEntry[]>();

    let maxSpan = 0;

    for (const group of byName.values()) {
        const option = group[0];

        const key = prefixKey(option.label);

        if (group.length > 1 || !key) continue;

        const pattern = namePattern(option.label);

        byPrefix.set(key, [
            ...(byPrefix.get(key) ?? []),
            {
                option,
                nameLen: letters(option.label),
                full: new RegExp(`^(?:${pattern})$`, 'u'),
                sticky: new RegExp(`(?:${pattern})${AFTER}`, 'uy'),
            },
        ]);
        maxSpan = Math.max(
            maxSpan,
            option.label.length +
                MAX_ENDING * option.label.split(' ').length +
                SPAN_SLACK
        );
    }

    return byPrefix.size ? { byPrefix, maxSpan } : null;
}

function boundaryBefore(text: string, i: number): boolean {
    const prev = text[i - 1];

    if (prev === undefined) return true;

    if (prev === '@' || WORD_CHAR.test(prev)) return false;

    return !(APOSTROPHE.test(prev) && LETTER.test(text[i - 2] ?? ''));
}

function candidates(index: AutoMentionIndex, token: string): AutoEntry[] {
    const lower = token.toLowerCase();

    const found: AutoEntry[] = [];

    for (let n = 1; n <= Math.min(PREFIX, lower.length); n++)
        found.push(...(index.byPrefix.get(lower.slice(0, n)) ?? []));

    return found.sort((a, b) => b.nameLen - a.nameLen);
}

// exact name wins; otherwise the longest name, and a tie is ambiguous
function resolve(cands: AutoEntry[], text: string): MentionOption | null {
    const hits = cands.filter((e) => e.full.test(text));

    const exact = hits.filter((e) => sameName(e.option.label, text));

    if (exact.length === 1) return exact[0].option;

    const top = hits.filter((e) => e.nameLen === hits[0]?.nameLen);

    return top.length === 1 ? top[0].option : null;
}

// text typed with combining marks (и + U+0306) is scanned in NFC and mapped back to the original offsets
export function findAutoMentions(
    index: AutoMentionIndex,
    text: string,
    from = 0
): AutoMatch[] {
    const nfc = text.normalize('NFC');

    if (nfc === text) return scan(index, text, from);

    const map: number[] = [];

    let norm = '';

    for (const m of text.matchAll(CLUSTER)) {
        const n = m[0].normalize('NFC');

        for (let k = 0; k < n.length; k++) map.push(m.index);
        norm += n;
    }

    map.push(text.length);

    const normFrom = Math.max(
        0,
        map.findIndex((o) => o >= from)
    );

    return scan(index, norm, normFrom).map((r) => {
        const start = map[r.index];

        const end = map[r.index + r.text.length];

        return { ...r, index: start, text: text.slice(start, end) };
    });
}

function scan(
    index: AutoMentionIndex,
    text: string,
    from: number
): AutoMatch[] {
    const out: AutoMatch[] = [];

    const word = new RegExp(WORD.source, WORD.flags);

    word.lastIndex = from;

    let pos = from;

    for (let m = word.exec(text); m; m = word.exec(text)) {
        const at = m.index;

        if (at < pos || !boundaryBefore(text, at)) continue;

        const cands = candidates(index, m[0]);

        let matched: string | null = null;

        for (const c of cands) {
            c.sticky.lastIndex = at;

            const r = c.sticky.exec(text);

            if (r) {
                matched = r[0];
                break;
            }
        }

        if (!matched) continue;

        const option = resolve(cands, matched);

        if (option) out.push({ index: at, text: matched, option });

        pos = at + matched.length;
        word.lastIndex = pos;
    }

    return out;
}

export function findAutoMentionAtEnd(
    index: AutoMentionIndex,
    textBefore: string
): { from: number; text: string; option: MentionOption } | null {
    const last = findAutoMentions(
        index,
        textBefore,
        Math.max(0, textBefore.length - index.maxSpan)
    ).at(-1);

    return last && last.index + last.text.length === textBefore.length
        ? { from: last.index, text: last.text, option: last.option }
        : null;
}

export function autoTagDoc(
    doc: RichDoc,
    index: AutoMentionIndex
): { doc: RichDoc; count: number } {
    return wrapDoc(doc, (text) =>
        findAutoMentions(index, text).map(({ index: at, text: t, option }) => ({
            index: at,
            text: t,
            target: { id: option.id, type: option.type },
        }))
    );
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
