import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function DMCharactersPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
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
    redirect(`/campaigns/${params.id}`);
  }

  // Отримуємо всіх персонажів кампанії
  const characters = await prisma.character.findMany({
    where: {
      campaignId: params.id,
      type: "player",
    },
    include: {
      user: true,
      inventory: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Персонажі Гравців</h1>
          <p className="text-muted-foreground mt-1">
            Управління персонажами гравців кампанії
          </p>
        </div>
        <Link href={`/campaigns/${params.id}/dm/characters/new`}>
          <Button>+ Створити персонажа</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <Card key={character.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={character.avatar || undefined} />
                    <AvatarFallback>
                      {character.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{character.name}</CardTitle>
                    <CardDescription>
                      {character.user?.displayName || "Не призначено"}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {character.race} {character.subrace || ""}
                </Badge>
                <Badge variant="outline">{character.class}</Badge>
                <Badge variant="default">Рівень {character.level}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">HP:</span>{" "}
                  <span className="font-semibold">
                    {character.currentHp}/{character.maxHp}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">XP:</span>{" "}
                  <span className="font-semibold">{character.experience}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">AC:</span>{" "}
                  <span className="font-semibold">{character.armorClass}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Initiative:</span>{" "}
                  <span className="font-semibold">{character.initiative}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href={`/campaigns/${params.id}/dm/characters/${character.id}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" size="sm">
                    Редагувати
                  </Button>
                </Link>
                <Link
                  href={`/campaigns/${params.id}/dm/characters/${character.id}/inventory`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" size="sm">
                    Інвентар
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {characters.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Поки немає персонажів гравців
            </p>
            <Link href={`/campaigns/${params.id}/dm/characters/new`}>
              <Button>Створити першого персонажа</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Link href={`/campaigns/${params.id}`}>
          <Button variant="outline">← Назад до кампанії</Button>
        </Link>
      </div>
    </div>
  );
}
