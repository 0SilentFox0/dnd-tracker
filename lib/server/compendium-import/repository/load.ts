import { matchTemplateRows } from '../auto-bind';
import { type TemplateSnapshot } from '../dependencies';
import { domainSchemas } from '../domain-schemas';
import type { DependencyChoice } from '../service';
import type { TargetKind } from '../types';

import 'server-only';
import { CampaignKind, CampaignVisibility } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import { BUNDLE_TABLES, delegateOf } from '@/lib/server/templates/bundle';
import { templateLocaleWhere } from '@/lib/server/templates/locale-filter';
import { armorStatsFromRow } from '@/lib/utils/artifacts/armor-stats';
import { weaponStatsFromRow } from '@/lib/utils/artifacts/weapon-stats';
import { asRecord, fromJson } from '@/lib/utils/common/json';
import {
    CompendiumError,
    type JsonRecord,
} from '@/lib/utils/compendium-import/parse';
import { itemStatsFromRow } from '@/lib/utils/items/item-row';
import {
    compendiumTemplateKeys,
    templateKeyWhere,
} from '@/lib/utils/templates/registry';

export const kindTable = {
    'spell-groups': 'spellGroups',
    spells: 'spells',
    units: 'units',
    artifacts: 'artifacts',
    races: 'races',
    classes: 'classes',
    feats: 'feats',
    backgrounds: 'backgrounds',
} as const;

export function nativeBody(kind: TargetKind, raw: JsonRecord): JsonRecord {
    const resource =
        kind !== 'scenarioPages'
            ? (CONTENT_RESOURCES[kind] as AnyContentResource)
            : undefined;

    let body =
        kind === 'scenarioPages'
            ? raw
            : asRecord(resource?.toItem?.(raw) ?? raw);

    if (kind === 'artifacts')
        body = {
            ...body,
            weapon: weaponStatsFromRow(raw),
            armor: armorStatsFromRow(raw),
            item: itemStatsFromRow(raw),
        };

    const parsed = domainSchemas[kind]?.safeParse(body);

    return parsed?.success ? (parsed.data as JsonRecord) : body;
}

const tableOf = (key: string) => BUNDLE_TABLES.find((t) => t.key === key)!;

type DomainRows = Map<TargetKind, Map<string, JsonRecord>>;

export async function addOfficialTemplateChoices(
    choices: DependencyChoice[],
    stillPending: Parameters<typeof matchTemplateRows>[0],
    allowMixedEdition: boolean | undefined
) {
    const official = await prisma.campaign.findMany({
        where: {
            kind: CampaignKind.TEMPLATE,
            visibility: CampaignVisibility.OFFICIAL,
            AND: [
                templateKeyWhere(compendiumTemplateKeys()),
                templateLocaleWhere(),
            ],
        },
        select: { id: true },
    });

    for (const template of official) {
        const names = await loadNames(template.id);

        for (const p of matchTemplateRows(
            stillPending,
            names,
            allowMixedEdition
        )) {
            if (!choices.some((c) => c.refKey === p.key))
                choices.push({
                    refKey: p.key,
                    templateId: template.id,
                    kind: p.kind,
                    localId: p.row.id,
                    edition: 'one',
                });
        }
    }
}

export async function loadTemplateSnapshots(
    choices: DependencyChoice[]
): Promise<TemplateSnapshot[]> {
    const templates: TemplateSnapshot[] = [];

    for (const templateId of new Set(choices.map((d) => d.templateId))) {
        const template = await prisma.campaign.findFirst({
            where: {
                id: templateId,
                kind: CampaignKind.TEMPLATE,
                visibility: CampaignVisibility.OFFICIAL,
                AND: [
                    templateKeyWhere(compendiumTemplateKeys()),
                    templateLocaleWhere(),
                ],
            },
            select: { id: true },
        });

        if (!template)
            throw new CompendiumError('DEPENDENCY_TEMPLATE_UNAVAILABLE');

        templates.push({
            id: templateId,
            edition: 'one',
            rows: await loadTemplateRows(templateId),
        });
    }

    return templates;
}

export async function loadNames(campaignId: string) {
    const names: Record<string, Array<{ id: string; name: string }>> = {};

    for (const [kind, key] of Object.entries(kindTable)) {
        const values = await delegateOf(prisma, tableOf(key)).findMany({
            where: { campaignId },
            orderBy: { id: 'asc' },
            select: { id: true, name: true },
        });

        names[kind] = values.map((r) => ({
            id: String(r.id),
            name: String(r.name),
        }));
    }

    const pages = await prisma.scenarioPage.findMany({
        where: { campaignId },
        orderBy: { id: 'asc' },
        select: { id: true, title: true },
    });

    names.scenarioPages = pages.map((r) => ({
        id: r.id,
        name: String(r.title),
    }));

    return names;
}

export async function loadRows(
    campaignId: string,
    refs: Iterable<{ kind: TargetKind; id: string }>
) {
    const wanted = new Map<TargetKind, Set<string>>();

    for (const { kind, id } of refs)
        wanted.set(kind, (wanted.get(kind) ?? new Set()).add(id));

    const rows: DomainRows = new Map();

    for (const [kind, ids] of wanted) {
        if (kind !== 'scenarioPages' && !(kind in kindTable)) continue;

        const where = { campaignId, id: { in: [...ids] } };

        const values =
            kind === 'scenarioPages'
                ? fromJson<JsonRecord[]>(
                      await prisma.scenarioPage.findMany({ where })
                  )
                : await delegateOf(
                      prisma,
                      tableOf(kindTable[kind as keyof typeof kindTable])
                  ).findMany({ where });

        rows.set(kind, new Map(values.map((r) => [String(r.id), r])));
    }

    return rows;
}

async function loadTemplateRows(templateId: string) {
    const rows = await Promise.all(
        Object.entries(kindTable).map(async ([kind, key]) => {
            const values = await delegateOf(prisma, tableOf(key)).findMany({
                where: { campaignId: templateId },
                orderBy: { id: 'asc' },
            });

            return values.map((r) => ({
                id: String(r.id),
                kind: kind as TargetKind,
                body: nativeBody(kind as TargetKind, r),
            }));
        })
    );

    return rows.flat();
}
