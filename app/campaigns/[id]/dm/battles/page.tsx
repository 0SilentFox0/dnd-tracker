import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DeleteAllBattlesButton } from "./page-client";

export default async function DMBattlesPage({
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

  const battles = await prisma.battleScene.findMany({
    where: {
      campaignId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const activeBattles = battles.filter(b => b.status === "active");
  const preparedBattles = battles.filter(b => b.status === "prepared");
  const completedBattles = battles.filter(b => b.status === "completed");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Сцени Боїв</h1>
          <p className="text-muted-foreground mt-1">
            Створення та управління боями
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/campaigns/${id}/dm/battles/new`} className="shrink-0">
            <Button className="whitespace-nowrap w-full md:w-auto">+ Створити сцену бою</Button>
          </Link>
          <DeleteAllBattlesButton campaignId={id} battlesCount={battles.length} />
        </div>
      </div>

      {/* Активні бої */}
      {activeBattles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Активні бої</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeBattles.map((battle) => {
              const participants = battle.participants as Array<{ id: string; type: string; side: string }>;
              return (
                <Card key={battle.id} className="border-green-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{battle.name}</CardTitle>
                      <Badge className="bg-green-600">Активний</Badge>
                    </div>
                    {battle.description && (
                      <CardDescription>{battle.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Раунд: <span className="font-semibold">{battle.currentRound}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Учасників: <span className="font-semibold">{participants.length}</span>
                      </p>
                    </div>
                    <Link href={`/campaigns/${id}/battles/${battle.id}`}>
                      <Button className="w-full">Перейти до бою</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Підготовлені бої */}
      {preparedBattles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Підготовлені бої</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {preparedBattles.map((battle) => {
              const participants = battle.participants as Array<{ id: string; type: string; side: string }>;
              return (
                <Card key={battle.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{battle.name}</CardTitle>
                      <Badge variant="secondary">Підготовлено</Badge>
                    </div>
                    {battle.description && (
                      <CardDescription>{battle.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Учасників: <span className="font-semibold">{participants.length}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/campaigns/${id}/dm/battles/${battle.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          Редагувати
                        </Button>
                      </Link>
                      <Link href={`/campaigns/${id}/battles/${battle.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          Запустити
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Завершені бої */}
      {completedBattles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Завершені бої</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedBattles.map((battle) => {
              const participants = battle.participants as Array<{ id: string; type: string; side: string }>;
              return (
                <Card key={battle.id} className="opacity-75 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{battle.name}</CardTitle>
                      <Badge variant="outline">Завершено</Badge>
                    </div>
                    {battle.description && (
                      <CardDescription>{battle.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Учасників: <span className="font-semibold">{participants.length}</span>
                      </p>
                    </div>
                    <Link href={`/campaigns/${id}/dm/battles/${battle.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Переглянути
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {battles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Поки немає сцен боїв
            </p>
            <Link href={`/campaigns/${id}/dm/battles/new`}>
              <Button>Створити першу сцену бою</Button>
            </Link>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
