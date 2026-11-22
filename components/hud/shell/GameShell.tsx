'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface GameShellNavItem {
    id: string;
    label: string;
    href: string;
}

export function HudGameShell({
    items,
    activeId,
    title,
    breadcrumbRootLabel,
    actions,
    menuActions,
    children,
}: {
    items: GameShellNavItem[];
    activeId: string;
    title: string;
    breadcrumbRootLabel?: string;
    actions: ReactNode;
    menuActions?: ReactNode;
    children: ReactNode;
}) {
    const t = useTranslations('common.gameNavigation');

    const activeItem = items.find((item) => item.id === activeId);

    return (
        <>
            <header className="hud-surface sticky top-0 z-50 border-b border-hud-rule bg-hud-page/80 backdrop-blur-xl">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('openMenu')}
                                className="h-10 w-10 shrink-0 border-hud-rule text-hud-gold"
                            >
                                <Menu className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            className="w-64 max-w-[calc(100vw-1.5rem)] p-2"
                        >
                            <nav
                                aria-label={t('label')}
                                className="grid gap-1"
                            >
                                {items.map((item) => {
                                    const active = item.id === activeId;

                                    return (
                                        <DropdownMenuItem
                                            key={item.id}
                                            asChild
                                            className={cn(
                                                'min-h-10 rounded-lg px-3 text-sm focus:bg-hud-field',
                                                active &&
                                                    'border-hud-gold/60 bg-hud-gold/10 text-hud-gold'
                                            )}
                                        >
                                            <Link
                                                href={item.href}
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                            >
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </nav>
                            {menuActions && <div className="mt-2 flex gap-2 border-t border-hud-rule pt-2 sm:hidden [&_button]:size-10">{menuActions}</div>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <nav
                        aria-label={t('breadcrumb')}
                        className="flex min-w-0 items-center gap-1 text-[13px]"
                    >
                        <Link
                            href="/campaigns"
                            className="shrink-0 text-hud-muted hover:text-hud-ink"
                        >
                            {breadcrumbRootLabel ?? t('campaigns')}
                        </Link>
                        {activeId !== 'campaigns' && (
                            <>
                                <ChevronRight
                                    aria-hidden
                                    className="size-3 shrink-0 text-hud-line"
                                />
                                <span
                                    aria-current="page"
                                    className="truncate font-medium text-hud-ink"
                                >
                                    {activeItem?.label ?? title}
                                </span>
                            </>
                        )}
                    </nav>
                    <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2 [&_button]:min-h-10 [&_button]:min-w-10 [&_a]:min-h-10 [&_a]:min-w-10">
                        {actions}
                    </div>
                </div>
            </header>
            {children}
        </>
    );
}
