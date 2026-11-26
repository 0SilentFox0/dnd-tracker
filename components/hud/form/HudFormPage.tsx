import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudFormPreviewButton } from './HudFormPreviewButton';

import '@/components/hud/hud.css';
import { HUD_SURFACE } from '@/components/hud';
import { HudPortalClassProvider } from '@/components/ui/portal-class';
import { cn } from '@/lib/utils';

export type HudFormPageWidth = 'narrow' | 'wide' | 'page';

const ROOT = {
    narrow: 'max-w-3xl ornate',
    wide: 'max-w-[1440px] ornate',
    page: 'max-w-page',
} as const;

const ACTIONS =
    'order-last sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-hud-rule bg-hud-page/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:sticky lg:top-[var(--shell-header-h,57px)] lg:order-none lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start lg:border-0 lg:bg-hud-page/80 lg:px-0 lg:py-2 lg:backdrop-blur';

export function HudFormPage({
    title,
    aside,
    width = 'narrow',
    actions,
    side,
    children,
    className,
}: {
    title: ReactNode;
    aside?: ReactNode;
    width?: HudFormPageWidth;
    actions?: ReactNode;
    side?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const t = useTranslations('common');

    const wide = width === 'wide';

    const hasSide = wide && side != null;

    return (
        <div
            className={cn(
                HUD_SURFACE,
                'hud-form hud-form-page mx-auto flex min-h-dvh w-full flex-col sm:my-4 sm:min-h-0 sm:rounded-[var(--r)] sm:bg-hud-panel sm:p-6 sm:shadow-[var(--hud-sh)]',
                ROOT[width],
                actions && 'lg:grid lg:grid-cols-[minmax(0,1fr)_auto]',
                className
            )}
        >
            <header
                className={cn(
                    'flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-0',
                    actions && 'lg:col-start-1 lg:row-start-1'
                )}
            >
                <h1 className="hud-sc text-[28px] text-hud-ink">{title}</h1>
                {aside && (
                    <span className="text-xs text-hud-muted sm:text-sm sm:text-hud-soft">
                        {aside}
                    </span>
                )}
                {hasSide && (
                    <HudFormPreviewButton
                        label={t('form.preview')}
                        title={t('form.previewTitle')}
                    >
                        {side}
                    </HudFormPreviewButton>
                )}
            </header>
            <div
                className={cn('orn', actions && 'lg:col-span-2 lg:row-start-2')}
                aria-hidden
            />
            <HudPortalClassProvider value={HUD_SURFACE}>
                {wide || actions ? (
                    <div
                        className={cn(
                            wide ? 'hud-wide-body' : 'flex flex-1 flex-col',
                            actions && 'lg:col-span-2 lg:row-start-3'
                        )}
                    >
                        {children}
                        {hasSide && (
                            <aside
                                aria-label={t('form.previewTitle')}
                                className="hud-wide-side"
                            >
                                {side}
                            </aside>
                        )}
                    </div>
                ) : (
                    children
                )}
            </HudPortalClassProvider>
            {actions && <div className={ACTIONS}>{actions}</div>}
        </div>
    );
}
