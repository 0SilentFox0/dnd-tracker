'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { useBattleScene } from '@/lib/hooks/battle';

export function BattleLogLoadEarlier() {
    const t = useTranslations('battle.log');

    const { logHistory } = useBattleScene();

    if (!logHistory.canLoadEarlier) return null;

    return (
        <HudButton
            type="button"
            disabled={logHistory.isLoading}
            onClick={logHistory.loadEarlier}
            className="w-full py-2.5 text-center text-xs text-[var(--hud-muted)] hover:text-hud-ink disabled:opacity-60"
        >
            {logHistory.isLoading ? t('loading') : t('showEarlier')}
        </HudButton>
    );
}
