'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Hourglass } from 'lucide-react';

import { HudButton } from '@/components/hud';
import { useBattleScene } from '@/lib/hooks/battle';

const BOX =
    'mx-4 mt-2 flex min-h-10 items-center justify-center gap-3 border-y border-hud-line bg-hud-panel-2 px-3 py-1.5 text-center';

export const AwaitingDmBanner = memo(function AwaitingDmBanner() {
    const t = useTranslations('battle.scene');

    const {
        viewer: { isDM },
        dialogs,
    } = useBattleScene();

    if (!isDM) {
        return (
            <div className={BOX}>
                <Hourglass className="size-4 shrink-0 text-hud-muted" />
                <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">
                    {t('awaitingDm')}
                </span>
            </div>
        );
    }

    return (
        <HudButton
            type="button"
            onClick={() => dialogs.awaitingDm.setOpen(true)}
            disabled={dialogs.awaitingDm.open}
            className={`${BOX} w-[calc(100%-2rem)]`}
        >
            <Hourglass className="size-4 shrink-0 text-hud-muted" />
            <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">
                {t('awaitingYou')}
            </span>
        </HudButton>
    );
});
