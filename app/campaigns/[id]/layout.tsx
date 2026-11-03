import type { ReactNode } from "react";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { DemoTourCoordinator } from "@/components/onboarding/DemoTourCoordinator";
import { getSessionUserId } from "@/lib/auth";
import { isDemoKind } from "@/lib/constants/campaigns";
import { getCampaignForLayout } from "@/lib/server/campaigns/access";

export default async function CampaignLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

  const campaign = userId ? await getCampaignForLayout(id, userId) : null;

  const isDemo = isDemoKind(campaign?.kind);

  return (
    <>
      {isDemo ? <DemoTourCoordinator campaignId={id}>{children}</DemoTourCoordinator> : children}
      <NotificationsHost campaignId={id} userId={userId} />
    </>
  );
}
