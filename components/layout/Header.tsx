'use client';

import { Fragment, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    CircleHelp,
    Globe,
    KeyRound,
    LogOut,
    Menu,
    Sparkles,
    User,
    UserRoundCog,
} from 'lucide-react';

import { JoinBattleButton } from '@/components/campaigns/JoinBattleButton';
import { WatchShowButton } from '@/components/campaigns/WatchShowButton';
import { AbbreviationsInfoDialog } from '@/components/layout/AbbreviationsInfoDialog';
import { HUD_SURFACE } from '@/components/hud';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { WhatsNewButton } from '@/components/onboarding/WhatsNewButton';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HudPortalClassProvider } from '@/components/ui/portal-class';
import { dmSectionHref, dmSectionsFor } from '@/lib/constants/campaigns';
import { useSessionUser, useSwitchGoogleAccount } from '@/lib/hooks/auth';
import { useCampaignRules, useIsTemplateCampaign } from '@/lib/hooks/campaigns';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';

function UserAvatar({
    url,
    className,
}: {
    url: string | null;
    className: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-hud-gold/60 bg-hud-panel text-hud-gold',
                className
            )}
        >
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                />
            ) : (
                <User className="size-4" aria-hidden />
            )}
        </span>
    );
}

const BATTLE_PATH = /^\/campaigns\/[^/]+\/battles\/[^/]+$/;

export function Header() {
    const t = useTranslations('common.header');

    const tCommon = useTranslator('common');

    const pathname = usePathname();

    const sessionUser = useSessionUser();

    const email = sessionUser?.email ?? null;

    const isTemplate = useIsTemplateCampaign(
        pathname?.includes('/dm/')
            ? pathname.match(/^\/campaigns\/([^/]+)/)?.[1]
            : undefined
    );

    const switchAccount = useSwitchGoogleAccount();

    const signOutForm = useRef<HTMLFormElement>(null);

    const campaignMatch = pathname?.match(/^\/campaigns\/([^/]+)/);

    const campaignId = campaignMatch?.[1];

    const isCampaignPage = !!campaignId;

    const isDMPage = pathname?.includes('/dm/') || false;

    const isPlayerPage = !isDMPage && isCampaignPage;

    const rules = useCampaignRules(isDMPage ? (campaignId ?? '') : '').data;

    const dmSections = dmSectionsFor({
        isTemplate,
        classesEnabled: classesEnabled(rules),
        system: rules?.system,
    });

    const isBattlePage = BATTLE_PATH.test(pathname ?? '');

    const width = isBattlePage
        ? 'w-full px-3 sm:px-6'
        : 'container mx-auto px-4 min-[96rem]:max-w-page';

    return (
        <header className="sticky top-0 z-50 w-full border-b border-hud-rule bg-hud-page/[.97]">
            <HudPortalClassProvider value={HUD_SURFACE}>
                <div
                    className={cn(
                        width,
                        'flex h-14 items-center justify-between'
                    )}
                >
                    <div className="flex items-center gap-2">
                        {isCampaignPage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong"
                                    >
                                        <Menu className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('campaignMenu')}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
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
                                                        <Link
                                                            href={dmSectionHref(
                                                                campaignId,
                                                                section
                                                            )}
                                                        >
                                                            {tCommon(
                                                                `dmMenu.${section.path}`
                                                            )}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {section.path ===
                                                        'characters' && (
                                                        <DropdownMenuItem
                                                            asChild
                                                        >
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
                                                <Link
                                                    href={`/campaigns/${campaignId}/character`}
                                                >
                                                    {t('myCharacter')}
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="flex min-w-0 items-center gap-0.5 sm:gap-2">
                        <JoinBattleButton />
                        <WatchShowButton />
                        {email && <WhatsNewButton />}
                        <AbbreviationsInfoDialog />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong"
                                >
                                    <UserAvatar
                                        url={sessionUser?.avatarUrl ?? null}
                                        className="size-7"
                                    />
                                    <span className="sr-only">
                                        {t('profile')}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {email && (
                                    <>
                                        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                                            <UserAvatar
                                                url={
                                                    sessionUser?.avatarUrl ??
                                                    null
                                                }
                                                className="size-8"
                                            />
                                            <span className="min-w-0 truncate">
                                                {email}
                                            </span>
                                        </div>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link href="/help">
                                        <CircleHelp className="mr-2 h-4 w-4" />
                                        {t('help')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings/password">
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        {t('password')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings/preferences">
                                        <Globe className="mr-2 h-4 w-4" />
                                        {t('preferences')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings/ai">
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        {t('aiKeys')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => void switchAccount.start()}
                                >
                                    <UserRoundCog className="mr-2 h-4 w-4" />
                                    {t('switchAccount')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() =>
                                        signOutForm.current?.requestSubmit()
                                    }
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {t('signOut')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className={`${width} pb-2`}>
                    <Breadcrumbs />
                </div>
                <form
                    ref={signOutForm}
                    action="/auth/signout"
                    method="post"
                    hidden
                />
            </HudPortalClassProvider>
        </header>
    );
}
