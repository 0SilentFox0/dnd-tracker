import type { ReactNode } from 'react';

export function BasicPanel({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="ds-panel space-y-4 p-4 sm:p-5">
            <h3 className="hud-sc border-b border-hud-rule pb-2 text-sm text-hud-ink">
                {title}
            </h3>
            {children}
        </section>
    );
}
