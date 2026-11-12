'use client';

import type { ComponentType, ReactNode } from 'react';

import {
    ActionsMenu,
    type ActionsMenuItem,
} from '@/components/common/ActionsMenu';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface GroupAccordionItemProps {
    value: string;
    title: string;
    countLabel: string;
    accent?: string;
    className?: string;
    icon?: ComponentType<{ className?: string }>;
    menuActions?: ActionsMenuItem[];
    'data-tour'?: string;
    children: ReactNode;
}

export function GroupAccordionItem({
    value,
    title,
    countLabel,
    accent,
    className,
    icon: Icon,
    menuActions,
    'data-tour': dataTour,
    children,
}: GroupAccordionItemProps) {
    return (
        <AccordionItem
            value={value}
            className={cn(className, accent && 'border-l-[3px]')}
            style={accent ? { borderLeftColor: accent } : undefined}
        >
            <div className="relative">
                <AccordionTrigger className="px-4 sm:px-6" data-tour={dataTour}>
                    <div className="flex w-full items-center gap-3 text-left sm:gap-4">
                        {Icon && (
                            <Icon className="h-6 w-6 shrink-0 text-hud-gold sm:h-7 sm:w-7" />
                        )}
                        <div className="min-w-0 flex-1">
                            <h3 className="hud-sc truncate text-lg text-hud-ink">
                                {title}
                            </h3>
                            <p className="mt-1 text-sm text-hud-muted">
                                {countLabel}
                            </p>
                        </div>
                    </div>
                </AccordionTrigger>
                {menuActions && (
                    <div
                        className="absolute top-1/2 right-12 z-10 -translate-y-1/2 sm:right-14"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ActionsMenu
                            actions={menuActions}
                            triggerClassName="h-10 w-10 sm:h-12 sm:w-12"
                            iconClassName="h-5 w-5 sm:h-6 sm:w-6"
                            stopPropagation
                        />
                    </div>
                )}
            </div>
            <AccordionContent>{children}</AccordionContent>
        </AccordionItem>
    );
}
