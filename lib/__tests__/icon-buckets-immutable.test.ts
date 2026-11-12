import { describe, expect, it } from 'vitest';

import { readSource, sources } from './helpers/source-files';

import { ICON_BUCKETS } from '@/lib/constants/storage';

const BUCKETS = ICON_BUCKETS.join('|');

const ICON_REF_RE = new RegExp(
    `["'\`](?:${BUCKETS})["'\`/]|\\b(?:ASSET_BUCKET|ICON_BUCKETS)\\b`
);

const IMAGE_FACTORY_ICON_RE = new RegExp(
    `imageBucketStorage\\(\\{[^)]*["'\`](?:${BUCKETS})["'\`]`,
    's'
);

const contents = new Map(
    ['lib', 'app', 'scripts']
        .flatMap(sources)
        .filter((f) => f !== 'lib/constants/storage.ts')
        .map((f) => [f, readSource(f)] as const)
);

describe('тест-сторож: бакети іконок незмінні', () => {
    it('жоден файл, що посилається на бакет іконок, не викликає storage .remove(', () => {
        const offenders = [...contents]
            .filter(
                ([, src]) =>
                    ICON_REF_RE.test(src) &&
                    /\.remove\(/.test(src) &&
                    /\.from\(/.test(src)
            )
            .map(([f]) => f);

        expect(contents.size).toBeGreaterThan(100);
        expect(offenders).toEqual([]);
    });

    it('imageBucketStorage (з remove) не підключається до бакетів іконок', () => {
        const offenders = [...contents]
            .filter(([, src]) => IMAGE_FACTORY_ICON_RE.test(src))
            .map(([f]) => f);

        expect(offenders).toEqual([]);
    });

    it('сторож бачить порушення (самоперевірка)', () => {
        expect(
            ICON_REF_RE.test('admin.storage.from("unit-icons").remove([p])')
        ).toBe(true);
        expect(
            IMAGE_FACTORY_ICON_RE.test(
                'imageBucketStorage({ bucket: "spell-icons", x: 1 })'
            )
        ).toBe(true);
    });
});
