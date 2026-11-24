'use client';

import type { ReactNode, Ref } from 'react';

import { useProfile } from '../ProfileContext';
import {
    type ProfileTab,
    type ProfileTabId,
    ProfileTabs,
} from '../tabs/ProfileTabs';
import { CompactHero, SheetIdentityPanel } from './SheetIdentityPanel';
import { SheetVitals } from './SheetVitals';

import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';

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
    const { campaignId, sheet } = useProfile();

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(system.key, system.modules);

    const value = tabs.items.some((x) => x.id === tabs.value)
        ? tabs.value
        : 'stats';

    return (
        <div className="mx-auto w-full max-w-6xl lg:flex">
            <SheetIdentityPanel
                ref={heroRef}
                badge={identity.badge}
                actions={identity.actions}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
                    <SheetVitals />
                    <div className="flex flex-wrap gap-2">
                        <Ui.HeroStats />
                    </div>
                </div>
                {children}
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
        </div>
    );
}
