'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';

export function FormPreviewPanel({ children }: { children: ReactNode }) {
    const t = useTranslations('common.ui');

    return (
        <HudSection title={t('previewTitle')} panel>
            {children}
        </HudSection>
    );
}
