import { assertWriteScope, requireDmMember } from "./guards";

import { isDemoKind } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import type { ActionExecutionContext } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignRuntimeWrite } from "@/lib/server/content/write";
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
  options: { allowDemoAudio?: boolean } = {},
): Promise<T> {
  const failure = needFailure(actor, { access: "dm", scope: "battles:write" });

  if (failure) throw new ContentError(failure, 403);

  assertWriteScope(actor, execution);

  const run = () => withCampaignRuntimeWrite(actor.campaignId, async () => {
    if (options.allowDemoAudio && actor.via === "session") {
      const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { kind: true } });

      if (!campaign || !isDemoKind(campaign.kind)) await requireDmMember(prisma, actor);
    } else {
      await requireDmMember(prisma, actor);
    }

    return callback();
  });

  return execution ? runContentWriteContext(actor.campaignId, execution.db, run) : run();
}
