'use client';

import { useTranslations } from 'next-intl';
import { Hourglass } from 'lucide-react';

import { useBattleScene } from '@/lib/hooks/battle';
import { asShownCrit } from '@/lib/utils/battle/crit-choice/pending';

export function CritChoiceWaitingBanner() {
    const t = useTranslations('battle.critChoice');

    const tRider = useTranslations('battle.riderChoice');

    const { battle, viewer } = useBattleScene();

    if (viewer.isDM || !battle.pendingChoice) return null;

    const pending = asShownCrit(battle.pendingChoice);

    const ridersWait =
        !!pending?.riders?.length && pending.triggers.length === 0;

    const holdsAll =
        ridersWait &&
        pending.riders?.every(
            (r) =>
                !!viewer.userId &&
                battle.initiativeOrder.find(
                    (p) => p.basicInfo.id === r.holderId
                )?.basicInfo.controlledBy === viewer.userId
        );

    if (holdsAll) return null;

    return (
        <div
            role="status"
            className="flex min-h-10 items-center justify-center gap-3 border-y border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1.5 text-center"
        >
            <Hourglass className="size-4 shrink-0 text-[var(--gold)]" />
            <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">
                {ridersWait ? tRider('waitingBanner') : t('waitingBanner')}
            </span>
        </div>
    );
}
