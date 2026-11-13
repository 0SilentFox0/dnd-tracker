import type { ReactNode } from 'react';

export function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-4">
            <h4 className="hud-sc flex h-5 items-center text-[13px] tracking-[.08em] text-[var(--hud-muted)]">
                {title}
            </h4>
            {children}
        </section>
    );
}
