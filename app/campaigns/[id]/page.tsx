import { BookOpen, Gem, GitBranch, Shield, Skull, Sparkles, Swords, User, Users } from "lucide-react";

import { JoinBattleButton } from "@/components/campaigns/JoinBattleButton";
import { CampaignMembersList } from "@/components/campaigns/members/CampaignMembersList";
import { CampaignSettingsButton } from "@/components/campaigns/settings/CampaignSettingsButton";
import { InviteCodeDisplay } from "@/components/campaigns/settings/InviteCodeDisplay";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel, HudTile } from "@/components/hud/page";
import { requireCampaignWithMembers } from "@/lib/campaigns/access";
import { CampaignStatus } from "@/lib/constants/campaigns";
import { pluralUk } from "@/lib/utils/plural";

const TILES_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3";

const LABEL = "text-sm text-hud-muted";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { campaign, isDM, authUser: user } = await requireCampaignWithMembers(id);

  const dmTiles = [
    { path: "characters", icon: Users, title: "Персонажі", subtitle: "Управління персонажами гравців" },
    { path: "units", icon: Skull, title: "NPC Юніти", subtitle: "Управління мобами та юнітами" },
    { path: "spells", icon: Sparkles, title: "Заклинання", subtitle: "База заклинань кампанії" },
    { path: "artifacts", icon: Gem, title: "Артефакти", subtitle: "Управління артефактами та сетами" },
    { path: "skills", icon: BookOpen, title: "Бібліотека Скілів", subtitle: "Управління скілами та їх ефектами" },
    { path: "skill-trees", icon: GitBranch, title: "Дерева Прокачки", subtitle: "Налаштування дерев прокачки для рас" },
    { path: "races", icon: Shield, title: "Ігрові Раси", subtitle: "Управління расами та їх здібностями" },
    { path: "battles", icon: Swords, title: "Сцени Боїв", subtitle: "Створення та управління боями" },
  ];

  return (
    <HudPage>
      <HudPageHeader
        title={campaign.name}
        subtitle={campaign.description}
        actions={<span className="self-center break-all text-sm text-hud-muted">{user.email}</span>}
      />

      <HudPanel>
        <HudSection
          title="Налаштування кампанії"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <JoinBattleButton />
              {isDM && (
                <CampaignSettingsButton
                  campaignId={id}
                  campaign={{
                    name: campaign.name,
                    description: campaign.description || null,
                    maxLevel: campaign.maxLevel,
                    xpMultiplier: campaign.xpMultiplier,
                    allowPlayerEdit: campaign.allowPlayerEdit,
                    status: campaign.status,
                  }}
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
            <div>
              <p className={LABEL}>Множник XP</p>
              <p className="text-lg font-semibold text-hud-ink">{campaign.xpMultiplier}</p>
            </div>
            <div>
              <p className={`${LABEL} mb-2`}>Код запрошення</p>
              <InviteCodeDisplay inviteCode={campaign.inviteCode} />
            </div>
            <div>
              <p className={LABEL}>Статус</p>
              <span className="inline-block rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]">
                {campaign.status === CampaignStatus.ACTIVE ? "Активна" : "Архівована"}
              </span>
            </div>
          </div>
        </HudSection>
      </HudPanel>

      <HudPanel>
        <HudSection title="Учасники">
          <p className={`${LABEL} mb-2`}>
            {campaign.members.length} {pluralUk(campaign.members.length, ["учасник", "учасники", "учасників"])} в кампанії
          </p>
          <CampaignMembersList campaignId={id} members={campaign.members} isDM={isDM} />
        </HudSection>
      </HudPanel>

      <div className={TILES_GRID}>
        <HudTile
          href={`/campaigns/${id}/info`}
          icon={<BookOpen className="size-5" />}
          title="Інформація — Довідник"
          subtitle="Скіли та заклинання: як діють, опис вигляду. Для ознайомлення з механіками."
        />
        {isDM &&
          dmTiles.map(({ path, icon: Icon, title, subtitle }) => (
            <HudTile key={path} href={`/campaigns/${id}/dm/${path}`} icon={<Icon className="size-5" />} title={title} subtitle={subtitle} />
          ))}
        {!isDM && (
          <HudTile href={`/campaigns/${id}/character`} icon={<User className="size-5" />} title="Мій персонаж" subtitle="Перегляд та редагування персонажа" />
        )}
      </div>
    </HudPage>
  );
}
