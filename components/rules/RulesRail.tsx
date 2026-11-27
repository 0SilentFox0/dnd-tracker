'use client';

import { Fragment, type ReactNode } from 'react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface RulesRailTab {
    id: string;
    label: ReactNode;
    group: string;
    badge?: ReactNode;
    hidden?: boolean;
}

export function RulesRail({
    tabs,
    sectionOpen,
}: {
    tabs: readonly RulesRailTab[];
    sectionOpen: boolean;
}) {
    const shown = tabs.filter((tab) => !tab.hidden);

    return (
        <TabsList
            data-slot="rules-rail"
            className={cn(
                'h-auto w-full items-stretch justify-start gap-0.5 bg-hud-page/97 p-0',
                'max-lg:flex-col lg:flex-wrap lg:gap-1 xl:flex-col xl:flex-nowrap',
                sectionOpen && 'max-lg:hidden'
            )}
        >
            {shown.map((tab, i) => (
                <Fragment key={tab.id}>
                    {tab.group !== shown[i - 1]?.group && (
                        <span
                            role="presentation"
                            className="hud-sc px-3 pt-3 pb-1 text-xs text-hud-soft first:pt-0 lg:max-xl:hidden"
                        >
                            {tab.group}
                        </span>
                    )}
                    <TabsTrigger
                        value={tab.id}
                        className="hud-sc h-10 justify-start rounded-lg text-left text-base text-hud-muted xl:border-transparent xl:data-[state=active]:bg-transparent xl:data-[state=active]:shadow-[inset_2px_0_0_var(--hud-accent)]"
                    >
                        {tab.label}
                        {tab.badge != null && (
                            <span className="ml-1.5">{tab.badge}</span>
                        )}
                    </TabsTrigger>
                </Fragment>
            ))}
        </TabsList>
    );
}
