'use client';

import { Fragment, type ReactNode, useRef } from 'react';
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
    group?: string;
    hidden?: boolean;
}

export interface HudTabsStyles {
    content?: string;
    trigger?: string;
    variant?: 'default' | 'sheet' | 'rail';
    rail?: { from?: 'lg' | 'xl'; mobile?: 'row' | 'list' };
}

const RAIL_QUERY = {
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
} as const;

const RAIL_TRIGGER =
    'h-10 justify-start rounded-md px-3 text-left hover:bg-hud-raised data-[state=active]:bg-transparent data-[state=active]:shadow-[inset_2px_0_0_var(--hud-accent)]';

const Badge = ({ children }: { children: ReactNode }) => (
    <span className="ml-1.5 text-xs text-hud-soft tabular-nums">
        {children}
    </span>
);

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

    const railFrom = styles.rail?.from ?? 'xl';

    const railMobile = styles.rail?.mobile ?? 'row';

    const vertical = useMediaQuery(RAIL_QUERY[railFrom]) && rail;

    const shown = tabs.filter((tab) => !tab.hidden);

    const order = shown.map((tab) => tab.id);

    const dir = useTabDirection(order, value);

    const panels = useRef<HTMLDivElement>(null);

    useSmoothHeight(panels, sheet ? value : '');

    const swipe = useSwipeTabs(order, value, (id) => onValueChange(id as T));

    return (
        <Tabs
            data-slot="hud-tabs"
            value={value}
            onValueChange={(v) => onValueChange(v as T)}
            orientation={vertical ? 'vertical' : 'horizontal'}
        >
            {rail ? (
                <>
                    {header}
                    <TabsList
                        data-slot="hud-tabs-list"
                        data-rail-from={railFrom}
                        className={cn(
                            'flex h-auto w-full justify-start bg-transparent p-1.5',
                            vertical
                                ? 'sticky top-[calc(var(--shell-header-h)+64px)] flex-col items-stretch gap-0.5 self-start p-0'
                                : railMobile === 'list'
                                  ? 'flex-col items-stretch gap-0.5 p-0'
                                  : 'hud-scroll-x gap-1 overflow-x-auto'
                        )}
                    >
                        {shown.map((tab, i) => (
                            <Fragment key={tab.id}>
                                {tab.group &&
                                    tab.group !== shown[i - 1]?.group && (
                                        <span
                                            role="presentation"
                                            className={cn(
                                                'hud-sc px-3 pt-3 pb-1 text-xs text-hud-soft first:pt-0',
                                                !vertical &&
                                                    railMobile === 'row' &&
                                                    'hidden'
                                            )}
                                        >
                                            {tab.group}
                                        </span>
                                    )}
                                <TabsTrigger
                                    value={tab.id}
                                    className={cn(
                                        'hud-sc h-10 min-w-fit shrink-0 text-[15px] text-hud-muted',
                                        vertical || railMobile === 'list'
                                            ? RAIL_TRIGGER
                                            : 'flex-1 px-2.5',
                                        styles.trigger
                                    )}
                                >
                                    {tab.label}
                                    {tab.badge != null && (
                                        <Badge>{tab.badge}</Badge>
                                    )}
                                    {tab.invalid && (
                                        <span
                                            data-invalid-dot
                                            aria-label={t('ui.hasErrors')}
                                            className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-hud-danger"
                                        />
                                    )}
                                </TabsTrigger>
                            </Fragment>
                        ))}
                    </TabsList>
                </>
            ) : (
                <div
                    className={cn(
                        'sticky z-20',
                        sheet
                            ? 'top-[calc(var(--shell-header-h)/var(--sheet-zoom,1))] px-4 py-2'
                            : 'top-[env(safe-area-inset-top,0px)] border-b border-hud-rule bg-hud-page/[.97]'
                    )}
                >
                    {header}
                    {sheet ? (
                        <SheetTabList
                            tabs={shown}
                            value={value}
                            trigger={styles.trigger}
                            invalidLabel={t('ui.hasErrors')}
                        />
                    ) : (
                        <TabsList className="hud-scroll-x flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)] p-1.5 md:flex-wrap md:overflow-x-visible md:[mask-image:none]">
                            {shown.map((tab) => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className={cn(
                                        'hud-sc h-10 min-w-fit flex-1 shrink-0 px-2.5 text-[15px] text-hud-muted',
                                        styles.trigger
                                    )}
                                >
                                    {tab.label}
                                    {tab.badge != null && (
                                        <Badge>{tab.badge}</Badge>
                                    )}
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
            )}
            <div
                ref={panels}
                data-slot="hud-tabs-panels"
                {...(sheet ? swipe : {})}
            >
                {tabs.map((tab) => (
                    <TabsContent
                        key={tab.id}
                        value={tab.id}
                        data-tab-id={tab.id}
                        data-dir={sheet ? dir : undefined}
                        forceMount={keepMounted ? true : undefined}
                        className={cn(
                            rail ? 'mt-0 py-1' : 'mt-0 px-4 py-3',
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
