'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const ITEM = 'disclosure';

interface DisclosureProps {
    summary: React.ReactNode;
    children: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    triggerClassName?: string;
    triggerStyle?: React.CSSProperties;
    chevronClassName?: string;
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    contentClassName?: string;
    hideChevron?: boolean;
}

function Disclosure({
    summary,
    children,
    open,
    defaultOpen,
    onOpenChange,
    className,
    triggerClassName,
    triggerStyle,
    chevronClassName,
    headingLevel,
    contentClassName,
    hideChevron = false,
}: DisclosureProps) {
    const control =
        open === undefined
            ? { defaultValue: defaultOpen ? ITEM : '' }
            : { value: open ? ITEM : '' };

    const Heading = headingLevel ? (`h${headingLevel}` as const) : 'div';

    return (
        <AccordionPrimitive.Root
            type="single"
            collapsible
            data-slot="disclosure"
            onValueChange={(v) => onOpenChange?.(v === ITEM)}
            {...control}
        >
            <AccordionPrimitive.Item value={ITEM} className={className}>
                <AccordionPrimitive.Header asChild>
                    <Heading className="m-0 text-[length:inherit] font-[inherit]">
                        <AccordionPrimitive.Trigger
                            className={cn(
                                'group/disclosure flex w-full cursor-pointer items-center gap-1.5 text-left',
                                triggerClassName
                            )}
                            style={triggerStyle}
                        >
                            {!hideChevron && (
                                <ChevronRight
                                    className={cn(
                                        'size-3.5 shrink-0 transition-transform group-data-[state=open]/disclosure:rotate-90',
                                        chevronClassName
                                    )}
                                />
                            )}
                            {summary}
                        </AccordionPrimitive.Trigger>
                    </Heading>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content
                    forceMount
                    className={cn(
                        'data-[state=closed]:hidden',
                        contentClassName
                    )}
                >
                    {children}
                </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
    );
}

export { Disclosure };
