import type { ReactNode } from 'react';
import Link from 'next/link';
import { Archive, Compass, Map as MapIcon, Plus } from 'lucide-react';

import { CampaignCover } from '@/components/campaigns/CampaignCover';
import { JoinCampaignDialog } from '@/components/campaigns/join/JoinCampaignDialog';
import {
    type TemplateTile,
    TemplateTiles,
} from '@/components/campaigns/templates/TemplateTiles';
import { EmptyState, ErrorState } from '@/components/common/states';
import { type GameShellNavItem } from '@/components/hud';
import { HudCard, HudPage, HudPanel } from '@/components/hud/page';
import { GameShell } from '@/components/layout/GameShell';
import { Button } from '@/components/ui/button';
import { getAuthUser } from '@/lib/auth';
import {
    CampaignKind,
    CampaignRole,
    CampaignStatus,
} from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { visibleTemplates } from '@/lib/server/templates/list-templates';
import { safeParseRules } from '@/lib/utils/rules/schema';
import { systemKeyOf } from '@/lib/utils/rules/systems';

const COVER_CARD =
    'relative overflow-hidden !p-0 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-hud-line after:transition-colors hover:after:border-hud-gold focus-visible:after:border-hud-gold data-[tone=active]:after:border-hud-line';

export default async function CampaignsPage({
    searchParams,
}: {
    searchParams: Promise<{ archived?: string }>;
}) {
    const archived = (await searchParams).archived === 'true';

    const locale = await getRequestLocale();

    const [user, t, tCommon] = await Promise.all([
        getAuthUser(),
        getTranslator(locale, 'campaigns'),
        getTranslator(locale, 'common'),
    ]);

    const navItems: GameShellNavItem[] = [
        {
            id: 'campaigns',
            label: tCommon('gameNavigation.campaigns'),
            href: '/campaigns',
        },
    ];

    const renderPage = (content: ReactNode) => (
        <GameShell
            items={navItems}
            activeId="campaigns"
            title={tCommon('gameNavigation.campaigns')}
        >
            {content}
        </GameShell>
    );

    const userId = user.id;

    const cover = (src?: string | null) => (
        <div className="relative h-[120px] overflow-hidden after:absolute after:inset-0 after:bg-linear-to-b after:from-transparent after:from-30% after:to-hud-panel">
            <CampaignCover src={src} width={700} height={280} />
        </div>
    );

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

    let demoCampaign: {
        id: string;
        name: string;
        description: string | null;
        maxLevel: number;
        coverImage: string | null;
    } | null = null;

    try {
        const templatesQuery = prisma.campaign.findMany({
            where: {
                kind: CampaignKind.TEMPLATE,
                members: { some: { userId, role: CampaignRole.DM } },
            },
            select: {
                id: true,
                name: true,
                description: true,
                kind: true,
                visibility: true,
                locale: true,
                templateKey: true,
                rules: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        const demoQuery = prisma.campaign.findFirst({
            where: { kind: CampaignKind.DEMO, status: CampaignStatus.ACTIVE },
            select: {
                id: true,
                name: true,
                description: true,
                maxLevel: true,
                coverImage: true,
            },
        });

        const campaignsQuery = prisma.campaign.findMany({
            where: {
                members: {
                    some: {
                        userId: userId,
                    },
                },
                status: archived
                    ? CampaignStatus.ARCHIVED
                    : CampaignStatus.ACTIVE,
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
                updatedAt: 'desc',
            },
        });

        const [templateRows, campaignRows, demoRow] = await Promise.all([
            templatesQuery,
            campaignsQuery,
            demoQuery,
        ]);

        templates = visibleTemplates(templateRows).flatMap(
            ({ rules, ...tile }) => {
                const parsed = safeParseRules(rules);

                return parsed.ok
                    ? [{ ...tile, system: systemKeyOf(parsed.rules) }]
                    : [];
            }
        );
        campaigns = campaignRows;
        demoCampaign = demoRow;
    } catch (error: unknown) {
        console.error('Error fetching campaigns:', error);

        const prismaError = error as { code?: string; message?: string };

        if (
            prismaError?.code === 'P1001' ||
            prismaError?.message?.includes("Can't reach database")
        ) {
            return renderPage(
                <HudPage>
                    <HudPanel className="space-y-3">
                        <h2 className="hud-sc text-xl text-hud-ink">
                            {t('page.dbError.title')}
                        </h2>
                        <ErrorState
                            error={new Error(t('page.dbError.message'))}
                        />
                        <div className="rounded-lg bg-hud-field p-4">
                            <p className="mb-2 text-sm font-semibold text-hud-gold">
                                {t('page.dbError.fixTitle')}
                            </p>
                            <ol className="list-inside list-decimal space-y-1 text-sm text-hud-bone">
                                <li>{t('page.dbError.steps.dashboard')}</li>
                                <li>{t('page.dbError.steps.pooling')}</li>
                                <li>{t('page.dbError.steps.env')}</li>
                                <li>{t('page.dbError.steps.restart')}</li>
                            </ol>
                        </div>
                    </HudPanel>
                </HudPage>
            );
        }

        throw error;
    }

    return renderPage(
        <HudPage className="hud-wide">
            <header className="mb-5 flex flex-col gap-4 border-b border-hud-line pt-1 pb-4 sm:mb-6 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-hud-line bg-hud-panel text-hud-gold sm:size-12">
                        <Compass aria-hidden className="size-5 sm:size-6" />
                    </span>
                    <h1 className="hud-sc text-3xl leading-tight text-hud-ink sm:text-4xl">
                        {t('page.title')}
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="ghost"
                        size="lg"
                        className="text-hud-bone hover:bg-hud-panel"
                        asChild
                    >
                        <Link
                            href={
                                archived
                                    ? '/campaigns'
                                    : '/campaigns?archived=true'
                            }
                        >
                            <Archive aria-hidden />
                            {t(archived ? 'page.active' : 'page.archived')}
                        </Link>
                    </Button>
                    <JoinCampaignDialog />
                    <Button
                        size="lg"
                        className="flex-1 border border-hud-line sm:flex-none"
                        asChild
                    >
                        <Link href="/campaigns/new">
                            <Plus aria-hidden />
                            {t('page.new')}
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {demoCampaign && (
                    <HudCard asChild tone="active" className={COVER_CARD}>
                        <Link
                            href={`/campaigns/${demoCampaign.id}`}
                            className="flex h-full flex-col"
                        >
                            {cover(demoCampaign.coverImage)}
                            <div className="relative -mt-5 flex flex-1 flex-col gap-2 p-4">
                                <h2 className="hud-sc text-lg text-hud-ink">
                                    {t('demo.title')}
                                </h2>
                                <p className="text-sm text-hud-muted">
                                    {t('demo.description')}
                                </p>
                                {demoCampaign.description && (
                                    <p className="text-sm text-hud-bone">
                                        {demoCampaign.description}
                                    </p>
                                )}
                                <p className="text-sm text-hud-muted">
                                    {t('card.level', {
                                        level: demoCampaign.maxLevel,
                                    })}
                                </p>
                                <span className="mt-auto flex min-h-10 items-center justify-center rounded border border-hud-line px-4 text-sm font-medium text-hud-ink">
                                    {t('card.continue')}
                                </span>
                            </div>
                        </Link>
                    </HudCard>
                )}
                {campaigns.map((campaign) => {
                    const userMember = campaign.members.find(
                        (m) => m.userId === userId
                    );

                    const isDM = userMember?.role === CampaignRole.DM;

                    return (
                        <HudCard
                            key={campaign.id}
                            asChild
                            className={COVER_CARD}
                        >
                            <Link
                                href={`/campaigns/${campaign.id}`}
                                className="flex h-full flex-col"
                            >
                                {cover(campaign.coverImage)}
                                <div className="relative -mt-5 flex flex-1 flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <h2 className="hud-sc text-lg text-hud-ink">
                                            {campaign.name}
                                        </h2>
                                        {isDM && (
                                            <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#8a6414,var(--color-hud-gold-strong)_55%,#8a6414)] px-2 text-[11px] text-[var(--palette-primary-foreground,#2a1d05)]">
                                                {t('roles.dm')}
                                            </span>
                                        )}
                                    </div>
                                    {campaign.description && (
                                        <p className="text-sm text-hud-muted">
                                            {campaign.description}
                                        </p>
                                    )}
                                    <div className="space-y-1 text-sm text-hud-muted">
                                        <p>
                                            {t('card.level', {
                                                level: campaign.maxLevel,
                                            })}
                                        </p>
                                        <p>
                                            {t('card.players', {
                                                count: campaign.members.filter(
                                                    (m) =>
                                                        m.role ===
                                                        CampaignRole.PLAYER
                                                ).length,
                                            })}
                                        </p>
                                        {isDM && (
                                            <p>
                                                {t('card.inviteCode')}{' '}
                                                <code className="rounded bg-hud-field px-1.5 font-mono text-hud-bone">
                                                    {campaign.inviteCode}
                                                </code>
                                            </p>
                                        )}
                                    </div>
                                    <span className="mt-auto flex min-h-11 items-center justify-center rounded border border-hud-gold bg-hud-field px-4 text-sm font-medium text-hud-gold">
                                        {t('card.continue')}
                                    </span>
                                </div>
                            </Link>
                        </HudCard>
                    );
                })}
                <Link
                    href="/campaigns/new"
                    className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hud-line p-4 text-hud-gold hover:border-hud-muted"
                >
                    <Plus className="size-6" aria-hidden />
                    {t('page.new')}
                </Link>
            </div>

            {templates.length > 0 && (
                <section className="mt-8 space-y-3">
                    <h2 className="hud-sc text-xl text-hud-ink">
                        {t('page.templates')}
                    </h2>
                    <TemplateTiles templates={templates} />
                </section>
            )}

            {campaigns.length === 0 && (
                <EmptyState
                    icon={MapIcon}
                    title={t('page.empty.title')}
                    action={
                        <Button asChild>
                            <Link href="/campaigns/new">
                                {t('page.empty.action')}
                            </Link>
                        </Button>
                    }
                />
            )}
        </HudPage>
    );
}
