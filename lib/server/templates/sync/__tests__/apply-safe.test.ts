import { beforeEach, describe, expect, it } from 'vitest';

import { clone, createFakeSyncDb } from './fake-sync-db';
import { id, visible as visibleItems } from './helpers';

import {
    applySafeSourceChanges,
    applySourceChanges,
} from '@/lib/server/templates/sync/apply';
import { classify } from '@/lib/server/templates/sync/classify';
import { loadSyncContext } from '@/lib/server/templates/sync/context';

const SRC = 'src',
    TGT = 'tgt';

const RACE = id('r'),
    UNIT = id('u'),
    SPELL = id('s'),
    NEW_RACE = id('n'),
    IGNORED_RACE = id('i');

let f: ReturnType<typeof createFakeSyncDb>;

const visible = async () =>
    visibleItems(classify(await loadSyncContext(f.db, TGT)));

const rows = (delegate: string) =>
    f.store.get(delegate)!.filter((r) => r.campaignId === TGT);

beforeEach(async () => {
    f = createFakeSyncDb();
    f.addCampaign({ id: SRC, kind: 'template' });
    f.addRow('race', { id: RACE, campaignId: SRC, name: 'Haven' });
    f.addRow('unit', {
        id: UNIT,
        campaignId: SRC,
        name: 'Archer',
        raceId: RACE,
    });
    f.addRow('spell', { id: SPELL, campaignId: SRC, name: 'Bless' });
    await clone(f, SRC, TGT);
});

describe('applySafeSourceChanges', () => {
    const prepare = async () => {
        f.addRow('race', { id: NEW_RACE, campaignId: SRC, name: 'Tower' });
        f.patchRow('unit', UNIT, { name: 'Archer II' });
        f.patchRow('spell', rows('spell')[0].id as string, { name: 'Mine' });
        f.patchRow('spell', SPELL, { name: 'Theirs' });
    };

    it('applies new and updated, leaves conflict, second call applies nothing', async () => {
        await prepare();

        const res = await applySafeSourceChanges(f.db, TGT);

        expect(res).toMatchObject({ applied: 2, ignored: 0 });
        expect(
            rows('race')
                .map((r) => r.name)
                .sort()
        ).toEqual(['Haven', 'Tower']);
        expect(rows('unit')[0].name).toBe('Archer II');
        expect(rows('spell')[0].name).toBe('Mine');
        expect((await visible()).map((i) => [i.scope, i.status])).toEqual([
            ['spells', 'conflict'],
        ]);

        expect(await applySafeSourceChanges(f.db, TGT)).toMatchObject({
            applied: 0,
        });
    });

    it('skips ignored items', async () => {
        f.addRow('race', { id: IGNORED_RACE, campaignId: SRC, name: 'Fort' });

        const [item] = await visible();

        await applySourceChanges(f.db, TGT, {
            apply: [],
            ignore: [
                {
                    scope: item.scope,
                    key: item.key,
                    sourceHash: item.sourceHash,
                    status: item.status,
                },
            ],
        });

        expect(await applySafeSourceChanges(f.db, TGT)).toMatchObject({
            applied: 0,
        });
        expect(rows('race').map((r) => r.name)).toEqual(['Haven']);
    });

    it('does not resurrect a locally deleted dependency through an updated row', async () => {
        f.addRow('race', { id: NEW_RACE, campaignId: SRC, name: 'Keep' });
        f.patchRow('unit', UNIT, { raceId: NEW_RACE });
        await applySafeSourceChanges(f.db, TGT);
        f.removeRow(
            'race',
            rows('race').find((r) => r.name === 'Haven')!.id as string
        );
        f.patchRow('unit', UNIT, { name: 'Archer III', raceId: RACE });

        expect(await applySafeSourceChanges(f.db, TGT)).toMatchObject({
            applied: 0,
            autoAdded: [],
        });
        expect(rows('race').map((r) => r.name)).toEqual(['Keep']);
        expect(rows('unit')[0].name).toBe('Archer');
    });

    it('does not clear the ignore mark of a new dependency', async () => {
        f.addRow('race', { id: IGNORED_RACE, campaignId: SRC, name: 'Fort' });
        f.patchRow('unit', UNIT, { name: 'Archer II', raceId: IGNORED_RACE });

        const fort = (await visible()).find((i) => i.scope === 'races')!;

        await applySourceChanges(f.db, TGT, {
            apply: [],
            ignore: [
                {
                    scope: fort.scope,
                    key: fort.key,
                    sourceHash: fort.sourceHash,
                    status: fort.status,
                },
            ],
        });

        expect(await applySafeSourceChanges(f.db, TGT)).toMatchObject({
            applied: 0,
        });
        expect(rows('race').map((r) => r.name)).toEqual(['Haven']);
    });

    it('does nothing on a clean clone', async () => {
        expect(await applySafeSourceChanges(f.db, TGT)).toMatchObject({
            applied: 0,
        });
    });
});
