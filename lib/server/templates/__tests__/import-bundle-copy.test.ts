import { describe, expect, it } from 'vitest';

import { type Bundle, BUNDLE_TABLES, BundleInvalidError } from '../bundle';
import { importBundle } from '../import-bundle';
import { createFakeDb } from './fake-db';

const id = (c: string) => 'c' + c.repeat(24);

const SRC_RACE = id('a'),
    TGT_RACE = id('b'),
    UNIT = id('c'),
    SRC_FEAT = id('d'),
    TGT_FEAT = id('e'),
    BG = id('f');

const bundleOf = (rows: Record<string, unknown[]>): Bundle =>
    ({
        formatVersion: 1,
        settings: {
            maxLevel: 20,
            xpMultiplier: 1,
            allowPlayerEdit: true,
            friendlyFire: false,
        },
        rules: {},
        ...Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, []])),
        ...rows,
    }) as unknown as Bundle;

const unitBundle = () =>
    bundleOf({
        units: [{ id: UNIT, name: 'u', raceId: SRC_RACE, slug: 'u-slug' }],
    });

describe('importBundle options', () => {
    it('reuse maps the reference to the existing target row without writing it', async () => {
        const { db, store } = createFakeDb();

        const reuse = new Map([[SRC_RACE, TGT_RACE]]);

        const { warnings } = await importBundle(
            db,
            unitBundle(),
            'target',
            undefined,
            { reuse }
        );

        expect(warnings).toEqual([]);
        expect(store.get('race')).toEqual([]);
        expect(store.get('unit')![0].raceId).toBe(TGT_RACE);
    });

    it('reuse ids are not reported as foreign content', async () => {
        const { db, store } = createFakeDb();

        store.get('race')!.push({ id: SRC_RACE, campaignId: 'other' });

        await expect(
            importBundle(db, unitBundle(), 'target', undefined, {
                reuse: new Map([[SRC_RACE, TGT_RACE]]),
            })
        ).resolves.toBeDefined();
        await expect(
            importBundle(db, unitBundle(), 'target')
        ).rejects.toBeInstanceOf(BundleInvalidError);
    });

    it('detached rows carry no sourceId, sourceHash or slug', async () => {
        const { db, store } = createFakeDb();

        await importBundle(db, unitBundle(), 'target', undefined, {
            detached: true,
            reuse: new Map([[SRC_RACE, TGT_RACE]]),
        });

        expect(store.get('unit')![0]).toMatchObject({
            sourceId: null,
            sourceHash: null,
            slug: null,
        });
    });

    it('background originFeatId in reuse passes the reference check', async () => {
        const bundle = bundleOf({
            backgrounds: [
                { id: BG, name: 'Sage', originFeatId: SRC_FEAT, choices: [] },
            ],
        });

        const { db, store } = createFakeDb();

        await importBundle(db, bundle, 'target', undefined, {
            reuse: new Map([[SRC_FEAT, TGT_FEAT]]),
        });

        expect(store.get('background')![0].originFeatId).toBe(TGT_FEAT);
        await expect(
            importBundle(createFakeDb().db, bundle, 'target')
        ).rejects.toBeInstanceOf(BundleInvalidError);
    });

    it('without options rows keep sourceId and the unknown reference is nulled', async () => {
        const { db, store } = createFakeDb();

        const { warnings } = await importBundle(db, unitBundle(), 'target');

        expect(warnings).toHaveLength(1);
        expect(store.get('unit')![0]).toMatchObject({ sourceId: UNIT });
    });
});
