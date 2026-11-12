import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { catalogOf, convertV1, hashText } from '../lib/i18n-convert';
import { readTranslations, writeTranslations } from '../lib/i18n-store';

import { extractKeyed, statusOf } from '@/lib/utils/templates/i18n/keys';

const catalog = extractKeyed(
    {
        spells: [{ slug: 'bless', name: 'Bless', description: 'Light' }],
        classes: [
            { slug: 'light', name: 'Light' },
            { slug: 'cleric', name: 'Cleric' },
        ],
    },
    ['spells', 'classes']
);

describe('convertV1', () => {
    it('fans a v1 hash out to every key with the same class and text', () => {
        const { v2, unmatched } = convertV1(catalog, {
            [hashText('n', 'Bless')]: 'Благословення',
            [hashText('d', 'Light')]: 'Світло опису',
            [hashText('n', 'Light')]: 'Світло',
            [hashText('n', 'Gone')]: 'Зник',
        });

        expect(v2).toEqual({
            'spells/bless/name': { text: 'Благословення', en: 'Bless' },
            'spells/bless/description': { text: 'Світло опису', en: 'Light' },
            'classes/light/name': { text: 'Світло', en: 'Light' },
        });
        expect(unmatched).toEqual([hashText('n', 'Gone')]);
    });

    it('one hash shared by two keys yields two entries', () => {
        const shared = extractKeyed(
            {
                spells: [{ slug: 'a', name: 'Light' }],
                classes: [{ slug: 'b', name: 'Light' }],
            },
            ['spells', 'classes']
        );

        expect(
            Object.keys(
                convertV1(shared, { [hashText('n', 'Light')]: 'Світло' }).v2
            )
        ).toEqual(['spells/a/name', 'classes/b/name']);
    });
});

describe('translation store', () => {
    it('round-trips with sorted keys and one entry per line', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-store-'));

        try {
            const tr = {
                'spells/b/name': { text: 'Б', en: 'B' },
                'spells/a/name': { text: 'А', en: 'A' },
            };

            writeTranslations('pack', 'uk', tr, dir);

            const raw = fs.readFileSync(
                path.join(dir, 'pack', 'i18n', 'uk.json'),
                'utf8'
            );

            expect(raw.split('\n')).toEqual([
                '{',
                '  "spells/a/name": {"text":"А","en":"A"},',
                '  "spells/b/name": {"text":"Б","en":"B"}',
                '}',
                '',
            ]);
            expect(readTranslations('pack', 'uk', dir)).toEqual(tr);

            writeTranslations(
                'pack',
                'uk',
                readTranslations('pack', 'uk', dir),
                dir
            );
            expect(
                fs.readFileSync(
                    path.join(dir, 'pack', 'i18n', 'uk.json'),
                    'utf8'
                )
            ).toBe(raw);
            expect(readTranslations('pack', 'xx', dir)).toEqual({});
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('shipped dictionaries', () => {
    it('grim-d100 uk is complete: no missing, stale or orphan entries', () => {
        const status = statusOf(
            catalogOf('grim-d100'),
            readTranslations('grim-d100', 'uk')
        );

        expect({
            missing: status.missing.length,
            stale: status.stale.length,
            orphan: status.orphan.length,
        }).toEqual({ missing: 0, stale: 0, orphan: 0 });
    });

    it('srd-5.2 uk has no stale or orphan entries and no more missing than before the conversion', () => {
        const status = statusOf(
            catalogOf('srd-5.2'),
            readTranslations('srd-5.2', 'uk')
        );

        expect({
            stale: status.stale.length,
            orphan: status.orphan.length,
        }).toEqual({ stale: 0, orphan: 0 });
        expect(status.missing.length).toBeLessThanOrEqual(676);
    });
});
