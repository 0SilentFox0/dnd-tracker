'use client';

import { type CSSProperties, type ReactNode, type Ref, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';
import { stagger } from '@/lib/utils/common/motion';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

export const bannerPalette = (color: string | null) => {
    if (!color || !HEX.test(color.trim())) {
        return {
            base: 'var(--color-hud-crimson)',
            ink: 'var(--color-hud-crimson-ink)',
        };
    }

    const base = normalizeHexColor(color);

    return { base, ink: contrastTextColor(base) };
};

const LEAD_FOLD = 320;

const excerpt = (text: string | null) =>
    text
        ?.replace(/[#*_>`~[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 700);

export function SheetIdentityPanel({
    badge,
    actions,
    body,
    onHistory,
    children,
    ref,
}: {
    badge?: ReactNode;
    actions?: ReactNode;
    body?: ReactNode;
    onHistory?: () => void;
    children?: ReactNode;
    ref?: Ref<HTMLElement>;
}) {
    const { campaignId, sheet, canEdit } = useProfile();

    const t = useTranslations('characterProfile');

    const tc = useTranslations('characterProfile.hero');

    const [open, setOpen] = useState(false);

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

    const long = (lead?.length ?? 0) > LEAD_FOLD;

    const banner = bannerPalette(id.raceColor);

    return (
        <>
            {actions && (
                <div
                    data-testid="sheet-actions"
                    className="sticky top-[calc(var(--shell-header-h,57px)/var(--sheet-zoom,1))] z-20 flex min-h-12 items-center justify-end gap-2 border-b border-hud-rule bg-hud-page/[.97] px-4 py-2 backdrop-blur"
                >
                    {actions}
                </div>
            )}
            <div className="motion-rise grid grid-cols-[104px_minmax(0,1fr)] px-4 pt-4 pb-4 max-lg:gap-x-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-x-8">
                <div className="relative h-44 lg:sticky lg:top-[calc((var(--shell-header-h,57px)+16px)/var(--sheet-zoom,1))] lg:h-[340px] lg:self-start">
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
                        <div className="relative rounded-lg bg-hud-surface p-[3px] shadow-[0_0_0_1px_var(--color-hud-line),0_18px_40px_-14px_rgba(0,0,0,.8)] lg:p-2">
                            <HeroPortrait
                                src={id.avatar}
                                name={id.name}
                                canEdit={canEdit}
                                className="aspect-[4/5] rounded-md border-0"
                            />
                        </div>
                        <EntityIcon
                            src={id.raceIcon}
                            name={id.race}
                            size={64}
                            className="absolute bottom-[11%] left-1/2 hidden size-16 -translate-x-1/2 rounded-none bg-transparent text-[color:var(--banner-ink)] opacity-70 lg:flex"
                        />
                    </div>
                    {!Ui.hideProgression && (
                        <SheetLevelPlate level={id.level} />
                    )}
                </div>
                <div className="contents lg:col-start-2 lg:row-start-1 lg:block lg:min-w-0">
                    <header
                        ref={ref}
                        className="col-start-2 grid min-w-0 content-center gap-1.5 self-center lg:mb-5 lg:pt-2"
                        style={stagger(0)}
                    >
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
                                        <b className="text-hud-accent-fg">
                                            {part}
                                        </b>
                                    ) : (
                                        part
                                    )}
                                </span>
                            ))}
                        </p>
                        <h1 className="hud-title text-[28px] leading-none text-balance [overflow-wrap:anywhere] text-hud-ink lg:text-[clamp(40px,4.4vw,60px)] lg:leading-[.95]">
                            {id.name}
                        </h1>
                        {lead && (
                            <div className="max-w-[48em] max-lg:hidden">
                                <p
                                    id="sheet-lead"
                                    className={cn(
                                        'text-base text-hud-muted italic',
                                        !open && 'line-clamp-6'
                                    )}
                                >
                                    {lead}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4">
                                    {long && (
                                        <HudButton
                                            type="button"
                                            aria-expanded={open}
                                            aria-controls="sheet-lead"
                                            onClick={() => setOpen((v) => !v)}
                                            className="min-h-10 cursor-pointer text-[15px] font-bold text-hud-accent-fg underline decoration-hud-line decoration-2 underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                                        >
                                            {open
                                                ? tc('showLess')
                                                : tc('showMore')}
                                        </HudButton>
                                    )}
                                    {onHistory && (
                                        <HudButton
                                            type="button"
                                            onClick={onHistory}
                                            className="min-h-10 cursor-pointer text-[15px] font-bold text-hud-ink underline decoration-hud-line decoration-2 underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                                        >
                                            {t('tabs.story')}
                                        </HudButton>
                                    )}
                                </div>
                            </div>
                        )}
                    </header>
                    {badge && (
                        <div className="col-span-full mt-4 lg:mt-0 lg:mb-5">
                            {badge}
                        </div>
                    )}
                    {children && (
                        <div className="col-span-full mt-5 lg:mt-0 lg:mb-5">
                            {children}
                        </div>
                    )}
                    <div
                        className="motion-rise col-span-full mt-4 flex flex-col gap-4 empty:hidden lg:mt-0 lg:mb-5"
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
                        {sheet.rest && system.rest.kinds && (
                            <ArcaneRecoveryPanel />
                        )}
                    </div>
                    {body && (
                        <div className="col-span-full -mx-4 mt-4 lg:mt-0">
                            {body}
                        </div>
                    )}
                </div>
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
