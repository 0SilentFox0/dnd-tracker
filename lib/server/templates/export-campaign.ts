import {
    type Bundle,
    BUNDLE_TABLES,
    BundleInvalidError,
    type BundleTableDef,
    delegateOf,
    pick,
    SETTINGS_SELECT,
    settingsOf,
    type TemplateDb,
} from './bundle';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { bypassLayer } from '@/lib/db/content-layer';
import {
    type CompendiumBundleDb,
    exportCompendiumSection,
} from '@/lib/server/compendium-import/bundle';
import { parseRules } from '@/lib/utils/rules/schema';

type Rows = Array<Record<string, unknown> & { id: string }>;

/** What a campaign adds on top of its base template: overrides (base id → sourceHash) and hidden base rows. */
export interface LocalLayer {
    overrides: Record<string, string | null>;
    hides: Array<{ table: string; id: string }>;
}

const storedRows = (
    db: TemplateDb,
    t: BundleTableDef,
    campaignId: string,
    extra: readonly string[] = []
) =>
    delegateOf(db, t).findMany({
        where: { campaignId },
        select: Object.fromEntries(
            [...t.columns, ...extra].map((c) => [c, true])
        ),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }) as Promise<Rows>;

async function build(
    db: TemplateDb,
    campaignId: string,
    rowsOf: (t: BundleTableDef) => Promise<Rows>
): Promise<Bundle> {
    const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        select: { ...SETTINGS_SELECT, rules: true, credits: true },
    });

    if (!campaign) throw new BundleInvalidError(API_ERRORS.CAMPAIGN_NOT_FOUND);

    const bundle: Record<string, unknown> = {
        formatVersion: 1,
        settings: settingsOf(campaign),
        rules: parseRules(campaign.rules),
        credits: campaign.credits ?? null,
    };

    for (const t of BUNDLE_TABLES) bundle[t.key] = await rowsOf(t);

    if (db.compendiumEntry && db.compendiumSource && db.scenarioPage) {
        const section = await exportCompendiumSection(
            db as CompendiumBundleDb,
            campaignId
        );

        if (section) bundle.compendium = section;
    }

    return bundle as Bundle;
}

/** Rows as the campaign sees them (base layer included for a layered campaign). */
export const exportCampaign = (
    db: TemplateDb,
    campaignId: string
): Promise<Bundle> =>
    build(db, campaignId, async (t) =>
        (await storedRows(db, t, campaignId)).map(
            (row) => pick(row, t.columns) as Rows[number]
        )
    );

/** Settings, rules, credits and compendium only: the content tables of a published template are read through the layer. */
export const exportSkeleton = (
    db: TemplateDb,
    campaignId: string
): Promise<Bundle> => build(db, campaignId, async () => []);

/** Stored rows of a layered campaign only. An override row carries its base id (the id the layer exposes). */
export async function exportLocalLayer(
    db: TemplateDb,
    campaignId: string
): Promise<{ bundle: Bundle; layer: LocalLayer }> {
    const overrides: LocalLayer['overrides'] = {};

    const bundle = await bypassLayer(() =>
        build(db, campaignId, async (t) =>
            (
                await storedRows(db, t, campaignId, ['sourceId', 'sourceHash'])
            ).map((row) => {
                const baseId = row.sourceId as string | null;

                if (baseId)
                    overrides[baseId] =
                        (row.sourceHash as string | null) ?? null;

                return {
                    ...pick(row, t.columns),
                    id: baseId ?? row.id,
                } as Rows[number];
            })
        )
    );

    const hides =
        (await db.campaignContentHide?.findMany({
            where: { campaignId },
            select: { table: true, id: true },
        })) ?? [];

    return { bundle, layer: { overrides, hides } };
}
