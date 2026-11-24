'use client';

import { type CSSProperties, type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';

import { HeroPortrait } from '../hero/HeroPortrait';
import { useProfile } from '../ProfileContext';
import { ArcaneRecoveryPanel } from '../rest/ArcaneRecoveryPanel';
import { HitDicePanel } from '../rest/HitDicePanel';
import { RestBadges } from '../rest/RestBadges';
import { SheetLevelPlate, SheetXpBar } from './SheetPortraitStrip';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudButton } from '@/components/hud';
import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';
import {
    contrastTextColor,
    normalizeHexColor,
} from '@/lib/theme/contrast-text-color';
import { signed } from '@/lib/utils/common/format';
import { stagger } from '@/lib/utils/common/motion';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

export const bannerPalette = (color: string | null) => {
    if (!color || !HEX.test(color.trim())) {
        return { base: 'var(--color-hud-gold-strong)', ink: '#2a1d05' };
    }

    const base = normalizeHexColor(color);

    return { base, ink: contrastTextColor(base) };
};

const excerpt = (text: string | null) =>
    text
        ?.replace(/[#*_>`~[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);

export function SheetIdentityPanel({
    badge,
    onHistory,
    children,
    ref,
}: {
    badge?: ReactNode;
    onHistory?: () => void;
    children?: ReactNode;
    ref?: Ref<HTMLElement>;
}) {
    const { campaignId, sheet, canEdit } = useProfile();

    const t = useTranslations('characterProfile');

    const id = sheet.identity;

    const { def: system, system: current } = useCampaignSystem(
        campaignId,
        sheet.system
    );

    const Ui = systemUiOf(current.key, current.modules);

    const xp = !Ui.hideProgression ? sheet.rest?.xp : null;

    const background = sheet.choices?.background?.name;

    const who = [
        statColumnsOf(system).has('classes')
            ? `${id.className}${id.subclass ? ` (${id.subclass})` : ''}`
            : sheet.hitDice === null && !Ui.hideProgression
              ? id.archetype
              : null,
        `${id.race}${id.subrace ? ` (${id.subrace})` : ''}`,
        background,
        system.identity.alignments ? id.alignment : null,
    ].filter(Boolean);

    const lead = excerpt(sheet.story.biography);

    const banner = bannerPalette(id.raceColor);

    return (
        <>
            <header
                ref={ref}
                className="motion-rise grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 gap-y-5 px-4 pt-4 pb-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-x-8"
                style={stagger(0)}
            >
                <div className="relative h-44 lg:h-[340px]">
                    <div
                        data-testid="sheet-banner"
                        style={
                            {
                                '--banner': banner.base,
                                '--banner-ink': banner.ink,
                            } as CSSProperties
                        }
                        className="relative h-full bg-[linear-gradient(90deg,rgba(0,0,0,.22),transparent_18%,transparent_82%,rgba(0,0,0,.22)),linear-gradient(var(--banner),color-mix(in_srgb,var(--banner)_55%,var(--color-hud-surface)))] p-[9px] pb-0 [clip-path:polygon(0_0,100%_0,100%_100%,50%_90%,0_100%)] lg:p-5 lg:pb-0"
                    >
                        <div className="relative rounded-[4px] bg-hud-surface p-[3px] shadow-[0_0_0_1px_var(--color-hud-line),0_18px_40px_-14px_rgba(0,0,0,.8)] lg:p-2">
                            <HeroPortrait
                                src={id.avatar}
                                name={id.name}
                                canEdit={canEdit}
                                className="aspect-[4/5] rounded-[2px] border-0"
                            />
                        </div>
                        <EntityIcon
                            src={id.raceIcon}
                            name={id.race}
                            size={32}
                            className="absolute bottom-[11%] left-1/2 hidden size-8 -translate-x-1/2 rounded-none bg-transparent text-[color:var(--banner-ink)] opacity-70 lg:flex"
                        />
                    </div>
                    {!Ui.hideProgression && (
                        <SheetLevelPlate level={id.level} />
                    )}
                </div>
                <div className="contents lg:flex lg:flex-col lg:justify-between lg:gap-4 lg:pt-5">
                    <div className="contents lg:flex lg:flex-wrap lg:items-end lg:justify-between lg:gap-x-6 lg:gap-y-4">
                        <div className="grid min-w-0 content-center gap-1.5 self-center lg:max-w-[40em] lg:self-auto">
                            <p className="hud-title flex flex-wrap text-sm text-hud-muted lg:text-[19px]">
                                {who.map((part, i) => (
                                    <span key={i} className="whitespace-nowrap">
                                        {i > 0 && (
                                            <span
                                                aria-hidden
                                                className="px-1 text-hud-line lg:px-2"
                                            >
                                                ·
                                            </span>
                                        )}
                                        {i === 0 ? (
                                            <b className="text-hud-gold">
                                                {part}
                                            </b>
                                        ) : (
                                            part
                                        )}
                                    </span>
                                ))}
                            </p>
                            <h1 className="hud-title text-[28px] leading-none text-balance [overflow-wrap:anywhere] text-hud-ink lg:text-[clamp(44px,5vw,64px)] lg:leading-[.95]">
                                {id.name}
                            </h1>
                            {lead && (
                                <p className="line-clamp-2 text-base text-hud-muted italic max-lg:hidden">
                                    {lead}
                                    {onHistory && (
                                        <HudButton
                                            type="button"
                                            onClick={onHistory}
                                            className="ml-2 min-h-10 cursor-pointer text-[15px] font-bold text-hud-ink not-italic underline decoration-hud-gold decoration-2 underline-offset-4 focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none"
                                        >
                                            {t('tabs.story')}
                                        </HudButton>
                                    )}
                                </p>
                            )}
                        </div>
                        {badge && (
                            <div className="col-span-full lg:col-auto">
                                {badge}
                            </div>
                        )}
                    </div>
                    {children && (
                        <div className="col-span-full lg:col-auto">
                            {children}
                        </div>
                    )}
                </div>
            </header>
            <div
                className="motion-rise flex flex-col gap-4 px-4 empty:hidden"
                style={stagger(1)}
            >
                {xp && (
                    <SheetXpBar
                        level={id.level}
                        xp={xp.value}
                        ready={xp.levelUp}
                    />
                )}
                {sheet.classTable?.map((line) => (
                    <p key={line} className="text-xs text-hud-muted">
                        {line}
                    </p>
                ))}
                {sheet.rest && <RestBadges />}
                {sheet.rest && system.rest.kinds && <HitDicePanel />}
                {sheet.rest && system.rest.kinds && <ArcaneRecoveryPanel />}
            </div>
        </>
    );
}

export function CompactHero() {
    const { campaignId, sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const hideProgression = systemUiOf(
        system.key,
        system.modules
    ).hideProgression;

    const hp = sheet.rest?.hp
        ? t(hideProgression ? 'woundsCurrent' : 'hpCurrent', {
              current: sheet.rest.hp.current,
              max: sheet.rest.hp.max,
          })
        : t(hideProgression ? 'woundsTotal' : 'hpTotal', {
              total: sheet.hp.total,
          });

    return (
        <div className="flex items-center justify-between gap-2 px-4 pt-2 text-xs text-hud-muted">
            <span className="hud-sc truncate text-sm text-hud-ink">
                {sheet.identity.name}
                {!hideProgression && ` · ${sheet.identity.level}`}
            </span>
            <span className="shrink-0 tabular-nums">
                {hp}
                {!hideProgression &&
                    ` · AC ${sheet.armorClass.total} · ${t('short.toHit')} ${sheet.bestToHit === null ? '—' : signed(sheet.bestToHit)}`}
            </span>
        </div>
    );
}
