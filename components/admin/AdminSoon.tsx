'use client';

import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';

export function AdminSoon() {
    const t = useTranslations('admin.common');

    return <HudPanel>{t('soon')}</HudPanel>;
}
