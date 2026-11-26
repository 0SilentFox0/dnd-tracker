import type { ReactNode } from 'react';

export function BasicPanel({
    title,
    action,
    className,
    children,
}: {
    title: string;
    action?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={`ds-panel space-y-4 p-4 sm:p-5 ${className ?? ''}`}>
            <div className="flex items-center justify-between gap-3 border-b border-hud-rule pb-2">
                <h3 className="hud-sc text-sm text-hud-ink">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}
