'use client';

import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { useHudPortalClass } from '@/components/ui/portal-class';
import { cn } from '@/lib/utils';

export function SideSheet({
    open,
    onOpenChange,
    title,
    onInteractOutside,
    keepMounted,
    className,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    onInteractOutside?: (e: Event) => void;
    keepMounted?: boolean;
    className?: string;
    children?: ReactNode;
}) {
    const hudClass = useHudPortalClass();

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogPrimitive.Portal forceMount={keepMounted || undefined}>
                <DialogPrimitive.Content
                    data-slot="side-sheet"
                    forceMount={keepMounted || undefined}
                    aria-describedby={undefined}
                    onInteractOutside={onInteractOutside}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className={cn(
                        'fixed inset-y-0 z-40 flex flex-col border-l border-white/20 bg-black/85 shadow-[-12px_0_40px_rgba(0,0,0,.6)] outline-none data-[state=closed]:hidden',
                        hudClass,
                        className
                    )}
                >
                    <DialogPrimitive.Title className="hud-sc h-12 shrink-0 border-b border-white/15 px-4 text-[15px] leading-[48px] font-bold tracking-[.1em] text-[var(--gold)]">
                        {title}
                    </DialogPrimitive.Title>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        {children}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
