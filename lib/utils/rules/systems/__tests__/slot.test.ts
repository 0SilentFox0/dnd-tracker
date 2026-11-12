import { describe, expect, it } from 'vitest';

import { defineSlot } from '../slot';

const codec = defineSlot<{ n: number }>('sys', (raw) =>
    typeof (raw as { n?: unknown })?.n === 'number'
        ? (raw as { n: number })
        : undefined
);

describe('defineSlot', () => {
    it('reads own key', () =>
        expect(codec.read({ key: 'sys', data: { n: 1 } })).toEqual({ n: 1 }));

    it('returns undefined for a foreign key', () =>
        expect(codec.read({ key: 'other', data: { n: 1 } })).toBeUndefined());

    it('returns undefined when parse rejects', () =>
        expect(codec.read({ key: 'sys', data: { n: 'x' } })).toBeUndefined());

    it('returns undefined for a missing slot', () => {
        expect(codec.read(undefined)).toBeUndefined();
        expect(codec.read(null)).toBeUndefined();
    });

    it('write wraps data with the key', () =>
        expect(codec.write({ n: 2 })).toEqual({ key: 'sys', data: { n: 2 } }));
});

describe('SlotCodec.extend', () => {
    const baseCodec = defineSlot<{ n: number }>('d20', (raw) =>
        typeof (raw as { n?: unknown })?.n === 'number'
            ? { n: (raw as { n: number }).n }
            : undefined
    );

    const retaliation = baseCodec.extend('retaliation', (raw) =>
        typeof (raw as { left?: unknown })?.left === 'number'
            ? (raw as { left: number })
            : undefined
    );

    const morale = baseCodec.extend('morale', (raw) =>
        typeof (raw as { v?: unknown })?.v === 'number'
            ? (raw as { v: number })
            : undefined
    );

    it('writing a module keeps base data', () => {
        const prev = baseCodec.write({ n: 1 });

        const next = retaliation.write({ left: 2 }, prev);

        expect(next.data).toMatchObject({
            n: 1,
            ext: { retaliation: { left: 2 } },
        });
        expect(retaliation.read(next)).toEqual({ left: 2 });
    });

    it('writing a module keeps other modules', () => {
        const next = morale.write(
            { v: 3 },
            retaliation.write({ left: 2 }, baseCodec.write({ n: 1 }))
        );

        expect(retaliation.read(next)).toEqual({ left: 2 });
        expect(morale.read(next)).toEqual({ v: 3 });
    });

    it('keeps disabled module data when the base or another module writes', () => {
        const prev = morale.write({ v: 3 }, baseCodec.write({ n: 1 }));

        const afterBase = baseCodec.write({ n: 5 }, prev);

        expect(morale.read(afterBase)).toEqual({ v: 3 });
        expect(baseCodec.read(afterBase)).toEqual({ n: 5 });
        expect(morale.read(retaliation.write({ left: 1 }, prev))).toEqual({
            v: 3,
        });
    });

    it('base reads the same with any ext content', () => {
        const slot = {
            key: 'd20',
            data: { n: 4, ext: { morale: { v: 1 }, unknown: 1 } },
        };

        expect(baseCodec.read(slot)).toEqual({ n: 4 });
        expect(baseCodec.read({ key: 'd20', data: { n: 4 } })).toEqual({
            n: 4,
        });
    });

    it('module read is undefined without ext or for a foreign key', () => {
        expect(
            retaliation.read({ key: 'd20', data: { n: 1 } })
        ).toBeUndefined();
        expect(
            retaliation.read({
                key: 'wfrp',
                data: { ext: { retaliation: { left: 1 } } },
            })
        ).toBeUndefined();
    });

    it('ignores prev of another key', () => {
        expect(
            retaliation.write({ left: 1 }, { key: 'wfrp', data: { x: 1 } })
        ).toEqual({ key: 'd20', data: { ext: { retaliation: { left: 1 } } } });
    });
});
