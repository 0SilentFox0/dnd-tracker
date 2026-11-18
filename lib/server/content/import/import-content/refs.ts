import { NameIndex } from './shared';

import 'server-only';
import { isRecord } from '@/lib/utils/common/is-record';
import { nameKey } from '@/lib/utils/content/import';
import type {
    ImportField,
    ImportIssue,
    ImportKind,
    ImportRecord,
} from '@/types/content-import';

export function resolveRefs(
    record: ImportRecord,
    fields: readonly ImportField[],
    refs: Map<ImportKind, NameIndex>,
    issues: ImportIssue[],
    op: 'create' | 'update'
) {
    for (const field of fields) {
        const value = record[field.key];

        if (!field.ref || value === undefined) continue;

        const index = refs.get(field.ref);

        const kind = `contentImport.kinds.${field.ref}`;

        const resolve = (v: unknown) => {
            const s = String(v);

            const id = index?.ids.has(s)
                ? s
                : index?.byName.get(nameKey(s))?.[0];

            if (!id)
                issues.push({
                    field: field.key,
                    level:
                        field.required || field.strictRef ? 'error' : 'warning',
                    message: 'contentImport.issues.refNotFound',
                    params: { field: field.labelKey, value: s, kind },
                });

            return id;
        };

        if (field.type === 'refList' && Array.isArray(value)) {
            const ids = value.map(resolve).filter((id): id is string => !!id);

            if (op === 'update' && ids.length < value.length)
                delete record[field.key];
            else record[field.key] = ids;
        } else {
            const id = resolve(value);

            if (id) record[field.key] = id;
            else if (op === 'create') record[field.key] = null;
            else delete record[field.key];
        }
    }
}

export function resolveNestedRefs(
    record: ImportRecord,
    fields: readonly ImportField[],
    refs: Map<ImportKind, NameIndex>,
    issues: ImportIssue[]
) {
    for (const field of fields) {
        const nested = field.nestedRef;

        const value = record[field.key];

        if (!nested || value === undefined) continue;

        const index = refs.get(nested.kind);

        const kind = `contentImport.kinds.${nested.kind}`;

        const walk = (v: unknown): unknown => {
            if (Array.isArray(v)) return v.map(walk);

            if (!isRecord(v)) return v;

            return Object.fromEntries(
                Object.entries(v).map(([k, x]) => {
                    if (k !== nested.key || typeof x !== 'string')
                        return [k, walk(x)];

                    const id = index?.ids.has(x)
                        ? x
                        : index?.byName.get(nameKey(x))?.[0];

                    if (!id)
                        issues.push({
                            field: field.key,
                            level: 'error',
                            message: 'contentImport.issues.refNotFound',
                            params: { field: field.labelKey, value: x, kind },
                        });

                    return [k, id ?? x];
                })
            );
        };

        record[field.key] = walk(value);
    }
}
