'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';

import { HudIconButton } from '@/components/hud/HudButton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type ConfirmOptions, useConfirm } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export interface HudFormMenuItem {
    label: ReactNode;
    onSelect: () => void;
    tone?: 'danger';
    confirm?: ConfirmOptions;
    disabled?: boolean;
}

export function HudFormMenu({
    items,
    label,
}: {
    items: HudFormMenuItem[];
    label?: string;
}) {
    const t = useTranslations('common');

    const confirm = useConfirm();

    const select = async (item: HudFormMenuItem) => {
        if (item.confirm && !(await confirm(item.confirm))) return;

        item.onSelect();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <HudIconButton aria-label={label ?? t('actions.more')}>
                    <MoreHorizontal className="size-5" aria-hidden />
                </HudIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {items.map((item, i) => (
                    <DropdownMenuItem
                        key={i}
                        disabled={item.disabled}
                        className={cn(
                            item.tone === 'danger' && 'text-hud-danger'
                        )}
                        onSelect={() => void select(item)}
                    >
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
