import "server-only";
import { invalidateAllReference } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { type PublishResult, publishTemplateVersion } from "@/lib/server/templates/publish";
import type { Actor } from "@/lib/utils/api/actor";

const PUBLISH_TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 };

export async function publishTemplate(actor: Actor): Promise<PublishResult> {
  assertCan(actor, CONTENT_OPERATIONS["template.publish"].need);

  const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { kind: true } });

  if (campaign?.kind !== CampaignKind.TEMPLATE) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  // publishTemplateVersion bumps contentVersion itself, only when something changed
  const result = await withCampaignContentWrite(actor.campaignId, (tx) => publishTemplateVersion(tx, actor.campaignId), { bump: false, lock: "no-key-update", ...PUBLISH_TX_OPTIONS });

  afterContentCommit(() => invalidateAllReference(actor.campaignId));

  return result;
}
