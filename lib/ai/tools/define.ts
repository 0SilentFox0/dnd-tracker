import { z } from 'zod';

import { formatIssues } from './issues';
import { project } from './projection';

import 'server-only';
import { AI_LIMITS, type ApiTokenScope } from '@/lib/constants/ai';
import { API_ERRORS, type ErrorParams } from '@/lib/constants/api-errors';
import type { Locale } from '@/lib/i18n/config';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { getTranslator } from '@/lib/i18n/translator';
import { authorizeLegacyAssistantRead } from '@/lib/server/assistant/authorize';
import type { AssistantCaller } from '@/lib/server/assistant/types';
import { ContentError } from '@/lib/server/content/errors';
import { translateErrorBody } from '@/lib/utils/api/translate-error';
import { publicToolData } from '@/lib/utils/common/public-tool-data';

export type AiToolContext = {
    caller?: AssistantCaller;
    toolCallId?: string;
    campaignId: string;
    userId: string;
    scopes: readonly ApiTokenScope[];
    threadId: string | null;
    locale: Locale;
    abortSignal?: AbortSignal;
    usage?: { images: number };
};

export class AiToolError extends Error {
    constructor(
        message: string,
        readonly params?: ErrorParams
    ) {
        super(message);
    }
}

export type ToolEffect = 'read' | 'write' | 'destructive';

export type AiToolDef<S extends z.ZodObject = z.ZodObject> = {
    name: string;
    scopes: readonly ApiTokenScope[];
    /** Omitted: derived from scopes (only read scopes → read, otherwise write). */
    effect?: ToolEffect;
    idempotent?: boolean;
    title: string;
    description: string;
    input: S;
    // method syntax keeps AiToolDef<Specific> assignable to AiToolDef[] (bivariant param)
    handler(ctx: AiToolContext, input: z.infer<S>): Promise<unknown>;
};

export const defineTool = <S extends z.ZodObject>(def: AiToolDef<S>) => def;

const isReadScope = (scope: ApiTokenScope) =>
    scope === 'ai' || scope.endsWith(':read');

export const toolEffect = (def: AiToolDef): ToolEffect =>
    def.effect ?? (def.scopes.every(isReadScope) ? 'read' : 'write');

export function toolAnnotations(def: AiToolDef) {
    const effect = toolEffect(def);

    return {
        readOnlyHint: effect === 'read',
        destructiveHint: effect === 'destructive',
        idempotentHint: effect === 'read' || def.idempotent === true,
        openWorldHint: false,
    };
}

const ERROR_CODE_BY_KEY = new Map<string, string>(
    Object.entries(API_ERRORS).map(([code, key]) => [key, code])
);

const toolErrorCode = (message: string) =>
    ERROR_CODE_BY_KEY.get(message) ?? 'ASSISTANT_UNAVAILABLE';

export type ToolResult =
    | { version: 2; kind: 'result'; data: unknown }
    | {
          version: 2;
          kind: 'error';
          error: {
              code: string;
              status: number;
              message: string;
              issues?: unknown;
          };
      };

export function clip(value: unknown): string {
    if (typeof value === 'string')
        return value.length > AI_LIMITS.toolResultChars
            ? `${value.slice(0, AI_LIMITS.toolResultChars - 20)}…[truncated]`
            : value;

    const text = JSON.stringify(value);

    return text.length <= AI_LIMITS.toolResultChars
        ? text
        : JSON.stringify(project(value));
}

function boundedOutput(value: unknown): unknown {
    if (JSON.stringify(value ?? null).length < AI_LIMITS.toolOutputBoundChars) return value;

    if (value && typeof value === 'object' && 'kind' in value) {
        if (value.kind === 'pending' && 'intent' in value) {
            const intent = value.intent as Record<string, unknown>;

            return {
                ...value,
                intent: {
                    ...intent,
                    targets: project(intent.targets, { budget: 12000 }),
                },
            };
        }

        if (value.kind === 'result' && 'result' in value) {
            const result = value.result as Record<string, unknown>;

            return {
                ...value,
                result: {
                    ...result,
                    data: project(result.data, {
                        force: true,
                        limit: 8,
                        budget: 12000,
                    }),
                    affected: project(result.affected, {
                        force: true,
                        limit: 1,
                        budget: 3000,
                    }),
                    warnings: project(result.warnings, {
                        force: true,
                        limit: 1,
                        budget: 3000,
                    }),
                },
            };
        }
    }

    return project(value);
}

async function translatedIssues(
    locale: Locale,
    issues: ReadonlyArray<{
        path: PropertyKey[];
        code: string;
        message: string;
        minimum?: unknown;
        maximum?: unknown;
        params?: ErrorParams;
    }>
) {
    const t = await getTranslator(locale);

    return issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: translateIssue(t, issue),
    }));
}

export async function runToolResult(
    def: AiToolDef,
    ctx: AiToolContext,
    rawInput: unknown
): Promise<ToolResult> {
    try {
        ctx.abortSignal?.throwIfAborted();

        if (ctx.caller && def.scopes.includes('ai')) {
            if (
                ctx.caller.actor.campaignId !== ctx.campaignId ||
                ctx.caller.actor.userId !== ctx.userId
            )
                throw new ContentError(
                    API_ERRORS.ASSISTANT_ACTION_FORBIDDEN,
                    403
                );

            await authorizeLegacyAssistantRead(ctx.caller);
        }

        return {
            version: 2,
            kind: 'result',
            data: boundedOutput(
                publicToolData(
                    await def.handler(ctx, def.input.parse(rawInput))
                )
            ),
        };
    } catch (error) {
        if (error instanceof z.ZodError)
            return {
                version: 2,
                kind: 'error',
                error: {
                    code: 'INVALID_INPUT',
                    status: 400,
                    message: 'Invalid input',
                    issues: formatIssues(
                        await translatedIssues(ctx.locale, error.issues)
                    )
                        .slice(0, 20)
                        .map((s) => s.slice(0, 200)),
                },
            };

        if (error instanceof ContentError || error instanceof AiToolError) {
            const t = await getTranslator(ctx.locale);

            return {
                version: 2,
                kind: 'error',
                error: {
                    code: toolErrorCode(error.message),
                    status: error instanceof ContentError ? error.status : 422,
                    message: translateErrorBody(t, {
                        error: error.message,
                        params: error.params,
                    }).error.slice(0, 500),
                    ...(error instanceof ContentError &&
                    Array.isArray(error.issues)
                        ? {
                              issues: formatIssues(
                                  await translatedIssues(
                                      ctx.locale,
                                      error.issues
                                  )
                              )
                                  .slice(0, 20)
                                  .map((s) => s.slice(0, 200)),
                          }
                        : {}),
                },
            };
        }

        console.error(
            `tool ${def.name} failed${error instanceof Error ? `: ${error.name}` : ''}`
        );

        return {
            version: 2,
            kind: 'error',
            error: {
                code: 'ASSISTANT_FAILED',
                status: 500,
                message: 'Internal server error. Try again later.',
            },
        };
    }
}

export async function runTool(
    def: AiToolDef,
    ctx: AiToolContext,
    rawInput: unknown
): Promise<string> {
    return JSON.stringify(await runToolResult(def, ctx, rawInput));
}
