import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { HudFormAside, HudFormSide } from './HudFormSide';

import '@/components/hud/hud.css';
import { HUD_SURFACE } from '@/components/hud';
import { HudPortalClassProvider } from '@/components/ui/portal-class';
import { cn } from '@/lib/utils';

export interface HudFormPageHeader {
    title: ReactNode;
    aside?: ReactNode;
    back?: { href: string; label: ReactNode };
    menu?: ReactNode;
}

export function HudFormPage({
    header,
    width = 'narrow',
    actions,
    side,
    children,
    className,
}: {
    header: HudFormPageHeader;
    width?: 'narrow' | 'wide';
    actions?: ReactNode;
    side?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const wide = width === 'wide';

    const { title, aside, back, menu } = header;

    return (
        <div
            className={cn(
                HUD_SURFACE,
                'hud-form hud-form-page ornate mx-auto w-full sm:my-4 sm:rounded-[var(--r)] sm:bg-hud-panel sm:p-6 sm:shadow-[var(--hud-sh)]',
                wide
                    ? 'hud-form-wide min-h-dvh max-w-[1680px] sm:min-h-0'
                    : 'flex min-h-dvh max-w-3xl flex-col sm:min-h-0',
                className
            )}
        >
            <div className="hud-form-head">
                {back && (
                    <Link
                        href={back.href}
                        className="ds-interactive inline-flex items-center gap-1 px-4 pt-3 text-sm text-hud-muted hover:text-hud-ink sm:px-0 sm:pt-0"
                    >
                        <ChevronLeft className="size-4" aria-hidden />
                        {back.label}
                    </Link>
                )}
                <header className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-0">
                    <h1 className="hud-sc text-[28px] text-hud-ink">{title}</h1>
                    {(aside || menu || (wide && side)) && (
                        <span className="flex items-center gap-2 text-xs text-hud-muted sm:text-sm sm:text-hud-soft">
                            {aside}
                            {wide && side && <HudFormSide>{side}</HudFormSide>}
                            {menu}
                        </span>
                    )}
                </header>
                <div className="orn" aria-hidden />
            </div>
            <HudPortalClassProvider value={HUD_SURFACE}>
                <div className={cn(wide ? 'hud-form-body' : 'contents')}>
                    {children}
                </div>
                {actions && <div className="hud-form-actions">{actions}</div>}
                {wide && side && <HudFormAside>{side}</HudFormAside>}
            </HudPortalClassProvider>
        </div>
    );
}
