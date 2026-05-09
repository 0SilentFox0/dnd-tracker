/**
 * Server-page helpers для access-check кампанії (CODE_AUDIT 1.2).
 *
 * Раніше у кожному `app/campaigns/[id]/**\/page.tsx` повторювалась
 * inline-логіка:
 *   const user = await getAuthUser();
 *   const campaign = await prisma.campaign.findUnique({...});
 *   if (!campaign) redirect("/campaigns");
 *   const member = campaign.members.find(m => m.userId === user.id);
 *   if (!member) redirect("/campaigns");
 *   const isDM = member.role === "dm";
 *
 * 25+ файлів з варіаціями. Тепер:
 *   const { campaign, userId, isDM } = await requireCampaignMember(id);
 *   const { campaign, userId } = await requireCampaignDM(id);
 *   const { campaign, userId, isDM } = await requireCampaignWithMembers(id);
 *
 * Семантика:
 *  - не залогінений → redirect("/sign-in") (через getAuthUser)
 *  - кампанія не існує → redirect("/campaigns")
 *  - user не member → redirect("/campaigns")
 *  - DM-only access, але user player → redirect(`/campaigns/${id}`)
 *
 * NB: цей хелпер для **server-pages**. Для API-routes —
 * `requireCampaignAccess` / `requireDM` у `lib/utils/api/api-auth.ts`,
 * які повертають NextResponse замість redirect-у.
 */

import { redirect } from "next/navigation";
import type { Campaign, CampaignMember, User } from "@prisma/client";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SlimMembership = {
  userId: string;
  role: string;
};

type FullMembership = CampaignMember & { user: User };

/**
 * Завантажує campaign + проста перевірка членства.
 * Повертає лише власну membership (для access-check, не для UI).
 *
 * Use case: DM dashboard pages, де показуєш список ресурсів кампанії,
 * не потрібен повний список members.
 */
export async function requireCampaignMember(campaignId: string): Promise<{
  campaign: Campaign;
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
  });

  if (!campaign) redirect("/campaigns");

  const member = campaign.members[0];

  if (!member) redirect("/campaigns");

  return {
    // members не повертаємо — це лише slim access-check map.
    // Споживачі, яким треба список members, кличуть requireCampaignWithMembers.
    campaign: campaign as Campaign,
    userId,
    role: member.role,
    isDM: member.role === "dm",
    authUser,
  };
}

/**
 * Те саме, що requireCampaignMember, але з додатковою DM-only перевіркою.
 * Не-DM → redirect(`/campaigns/${id}`).
 */
export async function requireCampaignDM(campaignId: string): Promise<{
  campaign: Campaign;
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
  campaign: Campaign & {
    members: FullMembership[];
    dm: User | null;
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
        include: { user: true },
      },
      dm: true,
    },
  });

  if (!campaign) redirect("/campaigns");

  const member = campaign.members.find((m) => m.userId === userId);

  if (!member) redirect("/campaigns");

  return {
    campaign,
    userId,
    role: member.role,
    isDM: member.role === "dm",
    ownMembership: { userId: member.userId, role: member.role },
    authUser,
  };
}
