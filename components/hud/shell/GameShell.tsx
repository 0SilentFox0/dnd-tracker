'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';

import { HudShellHeader } from '@/components/hud/shell/HudShellHeader';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface GameShellNavItem {
    id: string;
    label: string;
    href: string;
}

export function HudGameShell({
    items,
    activeId,
    header,
    actions,
    menuActions,
    fit,
    children,
}: {
    items: GameShellNavItem[];
    activeId: string;
    header: { title: string; breadcrumbRootLabel?: string };
    actions: ReactNode;
    menuActions?: ReactNode;
    fit?: boolean;
    children: ReactNode;
}) {
    const t = useTranslations('common.gameNavigation');

    const activeItem = items.find((item) => item.id === activeId);

    const content = (
        <>
            <HudShellHeader
                menu={{
                    label: t('openMenu'),
                    content: (
                        <>
                            <nav aria-label={t('label')} className="grid gap-1">
                                {items.map((item) => {
                                    const active = item.id === activeId;

                                    return (
                                        <DropdownMenuItem
                                            key={item.id}
                                            asChild
                                            className={cn(
                                                'min-h-10 rounded-lg px-3 text-sm focus:bg-hud-field',
                                                active &&
                                                    'border-hud-accent bg-hud-panel-2 text-hud-ink'
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
                            {menuActions && (
                                <div className="mt-2 flex gap-2 border-t border-hud-rule pt-2 sm:hidden [&_button]:size-10">
                                    {menuActions}
                                </div>
                            )}
                        </>
                    ),
                }}
                breadcrumb={
                    <nav
                        aria-label={t('breadcrumb')}
                        className="flex min-w-0 items-center gap-1 text-sm"
                    >
                        <Link
                            href="/campaigns"
                            className="shrink-0 text-hud-muted hover:text-hud-ink"
                        >
                            {header.breadcrumbRootLabel ?? t('campaigns')}
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
                                    {activeItem?.label ?? header.title}
                                </span>
                            </>
                        )}
                    </nav>
                }
                actions={actions}
            />
            {children}
        </>
    );

    return fit ? <div data-shell-fit>{content}</div> : content;
}
