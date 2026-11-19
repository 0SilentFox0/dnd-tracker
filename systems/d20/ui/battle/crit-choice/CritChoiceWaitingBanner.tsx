'use client';

import { useTranslations } from 'next-intl';

import { WaitingNotice } from '@/components/hud';
import { useBattleScene } from '@/lib/hooks/battle';
import { asShownCrit } from '@/lib/utils/battle/crit-choice/pending';

export function CritChoiceWaitingBanner() {
    const t = useTranslations('battle.critChoice');

    const tRider = useTranslations('battleD20.riderChoice');

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
        <WaitingNotice>
            {ridersWait ? tRider('waitingBanner') : t('waitingBanner')}
        </WaitingNotice>
    );
}
