import { useTranslations } from 'next-intl';

import { spellLevelMetal } from '@/components/hud';
import { spellLevelRoman } from '@/lib/constants/spells';
import { cn } from '@/lib/utils';

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function LevelBookmarks({
    level,
    slotOf,
    hideSlots,
    onLevel,
}: {
    level: number;
    slotOf: (level: number) => number;
    hideSlots?: boolean;
    onLevel: (level: number) => void;
}) {
    const t = useTranslations('spells.book');

    return (
        <div className="absolute top-6 right-1.5 bottom-0 z-10">
            <div className="sticky top-6 flex flex-col gap-1.5">
                {LEVELS.filter(
                    (l) => l <= 5 || hideSlots || slotOf(l) > 0 || level === l
                ).map((l) => (
                    <button
                        key={l}
                        type="button"
                        aria-pressed={level === l}
                        aria-label={
                            hideSlots
                                ? spellLevelRoman(l)
                                : t('bookmark', {
                                      level: spellLevelRoman(l),
                                      slots: l === 0 ? '∞' : slotOf(l),
                                  })
                        }
                        onClick={() => onLevel(l)}
                        className={cn(
                            'hud-sc flex h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[13px] [clip-path:polygon(0_0,100%_0,100%_100%,50%_86%,0_100%)]',
                            spellLevelMetal(l),
                            'metal-fill',
                            level === l ? '-ml-2 w-10' : 'w-8'
                        )}
                    >
                        <span className="flex flex-col items-center rounded-sm bg-[var(--palette-card,#1a140f)] px-1 text-[var(--palette-foreground,#e6dccb)]">
                            {spellLevelRoman(l)}
                            {!hideSlots && (
                                <span className="font-sans text-[11px]">
                                    {l === 0 ? '∞' : slotOf(l)}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
