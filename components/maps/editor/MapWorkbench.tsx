'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Maximize2 } from 'lucide-react';

import { HudIconButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MapWorkbench({
    canvas,
    sidebar,
    toolbar,
    notice,
    fullscreen,
    onEscape,
    className,
}: {
    canvas: ReactNode;
    sidebar: ReactNode;
    toolbar?: ReactNode;
    notice?: ReactNode;
    fullscreen: { value: boolean; set: (v: boolean) => void; label: string };
    onEscape?: () => boolean;
    className?: string;
}) {
    const t = useTranslations('maps.editor.workbench');

    const full = fullscreen.value;

    const escape = useRef({ onEscape, fullscreen, full });

    useEffect(() => {
        escape.current = { onEscape, fullscreen, full };
    });

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== 'Escape' || e.defaultPrevented) return;

            if (
                document.querySelector(
                    '[role="dialog"]:not([data-workbench]), [role="menu"], [role="listbox"]'
                )
            )
                return;

            const { onEscape, fullscreen, full } = escape.current;

            if (onEscape?.()) return e.stopPropagation();

            if (full) {
                e.stopPropagation();
                fullscreen.set(false);
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // fullscreen only restyles the same tree, so canvas and editor state are never remounted
    return (
        <div
            role={full ? 'dialog' : undefined}
            aria-modal={full ? 'true' : undefined}
            aria-label={full ? fullscreen.label : undefined}
            data-workbench=""
            className={cn(
                'grid min-h-0 grid-rows-[55dvh_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1',
                'lg:h-[calc(100dvh-var(--app-header-h,89px)-var(--workbench-offset,0px))]',
                full &&
                    'fixed inset-0 z-50 h-dvh! grid-rows-[60dvh_auto] overflow-y-auto bg-background p-3 lg:grid-rows-1 lg:overflow-hidden',
                className
            )}
        >
            <div className="relative min-h-0 min-w-0 overflow-hidden">
                {canvas}
                <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start gap-2">
                    {full ? (
                        <Button
                            type="button"
                            size="sm"
                            className="pointer-events-auto"
                            onClick={() => fullscreen.set(false)}
                        >
                            {t('done')}
                        </Button>
                    ) : (
                        <HudIconButton
                            type="button"
                            aria-label={fullscreen.label}
                            title={fullscreen.label}
                            className="ds-raised pointer-events-auto"
                            onClick={() => fullscreen.set(true)}
                        >
                            <Maximize2 aria-hidden="true" className="h-4 w-4" />
                        </HudIconButton>
                    )}
                    <div className="min-w-0">{toolbar}</div>
                </div>
                <p
                    role="status"
                    aria-live="polite"
                    className={cn(
                        'ds-raised pointer-events-none absolute inset-x-3 bottom-3 z-10 mx-auto w-fit max-w-full rounded-lg px-3 py-1.5 text-sm text-hud-ink',
                        !notice && 'sr-only'
                    )}
                >
                    {notice}
                </p>
            </div>
            <aside className="min-h-0 min-w-0 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl bg-hud-panel p-2 pb-6 shadow-sm">
                {sidebar}
            </aside>
        </div>
    );
}
