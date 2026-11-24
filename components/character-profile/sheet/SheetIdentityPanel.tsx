'use client';

import { type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';

import { HeroPortrait } from '../hero/HeroPortrait';
import { useProfile } from '../ProfileContext';
import { ArcaneRecoveryPanel } from '../rest/ArcaneRecoveryPanel';
import { HitDicePanel } from '../rest/HitDicePanel';
import { RestBadges } from '../rest/RestBadges';
import { SheetLevelPlate, SheetXpBar } from './SheetPortraitStrip';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudPill } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { signed } from '@/lib/utils/common/format';
import { stagger } from '@/lib/utils/common/motion';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

const CHIP =
    'h-7 max-w-full rounded-lg border-0 bg-hud-raised px-2.5 text-sm font-normal leading-7 text-hud-ink';

export function SheetIdentityPanel({
    actions,
    badge,
    ref,
}: {
    actions?: ReactNode;
    badge?: ReactNode;
    ref?: Ref<HTMLElement>;
}) {
    const { campaignId, sheet, canEdit } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const id = sheet.identity;

    const { def: system, system: current } = useCampaignSystem(
        campaignId,
        sheet.system
    );

    const Ui = systemUiOf(current.key, current.modules);

    const xp = !Ui.hideProgression ? sheet.rest?.xp : null;

    const background = sheet.choices?.background?.name;

    const showLevel = !Ui.hideProgression;

    return (
        <aside className="max-lg:contents lg:sticky lg:top-16 lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:gap-5 lg:self-start lg:px-4 lg:pt-4 lg:pb-3">
            <header
                ref={ref}
                className="motion-rise order-[-5] flex gap-4 px-4 pt-4 lg:flex-col lg:p-0"
                style={stagger(0)}
            >
                <div className="relative w-20 shrink-0 self-start lg:w-full">
                    <HeroPortrait
                        src={id.avatar}
                        name={id.name}
                        canEdit={canEdit}
                    />
                    {showLevel && <SheetLevelPlate level={id.level} />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h1 className="hud-sc text-[22px] leading-tight [overflow-wrap:anywhere] text-hud-ink lg:text-[28px]">
                        {id.name}
                    </h1>
                    {system.identity.alignments && id.alignment && (
                        <p className="text-[15px] text-hud-muted">
                            {id.alignment}
                        </p>
                    )}
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                        {sheet.hitDice === null && !Ui.hideProgression && (
                            <HudPill className={CHIP}>{id.archetype}</HudPill>
                        )}
                        {statColumnsOf(system).has('classes') && (
                            <HudPill className={CHIP}>
                                {id.className}
                                {id.subclass ? ` (${id.subclass})` : ''}
                            </HudPill>
                        )}
                        <HudPill
                            className={CHIP}
                            icon={
                                id.raceIcon && (
                                    <OptimizedImage
                                        src={id.raceIcon}
                                        alt=""
                                        width={16}
                                        height={16}
                                        className="size-4 shrink-0 rounded-sm"
                                    />
                                )
                            }
                        >
                            {id.race}
                            {id.subrace ? ` (${id.subrace})` : ''}
                        </HudPill>
                        {background && (
                            <HudPill className={CHIP}>
                                {t('background', { name: background })}
                            </HudPill>
                        )}
                    </div>
                </div>
            </header>
            {xp && (
                <div
                    className="motion-rise order-[-4] px-4 lg:p-0"
                    style={stagger(1)}
                >
                    <SheetXpBar
                        level={id.level}
                        xp={xp.value}
                        ready={xp.levelUp}
                    />
                </div>
            )}
            <div
                className="motion-rise order-[-2] flex flex-col gap-4 px-4 empty:hidden lg:p-0"
                style={stagger(2)}
            >
                {badge}
                {actions && (
                    <div className="grid gap-2 border-t border-hud-rule pt-4">
                        <p className="text-xs font-medium tracking-[.08em] text-hud-muted uppercase">
                            {t('dmActions')}
                        </p>
                        <div className="grid grid-cols-2 gap-2 [&>*]:min-h-10">
                            {actions}
                        </div>
                    </div>
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
        </aside>
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
