import { describe, expect, it } from 'vitest';

import {
    createEnemySchema,
    createSessionSchema,
    updateEnemySchema,
    updateSessionSchema,
} from '@/lib/schemas/world';

describe('createSessionSchema', () => {
    it('accepts a name with optional fields', () => {
        expect(
            createSessionSchema.safeParse({
                name: ' Session 1 ',
                description: 'Intro',
                color: '#d3b060',
            }).data?.name
        ).toBe('Session 1');
    });

    it('rejects an empty name', () => {
        expect(createSessionSchema.safeParse({ name: '  ' }).success).toBe(
            false
        );
    });

    it('rejects a long description', () => {
        expect(
            createSessionSchema.safeParse({
                name: 'a',
                description: 'x'.repeat(601),
            }).success
        ).toBe(false);
    });

    it('rejects a bad color', () => {
        expect(
            createSessionSchema.safeParse({ name: 'a', color: 'red' }).success
        ).toBe(false);
    });
});

describe('updateSessionSchema', () => {
    it('accepts end: true', () => {
        expect(updateSessionSchema.safeParse({ end: true }).success).toBe(true);
    });

    it('rejects end: false', () => {
        expect(updateSessionSchema.safeParse({ end: false }).success).toBe(
            false
        );
    });

    it('rejects an empty patch and unknown keys', () => {
        expect(updateSessionSchema.safeParse({}).success).toBe(false);
        expect(updateSessionSchema.safeParse({ foo: 1 }).success).toBe(false);
    });
});

describe('createEnemySchema', () => {
    it('accepts a valid enemy', () => {
        expect(
            createEnemySchema.safeParse({
                name: 'Orc',
                x: 0.2,
                y: 1,
                icon: 'camp',
                dmNote: 'secret',
            }).success
        ).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(
            createEnemySchema.safeParse({ name: '', x: 0.5, y: 0.5 }).success
        ).toBe(false);
    });

    it('rejects out-of-range coordinates', () => {
        expect(
            createEnemySchema.safeParse({ name: 'a', x: 1.2, y: 0.5 }).success
        ).toBe(false);
        expect(
            createEnemySchema.safeParse({ name: 'a', x: 0.5, y: -0.1 }).success
        ).toBe(false);
    });

    it('rejects an unknown icon', () => {
        expect(
            createEnemySchema.safeParse({
                name: 'a',
                x: 0.5,
                y: 0.5,
                icon: 'nope',
            }).success
        ).toBe(false);
    });
});

describe('updateEnemySchema', () => {
    it('accepts a partial patch', () => {
        expect(updateEnemySchema.safeParse({ x: 0.3 }).success).toBe(true);
    });

    it('rejects an empty patch and bad coordinates', () => {
        expect(updateEnemySchema.safeParse({}).success).toBe(false);
        expect(updateEnemySchema.safeParse({ y: 2 }).success).toBe(false);
    });
});
