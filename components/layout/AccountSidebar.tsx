'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

import { UserAvatar } from '@/components/auth/UserAvatar';
import type { GameShellNavItem } from '@/components/hud';
import { PROFILE_MENU } from '@/components/layout/profile-menu';
import { useSessionUser } from '@/lib/hooks/auth';
import { cn } from '@/lib/utils';

const ICONS = Object.fromEntries([
    ['profile', UserRound],
    ...PROFILE_MENU.map((e) => [e.id, e.icon]),
]);

export function AccountSidebar({
    items,
    activeId,
    ariaLabel,
}: {
    items: GameShellNavItem[];
    activeId: string;
    ariaLabel: string;
}) {
    const user = useSessionUser();

    return (
        <aside className="hidden w-60 shrink-0 md:block">
            <div className="ds-panel sticky top-4 space-y-3 p-3">
                <div className="flex items-center gap-3 px-1">
                    <UserAvatar user={user} className="size-10" sizes="40px" />
                    <p className="hud-sc min-w-0 truncate text-hud-ink">
                        {user?.name ?? user?.email ?? ariaLabel}
                    </p>
                </div>
                <div className="orn" aria-hidden />
                <nav aria-label={ariaLabel} className="flex flex-col gap-0.5">
                    {items.map((it) => {
                        const Icon = ICONS[it.id];

                        const active = it.id === activeId;

                        return (
                            <Link
                                key={it.id}
                                href={it.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-hud-muted transition-colors hover:bg-hud-panel-2 hover:text-hud-ink',
                                    active &&
                                        'bg-hud-panel-2 text-hud-ink shadow-[inset_2px_0_0_var(--hud-accent)]'
                                )}
                            >
                                {Icon && (
                                    <Icon
                                        aria-hidden
                                        className={cn(
                                            'size-4 shrink-0',
                                            active && 'text-hud-accent-fg'
                                        )}
                                    />
                                )}
                                <span className="truncate">{it.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
