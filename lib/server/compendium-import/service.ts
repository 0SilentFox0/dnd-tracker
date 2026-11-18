import { buildMediaQueue } from './media/queue';
import {
    classesModeOf,
    customConditionsToOffer,
    reportOf,
} from './service/report';
import { requireActor, signingKey, tokenData, tokenFor } from './service/token';
import {
    CompendiumReport,
    ImportInput,
    ImportRepository,
    validatedInput,
} from './service/types';
import { adaptCompendium } from './adapt';
import { digest } from './identity';
import { ADAPTER_VERSION, buildImportPlan, type PlannedWrite } from './plan';
import { type AdaptedEntry, issue } from './types';

import type { Locale } from '@/lib/i18n/config';
import { remapIds } from '@/lib/server/templates/remap-ids';
import type { Actor } from '@/lib/utils/api/actor';
import {
    byteLength,
    COMPENDIUM_LIMITS,
    CompendiumError,
    parseCompendium,
} from '@/lib/utils/compendium-import/parse';

function readInput(input: ImportInput) {
    // Account for JSON escaping in the actual transport, not just source-file bytes.
    if (byteLength(JSON.stringify(input)) > COMPENDIUM_LIMITS.requestBytes)
        throw new CompendiumError('REQUEST_SIZE');

    const root = parseCompendium(input.json);

    return {
        root,
        fingerprint: digest({ ...input, json: root, version: ADAPTER_VERSION }),
    };
}

async function planFor(
    actor: Actor,
    input: ImportInput,
    root: ReturnType<typeof parseCompendium>,
    repository: ImportRepository,
    locale?: Locale
) {
    const started = Date.now();

    const adapted = adaptCompendium(root, { ...input, locale });

    const ctx = await repository.loadContext(actor, input, adapted.entries);

    if (ctx.campaignId !== actor.campaignId)
        throw new CompendiumError('FORBIDDEN');

    const kindActive = (entry: AdaptedEntry) =>
        !ctx.activeKinds ||
        entry.kind === 'scenarioPages' ||
        ctx.activeKinds.has(entry.kind);

    const entries = [...adapted.entries, ...(ctx.extraEntries ?? [])];

    const plan = buildImportPlan(
        { ...adapted, entries: entries.filter(kindActive) },
        {
            ...ctx,
            overwriteKeys: input.overwriteKeys,
            excludedKeys: input.excludedKeys,
            allowMixedEdition: input.allowMixedEdition,
        }
    );

    for (const kind of new Set(
        entries.filter((e) => !kindActive(e)).map((e) => e.kind)
    ))
        plan.warnings.push(issue('KIND_INACTIVE', kind, 'warning'));

    if (Date.now() - started > 15_000)
        throw new CompendiumError('PLANNING_TIMEOUT');

    return {
        plan,
        sources: adapted.sources,
        embedded: adapted.embedded,
        hasCharacters: ctx.hasCharacters,
        classesMode: classesModeOf(plan, input, ctx),
        customRules: customConditionsToOffer(root, input, ctx),
    };
}

export async function previewImport(
    actor: Actor,
    input: ImportInput,
    secret: string,
    repository: ImportRepository,
    locale?: Locale
) {
    requireActor(actor);
    signingKey(secret);
    input = validatedInput(input);
    await repository.authorize(actor);

    const { root, fingerprint } = readInput(input);

    const { plan, sources, embedded, hasCharacters, classesMode, customRules } =
        await planFor(actor, input, root, repository, locale);

    return {
        token: tokenFor(actor, fingerprint, plan.hash, secret),
        report: reportOf(
            plan,
            root,
            sources,
            embedded,
            hasCharacters,
            classesMode,
            customRules
        ),
    };
}

export async function confirmImport(
    actor: Actor,
    input: ImportInput,
    token: string,
    idempotencyKey: string,
    secret: string,
    repository: ImportRepository,
    locale?: Locale
): Promise<CompendiumReport> {
    requireActor(actor);
    signingKey(secret);
    input = validatedInput(input);

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(idempotencyKey))
        throw new CompendiumError('IDEMPOTENCY_KEY');

    const { root, fingerprint } = readInput(input);

    const requestHash = digest({ fingerprint, token });

    return repository.transaction(actor, async (tx) => {
        await tx.authorize(actor);

        const prior = await tx.findRun(actor, idempotencyKey);

        if (prior) {
            if (prior.requestHash !== requestHash)
                throw new CompendiumError('IDEMPOTENCY_CONFLICT');

            return prior.report;
        }

        const signed = tokenData(actor, token, fingerprint, secret);

        const {
            plan,
            sources,
            embedded,
            hasCharacters,
            classesMode,
            customRules,
        } = await planFor(actor, input, root, tx, locale);

        if (signed.planHash !== plan.hash)
            throw new CompendiumError('PREVIEW_STALE');

        if (plan.errors.length) throw new CompendiumError('PLAN_ERRORS');

        const idMap = new Map<string, string>();

        const applied: PlannedWrite[] = [];

        for (const row of plan.writes) {
            const next = {
                ...row,
                body: remapIds(row.body, idMap),
                localId: idMap.get(row.localId) ?? row.localId,
            };

            if (!row.nested && row.operation !== 'unchanged') {
                const actual = await tx.write(actor, next);

                idMap.set(row.localId, actual);
                next.localId = actual;
            }

            applied.push(next);
        }
        for (const row of applied.filter((r) => r.provenance !== false))
            await tx.saveEntry(actor, {
                ...row,
                body: remapIds(row.body, idMap),
                baseline: remapIds(row.baseline, idMap),
                resolvedBindings: remapIds(row.resolvedBindings, idMap),
                localId: idMap.get(row.localId) ?? row.localId,
            });
        await tx.saveSources(actor, sources);

        if (input.rulesPatch) {
            if (!tx.applyRules) throw new CompendiumError('RULES_UNSUPPORTED');

            await tx.applyRules(actor, input.rulesPatch);
        }

        const report = remapIds(
            reportOf(
                plan,
                root,
                sources,
                embedded,
                hasCharacters,
                classesMode,
                customRules
            ),
            idMap
        );

        const queue = buildMediaQueue(
            applied.map((r) => ({
                ...r,
                localId: idMap.get(r.localId) ?? r.localId,
            }))
        );

        report.media = { ...queue, queued: queue.items.length };

        await tx.saveRun(actor, idempotencyKey, requestHash, report);

        return report;
    });
}

export {
    type CompendiumReport,
    type DependencyChoice,
    type ImportInput,
    ImportInputSchema,
    type ImportRepository,
    type RepositoryContext,
} from './service/types';
