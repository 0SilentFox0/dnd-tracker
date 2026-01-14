import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function DMNPCHeroesPage({
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

  const npcHeroes = await prisma.character.findMany({
    where: {
      campaignId: id,
      type: "npc_hero",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">NPC Герої</h1>
          <p className="text-muted-foreground mt-1">
            Управління NPC героями кампанії
          </p>
        </div>
        <Link href={`/campaigns/${id}/dm/npc-heroes/new`} className="shrink-0">
          <Button className="whitespace-nowrap w-full md:w-auto">+ Створити NPC Героя</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {npcHeroes.map((hero) => (
          <Card key={hero.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={hero.avatar || undefined} />
                    <AvatarFallback>
                      {hero.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{hero.name}</CardTitle>
                    <CardDescription>NPC Герой</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {hero.race} {hero.subrace || ""}
                </Badge>
                <Badge variant="outline">{hero.class}</Badge>
                <Badge variant="default">Рівень {hero.level}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">HP:</span>{" "}
                  <span className="font-semibold">
                    {hero.currentHp}/{hero.maxHp}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">AC:</span>{" "}
                  <span className="font-semibold">{hero.armorClass}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href={`/campaigns/${id}/dm/npc-heroes/${hero.id}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" size="sm">
                    Редагувати
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {npcHeroes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Поки немає NPC героїв
            </p>
            <Link href={`/campaigns/${id}/dm/npc-heroes/new`}>
              <Button>Створити першого NPC героя</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Link href={`/campaigns/${id}`}>
          <Button variant="outline">← Назад до кампанії</Button>
        </Link>
      </div>
    </div>
  );
}
