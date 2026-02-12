import Link from "next/link";

import { JoinBattleButton } from "@/components/campaigns/JoinBattleButton";
import { JoinCampaignDialog } from "@/components/campaigns/join/JoinCampaignDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CampaignsPage() {
  const user = await getAuthUser();

  const userId = user.id;

  // Отримуємо кампанії де юзер є учасником
  type CampaignWithMembers = Awaited<
    ReturnType<
      typeof prisma.campaign.findMany<{
        include: {
          members: {
            include: {
              user: true;
            };
          };
        };
      }>
    >
  >;

  let campaigns: CampaignWithMembers = [];

  try {
    campaigns = await prisma.campaign.findMany({
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
  } catch (error: unknown) {
    console.error("Error fetching campaigns:", error);

    // Якщо помилка підключення до бази - показуємо повідомлення
    const prismaError = error as { code?: string; message?: string };

    if (
      prismaError?.code === "P1001" ||
      prismaError?.message?.includes("Can't reach database")
    ) {
      return (
        <div className="container mx-auto p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-2">
              Помилка підключення до бази даних
            </h2>
            <p className="text-yellow-700 mb-4">
              Не вдається підключитися до бази даних. Перевірте DATABASE_URL в
              .env файлі.
            </p>
            <div className="bg-white p-4 rounded border border-yellow-300">
              <p className="text-sm font-semibold mb-2">Як виправити:</p>
              <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                <li>Відкрийте Supabase Dashboard → Settings → Database</li>
                <li>Скопіюйте Connection Pooling URI (порт 6543)</li>
                <li>Оновіть DATABASE_URL в .env файлі</li>
                <li>Перезапустіть dev сервер</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    throw error; // Якщо інша помилка - пробрасываем далі
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Мої Кампанії</h1>
        <div className="flex gap-2 shrink-0">
          <JoinCampaignDialog />
          <Link href="/campaigns/new">
            <Button className="whitespace-nowrap w-full md:w-auto">
              + Нова Кампанія
            </Button>
          </Link>
        </div>
      </div>

      {/* Кнопка JOIN BATTLE — оновлюється автоматично без перезавантаження */}
      <JoinBattleButton />

      {/* Список кампаній */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const userMember = campaign.members.find((m) => m.userId === userId);

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
                    <p>
                      Гравців:{" "}
                      {
                        campaign.members.filter((m) => m.role === "player")
                          .length
                      }
                    </p>
                    <p>
                      Код запрошення:{" "}
                      <code className="bg-muted px-1 rounded">
                        {campaign.inviteCode}
                      </code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            У вас поки немає кампаній
          </p>
          <Link href="/campaigns/new">
            <Button>Створити першу кампанію</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
