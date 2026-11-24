'use client';

import type { ReactNode, Ref } from 'react';

import { useProfile } from '../ProfileContext';
import {
    type ProfileTab,
    type ProfileTabId,
    ProfileTabs,
} from '../tabs/ProfileTabs';
import { SheetAbilities } from './SheetAbilities';
import { CompactHero, SheetIdentityPanel } from './SheetIdentityPanel';
import { SheetRollProvider } from './SheetRollProvider';
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
        <SheetRollProvider>
            <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row">
                <SheetIdentityPanel
                    ref={heroRef}
                    badge={identity.badge}
                    actions={identity.actions}
                />
                <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col">
                    <div className="order-[-3] grid gap-3 px-4 pt-4 pb-4 lg:grid-cols-[1.2fr_1fr]">
                        <SheetVitals />
                        <Ui.HeroStats />
                    </div>
                    <div className="order-[-1] empty:hidden">{children}</div>
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
            </div>
        </SheetRollProvider>
    );
}
