import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DMUnitsPage({
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

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${params.id}`);
  }

  const units = await prisma.unit.findMany({
    where: {
      campaignId: params.id,
    },
    include: {
      unitGroup: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Групуємо юніти по групах
  const groupedUnits = units.reduce((acc, unit) => {
    const groupName = unit.unitGroup?.name || "Без групи";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(unit);
    return acc;
  }, {} as Record<string, typeof units>);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NPC Юніти</h1>
          <p className="text-muted-foreground mt-1">
            Управління мобами та юнітами
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/campaigns/${params.id}/dm/units/groups/new`}>
            <Button variant="outline">+ Група</Button>
          </Link>
          <Link href={`/campaigns/${params.id}/dm/units/new`}>
            <Button>+ Створити юніта</Button>
          </Link>
        </div>
      </div>

      {Object.entries(groupedUnits).map(([groupName, groupUnits]) => {
        const groupColor = groupUnits[0]?.unitGroup?.color || "#666";
        return (
          <Card key={groupName}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: groupColor }}
                />
                <CardTitle>{groupName}</CardTitle>
                <Badge variant="secondary">{groupUnits.length} юнітів</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupUnits.map((unit) => (
                  <Card key={unit.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{unit.name}</CardTitle>
                      <CardDescription>
                        Рівень {unit.level} • AC {unit.armorClass} • HP {unit.maxHp}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link
                        href={`/campaigns/${params.id}/dm/units/${unit.id}`}
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          Редагувати
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {units.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Поки немає юнітів
            </p>
            <Link href={`/campaigns/${params.id}/dm/units/new`}>
              <Button>Створити першого юніта</Button>
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
