'use client';

import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { AI_PANEL_WIDTH, type useAiPanelWidth } from '@/lib/hooks/ai';

export function ResizeHandle({
    panel,
}: {
    panel: ReturnType<typeof useAiPanelWidth>;
}) {
    const t = useTranslations('ai');

    const drag = useRef<{ startX: number; startWidth: number } | null>(null);

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        drag.current = { startX: e.clientX, startWidth: panel.width };
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (drag.current)
            panel.setWidth(
                drag.current.startWidth + drag.current.startX - e.clientX
            );
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

        e.preventDefault();
        panel.setWidth(
            panel.width +
                (e.key === 'ArrowLeft'
                    ? AI_PANEL_WIDTH.step
                    : -AI_PANEL_WIDTH.step)
        );
    };

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('panel.resizeLabel')}
            aria-valuenow={panel.width}
            aria-valuemin={AI_PANEL_WIDTH.min}
            aria-valuemax={panel.max}
            tabIndex={0}
            className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none hover:bg-primary/30 focus-visible:bg-primary/40 focus-visible:outline-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onDoubleClick={panel.reset}
            onKeyDown={onKeyDown}
        />
    );
}
