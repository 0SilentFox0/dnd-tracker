'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIndicatorFlip } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

interface SheetTabItem {
    id: string;
    label: ReactNode;
    icon?: ReactNode;
    invalid?: boolean;
}

export function SheetTabList({
    tabs,
    value,
    trigger,
    invalidLabel,
}: {
    tabs: SheetTabItem[];
    value: string;
    trigger?: string;
    invalidLabel: string;
}) {
    const list = useRef<HTMLDivElement>(null);

    const indicator = useRef<HTMLSpanElement>(null);

    const activeTab = useRef<HTMLButtonElement>(null);

    useIndicatorFlip(indicator, activeTab, value);

    const [atEnd, setAtEnd] = useState(false);

    const [atStart, setAtStart] = useState(true);

    const syncEdge = () => {
        const el = list.current;

        if (!el) return;

        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
        setAtStart(el.scrollLeft <= 2);
    };

    useEffect(() => {
        activeTab.current?.scrollIntoView?.({
            inline: 'nearest',
            block: 'nearest',
            behavior: 'smooth',
        });

        syncEdge();
    }, [value]);

    return (
        <div className="relative">
            <TabsList
                ref={list}
                onScroll={syncEdge}
                className="hud-scroll-x relative flex h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-lg border border-hud-line bg-hud-panel/70 p-[3px]"
            >
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        data-tab={tab.id}
                        ref={tab.id === value ? activeTab : undefined}
                        className={cn(
                            'motion-press relative min-h-11 min-w-fit flex-1 shrink-0 gap-2 rounded-md px-3 text-[15px] font-medium text-hud-text hover:bg-hud-panel-2/60 hover:text-hud-ink data-[state=active]:bg-hud-panel-2! data-[state=active]:font-bold data-[state=active]:text-hud-ink! data-[state=active]:shadow-[inset_0_1px_0_var(--hud-hi),inset_0_-2px_0_var(--hud-accent)] [&_svg]:size-5 [&_svg]:text-hud-muted data-[state=active]:[&_svg]:text-hud-accent-fg',
                            trigger
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.invalid && (
                            <span
                                data-invalid-dot
                                aria-label={invalidLabel}
                                className="inline-block h-1.5 w-1.5 rounded-full bg-hud-danger"
                            />
                        )}
                        {tab.id === value && (
                            <span
                                ref={indicator}
                                aria-hidden
                                data-testid="tab-indicator"
                                className="motion-indicator"
                            />
                        )}
                    </TabsTrigger>
                ))}
            </TabsList>
            {!atStart && <Edge side="left" />}
            {!atEnd && <Edge side="right" />}
        </div>
    );
}

function Edge({ side }: { side: 'left' | 'right' }) {
    const Icon = side === 'left' ? ChevronLeft : ChevronRight;

    return (
        <span
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-y-px flex w-10 items-center from-hud-page to-transparent md:hidden',
                side === 'left'
                    ? 'left-px justify-start bg-gradient-to-r pl-1'
                    : 'right-px justify-end bg-gradient-to-l pr-1'
            )}
        >
            <Icon className="size-5 text-hud-muted" />
        </span>
    );
}
