import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { ARIA_DISABLED_CLASS } from '@/components/ui/disabled';

const PILL = `${buttonVariants({ variant: 'default', size: 'sm' })} shrink-0 whitespace-nowrap max-sm:px-2`;

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
            <span className="max-sm:sr-only">{label}</span>
        </>
    );

    if (!href)
        return (
            <span
                aria-disabled
                data-slot="header-pill-link"
                data-tour={dataTour}
                aria-label={srLabel}
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
            aria-label={srLabel}
            className={PILL}
        >
            {content}
        </Link>
    );
}
