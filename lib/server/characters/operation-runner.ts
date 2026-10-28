import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { operationAccess, operationDM, withCharacterOperation } from "./operation-context";

import "server-only";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export type CharacterOpCtx = { campaignId: string; characterId: string; actor?: Actor; access?: CampaignAccessResult };

type QuerySource = { params: Record<string, string>; searchParams: URLSearchParams };

export interface CharacterOperation<I = unknown, G = unknown> {
  name: string;
  action: string;
  schema: ZodType<I>;
  gate: (ctx: CharacterOpCtx) => Promise<G | NextResponse>;
  run: (gate: G, input: I) => Promise<unknown>;
  parseMessage?: string;
  /** Input from path/query for bodiless operations; the schema still validates assistant input. */
  query?: (source: QuerySource) => I;
  /** Custom body reader when the default JSON + schema parse does not fit. */
  body?: (request: Request) => Promise<I | NextResponse>;
  /** HTTP only: slow work that must stay outside the campaign write lock. */
  prepare?: (gate: G, input: I) => Promise<I>;
  unlocked?: boolean;
  status?: number;
}

export const defineCharacterOperation = <I, G>(op: CharacterOperation<I, G>) => op;

export const campaignGate = async (ctx: CharacterOpCtx) => ctx.access ?? operationDM(ctx.campaignId, ctx.actor);

export const tokenGate = async (ctx: CharacterOpCtx) => ctx.access ?? operationAccess(ctx.campaignId, true, ctx.actor);

export const memberGate = async (ctx: CharacterOpCtx) => ctx.access ?? operationAccess(ctx.campaignId, false, ctx.actor);

export type CampaignScope = { access: CampaignAccessResult; campaignId: string; characterId: string };

const scoped = (gate: typeof campaignGate) => async (ctx: CharacterOpCtx): Promise<CampaignScope | NextResponse> => {
  const access = await gate(ctx);

  return access instanceof NextResponse ? access : { access, campaignId: ctx.campaignId, characterId: ctx.characterId };
};

export const dmScope = scoped(campaignGate);

export const tokenScope = scoped(tokenGate);

/** DM-only character gate that keeps `requireDM` as the access check; the character row is loaded once after it. */
export const dmCharacterGate = <R>(load: (ctx: CharacterOpCtx, access: CampaignAccessResult) => Promise<R>, access: typeof campaignGate = campaignGate) =>
  async (ctx: CharacterOpCtx): Promise<Exclude<R, NextResponse> | NextResponse> => {
    const result = await access(ctx);

    return result instanceof NextResponse ? result : ((await load(ctx, result)) as Exclude<R, NextResponse> | NextResponse);
  };

export const memberScope = scoped(memberGate);

export const errorStatusMessage = async (response: NextResponse): Promise<never> => {
  const data = await response.json().catch(() => null);

  throw new ContentError(typeof data?.error === "string" ? data.error : "Операцію відхилено", response.status, data?.issues);
};

export async function responseBody(response: NextResponse) {
  if (!response.ok) return errorStatusMessage(response);

  return response.json();
}

export async function actorDmAccess(actor: Actor) {
  const access = await operationAccess(actor.campaignId, true, actor);

  return access instanceof NextResponse ? errorStatusMessage(access) : access;
}

/** Bridges helpers that still answer with a NextResponse into the thrown-error flow. */
export const orThrow = async <T>(input: T | NextResponse | PromiseLike<T | NextResponse>): Promise<Exclude<T, NextResponse>> => {
  const value = await input;

  return value instanceof NextResponse ? errorStatusMessage(value) : (value as Exclude<T, NextResponse>);
};

/** Pure core shared by HTTP routes and the assistant: gate once, then `run(gate, input)`. */
export async function runCharacterOperation<I, G>(op: CharacterOperation<I, G>, ctx: CharacterOpCtx, input: I): Promise<unknown> {
  const gate = await op.gate(ctx);

  if (gate instanceof NextResponse) return errorStatusMessage(gate);

  return op.run(gate, input);
}

type RouteCall = { campaignId: string; params: Record<string, string>; request?: Request; searchParams?: URLSearchParams; actor?: Actor };

export async function executeCharacterRoute<I, G>(op: CharacterOperation<I, G>, call: RouteCall): Promise<NextResponse> {
  try {
    const { campaignId, params, actor } = call;

    const characterId = params.characterId ?? "";

    const gate = await op.gate({ campaignId, characterId, actor });

    if (gate instanceof NextResponse) return gate;

    const parsed = op.query
      ? op.query({ params, searchParams: call.searchParams ?? new URLSearchParams() })
      : op.body ? await op.body(call.request as Request) : await parseBody(op.schema, call.request as Request, op.parseMessage);

    if (parsed instanceof NextResponse) return parsed;

    const init = op.status ? { status: op.status } : undefined;

    if (op.unlocked) return NextResponse.json(await op.run(gate, parsed as I), init);

    const input = op.prepare ? await op.prepare(gate, parsed as I) : (parsed as I);

    const data = await withCharacterOperation(campaignId, op.name, { ...(input as object), characterId }, () => op.run(gate, input));

    return NextResponse.json(data, init);
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: op.action });
  }
}

export function characterRoute<I, G>(op: CharacterOperation<I, G>) {
  return async (request: Request, { params }: { params: Promise<{ id: string; characterId?: string; tokenId?: string }> }, actor?: Actor): Promise<NextResponse> => {
    const { id, ...rest } = await params;

    return executeCharacterRoute(op, { campaignId: id, params: rest as Record<string, string>, request, searchParams: new URL(request.url).searchParams, actor });
  };
}

/** `(request, campaignId[, characterId])` entry point for server pages and route files that already hold the ids. */
export function characterHandler<I, G>(op: CharacterOperation<I, G>) {
  return (request: Request, campaignId: string, characterId?: string, actor?: Actor) =>
    executeCharacterRoute(op, { campaignId, params: characterId ? { characterId } : {}, request, searchParams: new URL(request.url).searchParams, actor });
}

export const gateOptions = (ctx: CharacterOpCtx, dmOnly?: boolean) => ({ actor: ctx.actor, access: ctx.access, ...(dmOnly && { dmOnly }) });
