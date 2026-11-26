'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronUp, Scale } from 'lucide-react';

import type { BalanceView } from '../balance/BalanceMeter';

import { Button } from '@/components/ui/button';
import { SideSheet } from '@/components/ui/side-sheet';
import { ParticipantSide } from '@/lib/constants/battle';
import type { BattlePreparationParticipant } from '@/types/battle';

interface RosterPhoneBarProps {
    participants: BattlePreparationParticipant[];
    balance: BalanceView;
    roster: { open: boolean; set: (open: boolean) => void };
    children: ReactNode;
}

export function sideCounts(participants: BattlePreparationParticipant[]) {
    const count = (side: ParticipantSide) =>
        participants
            .filter((p) => p.side === side)
            .reduce((sum, p) => sum + (p.quantity ?? 1), 0);

    return {
        ally: count(ParticipantSide.ALLY),
        enemy: count(ParticipantSide.ENEMY),
    };
}

function VerdictLabel({ balance }: { balance: BalanceView }) {
    const t = useTranslations('battleSetup.balance');

    const tDifficulty = useTranslations('battleTerms.encounterDifficulty');

    if (balance.kind === 'xp')
        return balance.xp ? (
            <>{tDifficulty(balance.xp.difficulty)}</>
        ) : (
            <>{t('shortEmpty')}</>
        );

    const verdict = balance.fair?.scaling.verdict;

    if (!verdict || verdict === 'empty') return <>{t('shortEmpty')}</>;

    if (verdict === 'even') return <>{t('evenShort')}</>;

    return <>{verdict === 'weak' ? t('weak') : t('excess')}</>;
}

export function RosterPhoneBar({
    participants,
    balance,
    roster,
    children,
}: RosterPhoneBarProps) {
    const t = useTranslations('battleSetup.participants');

    const counts = sideCounts(participants);

    return (
        <>
            <div
                data-testid="roster-phone-bar"
                className="ds-raised sticky bottom-0 z-30 flex min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 md:hidden"
            >
                <Scale className="size-4 shrink-0 text-hud-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-hud-accent-fg">
                        <VerdictLabel balance={balance} />
                    </span>
                    <span className="hud-num ml-2 text-hud-muted tabular-nums">
                        {t('versus', counts)}
                    </span>
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-expanded={roster.open}
                    onClick={() => roster.set(!roster.open)}
                >
                    {t('roster')}
                    <ChevronUp aria-hidden />
                </Button>
            </div>
            <SideSheet
                open={roster.open}
                onOpenChange={roster.set}
                title={t('rosterTitle')}
                className="inset-x-0 top-auto bottom-0 h-[80dvh] rounded-t-xl border-t border-l-0 md:hidden"
            >
                {children}
            </SideSheet>
        </>
    );
}
