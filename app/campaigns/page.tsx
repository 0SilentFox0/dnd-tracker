import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getAuthUser } from "@/lib/auth";

export default async function CampaignsPage() {
  const user = await getAuthUser();
  const userId = user.id;

  // Отримуємо кампанії де юзер є учасником
  const campaigns = await prisma.campaign.findMany({
    where: {
      members: {
        some: {
          userId: userId,
        },
      },
      status: "active",
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Перевіряємо чи є активні бої
  const activeBattles = await prisma.battleScene.findMany({
    where: {
      campaign: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      status: "active",
    },
    select: {
      id: true,
      campaignId: true,
    },
  });

  const hasActiveBattle = activeBattles.length > 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Мої Кампанії</h1>
        <Link href="/campaigns/new">
          <Button>+ Нова Кампанія</Button>
        </Link>
      </div>

      {/* Кнопка JOIN BATTLE */}
      <div className="flex justify-center">
        <Link href={hasActiveBattle ? `/campaigns/${activeBattles[0].campaignId}/battles/${activeBattles[0].id}` : "#"}>
          <Button 
            size="lg" 
            className={hasActiveBattle ? "animate-pulse bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}
            disabled={!hasActiveBattle}
          >
            {hasActiveBattle ? "⚔️ JOIN BATTLE" : "⚔️ JOIN BATTLE (Немає активних боїв)"}
          </Button>
        </Link>
      </div>

      {/* Список кампаній */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const userMember = campaign.members.find(m => m.userId === userId);
          const isDM = userMember?.role === "dm";
          
          return (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{campaign.name}</CardTitle>
                    {isDM && <Badge variant="default">DM</Badge>}
                  </div>
                  {campaign.description && (
                    <CardDescription>{campaign.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Рівень: до {campaign.maxLevel}</p>
                    <p>Гравців: {campaign.members.filter(m => m.role === "player").length}</p>
                    <p>Код запрошення: <code className="bg-muted px-1 rounded">{campaign.inviteCode}</code></p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">У вас поки немає кампаній</p>
          <Link href="/campaigns/new">
            <Button>Створити першу кампанію</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
