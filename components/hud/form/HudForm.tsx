'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { type HudTab, HudTabs, type HudTabsStyles } from './HudTabs';
import { useRevealInvalidTab } from './reveal-invalid-tab';

import { ActionBar } from '@/components/ui/action-bar';
import { cn } from '@/lib/utils';

interface HudFormProps<T extends string> {
    id: string;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    tabs?: HudTab<T>[];
    tab?: T;
    onTabChange?: (tab: T) => void;
    children?: ReactNode;
    actions?: ReactNode;
    error?: string | null;
    className?: string;
    tabStyles?: HudTabsStyles;
}

export function HudForm<T extends string>({
    id,
    onSubmit,
    tabs,
    tab,
    onTabChange,
    children,
    actions,
    error,
    className,
    tabStyles,
}: HudFormProps<T>) {
    const [innerTab, setInnerTab] = useState<T | undefined>(tabs?.[0]?.id);

    const active = tab ?? innerTab ?? tabs?.[0]?.id;

    const setActive = (next: T) => {
        setInnerTab(next);
        onTabChange?.(next);
    };

    const onInvalidCapture = useRevealInvalidTab(
        tabs ? active : undefined,
        setActive
    );

    return (
        <form
            id={id}
            onSubmit={onSubmit}
            onInvalidCapture={onInvalidCapture}
            className={cn('flex flex-1 flex-col', className)}
        >
            {error && (
                <p
                    role="alert"
                    className="flex items-center gap-1.5 px-4 pt-3 text-sm text-hud-crimson-fg"
                >
                    <AlertCircle className="size-4 shrink-0" aria-hidden />
                    {error}
                </p>
            )}
            {tabs && active ? (
                <HudTabs
                    tabs={tabs}
                    value={active}
                    onValueChange={setActive}
                    styles={tabStyles}
                    keepMounted
                />
            ) : (
                <div className="px-4 py-3">{children}</div>
            )}
            {actions && (
                <ActionBar className="mt-auto flex-wrap border-hud-rule bg-hud-page/95 px-4 sm:px-4 sm:pb-4 [&>*]:min-w-fit">
                    {actions}
                </ActionBar>
            )}
        </form>
    );
}
