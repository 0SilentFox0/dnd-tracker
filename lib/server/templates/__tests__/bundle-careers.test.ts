import { describe, expect, it } from 'vitest';

import {
    type Bundle,
    BUNDLE_TABLES,
    BundleSchema,
    emptyBundle,
    pick,
} from '../bundle';
import { exportCampaign } from '../export-campaign';
import { importBundle } from '../import-bundle';
import { rowHash } from '../sync/hash';
import { createFakeDb } from './fake-db';

import { SYNC_TABLE_SCOPES } from '@/lib/constants/source-sync';
import { hashJson } from '@/lib/utils/battle/store/stable-json';

const id = (c: string) => 'c' + c.repeat(24);

const FT = id('f'),
    C1 = id('1'),
    C2 = id('2'),
    RC = id('r');

const tiers = (talent: string) => [{ name: 'Apprentice', talents: [talent] }];

describe('bundle: careers table', () => {
    it('careers right after feats, in sync scopes', () => {
        const keys = BUNDLE_TABLES.map((t) => t.key);

        expect(keys.indexOf('careers')).toBe(keys.indexOf('feats') + 1);
        expect(BUNDLE_TABLES.find((t) => t.key === 'careers')).toMatchObject({
            model: 'Career',
            delegate: 'career',
        });
        expect(SYNC_TABLE_SCOPES).toContain('careers');
    });

    it('an older bundle without careers still parses', () => {
        const old: Record<string, unknown> = { ...emptyBundle() };

        delete old.careers;

        expect((BundleSchema.parse(old) as Bundle).careers).toEqual([]);
    });

    it('exports and imports careers, remapping talent ids in tiers and in a species profile', async () => {
        const source = createFakeDb();

        source.store.get('feat')!.push({
            id: FT,
            campaignId: 'src',
            name: 'Alert',
            type: 'general',
        });
        source.store.get('career')!.push(
            {
                id: C1,
                campaignId: 'src',
                name: 'Soldier',
                tiers: tiers(FT),
            },
            { id: C2, campaignId: 'src', name: 'Scribe', tiers: [] }
        );
        source.store.get('race')!.push({
            id: RC,
            campaignId: 'src',
            name: 'Elf',
            profile: {
                careerTable: [{ max: 100, careerId: C1 }],
                talents: [FT],
            },
        });

        const bundle = await exportCampaign(source.db, 'src');

        expect(bundle.careers.map((r) => r.id).sort()).toEqual([C1, C2].sort());

        const target = createFakeDb();

        const { idMap } = await importBundle(target.db, bundle, 'dst');

        const career = target.store
            .get('career')!
            .find((r) => r.name === 'Soldier')!;

        expect(career).toMatchObject({
            campaignId: 'dst',
            id: idMap.get(C1),
            sourceId: C1,
        });
        expect(career.tiers).toEqual(tiers(idMap.get(FT)!));

        expect(target.store.get('race')![0].profile).toEqual({
            careerTable: [{ max: 100, careerId: idMap.get(C1) }],
            talents: [idMap.get(FT)],
        });
    });
});

const PRE_PROFILE_HASH = '232c56863386a92ff46b2c498307ab2ceda1a4bb';

describe('rowHash stability for species', () => {
    const races = BUNDLE_TABLES.find((t) => t.key === 'races')!;

    it('a null or absent profile hashes like a row without the column', () => {
        const row = { id: RC, name: 'Human', icon: null };

        const legacy = hashJson(
            pick(
                row,
                races.columns.filter((c) => c !== 'profile')
            )
        );

        expect(legacy).toBe(PRE_PROFILE_HASH);
        expect(rowHash({ ...row, profile: null }, races)).toBe(
            PRE_PROFILE_HASH
        );
        expect(rowHash(row, races)).toBe(PRE_PROFILE_HASH);
        expect(rowHash({ ...row, profile: { move: 4 } }, races)).not.toBe(
            rowHash(row, races)
        );
    });
});
