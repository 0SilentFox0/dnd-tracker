import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteCodeDisplay } from "@/components/campaigns/InviteCodeDisplay";
import { CampaignMembersList } from "@/components/campaigns/CampaignMembersList";
import { CampaignSettingsButton } from "@/components/campaigns/CampaignSettingsButton";

export default async function CampaignDetailPage({
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
        include: {
          user: true,
        },
      },
      dm: true,
    },
  });

  if (!campaign) {
    redirect("/campaigns");
  }

  const userMember = campaign.members.find(m => m.userId === userId);
  if (!userMember) {
    redirect("/campaigns");
  }

  const isDM = userMember.role === "dm";
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-1">{campaign.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
      </div>

      {/* Налаштування кампанії */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Налаштування кампанії</CardTitle>
            {isDM && (
              <CampaignSettingsButton
                campaignId={id}
                initialName={campaign.name}
                initialDescription={campaign.description || null}
                initialMaxLevel={campaign.maxLevel}
                initialXpMultiplier={campaign.xpMultiplier}
                initialAllowPlayerEdit={campaign.allowPlayerEdit}
                initialStatus={campaign.status}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Макс. рівень</p>
              <p className="text-lg font-semibold">{campaign.maxLevel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Множник XP</p>
              <p className="text-lg font-semibold">{campaign.xpMultiplier}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Код запрошення</p>
              <InviteCodeDisplay inviteCode={campaign.inviteCode} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Статус</p>
              <Badge>{campaign.status === "active" ? "Активна" : "Архівована"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список гравців */}
      <Card>
        <CardHeader>
          <CardTitle>Учасники</CardTitle>
          <CardDescription>
            {campaign.members.length} учасник(ів) в кампанії
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignMembersList
            campaignId={id}
            members={campaign.members}
            isDM={isDM}
          />
        </CardContent>
      </Card>

      {/* Навігація для DM */}
      {isDM && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href={`/campaigns/${id}/dm/characters`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Персонажі</CardTitle>
                <CardDescription>Управління персонажами гравців</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/npc-heroes`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>NPC Герої</CardTitle>
                <CardDescription>Управління NPC героями</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/units`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>NPC Юніти</CardTitle>
                <CardDescription>Управління мобами та юнітами</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/spells`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Заклинання</CardTitle>
                <CardDescription>База заклинань кампанії</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/artifacts`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Артефакти</CardTitle>
                <CardDescription>Управління артефактами та сетами</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/skills`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Бібліотека Скілів</CardTitle>
                <CardDescription>Управління скілами та їх ефектами</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/skill-trees`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Дерева Прокачки</CardTitle>
                <CardDescription>Налаштування дерев прокачки для рас</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/dm/battles`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Сцени Боїв</CardTitle>
                <CardDescription>Створення та управління боями</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}

      {/* Навігація для Player */}
      {!isDM && (
        <Card>
          <CardHeader>
            <CardTitle>Мій персонаж</CardTitle>
            <CardDescription>Перегляд та редагування персонажа</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/campaigns/${id}/character`}>
              <Button>Переглянути персонажа</Button>
            </Link>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
