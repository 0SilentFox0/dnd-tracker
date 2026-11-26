'use client';

import { MoreHorizontal } from 'lucide-react';

import { HudIconButton } from '@/components/hud/HudButton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export interface HudFormMenuItem {
    label: string;
    onSelect: () => void | Promise<unknown>;
    tone?: 'danger';
    confirm?: string;
}

export function HudFormMenu({
    items,
    label,
}: {
    items: HudFormMenuItem[];
    label: string;
}) {
    const confirm = useConfirm();

    if (items.length === 0) return null;

    const select = async (item: HudFormMenuItem) => {
        if (
            item.confirm &&
            !(await confirm({
                title: item.confirm,
                destructive: item.tone === 'danger',
            }))
        )
            return;

        await item.onSelect();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <HudIconButton aria-label={label}>
                    <MoreHorizontal className="size-4" aria-hidden />
                </HudIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {items.map((item) => (
                    <DropdownMenuItem
                        key={item.label}
                        onSelect={() => void select(item)}
                        className={cn(
                            item.tone === 'danger' && 'text-hud-crimson-fg'
                        )}
                    >
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
