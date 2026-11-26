import type { ReactNode } from 'react';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudSectionTitle } from '@/components/hud/page';

export function ReferenceDetailShell({
    icon,
    fallback,
    name,
    chips,
    children,
}: {
    icon: string | null;
    fallback: ReactNode;
    name: string;
    chips?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="space-y-4 text-hud-bone">
            <header className="flex items-start gap-3">
                <EntityIcon
                    src={icon}
                    name={name}
                    size={64}
                    className="size-16 shrink-0 rounded-lg bg-hud-field text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]"
                    fallback={fallback}
                />
                <div className="min-w-0 space-y-1.5">
                    <h2 className="hud-title text-xl leading-tight text-hud-ink">
                        {name}
                    </h2>
                    {chips ? (
                        <div className="flex flex-wrap gap-1.5">{chips}</div>
                    ) : null}
                </div>
            </header>
            {children}
        </div>
    );
}

export function DetailSection({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="space-y-1.5">
            <div className="flex items-center gap-2">
                <HudSectionTitle className="flex-1">{title}</HudSectionTitle>
                {action}
            </div>
            <div className="text-sm">{children}</div>
        </section>
    );
}
