import type { ReactNode } from "react";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { DemoTourCoordinator } from "@/components/onboarding/DemoTourCoordinator";
import { getSessionUserId } from "@/lib/auth";
import { CampaignRole, isDemoKind } from "@/lib/constants/campaigns";
import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { WFRP_CAMPAIGN_EXTRA, WFRP_DM_EXTRA } from "@/lib/i18n/scopes";
import { getCampaignForLayout } from "@/lib/server/campaigns/access";
import { isWfrpCampaign } from "@/lib/server/campaigns/system-key";

export default async function CampaignLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

  const [campaign, wfrpSystem] = userId ? await Promise.all([getCampaignForLayout(id, userId), isWfrpCampaign(id)]) : [null, false];

  const isDemo = isDemoKind(campaign?.kind);

  const isWfrp = !!campaign && wfrpSystem;

  const isDM = campaign?.members?.[0]?.role === CampaignRole.DM;

  const content = isDemo ? <ExtendLocaleScope namespaces={["demoTours"]}><DemoTourCoordinator campaignId={id}>{children}</DemoTourCoordinator></ExtendLocaleScope> : children;

  return (
    <>
      {isWfrp ? <ExtendLocaleScope namespaces={isDM ? [...WFRP_CAMPAIGN_EXTRA, ...WFRP_DM_EXTRA] : WFRP_CAMPAIGN_EXTRA}>{content}</ExtendLocaleScope> : content}
      {!isDemo && <NotificationsHost campaignId={id} userId={userId} />}
    </>
  );
}
