import type { ReactNode } from "react";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { DemoTourCoordinator } from "@/components/onboarding/DemoTourCoordinator";
import { getSessionUserId } from "@/lib/auth";
import { CampaignRole, isDemoKind } from "@/lib/constants/campaigns";
import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { systemScope } from "@/lib/i18n/system-scope";
import { getCampaignForLayout } from "@/lib/server/campaigns/access";
import { systemKeyOfCampaign } from "@/lib/server/campaigns/system-key";

export default async function CampaignLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

  const [campaign, systemKey] = userId ? await Promise.all([getCampaignForLayout(id, userId), systemKeyOfCampaign(id)]) : [null, null];

  const isDemo = isDemoKind(campaign?.kind);

  const isDM = campaign?.members?.[0]?.role === CampaignRole.DM;

  const content = isDemo ? <ExtendLocaleScope namespaces={["demoTours"]}><DemoTourCoordinator campaignId={id}>{children}</DemoTourCoordinator></ExtendLocaleScope> : children;

  const key = campaign ? systemKey : null;

  const namespaces = [...systemScope(key, "campaign"), ...systemScope(key, "member"), ...(isDM ? systemScope(key, "dm") : [])];

  return (
    <>
      {namespaces.length ? <ExtendLocaleScope namespaces={namespaces}>{content}</ExtendLocaleScope> : content}
      {!isDemo && <NotificationsHost campaignId={id} userId={userId} />}
    </>
  );
}
