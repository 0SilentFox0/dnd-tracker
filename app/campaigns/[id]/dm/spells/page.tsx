import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

  const groupedSpells = spells.reduce((acc, spell) => {
    const groupName = spell.spellGroup?.name || "Без групи";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(spell);
    return acc;
  }, {} as Record<string, typeof spells>);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Заклинання</h1>
          <p className="text-muted-foreground mt-1">
            База заклинань кампанії
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/campaigns/${id}/dm/spells/groups/new`}>
            <Button variant="outline">+ Група</Button>
          </Link>
          <Link href={`/campaigns/${id}/dm/spells/new`}>
            <Button>+ Створити заклинання</Button>
          </Link>
        </div>
      </div>

      {Object.entries(groupedSpells).map(([groupName, groupSpells]) => (
        <Card key={groupName}>
          <CardHeader>
            <CardTitle>{groupName}</CardTitle>
            <CardDescription>{groupSpells.length} заклинань</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupSpells.map((spell) => (
                <Card key={spell.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{spell.name}</CardTitle>
                      <Badge variant={spell.level === 0 ? "secondary" : "default"}>
                        {spell.level === 0 ? "Cantrip" : `Рівень ${spell.level}`}
                      </Badge>
                    </div>
                    <CardDescription className="flex gap-2 mt-2">
                      <Badge variant="outline">{spell.type}</Badge>
                      <Badge variant="outline">{spell.damageType}</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {spell.description}
                    </p>
                    <Link
                      href={`/campaigns/${id}/dm/spells/${spell.id}`}
                      className="mt-2 block"
                    >
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Редагувати
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {spells.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Поки немає заклинань
            </p>
            <Link href={`/campaigns/${id}/dm/spells/new`}>
              <Button>Створити перше заклинання</Button>
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
