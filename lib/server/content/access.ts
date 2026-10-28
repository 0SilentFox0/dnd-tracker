import "server-only";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";
import { needFailure } from "@/lib/utils/api/need";

export function assertCan(actor: Actor, need: ActorNeed): void {
  const failure = needFailure(actor, need);

  if (failure) throw new ContentError(failure, 403);
}
