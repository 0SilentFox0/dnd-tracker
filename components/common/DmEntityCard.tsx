'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Edit, Trash2 } from 'lucide-react';

import { ActionsMenu } from '@/components/common/ActionsMenu';
import { ZoomableEntityIcon } from '@/components/common/ZoomableEntityIcon';
import { HudCard } from '@/components/hud/page';

interface DmEntityCardProps {
    href: string;
    title: string;
    accent?: string;
    icon?: string | null;
    onDelete: () => void;
    canEdit?: boolean;
    children: ReactNode;
}

export function DmEntityCard({
    href,
    title,
    accent,
    icon,
    onDelete,
    canEdit = true,
    children,
}: DmEntityCardProps) {
    const t = useTranslations('common.actions');

    return (
        <HudCard
            href={canEdit ? href : undefined}
            linkLabel={title}
            accent={accent}
            className="flex h-full flex-col gap-3"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {icon !== undefined && (
                        <ZoomableEntityIcon
                            src={icon}
                            name={title}
                            size={96}
                            className="size-20 rounded-lg text-2xl"
                        />
                    )}
                    <h3 className="hud-sc truncate text-lg text-hud-ink">
                        {title}
                    </h3>
                </div>
                {canEdit && (
                    <ActionsMenu
                        triggerSize="sm"
                        triggerClassName="h-8 w-8 p-0"
                        actions={[
                            { label: t('edit'), icon: Edit, href },
                            {
                                label: t('delete'),
                                icon: Trash2,
                                onSelect: onDelete,
                                destructive: true,
                            },
                        ]}
                    />
                )}
            </div>
            <div className="flex flex-wrap gap-2">{children}</div>
        </HudCard>
    );
}
