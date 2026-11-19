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
        path.resolve(__dirname, '../../ratchets/props-budget-exempt.json'),
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

    it('counts Pick keys and Omit remainders', () => {
        const code = `
            interface P { a: 1; b: 2; c: 3; d: 4 }
            export const A = (p: Pick<P, 'a' | 'b'>) => null;
            export const B = (p: Omit<P, 'a'>) => null;
        `;

        expect(countComponentProps(code)).toEqual({ A: 2, B: 3 });
    });

    it('resolves prop types imported from another file', () => {
        const files: Record<string, string> = {
            'components/x/types': 'export interface P { a: 1; b: 2; c: 3 }',
        };

        const code = `
            import type { P as Props } from './types';
            export const A = (p: Props) => null;
            export const B = (p: Omit<Props, 'a'>) => null;
        `;

        expect(
            countComponentProps(code, 'components/x/A.tsx', (r) => files[r])
        ).toEqual({ A: 3, B: 2 });
    });
});
