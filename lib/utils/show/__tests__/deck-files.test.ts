import { describe, expect, it } from 'vitest';

import { isUnsupportedSlideFile, removedSlideUrls } from '../deck-files';

const s = (id: string, imageUrl: string) => ({ id, imageUrl });

describe('removedSlideUrls', () => {
    it('лише зниклі картинки, без дублікатів і без тих, що треба зберегти', () => {
        const before = [
            s('a', 'u1'),
            s('b', 'u2'),
            s('c', 'u2'),
            s('d', 'u3'),
            s('e', 'u4'),
        ];

        const after = [s('a', 'u1')];

        expect(removedSlideUrls(before, after, ['u3']).sort()).toEqual([
            'u2',
            'u4',
        ]);
    });

    it('картинка лишилася в іншому слайді — не видаляється', () => {
        expect(
            removedSlideUrls([s('a', 'u1'), s('b', 'u2')], [s('c', 'u2')], [])
        ).toEqual(['u1']);
    });
});

describe('isUnsupportedSlideFile', () => {
    it('rejects icons and non-images, accepts images and unknown types', () => {
        expect(
            isUnsupportedSlideFile({ name: 'a.ico', type: 'image/x-icon' })
        ).toBe(true);
        expect(isUnsupportedSlideFile({ name: 'a.ico', type: '' })).toBe(true);
        expect(
            isUnsupportedSlideFile({ name: 'a.pdf', type: 'application/pdf' })
        ).toBe(true);
        expect(isUnsupportedSlideFile({ name: 'a.png', type: 'image/png' })).toBe(
            false
        );
        expect(isUnsupportedSlideFile({ name: 'a.png', type: '' })).toBe(false);
    });
});
