import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export function ProfileEmptyState({
    icon: Icon,
    text,
    href,
    cta,
}: {
    icon: LucideIcon;
    text: string;
    href?: string;
    cta?: string;
}) {
    return (
        <div className="ds-inset flex flex-col items-center gap-3 rounded-xl px-4 py-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-hud-panel-2 text-hud-accent-fg">
                <Icon aria-hidden className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-hud-muted">{text}</p>
            {href && cta && (
                <Link
                    href={href}
                    className="hud-sc inline-flex min-h-10 items-center rounded-lg border border-hud-accent px-4 text-sm text-hud-accent-fg transition-colors hover:bg-hud-panel-2"
                >
                    {cta}
                </Link>
            )}
        </div>
    );
}
