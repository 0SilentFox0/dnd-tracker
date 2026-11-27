'use client';

import { useTranslations } from 'next-intl';

import { HudButton, spellLevelMetal } from '@/components/hud';
import { DISABLED_CLASS } from '@/components/ui/disabled';
import { spellLevelRoman } from '@/lib/constants/spells';
import { useSlotToggle } from '@/lib/hooks/characters';
import { cn } from '@/lib/utils';

interface SlotPipsProps {
    campaignId: string;
    characterId: string;
    slotKey: string;
    level: number;
    max: number;
    current: number;
}

export function SlotPips({
    campaignId,
    characterId,
    slotKey,
    level,
    max,
    current,
}: SlotPipsProps) {
    const t = useTranslations('characterProfile.slots');

    const toggle = useSlotToggle(campaignId, characterId);

    return (
        <div className="flex items-center gap-1" role="group">
            <span className="hud-sc mr-1 text-sm text-hud-muted">
                {spellLevelRoman(level)}
            </span>
            {Array.from({ length: max }, (_, i) => {
                const filled = i < current;

                return (
                    <HudButton
                        key={i}
                        type="button"
                        aria-pressed={filled}
                        aria-label={t('pip', {
                            level: spellLevelRoman(level),
                            n: i + 1,
                            state: filled ? t('available') : t('used'),
                        })}
                        disabled={toggle.isPending}
                        onClick={() =>
                            void toggle.setCurrent(
                                slotKey,
                                max,
                                i + 1 === current ? i : i + 1
                            )
                        }
                        className={cn(
                            DISABLED_CLASS,
                            'motion-press size-8 cursor-pointer rounded-full border border-hud-line focus-visible:ring-2 focus-visible:outline-none',
                            filled
                                ? cn('metal-fill', spellLevelMetal(level))
                                : 'bg-transparent'
                        )}
                    />
                );
            })}
        </div>
    );
}
