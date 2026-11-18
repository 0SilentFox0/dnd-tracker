import type {
    ActionPreview,
    AssistantActionDef,
    AssistantCaller,
    EffectDescription,
    JsonValue,
    TargetRef,
} from '../types';
import { withContentEffects } from './content-effects';
import { contentMediaHandoff } from './content-media';
import { operationPreview } from './content-operation-preview';
import { contentOperationState } from './content-preview';
import { contentSnapshot, jsonContent, snapshotHash } from './content-snapshot';

import 'server-only';
import { ALL_REFERENCE_KINDS } from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';
import { ContentError } from '@/lib/server/content/errors';
import { translateImportReport } from '@/lib/server/content/import/translate-report';
import {
    contentOperationList,
    moduleContentOperations,
} from '@/lib/server/content/module-operations';
import {
    type ContentOperationId,
    contentOperationSchema,
    runContentOperation,
} from '@/lib/server/content/operation-service';
import {
    CONTENT_OPERATIONS,
    type ContentOperation,
} from '@/lib/server/content/operations';
import { withCampaignRuntimeWrite } from '@/lib/server/content/write';
import { previewSourceSelection } from '@/lib/server/templates/sync/apply';
import { pageSourceDiff } from '@/lib/server/templates/sync/page-diff';
import type { Actor } from '@/lib/utils/api/actor';
import { MODULE_CONTENT_TABLES } from '@/lib/utils/rules/systems/content-tables';
import type { SourceDiff } from '@/types/campaigns';
import type { ImportReport } from '@/types/content-import';

type Selection = {
    sourceId: string;
    items: Array<{
        scope: string;
        key: string;
        name: string;
        status: string;
        before: unknown;
        after: unknown;
    }>;
    autoAdded: unknown[];
    credits: { before: string | null; after: string | null };
};
type Deps = {
    snapshot?: (actor: Actor) => Promise<unknown>;
    operationState?: (
        actor: Actor,
        state: unknown,
        operation: string,
        input: Record<string, unknown>
    ) => Promise<unknown>;
    guard?: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
    invoke?: (
        id: ContentOperationId,
        actor: Actor,
        input: unknown,
        locale: Locale | null
    ) => Promise<unknown>;
    sourcePreview?: (actor: Actor, input: unknown) => Promise<Selection>;
};

type Ports = {
    invoke: NonNullable<Deps['invoke']>;
    guard: NonNullable<Deps['guard']>;
    snapshot: NonNullable<Deps['snapshot']>;
    loadState: NonNullable<Deps['operationState']>;
    sourcePreview: NonNullable<Deps['sourcePreview']>;
};

type Operation = ContentOperation;

type ActionBase = Pick<
    AssistantActionDef,
    'id' | 'title' | 'description' | 'input' | 'need'
>;

type Caller = AssistantCaller;

type Translate = Awaited<ReturnType<typeof getTranslator>>;

type Draft = {
    target: TargetRef;
    targets: TargetRef[];
    changes: ActionPreview['changes'];
    effects: EffectDescription[];
    warnings: string[];
};

type PrepareScope = {
    operation: Operation;
    caller: Caller;
    input: Record<string, unknown>;
    t: Translate;
    label: string;
    draft: Draft;
};

function resolvePorts(deps: Deps): Ports {
    return {
        invoke: deps.invoke ?? runContentOperation,
        guard: deps.guard ?? ((id, fn) => withCampaignRuntimeWrite(id, fn)),
        snapshot: deps.snapshot ?? contentSnapshot,
        loadState:
            deps.operationState ??
            (deps.snapshot
                ? async (_actor, state) => state
                : (actor, _state, operation, input) =>
                      contentOperationState(actor, operation, input)),
        sourcePreview: deps.sourcePreview ?? defaultSourcePreview,
    };
}

async function defaultSourcePreview(
    actor: Actor,
    input: unknown
): Promise<Selection> {
    const campaign = await prisma.campaign.findUnique({
        where: { id: actor.campaignId },
        select: { createdFromId: true },
    });

    if (campaign?.createdFromId) {
        // The executor already holds the target. NOWAIT prevents opposite syncs
        // from deadlocking while ensuring source writes cannot race the guard.
        await prisma.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaign.createdFromId} FOR SHARE NOWAIT`;
    }

    return previewSourceSelection(
        prisma,
        actor.campaignId,
        CONTENT_OPERATIONS['source.apply'].body.parse(input),
        actor
    );
}

const exportAction = (base: ActionBase): AssistantActionDef => ({
    ...base,
    effect: 'handoff',
    execute: async (caller) => ({
        // One canonical id retains the existing content:read grant. The browser
        // downloads raw bundles; tool history must never contain source notes.
        href: `/api/campaigns/${caller.actor.campaignId}/export`,
        reason: (await getTranslator(caller.locale, 'assistant'))(
            'handoffs.campaignExport'
        ),
    }),
});

const readAction = (
    base: ActionBase,
    operation: Operation,
    { invoke }: Ports
): AssistantActionDef => ({
    ...base,
    effect: 'read',
    execute: async (caller, raw) => {
        const input = raw as Record<string, unknown>;

        const data = await invoke(
            operation.id,
            caller.actor,
            input,
            caller.locale
        );

        return {
            data: jsonContent(
                operation.id === 'source.diff'
                    ? pageSourceDiff(
                          data as SourceDiff,
                          Number(input.offset),
                          Number(input.limit)
                      )
                    : data
            ),
            affected: [],
            warnings: [],
        };
    },
});

async function applySourceDraft(
    ports: Ports,
    { caller, t, draft }: PrepareScope,
    body: unknown
): Promise<Selection> {
    const selection = await ports.sourcePreview(caller.actor, body);

    draft.targets = selection.items.map((item) => ({
        domain: item.scope,
        id: item.key,
        name: item.name,
    }));
    draft.changes = selection.items.map((item, i) => ({
        target: draft.targets[i],
        path: '$record',
        before: jsonContent(item.before),
        after: jsonContent(item.after),
    }));
    draft.changes.push({
        target: draft.target,
        path: 'credits',
        before: selection.credits.before,
        after: selection.credits.after,
    });
    draft.effects = selection.items.map((item, i) => ({
        kind:
            item.status === 'deletedInSource'
                ? 'delete'
                : MODULE_CONTENT_TABLES.some(
                        (table) =>
                            table.key === item.scope && table.erasesProgress
                    )
                  ? 'erase-progress'
                  : 'update',
        targets: [draft.targets[i]],
        description: item.name,
    }));

    if (!draft.effects.length)
        draft.effects = [
            {
                kind: 'update',
                targets: [draft.target],
                description: t('effects.sourceMarks'),
            },
        ];

    draft.warnings.push(t('warnings.sourceApply'));

    return selection;
}

async function importDryRun(
    ports: Ports,
    { caller, input, t, draft }: PrepareScope,
    body: unknown
): Promise<ImportReport> {
    const parsed = CONTENT_OPERATIONS['content.import'].body.parse(body);

    if (parsed.dryRun)
        throw new ContentError(API_ERRORS.ASSISTANT_DRY_RUN_USE_PREVIEW, 400);

    for (const row of parsed.rows) {
        const handoff = contentMediaHandoff(String(input.kind), row);

        if (handoff)
            throw new ContentError(handoff, 422, [
                { code: 'UI_HANDOFF', path: [] },
            ]);
    }

    const report = (await ports.invoke(
        'content.import',
        caller.actor,
        { ...input, body: { ...parsed, dryRun: true } },
        null
    )) as ImportReport;

    const shown = translateImportReport(
        await getTranslator(caller.locale),
        report
    );

    draft.changes.push({
        target: draft.target,
        path: '$dryRun',
        before: null,
        after: jsonContent(shown),
    });
    draft.warnings.push(t('warnings.importPartial'), t('warnings.manualSetup'));

    return report;
}

function destructiveEffects({
    operation,
    t,
    label,
    draft,
}: PrepareScope): EffectDescription[] | null {
    if (
        operation.id === 'spells.delete-by-level' ||
        operation.id === 'spell-groups.remove-all-spells'
    )
        return [{ kind: 'delete', targets: draft.targets, description: label }];

    const erases =
        moduleContentOperations()[operation.id]?.assistant?.erasesProgress;

    if (erases)
        return [
            {
                kind: 'erase-progress',
                targets: draft.targets,
                description: t(erases),
            },
        ];

    return null;
}

async function prepareOperation(
    ports: Ports,
    operation: Operation,
    caller: Caller,
    raw: unknown
): Promise<ActionPreview> {
    const t = await getTranslator(caller.locale, 'assistant');

    const label = t(`operations.${operation.id}`);

    const input = raw as Record<string, unknown>;

    const target: TargetRef = {
        domain: 'content',
        id: caller.actor.campaignId,
        name: label,
    };

    const state = await ports.snapshot(caller.actor);

    const projected = operationPreview(
        operation.id,
        input,
        t,
        await ports.loadState(caller.actor, state, operation.id, input)
    );

    const draft: Draft = {
        target,
        targets: projected?.targets.length ? projected.targets : [target],
        changes: projected?.changes ?? [
            {
                target,
                path: '$operation',
                before: jsonContent(state),
                after: jsonContent(input),
            },
        ],
        effects: [],
        warnings: projected ? [...projected.warnings] : [],
    };

    draft.effects = [
        { kind: 'update', targets: draft.targets, description: label },
    ];

    const scope: PrepareScope = { operation, caller, input, t, label, draft };

    const preconditions: Record<string, JsonValue> = {
        snapshot: snapshotHash(state),
        input: jsonContent(input),
    };

    if (operation.id === 'source.apply')
        preconditions.selection = jsonContent(
            await applySourceDraft(ports, scope, input.body)
        );
    else if (operation.id === 'content.import')
        preconditions.report = jsonContent(
            await importDryRun(ports, scope, input.body)
        );
    else draft.effects = destructiveEffects(scope) ?? draft.effects;

    if (operation.id !== 'source.apply' && operation.id !== 'content.import')
        preconditions.selection = jsonContent(null);

    return {
        summary: label,
        targets: draft.targets,
        changes: draft.changes,
        warnings: draft.warnings,
        effects: draft.effects,
        preconditions,
    };
}

const writeAction = (
    base: ActionBase,
    operation: Operation,
    ports: Ports
): AssistantActionDef => ({
    ...base,
    effect: 'write',
    confirmation:
        operation.need.sessionOnly ||
        operation.id === 'spell-groups.remove-all-spells' ||
        moduleContentOperations()[operation.id]?.assistant?.confirm === 'always'
            ? 'always'
            : 'standard',
    prepare: async (caller, raw) =>
        ports.guard(caller.actor.campaignId, () =>
            prepareOperation(ports, operation, caller, raw)
        ),
    execute: async (ctx, input) =>
        withContentEffects(ctx, ALL_REFERENCE_KINDS, async () => {
            const data = await ports.invoke(
                operation.id,
                ctx.caller.actor,
                input,
                ctx.caller.locale
            );

            const report = data as { counts?: { error: number } };

            const t = await getTranslator(ctx.caller.locale, 'assistant');

            return {
                data: jsonContent(data),
                affected: [
                    {
                        domain: 'content',
                        id: ctx.caller.actor.campaignId,
                        name: t(`operations.${operation.id}`),
                    },
                ],
                warnings:
                    operation.id === 'content.import' && report?.counts?.error
                        ? [t('warnings.importPartialDone')]
                        : [],
            };
        }),
});

const importPreviewAction = ({ invoke }: Ports): AssistantActionDef => ({
    id: 'content.import-preview',
    title: 'Check import',
    description: 'Dry run without writing or an intent',
    input: contentOperationSchema('content.import'),
    need: CONTENT_OPERATIONS['content.import'].need,
    effect: 'read',
    execute: async (caller, raw) => {
        const input = contentOperationSchema('content.import').parse(raw);

        return {
            data: jsonContent(
                await invoke(
                    'content.import',
                    caller.actor,
                    {
                        ...input,
                        body: {
                            ...CONTENT_OPERATIONS['content.import'].body.parse(
                                input.body
                            ),
                            dryRun: true,
                        },
                    },
                    caller.locale
                )
            ),
            affected: [],
            warnings: [],
        };
    },
});

export function createContentOperationActions(
    deps: Deps = {}
): AssistantActionDef[] {
    const ports = resolvePorts(deps);

    const actions = contentOperationList().map(
        (operation): AssistantActionDef => {
            const base = {
                id: operation.id,
                title: operation.summary,
                description: operation.description,
                input: contentOperationSchema(operation.id),
                need: operation.need,
            };

            if (operation.id === 'campaign.export') return exportAction(base);

            if (operation.method === 'GET')
                return readAction(base, operation, ports);

            return writeAction(base, operation, ports);
        }
    );

    return [...actions, importPreviewAction(ports)];
}
