'use client';

import { useMemo } from 'react';

import { NewPill } from '@/components/common/entity/NewPill';
import { HudPanel, HudTile } from '@/components/hud/page';
import {
    type DashboardContext,
    type DashboardSection,
    DEFAULT_DASHBOARD_CONTEXT,
    DEMO_DASHBOARD_SECTIONS,
    DM_HOSTED_SECTION_KEYS,
    dmDashboardSectionsFor,
    PLAYER_DASHBOARD_SECTIONS,
} from '@/lib/constants/campaign-dashboard';
import { NOTIFICATION_TILE_TYPES } from '@/lib/constants/notifications';
import { useNotifications } from '@/lib/hooks/notifications';
import { useTranslator } from '@/lib/i18n/use-translator';
import { hasUnread } from '@/lib/utils/notifications/select';

const GRID = 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3';

const libraryGrid = (count: number) =>
    `grid grid-cols-1 gap-2 sm:grid-cols-2 ${count % 4 === 0 || count % 3 !== 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`;

export function DashboardGroups({
    campaignId,
    isDM,
    isDemo = false,
    pendingDrafts,
    context = DEFAULT_DASHBOARD_CONTEXT,
    hiddenKeys,
    hostsDmBlocks = false,
}: {
    campaignId: string;
    isDM: boolean;
    isDemo?: boolean;
    pendingDrafts: number;
    context?: DashboardContext;
    hiddenKeys?: string[];
    hostsDmBlocks?: boolean;
}) {
    const t = useTranslator('dashboard');

    const isPlayer = !isDM && !isDemo;

    const { data: notifications } = useNotifications(campaignId, {
        enabled: isPlayer,
    });

    const sections = isDemo
        ? DEMO_DASHBOARD_SECTIONS
        : isDM
          ? dmDashboardSectionsFor(context)
          : PLAYER_DASHBOARD_SECTIONS;

    const base = useMemo(
        () => sections.filter((s) => !hiddenKeys?.includes(s.key)),
        [sections, hiddenKeys]
    );

    const tile = (s: DashboardSection) => {
        const Icon = s.icon;

        const sectionSubtitle = t(`sections.${s.key}.subtitle`);

        const subtitle =
            s.key === 'characters' && pendingDrafts > 0
                ? t('pendingSubtitle', {
                      subtitle: sectionSubtitle,
                      count: pendingDrafts,
                  })
                : sectionSubtitle;

        return (
            <HudTile
                key={s.key}
                href={s.href(campaignId)}
                icon={<Icon className="size-5" />}
                title={t(`sections.${s.key}.title`)}
                subtitle={subtitle}
                badge={
                    isPlayer &&
                    hasUnread(
                        notifications,
                        NOTIFICATION_TILE_TYPES[s.key] ?? []
                    ) ? (
                        <NewPill />
                    ) : undefined
                }
            />
        );
    };

    const isLibrary = (s: DashboardSection) =>
        s.group === 'libraries' || (hostsDmBlocks && s.key === 'info');

    const hosted = hostsDmBlocks ? DM_HOSTED_SECTION_KEYS : [];

    const libraryItems = isPlayer ? [] : base.filter(isLibrary);

    const mainItems = base.filter(
        (s) => !isLibrary(s) && !hosted.includes(s.key)
    );

    return (
        <div className="space-y-4">
            {mainItems.length > 0 && (
                <HudPanel
                    as="div"
                    className="space-y-3"
                    data-tour="dashboard.sections"
                >
                    {isPlayer && (
                        <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">
                            {t('groups.player')}
                        </h2>
                    )}
                    <div className={GRID}>{mainItems.map(tile)}</div>
                </HudPanel>
            )}
            {libraryItems.length > 0 && (
                <HudPanel
                    as="div"
                    className="space-y-3"
                    data-tour="dashboard.group-libraries"
                >
                    <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">
                        {t('groups.libraries')}
                    </h2>
                    <div className={libraryGrid(libraryItems.length)}>
                        {libraryItems.map(tile)}
                    </div>
                </HudPanel>
            )}
        </div>
    );
}
