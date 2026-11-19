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

const seed = (
    store: Map<string, Record<string, unknown>[]>,
    table: string,
    row: Record<string, unknown>
) => store.get(table)!.push({ campaignId: 'target', ...row });

const bgBundle = () =>
    bundleOf({
        backgrounds: [
            { id: BG, name: 'Sage', originFeatId: SRC_FEAT, choices: [] },
        ],
    });

const unitBundle = () =>
    bundleOf({
        units: [{ id: UNIT, name: 'u', raceId: SRC_RACE, slug: 'u-slug' }],
    });

describe('importBundle options', () => {
    it('reuse maps the reference to the existing target row without writing it', async () => {
        const { db, store } = createFakeDb();

        seed(store, 'race', { id: TGT_RACE });

        const reuse = new Map([[SRC_RACE, TGT_RACE]]);

        const { warnings } = await importBundle(
            db,
            unitBundle(),
            'target',
            undefined,
            { reuse }
        );

        expect(warnings).toEqual([]);
        expect(store.get('race')).toHaveLength(1);
        expect(store.get('unit')![0].raceId).toBe(TGT_RACE);
    });

    it('reuse ids are not reported as foreign content', async () => {
        const { db, store } = createFakeDb();

        store.get('race')!.push({ id: SRC_RACE, campaignId: 'other' });
        seed(store, 'race', { id: TGT_RACE });

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

        seed(store, 'race', { id: TGT_RACE });

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
        const bundle = bgBundle();

        const { db, store } = createFakeDb();

        seed(store, 'feat', { id: TGT_FEAT, type: 'origin' });

        await importBundle(db, bundle, 'target', undefined, {
            reuse: new Map([[SRC_FEAT, TGT_FEAT]]),
        });

        expect(store.get('background')![0].originFeatId).toBe(TGT_FEAT);
        await expect(
            importBundle(createFakeDb().db, bundle, 'target')
        ).rejects.toBeInstanceOf(BundleInvalidError);
    });

    it('a reused non-origin feat is rejected as originFeatId', async () => {
        const { db, store } = createFakeDb();

        seed(store, 'feat', { id: TGT_FEAT, type: 'general' });

        await expect(
            importBundle(db, bgBundle(), 'target', undefined, {
                reuse: new Map([[SRC_FEAT, TGT_FEAT]]),
            })
        ).rejects.toBeInstanceOf(BundleInvalidError);
    });

    it('a reused race id is rejected as originFeatId', async () => {
        const { db, store } = createFakeDb();

        seed(store, 'race', { id: TGT_RACE });

        await expect(
            importBundle(db, bgBundle(), 'target', undefined, {
                reuse: new Map([[SRC_FEAT, TGT_RACE]]),
            })
        ).rejects.toBeInstanceOf(BundleInvalidError);
    });

    it('a reuse target in another campaign or missing is rejected', async () => {
        const { db, store } = createFakeDb();

        store.get('race')!.push({ id: TGT_RACE, campaignId: 'other' });

        const opts = (to: string) => ({ reuse: new Map([[SRC_RACE, to]]) });

        await expect(
            importBundle(db, unitBundle(), 'target', undefined, opts(TGT_RACE))
        ).rejects.toBeInstanceOf(BundleInvalidError);
        await expect(
            importBundle(db, unitBundle(), 'target', undefined, opts(id('9')))
        ).rejects.toBeInstanceOf(BundleInvalidError);
    });

    it('detached nulls slug on other tables too', async () => {
        const { db, store } = createFakeDb();

        await importBundle(
            db,
            bundleOf({ races: [{ id: SRC_RACE, name: 'r', slug: 'r-slug' }] }),
            'target',
            undefined,
            { detached: true }
        );

        expect(store.get('race')![0]).toMatchObject({
            slug: null,
            sourceId: null,
        });
    });

    it('without options rows keep sourceId and the unknown reference is nulled', async () => {
        const { db, store } = createFakeDb();

        const { warnings } = await importBundle(db, unitBundle(), 'target');

        expect(warnings).toHaveLength(1);
        expect(store.get('unit')![0]).toMatchObject({ sourceId: UNIT });
    });
});
