'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { useProfile } from '../ProfileContext';

export function SheetTopBar({ actions }: { actions?: ReactNode }) {
    const { campaignId, sheet } = useProfile();

    const t = useTranslations('common.gameNavigation');

    const tb = useTranslations('common.breadcrumbs');

    return (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-hud-rule px-4">
            <nav
                aria-label={tb('label')}
                className="flex min-w-0 items-center gap-2 text-[15px] text-hud-muted"
            >
                <Link
                    href={`/campaigns/${campaignId}`}
                    className="inline-flex min-h-10 items-center gap-1 hover:text-hud-ink focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none"
                >
                    <ChevronLeft aria-hidden className="size-4" />
                    {t('campaign')}
                </Link>
                <span aria-hidden>/</span>
                <span className="truncate text-hud-ink">
                    {sheet.identity.name}
                </span>
            </nav>
            {actions && (
                <div
                    role="group"
                    className="flex shrink-0 items-center gap-1 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:border-0 [&_[data-slot=button]]:bg-transparent [&_[data-slot=button]]:text-hud-muted [&_[data-slot=button]]:hover:text-hud-ink"
                >
                    {actions}
                </div>
            )}
        </div>
    );
}
