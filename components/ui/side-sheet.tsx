'use client';

import { type ReactNode, useRef } from 'react';
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

    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <DialogPrimitive.Root
            open={open}
            onOpenChange={onOpenChange}
            modal={false}
        >
            <DialogPrimitive.Portal forceMount={keepMounted || undefined}>
                <DialogPrimitive.Content
                    ref={contentRef}
                    data-slot="side-sheet"
                    forceMount={keepMounted || undefined}
                    aria-describedby={undefined}
                    onInteractOutside={onInteractOutside}
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        contentRef.current?.focus();
                    }}
                    className={cn(
                        'fixed inset-y-0 z-40 flex flex-col border-l border-hud-line bg-hud-panel shadow-[-12px_0_40px_rgba(0,0,0,.6)] outline-none data-[state=closed]:hidden',
                        hudClass,
                        className
                    )}
                >
                    <DialogPrimitive.Title className="hud-sc h-12 shrink-0 border-b border-hud-line px-4 text-xl leading-[48px] font-normal text-hud-ink">
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
