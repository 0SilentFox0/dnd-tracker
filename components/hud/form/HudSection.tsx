import type { ReactNode } from 'react';

import { HudSheetHeading } from '@/components/hud/page';
import { cn } from '@/lib/utils';

export function HudSection({
    title,
    header,
    action,
    panel,
    children,
    className,
}: {
    title?: ReactNode;
    header?: ReactNode;
    action?: ReactNode;
    panel?: boolean;
    children: ReactNode;
    className?: string;
}) {
    const body = panel ? (
        <div className="ds-panel p-4">
            {children}
        </div>
    ) : (
        children
    );

    return (
        <section className={cn('mt-5 first:mt-0', className)}>
            {header ? (
                <div className="mb-1.5">{header}</div>
            ) : panel ? (
                <div className="mb-2 flex items-center justify-between gap-2">
                    <HudSheetHeading>{title}</HudSheetHeading>
                    {action}
                </div>
            ) : (
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h2 className="hud-sc text-2xl text-hud-ink">
                        {title}
                    </h2>
                    {action}
                </div>
            )}
            {body}
        </section>
    );
}
