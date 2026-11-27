import type { ReactNode } from 'react';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudSectionTitle } from '@/components/hud/page';

export function DetailHeader({
    icon,
    name,
    fallback,
    chips,
}: {
    icon: string | null;
    name: string;
    fallback: ReactNode;
    chips?: ReactNode;
}) {
    return (
        <header className="flex items-start gap-3">
            <EntityIcon
                src={icon}
                name={name}
                size={64}
                className="size-16 shrink-0 rounded-xl border border-hud-line bg-hud-field text-hud-muted"
                fallback={fallback}
            />
            <div className="min-w-0 flex-1">
                <h2 className="hud-title text-lg leading-tight text-hud-ink">
                    {name}
                </h2>
                {chips && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{chips}</div>
                )}
            </div>
        </header>
    );
}

export function DetailChip({
    children,
    color,
}: {
    children: ReactNode;
    color?: string | null;
}) {
    return (
        <span
            className="rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]"
            style={
                color ? { boxShadow: `inset 0 0 0 1px ${color}` } : undefined
            }
        >
            {children}
        </span>
    );
}

export function DetailSection({
    title,
    children,
}: {
    title: ReactNode;
    children: ReactNode;
}) {
    return (
        <section>
            <HudSectionTitle>{title}</HudSectionTitle>
            <div className="mt-2 text-sm text-hud-bone">{children}</div>
        </section>
    );
}

export function DetailRoot({ children }: { children: ReactNode }) {
    return <article className="space-y-4">{children}</article>;
}
