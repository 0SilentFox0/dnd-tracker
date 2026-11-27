'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { GameShellNavItem } from '@/components/hud';
import { HudChipTabs } from '@/components/hud/page';
import { AccountSidebar } from '@/components/layout/AccountSidebar';
import { GameShellClient } from '@/components/layout/GameShellClient';
import { PROFILE_MENU } from '@/components/layout/profile-menu';

const PROFILE_HREF = '/profile';

const NAV = [
    { id: 'profile', href: PROFILE_HREF },
    ...PROFILE_MENU.flatMap((e) =>
        'href' in e ? [{ id: e.id as string, href: e.href }] : []
    ),
];

type HeaderT = ReturnType<typeof useTranslations<'common.header'>>;

const DM_ONLY_NAV = new Set(['soundLibrary']);

export function accountNavItems(
    t: HeaderT,
    dmTools = true
): GameShellNavItem[] {
    return NAV.filter((e) => dmTools || !DM_ONLY_NAV.has(e.id)).map(
        ({ id, href }) => ({
            id,
            href,
            label: t(id as Parameters<HeaderT>[0]),
        })
    );
}

export function accountActiveId(pathname: string): string {
    const match = NAV.filter(
        (e) => pathname === e.href || pathname.startsWith(`${e.href}/`)
    ).sort((a, b) => b.href.length - a.href.length)[0];

    return match?.id ?? 'profile';
}

export function AccountShell({
    children,
    dmTools = true,
}: {
    children: ReactNode;
    dmTools?: boolean;
}) {
    const t = useTranslations('common.header');

    const pathname = usePathname() ?? '';

    const allItems = accountNavItems(t);

    const items = dmTools
        ? allItems
        : allItems.filter((i) => !DM_ONLY_NAV.has(i.id));

    const activeId = accountActiveId(pathname);

    return (
        <GameShellClient
            items={items}
            activeId={activeId}
            title={
                allItems.find((i) => i.id === activeId)?.label ?? t('profile')
            }
        >
            <div className="hud-surface mx-auto w-full max-w-[1400px] overflow-x-clip px-4 pt-3 md:hidden">
                <HudChipTabs
                    size="lg"
                    ariaLabel={t('profile')}
                    items={items.map((i) => ({
                        key: i.id,
                        label: i.label,
                        href: i.href,
                        active: i.id === activeId,
                    }))}
                />
            </div>
            <div className="hud-surface mx-auto w-full max-w-[1400px] px-4 py-4 md:flex md:items-start md:gap-6">
                <AccountSidebar
                    items={items}
                    activeId={activeId}
                    ariaLabel={t('profile')}
                />
                <main className="mx-auto w-full max-w-[960px] min-w-0 flex-1 md:mx-0 max-sm:[&>.hud-form-page>.hud-form-actions]:!px-0 max-sm:[&>.hud-form-page>.hud-form-head>*]:!px-0">
                    {children}
                </main>
            </div>
        </GameShellClient>
    );
}
