import { beforeEach, describe, expect, it } from 'vitest';

import { clone, createFakeSyncDb } from './fake-sync-db';
import { id, visible as visibleItems } from './helpers';

import { applySourceChanges } from '@/lib/server/templates/sync/apply';
import { classify } from '@/lib/server/templates/sync/classify';
import { loadSyncContext } from '@/lib/server/templates/sync/context';
import type { SyncRef } from '@/types/campaigns';

const SRC = 'src',
    TGT = 'tgt';

const RACE = id('r'),
    CAREER = id('c'),
    FEAT = id('f'),
    ARTIFACT = id('a');

let f: ReturnType<typeof createFakeSyncDb>;

const visible = async () =>
    visibleItems(classify(await loadSyncContext(f.db, TGT)));

const ref = (i: SyncRef) => ({
    scope: i.scope,
    key: i.key,
    sourceHash: i.sourceHash,
    status: i.status,
});

const rows = (delegate: string) =>
    f.store.get(delegate)!.filter((r) => r.campaignId === TGT);

const syncScope = async (scope: string) =>
    applySourceChanges(f.db, TGT, {
        apply: (await visible()).filter((i) => i.scope === scope).map(ref),
        ignore: [],
    });

const profileWith = (extra: Record<string, unknown>) => ({
    talents: [],
    randomTalents: [],
    careerTable: [],
    ...extra,
});

beforeEach(async () => {
    f = createFakeSyncDb();
    f.addCampaign({ id: SRC, kind: 'template' });
    f.addRow('race', { id: RACE, campaignId: SRC, name: 'Human' });
    f.addRow('career', {
        id: CAREER,
        campaignId: SRC,
        name: 'Scribe',
        tiers: [],
    });
    f.addRow('feat', {
        id: FEAT,
        campaignId: SRC,
        name: 'Hardy',
        type: 'general',
    });
    f.addRow('artifact', {
        id: ARTIFACT,
        campaignId: SRC,
        name: 'Crown',
        modifiers: [],
    });
    await clone(f, SRC, TGT);
});

describe('career/feat ref-integrity in sync', () => {
    it('keeps a career listed in a species careerTable and warns', async () => {
        const local = rows('career')[0].id as string;

        f.patchRow('race', rows('race')[0].id as string, {
            profile: profileWith({
                careerTable: [{ max: 100, careerId: local }],
            }),
        });
        f.removeRow('career', CAREER);

        const result = await syncScope('careers');

        expect(rows('career')).toHaveLength(1);
        expect(result.warnings).toEqual([expect.stringContaining('Scribe')]);
    });

    it('keeps a career held by a character', async () => {
        const local = rows('career')[0].id as string;

        f.addRow('character', {
            id: id('h'),
            campaignId: TGT,
            characteristics: {
                career: { careerId: local, tier: 1, ticks: [] },
            },
        });
        f.removeRow('career', CAREER);

        const result = await syncScope('careers');

        expect(rows('career')).toHaveLength(1);
        expect(result.warnings).toEqual([expect.stringContaining('Scribe')]);
    });

    it('keeps a feat listed in a career tier', async () => {
        const localFeat = rows('feat')[0].id as string;

        f.patchRow('career', rows('career')[0].id as string, {
            tiers: [{ talents: [localFeat] }],
        });
        f.removeRow('feat', FEAT);

        const result = await syncScope('feats');

        expect(rows('feat')).toHaveLength(1);
        expect(result.warnings).toEqual([expect.stringContaining('Hardy')]);
    });

    it.each(['equipped', 'backpack', 'stash'] as const)(
        'keeps an artifact held in a character %s and warns',
        async (slot) => {
            const local = rows('artifact')[0].id as string;

            const held = {
                equipped: {},
                backpack: [],
                stash: [],
                [slot]:
                    slot === 'equipped'
                        ? { head: { artifactId: local } }
                        : [{ artifactId: local }],
            };

            f.addRow('characterInventory', {
                id: id('i'),
                campaignId: TGT,
                characterId: id('h'),
                ...held,
            });
            f.removeRow('artifact', ARTIFACT);

            const result = await syncScope('artifacts');

            expect(rows('artifact')).toHaveLength(1);
            expect(result.warnings).toEqual([expect.stringContaining('Crown')]);
        }
    );

    it('deletes an artifact no inventory holds', async () => {
        f.addRow('characterInventory', {
            id: id('i'),
            campaignId: TGT,
            characterId: id('h'),
            equipped: {},
            backpack: [],
            stash: [],
        });
        f.removeRow('artifact', ARTIFACT);

        await syncScope('artifacts');

        expect(rows('artifact')).toEqual([]);
    });

    it('deletes an unreferenced career and feat', async () => {
        f.removeRow('career', CAREER);
        f.removeRow('feat', FEAT);

        const result = await applySourceChanges(f.db, TGT, {
            apply: (await visible()).map(ref),
            ignore: [],
        });

        expect(rows('career')).toEqual([]);
        expect(rows('feat')).toEqual([]);
        expect(result.warnings).toEqual([]);
    });

    it('warns about dangling profile refs without changing the profile', async () => {
        const profile = profileWith({
            careerTable: [{ max: 100, careerId: 'missing' }],
        });

        f.patchRow('race', rows('race')[0].id as string, { profile });

        const result = await applySourceChanges(f.db, TGT, {
            apply: [],
            ignore: [],
        });

        expect(result.warnings).toEqual([expect.stringContaining('dangling')]);
        expect(rows('race')[0].profile).toEqual(profile);
    });
});
