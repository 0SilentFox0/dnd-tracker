import type { ReactNode } from 'react';

interface FieldSectionProps {
    title: string;
    children: ReactNode;
}

export function FieldSection({ title, children }: FieldSectionProps) {
    return (
        <section className="space-y-1.5">
            <h4 className="text-[0.65rem] font-semibold uppercase tracking-wider text-hud-muted">
                {title}
            </h4>
            {children}
        </section>
    );
}

interface FieldRowProps {
    label: string;
    children: ReactNode;
}

export function FieldRow({ label, children }: FieldRowProps) {
    return (
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-xs">
            <span className="min-w-0 text-hud-muted">{label}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {children}
            </div>
        </div>
    );
}
