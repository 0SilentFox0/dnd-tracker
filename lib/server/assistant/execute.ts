import { authorizeAssistant } from './authorize';
import { assistantCatalog } from './catalog';
import { conflict, forbidden } from './errors';
import {
    completeIntentOutcome,
    reconcileReceiptEffects,
} from './execution-effects';
import { executeIntentTransaction } from './execution-transaction';
import { executionModeFor, type ExecutorDeps } from './executor-deps';
import { createIntent, intentOwner, intentSummary } from './intent-store';
import { confirmationFor } from './policy';
import { identifyActionRequest } from './prepare';
import { ASSISTANT_EFFECT_HANDLERS } from './runtime-effects';
import type {
    ActionRequest,
    AssistantCaller,
    DispatchResult,
    ReceiptDto,
} from './types';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import {
    actionPreviewSchema,
    actionResultSchema,
} from '@/lib/schemas/assistant';
import { rejectProposal } from '@/lib/server/assistant/proposals';
import { lockCampaignRow } from '@/lib/server/campaigns/lock';
import { ContentError, parseInput } from '@/lib/server/content/errors';
import { runContentWriteContext } from '@/lib/server/content/write-context';
import type { Actor } from '@/lib/utils/api/actor';

type Options = Partial<ExecutorDeps>;

type Action = ReturnType<ExecutorDeps['catalog']['getAction']>;

async function dispatchImmediate(
    caller: AssistantCaller,
    action: Extract<Action, { effect: 'read' | 'handoff' }>,
    input: unknown
): Promise<DispatchResult> {
    if (action.effect === 'read') {
        const handoff = await action.handoff?.(caller, input);

        if (handoff) return { kind: 'handoff', ...handoff };

        return {
            kind: 'result',
            result: parseInput(
                actionResultSchema,
                await action.execute(caller, input)
            ),
        };
    }

    return { kind: 'handoff', ...(await action.execute(caller, input)) };
}

async function priorResult(
    db: ExecutorDeps['db'],
    caller: AssistantCaller,
    key: { originKey: string; requestId: string; requestHash: string }
): Promise<DispatchResult | null> {
    const prior = await db.assistantReceipt.findFirst({
        where: {
            ...intentOwner(caller),
            originKey: key.originKey,
            requestId: key.requestId,
        },
    });

    if (!prior) return null;

    if (prior.requestHash !== key.requestHash) throw conflict();

    if (prior.status !== 'applied' || prior.result === null) throw conflict();

    return {
        kind: 'result',
        result: parseInput(actionResultSchema, prior.result),
    };
}

async function rejectIntentTransaction(
    deps: ExecutorDeps,
    caller: AssistantCaller,
    id: string,
    callbacks: Array<() => void>
) {
    return deps.db.$transaction(async (tx) => {
        const row = await tx.assistantIntent.findFirst({
            where: { id, ...intentOwner(caller) },
        });

        if (!row) throw new ContentError(API_ERRORS.AI_PROPOSAL_NOT_FOUND, 404);

        await authorizeAssistant(
            caller,
            deps.catalog.getAction(row.actionId).need,
            'prepare',
            tx
        );
        await lockCampaignRow(tx, caller.actor.campaignId);
        await tx.$queryRaw`SELECT id FROM assistant_intents WHERE id = ${id} FOR UPDATE`;

        const fresh = await tx.assistantIntent.findFirst({
            where: { id, ...intentOwner(caller) },
        });

        if (!fresh || !['pending', 'stale', 'expired'].includes(fresh.status))
            throw conflict();

        const legacyProposalId = fresh.legacyProposalId;

        if (legacyProposalId) {
            await runContentWriteContext(
                caller.actor.campaignId,
                tx,
                () => rejectProposal(caller.actor.campaignId, legacyProposalId),
                callbacks
            );
        }

        return intentSummary(
            await tx.assistantIntent.update({
                where: { id },
                data: { status: 'rejected' },
            })
        );
    });
}

async function executeIntent(
    deps: ExecutorDeps,
    caller: AssistantCaller,
    intentId: string,
    human: boolean,
    signal?: AbortSignal
): Promise<ReceiptDto> {
    const callbacks: Array<() => void> = [];

    const outcome = await executeIntentTransaction(
        deps,
        caller,
        intentId,
        human,
        callbacks,
        signal
    );

    return completeIntentOutcome(
        deps,
        caller,
        intentId,
        outcome,
        callbacks,
        () => executeIntent(deps, caller, intentId, human, signal),
        signal
    );
}

async function dispatchActionWith(
    deps: ExecutorDeps,
    caller: AssistantCaller,
    raw: ActionRequest,
    signal?: AbortSignal
): Promise<DispatchResult> {
    signal?.throwIfAborted();

    const { db, catalog, now } = deps;

    const action = catalog.getAction(raw.actionId);

    await authorizeAssistant(caller, action.need, 'prepare', db);

    const input = parseInput(action.input, raw.input);

    if (action.effect === 'read' || action.effect === 'handoff')
        return dispatchImmediate(caller, action, input);

    if (action.effect === 'paid' && !action.external)
        throw new ContentError(
            API_ERRORS.ASSISTANT_PAID_ADAPTER_UNAVAILABLE,
            409
        );

    if (action.effect === 'paid' && !caller.runId)
        throw new ContentError(API_ERRORS.ASSISTANT_RUN_ID_REQUIRED, 409);

    const { request, originKey, requestHash } = identifyActionRequest(caller, {
        ...raw,
        input,
    });

    const prior = await priorResult(db, caller, {
        originKey,
        requestId: request.requestId,
        requestHash,
    });

    if (prior) return prior;

    const preview = parseInput(
        actionPreviewSchema,
        await action.prepare(caller, input)
    );

    if (action.external && caller.runId)
        preview.preconditions = {
            assistantExternalRun: caller.runId,
            action: preview.preconditions,
        };

    const intent = await createIntent(caller, request, preview, {
        db,
        now: now(),
    });

    if (
        confirmationFor(action, await executionModeFor(caller, db), preview) ===
        'none'
    ) {
        const receipt = await executeIntent(
            deps,
            caller,
            intent.id,
            false,
            signal
        );

        if (!receipt.result) throw conflict();

        return { kind: 'result', result: receipt.result };
    }

    return {
        kind: 'pending',
        intent,
        reviewUrl: `/campaigns/${caller.actor.campaignId}/dm/assistant?intent=${intent.id}`,
    };
}

export function createAssistantExecutor(options: Options = {}) {
    const db = options.db ?? prisma;

    const catalog = options.catalog ?? assistantCatalog;

    const now = options.now ?? (() => new Date());

    const deps: ExecutorDeps = {
        db,
        catalog,
        now,
        effects: options.effects ?? ASSISTANT_EFFECT_HANDLERS,
    };

    const dispatchAction = (
        caller: AssistantCaller,
        raw: ActionRequest,
        signal?: AbortSignal
    ) => dispatchActionWith(deps, caller, raw, signal);

    async function confirmIntent(
        actor: Actor,
        id: string,
        locale: Locale = DEFAULT_LOCALE
    ): Promise<ReceiptDto> {
        if (actor.via !== 'session' || actor.scopes !== null || !actor.isDM)
            throw forbidden();

        return executeIntent(
            deps,
            { actor, channel: 'chat', threadId: null, tokenId: null, locale },
            id,
            true
        );
    }

    async function rejectIntent(caller: AssistantCaller, id: string) {
        const callbacks: Array<() => void> = [];

        const result = await rejectIntentTransaction(
            deps,
            caller,
            id,
            callbacks
        );

        for (const callback of callbacks) await callback();

        return result;
    }

    async function reconcileEffects(
        caller: AssistantCaller,
        intentId: string
    ): Promise<ReceiptDto> {
        return reconcileReceiptEffects(deps, caller, intentId);
    }

    return { dispatchAction, confirmIntent, rejectIntent, reconcileEffects };
}

const executor = createAssistantExecutor();

export const dispatchAction = executor.dispatchAction;
export const confirmIntent = executor.confirmIntent;
export const rejectIntent = executor.rejectIntent;
