'use client';

import type { ReactNode } from 'react';

import { type HudTab, HudTabs } from '@/components/hud/form';

export type ProfileTabId =
    | 'basic'
    | 'stats'
    | 'combat'
    | 'skills'
    | 'choices'
    | 'magic'
    | 'advancement'
    | 'downtime'
    | 'items'
    | 'story'
    | 'log';

export type ProfileTab = HudTab<ProfileTabId>;

export function ProfileTabs({
    tabs,
    value,
    onValueChange,
    header,
    variant,
}: {
    tabs: ProfileTab[];
    value: ProfileTabId;
    onValueChange: (id: ProfileTabId) => void;
    header?: ReactNode;
    variant?: 'default' | 'sheet';
}) {
    return (
        <HudTabs
            tabs={tabs}
            value={value}
            onValueChange={onValueChange}
            header={header}
            styles={{ variant }}
        />
    );
}
