import type { ReactNode } from "react";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { getSessionUserId } from "@/lib/auth";

export default async function CampaignLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

  return (
    <>
      {children}
      <NotificationsHost campaignId={id} userId={userId} />
    </>
  );
}
