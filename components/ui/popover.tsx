'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { useHudPortalClass } from '@/components/ui/portal-class';
import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({
    className,
    sideOffset = 6,
    align = 'start',
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
    const hudClass = useHudPortalClass();

    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                data-slot="popover-content"
                sideOffset={sideOffset}
                align={align}
                className={cn(
                    'z-50 rounded-[4px] border border-hud-line bg-hud-panel shadow-[0_30px_80px_-24px_rgba(0,0,0,.9)] p-2 text-hud-ink outline-hidden',
                    hudClass,
                    className
                )}
                {...props}
            />
        </PopoverPrimitive.Portal>
    );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
