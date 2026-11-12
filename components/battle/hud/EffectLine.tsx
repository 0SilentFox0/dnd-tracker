import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { EffectIcon } from './EffectIcon';

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useText } from '@/lib/i18n/use-text';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import { effectName } from '@/lib/utils/battle/common/terms';
import { type DisplayEffect, effectSummary } from '@/lib/utils/battle/view';
import type { ActiveEffect } from '@/types/battle';

const tone = (e: ActiveEffect) =>
    e.type === 'buff' ? 'text-hud-gold' : 'text-hud-danger';

function EffectChip({
    effect,
    hideLevel,
}: {
    effect: DisplayEffect;
    hideLevel?: boolean;
}) {
    const t = useTranslator('abilityRegistry');

    const text = useText();

    const summary = effectSummary(effect, t).map(text);

    const name = text(effectName(effect));

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    tabIndex={0}
                    aria-label={`${name}: ${summary.join('; ')}`}
                    className={cn(
                        'relative flex h-5 cursor-help items-center gap-1.5 text-[13px] leading-5 whitespace-nowrap',
                        tone(effect)
                    )}
                >
                    <EffectIcon effect={effect} size={20} />
                    <span className="text-hud-text">{name}</span>
                    {!hideLevel &&
                        effect.level !== undefined &&
                        effect.level > 1 && (
                            <span className="text-hud-text">
                                ×{effect.level}
                            </span>
                        )}
                    {!effect.permanent && (
                        <span className="opacity-70">{effect.duration}</span>
                    )}
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="bottom"
                sideOffset={4}
                className="max-w-64 border border-white/15 bg-[#17130f] text-[13px] leading-[18px] text-hud-text shadow-lg [&>span]:hidden"
            >
                <div className="font-medium text-[var(--ink)]">{name}</div>
                {summary.map((line) => (
                    <div key={line}>{line}</div>
                ))}
            </TooltipContent>
        </Tooltip>
    );
}

export function EffectLine({
    effects,
    max = 2,
    hideLevels,
}: {
    effects: readonly DisplayEffect[];
    max?: number;
    hideLevels?: boolean;
}) {
    const t = useTranslations('battle.hud.effects');

    const [expanded, setExpanded] = useState(false);

    const overflow = effects.length > max;

    const open = expanded && overflow;

    const shown = open ? effects : effects.slice(0, max);

    return (
        <div
            className={cn(
                'mt-1.5 flex items-center gap-x-3',
                open ? 'flex-wrap gap-y-1' : 'h-5 overflow-hidden'
            )}
        >
            {shown.map((e) => (
                <EffectChip key={e.id} effect={e} hideLevel={hideLevels} />
            ))}
            {overflow && (
                <button
                    type="button"
                    aria-expanded={open}
                    aria-label={
                        open
                            ? t('collapse')
                            : t('showAll', { count: effects.length })
                    }
                    onClick={() => setExpanded((v) => !v)}
                    className="relative cursor-pointer rounded px-1 text-[13px] leading-5 whitespace-nowrap text-[var(--hud-muted)] hover:bg-white/10 hover:text-hud-text"
                >
                    {open ? t('less') : `+${effects.length - max}`}
                </button>
            )}
        </div>
    );
}
