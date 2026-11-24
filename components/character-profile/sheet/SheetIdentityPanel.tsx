'use client';

import { type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';

import { HeroPortrait } from '../hero/HeroPortrait';
import { useProfile } from '../ProfileContext';
import { ArcaneRecoveryPanel } from '../rest/ArcaneRecoveryPanel';
import { HitDicePanel } from '../rest/HitDicePanel';
import { RestBadges } from '../rest/RestBadges';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { HudCornerFrame } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { xpProgress } from '@/lib/utils/characters/xp';
import { signed } from '@/lib/utils/common/format';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

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

    const progress = xp ? xpProgress(xp.value, id.level) : null;

    const background = sheet.choices?.background?.name;

    return (
        <aside
            ref={ref}
            className="flex flex-col gap-3 px-4 pt-4 pb-3 lg:sticky lg:top-16 lg:w-72 lg:shrink-0 lg:self-start"
        >
            <HudCornerFrame>
                <HeroPortrait
                    src={id.avatar}
                    name={id.name}
                    canEdit={canEdit}
                    className="rounded-lg"
                />
            </HudCornerFrame>
            <div className="min-w-0">
                <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                        {!Ui.hideProgression && (
                            <p className="hud-sc text-xs text-hud-gold">
                                {t('level', { level: id.level })}
                            </p>
                        )}
                        <h1 className="hud-sc truncate text-xl leading-7 text-hud-ink">
                            {id.name}
                        </h1>
                    </div>
                    {actions && (
                        <div className="flex shrink-0 flex-col gap-1.5">
                            {actions}
                        </div>
                    )}
                </div>
                <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-hud-muted">
                    <span>
                        {sheet.hitDice === null &&
                            !Ui.hideProgression &&
                            `${id.archetype} · `}
                        {statColumnsOf(system).has('classes') &&
                            `${id.className}${id.subclass ? ` (${id.subclass})` : ''} · `}
                    </span>
                    {id.raceIcon && (
                        <OptimizedImage
                            src={id.raceIcon}
                            alt=""
                            width={14}
                            height={14}
                            className="size-3.5 shrink-0 rounded-sm"
                        />
                    )}
                    <span>
                        {id.race}
                        {id.subrace ? ` (${id.subrace})` : ''}
                    </span>
                    {badge}
                </p>
                {system.identity.alignments && id.alignment && (
                    <p className="text-xs text-hud-muted">{id.alignment}</p>
                )}
                {background && (
                    <p className="text-xs text-hud-muted">
                        {t('background', { name: background })}
                    </p>
                )}
                {xp && progress && (
                    <div className="mt-2">
                        <div
                            role="progressbar"
                            aria-label={
                                progress.next === null
                                    ? t('xpMax', { value: progress.current })
                                    : t('xp', {
                                          value: progress.current,
                                          next: progress.next,
                                      })
                            }
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(progress.ratio * 100)}
                            className="h-1.5 overflow-hidden rounded-full bg-hud-field"
                        >
                            <div
                                className="h-full rounded-full bg-hud-gold"
                                style={{ width: `${progress.ratio * 100}%` }}
                            />
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
