import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';

import { BRAND, LANDING_PATH } from '@/lib/constants/site';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
    return (
        <Image
            src="/brand/email-logo.png"
            alt=""
            width={32}
            height={32}
            className={cn('size-8 rounded-lg', className)}
        />
    );
}

export function Brand({ locale }: { locale: Locale }) {
    return (
        <Link
            prefetch={false}
            href={LANDING_PATH[locale]}
            className="hud-sc flex items-center gap-2 text-lg text-hud-ink"
        >
            <BrandMark />
            {BRAND.name}
        </Link>
    );
}

// the party's trail arriving at this section: a drawn ink path ending in a waypoint
export function TrailMark({ className }: { className?: string }) {
    return (
        <span aria-hidden className={cn('ld-trailmark', className)}>
            <svg viewBox="0 0 40 72" className="ld-trail-path">
                <path
                    d="M20 0 C 4 16, 36 30, 20 46 S 18 62, 20 68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeDasharray="3 5"
                    strokeLinecap="round"
                />
            </svg>
            <i className="ld-waypoint" />
        </span>
    );
}

export function SectionTitle({
    id,
    eyebrow,
    title,
    text,
    align = 'center',
}: {
    id?: string;
    eyebrow: string;
    title: string;
    text?: string;
    align?: 'center' | 'left';
}) {
    const left = align === 'left';

    return (
        <div
            className={
                left
                    ? 'max-w-xl space-y-3'
                    : 'mx-auto max-w-2xl space-y-3 text-center'
            }
        >
            <TrailMark className={left ? undefined : 'mx-auto'} />
            <p className="hud-sc text-sm tracking-[0.2em] text-[var(--ld-gold)]">
                {eyebrow}
            </p>
            <h2 id={id} className="hud-sc ld-h2 ld-ink text-hud-ink">
                {title}
            </h2>
            {text && <p className="ld-lead text-hud-bone">{text}</p>}
            {!left && (
                <div
                    aria-hidden
                    className="ld-rule mx-auto flex max-w-xs items-center gap-3 pt-2"
                >
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[color-mix(in_srgb,var(--ld-gold)_60%,transparent)]" />
                    <span className="size-2 rotate-45 border border-[var(--ld-gold)]" />
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[color-mix(in_srgb,var(--ld-gold)_60%,transparent)]" />
                </div>
            )}
        </div>
    );
}

export function CheckList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2">
            {items.map((p) => (
                <li key={p} className="flex gap-2 text-hud-bone">
                    <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-hud-ink"
                    />
                    {p}
                </li>
            ))}
        </ul>
    );
}
