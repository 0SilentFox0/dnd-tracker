'use client';

import { useTranslations } from 'next-intl';

import { useBattleScene } from '@/lib/hooks/battle';

export function ConnectionBanner() {
    const t = useTranslations('battle.scene');

    const { connection } = useBattleScene();

    if (connection !== 'disconnected' && connection !== 'unavailable')
        return null;

    return (
        <div className="flex h-9 items-center justify-center gap-2 border-b border-[var(--hud-line)] bg-hud-panel-2 text-[13px] text-[var(--hud-bone)]">
            <i className="size-2 animate-[hud-pulse_1.2s_infinite] rounded-full bg-hud-muted" />
            {t('offline')}
        </div>
    );
}
