import { assertWriteScope, requireDmMember } from "./guards";

import { prisma } from "@/lib/db";
import type { ActionExecutionContext } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import type { Actor } from "@/lib/utils/api/actor";
import { needFailure } from "@/lib/utils/api/need";

/** Record commands (create/delete/audio) share T10's transaction and live access boundary.
 * They cannot use saveBattle: creation has no scene, deletion removes it, audio has its own seq.
 */
export async function runGuardedBattleRecordOperation<T>(
  actor: Actor,
  callback: () => Promise<T>,
  execution?: ActionExecutionContext,
): Promise<T> {
  const failure = needFailure(actor, { access: "dm", scope: "battles:write" });

  if (failure) throw new ContentError(failure, 403);

  assertWriteScope(actor, execution);

  const run = () => withCampaignContentWrite(actor.campaignId, async () => {
    await requireDmMember(prisma, actor);

    return callback();
  });

  return execution ? runContentWriteContext(actor.campaignId, execution.db, run) : run();
}
