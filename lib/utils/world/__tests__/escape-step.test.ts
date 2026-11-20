import { describe, expect, it } from 'vitest';

import { escapeStep } from '../escape-step';

const off = { details: false, drawing: false, full: false, selection: false };

describe('escapeStep', () => {
    it('details first', () => {
        expect(
            escapeStep({ ...off, details: true, full: true, selection: true })
        ).toBe('details');
    });

    it('drawing before fullscreen', () => {
        expect(escapeStep({ ...off, drawing: true, full: true })).toBe(
            'drawing'
        );
    });

    it('fullscreen before selection', () => {
        expect(escapeStep({ ...off, full: true, selection: true })).toBe(
            'fullscreen'
        );
    });

    it('null when nothing is open', () => {
        expect(escapeStep(off)).toBeNull();
    });
});
