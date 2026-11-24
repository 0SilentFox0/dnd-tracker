'use client';

import { type ReactNode, type Ref, useEffect, useRef } from 'react';

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

    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = root.current;

        const header = document.querySelector<HTMLElement>('header.sticky');

        if (!host || !header) return;

        const sync = () =>
            host.style.setProperty(
                '--shell-header-h',
                `${header.getBoundingClientRect().height}px`
            );

        sync();

        const observer = new ResizeObserver(sync);

        observer.observe(header);

        return () => {
            observer.disconnect();
            host.style.removeProperty('--shell-header-h');
        };
    }, []);

    return (
        <SheetRollProvider>
            <div ref={root} className="sheet-root mx-auto flex w-full flex-col">
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
