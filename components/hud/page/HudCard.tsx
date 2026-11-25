import type { ReactNode } from 'react';
import Link from 'next/link';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

const TONE = {
    default:
        'shadow-[inset_0_0_0_1px_var(--color-hud-edge)] hover:shadow-[inset_0_0_0_1px_var(--color-hud-muted)]',
    active: '',
    muted: 'opacity-70 shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)]',
} as const;

interface HudCardProps {
    tone?: keyof typeof TONE;
    accent?: string;
    asChild?: boolean;
    link?: { href: string; label?: string };
    className?: string;
    'data-tour'?: string;
    children: ReactNode;
}

export function HudCard({
    tone = 'default',
    accent,
    asChild = false,
    link,
    className,
    'data-tour': dataTour,
    children,
}: HudCardProps) {
    const Comp = asChild ? Slot : 'div';

    return (
        <Comp
            data-tone={tone}
            data-tour={dataTour}
            data-clickable={link ? '' : undefined}
            style={accent ? { borderLeftColor: accent } : undefined}
            className={cn(
                link && 'relative cursor-pointer',
                'block rounded-lg bg-hud-panel p-3 text-hud-bone transition-shadow',
                accent && 'border-l-[3px]',
                TONE[tone],
                className
            )}
        >
            {link && !asChild ? (
                <>
                    <Link
                        href={link.href}
                        data-card-overlay
                        aria-label={link.label}
                        className="absolute inset-0 rounded-lg"
                    />
                    {children}
                </>
            ) : (
                children
            )}
        </Comp>
    );
}
