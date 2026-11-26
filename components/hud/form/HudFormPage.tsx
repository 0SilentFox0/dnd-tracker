import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudFormPreviewButton } from './HudFormPreviewButton';

import '@/components/hud/hud.css';
import { HUD_SURFACE } from '@/components/hud';
import { HudPortalClassProvider } from '@/components/ui/portal-class';
import { useElementSize } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export type HudFormPageWidth = 'narrow' | 'wide' | 'page';

const ROOT = {
    narrow: 'max-w-3xl ornate',
    wide: 'max-w-[1440px] ornate',
    page: 'max-w-page',
} as const;

const ACTIONS =
    'order-last sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-hud-rule bg-hud-page/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:order-none lg:shrink-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-2';

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

    const { ref: footerRef, size: footer } = useElementSize<HTMLDivElement>();

    // sticky bars of the page body dock above the real footer height
    const footerStyle =
        actions && footer.height > 0
            ? ({ '--hud-form-footer-h': `${footer.height}px` } as CSSProperties)
            : undefined;

    return (
        <div
            style={footerStyle}
            className={cn(
                HUD_SURFACE,
                'hud-form hud-form-page mx-auto flex min-h-dvh w-full flex-col sm:my-4 sm:min-h-0 sm:rounded-[var(--r)] sm:bg-hud-panel sm:p-6 sm:shadow-[var(--hud-sh)]',
                ROOT[width],
                className
            )}
        >
            <div
                className={cn(
                    'contents',
                    actions &&
                        'lg:sticky lg:top-[var(--shell-header-h,57px)] lg:z-20 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:bg-hud-page/80 lg:backdrop-blur'
                )}
            >
                <header
                    className={cn(
                        'flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-0',
                        actions && 'lg:min-w-0 lg:flex-1'
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
                {actions && (
                    <div ref={footerRef} className={ACTIONS}>
                        {actions}
                    </div>
                )}
            </div>
            <div className="orn" aria-hidden />
            <HudPortalClassProvider value={HUD_SURFACE}>
                {wide || actions ? (
                    <div
                        className={
                            wide ? 'hud-wide-body' : 'flex flex-1 flex-col'
                        }
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
        </div>
    );
}
