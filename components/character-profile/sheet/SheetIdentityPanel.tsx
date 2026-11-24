'use client';

import { type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';

import { HeroPortrait } from '../hero/HeroPortrait';
import { useProfile } from '../ProfileContext';
import { ArcaneRecoveryPanel } from '../rest/ArcaneRecoveryPanel';
import { HitDicePanel } from '../rest/HitDicePanel';
import { RestBadges } from '../rest/RestBadges';
import { SheetPortraitStrip } from './SheetPortraitStrip';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudCornerFrame, HudPill } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { signed } from '@/lib/utils/common/format';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

const CHIP = 'h-auto min-h-6 max-w-full py-0.5 text-xs';

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

    return (
        <aside
            ref={ref}
            className="flex gap-3 px-4 pt-4 pb-3 lg:sticky lg:top-16 lg:w-72 lg:shrink-0 lg:flex-col lg:gap-4 lg:self-start"
        >
            <HudCornerFrame className="w-24 shrink-0 self-start lg:w-full">
                <HeroPortrait
                    src={id.avatar}
                    name={id.name}
                    canEdit={canEdit}
                    className="rounded-lg"
                />
                <SheetPortraitStrip
                    level={Ui.hideProgression ? null : id.level}
                    xp={xp?.value ?? null}
                />
            </HudCornerFrame>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-2">
                    <h1 className="hud-sc text-2xl leading-8 [overflow-wrap:anywhere] text-hud-ink">
                        {id.name}
                    </h1>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
                                        width={14}
                                        height={14}
                                        className="size-3.5 shrink-0 rounded-sm"
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
                        {badge}
                    </div>
                </div>
                {system.identity.alignments && id.alignment && (
                    <p className="hud-sc flex items-center gap-2 text-xs tracking-[.1em] text-hud-muted uppercase">
                        <span aria-hidden className="h-px flex-1 bg-hud-rule" />
                        {id.alignment}
                        <span aria-hidden className="h-px flex-1 bg-hud-rule" />
                    </p>
                )}
                {actions && (
                    <div className="flex flex-wrap gap-2">{actions}</div>
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
