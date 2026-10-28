import { NextResponse } from "next/server";
import type { z, ZodType } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import type { ContentOperation } from "@/lib/server/content/operations";
import { createContent, getContent, listContent, removeAllContent, removeContent, updateContent } from "@/lib/server/content/service";
import { type Actor, type ActorNeed, resolveActor } from "@/lib/utils/api/actor";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { NEED } from "@/lib/utils/api/need";
import { parseBody } from "@/lib/utils/api/parse-body";

export type RouteCtx = { params: Promise<Record<string, string>> };

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ContentError(API_ERRORS.INVALID_JSON, 400);
  }
}

/** Resolves the actor for the campaign in params, runs fn, maps ContentError  /  anything else to the shared error body. */
export async function runContent(
  { req, ctx, need, action }: { req: Request; ctx: RouteCtx; need: ActorNeed; action: string },
  fn: (actor: Actor, params: Record<string, string>) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const actor = await resolveActor(req, params.id, need);

    if (actor instanceof NextResponse) return actor;

    return await fn(actor, params);
  } catch (error) {
    return handleApiError(error, { action });
  }
}

type OperationBody<O extends ContentOperation> = O extends { body: infer B extends ZodType } ? z.output<B> : undefined;

export type OperationArgs<O extends ContentOperation> = { actor: Actor; params: Record<string, string>; req: Request; body: OperationBody<O> };

export function operationRoute<O extends ContentOperation>(op: O, fn: (args: OperationArgs<O>) => Promise<NextResponse>) {
  return (req: Request, ctx: RouteCtx) =>
    runContent({ req, ctx, need: op.need, action: op.summary }, async (actor, params) => {
      const parsed = op.body ? await parseBody(op.body, req, op.invalidBody) : undefined;

      if (parsed instanceof NextResponse) return parsed;

      return fn({ actor, params, req, body: parsed as OperationBody<O> });
    });
}

export function collectionRoutes(r: AnyContentResource) {
  return {
    GET: (req: Request, ctx: RouteCtx) =>
      runContent({ req, ctx, need: NEED.read(r.access.list), action: `list ${r.kind}` }, async (actor) =>
        NextResponse.json(await listContent(r, actor, new URL(req.url).searchParams), { headers: PRIVATE_NO_STORE_HEADERS }),
      ),
    POST: (req: Request, ctx: RouteCtx) =>
      runContent({ req, ctx, need: NEED.write, action: `create ${r.kind}` }, async (actor) => NextResponse.json(await createContent(r, actor, await readJson(req)), { status: 201 })),
    DELETE: (req: Request, ctx: RouteCtx) =>
      runContent({ req, ctx, need: NEED.writeAll, action: `delete all ${r.kind}` }, async (actor) => NextResponse.json({ ok: true, deleted: await removeAllContent(r, actor) })),
  };
}

export function itemRoutes(r: AnyContentResource) {
  return {
    GET: (req: Request, ctx: RouteCtx) => runContent({ req, ctx, need: NEED.read(r.access.item), action: `fetch ${r.kind}` }, async (actor, p) => NextResponse.json(await getContent(r, actor, p[r.idParam]))),
    PATCH: (req: Request, ctx: RouteCtx) =>
      runContent({ req, ctx, need: NEED.write, action: `update ${r.kind}` }, async (actor, p) => NextResponse.json(await updateContent(r, actor, p[r.idParam], await readJson(req)))),
    DELETE: (req: Request, ctx: RouteCtx) =>
      runContent({ req, ctx, need: NEED.write, action: `delete ${r.kind}` }, async (actor, p) => {
        await removeContent(r, actor, p[r.idParam]);

        return NextResponse.json({ ok: true });
      }),
  };
}
