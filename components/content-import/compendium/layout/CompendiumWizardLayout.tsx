import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function CompendiumWizardLayout({
    rail,
    step,
    summary,
    embedded,
}: {
    rail: ReactNode;
    step: ReactNode;
    summary: ReactNode;
    embedded?: boolean;
}) {
    return (
        <div className="@container" data-embedded={embedded || undefined}>
            <div
                className={cn(
                    'grid gap-4',
                    !embedded &&
                        '@3xl:grid-cols-[minmax(0,1fr)_300px] @6xl:grid-cols-[240px_minmax(0,1fr)_340px]'
                )}
            >
                <div className={cn(!embedded && '@3xl:col-span-2 @6xl:col-span-1')}>
                    {rail}
                </div>
                <div className="@container min-w-0">{step}</div>
                <div
                    className={cn(
                        'sticky bottom-0 z-10',
                        !embedded &&
                            '@3xl:top-[var(--shell-header-h,0px)] @3xl:bottom-auto @3xl:self-start'
                    )}
                >
                    {summary}
                </div>
            </div>
        </div>
    );
}
