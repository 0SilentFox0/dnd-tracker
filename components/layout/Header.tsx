'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { HUD_SURFACE, HudShellHeader } from '@/components/hud';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { HeaderActions } from '@/components/layout/HeaderActions';
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { HudPortalClassProvider } from '@/components/ui/portal-class';
import { dmSectionHref, dmSectionsFor } from '@/lib/constants/campaigns';
import {
    useCampaignRules,
    useCampaignSystemSelection,
    useIsTemplateCampaign,
    useMapLibraryEnabled,
} from '@/lib/hooks/campaigns';
import { useTranslator } from '@/lib/i18n/use-translator';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';

export function Header() {
    const t = useTranslations('common.header');

    const tCommon = useTranslator('common');

    const pathname = usePathname();

    const isTemplate = useIsTemplateCampaign(
        pathname?.includes('/dm/')
            ? pathname.match(/^\/campaigns\/([^/]+)/)?.[1]
            : undefined
    );

    const campaignMatch = pathname?.match(/^\/campaigns\/([^/]+)/);

    const campaignId = campaignMatch?.[1];

    const isCampaignPage = !!campaignId;

    const isDMPage = pathname?.includes('/dm/') || false;

    const isPlayerPage = !isDMPage && isCampaignPage;

    const dmCampaignId = isDMPage ? (campaignId ?? '') : '';

    const rules = useCampaignRules(dmCampaignId).data;

    const system = useCampaignSystemSelection(dmCampaignId);

    const mapLibraryEnabled = useMapLibraryEnabled(dmCampaignId);

    const dmSections = dmSectionsFor({
        isTemplate,
        classesEnabled: classesEnabled(rules),
        mapLibraryEnabled,
        system,
    });

    const menuContent = (
        <>
            <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaignId}`}>
                    {t('campaignOverview')}
                </Link>
            </DropdownMenuItem>
            {isDMPage && (
                <>
                    <DropdownMenuSeparator />
                    {dmSections.map((section) => (
                        <Fragment key={section.path}>
                            <DropdownMenuItem asChild>
                                <Link href={dmSectionHref(campaignId ?? "", section)}>
                                    {tCommon(`dmMenu.${section.path}`)}
                                </Link>
                            </DropdownMenuItem>
                            {section.path === 'characters' && (
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/campaigns/${campaignId}/dm/characters?type=npc_hero`}
                                    >
                                        {t('npcHeroes')}
                                    </Link>
                                </DropdownMenuItem>
                            )}
                        </Fragment>
                    ))}
                </>
            )}
            {isPlayerPage && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/campaigns/${campaignId}/character`}>
                            {t('myCharacter')}
                        </Link>
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    return (
        <HudPortalClassProvider value={HUD_SURFACE}>
            <HudShellHeader
                menu={
                    isCampaignPage
                        ? { label: t('campaignMenu'), content: menuContent }
                        : undefined
                }
                breadcrumb={<Breadcrumbs />}
                actions={<HeaderActions />}
            />
        </HudPortalClassProvider>
    );
}
