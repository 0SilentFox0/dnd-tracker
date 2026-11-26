'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { HudPage, HudPageHeader } from '@/components/hud/page';

export function AdminShell({ children }: { children: ReactNode }) {
    const t = useTranslations('admin');

    return (
        <HudPage>
            <HudPageHeader title={t('title')} />
            <AdminTabs />
            {children}
        </HudPage>
    );
}
