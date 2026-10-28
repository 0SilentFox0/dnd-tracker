import "server-only";
import { invalidateReference } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { AnyContentResource, FindPurpose } from "@/lib/server/content/define-resource";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";

async function found(r: AnyContentResource, actor: Actor, id: string | undefined, purpose: FindPurpose) {
  if (!id) throw new ContentError(r.notFound, 404);

  const row = await r.find(actor, id, purpose);

  if (!row) throw new ContentError(r.notFound, 404);

  return row;
}

const invalidate = (r: AnyContentResource, actor: Actor) => {
  if (r.invalidates.length > 0) invalidateReference(r.invalidates, actor.campaignId);
};

export const listContent = (r: AnyContentResource, actor: Actor, query: URLSearchParams) => r.list(actor, query);

export async function getContent(r: AnyContentResource, actor: Actor, id: string) {
  const row = await found(r, actor, id, "read");

  return r.toItem ? r.toItem(row) : row;
}

export async function createContent(r: AnyContentResource, actor: Actor, raw: unknown) {
  const created = await r.create(actor, parseInput(r.schemas.create, raw));

  invalidate(r, actor);

  return created;
}

export async function updateContent(r: AnyContentResource, actor: Actor, id: string, raw: unknown) {
  const existing = await found(r, actor, id, "write");

  const updated = await r.update(actor, existing, parseInput(r.schemas.update, raw));

  invalidate(r, actor);

  return updated;
}

export async function removeContent(r: AnyContentResource, actor: Actor, id: string): Promise<void> {
  await r.remove(actor, await found(r, actor, id, "write"));

  invalidate(r, actor);
}

export async function removeAllContent(r: AnyContentResource, actor: Actor): Promise<number> {
  if (!r.removeAll) throw new ContentError(API_ERRORS.METHOD_NOT_ALLOWED, 405);

  const deleted = await r.removeAll(actor);

  invalidate(r, actor);

  return deleted;
}
