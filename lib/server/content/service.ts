import { withCampaignContentWrite } from "./write";
import { afterContentCommit } from "./write-context";

import "server-only";
import { invalidateReference } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import type { AnyContentResource, FindPurpose } from "@/lib/server/content/define-resource";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";

const lockedKinds = new Set(["units", "spells", "spell-groups", "artifacts", "races", "classes", "feats", "backgrounds"]);

const write = <T>(r: AnyContentResource, actor: Actor, callback: () => Promise<T>) => lockedKinds.has(r.kind) ? withCampaignContentWrite(actor.campaignId, callback) : callback();

async function found(r: AnyContentResource, actor: Actor, id: string | undefined, purpose: FindPurpose) {
  if (!id) throw new ContentError(r.notFound, 404);

  const row = await r.find(actor, id, purpose);

  if (!row) throw new ContentError(r.notFound, 404);

  return row;
}

const item = (r: AnyContentResource, row: unknown) => (r.toItem ? r.toItem(row) : row);

const invalidate = (r: AnyContentResource, actor: Actor) => {
  if (r.invalidates.length > 0) afterContentCommit(() => invalidateReference(r.invalidates, actor.campaignId));
};

export function listContent(r: AnyContentResource, actor: Actor, query: URLSearchParams) {
  assertCan(actor, NEED.read(r.access.list));

  return r.list(actor, query);
}

export async function getContent(r: AnyContentResource, actor: Actor, id: string) {
  assertCan(actor, NEED.read(r.access.item));

  const row = await found(r, actor, id, "read");

  return item(r, row);
}

export async function createContent(r: AnyContentResource, actor: Actor, raw: unknown) {
  assertCan(actor, NEED.write);

  let data = parseInput(r.schemas.create, raw);

  if (r.prepareCreate) data = await r.prepareCreate(actor, data);

  const created = await write(r, actor, () => r.create(actor, data));

  invalidate(r, actor);

  return item(r, created);
}

export async function updateContent(r: AnyContentResource, actor: Actor, id: string, raw: unknown) {
  assertCan(actor, NEED.write);

  if (r.prepareUpdate) {
    const existing = await found(r, actor, id, "write");

    raw = await r.prepareUpdate(actor, existing, parseInput(r.schemas.update, raw));
  }

  const updated = await write(r, actor, async () => {
    const existing = await found(r, actor, id, "write");

    return r.update(actor, existing, parseInput(r.schemas.update, raw));
  });

  invalidate(r, actor);

  return item(r, updated);
}

export async function removeContent(r: AnyContentResource, actor: Actor, id: string): Promise<void> {
  assertCan(actor, NEED.write);

  await write(r, actor, async () => {
    await r.remove(actor, await found(r, actor, id, "write"));

    if (prisma.compendiumEntry) await prisma.compendiumEntry.deleteMany({ where: { campaignId: actor.campaignId, kind: r.kind, localId: id } });
  });

  invalidate(r, actor);
}

export async function removeAllContent(r: AnyContentResource, actor: Actor): Promise<number> {
  assertCan(actor, NEED.writeAll);

  if (!r.removeAll) throw new ContentError(API_ERRORS.METHOD_NOT_ALLOWED, 405);

  const deleted = await write(r, actor, async () => {
    const count = await r.removeAll!(actor);

    if (prisma.compendiumEntry) await prisma.compendiumEntry.deleteMany({ where: { campaignId: actor.campaignId, kind: r.kind } });

    return count;
  });

  invalidate(r, actor);

  return deleted;
}
