import type { MouseEventHandler, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function FullscreenOverlay({
    label,
    modal,
    onClick,
    className,
    children,
}: {
    label: string;
    modal?: boolean;
    onClick?: MouseEventHandler<HTMLDivElement>;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            role="dialog"
            aria-modal={modal ? 'true' : undefined}
            aria-label={label}
            onClick={onClick}
            className={cn('fixed inset-0', className)}
        >
            {children}
        </div>
    );
}
