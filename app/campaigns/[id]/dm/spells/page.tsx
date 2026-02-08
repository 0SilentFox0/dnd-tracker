import { redirect } from "next/navigation";

import { DMSpellsPageClient } from "./page-client";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const spellsForClient = spells.map((s) => ({
    ...s,
    effects: Array.isArray(s.effects) ? (s.effects as string[]) : null,
  }));

  return (
    <DMSpellsPageClient campaignId={id} initialSpells={spellsForClient} />
  );
}
