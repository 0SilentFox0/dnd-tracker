import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DMSpellsPageClient } from "./page-client";

export default async function DMSpellsPage({
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

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

  const spells = await prisma.spell.findMany({
    where: {
      campaignId: id,
    },
    include: {
      spellGroup: true,
    },
    orderBy: {
      level: "asc",
    },
  });

  return <DMSpellsPageClient campaignId={id} initialSpells={spells} />;
}
