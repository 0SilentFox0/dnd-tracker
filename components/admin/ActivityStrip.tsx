'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { DAY_MS } from '@/lib/constants/time';
import { cn } from '@/lib/utils';

const DAYS = 90;

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function ActivityStrip({ days }: { days: string[] }) {
    const [now] = useState(() => Date.now());

    const t = useTranslations('admin.user');

    const active = new Set(days);

    return (
        <div
            role="img"
            aria-label={t('activity')}
            className="grid grid-flow-col grid-rows-7 gap-0.5"
            style={{
                gridTemplateColumns: `repeat(${Math.ceil(DAYS / 7)}, 0.75rem)`,
            }}
        >
            {Array.from({ length: DAYS }, (_, i) => {
                const day = dayKey(now - (DAYS - 1 - i) * DAY_MS);

                const on = active.has(day);

                return (
                    <span
                        key={day}
                        data-active={on}
                        title={on ? t('activityDay', { day }) : day}
                        className={cn(
                            'size-3 rounded-sm',
                            on ? 'bg-hud-accent' : 'bg-hud-line'
                        )}
                    />
                );
            })}
        </div>
    );
}
