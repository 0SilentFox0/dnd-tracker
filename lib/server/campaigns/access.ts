/**
 * Access-check кампанії для server-pages: не залогінений → /sign-in, немає кампанії чи членства → /campaigns,
 * DM-only для гравця → /campaigns/[id]. Для API-routes — `requireCampaignAccess` / `requireDM` у `lib/utils/api/api-auth.ts`.
 */

import { redirect } from "next/navigation";
import type { Campaign, CampaignMember } from "@prisma/client";

import "server-only";
import { getAuthUser } from "@/lib/auth";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { PublicUser } from "@/types/campaigns";

// aiInstructions is DM-only and always omitted from page reads
type PublicCampaign = Omit<Campaign, "aiInstructions">;

type SlimMembership = {
  userId: string;
  role: string;
};

type FullMembership = CampaignMember & { user: PublicUser };

/**
 * Завантажує campaign + проста перевірка членства.
 * Повертає лише власну membership (для access-check, не для UI).
 *
 * Use case: DM dashboard pages, де показуєш список ресурсів кампанії,
 * не потрібен повний список members.
 */
export async function requireCampaignMember(campaignId: string): Promise<{
  campaign: PublicCampaign;
  userId: string;
  role: string;
  isDM: boolean;
  authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
  const authUser = await getAuthUser();

  const userId = authUser.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: {
        where: { userId },
      },
    },
    omit: { aiInstructions: true },
  });

  if (!campaign) redirect("/campaigns");

  const member = campaign.members[0];

  if (!member) redirect("/campaigns");

  return {
    // members не повертаємо — це лише slim access-check map.
    // Споживачі, яким треба список members, кличуть requireCampaignWithMembers.
    campaign,
    userId,
    role: member.role,
    isDM: member.role === CampaignRole.DM,
    authUser,
  };
}

/**
 * Те саме, що requireCampaignMember, але з додатковою DM-only перевіркою.
 * Не-DM → redirect(`/campaigns/${id}`).
 */
export async function requireCampaignDM(campaignId: string): Promise<{
  campaign: PublicCampaign;
  userId: string;
  authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
  const result = await requireCampaignMember(campaignId);

  if (!result.isDM) redirect(`/campaigns/${campaignId}`);

  return {
    campaign: result.campaign,
    userId: result.userId,
    authUser: result.authUser,
  };
}

/**
 * Завантажує campaign з усіма members + user-relation для UI рендеру.
 * Повертає role поточного користувача окремо.
 *
 * Use case: campaign detail page, де треба показати members list.
 */
export async function requireCampaignWithMembers(
  campaignId: string,
): Promise<{
  campaign: PublicCampaign & {
    members: FullMembership[];
    dm: PublicUser | null;
  };
  userId: string;
  role: string;
  isDM: boolean;
  ownMembership: SlimMembership;
  authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
  const authUser = await getAuthUser();

  const userId = authUser.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: {
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
      dm: { select: PUBLIC_USER_SELECT },
    },
    omit: { aiInstructions: true },
  });

  if (!campaign) redirect("/campaigns");

  const member = campaign.members.find((m) => m.userId === userId);

  if (!member) redirect("/campaigns");

  return {
    campaign,
    userId,
    role: member.role,
    isDM: member.role === CampaignRole.DM,
    ownMembership: { userId: member.userId, role: member.role },
    authUser,
  };
}
