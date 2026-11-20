'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';

import { HUD_SURFACE } from '@/components/hud';
import { PROFILE_MENU } from '@/components/layout/profile-menu';
import { Button } from '@/components/ui/button';
import { useProfileActions } from '@/lib/hooks/auth';
import { cn } from '@/lib/utils';

const ITEM =
    'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-hud-text hover:bg-hud-gold/10';

const ACTIVE = 'bg-hud-gold/15 text-hud-gold-strong';

const NAV = [
    { id: 'profile', icon: UserRound, href: '/profile' },
    ...PROFILE_MENU.filter((e) => 'href' in e),
] as const;

export function ProfileShell({ children }: { children: ReactNode }) {
    const t = useTranslations('common.header');

    const pathname = usePathname() ?? '';

    const actions = useProfileActions();

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    return (
        <div
            className={cn(
                HUD_SURFACE,
                'container mx-auto flex flex-col gap-2 px-3 py-4 md:flex-row md:gap-4 min-[96rem]:max-w-page'
            )}
        >
            <nav
                aria-label={t('profile')}
                className="flex shrink-0 gap-1 overflow-x-auto md:sticky md:top-24 md:w-56 md:flex-col md:self-start md:overflow-visible"
            >
                {NAV.map((entry) => (
                    <Link
                        key={entry.id}
                        href={entry.href}
                        aria-current={isActive(entry.href) ? 'page' : undefined}
                        className={cn(ITEM, isActive(entry.href) && ACTIVE)}
                    >
                        <entry.icon className="size-4" />
                        {t(entry.id === 'profile' ? 'profile' : entry.id)}
                    </Link>
                ))}
                <span className="hidden border-t border-hud-rule md:my-1 md:block" />
                {PROFILE_MENU.filter((e) => 'action' in e).map((entry) => (
                    <Button
                        key={entry.id}
                        type="button"
                        variant="ghost"
                        className={cn(ITEM, 'h-auto justify-start font-normal')}
                        onClick={() =>
                            'action' in entry && actions[entry.action]()
                        }
                    >
                        <entry.icon className="size-4" />
                        {t(entry.labelKey)}
                    </Button>
                ))}
            </nav>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
