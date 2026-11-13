import { NextResponse } from 'next/server';

import { systemServerOf } from './registry';
import type { SystemHttpMethod, SystemRoute } from './types';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { operationAccess } from '@/lib/server/characters/operation-context';
import {
    type CharacterOperation,
    executeCharacterRoute,
} from '@/lib/server/characters/operation-runner';
import { CHARACTER_OPERATIONS } from '@/lib/server/characters/operations/registry';
import type { Actor } from '@/lib/utils/api/actor';
import { errorResponse } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';

export type SystemRouteScope = 'campaign' | 'character';

export type SystemRouteParams = {
    id: string;
    characterId?: string;
    action: string;
};

const METHODS: readonly SystemHttpMethod[] = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
];

const targetOf = (route: SystemRoute, method: string) =>
    Object.hasOwn(route, method)
        ? route[method as SystemHttpMethod]
        : undefined;

export async function runSystemRoute(
    scope: SystemRouteScope,
    request: Request,
    params: SystemRouteParams,
    actor?: Actor
): Promise<Response> {
    const { id: campaignId, characterId, action } = params;

    const access = await operationAccess(campaignId, false, actor);

    if (access instanceof NextResponse) return access;

    const routes = systemServerOf(access.campaign.rules).routes?.[scope];

    const route =
        routes && Object.hasOwn(routes, action) ? routes[action] : undefined;

    if (!route || (scope === 'character' && !characterId))
        return errorResponse(API_ERRORS.SYSTEM_ACTION_UNKNOWN, 404);

    const target = targetOf(route, request.method);

    if (!target) return errorResponse(API_ERRORS.METHOD_NOT_ALLOWED, 405);

    const searchParams = new URL(request.url).searchParams;

    if ('operation' in target) {
        const operation = Object.hasOwn(CHARACTER_OPERATIONS, target.operation)
            ? CHARACTER_OPERATIONS[target.operation]
            : undefined;

        if (!operation)
            return errorResponse(API_ERRORS.SYSTEM_ACTION_UNKNOWN, 404);

        // `access` is deliberately not forwarded: campaignGate trusts ctx.access as DM-checked
        return executeCharacterRoute(operation as CharacterOperation, {
            campaignId,
            params: characterId ? { characterId } : {},
            request,
            searchParams,
            actor,
        });
    }

    try {
        if (target.access === 'dm' && !access.isDM)
            return errorResponse(API_ERRORS.DM_ONLY, 403);

        const query = target.query?.(searchParams);

        const body = target.schema
            ? await parseBody(target.schema, request)
            : undefined;

        if (body instanceof NextResponse) return body;

        const input =
            target.schema && target.query ? { query, body } : (body ?? query);

        return await target.handle({
            campaignId,
            characterId,
            access,
            input,
            searchParams,
        });
    } catch (error) {
        return handleApiError(error, { action: `system route ${action}` });
    }
}

type RouteContext = { params: Promise<SystemRouteParams> };

export const systemRoutes = (scope: SystemRouteScope) =>
    Object.fromEntries(
        METHODS.map((method) => [
            method,
            async (request: Request, { params }: RouteContext) =>
                runSystemRoute(scope, request, await params),
        ])
    ) as Record<
        SystemHttpMethod,
        (request: Request, context: RouteContext) => Promise<Response>
    >;
