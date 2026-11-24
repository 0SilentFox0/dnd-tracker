'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSlidingIndicator } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

const EDGE_PAD = 24;

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

    const box = useSlidingIndicator(list, value);

    const [animated, setAnimated] = useState(false);

    const [atEnd, setAtEnd] = useState(false);

    const syncEdge = () => {
        const el = list.current;

        if (el) setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };

    useEffect(() => {
        if (!box) return;

        const frame = requestAnimationFrame(() => setAnimated(true));

        return () => cancelAnimationFrame(frame);
    }, [box]);

    useEffect(() => {
        const el = list.current;

        if (!el || !box) return;

        if (box.left < el.scrollLeft + EDGE_PAD)
            el.scrollTo?.({ left: box.left - EDGE_PAD, behavior: 'smooth' });
        else if (
            box.left + box.width >
            el.scrollLeft + el.clientWidth - EDGE_PAD
        )
            el.scrollTo?.({
                left: box.left + box.width - el.clientWidth + EDGE_PAD,
                behavior: 'smooth',
            });

        syncEdge();
    }, [box]);

    return (
        <div className="relative">
            <TabsList
                ref={list}
                onScroll={syncEdge}
                className="hud-scroll-x relative flex h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-[4px] border border-hud-line bg-hud-panel p-[3px] shadow-sm"
            >
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        data-tab={tab.id}
                        className={cn(
                            'motion-press min-h-11 min-w-fit flex-1 shrink-0 gap-2 rounded-[3px] px-3 text-[15px] font-medium text-hud-text hover:bg-hud-raised hover:text-hud-ink data-[state=active]:bg-hud-raised! data-[state=active]:font-bold data-[state=active]:text-hud-ink! data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.06)] [&_svg]:size-5 [&_svg]:text-hud-muted data-[state=active]:[&_svg]:text-hud-gold',
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
                    </TabsTrigger>
                ))}
                <span
                    aria-hidden
                    data-testid="tab-indicator"
                    className="motion-indicator"
                    style={{
                        bottom: 3,
                        opacity: box ? 1 : 0,
                        transform: box
                            ? `translateX(${box.left}px) scaleX(${box.width})`
                            : undefined,
                        transition: animated ? undefined : 'none',
                    }}
                />
            </TabsList>
            {!atEnd && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-px right-px w-10 bg-gradient-to-l from-hud-page to-transparent md:hidden"
                />
            )}
        </div>
    );
}
