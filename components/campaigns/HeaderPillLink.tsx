import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { ARIA_DISABLED_CLASS } from '@/components/ui/disabled';

const PILL =
    'flex h-8 items-center gap-1.5 rounded border border-hud-accent bg-hud-accent px-2.5 text-xs font-semibold tracking-[.08em] text-hud-accent-ink';

export function HeaderPillLink({
    href,
    icon: Icon,
    label,
    srLabel,
    'data-tour': dataTour,
}: {
    href: string | null;
    icon: LucideIcon;
    label: string;
    srLabel: string;
    'data-tour'?: string;
}) {
    const content = (
        <>
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{srLabel}</span>
        </>
    );

    if (!href)
        return (
            <span
                aria-disabled
                data-slot="header-pill-link"
                data-tour={dataTour}
                className={`${PILL} ${ARIA_DISABLED_CLASS}`}
            >
                {content}
            </span>
        );

    return (
        <Link
            href={href}
            data-slot="header-pill-link"
            data-tour={dataTour}
            className={`${PILL} hover:brightness-110`}
        >
            {content}
        </Link>
    );
}
