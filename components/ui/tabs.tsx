'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { DISABLED_CLASS } from '@/components/ui/disabled';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            'inline-flex h-auto items-center justify-center gap-1.5 rounded-lg bg-transparent p-0 text-hud-muted',
            className
        )}
        {...props}
    />
));

TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            `hud-body inline-flex h-8 items-center justify-center rounded-lg border border-hud-line px-3 text-sm font-semibold whitespace-nowrap transition-[background-color,box-shadow,color,border-color] duration-150 hover:text-hud-ink pointer-coarse:min-h-10 ${DISABLED_CLASS} data-[state=active]:border-hud-accent data-[state=active]:bg-hud-accent/15 data-[state=active]:text-hud-accent-fg`,
            className
        )}
        {...props}
    />
));

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        data-slot="tabs-content"
        className={cn(
            'mt-2 [&:not([data-dir])]:data-[state=active]:animate-[tab-panel-in_180ms_var(--ease-out)]',
            className
        )}
        {...props}
    />
));

TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
