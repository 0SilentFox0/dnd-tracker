'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudPanel, HudSectionTitle } from '@/components/hud/page';

export function PlayerPreview({
    children,
    notes,
}: {
    children: ReactNode;
    notes?: ReactNode;
}) {
    const t = useTranslations('common.form');

    return (
        <div className="space-y-4">
            <HudPanel className="space-y-3">
                <HudSectionTitle>{t('playerView')}</HudSectionTitle>
                {children}
            </HudPanel>
            {notes}
        </div>
    );
}
