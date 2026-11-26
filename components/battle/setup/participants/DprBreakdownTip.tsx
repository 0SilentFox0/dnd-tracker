'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useText } from '@/lib/i18n/use-text';
import { round1 } from '@/lib/utils/common/format';
import type { CharacterDprBreakdown } from '@/types/battle-setup';

export function DprBreakdownTip({
    breakdown,
}: {
    breakdown: CharacterDprBreakdown;
}) {
    const t = useTranslations('battleSetup.participants');

    const text = useText();

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <HudButton className="ds-interactive cursor-help rounded-md px-1 text-xs text-hud-muted underline underline-offset-2 hover:text-hud-ink">
                        {t('dprHow')}
                    </HudButton>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="max-w-[320px] px-3 py-2 text-left whitespace-pre-wrap"
                >
                    <div className="mb-1 font-medium">{t('dprTitle')}</div>
                    <ul className="space-y-0.5 text-xs">
                        {breakdown.logLines.map((line, i) => (
                            <li key={i}>{text(line)}</li>
                        ))}
                    </ul>
                    <div className="mt-1.5 border-t border-background/50 pt-1.5 font-medium">
                        {t('dprSummary', {
                            physical: String(round1(breakdown.physicalDpr)),
                            spell: String(breakdown.spellDpr),
                            nonMagic: String(breakdown.nonMagicDpr),
                        })}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
