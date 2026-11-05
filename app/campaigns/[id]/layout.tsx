import type { ReactNode } from "react";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { DemoTourCoordinator } from "@/components/onboarding/DemoTourCoordinator";
import { getSessionUserId } from "@/lib/auth";
import { isDemoKind } from "@/lib/constants/campaigns";
import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { WFRP_CAMPAIGN_EXTRA } from "@/lib/i18n/scopes";
import { getCampaignForLayout } from "@/lib/server/campaigns/access";
import { isWfrpCampaign } from "@/lib/server/campaigns/system-key";

export default async function CampaignLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

  const campaign = userId ? await getCampaignForLayout(id, userId) : null;

  const isDemo = isDemoKind(campaign?.kind);

  const isWfrp = campaign ? await isWfrpCampaign(id) : false;

  const content = isDemo ? <ExtendLocaleScope namespaces={["demoTours"]}><DemoTourCoordinator campaignId={id}>{children}</DemoTourCoordinator></ExtendLocaleScope> : children;

  return (
    <>
      {isWfrp ? <ExtendLocaleScope namespaces={WFRP_CAMPAIGN_EXTRA}>{content}</ExtendLocaleScope> : content}
      {!isDemo && <NotificationsHost campaignId={id} userId={userId} />}
    </>
  );
}
