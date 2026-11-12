import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import {
    bucketOf,
    ICON_SIZE_BY_KIND,
    planIconUploads,
    uploadIcons,
} from '../lib/icons-upload';
import { readPack } from '../lib/pack';

const fixtures = path.join(__dirname, 'fixtures');

describe('icon upload planning', () => {
    const pack = readPack('fixture-pack', fixtures);

    it('plans one <kind>/<slug>.png per row of kinds that have a bucket', () => {
        const plan = planIconUploads(pack, '/icons');

        expect(plan.map((p) => `${p.kind}/${p.slug}`)).toEqual([
            'spells/fix-fire-bolt',
            'spells/fix-bless',
            'feats/fix-alert',
            'feats/fix-archery',
        ]);
        expect(plan[0].file).toBe('/icons/spells/fix-fire-bolt.png');
        expect(
            planIconUploads(pack, '/icons', ['feats']).map((p) => p.kind)
        ).toEqual(['feats', 'feats']);
    });

    it('takes the bucket from the manifest override, then the defaults; units are larger', () => {
        expect(bucketOf(pack, 'spells')).toBe('spell-icons');
        expect(bucketOf(pack, 'feats')).toBe('feat-icons');
        expect(
            bucketOf(
                {
                    ...pack,
                    manifest: {
                        ...pack.manifest,
                        icons: { bucketByKind: { spells: 'skill-icons' } },
                    },
                },
                'spells'
            )
        ).toBe('skill-icons');
        expect(bucketOf(pack, 'spell-groups')).toBeUndefined();
        expect([
            ICON_SIZE_BY_KIND('units'),
            ICON_SIZE_BY_KIND('feats'),
        ]).toEqual([384, 256]);
    });

    it('grim-d100: the planned files are the ones the prompt generator names, with the career and feat buckets', async () => {
        const grim = readPack('grim-d100');

        const { grimPromptRows } = await import(
            '../../assets/grim-icons/prompts'
        );

        const { WFRP_ROW_KINDS, wfrpDataOf } = await import(
            '../systems/wfrp/common'
        );

        const readSubject = (name: string) =>
            JSON.parse(
                fs.readFileSync(
                    path.join(
                        __dirname,
                        '../../assets/icon-subjects',
                        `grim-${name}.json`
                    ),
                    'utf8'
                )
            );

        const prompts = grimPromptRows(wfrpDataOf(grim), {
            units: readSubject('units'),
            spells: readSubject('spells'),
            artifacts: readSubject('artifacts'),
            identity: readSubject('identity'),
        });

        expect(
            planIconUploads(grim, '/i')
                .map((p) => path.relative('/i', p.file))
                .sort()
        ).toEqual(prompts.map((p) => p.file).sort());
        expect(WFRP_ROW_KINDS.map((kind) => bucketOf(grim, kind))).toEqual([
            'feat-icons',
            'career-icons',
            'race-icons',
            'spell-icons',
            'unit-icons',
            'artifact-icons',
        ]);
    });

    it('--dry-run converts the present files, counts the missing ones and writes nothing', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-dry-'));

        try {
            fs.mkdirSync(path.join(dir, 'feats'));
            fs.writeFileSync(
                path.join(dir, 'feats', 'fix-alert.png'),
                await sharp({
                    create: {
                        width: 8,
                        height: 8,
                        channels: 3,
                        background: '#fff',
                    },
                })
                    .png()
                    .toBuffer()
            );
            vi.spyOn(console, 'info').mockImplementation(() => undefined);
            vi.spyOn(console, 'warn').mockImplementation(() => undefined);

            const before = fs.readFileSync(
                path.join(fixtures, 'fixture-pack', 'icons.json'),
                'utf8'
            );

            expect(
                await uploadIcons('fixture-pack', {
                    dir,
                    dryRun: true,
                    templatesDir: fixtures,
                })
            ).toEqual({ uploaded: 1, skipped: 3 });
            expect(
                fs.readFileSync(
                    path.join(fixtures, 'fixture-pack', 'icons.json'),
                    'utf8'
                )
            ).toBe(before);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
