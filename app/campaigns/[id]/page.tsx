import Link from 'next/link';
import { Info } from 'lucide-react';

import '@/components/campaigns/dashboard/dashboard.css';
import '@/lib/server/systems/registry';
import { CampaignRecentSession } from '@/components/campaigns/dashboard/CampaignRecentSession';
import { CampaignSummaryPanel } from '@/components/campaigns/dashboard/CampaignSummaryPanel';
import { CampaignWorldPreview } from '@/components/campaigns/dashboard/CampaignWorldPreview';
import { DashboardGroups } from '@/components/campaigns/dashboard/DashboardGroups';
import { DmNextSteps } from '@/components/campaigns/dashboard/DmNextSteps';
import { DmPartyCard } from '@/components/campaigns/dashboard/DmPartyCard';
import { DmPrepPanel } from '@/components/campaigns/dashboard/DmPrepPanel';
import { PlayerHeroCard } from '@/components/campaigns/dashboard/PlayerHeroCard';
import { CampaignMembersList } from '@/components/campaigns/members/CampaignMembersList';
import { CampaignSettingsButton } from '@/components/campaigns/settings/CampaignSettingsButton';
import { CreditsText } from '@/components/campaigns/templates/CreditsText';
import { PublishTemplateButton } from '@/components/campaigns/templates/PublishTemplateButton';
import { SourceSyncButton } from '@/components/campaigns/templates/SourceSyncButton';
import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { type GameShellNavItem } from '@/components/hud';
import {
    HudPage,
    HudPanel,
} from '@/components/hud/page';
import { GameShell } from '@/components/layout/GameShell';
import { DemoTourMenu } from '@/components/onboarding/DemoTourMenu';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { SystemGate } from '@/components/systems/SystemGate';
import { Button } from '@/components/ui/button';
import {
    dashboardHiddenKeys,
    DM_QUICK_SECTION_KEYS,
    dmDashboardSectionsFor,
} from '@/lib/constants/campaign-dashboard';
import {
    CampaignKind,
    dmSectionHref,
    dmSectionsFor,
} from '@/lib/constants/campaigns';
import { onboardingKeys } from '@/lib/hooks/onboarding';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignWithMembers } from '@/lib/server/campaigns/access';
import {
    readDmDashboard,
    readPlayerDashboard,
} from '@/lib/server/campaigns/dashboard';
import { readCampaignOnboarding } from '@/lib/server/onboarding/campaign';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { parseRules } from '@/lib/utils/rules/schema';

const DEFAULT_CAMPAIGN_COVER = '/example-demo/maps/grove.jpg';

export default async function CampaignDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const locale = await getRequestLocale();

    const [t, tCommon, tGameTerms] = await Promise.all([
        getTranslator(locale, 'dashboard'),
        getTranslator(locale, 'common'),
        getTranslator(locale, 'gameTerms'),
    ]);

    const {
        campaign,
        isDM,
        isDemo,
        authUser: user,
    } = await requireCampaignWithMembers(id);

    const isTemplate = campaign.kind === CampaignKind.TEMPLATE;

    const isPlayer = !isDM && !isDemo;

    const hasMembership = !isTemplate && !isDemo;

    const rules = parseRules(campaign.rules);

    const hasClasses = classesEnabled(rules);

    const [dm, player, onboarding] = await Promise.all([
        isDM && !isTemplate ? readDmDashboard(id).catch(() => null) : null,
        isPlayer ? readPlayerDashboard(id, user.id).catch(() => null) : null,
        // onboarding must not break the campaign page
        hasMembership
            ? readCampaignOnboarding(id, user.id, isDM).catch(() => null)
            : null,
    ]);

    const hiddenKeys = dashboardHiddenKeys({
        isDM,
        isDemo,
        hasWorld: isDemo || !!player?.hasWorld,
        acquaintancesEnabled: campaign.acquaintancesEnabled,
    });

    const context = {
        isTemplate,
        classesEnabled: hasClasses,
        mapLibraryEnabled: campaign.mapLibraryEnabled,
        system: rules.system,
    };

    const navItems: GameShellNavItem[] = [
        {
            id: 'overview',
            label: tCommon('gameNavigation.dashboard'),
            href: `/campaigns/${id}`,
        },
    ];

    if (isDM) {
        const visibleSections = dmSectionsFor(context);

        for (const item of [
            { id: 'battle', path: 'battles' },
            { id: 'world' },
            { id: 'character', path: 'characters' },
            { id: 'scenario', path: 'scenario' },
            { id: 'show', path: 'show' },
        ] as const) {
            if (item.id === 'world') {
                navItems.push({
                    id: item.id,
                    label: tCommon('gameNavigation.world'),
                    href: `/campaigns/${id}/dm/world`,
                });
                continue;
            }

            const section = visibleSections.find(
                (candidate) => candidate.path === item.path
            );

            if (section) {
                navItems.push({
                    id: item.id,
                    label: tCommon(`gameNavigation.${item.id}`),
                    href: dmSectionHref(id, section),
                });
            }
        }
    } else {
        if (player?.activeBattle) {
            navItems.push({
                id: 'battle',
                label: tCommon('gameNavigation.battle'),
                href: `/campaigns/${id}/battles/${player.activeBattle.battleId}`,
            });
        }

        if (player?.hasWorld) {
            navItems.push({
                id: 'world',
                label: tCommon('gameNavigation.world'),
                href: `/campaigns/${id}/world`,
            });
        }

        navItems.push(
            {
                id: 'character',
                label: tCommon('gameNavigation.character'),
                href: `/campaigns/${id}/character`,
            },
            {
                id: 'show',
                label: tCommon('gameNavigation.show'),
                href: `/campaigns/${id}/show`,
            }
        );
    }

    const heroItems = navItems.filter(
        (item) =>
            !isDemo &&
            (isDM
                ? ['battle', 'world', 'scenario'].includes(item.id)
                : ['battle', 'world', 'character'].includes(item.id))
    );

    const quickSectionKeys = dmDashboardSectionsFor(context)
        .filter(
            (section) =>
                DM_QUICK_SECTION_KEYS.includes(section.key) &&
                !hiddenKeys.includes(section.key)
        )
        .map((section) => section.key);

    const settings = {
        name: campaign.name,
        description: campaign.description,
        coverImage: campaign.coverImage,
        maxLevel: campaign.maxLevel,
        allowPlayerEdit: campaign.allowPlayerEdit,
        critChoiceByDm: campaign.critChoiceByDm,
        acquaintancesEnabled: campaign.acquaintancesEnabled,
        mapLibraryEnabled: campaign.mapLibraryEnabled,
        status: campaign.status,
    };

    const hasDmParty = (dm?.party.length ?? 0) > 0;

    const page = (
        <HudPage className="campaign-dashboard">
            <HudPanel as="div" className="dashboard-hero" data-tour="dashboard.header">
                <div className="dashboard-hero-art" aria-hidden="true">
                    <OptimizedImage
                        src={campaign.coverImage || DEFAULT_CAMPAIGN_COVER}
                        alt=""
                        width={1800}
                        height={620}
                        className="size-full object-cover"
                        fallback={<OptimizedImage src={DEFAULT_CAMPAIGN_COVER} alt="" width={1800} height={620} className="size-full object-cover" />}
                    />
                </div>
                {isDM && <div className="dashboard-hero-settings">
                                <CampaignSettingsButton
                                    campaignId={id}
                                    campaign={settings}
                                    meta={{
                                        createdFromId:
                                            campaign.createdFromId ?? null,
                                        isTemplate,
                                        credits: campaign.credits ?? null,
                                    }}
                                />
                </div>}
                <div className="dashboard-hero-heading">
                    <p className="dashboard-kicker">{t('summary.title')} · {tGameTerms(`ruleSystem.${rules.system.key}`)}</p>
                    <h1>{campaign.name}</h1>
                    {campaign.description && <p className="dashboard-description">{campaign.description}</p>}
                    {isDemo && <span className="text-sm">{t('page.demoDmRole')}</span>}
                </div>
                <CampaignSummaryPanel
                    campaign={{
                        ...settings,
                        inviteCode:
                            isDM && !isTemplate ? campaign.inviteCode : null,
                    }}
                    isDM={isDM}
                    memberCount={
                        isDemo
                            ? null
                            : t('page.members.count', {
                                  count: campaign.members.length,
                              })
                    }
                />
                {heroItems.length > 0 && (
                    <div className="dashboard-hero-actions">
                        {heroItems.map((item, index) => (
                            <Button asChild key={item.id} variant="outline" className={index === 0 ? 'dashboard-primary' : undefined}>
                                <Link href={item.href}>{item.label}</Link>
                            </Button>
                        ))}
                    </div>
                )}
            </HudPanel>

            {isTemplate && (
                <HudPanel className="flex flex-wrap items-start gap-2 border-hud-gold/60">
                    <Info className="mt-0.5 size-4 shrink-0 text-hud-gold" />
                    <p className="min-w-0 flex-1 text-sm text-hud-bone">
                        {t('page.templateNotice')}
                    </p>
                    {campaign.credits && (
                        <CreditsText
                            credits={campaign.credits}
                            className="basis-full"
                        />
                    )}
                    {isDM && (
                        <div className="ml-auto flex flex-wrap gap-2">
                            {campaign.createdFromId && (
                                <SourceSyncButton campaignId={id} isTemplate />
                            )}
                            {!campaign.baseSourceId && (
                                <PublishTemplateButton campaignId={id} />
                            )}
                        </div>
                    )}
                </HudPanel>
            )}

            <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
                <div
                    className={`min-w-0 [&>*]:h-full ${isTemplate ? 'lg:col-span-12' : 'lg:col-span-8'}`}
                >
                    {isDemo && (
                        <HudPanel
                            className="h-full border-hud-gold/60"
                            data-tour="dashboard.notice"
                        >
                            <p className="text-sm text-hud-bone">
                                {t('page.demoNotice')}
                            </p>
                        </HudPanel>
                    )}
                    {hasDmParty && dm && (
                        <DmPartyCard campaignId={id} party={dm.party} />
                    )}
                    {isDM && !isTemplate && !hasDmParty && (
                        <HudPanel data-tour="dashboard.party-empty">
                            <h2 className="hud-sc mb-2 text-[13px] tracking-[.06em] text-hud-gold">
                                {t('party.title')}
                            </h2>
                            <p className="text-sm text-hud-muted">
                                {t('party.empty')}
                            </p>
                            <Link
                                href={`/campaigns/${id}/dm/characters`}
                                className="mt-2 inline-flex min-h-8 items-center text-sm font-medium text-hud-gold underline-offset-4 hover:underline"
                            >
                                {t('party.all')}
                            </Link>
                        </HudPanel>
                    )}
                    {player && (
                        <SystemGate system={rules.system}>
                            <PlayerHeroCard campaignId={id} data={player} />
                        </SystemGate>
                    )}
                </div>

                {isDM && !isTemplate && dm && (
                    <aside className="relative min-w-0 lg:col-span-4">
                        <div className="flex flex-col gap-4 lg:absolute lg:inset-0 [&>*]:min-h-0 [&>*]:flex-1 [&>*]:overflow-y-auto">
                        <DmPrepPanel campaignId={id} data={dm} />
                        <CampaignRecentSession
                            campaignId={id}
                            session={dm.latestSession}
                        />
                        </div>
                    </aside>
                )}

                {isDemo && (
                    <div className="min-w-0 lg:col-span-4">
                        <DemoTourMenu />
                    </div>
                )}

                {isDM && !isTemplate && dm && (
                    <>
                        <div className="min-w-0 lg:col-span-5 [&>*]:h-full">
                            <CampaignWorldPreview
                                campaignId={id}
                                worldMap={dm.worldMap}
                            />
                        </div>
                        <div className="min-w-0 lg:col-span-4 [&>*]:h-full">
                            <DmNextSteps
                                campaignId={id}
                                sectionKeys={quickSectionKeys}
                            />
                        </div>
                    </>
                )}

                {hasMembership && (
                    <div
                        className={`relative min-h-72 min-w-0 ${isDM && !isTemplate && dm ? 'lg:col-span-3' : 'lg:col-span-4'}`}
                    >
                        <HudPanel
                            className="flex h-full flex-col lg:absolute lg:inset-0"
                            data-tour="dashboard.members"
                        >
                            <div className="mb-2 flex items-baseline justify-between gap-2">
                                <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">
                                    {t('page.members.title')}
                                </h2>
                                <span
                                    aria-label={t('page.members.count', {
                                        count: campaign.members.length,
                                    })}
                                    className="text-xs text-hud-muted"
                                >
                                    {campaign.members.length}
                                </span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <CampaignMembersList
                                    campaignId={id}
                                    members={campaign.members}
                                    isDM={isDM}
                                    isOwner={campaign.dmUserId === user.id}
                                    ownerId={campaign.dmUserId}
                                />
                            </div>
                        </HudPanel>
                    </div>
                )}

                <div className="min-w-0 lg:col-span-12">
                    <DashboardGroups
                        campaignId={id}
                        isDM={isDM}
                        isDemo={isDemo}
                        pendingDrafts={dm?.pendingDrafts ?? 0}
                        context={context}
                        hiddenKeys={hiddenKeys}
                        hostsDmBlocks={isDM && !isTemplate && !!dm}
                        libraryCounts={dm?.libraryCounts}
                    />
                </div>
            </div>

            {hasMembership && (
                <PrefetchedQuery
                    queryKey={onboardingKeys.campaign(id)}
                    data={onboarding}
                >
                    <OnboardingChecklist campaignId={id} />
                </PrefetchedQuery>
            )}
        </HudPage>
    );

    return process.env.NEXT_PUBLIC_GAME_UI_SHELL === 'true' ? (
        <GameShell
            items={navItems}
            activeId="overview"
            title={tCommon('gameNavigation.dashboard')}
            breadcrumbRootLabel={tCommon('gameNavigation.campaign')}
        >
            {page}
        </GameShell>
    ) : (
        page
    );
}
