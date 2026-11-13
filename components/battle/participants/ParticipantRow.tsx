'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, VenetianMask } from 'lucide-react';

import { HitFrame, PortraitFx } from '@/components/battle/fx/PortraitFx';
import {
    EffectLine,
    HealthBar,
    HealthLabel,
    hitFlashClass,
    HitFloat,
    HpFigure,
    Portrait,
} from '@/components/battle/hud';
import type { SystemBattleUi } from '@/components/systems/types';
import { useHitFx } from '@/lib/hooks/battle';
import { useCreatureTypeLabel } from '@/lib/i18n/use-creature-type';
import { useText } from '@/lib/i18n/use-text';
import { cn } from '@/lib/utils';
import { legendaryBadge } from '@/lib/utils/battle/actions/legendary-options';
import type { FxImpact } from '@/lib/utils/battle/fx';
import { isDown } from '@/lib/utils/battle/participant/state';
import { type DisplayEffect, hpRatio } from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

export interface ParticipantRowView {
    exact: boolean;
    acText: string | null;
    wounds: boolean;
    current: boolean;
    masked: boolean;
}

interface ParticipantRowProps {
    participant: BattleParticipant;
    effects: readonly DisplayEffect[];
    view: ParticipantRowView;
    impact: FxImpact | null;
    onSelect: (id: string) => void;
    /** From the parent, not the scene context, to keep the row's memo */
    badges?: SystemBattleUi['badges'];
}

const sameView = (a: ParticipantRowView, b: ParticipantRowView) =>
    a.exact === b.exact &&
    a.acText === b.acText &&
    a.wounds === b.wounds &&
    a.current === b.current &&
    a.masked === b.masked;

const sameProps = (a: ParticipantRowProps, b: ParticipantRowProps) =>
    a.participant === b.participant &&
    a.effects === b.effects &&
    a.impact === b.impact &&
    a.onSelect === b.onSelect &&
    a.badges === b.badges &&
    sameView(a.view, b.view);

export const ParticipantRow = memo(function ParticipantRow({
    participant: live,
    effects,
    view: { exact, acText, wounds, current, masked },
    impact,
    onSelect,
    badges,
}: ParticipantRowProps) {
    const text = useText();

    const tMask = useTranslations('battleDm.maze.toolbar');

    const creatureTypeLabel = useCreatureTypeLabel();

    const {
        change,
        shown: participant,
        shakeRef,
    } = useHitFx<HTMLDivElement>(live, impact);

    const down = isDown(participant);

    const badge = legendaryBadge(participant);

    return (
        <div
            ref={shakeRef}
            className={cn(
                'relative flex min-h-[76px] w-full items-center gap-3 border-b border-white/[.08] py-2',
                down && 'opacity-40'
            )}
        >
            <button
                type="button"
                aria-label={participant.basicInfo.name}
                onClick={() => onSelect(participant.basicInfo.id)}
                className="absolute inset-0"
            />
            <HitFrame change={change} />
            <HitFloat change={change} className="top-2 left-6 text-[26px]" />
            <PortraitFx effects={effects} size={48}>
                <Portrait
                    key={`portrait:${change?.id ?? ''}`}
                    participant={participant}
                    fx="main"
                    size={48}
                    current={current}
                    className={cn(
                        'pointer-events-none',
                        !change?.impact && hitFlashClass(change)
                    )}
                />
            </PortraitFx>
            <div className="min-w-0 flex-1">
                {exact && participant.abilities.creatureType && (
                    <div className="text-[10px] text-[var(--hud-muted)]">
                        {creatureTypeLabel(participant.abilities.creatureType)}
                    </div>
                )}
                <div
                    className={cn(
                        'hud-sc flex h-5 items-center text-base font-bold whitespace-nowrap text-[var(--ink)]',
                        down && 'line-through'
                    )}
                >
                    <span className="truncate">
                        {participant.basicInfo.name}
                    </span>
                    {masked && (
                        <VenetianMask
                            aria-label={tMask('illusion')}
                            className="ml-1 size-4 shrink-0 text-[var(--hud-muted)]"
                        />
                    )}
                    {exact ? (
                        <span
                            className={cn(
                                'ml-auto pl-2 font-sans text-sm font-medium tracking-normal',
                                hpRatio(participant) <= 0.25
                                    ? 'text-[#e04a35]'
                                    : 'text-hud-text'
                            )}
                        >
                            <HpFigure
                                participant={participant}
                                wounds={wounds}
                            />
                        </span>
                    ) : (
                        <HealthLabel participant={participant} />
                    )}
                </div>
                <HealthBar participant={participant} exact={exact} />
                <EffectLine effects={effects} hideLevels={!exact} />
                {badges?.map((Badge, i) => (
                    <Badge key={i} participant={participant} place="row" />
                ))}
                {badge && (
                    <div className="mt-1 text-xs text-[var(--hud-muted)]">
                        {text(badge)}
                    </div>
                )}
            </div>
            {acText !== null && (
                <span className="mt-3.5 flex w-16 shrink-0 items-center justify-end gap-1.5 self-start text-sm text-hud-soft">
                    {acText}
                    <Shield className="size-4 text-[var(--hud-muted)]" />
                </span>
            )}
        </div>
    );
}, sameProps);
