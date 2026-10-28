import { BookOpen, Images, Info, User } from "lucide-react";

import { CampaignMembersList } from "@/components/campaigns/members/CampaignMembersList";
import { CampaignSettingsButton } from "@/components/campaigns/settings/CampaignSettingsButton";
import { InviteCodeDisplay } from "@/components/campaigns/settings/InviteCodeDisplay";
import { CreditsText } from "@/components/campaigns/templates/CreditsText";
import { SourceSyncButton } from "@/components/campaigns/templates/SourceSyncButton";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel, HudTile } from "@/components/hud/page";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { CampaignKind, CampaignStatus, dmTilesFor } from "@/lib/constants/campaigns";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { onboardingKeys } from "@/lib/hooks/onboarding/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignWithMembers } from "@/lib/server/campaigns/access";
import { readCampaignOnboarding } from "@/lib/server/onboarding/campaign";
import { pluralUk } from "@/lib/utils/common/plural";
import { parseRules } from "@/lib/utils/rules/schema";

const TILES_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3";

const LABEL = "text-sm text-hud-muted";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { campaign, isDM, authUser: user } = await requireCampaignWithMembers(id);

  const isTemplate = campaign.kind === CampaignKind.TEMPLATE;

  const classesEnabled = parseRules(campaign.rules).classes.enabled;

  const [pendingDrafts, onboarding] = await Promise.all([
    isDM ? prisma.character.count({ where: { campaignId: id, status: CharacterStatus.PENDING } }) : 0,
    // онбординг не має валити сторінку кампанії
    readCampaignOnboarding(id, user.id, isDM).catch(() => null),
  ]);

  const dmTiles = dmTilesFor({ isTemplate, classesEnabled });

  const subtitleOf = (path: string, subtitle?: string) =>
    path === "characters" && pendingDrafts ? `${subtitle} · ${pendingDrafts} на схваленні` : subtitle;

  return (
    <HudPage>
      <HudPageHeader
        title={campaign.name}
        subtitle={campaign.description}
        actions={<span className="self-center break-all text-sm text-hud-muted">{user.email}</span>}
      />

      {isTemplate && (
        <HudPanel className="flex flex-wrap items-start gap-2 border-hud-gold/60">
          <Info className="mt-0.5 size-4 shrink-0 text-hud-gold" />
          <p className="min-w-0 flex-1 text-sm text-hud-bone">Це шаблон: зміни потрапляють у нові кампанії, створені з нього; наявні кампанії не змінюються.</p>
          {campaign.credits && <CreditsText credits={campaign.credits} className="basis-full" />}
          {isDM && campaign.createdFromId && (
            <div className="ml-auto">
              <SourceSyncButton campaignId={id} isTemplate />
            </div>
          )}
        </HudPanel>
      )}

      {!isTemplate && (
        <PrefetchedQuery queryKey={onboardingKeys.campaign(id)} data={onboarding}>
          <OnboardingChecklist campaignId={id} />
        </PrefetchedQuery>
      )}

      {isDM && <HudPanel><a className="underline" href={`/campaigns/${id}/dm/compendium`}>Імпорт JSON-компендіуму та збережені звіти</a><p>Наповніть кампанію одним JSON: бібліотеки, матеріали ДМ і наступні дії.</p></HudPanel>}

      <HudPanel>
        <HudSection
          title="Налаштування кампанії"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isDM && (
                <CampaignSettingsButton
                  campaignId={id}
                  campaign={{
                    name: campaign.name,
                    description: campaign.description || null,
                    maxLevel: campaign.maxLevel,
                    allowPlayerEdit: campaign.allowPlayerEdit,
                    status: campaign.status,
                  }}
                  meta={{ createdFromId: campaign.createdFromId ?? null, isTemplate, credits: campaign.credits ?? null }}
                />
              )}
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className={LABEL}>Макс. рівень</p>
              <p className="text-lg font-semibold text-hud-ink">{campaign.maxLevel}</p>
            </div>
            {!isTemplate && (
              <div id="invite" className="scroll-mt-20">
                <p className={`${LABEL} mb-2`}>Код запрошення</p>
                <InviteCodeDisplay inviteCode={campaign.inviteCode} />
              </div>
            )}
            <div>
              <p className={LABEL}>Статус</p>
              <span className="inline-block rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]">
                {campaign.status === CampaignStatus.ACTIVE ? "Активна" : "Архівована"}
              </span>
            </div>
          </div>
        </HudSection>
      </HudPanel>

      {!isTemplate && (
      <HudPanel>
        <HudSection title="Учасники">
          <p className={`${LABEL} mb-2`}>
            {campaign.members.length} {pluralUk(campaign.members.length, ["учасник", "учасники", "учасників"])} в кампанії
          </p>
          <CampaignMembersList campaignId={id} members={campaign.members} isDM={isDM} />
        </HudSection>
      </HudPanel>
      )}

      <div className={TILES_GRID}>
        {!isTemplate && (
          <HudTile
            href={`/campaigns/${id}/info`}
            icon={<BookOpen className="size-5" />}
            title="Інформація — Довідник"
            subtitle="Скіли, заклинання й артефакти: як діють і в кого що."
          />
        )}
        {isDM &&
          dmTiles.map(({ path, icon: Icon, label, title, subtitle }) => (
            <HudTile key={path} href={`/campaigns/${id}/dm/${path}`} icon={<Icon className="size-5" />} title={title ?? label} subtitle={subtitleOf(path, subtitle)} />
          ))}
        {!isDM && !isTemplate && (
          <>
            <HudTile href={`/campaigns/${id}/character`} icon={<User className="size-5" />} title="Мій персонаж" subtitle="Перегляд та редагування персонажа" />
            <HudTile href={`/campaigns/${id}/show`} icon={<Images className="size-5" />} title="Показ" subtitle="Слайди й музику від ДМ під час гри" />
          </>
        )}
      </div>
    </HudPage>
  );
}
