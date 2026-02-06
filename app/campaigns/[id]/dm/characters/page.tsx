import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { DMCharactersClient } from "./page-client";

export default async function DMCharactersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();
  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign) {
    redirect("/campaigns");
  }

  const userMember = campaign.members[0];

  if (!userMember || userMember.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

  return <DMCharactersClient campaignId={id} />;
}
