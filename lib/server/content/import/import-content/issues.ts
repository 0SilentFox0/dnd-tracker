import { err } from './shared';

import 'server-only';
import { type ErrorParams } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { isRecord } from '@/lib/utils/common/is-record';
import type { ImportIssue } from '@/types/content-import';

type ZodLikeIssue = {
    path: PropertyKey[];
    message: string;
    minimum?: unknown;
    maximum?: unknown;
    params?: unknown;
};

const bound = (v: unknown) =>
    typeof v === 'number' || typeof v === 'bigint' ? Number(v) : undefined;

export function zodIssues(error: { issues: ZodLikeIssue[] }): ImportIssue[] {
    return error.issues.map((i) => {
        const minimum = bound(i.minimum);

        const maximum = bound(i.maximum);

        return err(i.message, i.path.map(String).join('.') || undefined, {
            ...(minimum !== undefined && { minimum }),
            ...(maximum !== undefined && { maximum }),
            ...(isRecord(i.params) && { params: i.params as ErrorParams }),
        });
    });
}

export function contentErrorIssues(error: ContentError): ImportIssue[] {
    const extra = Array.isArray(error.issues)
        ? error.issues.map((i) =>
              isRecord(i) && typeof i.message === 'string'
                  ? err(
                        i.message,
                        Array.isArray(i.path)
                            ? i.path.map(String).join('.') || undefined
                            : undefined,
                        {
                            ...(bound(i.minimum) !== undefined && {
                                minimum: bound(i.minimum),
                            }),
                            ...(bound(i.maximum) !== undefined && {
                                maximum: bound(i.maximum),
                            }),
                            ...(isRecord(i.params) && {
                                params: i.params as ErrorParams,
                            }),
                        }
                    )
                  : err(typeof i === 'string' ? i : JSON.stringify(i))
          )
        : [];

    return [
        err(error.message, undefined, error.params && { params: error.params }),
        ...extra,
    ];
}
