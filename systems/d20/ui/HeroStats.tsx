'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Footprints, type LucideIcon, Shield, Zap } from 'lucide-react';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { useCountUp } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';

const CARD =
    'motion-rise rounded-xl border border-hud-rule bg-hud-panel backdrop-blur-sm';

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
    children,
}: {
    icon: LucideIcon;
    short: string;
    label: string;
    children: ReactNode;
}) {
    return (
        <div aria-label={label} className="grid min-w-0 gap-1.5">
            <span className="flex items-center gap-1.5 text-hud-muted">
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="truncate text-xs font-medium tracking-[.08em] uppercase">
                    {short}
                </span>
            </span>
            <b className="text-[32px] leading-none font-bold text-hud-ink tabular-nums lg:text-[40px]">
                {children}
            </b>
        </div>
    );
}

function StripStat({
    label,
    accent,
    children,
}: {
    label: string;
    accent?: boolean;
    children: ReactNode;
}) {
    return (
        <div
            aria-label={label}
            className="flex min-w-0 items-baseline justify-between gap-2 px-4 py-3"
        >
            <span className="truncate text-sm text-hud-muted">{label}</span>
            <b
                className={cn(
                    'text-xl font-bold tabular-nums',
                    accent ? 'text-hud-gold' : 'text-hud-ink'
                )}
            >
                {children}
            </b>
        </div>
    );
}

export function HeroStats() {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const tc = useTranslations('gameTerms.stats');

    return (
        <>
            <div
                className={cn(
                    CARD,
                    'grid grid-cols-3 content-center gap-2 p-5'
                )}
                style={{ '--i': 1 } as CSSProperties}
            >
                <KeyStat icon={Shield} label="AC" short="AC">
                    <Counted value={sheet.armorClass.total} />
                </KeyStat>
                <KeyStat
                    icon={Zap}
                    label={tc('initiative')}
                    short={t('short.initiative')}
                >
                    <Counted value={sheet.initiative} />
                </KeyStat>
                <KeyStat
                    icon={Footprints}
                    label={tc('speed')}
                    short={t('short.speed')}
                >
                    <Counted value={sheet.speed} />
                </KeyStat>
            </div>
            <div
                className={cn(
                    CARD,
                    'grid grid-cols-2 lg:col-span-2 lg:flex lg:divide-x lg:divide-hud-rule [&>*]:lg:flex-1'
                )}
                style={{ '--i': 2 } as CSSProperties}
            >
                <StripStat label={t('toHit')}>
                    {sheet.bestToHit === null ? (
                        '—'
                    ) : (
                        <Counted value={sheet.bestToHit} format={signed} />
                    )}
                </StripStat>
                <StripStat accent label={t('proficiency')}>
                    <Counted value={sheet.proficiency} format={signed} />
                </StripStat>
                <StripStat label={t('passivePerception')}>
                    <Counted value={sheet.passives.perception} />
                </StripStat>
                {sheet.hitDice !== null && (
                    <StripStat label={t('hitDice')}>{sheet.hitDice}</StripStat>
                )}
            </div>
        </>
    );
}
