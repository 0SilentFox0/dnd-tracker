import { notFound } from "next/navigation";

import { DeckEditorPageClient } from "./page-client";

import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toSlideDeck } from "@/lib/server/show/deck-store";

export default async function DeckEditorPage({ params }: { params: Promise<{ id: string; deckId: string }> }) {
  const { id, deckId } = await params;

  await requireCampaignDM(id);

  const row = await prisma.slideDeck.findFirst({ where: { id: deckId, campaignId: id } });

  if (!row) notFound();

  return <DeckEditorPageClient campaignId={id} deck={toSlideDeck(row)} />;
}
