'use client';

import type { ReactNode, Ref } from 'react';

import {
    type ProfileTab,
    type ProfileTabId,
    ProfileTabs,
} from '../tabs/ProfileTabs';
import { SheetAbilities } from './SheetAbilities';
import { SheetHud } from './SheetHud';
import { CompactHero, SheetIdentityPanel } from './SheetIdentityPanel';
import { SheetRollProvider } from './SheetRollProvider';
import { SheetTopBar } from './SheetTopBar';

interface SheetLayoutProps {
    heroRef: Ref<HTMLElement>;
    identity: {
        badge?: ReactNode;
        actions?: ReactNode;
    };
    tabs: {
        items: ProfileTab[];
        value: ProfileTabId;
        onChange: (id: ProfileTabId) => void;
    };
    scrolledPast: boolean;
    children?: ReactNode;
}

export function SheetLayout({
    heroRef,
    identity,
    tabs,
    scrolledPast,
    children,
}: SheetLayoutProps) {
    const value = tabs.items.some((x) => x.id === tabs.value)
        ? tabs.value
        : 'stats';

    const hasStory = tabs.items.some((x) => x.id === 'story');

    return (
        <SheetRollProvider>
            <div className="mx-auto flex w-full max-w-6xl flex-col">
                <SheetTopBar actions={identity.actions} />
                <SheetIdentityPanel
                    ref={heroRef}
                    badge={identity.badge}
                    onHistory={
                        hasStory ? () => tabs.onChange('story') : undefined
                    }
                >
                    <SheetHud />
                </SheetIdentityPanel>
                <div className="empty:hidden">{children}</div>
                <SheetAbilities />
                <ProfileTabs
                    variant="sheet"
                    value={value}
                    onValueChange={tabs.onChange}
                    tabs={tabs.items}
                    header={
                        scrolledPast ? (
                            <div className="lg:hidden">
                                <CompactHero />
                            </div>
                        ) : null
                    }
                />
            </div>
        </SheetRollProvider>
    );
}
