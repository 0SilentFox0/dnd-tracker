'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Footprints, type LucideIcon, Shield, Zap } from 'lucide-react';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { useCountUp } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';

const CELL =
    'motion-rise grid min-w-0 content-start gap-2.5 border-l border-hud-rule p-3.5 max-lg:nth-2:border-l-0 lg:px-5 lg:py-4';

function Counted({
    value,
    format = String,
}: {
    value: number;
    format?: (n: number) => string;
}) {
    return <>{format(useCountUp(value))}</>;
}

function KeyStat({
    icon: Icon,
    short,
    label,
    index,
    children,
}: {
    icon: LucideIcon;
    short: string;
    label: string;
    index: number;
    children: ReactNode;
}) {
    return (
        <div
            aria-label={label}
            className={CELL}
            style={{ '--i': index } as CSSProperties}
        >
            <span className="hud-title flex items-center gap-1.5 text-base text-hud-muted max-lg:flex-col max-lg:items-start lg:gap-2 lg:text-[17px]">
                <Icon aria-hidden className="size-5 shrink-0 lg:size-[22px]" />
                <span className="truncate">{short}</span>
            </span>
            {children}
        </div>
    );
}

function Value({ children }: { children: ReactNode }) {
    return (
        <b className="hud-num text-[34px] leading-none text-hud-ink lg:text-[46px]">
            {children}
        </b>
    );
}

function FooterStat({
    label,
    accent,
    children,
}: {
    label: string;
    accent?: boolean;
    children: ReactNode;
}) {
    return (
        <span
            aria-label={label}
            className="inline-flex min-w-0 items-baseline justify-between gap-2 max-lg:w-full"
        >
            <span className="truncate">{label}</span>
            <b
                className={cn(
                    'hud-num text-[17px]',
                    accent ? 'text-hud-gold' : 'text-hud-ink'
                )}
            >
                {children}
            </b>
        </span>
    );
}

export function HeroStats() {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const tc = useTranslations('gameTerms.stats');

    const unit = useTranslations('gameTerms.distanceUnit');

    return (
        <>
            <KeyStat icon={Shield} label="AC" short="AC" index={1}>
                <span className="relative grid h-[68px] w-[60px] place-items-center max-lg:h-[54px] max-lg:w-12">
                    <svg
                        viewBox="0 0 60 68"
                        aria-hidden
                        className="absolute inset-0 size-full fill-hud-field stroke-hud-line drop-shadow-[0_3px_6px_rgba(0,0,0,.35)]"
                        strokeWidth={1.5}
                    >
                        <path d="M30 2 56 11v20c0 17.5-11 30-26 35C15 61 4 48.5 4 31V11z" />
                    </svg>
                    <b className="hud-num relative -mt-1.5 text-[26px] leading-none text-hud-ink lg:text-[32px]">
                        <Counted value={sheet.armorClass.total} />
                    </b>
                </span>
            </KeyStat>
            <KeyStat
                icon={Zap}
                label={tc('initiative')}
                short={t('short.initiative')}
                index={2}
            >
                <Value>
                    <Counted value={sheet.initiative} />
                </Value>
            </KeyStat>
            <KeyStat
                icon={Footprints}
                label={tc('speed')}
                short={t('short.speed')}
                index={3}
            >
                <Value>
                    <Counted value={sheet.speed} />
                    <small className="ml-1 text-lg font-normal text-hud-muted">
                        {unit('ft')}
                    </small>
                </Value>
            </KeyStat>
            <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-hud-rule px-3.5 py-2.5 text-sm text-hud-muted lg:flex lg:flex-wrap lg:gap-x-9 lg:px-5 lg:text-[15px]">
                <FooterStat accent label={t('proficiency')}>
                    <Counted value={sheet.proficiency} format={signed} />
                </FooterStat>
                <FooterStat label={t('toHit')}>
                    {sheet.bestToHit === null ? (
                        '—'
                    ) : (
                        <Counted value={sheet.bestToHit} format={signed} />
                    )}
                </FooterStat>
                {sheet.hitDice !== null && (
                    <FooterStat label={t('hitDice')}>
                        {sheet.hitDice}
                    </FooterStat>
                )}
                <FooterStat label={t('passivePerception')}>
                    <Counted value={sheet.passives.perception} />
                </FooterStat>
            </div>
        </>
    );
}
