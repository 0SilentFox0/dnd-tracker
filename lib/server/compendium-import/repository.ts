import {
    autoBindDependencies,
    bindingRefs,
    boundEntryFactory,
    existingEntriesOf,
    explicitBindings,
    loadProvenance,
    sourceFields,
} from './repository/binding';
import { loadNames, loadRows } from './repository/load';
import { domainSchemas } from './domain-schemas';
import { digest } from './identity';
import { ADAPTER_VERSION } from './plan';
import type { CompendiumReport, ImportRepository } from './service';
import type { TargetKind } from './types';

import 'server-only';
import { invalidateAllReference } from '@/lib/cache/tags';
import { prisma } from '@/lib/db';
import { updateCampaignRules } from '@/lib/server/campaigns/rules';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import { withCampaignContentWrite } from '@/lib/server/content/write';
import { afterContentCommit } from '@/lib/server/content/write-context';
import { contentWrite } from '@/lib/server/scenario/content-write';
import { snapshotIfDue } from '@/lib/server/scenario/versions';
import { newContentId } from '@/lib/server/templates/ids';
import { asRecord, fromJson, jsonContentInput } from '@/lib/utils/common/json';
import {
    CompendiumError,
    normalized,
} from '@/lib/utils/compendium-import/parse';
import { parseRules } from '@/lib/utils/rules/schema';
import { contentKindsOf } from '@/lib/utils/rules/systems/catalog';
import type { ScenarioContent } from '@/types/scenario';

export const prismaImportRepository: ImportRepository = {
    async authorize(actor) {
        if (!actor.isDM || actor.via !== 'session')
            throw new CompendiumError('FORBIDDEN');

        const found = await prisma.campaign.findFirst({
            where: {
                id: actor.campaignId,
                OR: [
                    { dmUserId: actor.userId },
                    { members: { some: { userId: actor.userId, role: 'dm' } } },
                ],
            },
            select: { id: true },
        });

        if (!found) throw new CompendiumError('FORBIDDEN');
    },
    async loadContext(actor, input, adaptedEntries = []) {
        const settings = await prisma.campaign.findUniqueOrThrow({
            where: { id: actor.campaignId },
            select: { rules: true, credits: true },
        });

        const hasCharacters =
            (await prisma.character.count({
                where: { campaignId: actor.campaignId },
            })) > 0;

        const hasClasses =
            (await prisma.gameClass.count({
                where: { campaignId: actor.campaignId },
            })) > 0;

        const provenance = await loadProvenance(actor.campaignId);

        const rows = await loadRows(actor.campaignId, [
            ...provenance.map((entry) => ({
                kind: entry.kind as TargetKind,
                id: entry.localId,
            })),
            ...provenance.flatMap(bindingRefs),
            ...Object.values(input.bindings ?? {}),
        ]);

        const existing = existingEntriesOf(provenance, rows);

        const boundEntry = boundEntryFactory(existing);

        const bindings = explicitBindings(provenance, input, rows, boundEntry);

        const occupiedNames = await loadNames(actor.campaignId);

        const extraEntries = await autoBindDependencies({
            campaignId: actor.campaignId,
            input,
            adaptedEntries,
            provenance,
            existing,
            occupiedNames,
            bindings,
            boundEntry,
        });

        const parsed = parseRules(settings.rules);

        return {
            campaignId: actor.campaignId,
            existing,
            bindings,
            occupiedNames,
            extraEntries,
            settingsHash: digest(settings),
            hasCharacters,
            hasClasses,
            classesEnabled: parsed.classes.enabled,
            customConditionKeys: (parsed.conditions.custom ?? []).map(
                (c) => c.key
            ),
            activeKinds: contentKindsOf(parsed.system),
        };
    },
    async findRun(actor, key) {
        const run = await prisma.compendiumImportRun.findUnique({
            where: {
                campaignId_idempotencyKey: {
                    campaignId: actor.campaignId,
                    idempotencyKey: key,
                },
            },
        });

        return run
            ? {
                  requestHash: run.planHash,
                  report: fromJson<CompendiumReport>(run.report),
              }
            : undefined;
    },
    transaction: (actor, callback) =>
        withCampaignContentWrite(actor.campaignId, () =>
            callback(prismaImportRepository)
        ),
    async write(actor, row) {
        if (row.kind === 'scenarioPages') {
            const body = domainSchemas.scenarioPages!.parse(row.body) as {
                kind: string;
                title: string;
                content: ScenarioContent;
            };

            if (row.operation === 'update') {
                await snapshotIfDue(prisma, row.localId, actor.userId, {
                    force: true,
                });

                const current = await prisma.scenarioPage.findFirst({
                    where: { campaignId: actor.campaignId, id: row.localId },
                });

                if (!current) throw new CompendiumError('TARGET_MISSING');

                await prisma.scenarioPage.update({
                    where: { id: current.id },
                    data: {
                        title: body.title,
                        ...contentWrite(body.title, body.content),
                        version: { increment: 1 },
                    },
                });

                return current.id;
            }

            const page = await prisma.scenarioPage.create({
                data: {
                    campaignId: actor.campaignId,
                    kind: 'note',
                    status: 'draft',
                    characterId: null,
                    title: body.title,
                    ...contentWrite(body.title, body.content),
                },
            });

            return page.id;
        }

        const resource = CONTENT_RESOURCES[row.kind] as AnyContentResource;

        const current =
            row.operation === 'update'
                ? await resource.find(actor, row.localId, 'write')
                : null;

        if (row.operation === 'update' && !current)
            throw new CompendiumError('TARGET_MISSING');

        const result = current
            ? await resource.update(
                  actor,
                  current,
                  resource.schemas.update.parse(row.body)
              )
            : await resource.create(
                  actor,
                  resource.schemas.create.parse(row.body)
              );

        return String(asRecord(result).id);
    },
    async saveEntry(actor, row) {
        const data = {
            kind: row.kind,
            localId: row.localId,
            locator: jsonContentInput(row.nested ? row.body : []),
            edition: row.edition,
            sourceJson: row.source,
            originalName: row.name,
            attribution: jsonContentInput(
                row.media?.length
                    ? {
                          ...row.attribution,
                          images: row.media.map(({ url, role, mediaId }) => ({
                              url,
                              role,
                              ...(mediaId && { mediaId }),
                          })),
                      }
                    : (row.attribution ?? {})
            ),
            inputHash: digest(row.baseline ?? row.body),
            adapterVersion: ADAPTER_VERSION,
            baseline: jsonContentInput(row.baseline ?? row.body),
            notes: row.notes,
            issues: jsonContentInput(row.issues),
            bindings: jsonContentInput(row.resolvedBindings ?? {}),
        };

        await prisma.compendiumEntry.upsert({
            where: {
                campaignId_canonicalKey: {
                    campaignId: actor.campaignId,
                    canonicalKey: row.key,
                },
            },
            create: {
                campaignId: actor.campaignId,
                canonicalKey: row.key,
                ...data,
            },
            update: data,
        });
    },
    async saveSources(actor, sources) {
        const credits: string[] = [];

        for (const source of sources) {
            const metadata = Object.fromEntries(
                Object.entries(source).filter(([k]) => sourceFields.has(k))
            );

            if (typeof source.json !== 'string') continue;

            const sourceJson = normalized(source.json);

            await prisma.compendiumSource.upsert({
                where: {
                    campaignId_sourceJson: {
                        campaignId: actor.campaignId,
                        sourceJson,
                    },
                },
                create: {
                    campaignId: actor.campaignId,
                    sourceJson,
                    metadata: jsonContentInput(metadata),
                },
                update: { metadata: jsonContentInput(metadata) },
            });
            credits.push(
                [
                    source.full ?? source.json,
                    Array.isArray(source.authors)
                        ? source.authors.join(', ')
                        : '',
                    source.version ?? '',
                ]
                    .filter(Boolean)
                    .join(' — ')
            );
        }

        if (credits.length) {
            const campaign = await prisma.campaign.findUniqueOrThrow({
                where: { id: actor.campaignId },
                select: { credits: true },
            });

            const next = [
                campaign.credits ?? '',
                ...credits.filter(
                    (credit) =>
                        !(campaign.credits ?? '').split('\n').includes(credit)
                ),
            ]
                .filter(Boolean)
                .join('\n');

            if (next.length > 10_000) throw new CompendiumError('CREDITS_SIZE');

            await prisma.campaign.update({
                where: { id: actor.campaignId },
                data: { credits: next },
            });
        }
    },
    async saveRun(actor, key, requestHash, report) {
        const id = newContentId();

        report.runId = id;
        await prisma.compendiumImportRun.create({
            data: {
                id,
                campaignId: actor.campaignId,
                userId: actor.userId,
                idempotencyKey: key,
                planHash: requestHash,
                report: jsonContentInput(report),
            },
        });
        afterContentCommit(() => invalidateAllReference(actor.campaignId));
    },
    applyRules: async (actor, patch) => {
        await updateCampaignRules(actor, patch);
    },
};

export { kindTable, nativeBody } from './repository/load';
