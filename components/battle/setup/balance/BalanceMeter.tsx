'use client';

import { useTranslations } from 'next-intl';
import { CircleHelp } from 'lucide-react';

import { BalanceSummary } from './BalanceSummary';
import { XpBalanceSummary } from './XpBalanceSummary';

import { HudIconButton } from '@/components/hud';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FairScaling, PartyPower } from '@/lib/utils/battle/balance';
import type { XpBudgetResult } from '@/lib/utils/battle/balance/xp-budget';
import { mult } from '@/lib/utils/common/format';

export type FairBalance = { party: PartyPower; scaling: FairScaling };

export interface BalanceView {
    kind: 'fair' | 'xp';
    fair: FairBalance | null;
    xp: XpBudgetResult | null;
}

interface BalanceMeterProps extends BalanceView {
    units: Array<{ id: string; name: string }>;
}

const SHARE_MIN = 8;

const SHARE_MAX = 92;

const power = (dpr: number, hp: number) => dpr * hp;

function allyShare({ party, scaling }: FairBalance) {
    const ally = power(party.dpr, party.hp);

    const enemy = power(
        scaling.reached.dpr + scaling.fixed.dpr,
        scaling.reached.hp + scaling.fixed.hp
    );

    const total = ally + enemy;

    if (total <= 0) return 50;

    return Math.min(SHARE_MAX, Math.max(SHARE_MIN, (ally / total) * 100));
}

function FairMeter({ fair }: { fair: FairBalance | null }) {
    const t = useTranslations('battleSetup.balance');

    const verdict = fair?.scaling.verdict;

    if (!fair || !verdict || verdict === 'empty') return null;

    const even = verdict === 'even';

    const share = allyShare(fair);

    return (
        <div className="min-w-0 flex-1 space-y-1.5">
            <div
                role="img"
                aria-label={t('scalesAria', { share: Math.round(share) })}
                className="relative flex h-2.5 overflow-hidden rounded-full bg-hud-inset"
            >
                <span
                    className="h-full bg-hud-accent transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${share}%` }}
                />
                <span className="h-full flex-1 bg-hud-crimson-2" />
                <span
                    aria-hidden
                    className="absolute inset-y-0 left-1/2 w-px bg-hud-ink/50"
                />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                <span
                    data-testid="meter-verdict"
                    className={cn(
                        'font-medium',
                        even ? 'text-hud-good-dim' : 'text-hud-accent-fg'
                    )}
                >
                    {even
                        ? t('even')
                        : t(verdict === 'weak' ? 'weak' : 'excess')}
                </span>
                <span className="hud-num text-hud-muted tabular-nums">
                    {mult(fair.scaling.hpScale)} HP
                </span>
                <span className="hud-num text-hud-muted tabular-nums">
                    {t('damage', { value: mult(fair.scaling.dmgScale) })}
                </span>
            </div>
        </div>
    );
}

function XpMeter({ xp }: { xp: XpBudgetResult | null }) {
    const t = useTranslations('battleSetup.xp');

    const tDifficulty = useTranslations('battleTerms.encounterDifficulty');

    if (!xp) return null;

    return (
        <div className="min-w-0 flex-1 space-y-0.5 text-xs">
            <div
                data-testid="meter-xp-difficulty"
                className="text-sm font-medium text-hud-accent-fg"
            >
                {t('difficulty', { label: tDifficulty(xp.difficulty) })}
            </div>
            <div className="hud-num text-hud-muted tabular-nums">
                {xp.multiplier === 1
                    ? t('enemyXp', { xp: String(xp.enemyXp) })
                    : t('enemyXpScaled', {
                          xp: String(xp.enemyXp),
                          multiplier: String(xp.multiplier),
                          adjusted: String(xp.adjustedXp),
                      })}
            </div>
        </div>
    );
}

export function BalanceMeter({ kind, fair, xp, units }: BalanceMeterProps) {
    const t = useTranslations('battleSetup.balance');

    const empty =
        kind === 'xp'
            ? !xp
            : !fair ||
              !fair.scaling.verdict ||
              fair.scaling.verdict === 'empty';

    if (empty) return null;

    return (
        <div
            data-testid="balance-meter"
            className="ds-inset flex min-w-0 items-center gap-3 rounded-xl px-3 py-2"
        >
            {kind === 'xp' ? <XpMeter xp={xp} /> : <FairMeter fair={fair} />}
            <Popover>
                <PopoverTrigger asChild>
                    <HudIconButton
                        size="md"
                        tone="muted"
                        aria-label={t('detailsAria')}
                    >
                        <CircleHelp className="size-4" aria-hidden />
                    </HudIconButton>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(92vw,26rem)] p-3">
                    {kind === 'xp' ? (
                        <XpBalanceSummary xp={xp} units={units} />
                    ) : (
                        <BalanceSummary fair={fair} />
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}
