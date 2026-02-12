import { redirect } from "next/navigation";

import { CharacterViewClient } from "./character-view-client";

import { Card, CardContent } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CharacterPage({
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

  if (!userMember) {
    redirect("/campaigns");
  }

  const isDM = userMember.role === "dm";

  // Знаходимо персонажа гравця
  const character = await prisma.character.findFirst({
    where: {
      campaignId: id,
      controlledBy: userId,
      type: "player",
    },
    include: {
      inventory: true,
    },
  });

  if (!character) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              У вас поки немає персонажа в цій кампанії
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CharacterViewClient
      campaignId={id}
      characterId={character.id}
      allowPlayerEdit={campaign.allowPlayerEdit ?? false}
      isDM={isDM}
    />
  );
}
