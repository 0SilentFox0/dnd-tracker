'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

export function GridShapePicker() {
    const t = useTranslations('battle.drawers');

    return (
        <div
            role="group"
            aria-label={t('gridShape')}
            className="flex flex-col gap-1.5"
        >
            <div className="flex gap-1.5">
                <HudButton
                    type="button"
                    aria-pressed
                    className="h-10 flex-1 rounded-xl border border-[var(--gold)] text-sm text-[var(--gold)]"
                >
                    {t('gridSquare')}
                </HudButton>
                <HudButton
                    type="button"
                    disabled
                    aria-disabled
                    className={cn(
                        'h-10 flex-1 rounded-xl border border-white/20 text-sm text-[var(--hud-muted)]',
                        'cursor-not-allowed opacity-70'
                    )}
                >
                    {t('gridHex')}
                </HudButton>
            </div>
            <p className="text-[12px] text-[var(--hud-muted)]">
                {t('gridHexSoon')}
            </p>
        </div>
    );
}
