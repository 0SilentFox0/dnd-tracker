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

export function accountNavItems(t: HeaderT): GameShellNavItem[] {
    return NAV.map(({ id, href }) => ({
        id,
        href,
        label: t(id as Parameters<HeaderT>[0]),
    }));
}

export function accountActiveId(pathname: string): string {
    const match = NAV.filter(
        (e) => pathname === e.href || pathname.startsWith(`${e.href}/`)
    ).sort((a, b) => b.href.length - a.href.length)[0];

    return match?.id ?? 'profile';
}

export function AccountShell({ children }: { children: ReactNode }) {
    const t = useTranslations('common.header');

    const pathname = usePathname() ?? '';

    const items = accountNavItems(t);

    const activeId = accountActiveId(pathname);

    return (
        <GameShellClient
            items={items}
            activeId={activeId}
            title={items.find((i) => i.id === activeId)?.label ?? t('profile')}
        >
            <div className="hud-surface mx-auto w-full max-w-[1400px] px-3 pt-3 sm:px-4 md:hidden">
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
            <div className="hud-surface mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 md:flex md:items-start md:gap-6">
                <AccountSidebar
                    items={items}
                    activeId={activeId}
                    ariaLabel={t('profile')}
                />
                <main className="mx-auto min-w-0 w-full max-w-[960px] flex-1 md:mx-0">
                    {children}
                </main>
            </div>
        </GameShellClient>
    );
}
