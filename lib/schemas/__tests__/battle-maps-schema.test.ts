import { describe, expect, it } from 'vitest';

import { battleMapInputSchema } from '../battle-maps';

const input = (map: object) => ({
    name: 'Cave',
    map: { cols: 10, rows: 10, background: null, opacity: 0.5, ...map },
});

const messages = (r: ReturnType<typeof battleMapInputSchema.safeParse>) =>
    r.success ? [] : r.error.issues.map((i) => i.message);

describe('battleMapInputSchema', () => {
    it('accepts a data-URL background', () => {
        const r = battleMapInputSchema.safeParse(
            input({ background: 'data:image/png;base64,AAAA' })
        );

        expect(r.success).toBe(true);
    });

    it('rejects a malformed background', () => {
        const r = battleMapInputSchema.safeParse(
            input({ background: 'javascript:alert(1)' })
        );

        expect(messages(r)).toContain('battleSetup.validation.background');
    });

    it('accepts static terrain including hazards', () => {
        const r = battleMapInputSchema.safeParse(
            input({
                terrain: {
                    '1:1': { kind: 'difficult' },
                    '2:2': {
                        kind: 'hazard',
                        damage: { dice: '2d6', type: 'fire' },
                    },
                },
            })
        );

        expect(r.success).toBe(true);
    });

    it.each([
        ['zoneId', { kind: 'hazard', zoneId: 'z1' }],
        ['untilRound', { kind: 'barrier', untilRound: 3 }],
        [
            'spell damage',
            { kind: 'hazard', damage: { type: 'fire', spellId: 's1' } },
        ],
    ])('rejects runtime terrain (%s)', (_name, cell) => {
        const r = battleMapInputSchema.safeParse(
            input({ terrain: { '1:1': cell } })
        );

        expect(messages(r)).toContain(
            'battleSetup.validation.libraryTerrainRuntime'
        );
    });

    it('rejects spellZones in the header', () => {
        const r = battleMapInputSchema.safeParse(
            input({
                spellZones: {
                    z: {
                        casterId: 'c',
                        spellId: 's',
                        spellName: 'n',
                        dc: 10,
                        side: 'all',
                        triggers: {},
                        untilRound: 2,
                    },
                },
            })
        );

        expect(r.success).toBe(false);
    });

    it('rejects a photo map above the photo limit', () => {
        const r = battleMapInputSchema.safeParse(
            input({
                cols: 80,
                rows: 80,
                background: 'data:image/png;base64,AAAA',
            })
        );

        expect(r.success).toBe(false);
    });
});

describe('battleMapInputSchema.doors', () => {
    it('двері на стіні бібліотеки — помилка', () => {
        const r = battleMapInputSchema.safeParse({
            ...input({ doors: { '1:1:e': { open: false } } }),
            walls: ['1:1:e'],
        });

        expect(messages(r)).toContain('battleSetup.validation.doorOnWall');
        expect(
            battleMapInputSchema.safeParse(
                input({ doors: { '1:1:e': { open: false } } })
            ).success
        ).toBe(true);
    });
});
