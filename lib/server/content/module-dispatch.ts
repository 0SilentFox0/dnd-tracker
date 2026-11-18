import { NextResponse } from 'next/server';

import 'server-only';
import '@/lib/server/systems/registry';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    collectionRoutes,
    itemRoutes,
    operationRoute,
    type RouteCtx,
} from '@/lib/server/content/content-routes';
import {
    moduleContentOperations,
    runModuleContentOperation,
} from '@/lib/server/content/module-operations';
import { runContentOperation } from '@/lib/server/content/operation-service';
import { systemContentKinds } from '@/lib/server/systems/lookup';
import { errorResponse } from '@/lib/utils/api/api-response';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type Handler = (req: Request, ctx: RouteCtx) => Promise<NextResponse>;

type DispatchCtx = {
    params: Promise<{ id: string; kind: string; rest?: string[] }>;
};

const matchTemplate = (
    template: string,
    segments: string[]
): Record<string, string> | null => {
    const parts = template.split('/').filter(Boolean);

    if (parts.length !== segments.length) return null;

    const params: Record<string, string> = {};

    for (const [i, part] of parts.entries()) {
        const named = /^\{(\w+)\}$/.exec(part);

        if (named) params[named[1]] = segments[i];
        else if (part !== segments[i]) return null;
    }

    return params;
};

/** Handlers per method of one module path, or null when no module serves the path */
function handlersFor(
    campaignId: string,
    segments: string[]
): Partial<Record<Method, Handler>> | null {
    const table: Partial<Record<Method, Handler>> = {};

    let known = false;

    for (const [opId, c] of Object.entries(moduleContentOperations())) {
        if (!c.http) continue;

        const matched = matchTemplate(c.row.path, segments);

        if (!matched) continue;

        known = true;

        const method = c.row.method as Method;

        if (table[method]) continue;

        const op = { ...c.row, id: opId };

        const { direct, project } = c.http;

        table[method] = (req) =>
            operationRoute(op, async ({ actor, params, body }) => {
                const input = direct
                    ? { ...matched, ...(op.body && { body }) }
                    : { ...params, body };

                const result = direct
                    ? await runModuleContentOperation(opId, actor, input)
                    : await runContentOperation(opId, actor, input);

                return NextResponse.json(project ? project(result) : result);
            })(req, {
                params: Promise.resolve({ id: campaignId, ...matched }),
            });
    }

    const [kind, ...rest] = segments;

    const resource = Object.values(systemContentKinds())
        .map((k) => k.resource)
        .find((r) => r.http && r.path === `/${kind}`);

    if (resource?.http && rest.length <= 1) {
        known = true;

        const isItem = rest.length === 1;

        const routes = (
            isItem ? itemRoutes(resource) : collectionRoutes(resource)
        ) as Partial<Record<Method, Handler>>;

        const allowed: readonly string[] = isItem
            ? resource.http.item
            : resource.http.collection;

        for (const method of allowed as Method[]) {
            const handler = routes[method];

            if (!handler || table[method]) continue;

            table[method] = isItem
                ? (req) =>
                      handler(req, {
                          params: Promise.resolve({
                              id: campaignId,
                              [resource.idParam]: rest[0],
                          }),
                      })
                : (req) =>
                      handler(req, {
                          params: Promise.resolve({ id: campaignId }),
                      });
        }
    }

    return known ? table : null;
}

/** One handler for every HTTP resource a module owns; static sibling route folders win over it */
export const moduleContentRoute =
    (method: Method) =>
    async (req: Request, ctx: DispatchCtx): Promise<NextResponse> => {
        const { id, kind, rest = [] } = await ctx.params;

        const table = handlersFor(id, [kind, ...rest]);

        if (!table) return errorResponse(API_ERRORS.NOT_FOUND, 404);

        const handler = table[method];

        if (!handler) {
            const response = errorResponse(API_ERRORS.METHOD_NOT_ALLOWED, 405);

            response.headers.set('Allow', Object.keys(table).sort().join(', '));

            return response;
        }

        return handler(req, ctx as unknown as RouteCtx);
    };
