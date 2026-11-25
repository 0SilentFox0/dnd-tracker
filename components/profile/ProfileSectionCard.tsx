import type { ReactNode } from 'react';

export function ProfileSectionCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="ds-panel space-y-3 p-4 sm:p-5">
            <h2 className="hud-sc text-sm tracking-[.12em] text-hud-ink uppercase">
                {title}
            </h2>
            <div className="orn" aria-hidden />
            {children}
        </section>
    );
}
