'use client';

import { type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import { HUD_GLASS, HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';
import { slotRingOffset,type SlotView } from '@/lib/utils/battle/view';

export const SLOT_RING_RADIUS = 80;

const RING_SLOT = 38;

interface Props {
    slots: SlotView[];
    selected: number | null;
    onSelect(level: number): void;
    ring?: { cx: number; cy: number };
}

export function SpellSlotRow({ slots, selected, onSelect, ring }: Props) {
    const t = useTranslations('battle.hero.slots');

    if (slots.length === 0) return null;

    return (
        <div
            role="group"
            aria-label={t('title')}
            className={ring ? 'absolute inset-0' : 'flex flex-wrap gap-1'}
        >
            {slots.map((s, i) => {
                const active = selected === s.level;

                let style: CSSProperties | undefined;

                if (ring) {
                    const o = slotRingOffset(i, slots.length, SLOT_RING_RADIUS);

                    style = {
                        left: ring.cx + o.x - RING_SLOT / 2,
                        top: ring.cy + o.y - RING_SLOT / 2,
                    };
                }

                return (
                    <HudButton
                        key={s.pact ? 'pact' : s.level}
                        type="button"
                        style={style}
                        aria-pressed={active}
                        aria-label={t(s.pact ? 'pactLabel' : 'label', {
                            level: s.level,
                            current: s.current,
                            max: s.max,
                        })}
                        onClick={() => onSelect(s.level)}
                        className={cn(
                            'flex flex-col items-center justify-center rounded-full border text-[var(--ink)]',
                            ring
                                ? `${HUD_GLASS} absolute size-[38px]`
                                : 'size-9 md:size-10',
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
