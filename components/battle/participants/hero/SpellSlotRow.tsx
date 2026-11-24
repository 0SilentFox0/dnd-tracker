'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';
import type { SlotView } from '@/lib/utils/battle/view';

export function SpellSlotRow({
    slots,
    selected,
    onSelect,
}: {
    slots: SlotView[];
    selected: number | null;
    onSelect(level: number): void;
}) {
    const t = useTranslations('battle.hero.slots');

    if (slots.length === 0) return null;

    return (
        <div
            role="group"
            aria-label={t('title')}
            className="flex flex-wrap gap-1"
        >
            {slots.map((s) => {
                const active = selected === s.level;

                return (
                    <HudButton
                        key={s.pact ? 'pact' : s.level}
                        type="button"
                        aria-pressed={active}
                        aria-label={t(s.pact ? 'pactLabel' : 'label', {
                            level: s.level,
                            current: s.current,
                            max: s.max,
                        })}
                        onClick={() => onSelect(s.level)}
                        className={cn(
                            'flex size-9 flex-col items-center justify-center rounded-full border text-[var(--ink)] md:size-10',
                            'focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none',
                            active
                                ? 'border-[var(--gold)] ring-1 ring-[var(--gold)]'
                                : 'border-white/20',
                            s.current === 0 && 'opacity-50',
                            s.pact && 'border-dashed'
                        )}
                    >
                        <span className="hud-sc text-[13px] leading-none font-bold">
                            {s.roman}
                        </span>
                        <span className="text-[9px] leading-none">
                            {s.current}/{s.max}
                        </span>
                    </HudButton>
                );
            })}
        </div>
    );
}
