'use client';

import { type ReactNode, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { SheetTabList } from './SheetTabList';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useMediaQuery,
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
    badge?: ReactNode;
    wide?: boolean;
}

export interface HudTabsStyles {
    content?: string;
    trigger?: string;
    variant?: 'default' | 'sheet' | 'rail';
}

interface HudTabsProps<T extends string> {
    tabs: HudTab<T>[];
    value: T;
    onValueChange: (id: T) => void;
    header?: ReactNode;
    keepMounted?: boolean;
    styles?: HudTabsStyles;
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

    const rail = styles.variant === 'rail';

    const vertical = useMediaQuery('(min-width: 1280px)') && rail;

    const activeWide = tabs.find((tab) => tab.id === value)?.wide;

    const order = tabs.map((tab) => tab.id);

    const dir = useTabDirection(order, value);

    const panels = useRef<HTMLDivElement>(null);

    useSmoothHeight(panels, sheet ? value : '');

    const swipe = useSwipeTabs(order, value, (id) => onValueChange(id as T));

    return (
        <Tabs
            value={value}
            onValueChange={(v) => onValueChange(v as T)}
            orientation={vertical ? 'vertical' : 'horizontal'}
            {...(rail && {
                'data-hud-tabs-root': '',
                'data-active-wide': activeWide ? 'true' : undefined,
            })}
        >
            <div
                {...(rail && { 'data-hud-rail': '' })}
                className={cn(
                    'sticky z-20',
                    rail &&
                        'xl:top-[calc(var(--shell-header-h,57px)+16px)] xl:self-start xl:border-b-0 xl:bg-transparent',
                    sheet
                        ? 'top-[calc(var(--shell-header-h,57px)/var(--sheet-zoom,1))] px-4 py-2'
                        : 'top-[env(safe-area-inset-top,0px)] border-b border-hud-rule bg-hud-page/[.97]'
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
                    <TabsList
                        className={cn(
                            'hud-scroll-x flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-1.5 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)] md:flex-wrap md:overflow-x-visible md:[mask-image:none]',
                            vertical &&
                                'flex-col flex-nowrap overflow-visible p-0 [mask-image:none]'
                        )}
                    >
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className={cn(
                                    'hud-sc h-10 min-w-fit flex-1 shrink-0 px-2.5 text-[15px] text-hud-muted',
                                    rail &&
                                        'hover:bg-hud-raised data-[orientation=vertical]:w-full data-[orientation=vertical]:flex-none data-[orientation=vertical]:justify-start data-[orientation=vertical]:data-[state=active]:bg-transparent data-[orientation=vertical]:data-[state=active]:shadow-[inset_2px_0_0_var(--hud-accent)]',
                                    styles.trigger
                                )}
                            >
                                {tab.label}
                                {tab.badge != null && (
                                    <span className="hud-num ml-1.5 text-hud-muted">
                                        {tab.badge}
                                    </span>
                                )}
                                {tab.invalid && (
                                    <span
                                        data-invalid-dot
                                        aria-label={t('ui.hasErrors')}
                                        className={cn(
                                            'ml-1.5 inline-block h-1.5 w-1.5 rounded-full',
                                            rail
                                                ? 'bg-hud-crimson'
                                                : 'bg-hud-danger'
                                        )}
                                    />
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                )}
            </div>
            <div
                ref={panels}
                {...(sheet ? swipe : {})}
                {...(rail && { 'data-hud-tabs-panels': '' })}
            >
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
