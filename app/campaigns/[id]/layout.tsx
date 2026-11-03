import type { ReactNode } from "react";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { DemoTourCoordinator } from "@/components/onboarding/DemoTourCoordinator";
import { getSessionUserId } from "@/lib/auth";
import { isDemoKind } from "@/lib/constants/campaigns";
import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { getCampaignForLayout } from "@/lib/server/campaigns/access";

export default async function CampaignLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

  const campaign = userId ? await getCampaignForLayout(id, userId) : null;

  const isDemo = isDemoKind(campaign?.kind);

  return (
    <>
      {isDemo ? <ExtendLocaleScope namespaces={["demoTours"]}><DemoTourCoordinator campaignId={id}>{children}</DemoTourCoordinator></ExtendLocaleScope> : children}
      {!isDemo && <NotificationsHost campaignId={id} userId={userId} />}
    </>
  );
}
