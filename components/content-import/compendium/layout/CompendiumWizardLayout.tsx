import type { ReactNode } from 'react';

export function CompendiumWizardLayout({
    rail,
    step,
    summary,
}: {
    rail: ReactNode;
    step: ReactNode;
    summary?: ReactNode;
}) {
    return (
        <div className="@container">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @6xl:grid-cols-[240px_minmax(0,1fr)_340px]">
                <div className="min-w-0 @3xl:col-span-2 @6xl:col-span-1">{rail}</div>
                <div className="min-w-0 space-y-3">{step}</div>
                {summary && (
                    <aside className="ds-panel max-@3xl:sticky max-@3xl:bottom-0 max-@3xl:z-10 self-start rounded-xl p-3 @3xl:sticky @3xl:top-4">
                        {summary}
                    </aside>
                )}
            </div>
        </div>
    );
}
