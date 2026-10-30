import Link from "next/link";
import { Map as MapIcon } from "lucide-react";

import { JoinCampaignDialog } from "@/components/campaigns/join/JoinCampaignDialog";
import { type TemplateTile,TemplateTiles } from "@/components/campaigns/templates/TemplateTiles";
import { EmptyState, ErrorState } from "@/components/common/states";
import { HudCard, HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth";
import { CampaignKind, CampaignRole, CampaignStatus } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";

export default async function CampaignsPage() {
  const user = await getAuthUser();

  const t = await getTranslator(await getRequestLocale(), "campaigns");

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
        omit: { aiInstructions: true };
      }>
    >
  >;

  let campaigns: CampaignWithMembers = [];

  let templates: TemplateTile[] = [];

  try {
    templates = await prisma.campaign.findMany({
      where: { kind: CampaignKind.TEMPLATE, members: { some: { userId, role: CampaignRole.DM } } },
      select: { id: true, name: true, description: true, locale: true, templateKey: true },
      orderBy: { updatedAt: "desc" },
    });

    campaigns = await prisma.campaign.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
        status: CampaignStatus.ACTIVE,
        kind: CampaignKind.CAMPAIGN,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
      omit: { aiInstructions: true },
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
            <h2 className="hud-sc text-xl text-hud-ink">{t("page.dbError.title")}</h2>
            <ErrorState error={new Error(t("page.dbError.message"))} />
            <div className="rounded-lg bg-hud-field p-4">
              <p className="mb-2 text-sm font-semibold text-hud-gold">{t("page.dbError.fixTitle")}</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-hud-bone">
                <li>{t("page.dbError.steps.dashboard")}</li>
                <li>{t("page.dbError.steps.pooling")}</li>
                <li>{t("page.dbError.steps.env")}</li>
                <li>{t("page.dbError.steps.restart")}</li>
              </ol>
            </div>
          </HudPanel>
        </HudPage>
      );
    }

    throw error;
  }

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        actions={
          <>
            <JoinCampaignDialog />
            <Button className="whitespace-nowrap" asChild>
              <Link href="/campaigns/new">{t("page.new")}</Link>
            </Button>
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
                  <h2 className="hud-sc text-lg text-hud-ink">{campaign.name}</h2>
                  {isDM && (
                    <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#8a6414,var(--color-hud-gold-strong)_55%,#8a6414)] px-2 text-[11px] text-[#2a1d05]">{t("roles.dm")}</span>
                  )}
                </div>
                {campaign.description && <p className="text-sm text-hud-muted">{campaign.description}</p>}
                <div className="space-y-1 text-sm text-hud-muted">
                  <p>{t("card.level", { level: campaign.maxLevel })}</p>
                  <p>{t("card.players", { count: campaign.members.filter((m) => m.role === CampaignRole.PLAYER).length })}</p>
                  <p>
                    {t("card.inviteCode")} <code className="rounded bg-hud-field px-1.5 font-mono text-hud-bone">{campaign.inviteCode}</code>
                  </p>
                </div>
              </Link>
            </HudCard>
          );
        })}
      </div>

      {templates.length > 0 && (
        <section className="mt-8 space-y-3">
          <h2 className="hud-sc text-xl text-hud-ink">{t("page.templates")}</h2>
          <TemplateTiles templates={templates} />
        </section>
      )}

      {campaigns.length === 0 && (
        <EmptyState
          icon={MapIcon}
          title={t("page.empty.title")}
          action={
            <Button asChild>
              <Link href="/campaigns/new">{t("page.empty.action")}</Link>
            </Button>
          }
        />
      )}
    </HudPage>
  );
}
