import type { ReactNode } from 'react';

export function BasicPanel({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="ds-panel space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-hud-rule pb-2">
                <h2 className="hud-sc text-sm text-hud-ink">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}
