'use client';

import { useTranslations } from 'next-intl';

import type { BalanceView } from '../balance/BalanceMeter';
import { sideCounts, VerdictLabel } from '../participants/RosterPhoneBar';

import { cn } from '@/lib/utils';
import type { BattlePreparationParticipant } from '@/types/battle';

interface SetupSummaryProps {
    participants: BattlePreparationParticipant[];
    balance: BalanceView;
    map: { enabled: boolean; cols: number; rows: number };
}

export function SetupSummary({
    participants,
    balance,
    map,
}: SetupSummaryProps) {
    const t = useTranslations('battleSetup.form.summary');

    const tParticipants = useTranslations('battleSetup.participants');

    const counts = sideCounts(participants);

    const noEnemies = counts.enemy === 0;

    const even = !noEnemies && balance.fair?.scaling.verdict === 'even';

    return (
        <p
            data-testid="setup-summary"
            className="mr-auto hidden min-w-0 flex-wrap md:flex items-center gap-x-3 gap-y-0.5 text-sm"
        >
            <span className="hud-num text-hud-muted tabular-nums">
                {tParticipants('versus', counts)}
            </span>
            <span
                className={cn(
                    even ? 'text-hud-good-dim' : 'text-hud-accent-fg'
                )}
            >
                {noEnemies ? (
                    t('noEnemies')
                ) : (
                    <VerdictLabel balance={balance} />
                )}
            </span>
            <span className="text-hud-muted">
                {map.enabled
                    ? t('map', { cols: map.cols, rows: map.rows })
                    : t('noMap')}
            </span>
        </p>
    );
}
