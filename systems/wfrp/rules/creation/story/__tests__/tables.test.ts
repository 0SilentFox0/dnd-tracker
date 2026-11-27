import { describe, expect, it } from 'vitest';

import { APPEARANCE_COLOURS } from '../colours';
import { rollStory, STORY_TABLES } from '../tables';
import {
    APPEARANCE_QUESTIONS,
    STORY_BLOCKS,
    STORY_QUESTIONS,
} from '../types';

import en from '@/messages/en/wfrpCreation.json';
import uk from '@/messages/uk/wfrpCreation.json';

const FORBIDDEN = /Reikland|Altdorf|Sigmar|Ranald|Empire|Імпері|Рейкл/i;

const locales = { uk, en } as const;

function lookup(messages: unknown, path: string): unknown {
    return path
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                node && typeof node === 'object'
                    ? (node as Record<string, unknown>)[part]
                    : undefined,
            messages
        );
}

const fixedRng = (roll: number) => () => (roll - 1 + 0.5) / 100;

describe('story tables', () => {
    it.each(STORY_QUESTIONS)('%s has 10 ascending rows ending at 100', (q) => {
        const rows = STORY_TABLES[q];

        expect(rows).toHaveLength(10);

        rows.forEach((row, i) => {
            if (i > 0) expect(row.max).toBeGreaterThan(rows[i - 1].max);
        });

        expect(rows[9].max).toBe(100);
    });

    it('rollStory picks the row by roll', () => {
        const r = rollStory('origin', fixedRng(37));

        expect(r.roll).toBe(37);
        expect(r.key).toBe('story.tables.origin.4');
    });

    describe.each(Object.entries(locales))('%s texts', (_name, messages) => {
        const keys = [
            ...STORY_QUESTIONS.flatMap((q) =>
                STORY_TABLES[q].map((row) => row.key)
            ),
            ...APPEARANCE_COLOURS.map((c) => `story.colours.${c}`),
            ...[...STORY_QUESTIONS, ...APPEARANCE_QUESTIONS].map(
                (q) => `story.questions.${q}`
            ),
            ...STORY_BLOCKS.map((b) => `story.blocks.${b.id}`),
        ];

        it('has every key as a non-empty string', () => {
            for (const key of keys) {
                const text = lookup(messages, key);

                expect(typeof text, key).toBe('string');
                expect((text as string).length, key).toBeGreaterThan(0);
            }
        });

        it('contains no book names', () => {
            for (const key of keys) {
                expect(lookup(messages, key) as string, key).not.toMatch(
                    FORBIDDEN
                );
            }
        });
    });
});
