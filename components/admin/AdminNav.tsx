'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    Activity,
    LayoutDashboard,
    type LucideIcon,
    ShieldAlert,
    Users,
} from 'lucide-react';

import { HudChipTabs } from '@/components/hud/page';
import { cn } from '@/lib/utils';

const ITEMS: {
    key: 'overview' | 'users' | 'security' | 'ops';
    href: string;
    icon: LucideIcon;
}[] = [
    { key: 'overview', href: '/admin', icon: LayoutDashboard },
    { key: 'users', href: '/admin/users', icon: Users },
    { key: 'security', href: '/admin/security', icon: ShieldAlert },
    { key: 'ops', href: '/admin/ops', icon: Activity },
];

const isActive = (pathname: string, href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href);

export function AdminNav() {
    const t = useTranslations('admin');

    const pathname = usePathname();

    return (
        <>
            <div className="md:hidden">
                <HudChipTabs
                    ariaLabel={t('tabs.label')}
                    items={ITEMS.map(({ key, href }) => ({
                        key,
                        href,
                        label: t(`tabs.${key}`),
                        active: isActive(pathname, href),
                    }))}
                />
            </div>
            <aside className="hidden w-56 shrink-0 md:block">
                <div className="ds-panel sticky top-4 space-y-3 p-3">
                    <p className="hud-sc px-1 text-hud-ink">{t('title')}</p>
                    <div className="orn" aria-hidden />
                    <nav
                        aria-label={t('tabs.label')}
                        className="flex flex-col gap-0.5"
                    >
                        {ITEMS.map(({ key, href, icon: Icon }) => {
                            const active = isActive(pathname, href);

                            return (
                                <Link
                                    key={key}
                                    href={href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-hud-muted transition-colors hover:bg-hud-panel-2 hover:text-hud-ink',
                                        active &&
                                            'bg-hud-panel-2 text-hud-ink shadow-[inset_2px_0_0_var(--hud-accent)]'
                                    )}
                                >
                                    <Icon
                                        aria-hidden
                                        className={cn(
                                            'size-4 shrink-0',
                                            active && 'text-hud-accent-fg'
                                        )}
                                    />
                                    <span className="truncate">
                                        {t(`tabs.${key}`)}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
