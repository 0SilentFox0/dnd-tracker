import { describe, expect, it } from 'vitest';

import {
    autoTagContent,
    autoTagDoc,
    buildAutoMentionIndex,
    findAutoMentionAtEnd,
} from '@/lib/utils/scenario/auto-mentions';
import type {
    MentionOption,
    RichDoc,
    RichNode,
    ScenarioContent,
} from '@/types/scenario';

const options: MentionOption[] = [
    { type: 'unit', id: 'u1', label: 'Грифон' },
    { type: 'character', id: 'c1', label: 'Зехір' },
    { type: 'acquaintance', id: 'a1', label: 'Ізабелла' },
    { type: 'unit', id: 'u2', label: 'Королівський грифон' },
    { type: 'unit', id: 'u3', label: 'Привид' },
    { type: 'acquaintance', id: 'a2', label: 'Привид' },
    { type: 'artifact', id: 'r1', label: 'Лук' },
    { type: 'acquaintance', id: 'a3', label: 'Лука' },
    { type: 'unit', id: 'u4', label: 'Ед' },
    { type: 'spell', id: 's1', label: 'Щит' },
];

const built = buildAutoMentionIndex(options);

if (!built) throw new Error('index');

const index = built;

const text = (t: string, marks?: RichNode['marks']): RichNode => ({
    type: 'text',
    text: t,
    ...(marks && { marks }),
});

const p = (...content: RichNode[]): RichDoc => ({
    type: 'doc',
    content: [{ type: 'paragraph', content }],
});

const chips = (d: RichDoc) =>
    (d.content[0].content ?? [])
        .filter((n) => n.type === 'mention')
        .map((n) => n.attrs);

const tag = (s: string) => chips(autoTagDoc(p(text(s)), index).doc);

describe('autoTagDoc', () => {
    it('tags the name with short case endings', () => {
        const { doc, count } = autoTagDoc(
            p(text('Зехіра, Зехіру і Зехіром')),
            index
        );

        expect(count).toBe(3);
        expect(chips(doc)).toEqual([
            { id: 'c1', label: 'Зехіра', type: 'character' },
            { id: 'c1', label: 'Зехіру', type: 'character' },
            { id: 'c1', label: 'Зехіром', type: 'character' },
        ]);
        expect(tag('Зехірович')).toEqual([]);
    });

    it('is case-insensitive on the first letter only', () => {
        expect(tag('зехір')).toHaveLength(1);
        expect(tag('ЗЕХІР')).toEqual([]);
    });

    it('lets a final vowel be replaced by the ending', () => {
        expect(tag('Ізабелли та Ізабеллою').map((a) => a?.id)).toEqual([
            'a1',
            'a1',
        ]);
    });

    it('matches multi-word names as a phrase, longest first', () => {
        expect(tag('Королівський грифон')).toEqual([
            { id: 'u2', label: 'Королівський грифон', type: 'unit' },
        ]);
        expect(tag('Королівськими грифонами').map((a) => a?.id)).toEqual([
            'u2',
        ]);
        expect(tag('грифон').map((a) => a?.id)).toEqual(['u1']);
    });

    it('skips ambiguous, short and non-auto names', () => {
        expect(tag('Привид')).toEqual([]);
        expect(tag('Ед')).toEqual([]);
        expect(tag('Щит')).toEqual([]);
    });

    it('prefers the longer name when an ending makes forms collide', () => {
        expect(tag('Лука').map((a) => a?.id)).toEqual(['a3']);
        expect(tag('Лук').map((a) => a?.id)).toEqual(['r1']);
    });

    it('does not tag a name typed after @', () => {
        expect(tag('@Зехір')).toEqual([]);
    });

    it('leaves existing mentions untouched', () => {
        const { doc, count } = autoTagDoc(
            p(
                {
                    type: 'mention',
                    attrs: { id: 'c1', label: 'Зехір', type: 'character' },
                },
                text(' і Зехір')
            ),
            index
        );

        expect(count).toBe(1);
        expect(chips(doc)).toHaveLength(2);
    });

    it('never tags inside links or code', () => {
        expect(
            autoTagDoc(p(text('Зехір', [{ type: 'link' as never }])), index)
                .count
        ).toBe(0);
        expect(
            autoTagDoc(p(text('Зехір', [{ type: 'code' as never }])), index)
                .count
        ).toBe(0);
    });

    it('keeps only marks common to the whole match', () => {
        const mixed = autoTagDoc(
            p(text('Зе', [{ type: 'bold' }]), text('хір')),
            index
        ).doc;

        expect(mixed.content[0].content).toEqual([
            {
                type: 'mention',
                attrs: { id: 'c1', label: 'Зехір', type: 'character' },
            },
        ]);

        const secret = autoTagDoc(
            p(text('Зехір', [{ type: 'secret' }])),
            index
        ).doc;

        expect(secret.content[0].content?.[0].marks).toEqual([
            { type: 'secret' },
        ]);
    });
});

describe('findAutoMentionAtEnd', () => {
    it('finds a match ending exactly at the end of the text', () => {
        expect(findAutoMentionAtEnd(index, 'Бачу Зехіра')).toEqual({
            from: 5,
            text: 'Зехіра',
            option: { type: 'character', id: 'c1', label: 'Зехір' },
        });
        expect(findAutoMentionAtEnd(index, 'Зехіра бачу')).toBeNull();
    });
});

describe('autoTagContent', () => {
    const row = (id: string, story: string, notes: string) => ({
        id,
        story: p(text(story)),
        notes: p(text(notes)),
    });

    it('tags story and notes across sections', () => {
        const content = {
            sections: [
                { id: 's1', title: 'A', rows: [row('r1', 'Зехір', 'Лука')] },
                { id: 's2', title: 'B', rows: [row('r2', 'нічого', 'Лук')] },
            ],
        } as unknown as ScenarioContent;

        const { content: next, count } = autoTagContent(content, index);

        expect(count).toBe(3);
        expect(chips(next.sections[1].rows[0].notes)).toHaveLength(1);
    });

    it('returns the same content when nothing matches', () => {
        const content = {
            sections: [{ id: 's1', title: 'A', rows: [row('r1', 'x', 'y')] }],
        } as unknown as ScenarioContent;

        expect(autoTagContent(content, index).content).toBe(content);
    });
});

describe('buildAutoMentionIndex', () => {
    it('returns null when nothing is taggable', () => {
        expect(buildAutoMentionIndex([])).toBeNull();
    });
});
