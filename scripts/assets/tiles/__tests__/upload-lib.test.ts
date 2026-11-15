import { describe, expect, it } from 'vitest';

import {
    assertLocalStorageTarget,
    createTileObjectPath,
    parseTileUploadArgs,
    planTileUploads,
} from '../upload-lib';

describe('parseTileUploadArgs', () => {
    it('parses a campaign upload and its object footprint', () => {
        expect(
            parseTileUploadArgs([
                './pilot/objects',
                '--kind',
                'object',
                '--campaign',
                'camp-1',
                '--footprint',
                '2x1',
                '--upload',
            ])
        ).toEqual({
            directory: './pilot/objects',
            kind: 'object',
            campaignId: 'camp-1',
            footprint: { cols: 2, rows: 1 },
            upload: true,
        });
    });

    it('defaults to validation-only and accepts a global asset target', () => {
        expect(
            parseTileUploadArgs([
                './pilot/ground',
                '--kind',
                'ground',
                '--global',
            ])
        ).toMatchObject({
            directory: './pilot/ground',
            kind: 'ground',
            global: true,
            upload: false,
        });
    });

    it('rejects remote-write switches and conflicting destinations', () => {
        expect(() =>
            parseTileUploadArgs([
                './pilot',
                '--kind',
                'ground',
                '--campaign',
                'camp-1',
                '--global',
            ])
        ).toThrow(/вкажіть одну ціль/i);
        expect(() =>
            parseTileUploadArgs([
                './pilot',
                '--kind',
                'ground',
                '--campaign',
                'camp-1',
                '--allow-remote',
            ])
        ).toThrow(/production/i);
    });

    it('rejects object footprints outside the supported maximum', () => {
        expect(() =>
            parseTileUploadArgs([
                './pilot',
                '--kind',
                'object',
                '--campaign',
                'camp-1',
                '--footprint',
                '3x1',
            ])
        ).toThrow(/від 1x1 до 2x2/i);
    });
});

describe('createTileObjectPath', () => {
    it('uses a content hash so a changed image receives a new immutable URL', () => {
        expect(
            createTileObjectPath({
                campaignId: 'camp-1',
                kind: 'ground',
                fileName: 'tiles_stone-floor_1.png',
                bytes: Buffer.from('one'),
            })
        ).toMatch(/^camp-1\/ground\/[a-f0-9]{16}-tiles_stone-floor_1\.png$/);
        expect(
            createTileObjectPath({
                global: true,
                kind: 'ground',
                fileName: 'tiles_stone-floor_1.png',
                bytes: Buffer.from('two'),
            })
        ).toMatch(/^global\/ground\/[a-f0-9]{16}-tiles_stone-floor_1\.png$/);
    });

    it('rejects ambiguous object path targets', () => {
        expect(() =>
            createTileObjectPath({
                campaignId: 'camp-1',
                global: true,
                kind: 'ground',
                fileName: 'tiles_stone-floor_1.png',
                bytes: Buffer.from('one'),
            })
        ).toThrow(/одну ціль/i);
    });
});

describe('assertLocalStorageTarget', () => {
    it('allows loopback Supabase and refuses remote storage hosts', () => {
        expect(assertLocalStorageTarget('http://127.0.0.1:54321')).toBe(
            '127.0.0.1'
        );
        expect(() =>
            assertLocalStorageTarget('https://example.supabase.co')
        ).toThrow(/лише localhost/i);
    });
});

describe('planTileUploads', () => {
    it('counts only new immutable objects against the campaign budget', () => {
        const plan = planTileUploads(
            [
                { objectPath: 'camp-1/ground/a.png', bytes: Buffer.alloc(100) },
                { objectPath: 'camp-1/ground/b.png', bytes: Buffer.alloc(200) },
            ],
            new Set(['camp-1/ground/a.png'])
        );

        expect(plan.uploads.map((asset) => asset.objectPath)).toEqual([
            'camp-1/ground/b.png',
        ]);
        expect(plan.additionalBytes).toBe(200);
    });
});
