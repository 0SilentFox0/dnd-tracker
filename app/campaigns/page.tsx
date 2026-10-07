import Link from "next/link";
import { Map as MapIcon } from "lucide-react";

import { JoinCampaignDialog } from "@/components/campaigns/join/JoinCampaignDialog";
import { EmptyState, ErrorState } from "@/components/common/states";
import { HudCard, HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

export default async function CampaignsPage() {
  const user = await getAuthUser();

  const userId = user.id;

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

    const prismaError = error as { code?: string; message?: string };

    if (
      prismaError?.code === "P1001" ||
      prismaError?.message?.includes("Can't reach database")
    ) {
      return (
        <HudPage>
          <HudPanel className="space-y-3">
            <h2 className="hud-sc text-xl text-[#efe5d2]">Помилка підключення до бази даних</h2>
            <ErrorState error={new Error("Не вдається підключитися до бази даних. Перевірте DATABASE_URL в .env файлі.")} />
            <div className="rounded-lg bg-[#1a140f] p-4">
              <p className="mb-2 text-sm font-semibold text-[#c9b37a]">Як виправити:</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-[#e6dccb]">
                <li>Відкрийте Supabase Dashboard → Settings → Database</li>
                <li>Скопіюйте Connection Pooling URI (порт 6543)</li>
                <li>Оновіть DATABASE_URL в .env файлі</li>
                <li>Перезапустіть dev сервер</li>
              </ol>
            </div>
          </HudPanel>
        </HudPage>
      );
    }

    throw error; // Якщо інша помилка - пробрасываем далі
  }

  return (
    <HudPage>
      <HudPageHeader
        title="Мої Кампанії"
        actions={
          <>
            <JoinCampaignDialog />
            <Link href="/campaigns/new">
              <Button className="whitespace-nowrap">+ Нова Кампанія</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const userMember = campaign.members.find((m) => m.userId === userId);

          const isDM = userMember?.role === CampaignRole.DM;

          return (
            <HudCard key={campaign.id} asChild className="space-y-2">
              <Link href={`/campaigns/${campaign.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="hud-sc text-lg text-[#efe5d2]">{campaign.name}</h2>
                  {isDM && (
                    <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)] px-2 text-[11px] text-[#2a1d05]">DM</span>
                  )}
                </div>
                {campaign.description && <p className="text-sm text-[#8f8473]">{campaign.description}</p>}
                <div className="space-y-1 text-sm text-[#8f8473]">
                  <p>Рівень: до {campaign.maxLevel}</p>
                  <p>Гравців: {campaign.members.filter((m) => m.role === CampaignRole.PLAYER).length}</p>
                  <p>
                    Код запрошення: <code className="rounded bg-[#1a140f] px-1.5 font-mono text-[#e6dccb]">{campaign.inviteCode}</code>
                  </p>
                </div>
              </Link>
            </HudCard>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <EmptyState
          icon={MapIcon}
          title="У вас поки немає кампаній"
          action={
            <Link href="/campaigns/new">
              <Button>Створити першу кампанію</Button>
            </Link>
          }
        />
      )}
    </HudPage>
  );
}
