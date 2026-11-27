'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { HudChipTabs } from '@/components/hud/page';

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
        <HudChipTabs
            ariaLabel={t('label')}
            size="lg"
            items={ITEMS.map(({ key, href }) => ({
                key,
                href,
                label: t(key),
                active:
                    href === '/admin'
                        ? pathname === href
                        : pathname.startsWith(href),
            }))}
        />
    );
}
