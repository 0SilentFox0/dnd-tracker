'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const ITEMS = [
    { key: 'overview', href: '/admin' },
    { key: 'users', href: '/admin/users' },
    { key: 'security', href: '/admin/security' },
    { key: 'ops', href: '/admin/ops' },
] as const;

export function AdminTabs() {
    const t = useTranslations('admin.tabs');

    const pathname = usePathname();

    return (
        <nav aria-label={t('label')} className="flex flex-wrap gap-2">
            {ITEMS.map(({ key, href }) => {
                const active =
                    href === '/admin'
                        ? pathname === href
                        : pathname.startsWith(href);

                return (
                    <Link
                        key={key}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'hud-sc flex min-h-10 items-center rounded px-3 text-sm',
                            active
                                ? 'bg-accent'
                                : 'opacity-70 hover:opacity-100'
                        )}
                    >
                        {t(key)}
                    </Link>
                );
            })}
        </nav>
    );
}
