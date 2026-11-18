import { z } from 'zod';

import 'server-only';
import {
    invalidateReference,
    ReferenceKind,
    type ReferenceKindValue,
} from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';
import { listTracks } from '@/lib/server/audio/track-store';
import { assertCampaignRefs } from '@/lib/server/campaigns/campaign-refs';
import {
    loadRules,
    readCampaignRules,
    readCustomConditionUsage,
    updateCampaignRules,
} from '@/lib/server/campaigns/rules';
import { parseSystemData } from '@/lib/server/characters/core/system-fields';
import { assertCan } from '@/lib/server/content/access';
import { detachRefs } from '@/lib/server/content/detach-refs';
import { ContentError, parseInput } from '@/lib/server/content/errors';
import { exampleCsv } from '@/lib/server/content/import/example';
import {
    DEFAULT_DEPS as EXPORT_DEFAULT_DEPS,
    exportCsv,
} from '@/lib/server/content/import/export';
import { importContent } from '@/lib/server/content/import/import-content';
import { loadNames } from '@/lib/server/content/import/names';
import { translateImportReport } from '@/lib/server/content/import/translate-report';
import {
    assertKindActive,
    isKindActive,
} from '@/lib/server/content/kind-active';
import {
    contentOperationById,
    moduleContentOperations,
} from '@/lib/server/content/module-operations';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import {
    assertEffectsInComposition,
    dropForeignConditions,
} from '@/lib/server/content/traits-guard';
import { withCampaignContentWrite } from '@/lib/server/content/write';
import { afterContentCommit } from '@/lib/server/content/write-context';
import { systemContent } from '@/lib/server/systems/registry';
import { exportCampaign } from '@/lib/server/templates/export-campaign';
import { publishTemplate } from '@/lib/server/templates/publish-service';
import {
    applySafeSource,
    applySource,
    getSourceDiff,
} from '@/lib/server/templates/sync/service';
import {
    abilitySpellIds,
    OwnerKind,
    readAbilities,
} from '@/lib/utils/abilities/read';
import type { Actor } from '@/lib/utils/api/actor';
import { localeOrRequest } from '@/lib/utils/api/translate-error';
import { toGameClassData } from '@/lib/utils/characters/classes/row';
import { byName } from '@/lib/utils/common/text';
import { IMPORT_KINDS } from '@/lib/utils/content/import/kinds';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';
import { importUnitsIntoCampaign } from '@/lib/utils/units/import-units';

export type CoreContentOperationId = keyof typeof CONTENT_OPERATIONS;

/** Core ids are typed; module ids are plain strings */
export type ContentOperationId = CoreContentOperationId | (string & {});

const id = z.string().min(1).max(200);

const paths: Partial<
    Record<CoreContentOperationId, Record<string, z.ZodType>>
> = {
    'rules.condition-usage': { slug: id },
    'spells.remove-from-group': { spellId: id },
    'spell-groups.remove-all-spells': { groupId: id },
    'abilities.get': { kind: z.enum(Object.values(OwnerKind)), ownerId: id },
    'content.import': { kind: z.enum(IMPORT_KINDS) },
    'content.export': { kind: z.enum(IMPORT_KINDS) },
    'content.import-example': { kind: z.enum(IMPORT_KINDS) },
};

const operationOf = (operationId: ContentOperationId) => {
    const operation = contentOperationById(operationId);

    if (!operation) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    return operation;
};

export function contentOperationSchema(operationId: ContentOperationId) {
    const operation = operationOf(operationId);

    return z.object({
        ...paths[operationId as CoreContentOperationId],
        ...moduleContentOperations()[operationId]?.pathParams,
        ...(operationId === 'source.diff'
            ? {
                  offset: z.number().int().min(0).default(0),
                  limit: z.number().int().min(1).max(50).default(20),
              }
            : {}),
        ...(operation.body ? { body: operation.body } : {}),
        ...(operation.query ? { query: operation.query.optional() } : {}),
    });
}
export type OperationInput = z.infer<ReturnType<typeof contentOperationSchema>>;

type BodyOf<K extends CoreContentOperationId> =
    (typeof CONTENT_OPERATIONS)[K] extends { body: infer B extends z.ZodType }
        ? z.output<B>
        : never;

// contentOperationSchema already validated the body; this only narrows the type.
const bodyOf = <K extends CoreContentOperationId>(_id: K, body: unknown) =>
    body as BodyOf<K>;

const kindOf = (value: unknown) => value as (typeof IMPORT_KINDS)[number];

type SourceRow = { id: string; name: string };

type AbilitySource = {
    source: string;
    contentKind: string;
    order: number;
    load(where: { campaignId: string }): Promise<SourceRow[]>;
};

const CORE_ABILITY_SOURCES: readonly AbilitySource[] = [
    {
        source: 'race',
        contentKind: 'races',
        order: 20,
        load: (where) =>
            prisma.race.findMany({ where, select: { id: true, name: true } }),
    },
    {
        source: 'artifact',
        contentKind: 'artifacts',
        order: 30,
        load: (where) =>
            prisma.artifact.findMany({
                where,
                select: { id: true, name: true },
            }),
    },
    {
        source: 'unit',
        contentKind: 'units',
        order: 50,
        load: (where) =>
            prisma.unit.findMany({ where, select: { id: true, name: true } }),
    },
    {
        source: 'class',
        contentKind: 'classes',
        order: 60,
        load: (where) =>
            prisma.gameClass.findMany({
                where,
                select: { id: true, name: true },
            }),
    },
    {
        source: 'feat',
        contentKind: 'feats',
        order: 70,
        load: (where) =>
            prisma.feat.findMany({ where, select: { id: true, name: true } }),
    },
];

const abilitySources = (): AbilitySource[] =>
    [
        ...CORE_ABILITY_SOURCES,
        ...Object.entries(systemContent('abilityOwners')).map(
            ([source, owner]) => ({ source, ...owner })
        ),
    ].sort((a, b) => a.order - b.order);

async function owned<T extends { campaignId: string }>(
    row: T | null,
    actor: Actor,
    message: string = API_ERRORS.NOT_FOUND
): Promise<T> {
    if (!row || row.campaignId !== actor.campaignId)
        throw new ContentError(message, 404);

    return row;
}

const invalidate = (actor: Actor, kind: ReferenceKindValue) =>
    afterContentCommit(() => invalidateReference(kind, actor.campaignId));

async function owner(kind: OwnerKind, actor: Actor, ownerId: string) {
    const where = { id: ownerId, campaignId: actor.campaignId };

    switch (kind) {
        case OwnerKind.RACE:
            return prisma.race.findFirst({ where });
        case OwnerKind.ARTIFACT:
            return prisma.artifact.findFirst({ where });
        case OwnerKind.UNIT:
            return prisma.unit.findFirst({ where });
        case OwnerKind.CLASS:
            return prisma.gameClass.findFirst({ where });
        case OwnerKind.FEAT:
            return prisma.feat.findFirst({ where });
        default:
            return systemContent('abilityOwners')[kind]?.find(where);
    }
}

type OperationContext = {
    actor: Actor;
    input: Record<string, unknown>;
    body: unknown;
    locale?: Locale | null;
    param: (key: string) => string;
};

async function importOperation(ctx: OperationContext) {
    const { actor, input, body, locale } = ctx;

    const report = await importContent(
        actor,
        kindOf(input.kind),
        bodyOf('content.import', body)
    );

    if (locale === null) return report;

    return translateImportReport(
        await getTranslator(await localeOrRequest(locale)),
        report
    );
}

async function listAbilitySources(ctx: OperationContext) {
    const { actor } = ctx;

    const where = { campaignId: actor.campaignId };

    const groups = await Promise.all(
        abilitySources().map(async (s) =>
            (await isKindActive(s.contentKind, actor))
                ? { kind: s.source, rows: await s.load(where) }
                : { kind: s.source, rows: [] }
        )
    );

    return {
        sources: groups.flatMap(({ kind, rows }) =>
            rows
                .map((row) => ({
                    kind,
                    id: row.id,
                    name: row.name,
                }))
                .sort(byName)
        ),
    };
}

async function abilityGet(ctx: OperationContext) {
    const { actor, input, param } = ctx;

    const kind = input.kind as OwnerKind;

    const row = await owner(kind, actor, param('ownerId'));

    if (!row) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    if (kind === OwnerKind.CLASS && 'features' in row) {
        const cls = toGameClassData(
            row as Parameters<typeof toGameClassData>[0]
        );

        return {
            abilities: [
                ...cls.features,
                ...cls.subclasses.flatMap((s) => s.features),
            ].flatMap((f) => f.abilities),
        };
    }

    return { abilities: readAbilities(kind, row).abilities };
}

async function removeSpellFromGroup(ctx: OperationContext) {
    const { actor, param } = ctx;

    await owned(
        await prisma.spell.findFirst({
            where: {
                id: param('spellId'),
                campaignId: actor.campaignId,
            },
        }),
        actor
    );

    const result = await prisma.spell.update({
        where: { id: param('spellId') },
        data: { groupId: null },
        include: { spellGroup: true },
    });

    invalidate(actor, ReferenceKind.SPELLS);

    return result;
}

async function removeAllSpellsFromGroup(ctx: OperationContext) {
    const { actor, param } = ctx;

    await owned(
        await prisma.spellGroup.findFirst({
            where: {
                id: param('groupId'),
                campaignId: actor.campaignId,
            },
        }),
        actor
    );
    await prisma.spell.updateMany({
        where: {
            campaignId: actor.campaignId,
            groupId: param('groupId'),
        },
        data: { groupId: null },
    });
    invalidate(actor, ReferenceKind.SPELLS);

    return { ok: true };
}

async function deleteSpellsByLevel(ctx: OperationContext) {
    const { actor, body } = ctx;

    const { level } = bodyOf('spells.delete-by-level', body);

    const doomed = await prisma.spell.findMany({
        where: { campaignId: actor.campaignId, level },
        select: { id: true },
    });

    await detachRefs(
        prisma,
        actor.campaignId,
        'spell',
        doomed.map((s) => s.id)
    );

    const result = await prisma.spell.deleteMany({
        where: { campaignId: actor.campaignId, level },
    });

    invalidate(actor, ReferenceKind.SPELLS);

    return { ok: true, deleted: result.count };
}

async function importUnits(ctx: OperationContext) {
    const { actor, body } = ctx;

    const { units: incoming } = bodyOf('units.import', body);

    const rules = await loadRules(actor.campaignId);

    let droppedConditions = 0;

    const units = incoming.map((unit) => {
        const cleaned = dropForeignConditions(rules.system, unit.abilities);

        droppedConditions += cleaned.dropped;

        return cleaned.dropped
            ? { ...unit, abilities: cleaned.abilities }
            : unit;
    });

    assertEffectsInComposition(
        rules.system,
        units.flatMap((unit) => unit.abilities ?? [])
    );

    await assertCampaignRefs(actor.campaignId, {
        spell: [
            ...units.flatMap((unit) => unit.knownSpells),
            ...units.flatMap((unit) => abilitySpellIds(unit.abilities)),
        ],
    });

    const persisted = ruleSystemOf(rules).characteristics.persisted;

    const narrowed = persisted
        ? units.map((unit) =>
              unit.characteristics
                  ? {
                        ...unit,
                        characteristics: parseSystemData(
                            rules,
                            unit.characteristics,
                            'unitCharacteristics'
                        ),
                    }
                  : unit
          )
        : units;

    const result = await importUnitsIntoCampaign(
        prisma,
        actor.campaignId,
        narrowed,
        rules
    );

    invalidate(actor, ReferenceKind.UNITS);

    return droppedConditions ? { ...result, droppedConditions } : result;
}

async function reorderTracks(ctx: OperationContext) {
    const { actor, body } = ctx;

    const { ids } = bodyOf('tracks.reorder', body);

    const known = new Set(
        (
            await prisma.campaignTrack.findMany({
                where: { campaignId: actor.campaignId },
                select: { id: true },
            })
        ).map((row) => row.id)
    );

    if (
        ids.length !== known.size ||
        new Set(ids).size !== ids.length ||
        !ids.every((trackId) => known.has(trackId))
    )
        throw new ContentError(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

    await prisma.$transaction(
        ids.map((trackId, sortOrder) =>
            prisma.campaignTrack.update({
                where: { id: trackId },
                data: { sortOrder },
            })
        )
    );

    return listTracks(actor.campaignId);
}

/** Shared HTTP/action operation. It owns authorization, parsing and the write lock. */
export async function runContentOperation(
    operationId: ContentOperationId,
    actor: Actor,
    raw: unknown,
    locale?: Locale | null
): Promise<unknown> {
    const operation = operationOf(operationId);

    assertCan(actor, operation.need);

    if (
        operationId === 'abilities.get' &&
        (!raw ||
            typeof raw !== 'object' ||
            !Object.values(OwnerKind).includes(
                (raw as { kind: OwnerKind }).kind
            ))
    )
        throw new ContentError(API_ERRORS.UNKNOWN_OWNER_KIND, 400);

    // Each branch narrows against its existing operation schema below. Dynamic
    // path schemas remain explicit, never model-provided arbitrary delegates.
    const input = parseInput(
        contentOperationSchema(operationId),
        raw
    ) as Record<string, unknown>;

    const body = 'body' in input ? input.body : undefined;

    const param = (key: string) =>
        String((input as Record<string, unknown>)[key]);

    const ctx: OperationContext = { actor, input, body, locale, param };

    const work = async () => {
        switch (operationId) {
            case 'rules.get':
                return readCampaignRules(actor);
            case 'rules.update':
                return updateCampaignRules(actor, bodyOf('rules.update', body));
            case 'rules.condition-usage':
                return readCustomConditionUsage(actor, param('slug'));
            case 'campaign.export':
                return exportCampaign(prisma, actor.campaignId);
            case 'source.diff':
                return getSourceDiff(
                    actor,
                    CONTENT_OPERATIONS['source.diff'].query.parse(
                        input.query ?? {}
                    ).scope,
                    locale
                );
            case 'source.apply-safe':
                return applySafeSource(actor);
            case 'source.apply':
                return applySource(actor, bodyOf('source.apply', body));
            case 'template.publish':
                return publishTemplate(actor);
            case 'content.import':
                return importOperation(ctx);
            case 'content.import-example':
                await assertKindActive(kindOf(input.kind), actor);

                return exampleCsv(actor, kindOf(input.kind), {
                    loadNames,
                    locale: locale ?? undefined,
                });
            case 'content.export':
                await assertKindActive(kindOf(input.kind), actor);

                return exportCsv(actor, kindOf(input.kind), {
                    ...EXPORT_DEFAULT_DEPS,
                    locale: locale ?? undefined,
                });
            case 'abilities.sources':
                return listAbilitySources(ctx);
            case 'abilities.get':
                return abilityGet(ctx);
            case 'spells.remove-from-group':
                return removeSpellFromGroup(ctx);
            case 'spell-groups.remove-all-spells':
                return removeAllSpellsFromGroup(ctx);
            case 'spells.delete-by-level':
                return deleteSpellsByLevel(ctx);
            case 'units.import':
                return importUnits(ctx);
            case 'tracks.reorder':
                return reorderTracks(ctx);
        }

        const contribution = moduleContentOperations()[operationId];

        if (!contribution) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

        if (contribution.kind) await assertKindActive(contribution.kind, actor);

        return contribution.run(ctx);
    };

    // The row importer owns per-row commits for ordinary HTTP use. In the
    // assistant it reuses the enclosing transaction and savepoints.
    if (operation.method === 'GET' || operationId === 'content.import')
        return work();

    return withCampaignContentWrite(actor.campaignId, work);
}
