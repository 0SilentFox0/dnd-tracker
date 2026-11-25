import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function ActionBar({
    children,
    className,
    error,
}: {
    children: ReactNode;
    className?: string;
    error?: string | null;
}) {
    return (
        <div
            data-slot="action-bar"
            className={cn(
                'sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-hud-rule bg-hud-page/[.97] px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>*]:w-full',
                'sm:static sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pt-4 sm:pb-0 sm:[&>*]:w-auto',
                error && 'flex-wrap',
                className
            )}
        >
            {error && (
                <p
                    role="alert"
                    className="!basis-full text-sm text-hud-crimson-fg"
                >
                    {error}
                </p>
            )}
            {children}
        </div>
    );
}
