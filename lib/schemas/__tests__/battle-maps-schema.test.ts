import { describe, expect, it } from 'vitest';

import { battleMapInputSchema, battleMapSaveSchema } from '../battle-maps';

const input = (map: object) => ({
    name: 'Cave',
    map: { cols: 10, rows: 10, background: null, opacity: 0.5, ...map },
});

const messages = (r: ReturnType<typeof battleMapInputSchema.safeParse>) =>
    r.success ? [] : r.error.issues.map((i) => i.message);

describe('battleMapInputSchema', () => {
    it('allows optional validated source attribution', () => {
        expect(battleMapInputSchema.safeParse(input({})).success).toBe(true);
        expect(
            battleMapInputSchema.safeParse(
                input({
                    source: {
                        url: 'https://github.com/mbround18/vtt-maps',
                        attribution: 'mbround18/vtt-maps',
                        license: 'CC-BY-SA-4.0',
                    },
                })
            ).success
        ).toBe(true);
    });

    it.each([
        {
            url: 'http://example.com/map',
            attribution: 'source',
            license: 'CC-BY-SA-4.0',
        },
        {
            url: 'https://example.com/map',
            attribution: 'source',
            license: 'MIT',
        },
        {
            url: 'https://example.com/map',
            attribution: 'x'.repeat(121),
            license: 'CC-BY-SA-4.0',
        },
    ])('rejects invalid source metadata', (source) => {
        expect(battleMapInputSchema.safeParse(input({ source })).success).toBe(
            false
        );
    });
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

    it('accepts a photo map up to the library side limit and rejects above', () => {
        const photo = (side: number) =>
            battleMapInputSchema.safeParse(
                input({
                    cols: side,
                    rows: side,
                    background: 'data:image/png;base64,AAAA',
                })
            );

        expect(photo(200).success).toBe(true);
        expect(photo(201).success).toBe(false);
    });
});

describe('battleMapSaveSchema', () => {
    it('requires expectedVersion and keeps the input refinements', () => {
        expect(battleMapSaveSchema.safeParse(input({})).success).toBe(false);
        expect(
            battleMapSaveSchema.safeParse({ ...input({}), expectedVersion: 1 })
                .success
        ).toBe(true);
        expect(
            battleMapSaveSchema.safeParse({
                ...input({}),
                walls: ['99:0:e'],
                expectedVersion: 1,
            }).success
        ).toBe(false);
    });
});

describe('battle map library schemas on hex grids', () => {
    const hex = { gridType: 'hex' };

    it.each([battleMapInputSchema, battleMapSaveSchema])(
        'accepts hex edges and rejects wrong or off-map keys',
        (schema) => {
            const parse = (body: object) =>
                schema.safeParse({ expectedVersion: 1, ...body });

            expect(
                parse({
                    ...input(hex),
                    walls: ['1:1:n'],
                    bars: ['2:2:se'],
                    map: {
                        ...input(hex).map,
                        doors: { '3:3:ne': { open: false } },
                    },
                }).success
            ).toBe(true);

            const bad = (body: object) => {
                const r = parse(body);

                return r.success ? [] : r.error.issues.map((i) => i.message);
            };

            expect(bad({ ...input(hex), walls: ['1:1:e'] })).toContain(
                'battleSetup.validation.badEdges'
            );
            expect(bad({ ...input(hex), walls: ['0:0:n'] })).toContain(
                'battleSetup.validation.badEdges'
            );
            expect(bad({ ...input({}), walls: ['1:1:ne'] })).toContain(
                'battleSetup.validation.badEdges'
            );
            expect(
                bad({
                    ...input({ ...hex, maze: { walls: [], exit: null, difficulty: 'easy', teleports: [], fog: [], marks: {}, dark: false } }),
                })
            ).toContain('battleSetup.validation.hexSquareOnly');
        }
    );
});
