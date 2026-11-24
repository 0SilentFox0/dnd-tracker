'use client';

import { type ReactNode, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { SheetTabList } from './SheetTabList';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useSmoothHeight,
    useSwipeTabs,
    useTabDirection,
} from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export interface HudTab<T extends string = string> {
    id: T;
    label: ReactNode;
    content: ReactNode;
    invalid?: boolean;
    icon?: ReactNode;
}

interface HudTabsProps<T extends string> {
    tabs: HudTab<T>[];
    value: T;
    onValueChange: (id: T) => void;
    header?: ReactNode;
    keepMounted?: boolean;
    styles?: {
        content?: string;
        trigger?: string;
        variant?: 'default' | 'sheet';
    };
}

export function HudTabs<T extends string>({
    tabs,
    value,
    onValueChange,
    header,
    keepMounted = false,
    styles = {},
}: HudTabsProps<T>) {
    const t = useTranslations('common');

    const sheet = styles.variant === 'sheet';

    const order = tabs.map((tab) => tab.id);

    const dir = useTabDirection(order, value);

    const panels = useRef<HTMLDivElement>(null);

    useSmoothHeight(panels, sheet ? value : '');

    const swipe = useSwipeTabs(order, value, (id) => onValueChange(id as T));

    return (
        <Tabs value={value} onValueChange={(v) => onValueChange(v as T)}>
            <div
                className={cn(
                    'sticky z-20 bg-hud-page/[.97]',
                    sheet
                        ? 'top-[57px] px-4 py-2 lg:top-16'
                        : 'top-[env(safe-area-inset-top,0px)] border-b border-hud-rule'
                )}
            >
                {header}
                {sheet ? (
                    <SheetTabList
                        tabs={tabs}
                        value={value}
                        trigger={styles.trigger}
                        invalidLabel={t('ui.hasErrors')}
                    />
                ) : (
                    <TabsList className="hud-scroll-x flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-1.5 md:flex-wrap md:overflow-x-visible">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className={cn(
                                    'profile-tab hud-sc h-10 min-w-fit flex-1 shrink-0 rounded-md px-2.5 text-[13px] text-hud-muted data-[state=active]:shadow-none',
                                    styles.trigger
                                )}
                            >
                                {tab.label}
                                {tab.invalid && (
                                    <span
                                        data-invalid-dot
                                        aria-label={t('ui.hasErrors')}
                                        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-hud-danger"
                                    />
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                )}
            </div>
            <div ref={panels} {...(sheet ? swipe : {})}>
                {tabs.map((tab) => (
                    <TabsContent
                        key={tab.id}
                        value={tab.id}
                        data-tab-id={tab.id}
                        data-dir={sheet ? dir : undefined}
                        forceMount={keepMounted ? true : undefined}
                        className={cn(
                            'mt-0 px-4 py-3',
                            sheet && 'motion-panel',
                            keepMounted && 'data-[state=inactive]:hidden',
                            styles.content
                        )}
                    >
                        {tab.content}
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    );
}
