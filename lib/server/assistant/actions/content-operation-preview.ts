import type { FieldChange, TargetRef } from '../types';
import { contentDeleteCascades } from './content-dependencies';
import { jsonContent } from './content-snapshot';

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { Translator } from '@/lib/i18n/translator';
import { assertValidSystem } from '@/lib/server/campaigns/modules';
import { ContentError } from '@/lib/server/content/errors';
import { moduleContentOperations } from '@/lib/server/content/module-operations';
import type { ContentOperationId } from '@/lib/server/content/operation-service';
import { asRecord } from '@/lib/utils/common/json';
import {
    mergeRules,
    parseRules,
    RulesetPatchSchema,
} from '@/lib/utils/rules/schema';
import { moduleChange } from '@/lib/utils/rules/systems/catalog';

type Row = Record<string, unknown>;

type Preview = {
    changes: FieldChange[];
    targets: TargetRef[];
    warnings: string[];
};

type PreviewCtx = {
    id: ContentOperationId;
    input: Row;
    t: Translator;
    state: unknown;
    root: Row;
    body: Row;
    changes: FieldChange[];
    warnings: string[];
    rows: (key: string) => Row[];
    owned: (domain: string, key: string) => Row;
    field: (domain: string, row: Row, path: string, after: unknown) => void;
};

function previewCtx(
    id: ContentOperationId,
    input: Row,
    t: Translator,
    state: unknown
): PreviewCtx {
    const root = asRecord(state),
        tables = asRecord(root.tables),
        body = asRecord(input.body);

    const rows = (key: string): Row[] =>
        Array.isArray(tables[key]) ? (tables[key] as Row[]) : [];

    const target = (domain: string, row: Row): TargetRef => ({
        domain,
        id: String(row.id),
        name: String(row.name ?? row.title ?? row.race ?? row.id),
    });

    const changes: FieldChange[] = [];

    const field = (domain: string, row: Row, path: string, after: unknown) => {
        changes.push({
            target: target(domain, row),
            path,
            before: jsonContent(path === '$record' ? row : row[path]),
            after: jsonContent(after),
        });
    };

    const owned = (domain: string, key: string) => {
        const row = rows(domain).find((row) => row.id === input[key]);

        if (!row) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

        return row;
    };

    return {
        id,
        input,
        t,
        state,
        root,
        body,
        changes,
        warnings: [],
        rows,
        owned,
        field,
    };
}

const PREVIEWS: Partial<Record<string, (c: PreviewCtx) => void>> = {
    'spells.remove-from-group': ({ owned, field }) =>
        field('spells', owned('spells', 'spellId'), 'groupId', null),
    'spell-groups.remove-all-spells': ({ owned, rows, field, input }) => {
        owned('spellGroups', 'groupId');
        for (const row of rows('spells').filter(
            (row) => row.groupId === input.groupId
        ))
            field('spells', row, 'groupId', null);
    },
    'spells.delete-by-level': ({ rows, field, changes, state, body }) => {
        const selected = rows('spells').filter(
            (row) => row.level === body.level
        );

        for (const row of selected) field('spells', row, '$record', null);
        changes.push(
            ...contentDeleteCascades(
                state,
                'spells',
                selected.map((row) => String(row.id))
            )
        );
    },
    'tracks.reorder': ({ body, rows, field }) => {
        const ids = body.ids as string[];

        const known = rows('tracks');

        if (
            ids.length !== known.length ||
            new Set(ids).size !== ids.length ||
            !ids.every((id) => known.some((row) => row.id === id))
        )
            throw new ContentError(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

        for (const [index, id] of ids.entries())
            field(
                'tracks',
                known.find((row) => row.id === id)!,
                'sortOrder',
                index
            );
    },
    'rules.update': previewRulesUpdate,
};

function previewRulesUpdate({ root, body, t, warnings, field }: PreviewCtx) {
    const before = parseRules(asRecord(root.campaign).rules);

    const { confirm: _confirm, ...patch } = RulesetPatchSchema.parse(body);

    if (
        patch.system?.modules ||
        (patch.system?.key && patch.system.key !== before.system.key)
    )
        assertValidSystem({
            key: patch.system.key ?? before.system.key,
            ...(patch.system.modules && {
                modules: patch.system.modules,
            }),
        });

    const merged = mergeRules(before, patch);

    if (!merged.ok)
        throw new ContentError(API_ERRORS.INVALID_RULES, 400, merged.issues);

    if (moduleChange(before.system, merged.rules.system).setup.length)
        warnings.push(t('warnings.moduleSetup'));

    const row = { ...before, id: 'rules', name: t('results.rules') };

    for (const key of Object.keys(patch)) {
        const section =
            key === 'removeCustomConditions'
                ? 'conditions'
                : (key as keyof typeof merged.rules);

        field('rules', row, section, merged.rules[section]);
    }
}

/** Read-only projections over the same uncached, locked rows used by the guard. */
export function operationPreview(
    id: ContentOperationId,
    input: Row,
    t: Translator,
    state: unknown
): Preview | null {
    const build = Object.hasOwn(PREVIEWS, id)
        ? PREVIEWS[id]
        : moduleContentOperations()[id]?.assistant?.preview;

    if (!build) return null;

    const ctx = previewCtx(id, input, t, state);

    build(ctx);

    const { changes, warnings } = ctx;

    return {
        changes,
        warnings,
        targets: [
            ...new Map(
                changes.map((change) => [
                    `${change.target.domain}:${change.target.id}`,
                    change.target,
                ])
            ).values(),
        ],
    };
}
