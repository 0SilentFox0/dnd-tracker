import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    collectPropsCounts,
    countComponentProps,
    overBudget,
    PROPS_LIMIT,
} from './helpers/props-budget';

const exempt: Record<string, number> = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, '../../props-budget-exempt.json'),
        'utf8'
    )
);

describe('props-budget', () => {
    const over = overBudget(collectPropsCounts());

    it('no component grows past its exempt entry or a new one exceeds the limit', () => {
        const bad = Object.entries(over).filter(
            ([k, n]) => n > (exempt[k] ?? PROPS_LIMIT)
        );

        expect(bad).toEqual([]);
    });

    it('exempt entries are exact (shrink or remove them)', () => {
        const stale = Object.entries(exempt).filter(([k, n]) => over[k] !== n);

        expect(stale).toEqual([]);
    });

    it('flags a component with 8 props', () => {
        const code = `
            interface P { a: 1; b: 2; c: 3; d: 4; e: 5; f: 6; g: 7; h: 8 }
            export function Big(p: P) { return null; }
            export const Ok = ({ a, b }: { a: 1; b: 2 }) => null;
        `;

        const counts = countComponentProps(code);

        expect(overBudget(counts)).toEqual({ Big: 8 });
        expect(counts.Ok).toBe(2);
    });
});
